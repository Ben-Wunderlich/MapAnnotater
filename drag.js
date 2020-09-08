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
        saveMarkerText();
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
    pos3 = e.clientX/mapZoom;
    pos4 = e.clientY/mapZoom;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX/mapZoom;
    pos2 = pos4 - e.clientY/mapZoom;
    pos3 = e.clientX/mapZoom;
    pos4 = e.clientY/mapZoom;
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
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    if (mouseMode !== 'edit'){
      return;
    }
    iconBeignDragged = true;
    highlightMarker(elmnt, id);
    e.preventDefault();//otherwise dragging has wierd interaction

    e = e || window.event;
    //e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX/mapZoom;
    pos4 = e.clientY/mapZoom;
    
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    //e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX/mapZoom;
    pos2 = pos4 - e.clientY/mapZoom;
    pos3 = e.clientX/mapZoom;
    pos4 = e.clientY/mapZoom;

    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    iconBeignDragged = false;
    // stop moving when mouse button is released:
    updateMarkerPos();
    document.onmouseup = null;
    document.onmousemove = null;
  }
}