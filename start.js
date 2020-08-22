//dragElement(document.getElementById("mapscreen"));

const electron = require('electron');
const {ipcRenderer} = electron;
//const dialog = electron.remote.dialog;
var sizeOf = require('image-size');

const fs = require('fs');

var projJson;

var highlightedMarker;
var markerID;

var currentMarkerIcon;

//can be view, add or edit
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

 function changeMarkerIcon(newIcon){
    if(typeof highlightedMarker === 'undefined' || mouseMode !== 'edit'){
        return; 
    }

    projJson.markers.forEach(marker =>{
        if(marker.id === markerID){
            marker.icon = newIcon;
            highlightedMarker.setAttribute('src', newIcon);
            return;
        }
    });
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
function updateMarkerPos(xPosition, yPosition){
    const markers = projJson.markers;

    markers.forEach(marker =>{
        if(marker.id === markerID){
            marker.xPos = xPosition
            marker.yPos = yPosition
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
        addMarker(marker.xPos, marker.yPos, marker.id, marker.icon, false);
    });
}

function loadProject(projectName){
    console.log("now opening ".concat(projectName));
    $('#rightbar').css('visibility', 'visible');
    $('#welcomeMessage').remove();

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);

    //reset image position
    $('#mapscreen').css({'top':'0px', 'left':'0px'})

    //load icons on image
    loadIcons(projectName);
}

function addMarker(currX, currY, id=null, icon=null, makeNew=true){
    const halfImgWIdth = 12;

    canvasX = parseInt($('#mapscreen').css('left'), 10);
    canvasY = parseInt($('#mapscreen').css('top'), 10);

    practicalX = currX-halfImgWIdth-canvasX;
    practicalY = currY-halfImgWIdth-canvasY;

    var newMarker = document.createElement("IMG");

    if(id === null){
        id = makeid(12);
    }

    if(icon === null){
        icon = currentMarkerIcon;
    }

    $(newMarker).attr('src', icon).css({
        'left': practicalX+'px',
        'top': practicalY+'px',
        'position':'absolute'
    }).attr('id', id).addClass('marker');

    dragMarker(newMarker, id);

    $('#mapmarkers').append(newMarker);

    if(makeNew){
        addJsonMarker(practicalX+halfImgWIdth, practicalY+halfImgWIdth, id);
        highlightMarker(newMarker, id);
    }
}

function highlightMarker(elmnt, elmntID, ){
    var icon = $(elmnt).attr('src');

    $('.marker').removeClass('editingMarker');
    $(elmnt).addClass('editingMarker');
    setMarkerText(elmnt, elmntID);
    highlightedMarker = elmnt;
    markerID = elmntID;

    $("img[src$='"+icon+"']").filter(".baseIcon").trigger('click');

}



//called from drag.js
function deselectMarker(){
    $('.marker').removeClass('editingMarker');
    clearText();
    highlightedMarker = undefined;
    markerID = undefined;
}

function selectAllMarkers(){
    $('.marker').addClass('editingMarker');
}

function setMarkerText(elmnt, elementID){ 
    projJson.markers.forEach(marker => {
        if(marker.id === elementID){
            if(highlightedMarker === elmnt){
                return;//is already there
            }
            $('#mainText').val(marker.note);
            return;
        }
    });
}

function saveMarkerText(){
    if(typeof highlightedMarker === 'undefined'){
        return;
    }

    var textToBeSaved = $('#mainText').val();

    projJson.markers.forEach(marker => {
        if(marker.id === markerID){
            ipcRenderer.send('work-unsaved');
            marker.note = textToBeSaved;
            return;
        }
    });
}

function clearText(){
    $('#mainText').val("");
}

function deleteMarker(){
    if($('.editingMarker').length === 0){
        return;
    }
    clearText();

    var idToBeDeleted = [];
    $(".editingMarker").each(function() { idToBeDeleted.push($(this).attr('id'))});
    console.log("about to delete "+idToBeDeleted);

    var i = 0
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

function addJsonMarker(xPosition, yPosition, markerID){
    var newMarker = {
        id:markerID,
        icon: currentMarkerIcon,
        xPos: xPosition,
        yPos: yPosition,
        note: ''
    }
    projJson.markers.push(newMarker)
    ipcRenderer.send('work-unsaved');
}

function windowReset(){
    console.log("all reset");
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



$('#mapscreen').click(function(e){
    switch (mouseMode) {
        case 'add': 
            addMarker(e.clientX, e.clientY);
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