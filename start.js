//USE 'npm start' to start it
//dragElement(document.getElementById("mapscreen"));

const electron = require('electron');
const {ipcRenderer} = electron;
//const dialog = electron.remote.dialog;
var sizeOf = require('image-size');

const fs = require('fs');
//const { title } = require('process');
//const { debug, clear } = require('console');
//const { type } = require('jquery');

var projJson;

var highlightedMarker;
var markerID;

var currentMarkerIcon;

const defaultImgSize = 24;
const minImgSize = 5;
const maxImgSize = 300;

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
    0.12157665457
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

function changeBackgroundImage(url){
    let formatUrl = 'url('+url+')';
    var dimensions = sizeOf(url);

    $('#mapscreen').css({'background-image': formatUrl,
    'width':dimensions.width, 'height': dimensions.height
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

    for (marker of projJson.markers){
        addExistingMarker(marker.xPos, marker.yPos, marker.id, marker.icon, marker.iconSize);
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

    projJson.markers.forEach(marker =>{
        if(idToBeChanged.includes(marker.id)){
            marker.icon = newIcon;
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
    const markers = projJson.markers;
    if($('.editingMarker').length !== 1){
        throw "Marker position updated without propper number of sleected markers"
    }

    var fromLeft = $('.editingMarker').css('left');
    var fromTop = $('.editingMarker').css('top');

    markers.forEach(marker =>{
        if(marker.id === markerID){
            if(marker.xPos === fromLeft && marker.yPos === fromTop){
                return;
            }
            marker.xPos = fromLeft;
            marker.yPos = fromTop;
            newChanges();
            return;
        }
    });
}


function loadIcons(projectName){
    //clear previous markers
    $('#mapmarkers').empty();

    //add icons from project
    const markers = projJson.markers;

    //XXX add thing for icon size

    markers.forEach(marker =>{
        addExistingMarker(marker.xPos, marker.yPos, marker.id, marker.icon, marker.iconSize)
    });
}

function loadProject(projectName){
    console.log("now opening ".concat(projectName));
    ipcRenderer.send('setTitle', projectName);
    $('#rightbar').css('visibility', 'visible');
    $('#welcomeMessage').css('visibility', 'hidden');
    $("#markertools").css('visibility', 'hidden');
    //$("#sizeAdjustor").css('visibility', 'hidden');

    changeZoom(0);//also updates mapzoom
    $('#mapscreen').css('zoom', mapZoom);

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);
    setMouseMode("view");

    //reset image position
    $('#mapscreen').css({'top':'0px', 'left':'0px'})

    //load icons on image
    loadIcons(projectName);
    updateOperationStack();
}

function addNewMarker(currX, currY){
    currX /= mapZoom;
    currY /= mapZoom;
    ipcRenderer.send('change:redo', true);
    var imgWidth = parseInt($('#iconResizeInput').val());
    var halfImgWidth;
    if(isNaN(imgWidth)){
        halfImgWidth = defaultImgSize / 2;
    }
    else{
        halfImgWidth = Math.round(imgWidth / 2);
    }

    canvasX = parseInt($('#mapscreen').css('left'), 10);
    canvasY = parseInt($('#mapscreen').css('top'), 10);

    practicalX = currX-halfImgWidth-canvasX;
    practicalY = currY-halfImgWidth-canvasY;

    var id = makeid(12);

    var icon = currentMarkerIcon;
    addJsonMarker(practicalX, practicalY, id, halfImgWidth*2);

    var markerElement = addExistingMarker(practicalX, practicalY, id, icon, halfImgWidth*2)

    highlightMarker(markerElement, id);
}

function addExistingMarker(fromLeft, fromTop, id, icon, iconSize){
    var markerElement = document.createElement("IMG");

    $(markerElement).attr('src', icon).css({
        'left': fromLeft,
        'top': fromTop,
        'position':'absolute'
    }).attr('id', id).addClass('marker').width(iconSize).height(iconSize);

    dragMarker(markerElement, id);

    $('#mapmarkers').append(markerElement);
    return markerElement;
}

function highlightMarker(elmnt, elmntID){
    var icon = $(elmnt).attr('src');
    saveMarkerText();

    $('.marker').removeClass('editingMarker');
    $(elmnt).addClass('editingMarker');
    setMarkerText(elmnt, elmntID);
    highlightedMarker = elmnt;
    markerID = elmntID;
    //$("#titleandtext").css('visibility', 'visible');
    $("#markertools").css('visibility', 'visible');

    $("img[src$='"+icon+"']").filter(".baseIcon").trigger('click');//XXX here it is!!!

}



//called from drag.js
function deselectMarker(){
    $('.marker').removeClass('editingMarker');
    clearText();
    highlightedMarker = undefined;
    markerID = undefined;
    $("#markertools").css('visibility', 'hidden');
    //$("#titleandtext").css('visibility', 'hidden');
    //$("#sizeAdjustor").css('visibility', 'hidden');
}

function deleteAllMarkers(){
    $('.marker').addClass('editingMarker');
    deleteMarker();
}

function setMarkerText(elmnt, elementID){
    $("#markertools").css('visibility', 'visible');

    projJson.markers.forEach(marker => {
        if(marker.id === elementID){
            if(highlightedMarker === elmnt){
                return;//is already there
            }
            $('#mainText').val(marker.note);
            $('#titleText').val(marker.title);
            $('#iconResizeInput').val(marker.iconSize);
            return;
        }
    });
}

function saveMarkerText(){
    if($('.editingMarker').length === 0){
        return;
    }

    var textToBeSaved = $('#mainText').val();
    var titleToBeSaved = $('#titleText').val();
    var iconSizeToSave = $('#iconResizeInput').val();

    projJson.markers.forEach(marker => {
        if(marker.id === markerID){
            if(marker.note === textToBeSaved &&
            marker.title === titleToBeSaved && 
            iconSizeToSave == marker.iconSize){
                console.log("no change");
                return;
            }

            console.log("saving marker text change");
            marker.note = textToBeSaved;
            marker.title = titleToBeSaved;
            marker.iconSize = iconSizeToSave;
            newChanges();   
            return;
        }
    });
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

    var remainingMarkers=[];
    for (marker of projJson.markers){
        if(!idToBeDeleted.includes(marker.id)){//if shouldnt be deleted
            remainingMarkers.push(marker);
        }
    }
    $("#markertools").css('visibility', 'hidden');
    projJson.markers = remainingMarkers;
    //XXX also hide thing
    newChanges();
    $(".editingMarker").remove();
}

//resets the window to be blank
function projectReset(){
    ipcRenderer.send('setTitle', 'Map Annotater');
    $('#rightbar').css('visibility', 'hidden');
    $('#welcomeMessage').css('visibility', 'visible');

    clearText()

    $("#mapscreen").removeAttr('style');

    $('#mapmarkers').empty();
    //loadIcons(projectName);
}

function addJsonMarker(xPosition, yPosition, markerID, markerSize){
    var newMarker = {
        id:markerID,
        icon: currentMarkerIcon,
        iconSize: markerSize,
        xPos: xPosition,
        yPos: yPosition,
        title: '',
        note: ''
    }
    projJson.markers.push(newMarker);
    newChanges();
}

//direction true is up, else is down, must have a highlighted marker
function updateMarkerIconSize(direction=null){
    //do on button push, also on save and on scroll wheel, change by 10%
    //when press button, change number itself then call this
    var originalStr = $('#iconResizeInput').val();

    if(isNaN(originalStr)){//if isnt a number
        console.log('not a num');
        setMarkerSize(defaultImgSize);
        return;
    }
    var originalNum = parseInt(originalStr);
    if(direction === null){
        setMarkerSize(originalNum);
        console.log('marker size set manually');
        return;
    }

    var newNum;
    if(direction){
        newNum = originalNum * 1.1;
    }
    else{
        newNum = originalNum * 0.9;
    }
    setMarkerSize(Math.ceil(newNum));
}

function setMarkerSize(imgSize){
    var markerObject = $('.editingMarker');
    var currentSize = parseInt(markerObject.css('width'));
    var currentTop = parseInt(markerObject.css('top'));
    var currentLeft = parseInt(markerObject.css('left'));
    var markerIdentifier = markerObject.attr('id');


    if(imgSize < minImgSize){
        imgSize = minImgSize
    }
    else if(imgSize > maxImgSize){
        imgSize = maxImgSize;
    }

    //change numerical scale
    $('#iconResizeInput').val(imgSize);
    //change actual size

    $(highlightedMarker).width(imgSize);
    $(highlightedMarker).height(imgSize);//is square

    //update position so moves symetrically
    var shiftAmount = Math.floor((imgSize - currentSize)/2);
    $('.editingMarker').css({
        'left': currentLeft-shiftAmount+'px',
        'top': currentTop-shiftAmount+'px'
    });
    //update json from top and left
    projJson.markers.forEach(marker => {
        if(marker.id === markerIdentifier){
            marker.yPos = currentTop-shiftAmount;
            marker.xPos = currentLeft-shiftAmount;
            return;
        }
    });

    //change saved scale
    saveMarkerText();
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
    //baseZoomStabilize(oldZoom, newZoom)
    zoomOffsetCompensation(oldZoom, newZoom, e);
    //lucZoom(oldZoom, newZoom, e);

    $('#mapscreen').css('zoom', newZoom);

    //move map so centered on mouse
}


function zoomOffsetCompensation(oldZoom, newZoom, e){
    var screenElement = $('#mapscreen');
    
    var imageLeftDist = parseInt(screenElement.css('left'));
    var imageTopDist = parseInt(screenElement.css('top'));

    //console.log(e.clientX +" "+e.clientY);
    var mouseFromImgLeft = e.pageX;
    var mouseFromImgTop = e.pageY;

    var oldMouseLeft = mouseFromImgLeft * oldZoom;
    var oldMouseTop = mouseFromImgTop * oldZoom;

    var newMouseLeft = mouseFromImgLeft * newZoom;
    var newMouseTop = mouseFromImgTop * newZoom

    //XXX currently working on this
    var offsetX = (newMouseLeft - oldMouseLeft)/newZoom;
    var offsetY = (newMouseTop - oldMouseTop)/newZoom;

    console.log('offsetx ' +offsetX);
    console.log('offsety ' +offsetY);

    //should be subtraction
    var newLeft = Math.ceil(imageLeftDist - offsetX);
    var newTop = Math.ceil(imageTopDist -offsetY);

    console.log(oldZoom + " "+ newZoom);

    screenElement.css({
        'left':newLeft,
        'top':newTop
    });
}

function viewableArea(){
    
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


//projInfo has [name, json]
ipcRenderer.on('project:open', function(e,projInfo){
    projJson = projInfo[1];
    loadProject(projInfo[0]);
    windowReset();
});

//responds to save request from client
ipcRenderer.on('project:save', function(e){
    saveMarkerText();
    if(typeof projJson !== 'undefined'){
        ipcRenderer.send('project:savefile', projJson);
    }
    else{
        console.log("no file to save");
    }
});

ipcRenderer.on('project:delete', function(e){
    projectReset();
});

ipcRenderer.on('delete:marker', function(e){
    deleteMarker();
});

ipcRenderer.on('delete:all', function(e){
    deleteAllMarkers();
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
    if(typeof highlightedMarker === 'undefined'){
        console.log('no highlighted elments');
        return;
    }
    if(e.originalEvent.wheelDelta /120 > 0) {// from https://stackoverflow.com/questions/8189840/get-mouse-wheel-events-in-jquery
        updateMarkerIconSize(true);
    }
    else{
        updateMarkerIconSize(false);
    }
});

$('#saveText').on('click', function(){
    saveMarkerText();
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

$('.marker').on('click', function(event){
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
        default:
            throw 'mouse mode in something other than view, edit or add';
    }
});

makeMarkerOptions();