(function (win, $) {
    var coordGenerator = {
        init: function () {
            this.setElements();
            this.initLayout();
            this.bindEvents();
        },
        setElements: function () {
            this.deviceArea = $('.device_area');
            this.deleteImage = $('.delete-image');
            this.btnLinkCancel = this.deviceArea.find('.btn_linkCancel');
            this.btnCouponCancel = this.deviceArea.find('.btn_couponCancel');
            this.btnError = this.deviceArea.find('.btn_error');
            this.inputSectionNum = $('#section-num');
            this.inputCoupon = $('#coupon');
            this.inputLink = $('#link');
            this.imgArea = $('.img_area');
            this.imgSize = $('.image-size');
            this.imgSizeWidth = this.imgSize.find('.image-width');
            this.imgSizeHeight = this.imgSize.find('.image-height');
            this.currentArea = this.imgArea.find('.current_area');
            this.imgBox = this.imgArea.find('.img_box');
            this.imgBoxCoupon = this.imgArea.find('.img_coupon');
            this.imgBoxLink = this.imgArea.find('.img_link');
            this.currentCoord = this.currentArea.find('.current_coord');
            this.currentX = this.currentCoord.find('.pos_x');
            this.currentY = this.currentCoord.find('.pos_y');
            this.lineX = this.currentArea.find('.line_x');
            this.lineY = this.currentArea.find('.line_y');
            this.resultListCoupon = $('.result_lst_coupon');
            this.resultListLink = $('.result_lst_link');
            this.couponCnt = 0;
            this.linkCnt = 0;
            this.coordUnit = 'px';
        },
        initLayout: function () {
            this.currentArea.hide();
        },
        bindEvents: function () {
            this.imgArea.on('dragover dragenter dragleave drop', $.proxy(this.onDragEvents, this));
            this.deleteImage.on('click', $.proxy(this.removeImage, this));
            this.btnError.on('click', $.proxy(this.errorClickCancel, this));
            this.btnLinkCancel.on('click', $.proxy(this.clickLinkCancel, this));
            this.btnCouponCancel.on('click', $.proxy(this.clickCouponCancel, this));
        },
        onDragEvents: function (e) {
            if (e.type === 'dragover' || e.type == 'dragenter') {
                this.imgArea.addClass('is_active');
                return false;
            } else if (e.type === 'dragleave') {
                this.imgArea.removeClass('is_active');
            } else if (e.type === 'drop') {
                if (this.inputSectionNum.val() === '') {
                    e.preventDefault();
                    this.imgArea.removeClass('is_active');
                    alert('섹션번호를 입력해주세요');
                } else {
                    this.onDragleaveFunc(e);
                    alert('오른쪽 영역 해당 섹션에 쿠폰개수와 링크개수가 입력되어있는지 확인해주세요 \n 영역 드래그 하시기 전에 그 부분을 입력해주셔야됩니다.');
                }
            }
        },
        onDragleaveFunc: function (e) {
            var reader = new FileReader();
            this.file = e.originalEvent.dataTransfer.files[0];
            reader.readAsDataURL(this.file);
            reader.onload = $.proxy(this.createImage, this);
            e.preventDefault();
        },
        createImage: function (e) {
            if (!this.file.type.match('image.*')) {
                alert('이미지 형식의 파일만 열어주세요.');
            } else {
                if (!this.img) {
                    var newImg = new Image();
                    newImg.src = e.target.result;
                    this.img = this.imgBox.html(newImg).find('img');
                    this.img.on('load', $.proxy(this.onLoadImage, this));
                }
            }
        },
        onLoadImage: function () {
            this.imgSizeWidth.val(this.img.width() + "px");
            this.imgSizeHeight.val(this.img.height() + "px");
            $('#secHeight' + this.inputSectionNum.val()).val(this.img.height());
            this.imgArea.on('mousemove mouseenter mouseleave mousedown mouseup', $.proxy(this.coordEvents, this));
        },
        removeImage: function () {
            if (this.img !== undefined) {
                this.imgArea.removeClass('is_active');
                this.imgBoxLink.children('.drag_area').remove();
                this.imgBoxCoupon.children('.drag_area').remove();
                this.resultListCoupon.children().remove();
                this.resultListLink.children().remove();
                this.img.remove();
                this.file = undefined;
                this.img = undefined;
                this.couponCnt = 0;
                this.linkCnt = 0;
                this.imgSizeWidth.val(null);
                this.imgSizeHeight.val(null);
                this.inputSectionNum.val(null);
                this.imgArea.off('mousemove mouseenter mouseleave mousedown mouseup');
            }
        },
        coordEvents: function (e) {
            if (e.type === 'mousemove' || e.type === 'mouseenter') {
                this.showCurrentCoord(e);
            } else if (e.type === 'mouseleave') {
                this.currentArea.hide();
            } else if (e.type === 'mousedown') {
                this.initDragArea(e);
            } else if (e.type === 'mouseup') {
                this.drawSelectArea(e);
            }
        },
        showCurrentCoord: function (e) {
            this.imgOffsetX = this.img.offset().left.toFixed(0);
            this.imgOffsetY = this.img.offset().top.toFixed(0);

            var pageX = e.pageX - this.imgOffsetX,
                pageY = e.pageY - this.imgOffsetY;

            this.currentArea.show();
            this.currentX.html(pageX + this.coordUnit);
            this.currentY.html(pageY + this.coordUnit);
            this.lineX.css('left', pageX);
            this.lineY.css('top', pageY);
        },
        initDragArea: function (e) {
            if (e.which === 1) {
                this.isDragged = false;
                this.imgOffsetX = this.img.offset().left.toFixed(0);
                this.imgOffsetY = this.img.offset().top.toFixed(0);
                this.startX = e.pageX - this.imgOffsetX;
                this.startY = e.pageY - this.imgOffsetY;
                var dragArea = $('<div class="drag_area"></div>');
                if (this.inputCoupon.prop('checked') === true) {
                    this.imgBoxCoupon.prepend(dragArea);
                    this.dragArea = this.imgBoxCoupon.children('.drag_area').first();
                } else if (this.inputLink.prop('checked') === true) {
                    this.imgBoxLink.prepend(dragArea);
                    this.dragArea = this.imgBoxLink.children('.drag_area').first();
                }
                this.imgArea.on('mousemove', $.proxy(this.drawDragging, this));
            }
        },
        drawDragging: function (e) {
            this.isDragged = true;
            this.imgOffsetX = this.img.offset().left.toFixed(0);
            this.imgOffsetY = this.img.offset().top.toFixed(0);
            this.dragX = e.pageX - this.imgOffsetX;
            this.dragY = e.pageY - this.imgOffsetY;
            this.selWidth = Math.abs(this.dragX - this.startX);
            this.selHeight = Math.abs(this.dragY - this.startY);
            this.endX = (this.dragX < this.startX) ? (this.startX - this.selWidth) : this.startX;
            this.endY = (this.dragY < this.startY) ? (this.startY - this.selHeight) : this.startY;
            this.dragArea.css({
                'width': this.selWidth,
                'height': this.selHeight,
                'top': this.endY,
                'left': this.endX
            });
        },
        drawSelectArea: function (e) {
            if (e.which === 1) {
                if (!this.isDragged) {
                    this.dragArea.remove();
                } else {
                    if (this.inputCoupon.prop('checked') === true) {
                        var i = ++this.couponCnt;
                        this.dragArea.css({
                            'background': 'rgba(0,0,0,0.4)',
                            'line-height': this.selHeight + 'px'
                        }).html('쿠폰' + i);
                        this.dragArea.attr('data-num', this.couponCnt);
                        this.imgArea.off('mousemove', this.drawDragging);
                        this.addCoordResult();
                    } else if (this.inputLink.prop('checked') === true) {
                        // var i = ++this.linkCnt;
                        this.dragArea.css({
                            'background': 'rgba(0,0,0,0.4)',
                            'line-height': this.selHeight + 'px'
                        }).html('링크' + i);
                        this.dragArea.attr('data-num', this.linkCnt);
                        this.imgArea.off('mousemove', this.drawDragging);
                        this.addCoordResult();
                    }
                }
            }
        },
        clickCouponCancel: function () {
            for (var i = 0; i < $('.drag_area').length; i++) {
                if ($('.drag_area').eq(i).attr('data-num') === undefined) {
                    $('.drag_area').eq(i).remove();
                }
            }
            if (this.dragArea && this.couponCnt) {
                this.imgBoxCoupon.find('.drag_area').eq(0).remove();
                this.resultListCoupon.children('li').last().remove();
                this.couponCnt--;
                if (this.couponCnt < 0) {
                    this.couponCnt = 0;
                }
            }
        },
        clickLinkCancel: function () {
            for (var i = 0; i < $('.drag_area').length; i++) {
                if ($('.drag_area').eq(i).attr('data-num') === undefined) {
                    $('.drag_area').eq(i).remove();
                }
            }
            if (this.dragArea && this.linkCnt) {
                this.imgBoxLink.find('.drag_area').eq(0).remove();
                this.resultListLink.children('li').last().remove();
                this.linkCnt--;
                if (this.linkCnt < 0) {
                    this.linkCnt = 0;
                }
            }
        },
        errorClickCancel: function () {
            for (var i = 0; i < $('.drag_area').length; i++) {
                if ($('.drag_area').eq(i).attr('data-num') === undefined) {
                    $('.drag_area').eq(i).remove();
                }
            }
        },
        addCoordResult: function () {
            var resultStr;
            if (this.inputCoupon.prop('checked') === true) {
                resultStr = '<li><span class="num">쿠폰' + this.couponCnt + '</span>' +
                    '<input type="text" class="inp-coordi" data-num="' + this.selCnt + '" value="' +
                    'top:' + this.endY + this.coordUnit + ';' +
                    'left:' + this.endX + this.coordUnit + ';' +
                    'width:' + this.selWidth + this.coordUnit + ';' +
                    'height:' + this.selHeight + this.coordUnit + ';">';
                $('#couponTop_' + this.inputSectionNum.val() + '_' + this.couponCnt).val(this.endY);
                $('#couponLeft_' + this.inputSectionNum.val() + '_' + this.couponCnt).val(this.endX);
                $('#couponWidth_' + this.inputSectionNum.val() + '_' + this.couponCnt).val(this.selWidth);
                $('#couponHeight_' + this.inputSectionNum.val() + '_' + this.couponCnt).val(this.selHeight);
                this.resultListCoupon.append(resultStr);
            } else if (this.inputLink.prop('checked') === true) {
                resultStr = '<li><span class="num">링크' + this.linkCnt + '</span>' +
                    '<input type="text" class="inp-coordi" data-num="' + this.selCnt + '" value="' +
                    'top:' + this.endY + this.coordUnit + ';' +
                    'left:' + this.endX + this.coordUnit + ';' +
                    'width:' + this.selWidth + this.coordUnit + ';' +
                    'height:' + this.selHeight + this.coordUnit + ';">';
                $('#lnkTop_' + this.inputSectionNum.val() + '_' + this.linkCnt).val(this.endY);
                $('#lnkLeft_' + this.inputSectionNum.val() + '_' + this.linkCnt).val(this.endX);
                $('#lnkWidth_' + this.inputSectionNum.val() + '_' + this.linkCnt).val(this.selWidth);
                $('#lnkHeight_' + this.inputSectionNum.val() + '_' + this.linkCnt).val(this.selHeight);
                this.resultListLink.append(resultStr);
            }
        }
    };
    coordGenerator.init();
})(window, window.jQuery);
