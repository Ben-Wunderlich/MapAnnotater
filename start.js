
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
    area: document.getElementById('mapscreen'),
    onDragStart: function() {
        if(mouseMode!='edit'){
            selectio.break();
        }
    },
    onElementSelect: function(element) {
        if(mouseMode=='edit'){
        if($(".editingMarker").length==0){
            highlightMarker(element, $(element).attr('id'));
        }
        else{
            setToolsVisibility(false);
            $(element).addClass('editingMarker');
        }
    }
    },
    onElementUnselect: function(element) {
        if(mouseMode=='edit'){
        $(element).removeClass('editingMarker');}
    }
});

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

function newChanges(clearStack=true){
    updateOperationStack(clearStack);
    ipcRenderer.send('work-unsaved');
}


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

//change json to previous version and update page
function remakeMarkers(previousSnapshot){
    deselectMarker();
    projJson = previousSnapshot;
    //console.log(projJson);
    //delete current markers and change to previousSnapshot
    $("#mapmarkers").empty();

    for (key of Object.keys(projJson.markers)){
        var marker = projJson.markers[key];

        addExistingMarker(marker.pos, marker.icon, marker.iconSize);
    }
    newChanges(false);
}

function updateOperationStack(clearRedo=true){
    console.log('saving');
    if(clearRedo){
        redoStack=[];//if would try to redo after changes, changes would be lost
    }
    if(operationStack.length >= maxStackCapacity){
        operationStack.shift();
    }
    var deepCopy = JSON.parse(JSON.stringify(projJson));

    operationStack.push(deepCopy);
}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

/* returns array of ids belonging to all highlighted markers */
function getEditedIds(){
     var selectedIds = []
    $(".editingMarker").each(function() { selectedIds.push($(this).attr('id'))});
    return selectedIds
}

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

//used from drag file
function updateMarkerPos(){
    if($('.editingMarker').length !== 1){
        throw "Marker position updated without propper number of sleected markers"
    }

    var offsets = getOffsets('.editingMarker');

    //XXX need to recalulate for main image size

    /* need to adjust because currently defined with respect to current not dimensions
    but when reloaded will be with respect to absolute dimensions */
    //var papaDimensions = getDimensions("#mapscreen");
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


//XXX loading icons in wrong place with wrong scale
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

function loadProject(projectName){
    console.log("now opening ".concat(projectName));
    ipcRenderer.send('setTitle', projectName);
    $('#rightbar, #mapscreen').css('visibility', 'visible');
    $('#welcomeMessage').css('visibility', 'hidden');
    setToolsVisibility(false);
    //$("#sizeAdjustor").css('visibility', 'hidden');

    changeZoom(0);//also updates mapzoom

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);
    setMouseMode("view");

    //reset image position
    $('#mapscreen').css({'top':'0px', 'left':'0px'})

    //load icons on image
    loadIcons();
    updateOperationStack();
}

//XXX this works very strangely with offsets, calculations are off somewhere
function addNewMarker(currX, currY){

    ipcRenderer.send('change:redo', true);
    var imgWidth = getIconSize();

    if(isNaN(imgWidth)){
        imgWidth = defaultImgSize*mapZoom;
    }
    if(imgWidth < minImgSize*mapZoom){imgWidth = minImgSize*mapZoom;}
    if(imgWidth > maxImgSize*mapZoom){imgWidth = maxImgSize*mapZoom;}

    var canvasOffset = getOffsets("#mapscreen");

    var absPosition = {
        x: currX-canvasOffset.x-(imgWidth/2),
        y: currY-canvasOffset.y-(imgWidth/2)
    }

    var truePos = {
        x: absPosition.x / mapZoom,
        y: absPosition.y / mapZoom
    }
    
    var id = makeid(12);

    var icon = currentMarkerIcon;
    addJsonMarker(absPosition, id, imgWidth);

    var markerElement = addExistingMarker(truePos, id, icon, imgWidth);//XXX ned put relative to orig

    highlightMarker(markerElement, id);
}

/*absposition in form {x: num, y: num} id is a str, re;ative to curr size
 icon is str of img it shows as, iconsize is num, how big icon is */
function addExistingMarker(absPosition, id, icon, iconSize){
    var markerElement = document.createElement("IMG");

    var canvasDimensions = getDimensions("#mapscreen");

    //convert to relative to current map
    absPosition = {
        x: absPosition.x * mapZoom,
        y: absPosition.y * mapZoom
    };
    iconSize *= mapZoom;


    var percSize = {
        x: iconSize / canvasDimensions.x*100,
        y: iconSize / canvasDimensions.y*100
    };

    var percPosition = {
        x: absPosition.x / (canvasDimensions.x)*100,
        y: absPosition.y / (canvasDimensions.y)*100
    }

    $(markerElement).attr('src', icon).css({
        'left': percify(percPosition.x),
        'top': percify(percPosition.y),
        'width': percify(percSize.x),
        'height': percify(percSize.y),
        'position':'absolute'
    }).attr('id', id).addClass('marker');

    dragMarker(markerElement, id);

    selectio.addSelectables(markerElement);
    $('#mapmarkers').append(markerElement);
    return markerElement;
}

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

//called from drag.js
function deselectMarker(){
    $('.editingMarker').removeClass('editingMarker');
    clearText();
    highlightedMarker = undefined;
    markerID = undefined;
    setToolsVisibility(false);
}

function setMarkerText(elmnt){
    setToolsVisibility(true);

    var marker = projJson.markers[markerID];
    console.log(marker);

    //console.log("it be"+markerID);
    //var relIconSize = Math.round(marker.iconSize)//XXX

    $('#mainText').val(marker.note);
    $('#titleText').val(marker.title);
    //$('#iconResizeInput').val(relIconSize);
    setIconSize(marker.iconSize, true);//will be in reference to true not current
    return;
}

function saveMarkerText(){
    if($('.editingMarker').length === 0 || highlightedMarker == undefined){//XXX this is bad?
        return;
    }

    var textToBeSaved = $('#mainText').val();
    var titleToBeSaved = $('#titleText').val();
    //var iconSizeToSave = $('#iconResizeInput').val();XXX maybe wont work
    var iconSizeToSave = getIconSize(true);

    var marker = projJson.markers[markerID];
    if(marker.note === textToBeSaved &&
    marker.title === titleToBeSaved && 
    iconSizeToSave == marker.iconSize){
        console.log("no change "+iconSizeToSave + " "+marker.iconSize);
        return;
    }

    console.log("saving marker text change");
    marker.note = textToBeSaved;
    marker.title = titleToBeSaved;
    marker.iconSize = Math.round(iconSizeToSave);
    newChanges();   
    return;
}

function clearText(){
    $('#mainText').val("");
    $('#titleText').val("");
}

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

//resets the window to be blank
function projectReset(){//XXX1
    ipcRenderer.send('setTitle', 'Map Annotater');
    $('#rightbar').css('visibility', 'hidden');
    $('#welcomeMessage').css('visibility', 'visible');
    setToolsVisibility(false);
    $('#mapmarkers').empty();

    clearText()

    $('#mapscreen').css({
        'top':'0px', 
        'left':'0px',
        'visibility': 'hidden'
    });

    //$("#mapimg").removeAttr("src");

    $('#mapmarkers').empty();
}

/* takes in position and markersize relative to current size, check to see if that is happening XXX */
function addJsonMarker(position, markerID, markerSize){

    //var papaDimensions = getDimensions("#mapscreen");

    /* need to adjust because currently defined with respect to current not dimensions
    but when reloaded will be with respect to absolute dimensions */
    var relPos = {
        x: Math.round(position.x /mapZoom),
        y: Math.round(position.y /mapZoom)
    };
    console.log(relPos);
    var relSize = Math.round(markerSize / mapZoom);//could use width or height
    
    //save marker information on json obj itself
    projJson.markers[markerID] = {
        icon: currentMarkerIcon,
        iconSize: relSize,
        pos: relPos,
        title: '',
        note: ''
    }
    newChanges();
}

//direction true is up, else is down, must have a highlighted marker
function updateMarkerIconSize(direction=null){
    //do on button push, also on save and on scroll wheel, change by 10%
    //when press button, change number itself then call this
    
    //var originalNum = $('#iconResizeInput').val();
    var originalNum = getIconSize();
    console.log("origion is "+originalNum);

    if(isNaN(originalNum)){//if isnt a number
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
    }//XXX might have needed this

    setMarkerSize(newNum);//passes relative to current

}

/*XXX does not work when zoom out then resize with mouse wheel */
/* takes size relative to current*/
function setMarkerSize(imgSize){

    var asbSize = imgSize/mapZoom
    if(asbSize < minImgSize || asbSize > maxImgSize){
        return;
    }

    //change value in table
    //$('#iconResizeInput').val(imgSize);
    setIconSize(imgSize, false);

    var markersEditing = $('.editingMarker');
    if(markersEditing.length == 0){//if no element to change
        console.log("was a dry run");
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

        console.log("dif between "+imgSize + " "+currentSize);  
        var shiftAmount = (imgSize - currentSize)/2;
        console.log("shift by "+shiftAmount);
        //update position so moves symetrically
        currMarker.css({
            'left': percify((currentLeft-shiftAmount)/canvasSize.x*100),
            'top': percify((currentTop-shiftAmount)/canvasSize.y*100)
        });

        highLightIds[currId] = shiftAmount;
    });

    //redefine it in terms of original size
    //var papaDimensions = getDimensions("#mapscreen");
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

function changeZoom(newIndex){
    zoomIndex = newIndex;
    mapZoom = zoomLevels[newIndex];
    return mapZoom;
}

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
}

//finally works, moves image to adjust for changing size so is still around mouse
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

function windowReset(){
    setMouseMode("view");
    clearText();
    //this will need more stuff as it goes
}

function setMouseMode(newMode){
    mouseMode=newMode;
    $("#togglebuttons").children().removeClass("currentmousemode");
    $("."+newMode).addClass("currentmousemode");
}

/* very simple, just here in case I need to change them all at once */
function percify(num){
    return num+"%"
}

/* sets markertools to be visible or hiidden, takes bool nowVisible */
function setToolsVisibility(nowVisible){
    if(nowVisible){
        $("#markertools").css('visibility', 'visible');
    }
    else{
        $("#markertools").css('visibility', 'hidden');
        highlightedMarker=undefined;
    }
}

/* returns width and height css values in object, access via .x and .y */
function getDimensions(selector){
    var dimensions = {
        x: parseInt($(selector).css('width')),
        y: parseInt($(selector).css('height'))
    }
    return dimensions;
}

/* returns left and top css values in object, access via .x and .y */
function getOffsets(selector){
    var offsets = {
        x: parseInt($(selector).css('left')),
        y: parseInt($(selector).css('top'))
    }
    return offsets;
}

/* gets value of #iconResizeInput and converts to relative pixel size 
if specify getTrue it will give you relative to original image*/
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

/* takes value of icon size in pixels, already true if is relative to original picture */
function setIconSize(newSize, alreadyTrue=false){
    if(!alreadyTrue){
        newSize = Math.round(newSize / mapZoom);
    }
    //console.log("it be "+newSize);
    $('#iconResizeInput').val(newSize);
}

function saveFile(){
    saveMarkerText();
    if(typeof projJson !== 'undefined'){
        console.log("sending save request");
        ipcRenderer.send('project:savefile', projJson);
    }
    else{
        console.log("no file to save");
    }
}


//projInfo has [name, json]
ipcRenderer.on('project:open', function(e,projInfo){
    projJson = projInfo[1];
    loadProject(projInfo[0]);
    windowReset();
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


$('#bgmaterial, #mapscreen').on('click', function(e){
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
