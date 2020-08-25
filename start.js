//dragElement(document.getElementById("mapscreen"));

const electron = require('electron');
const {ipcRenderer} = electron;
//const dialog = electron.remote.dialog;
var sizeOf = require('image-size');

const fs = require('fs');
const { title } = require('process');
const { debug, clear } = require('console');

var projJson;

var highlightedMarker;
var markerID;

var currentMarkerIcon;

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

function newChanges(){
    updateOperationStack();
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
    //XXX do this at some point
    redoSnapshot = redoStack.pop();//dont need to check size because relies on operationstack 
    //maybe need to do double pop, will have to check that
}

//change json to previous version and update page
function remakeMarkers(previousSnapshot){
    deselectMarker();
    projJson = previousSnapshot;
    //console.log(projJson);
    //delete current markers and change to previousSnapshot
    $("#mapmarkers").empty();

    for (marker of projJson.markers){
        addExistingMarker(marker.xPos, marker.yPos, marker.id, marker.icon);
    }
    newChanges();
}

function updateOperationStack(){
    console.log('saving');
    redoStack=[];//if would try to redo after changes, changes would be lost
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
        $(newImg).addClass('baseIcon');
        
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

    markers.forEach(marker =>{
        addExistingMarker(marker.xPos, marker.yPos, marker.id, marker.icon)
    });
}

function loadProject(projectName){//XXX1
    console.log("now opening ".concat(projectName));
    ipcRenderer.send('setTitle', projectName);
    $('#rightbar').css('visibility', 'visible');
    $('#welcomeMessage').css('visibility', 'hidden');
    $("#titleAndText").css('visibility', 'hidden')

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);


    //reset image position
    $('#mapscreen').css({'top':'0px', 'left':'0px'})

    //load icons on image
    loadIcons(projectName);
    updateOperationStack();
}

function addNewMarker(currX, currY){
    ipcRenderer.send('change:redo', true);
    const halfImgWIdth = 12;

    canvasX = parseInt($('#mapscreen').css('left'), 10);
    canvasY = parseInt($('#mapscreen').css('top'), 10);

    practicalX = currX-halfImgWIdth-canvasX;
    practicalY = currY-halfImgWIdth-canvasY;

    var id = makeid(12);

    var icon = currentMarkerIcon;
    addJsonMarker(practicalX, practicalY, id);

    var markerElement = addExistingMarker(practicalX, practicalY, id, icon)

    highlightMarker(markerElement, id);
}

function addExistingMarker(fromLeft, fromTop, id, icon){
    var markerElement = document.createElement("IMG");

    $(markerElement).attr('src', icon).css({
        'left': fromLeft,
        'top': fromTop,
        'position':'absolute'
    }).attr('id', id).addClass('marker');

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
    $("#titleAndText").css('visibility', 'visible');

    $("img[src$='"+icon+"']").filter(".baseIcon").trigger('click');//XXX here it is!!!

}



//called from drag.js
function deselectMarker(){
    $('.marker').removeClass('editingMarker');
    clearText();
    highlightedMarker = undefined;
    markerID = undefined;
    $("#titleAndText").css('visibility', 'hidden')
}

function selectAllMarkers(){
    $('.marker').addClass('editingMarker');
}

function setMarkerText(elmnt, elementID){
    $('#titleAndText').css("visiblity", 'visible');

    projJson.markers.forEach(marker => {
        if(marker.id === elementID){
            if(highlightedMarker === elmnt){
                return;//is already there
            }
            $('#mainText').val(marker.note);
            $('#titleText').val(marker.title);
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

    projJson.markers.forEach(marker => {
        if(marker.id === markerID){
            if(marker.note === textToBeSaved && marker.title === titleToBeSaved){
                console.log("no change");
                return;
            }

            console.log("saving marker text change");
            marker.note = textToBeSaved;
            marker.title = titleToBeSaved;
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
    projJson.markers = remainingMarkers;
    newChanges();
    $(".editingMarker").remove();
}

//resets the window to be blank
function projectReset(){
    ipcRenderer.send('setTitle', 'Map Annotater');
    $('#rightbar').css('visibility', 'hidden');
    $('#welcomeMessage').css('visibility', 'visible');

    //XXX
    clearText()

    $("#mapscreen").removeAttr('style');

    $('#mapmarkers').empty();
    //loadIcons(projectName);
}

function addJsonMarker(xPosition, yPosition, markerID){
    var newMarker = {//XXX keeps not addint title
        id:markerID,
        icon: currentMarkerIcon,
        xPos: xPosition,
        yPos: yPosition,
        title: '',
        note: ''
    }
    projJson.markers.push(newMarker);
    newChanges();
}

function windowReset(){
    mouseMode = 'view';
    clearText();
    //this will need more stuff as it goes
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

ipcRenderer.on('select:all', function(e){
    selectAllMarkers();
});


var ctrlDown = false;
var ctrlKey = 17, zKey = 90;

document.body.onkeydown = function(e) {
  if (e.keyCode == ctrlKey) {
    ctrlDown = true;
  }
  if (ctrlDown && e.keyCode == zKey){
    e.preventDefault();
    saveMarkerText();
    undoStep();
    return false;
  }
}
document.body.onkeyup = function(e) {
  if (e.keyCode == ctrlKey) {
    ctrlDown = false;
  };
};

$('#saveText').on('click', function(){
    saveMarkerText();
});

$('#deleteMarker').on('click', function(){
    deleteMarker();
});

$('#viewMouse').on('click', function(){
    mouseMode='view';
});

$('#addMouse').on('click', function(){
    mouseMode='add';
});

$('#editMouse').on('click', function(){
    mouseMode='edit';
});

$('.marker').on('click', function(event){
    event.preventDefault();
});

$('#mainText').bind('input propertychange', function() {
    ipcRenderer.send('work-unsaved');
});



$('#mapscreen').click(function(e){
    switch (mouseMode) {
        case 'add': 
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