'use strict';

import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import {src, dest, series, parallel, watch, lastRun} from 'gulp';
import del from 'del';
import merge from 'merge-stream';
import browser from 'browser-sync';
import vinylBuffer from 'vinyl-buffer';
import spritesmith from 'gulp.spritesmith-multi';
import gitRepoInfo from 'git-repo-info';
import pngquant from 'gulp-pngquant';
import rename from 'gulp-rename';
import sassCompile from 'gulp-sass';
import sassGlob from 'gulp-sass-glob';
import autoprefixer from 'gulp-autoprefixer';
import sort from 'gulp-sort';
import svgSprite from 'gulp-svg-sprite';
import imagemin from 'gulp-imagemin';
import esLint from 'gulp-eslint';
import babel from 'gulp-babel';
import jsUglify from 'gulp-uglify';
import jsConcat from 'gulp-concat';
import ejs from 'gulp-ejs';
import gitLog from 'gitlog';
import zip from 'gulp-zip';
import ghPages from 'gulp-gh-pages';

const config = {
    autoprefixer: ['> 1%', 'last 2 versions', 'iOS 10', 'Android 2.3', 'Firefox ESR', 'IE 11'],
    deployMessage: '[UPDATE] deploy to gh-pages',
    // sprite-hash option
    spriteHash: true,
    // ejs-template's global variables
    ejsVars: {},
    src: './src',
    dist: './dist',
}

const optimize_imgs = () => {
    return src([
        `${config.src}/img/**/*`,
        `!${config.src}/img/sprites/**/*`,
        `!${config.src}/img/sprites-svg/**/*`
    ])
        .pipe(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.mozjpeg({quality: 75, progressive: true}),
            imagemin.optipng({optimizationLevel: 5}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ], {
            verbose: true
        }))
        .pipe(dest(`${config.dist}/img/`))
}

const sprites = () => {
    const opts = {
        spritesmith: function (options, sprite, icons) {
            options.imgPath = `../img/${options.imgName}`;
            options.cssName = `_${sprite}-mixins.scss`;
            options.cssTemplate = `${config.src}/scss/vendor/spritesmith-mixins.handlebars`;
            options.cssSpritesheetName = sprite;
            options.padding = 4;
            options.algorithm = 'binary-tree';
            return options
        }
    };

    const spriteData = src(`${config.src}/img/sprites/**/*.png`)
        .pipe(spritesmith(opts)).on('error', function (err) {
            console.log(err)
        });

    const imgStream = spriteData.img
        .pipe(vinylBuffer())
        .pipe(pngquant({
            quality: '90'
        }))
        .pipe(dest(`${config.dist}/img`));

    const cssStream = spriteData.css
        .pipe(dest(`${config.src}/scss/vendor`));

    return merge(imgStream, cssStream)
}

const spriteSvg = (done) => {
    const svgPath = `${config.src}/img/sprites-svg`,
        folders = fs.readdirSync(svgPath).filter((file) => fs.statSync(path.join(svgPath, file)).isDirectory()),
        options = {
            spritesmith: (options) => {
                const {folder, config} = options;
                return {
                    shape: {
                        spacing: {
                            padding: 4
                        },
                        id: {
                            generator: function (name) {
                                return path.basename(name.split(`${config.src}/scss/vendor`).join(this.separator), '.svg');
                            }
                        }
                    },
                    mode: {
                        css: {
                            dest: './',
                            bust: false,
                            sprite: folder + '-svg.svg',
                            render: {
                                scss: {
                                    template: path.join(`${config.src}/scss/vendor`, 'sprite-svg-mixins.handlebars'),
                                    dest: path.posix.relative(`${config.src}/img`, path.posix.join(`${config.src}/scss`, 'vendor', '_' + folder + '-svg-mixins.scss'))
                                }
                            }
                        }
                    },
                    variables: {
                        spriteName: folder,
                        baseName: path.posix.relative(`${config.src}/css`, path.posix.join(`${config.src}/img`, folder + '-svg')),
                        svgToPng: ''
                    }
                }
            }
        }

    folders.map((folder) => {
        return new Promise((resolve) => {
            src(path.join(`${config.src}/img/sprites-svg`, folder, '*.svg'))
                .pipe(sort())
                .pipe(svgSprite(options.spritesmith({folder, config})))
                .pipe(dest(`${config.src}/img`))
                .on('end', resolve);
        });
    });
    done();
}

const update_normalize = () => {
    return src('./node_modules/normalize.css/normalize.css')
        .pipe(rename({
            prefix: '_',
            extname: '.scss'
        }))
        .pipe(dest(`${config.src}/scss/common`))
}

const sass = () => {
    return src(`${config.src}/scss/**/*.{scss, sass}`, {sourcemaps: true})
        .pipe(sassGlob())
        .pipe(sassCompile({
            errLogToConsole: true,
            outputStyle: 'compressed'
        }).on('error', sassCompile.logError))
        .pipe(autoprefixer({
            overrideBrowserslist: config.autoprefixer,
            remove: false,
            cascade: false
        }))
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(dest(`${config.dist}/css`, {sourcemaps: true}))
}

const eslint = () => {
    return src(`${config.src}/js/*.js`)
        .pipe(esLint())
        .pipe(esLint.format())
        .pipe(esLint.failAfterError());
}

const script = () => {
    return src(`${config.src}/js/*.js`, {sourcemaps: true})
        .pipe(jsConcat('script.js'))
        .pipe(babel())
        .pipe(jsUglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(dest(`${config.dist}/js`, {sourcemaps: true}))
}

const libs = () => {
    return src(`${config.src}/js/libs/**/*.js`)
        .pipe(dest(`${config.dist}/js/libs`))
};

const process_html = () => {
    return src([
        `${config.src}/html/**/*.html`,
        `!${config.src}/html/**/@*`,
        `!${config.src}/html/includes/**/*`
    ])
        .pipe(ejs(config.ejsVars))
        .pipe(dest(`${config.dist}/html`))
}

const make_indexfile = () => {
    const dPath = `${config.src}/html/`, // index를 생성할 파일들이 있는 저장소
        info = gitRepoInfo(), // git 정보 생성
        fileInfo = fs.readdirSync(dPath); // 파일 목록 불러오는 함수를 동기적으로 수정
    let normalFiles = []; // 파일 정보를 저장할 배열 생성

    fileInfo.map(function (file) {
        return path.join(dPath, file);
    }).filter(function (file) {
        return fs.statSync(file).isFile();
    }).forEach(function (file) {
        let stats = fs.statSync(file);
        //HTML 파일만 거르기
        let extname = path.extname(file),
            basename = path.basename(file);
        if (extname == '.html') {
            // 일반 file info를 저장할 객체 생성
            let nfileData = {};
            // title 텍스트 값 추출
            let fileInnerText = fs.readFileSync(file, 'utf8');
            let $ = cheerio.load(fileInnerText);
            let wholeTitle = $('title').text(),
                splitTitle = wholeTitle.split(' : ');
            // 객체에 데이터 집어넣기
            nfileData.title = splitTitle[0];
            nfileData.name = basename;
            nfileData.category = String(nfileData.name).substring(0, 2);
            nfileData.categoryText = splitTitle[1];
            nfileData.mdate = new Date(stats.mtime);
            // 파일수정시점 - 대한민국 표준시 기준
            nfileData.ndate = nfileData.mdate.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}) + ' (GMT+9)';
            // title 마지막 조각 , 인덱스에 붙은 라벨 식별 및 yet 인 경우 수정날짜정보 제거
            nfileData.status = splitTitle[2];
            if (typeof splitTitle[2] == 'undefined' || splitTitle[2] == null || splitTitle[2] == '') {
                nfileData.status = '';
            } else if (splitTitle[2] == 'yet') {
                nfileData.mdate = '';
                nfileData.ndate = '';
            }
            normalFiles.push(nfileData);
        }
    });

    const gitOptions = {
        repo: __dirname,
        number: 20,
        fields: ["hash", "abbrevHash", "subject", "body", "authorName", "authorDateRel", "committerDate", "committerDateRel"],
        execOptions: {maxBuffer: 1000 * 1024},
    };

    const commits = gitLog(gitOptions).reverse();
    for (let i = 0; i < normalFiles.length; i++) {
        for (let j = 0; j < commits.length; j++) {
            let boolean = commits[j].files.filter((x) => {
                if (path.extname(x) === '.html') return x
            }).map((x) => path.basename(x)).some(x => x === normalFiles[i].name);
            if (boolean) {
                normalFiles[i].committerDate = new Date(commits[j].committerDate).toLocaleDateString();
                normalFiles[i].abbrevHash = commits[j].abbrevHash;
            }
        }
    }

    let projectObj = {
        nfiles: normalFiles,
        branch: info.branch
    }
    let projectObjStr = JSON.stringify(projectObj);
    let projectObjJson = JSON.parse(projectObjStr);

    //index 파일 쓰기
    return src('index.html')
        .pipe(ejs(projectObjJson))
        .pipe(dest(config.dist))
}

const clean_dist = () => {
    return del(config.dist)
};

const clean_css = () => {
    return del(`${config.dist}/css`)
};

const clean_js = () => {
    return del(`${config.dist}/js`)
};

const clean_html = () => {
    return del(`${config.dist}/html`)
};

const clean_img = () => {
    return del(`${config.dist}/img`)
};

const browserSyncReload = (done) => {
    browserSync.reload();
    done();
}

const browserSync = browser.create(),
    server = () => {
        // serve files from the build folder
        browserSync.init({
            port: 8030,
            ui: {
                port: 8033,
                weinre: {
                    port: 8133
                }
            },
            cors: false, // if you need CORS, set true
            server: {
                baseDir: `${config.dist}/`
            }
        });

        console.log('\x1b[32m%s\x1b[0m', '[--:--:--] HTML/SCSS watch complete...');

        watch(`${config.src}/img/**/*`, series(clean_img, parallel(spriteSvg, sprites), sass, browserSyncReload));
        watch(`${config.src}/scss/**/*`, series(clean_css, sass, browserSyncReload));
        watch(`${config.src}/js/**/*`, series(clean_js, eslint, parallel(script, libs), browserSyncReload));
        watch(`${config.src}/html/**/*`, series(clean_html, parallel(make_indexfile, process_html), browserSyncReload));
        watch('index.html', series(make_indexfile, browserSyncReload));
    };

exports.default = series(clean_dist, parallel(update_normalize, optimize_imgs, spriteSvg, sprites),
    sass, eslint, parallel(script, libs, make_indexfile, process_html), server);

const packageJson = JSON.parse(fs.readFileSync('package.json')),
    zipFile = () => {
        const date = new Date(),
            dateFormatted = `${date.getFullYear()}${('0' + (date.getMonth() + 1)).slice(-2)}${('0' + date.getDate()).slice(-2)}T${('0' + date.getHours()).slice(-2)}${('0' + date.getMinutes()).slice(-2)}`;
        return src([
            `${config.dist}/**/*`,
            `!${config.dist}/**/*.zip`
        ])
            .pipe(zip(`${packageJson.name}_${packageJson.version}_${dateFormatted}.zip`))
            .pipe(dest(config.dist))
    }

exports.build = series(clean_dist, parallel(update_normalize, optimize_imgs, spriteSvg, sprites),
    sass, eslint, parallel(script, libs, make_indexfile, process_html), zipFile);

const source_deploy = () => {
    return src(`${config.dist}/**/*`)
        .pipe(ghPages({
            message: config.deployMessage
        }))
}

exports.deploy = series(clean_dist, parallel(update_normalize, optimize_imgs, spriteSvg, sprites),
    sass, eslint, parallel(script, libs, make_indexfile, process_html), zipFile, source_deploy);