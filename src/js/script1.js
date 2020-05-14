(function () {
    'use strict';
    var coordGenerator = {
        init: function () {
            this.setElements();
            this.bindEvents();
        },
        setElements: function () {
            this.textArea = document.getElementsByTagName('body');
        },
        bindEvents: function () {
            this.textArea[0].addEventListener('click', () => {
                this.textAreaOnFunc();
            })
        },
        textAreaOnFunc : function () {
            console.log('body');
            // console.log($(this));
        }
    };
    coordGenerator.init();
})();

// (function (win, $) {
//     'use strict';
//     var coordGenerator = {
//         init: function () {
//             this.setElements();
//             this.bindEvents();
//         },
//         setElements: function () {
//             this.textArea = $('textarea');
//         },
//         bindEvents: function () {
//             this.textArea.on('focus',$.proxy(this.textAreaOnFunc, this))
//         },
//         textAreaOnFunc : function () {
//             console.log('test');
//             // console.log($(this));
//         }
//     };
//     coordGenerator.init();
// })(window, window.jQuery);