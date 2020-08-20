//dragElement(document.getElementById("mapscreen"));
dragElement($('#mapscreen')[0]);

const electron = require('electron');
const {ipcRenderer} = electron;
const dialog = electron.remote.dialog;
var sizeOf = require('image-size');

//const fs = require('fs');

var projJson;
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


function loadIcons(projectName){
    //clear previous markers
    $('#mapmarkers').empty();

    //add icons from project
    //XXX
}

function loadProject(projectName){
    console.log("now opening ".concat(projectName));

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);

    //load icons on image
    loadIcons(projectName);
    $('#rightbar').css('visibility', 'visible');
    $('#welcomeMessage').css('visibility', 'hidden');
}

//projInfo has [name, json]
ipcRenderer.on('project:open', function(e,projInfo){
    loadProject(projInfo[0], projInfo[1])
    console.log(projInfo[1])
    console.log("is it json? "+projInfo[1].title);
    projJson = projInfo[1];
});

$('#viewMouse').click(function(){
    mouseMode="view";
});

$('#addMouse').click(function(){
    mouseMode="add";
});

$('#editMouse').click(function(){
    mouseMode="edit";
});