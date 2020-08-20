//dragElement(document.getElementById("mapscreen"));

const electron = require('electron');
const {ipcRenderer} = electron;
const dialog = electron.remote.dialog;
var sizeOf = require('image-size');

const fs = require('fs');

//var projJson;
var currentMarkerIcon;

//can be view, add or edit
var mouseMode = "view";

function changeBackgroundImage(url){
    let formatUrl = 'url('+url+')';
    console.log(formatUrl);
    var dimensions = sizeOf(url);

    $('#mapscreen').css({'background-image': formatUrl,
    'width':dimensions.width, 'height': dimensions.height
    });
}

function makeMarkers(){
    fs.readdirSync('map_markers\\').forEach(file => {
        file = 'map_markers/'.concat(file);
        console.log(file);
        var newImg = document.createElement("IMG");
        newImg.setAttribute('src', file)
        $(newImg).on('click', function(){
            currentMarkerIcon = file;
            $('#icons').children().removeClass("currentMarker");
            newImg.classList.add("currentMarker");
        });
        $('#icons').append(newImg);
    });
}


function loadIcons(projectInfo){
    //clear previous markers
    $('#mapmarkers').empty();

    //add icons from project
    const markers = projectInfo[1].markers;
    //XXX
}

function loadProject(projectInfo){
    console.log("now opening ".concat(projectInfo[0]));

    const imgDir = 'projects/'+projectInfo[0]+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);

    //load icons on image
    loadIcons(projectInfo);
    $('#rightbar').css('visibility', 'visible');
    $('#welcomeMessage').css('visibility', 'hidden');
}

function addMarker(currX, currY){
    console.log("X is"+currX);
    console.log("Y is"+currY);
    //XXX
}

//projInfo has [name, json]
ipcRenderer.on('project:open', function(e,projInfo){
    loadProject(projInfo)
    console.log(projInfo[1])
    console.log("is it json? "+projInfo[1].title);
    //projJson = projInfo[1];
});


$('#viewMouse').on('click', function(){
    mouseMode='view';
    $('#mapscreen').removeClass('dontDrag')
});

$('#addMouse').on('click', function(){
    mouseMode='add';
    if(!$('#mapscreen').hasClass('dontDrag')){
        $('#mapscreen').addClass('dontDrag');
    }
});

$('#editMouse').on('click', function(){
    mouseMode='edit';
    if(!$('#mapscreen').hasClass('dontDrag')){
        $('#mapscreen').addClass('dontDrag');
    }
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

makeMarkers();