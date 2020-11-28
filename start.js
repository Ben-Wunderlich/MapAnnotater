
const electron = require('electron');
const DragSelect = require('dragselect');
const {ipcRenderer} = electron;
//const dialog = electron.remote.dialog;
var sizeOf = require('image-size');

const fs = require('fs');
//const { title } = require('process');
//const { debug, clear } = require('console');
//const { type } = require('jquery');

var projJson;
var trueImageWidth;
var trueImageHeight

var highlightedMarker;
var markerID;//id of highlighted marker

var currentMarkerIcon;

const defaultImgSize = 24;
const minImgSize = 8;
const maxImgSize = 500;
$("#iconResizeInput").attr('min', minImgSize).attr('max', maxImgSize);

const zoomLevels = [
    1.0,
    0.9,
    0.81,
    0.729,
    0.6561,
    0.59049,
    0.531441,
    0.4782969,
    0.43046721,
    0.387420489,
    0.3486784401,
    0.31381059609,
    0.282429536481,
    0.25418658283,
    0.22876792454,
    0.20589113208,
    0.18530201887,
    0.16677181698,
    0.15009463528,
    0.13508517175,
    0.12157665457,
    0.10941898911,
    0.09847709019,
    0.08862938117,
    0.07976644305
];
const minMapZoom = 0;
const maxMapZoom = zoomLevels.length - 1;
var zoomIndex = 0
var mapZoom = zoomLevels[zoomIndex];

//holds marker json whenever is saved,
//when undo is pressed delete marker and remake
const maxStackCapacity = 10;
var operationStack=[];
var redoStack = [];


//can be 'view', 'add' or 'edit'
var mouseMode;

var selectio = new DragSelect({
    area: document.getElementById('bgmaterial'),
    onDragStart: function(e) {
        if(mouseMode!='edit' || e.which==2 || iconBeignDragged || projJson == undefined){
            selectio.break();
        }
    },
    onElementSelect: function(element) {
        if(mouseMode=='edit'){
            if($(".editingMarker").length==0){
                highlightMarker(element, $(element).attr('id'));
            }
            else{
                $(element).addClass('editingMarker');
                /* checks if applied it to same element twice, happens when dragging */
                if($(".editingMarker").length==1){return;}
                setToolsVisibility(false);
            }
        }
    },
    onElementUnselect: function(element) {
        if(mouseMode=='edit'){
        $(element).removeClass('editingMarker');}
    }/*,
    callback: function(){
        could call here thing when released
    }*/
});

/**
 * changes the background image and resets size of background
 * @param {string} url the new images url
 */
function changeBackgroundImage(url){
    var dimensions = sizeOf(url);
    trueImageHeight = dimensions.height;
    trueImageWidth = dimensions.width;

    $('#mapimg').attr('src', url);
    $('#mapscreen, #mapmarkers, #mapimg').css({
        'width':dimensions.width,
        'height': dimensions.height
    });
}

/**
 * updates stack for purpose of undoing
 * @param {boolean} clearStack whether to clear the stack
 */
function newChanges(clearStack=true){
    updateOperationStack(clearStack);
    ipcRenderer.send('work-unsaved');
}

/**
 * resets the project to before the last thing that was changed
 * if no last step will do nothing
 */
function undoStep(){
    if(operationStack.length <= 1){
        console.log('no operation to undo');
        return;
    }
    console.log("undoing steps");
    var currentJson = operationStack.pop();//since would have just been saved
    var lastJson = operationStack.pop();
    redoStack.push(currentJson);//push current progress before overwriting it, could also use projJson
    remakeMarkers(lastJson);
}

/**
 * redoes the last undone step
 */
function redoStep(){
    if(redoStack.length === 0){
        console.log('no step to redo');
        return;
    }

    console.log('redoing step');
    var redoSnapshot = redoStack.pop();//dont need to check size because relies on operationstack 
    //maybe need to do double pop, will have to check that
    remakeMarkers(redoSnapshot);
}

/**
 * changes json to previous version and updates page
 * @param {object} previousSnapshot the snapshot to be updated to
 */
function remakeMarkers(previousSnapshot){
    deselectMarker();
    projJson = previousSnapshot;
    //console.log(projJson);
    //delete current markers and change to previousSnapshot
    $("#mapmarkers").empty();

    for (key of Object.keys(projJson.markers)){
        var marker = projJson.markers[key];

        addExistingMarker(marker.pos, key, marker.icon, marker.iconSize);
    }
    newChanges(false);
}

/**
 * creates new snapshot and adds to top of undo stack
 * @param {boolean} clearRedo if true clears the stack
 */
function updateOperationStack(clearRedo=true){
    console.log('updating json');
    if(clearRedo){
        redoStack=[];//if would try to redo after changes, changes would be lost
    }
    if(operationStack.length >= maxStackCapacity){
        operationStack.shift();
    }
    var deepCopy = JSON.parse(JSON.stringify(projJson));

    operationStack.push(deepCopy);
}

/**
 * makes a string of random numbers
 * @param {int} length length of string you want to make
 * @returns {string} the random string
 */
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

/**
 * @returns array of ids belonging to all highlighted markers
 */
function getEditedIds(){
     var selectedIds = []
    $(".editingMarker").each(function() { selectedIds.push($(this).attr('id'))});
    return selectedIds
}

/**
 * changes all current highlighted elements to have a new icon
 * @param {string} newIcon the url of the new icon
 */
function changeMarkerIcon(newIcon){
    if($('.editingMarker').length === 0){
        return; 
    }

    var idToBeChanged = getEditedIds();

    $('.editingMarker').attr('src', newIcon);

    Object.keys(projJson.markers).forEach(markerId =>{
        if(idToBeChanged.includes(markerId)){
            projJson.markers[markerId].icon = newIcon;
        }
    });
    newChanges();
 }

/**
 * creates buttons for all the possible icons a marker can have
 */
function makeMarkerOptions(){
    var highLighted = false;//so just one gets highlighted
    fs.readdirSync('map_markers\\').forEach(file => {
        var markerFile = 'map_markers/'.concat(file);
        var newImg = document.createElement("IMG");
        newImg.setAttribute('src', markerFile);
        $(newImg).addClass('baseIcon').height(defaultImgSize).width(defaultImgSize);
        
        $(newImg).on('click', function(){
            if(currentMarkerIcon === markerFile){
                return;
            }
            currentMarkerIcon = markerFile;
            $('#icons').children().removeClass("currentMarker");
            newImg.classList.add("currentMarker");
            changeMarkerIcon(markerFile);
        });
        
        $('#icons').append(newImg);
        if(!highLighted){
            $(newImg).addClass('currentMarker');
            currentMarkerIcon = markerFile;
            highLighted=true;
        }
    });
}

/**
 * called from drag.
 * updates the highlighted makers position in the json
 */
function updateMarkerPos(){
    if($('.editingMarker').length !== 1){
        throw "Marker position updated without propper number of sleected markers"
    }

    var offsets = getOffsets('.editingMarker');

    /* need to adjust because currently defined with respect to current not dimensions
    but when reloaded will be with respect to absolute dimensions */
    var relPos = {
        x: Math.round(offsets.x /mapZoom),
        y: Math.round(offsets.y /mapZoom)
    };

    var marker = projJson.markers[markerID];
    if(marker.pos.x === relPos.x && marker.pos.y === relPos.y){
        return;
    }
    marker.pos = relPos;
    newChanges();
    return;
}

//only used from drag file
/**
 * changes position of an element from absolute to relative to size of container so it scales with it
 * @param {HTMLElement} el element to be modified
 */
function reapplyPerc(el){
    var offsets = getOffsets(el);
    var papaDimensions = getDimensions("#mapscreen");
    var percOffsets = {
        x: offsets.x / papaDimensions.x * 100,
        y: offsets.y / papaDimensions.y * 100
    }
    $(el).css({
       'left':percify(percOffsets.x),
       'top': percify(percOffsets.y) 
    });
}

/**
 * creates map markers based on the current json
 */
function loadIcons(){
    //clear previous markers
    $('#mapmarkers').empty();

    //add icons from project
    const markers = projJson.markers;

    Object.keys(markers).forEach(markerId =>{
        var marker = markers[markerId];
        addExistingMarker(marker.pos, markerId, marker.icon, marker.iconSize)
    });
}

/**
 * opens a new project and resets the screen
 * @param {string} projectName project to be loaded
 */
function loadProject(projectName){
    console.log("now opening ".concat(projectName));
    ipcRenderer.send('setTitle', projectName);
    $('#rightbar, #mapscreen').css('visibility', 'visible');
    $('#welcomeMessage').css('visibility', 'hidden');
    setToolsVisibility(false);
    operationStack=[];
    redoStack = [];
    clearText();
    //$("#sizeAdjustor").css('visibility', 'hidden');

    changeZoom(0);//also updates mapzoom

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);
    setMouseMode("view");

    //reset image position
    $('#mapscreen').css({'top':'0px', 'left':'0px'})

    updateBgOffsets();

    //load icons on image
    loadIcons();
    updateOperationStack();
}

/**
 * adds a new marker to the page and the json
 * @param {int} currX x position defined relative to current map size
 * @param {int} currY y position defined relative to current map size
 */
function addNewMarker(currX, currY){

    ipcRenderer.send('change:redo', true);
    var imgWidth = getIconSize();

    if(isNaN(imgWidth)){
        imgWidth = defaultImgSize*mapZoom;
    }
    if(imgWidth < minImgSize*mapZoom){imgWidth = minImgSize*mapZoom;}
    if(imgWidth > maxImgSize*mapZoom){imgWidth = maxImgSize*mapZoom;}

    var canvasOffset = getOffsets("#mapscreen");

    var relCurr = {
        x: currX-canvasOffset.x - (imgWidth/2),
        y: currY-canvasOffset.y - (imgWidth/2)
    };

    var relOrig = {
        x: Math.round(relCurr.x / mapZoom),
        y: Math.round(relCurr.y / mapZoom)
    };

    var id = makeid(12);

    imgWidth = Math.round(imgWidth/mapZoom);

    var icon = currentMarkerIcon;
    addJsonMarker(relOrig, id, imgWidth);

    var markerElement = addExistingMarker(relOrig, id, icon, imgWidth);

    highlightMarker(markerElement, id);
}

/*relOgig in form {x: num, y: num} id is a str, re;ative to curr size
 icon is str of img it shows as, iconsize is num, how big icon is */
/**
 * all are defined as relative to roiginal size
 * @param {object} relOrig is in form {x:int, y:int} the position of the marker
 * @param {string} id the id of the marker to add
 * @param {string} icon the url of the icon the marker uses
 * @param {int} iconSize the size in pixels of the icon
 */
function addExistingMarker(relOrig, id, icon, iconSize){
    var markerElement = document.createElement("IMG");

    var canvasDimensions = getDimensions("#mapscreen");

    //convert to relative to current map
    var relCurr = {
        x: relOrig.x * mapZoom,
        y: relOrig.y * mapZoom
    };
    iconSize *= mapZoom;


    var percSize = {
        x: iconSize / canvasDimensions.x*100,
        y: iconSize / canvasDimensions.y*100
    };

    var percPosition = {
        x: relCurr.x / (canvasDimensions.x)*100,
        y: relCurr.y / (canvasDimensions.y)*100
    }

    $(markerElement).attr('src', icon).css({
        'left': percify(percPosition.x),
        'top': percify(percPosition.y),
        'width': percify(percSize.x),
        'height': percify(percSize.y),
        'position':'absolute'
    }).attr('id', id).addClass('marker').attr('draggable', false);

    //console.log('can now drag '+id);
    dragMarker(markerElement, id);

    selectio.addSelectables(markerElement);
    $('#mapmarkers').append(markerElement);
    return markerElement;
}

/**
 * highlights a given element.
 * **NOTE** also deselects any other elements
 * @param {HTMLElement} elmnt element to be highlighted
 * @param {string} elmntID the id of that element
 */
function highlightMarker(elmnt, elmntID){
    var icon = $(elmnt).attr('src');
    saveMarkerText();

    $('.marker').removeClass('editingMarker');
    $(elmnt).addClass('editingMarker');
    highlightedMarker = elmnt;
    markerID = elmntID;
    setMarkerText(elmnt);
    setToolsVisibility(true);

    $("img[src$='"+icon+"']").filter(".baseIcon").trigger('click');//XXX here it is!!!

}

/**
 * deselects all markers
 */
function deselectMarker(){
    $('.editingMarker').removeClass('editingMarker');
    clearText();
    highlightedMarker = undefined;
    markerID = undefined;
    setToolsVisibility(false);
}

/**
 * changes the marker text area to visibile and puts text of the current highlighted marker in it
 */
function setMarkerText(){
    setToolsVisibility(true);

    var marker = projJson.markers[markerID];
    //console.log(marker);

    $('#mainText').val(marker.note);
    $('#titleText').val(marker.title);
    
    setIconSize(marker.iconSize, true);//will be in reference to true not current
    return;
}

/**
 * updates json with the current values in the marker text area
 */
function saveMarkerText(){
    if($('.editingMarker').length === 0 || highlightedMarker == undefined){
        return;
    }

    var textToBeSaved = $('#mainText').val();
    var titleToBeSaved = $('#titleText').val();
    var iconSizeToSave = getIconSize(true);

    var marker = projJson.markers[markerID];
    if(marker.note === textToBeSaved &&
    marker.title === titleToBeSaved && 
    iconSizeToSave == marker.iconSize){
        return;
    }

    console.log("saving marker text change");
    marker.note = textToBeSaved;
    marker.title = titleToBeSaved;
    marker.iconSize = Math.round(iconSizeToSave);
    newChanges();   
    return;
}

/**
 * clears the text area
 */
function clearText(){
    $('#mainText').val("");
    $('#titleText').val("");
}

/**
 * deletes all highlighted markers from the page and the json
 */
function deleteMarker(){
    if($('.editingMarker').length === 0){
        return;
    }
    clearText();

    var idToBeDeleted = getEditedIds();
    console.log("about to delete "+idToBeDeleted);

    var markers = projJson.markers;

    idToBeDeleted.forEach(deathRowId =>{
        delete markers[deathRowId];
    });

    setToolsVisibility(false)

    newChanges();
    $(".editingMarker").remove();
}

/**
 * resets the window to be blank
 */
function projectReset(){
    ipcRenderer.send('setTitle', 'Map Annotater');
    $('#rightbar').css('visibility', 'hidden');
    $('#welcomeMessage').css('visibility', 'visible');
    setToolsVisibility(false);
    $('#mapmarkers').empty();
    projJson=undefined;

    clearText()

    $('#mapscreen').css({
        'top':'0px', 
        'left':'0px',
        'visibility': 'hidden'
    });

    $('#mapmarkers').empty();
}

/**
 * adds a new marker to the json
 * **NOTE** position and size defined relative to original size
 * @param {object} position has form {x:int, y:int}
 * @param {string} markerID id of the new marker
 * @param {int} markerSize size of the new marker
 */
function addJsonMarker(position, markerID, markerSize){

    //var papaDimensions = getDimensions("#mapscreen");

    /* need to adjust because currently defined with respect to current not dimensions
    but when reloaded will be with respect to absolute dimensions */
    
    //save marker information on json obj itself
    projJson.markers[markerID] = {
        icon: currentMarkerIcon,
        iconSize: markerSize,
        pos: position,
        title: '',
        note: ''
    }
    newChanges();
}

/**
 * changes the current marker size, adjusting highlighted marker if present
 * @param {boolean} direction if true increase size, if false decrease, if null don't change
 */
function updateMarkerIconSize(direction=null){
    //do on button push, also on save and on scroll wheel, change by 10%
    //when press button, change number itself then call this
    
    var originalNum = getIconSize();

    if(isNaN(originalNum)){
        console.log('not a num');
        setMarkerSize(defaultImgSize*mapZoom);
        return;
    }

    if(direction === null){
        setMarkerSize(originalNum);
        console.log('marker size set manually');
        return;
    }

    var newNum;
    if(direction){
        newNum = (originalNum * 1.1);
    }
    else{
        newNum = (originalNum * 0.9);
    }
    newNum = newNum;

    /* if nothing changed */
    if((newNum < minImgSize*mapZoom && !direction)
        || (newNum > maxImgSize*mapZoom && direction)){
        console.log("too much "+(newNum) );
        return;
    }

    setMarkerSize(newNum);//passes relative to current
    ipcRenderer.send('work-unsaved');
}

/**
 * resizes all highlighted elements to imgSize
 * **NOTE** takes size relative to current
 * @param {int} imgSize new size to be set to
 */
function setMarkerSize(imgSize){

    var asbSize = Math.round(imgSize/mapZoom)
    if(asbSize < minImgSize || asbSize > maxImgSize){
        return;
    }

    //change value in table
    //$('#iconResizeInput').val(imgSize);
    setIconSize(asbSize, true);

    var markersEditing = $('.editingMarker');
    if(markersEditing.length == 0){//if no element to change
        //console.log("was a dry run");
        return;
    }


    var highLightIds = Object.create(null);
    var canvasSize = getDimensions("#mapscreen");

    //update markers themselves
    markersEditing.each(function(){
        currMarker = $(this);

        var currentSize = parseFloat(currMarker.css('width'));//width and height are same
        var currentTop = parseFloat(currMarker.css('top'));

        var currentLeft = parseFloat(currMarker.css('left'));
        var currId = currMarker.attr('id');

        var shiftAmount = (imgSize - currentSize)/2;
        //update position so moves symetrically
        currMarker.css({
            'left': percify((currentLeft-shiftAmount)/canvasSize.x*100),
            'top': percify((currentTop-shiftAmount)/canvasSize.y*100)
        });

        highLightIds[currId] = shiftAmount;
    });

    //redefine it in terms of original size
    var relImgSize = Math.round(imgSize / mapZoom);

    //update values on json
    Object.keys(highLightIds).forEach(markerId => {
        var marker = projJson.markers[markerId];

        marker.iconSize = relImgSize;
        marker.pos = {
            x: Math.round(marker.pos.x - highLightIds[markerId]),
            y: Math.round(marker.pos.y - highLightIds[markerId])
        }
    });

    //set height and width for all of them
    var percWidth = percify(imgSize/canvasSize.x*100);
    var percHeight = percify(imgSize/canvasSize.y*100);

    $(markersEditing).width(percWidth);
    $(markersEditing).height(percHeight);

    //change saved scale
    if(highlightedMarker != undefined){
        saveMarkerText();
    }
}

/**
 * updates the zoom variable according to the zoomLevels
 * @param {int} newIndex the index of the new zoom level to be set to 
 */
function changeZoom(newIndex){
    zoomIndex = newIndex;
    mapZoom = zoomLevels[newIndex];
    return mapZoom;
}

/**
 * changes the physical size of the map along with all the markers
 * @param {boolean} direction if true zooming out(smaller), if false zooming in(bigger)
 * @param {event} e scroll event 
 */
function updateMapSize(direction, e){
    var newZoom;
    var oldZoom = mapZoom;

    if(direction){//zoom out
        if(zoomIndex <= minMapZoom){
            console.log('fully zoomed in');
            return;
        }
        newZoom = changeZoom(--zoomIndex);
    }
    else{
        if(zoomIndex >= maxMapZoom){
            console.log('fully zoomed out');
            return;
        }
        newZoom = changeZoom(++zoomIndex);
    }
    //lucZoom(oldZoom, newZoom, e);

    var newDimensions = {
        x:Math.round(trueImageWidth*newZoom),
        y:Math.round(trueImageHeight*newZoom)
    }

    $("#mapscreen, #mapmarkers, #mapimg").css({
        'width': newDimensions.x,
        'height': newDimensions.y
    });
    
    //move map so centered on mouse
    zoomOffsetCompensation(oldZoom, newZoom, e);
    updateBgOffsets();
}

/**
 * moves image to adjust for changing size so it is still centered around the mouse
 * **NOTE** zoom is between 0 and 1
 * @param {number} oldZoom previous amount of zoom
 * @param {number} newZoom new amount of zoom
 * @param {event} e the mouse wheel zoom event
 */
function zoomOffsetCompensation(oldZoom, newZoom, e){
    var screenElement = $('#mapscreen');
    
    var zoomRatio = newZoom/oldZoom;

    var imageLeftDist = parseInt(screenElement.css('left'));
    var imageTopDist = parseInt(screenElement.css('top'));

    var ptOne = {
        x: e.pageX-imageLeftDist,
        y: e.pageY-imageTopDist
    }

    var nextPt = {
        x: ptOne.x*zoomRatio,
        y: ptOne.y*zoomRatio
    }

    var diffs = {
        x: nextPt.x - ptOne.x,
        y: nextPt.y - ptOne.y
    }

    var newLeft = Math.round(imageLeftDist - diffs.x);
    var newTop = Math.round(imageTopDist- diffs.y);

    screenElement.css({
        'left':newLeft,
        'top':newTop
    });
}

/**
 * sets the mouseMode variable to newMode. Also changes highlighted icon on thr right bar
 * **NOTE** mousemode can only be 'view' 'edit' or 'add'
 * @param {string} newMode the new mode
 */
function setMouseMode(newMode){
    mouseMode=newMode;
    $("#togglebuttons").children().removeClass("currentmousemode");
    $("."+newMode).addClass("currentmousemode");
}

/**
 * just adds % to end of a number
 * @param {int} num 
 */
function percify(num){
    return num+"%"
}

/**
 * sets marker text fields to be visible or invisible
 * @param {boolean} nowVisible whether to turn visible or not
 */
function setToolsVisibility(nowVisible){
    if(nowVisible){
        $("#markertools").css('visibility', 'visible');
    }
    else{
        $("#markertools").css('visibility', 'hidden');
        highlightedMarker=undefined;
    }
}

/**
 * gets width and height of an elemnt
 * @param {string} selector jquery selector for element to get dimensions of
 * @returns object of form {x: int, y: int}
 */
function getDimensions(selector){
    var dimensions = {
        x: parseInt($(selector).css('width')),
        y: parseInt($(selector).css('height'))
    }
    return dimensions;
}

/**
 * resets background to take up whole background
 */
function updateBgOffsets(){
    imgOffsets = getOffsets('#mapscreen');
    $('#bgmaterial').css({'left': -imgOffsets.x,
    'top': -imgOffsets.y});
}

/**
 * finds offset of an element
 * @param {string} selector jquery selector for the elment
 * @returns object of form {x: int, y: int}
 */
function getOffsets(selector){
    var offsets = {
        x: parseInt($(selector).css('left')),
        y: parseInt($(selector).css('top'))
    }
    return offsets;
}

/**
 * gets value of #iconResizeInput and converts to relative to current size
 * @param {boolean} getTrue if true will get you relative to original size
 */
function getIconSize(getTrue=false){
    var imgSize = $('#iconResizeInput').val();
    if(isNaN(imgSize)){
        return "z";
    }
    if(!getTrue){
        imgSize *= mapZoom;
    }
    return imgSize;
}

/**
 * sets icon size input field on right bar
 * **NOTE** should always set it relative to original
 * @param {int} newSize new size
 * @param {boolean} alreadyTrue whether is already defined to original image
 */
function setIconSize(newSize, alreadyTrue=false){
    if(!alreadyTrue){
        newSize = Math.round(newSize / mapZoom);
    }
    //console.log("it be "+newSize);
    $('#iconResizeInput').val(newSize);
}

/**
 * saved unsaved changes and uses ipc to send json to main background thread of program 
 */
function saveFile(){
    saveMarkerText();
    if(typeof projJson !== 'undefined'){
        console.log("sending save request");
        ipcRenderer.send('project:savefile', projJson);
        $('#saveel').addClass('savenow');
    }
    else{
        console.log("no file to save");
    }
}

/* resets element so can display save animation repeatedly */
$('#saveel').on('animationend', function(){
    $('#saveel').removeClass('savenow');
});


//projInfo has [name, json]
ipcRenderer.on('project:open', function(e,projInfo){
    projJson = projInfo[1];
    loadProject(projInfo[0]);
});

//responds to save request from client
ipcRenderer.on('project:save', function(e){
    saveFile();
});

ipcRenderer.on('project:delete', function(e){
    projectReset();
});

ipcRenderer.on('change:mousemode', (event, mode) =>{
    setMouseMode(mode);
});

ipcRenderer.on('delete:marker', function(e){
    deleteMarker();
});

ipcRenderer.on('select:all', function(e){
    $('.marker').addClass('editingMarker');
});

var ctrlDown = false;
var ctrlKey = 17, zKey = 90, yKey = 89;

//I had to do these this way to override build in text undo
document.body.onkeydown = function(e) {
  if (e.keyCode == ctrlKey) {
    ctrlDown = true;
  }
  else if (ctrlDown && e.keyCode == zKey){
    e.preventDefault();
    saveMarkerText();
    undoStep();
    return false;
  }
  else if(ctrlDown && e.keyCode == yKey){
      e.preventDefault();
      redoStep();
  }
}
document.body.onkeyup = function(e) {
  if (e.keyCode == ctrlKey) {
    ctrlDown = false;
  };
};

$('#iconResize').on('click', function(){
    currSize = getIconSize(true);
    if(currSize > maxImgSize){
        setIconSize(maxImgSize, true);
    }
    else if(currSize < minImgSize){
        setIconSize(minImgSize, true);
    }
    updateMarkerIconSize();
});

$('#bgmaterial, #mapscreen').on('mousewheel', function(e){
    if(mouseMode === 'view'){
        if(e.originalEvent.wheelDelta /120 > 0) {
            updateMapSize(true, e);
        }
        else{
            updateMapSize(false, e);
        }
        return;
    }

    //if past here will be either view or add
    if(e.originalEvent.wheelDelta /120 > 0) {// from https://stackoverflow.com/questions/8189840/get-mouse-wheel-events-in-jquery
        updateMarkerIconSize(true);
    }
    else{
        updateMarkerIconSize(false);
    }
});

$('#saveText').on('click', function(){
    saveFile();
});

$('#deleteMarker').on('click', function(){
    deleteMarker();
});

$('#viewMouse').on('click', function(){
    setMouseMode("view");
});

$('#addMouse').on('click', function(){
    setMouseMode("add");
});

$('#editMouse').on('click', function(){
    setMouseMode("edit");
});

$('.marker, #mapmarkers').on('click', function(event){
    event.preventDefault();
});

$('#mainText').on('onkeyup', function() {
    console.log("hswuie");
    ipcRenderer.send('work-unsaved');
});


$('#bgmaterial, #mapimg').on('click', function(e){
    switch (mouseMode) {
        case 'add': 
            e.preventDefault();
            addNewMarker(e.clientX, e.clientY);
            break;
        case 'view':
            break;
        case 'edit':
            break;
        /*default:
            throw 'mouse mode in something other than view, edit or add';*/
    }
});

makeMarkerOptions();
