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

//can be 'view', 'add' or 'edit'
var mouseMode;

function changeBackgroundImage(url){
    let formatUrl = 'url('+url+')';
    var dimensions = sizeOf(url);

    $('#mapscreen').css({'background-image': formatUrl,
    'width':dimensions.width, 'height': dimensions.height
    });
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
    ipcRenderer.send('work-unsaved'); 
 }

function makeMarkerOptions(){
    highLighted = false;
    fs.readdirSync('map_markers\\').forEach(file => {
        file = 'map_markers/'.concat(file);
        var newImg = document.createElement("IMG");
        newImg.setAttribute('src', file);
        $(newImg).addClass('baseIcon');
        $(newImg).on('click', function(){

            currentMarkerIcon = file;
            $('#icons').children().removeClass("currentMarker");
            newImg.classList.add("currentMarker");

            changeMarkerIcon(file);
        });
        $('#icons').append(newImg);
        if(!highLighted){
            $(newImg).addClass('currentMarker');
            currentMarkerIcon = file;
            highLighted=true;
        }
    });
}

//used from drag file
function updateMarkerPos(){
    const markers = projJson.markers;
    if($('.editingMarker').length !== 1){
        throw "MArker position updated without propper number of sleected markers"
    }

    markers.forEach(marker =>{
        if(marker.id === markerID){
            marker.xPos = $('.editingMarker').css('left');
            marker.yPos = $('.editingMarker').css('top');
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

function loadProject(projectName){
    console.log("now opening ".concat(projectName));
    ipcRenderer.send('setTitle', projectName);
    $('#rightbar').css('visibility', 'visible');
    $('#welcomeMessage').css('visibility', 'hidden');

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);


    //reset image position
    $('#mapscreen').css({'top':'0px', 'left':'0px'})

    //load icons on image
    loadIcons(projectName);
}

function addNewMarker(currX, currY){
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

    $('.marker').removeClass('editingMarker');
    $(elmnt).addClass('editingMarker');
    setMarkerText(elmnt, elmntID);
    highlightedMarker = elmnt;
    markerID = elmntID;
    $("#titleAndText").css('visibility', 'visible');

    $("img[src$='"+icon+"']").filter(".baseIcon").trigger('click');

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
            $('#textTitle').val(marker.noteTitle);
            return;
        }
    });
}

function saveMarkerText(){
    if($('.editingMarker').length === 0){
        return;
    }

    var textToBeSaved = $('#mainText').val();
    var titleToBeSaved = $('#textTitle').val();

    projJson.markers.forEach(marker => {
        if(marker.id === markerID){
            ipcRenderer.send('work-unsaved');
            marker.note = textToBeSaved;
            marker.noteTitle = titleToBeSaved;
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
            //kept going wrong
            //projJson.markers = markers.slice(0,index).concat(markers.slice(index+1, markers.length));
        }
    }
    projJson.markers = remainingMarkers;
    ipcRenderer.send('work-unsaved');
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
    var newMarker = {
        id:markerID,
        icon: currentMarkerIcon,
        xPos: xPosition,
        yPos: yPosition,
        noteTitle: '',
        note: ''
    }
    projJson.markers.push(newMarker)
    ipcRenderer.send('work-unsaved');
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
    console.log('jsonis '+ projJson);
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