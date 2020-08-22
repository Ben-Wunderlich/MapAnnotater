// Make the DIV element draggable:
//dragElement(document.getElementById("mydiv"));

//only drags mainimage

var iconBeignDragged = false;

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    if(mouseMode === 'edit'){
      if(!iconBeignDragged){
        deselectMarker();
      }
      return;
    }
    else if(mouseMode === 'add'){
      return;
    }

    e = e || window.event;
    //e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    //e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

dragElement($('#mapscreen')[0]);

function dragMarker(elmnt, id) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0, xStore=0, yStore=0;
  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    if (mouseMode !== 'edit'){//XXX see if this works
      return;
    }
    iconBeignDragged = true
    highlightMarker(elmnt, id);
    e.preventDefault();

    e = e || window.event;
    //e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    xStore=e.clientX;
    yStore = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    //e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    xStore = e.clientX;
    yStore = e.clientY;

    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    iconBeignDragged = false;
    // stop moving when mouse button is released:
    canvasX = parseInt($('#mapscreen').css('left'), 10);
    canvasY = parseInt($('#mapscreen').css('top'), 10);
    updateMarkerPos(xStore-canvasX, yStore-canvasY);
    document.onmouseup = null;
    document.onmousemove = null;
  }
}