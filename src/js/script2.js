dragElement(document.getElementById("btn-coordinate"), null, document.getElementById("left-side"), document.getElementById("right-side"), document.getElementById("left-side-top"), document.getElementById("left-side-bottom"));
dragElement(null, document.getElementById("draggable"), null, null, null, null);

function dragElement(elmnt, elmnt2, leftSide1, leftSide2, topSide1, topSide2) {
    var pos3 = 0, pos4 = 0, pos5 = 0, pos6 = 0;
    if (elmnt !== null) {
        elmnt.onmousedown = dragMouseDown;
    } else if (elmnt2 !== null) {
        elmnt2.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        if (e.target.className !== 'inp-coordi' && e.target.className !== 'image-width' && e.target.className !== 'image-height' && e.target.className !== 'inp-section' && e.target.className !== 'btn btn_error' && e.target.className !== 'btn btn_linkCancel' && e.target.className !== 'btn btn_couponCancel' && e.target.className !== 'btn delete-image') {
            e = e || window.event;
            e.preventDefault();

            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
    }

    function elementDrag(e) {
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight;
        e = e || window.event;
        e.preventDefault();

        pos5 = pos3 - e.clientX;
        pos6 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        if (elmnt !== null) {
            elmnt.style.left = pos3 * 100 / windowWidth < 10 ? 10 + "%" : pos3 * 100 / windowWidth > 90 ? 90 + "%" : pos3 * 100 / windowWidth + "%";
            elmnt.style.top = pos4 * 100 / windowHeight < 10 ? 10 + "%" : pos4 * 100 / windowHeight > 90 ? 90 + "%" : pos4 * 100 / windowHeight + "%";
            leftSide1.style.width = pos3 * 100 / windowWidth + "%";
            leftSide2.style.width = (windowWidth - pos3) * 100 / windowWidth + "%";
            topSide1.style.height = pos4 * 100 / windowHeight + "%";
            topSide2.style.height = (windowHeight - pos4) * 100 / windowHeight + "%";
        } else if (elmnt2 !== null) {
            elmnt2.style.left = (elmnt2.offsetLeft - pos5) * 100 / windowWidth + "%";
            elmnt2.style.top = (elmnt2.offsetTop - pos6) * 100 / windowHeight + "%";
        }
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}