// Make the element draggable:

var iconBeignDragged = false;

//only drags main image, #mapscreen
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; mouseButt=null;
  elmnt.onmousedown = dragMouseDown;

  const moveEl = $("#mapscreen")[0];

  return dragMouseDown;

  function dragMouseDown(e) {
    usingMiddle = e.which == 2;

    if(mouseMode=='edit'){
      deselectMarker();
    }
    
    if(usingMiddle){
      e.preventDefault();
    }

    if(iconBeignDragged){
      console.log("already being dragged");
      return;
    }

    if(!usingMiddle && mouseMode === 'edit'){
      if(!iconBeignDragged){
        saveMarkerText();
        //deselectMarker();
      }
      return;
    }
    else if(!usingMiddle && mouseMode === 'add'){
      return;
    }

    e = e || window.event;
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:

    moveEl.style.top = (moveEl.offsetTop - pos2) + "px";
    moveEl.style.left = (moveEl.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;

    /* update the background box */
    updateBgOffsets();
  }
}

dragBackground = dragElement($('#bgmaterial')[0]);

/* allows markers to be dragged around on click, is called as markers are created */
function dragMarker(elmnt, id) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {

    if (e.which==2){
      e.preventDefault();
      dragBackground(e);//holy shit I can't believe this actually worked
      return;
    }

    e.preventDefault();

    iconBeignDragged = true;
    selectio.break();
    highlightMarker(id);//otherwise dragging has wierd interaction

    e = e || window.event;
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
    iconBeignDragged = false;
    selectio.break();
    // stop moving when mouse button is released:
    reapplyPerc(elmnt);
    updateMarkerPos();
    document.onmouseup = null;
    document.onmousemove = null;
  }
}