//dragElement(document.getElementById("mapscreen"));
dragElement($('#mapscreen')[0]);

const electron = require('electron');
const {ipcRenderer} = electron;
const dialog = electron.remote.dialog;
const fs = require('fs');

//ipcRenderer.send('XXX:XXX', [thing1, thing2]);

function changeBackgroundImage(url){
    let formatUrl = 'url('+url+')';
    console.log(formatUrl);
    $('#mapscreen').css('background-image', formatUrl);
    $('#mapscreen').css('left', '100px');
}

function clearIcons(){

}

function loadIcons(projectName){
    clearIcons();
}

function loadProject(projectName){
    console.log("now opening ".concat(projectName));

    const imgDir = 'projects/'+projectName+'/image.jpg'

    //load main image
    changeBackgroundImage(imgDir);

    //load icons on image
}

ipcRenderer.on('project:open', function(e,projName){
    loadProject(projName)
});
