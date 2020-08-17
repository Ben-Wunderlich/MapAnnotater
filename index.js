const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow, Menu} = electron;

let startWindow;
let addWindow;

// listen for app to be ready
app.on('ready', function(){
    //create new wundow
    startWindow = new BrowserWindow({});

    //load html file into window
    startWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'start.html'),
        protocol:'file:',
        slashes: true
    }));

    //quit app when closed
    startWindow.on('closed', function(){
        app.quit();
    });

    //build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    //insert menu
    Menu.setApplicationMenu(mainMenu);
});

//handle create add wundow
function NewProjectMenu(){
    newProjectWindow = new BrowserWindow({
        width: 400,
        height: 300,
        title: "make new project"
    });

    //load html file into window
    newProjectWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'newProjectWindow.html'),
        protocol:'file:',
        slashes: true
    }));
}

const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
        {
            label:'new project',
            accelerator: "Ctrl+N",
            click(){
                NewProjectMenu();
            },
        },
        {
            label:'open recent',
            accelerator: 'Ctrl+O'
        },
        {
            label:'Quit',
            accelerator:'Ctrl+Q',
            click(){
                app.quit();
            }
        },
        ]
    },
    {
        label: 'dev tools',
        submenu: [
            {
                label:"toggle background info",
                accelerator: "F12",
                click(){

                    startWindow.webContents.openDevTools();
                }
            }
        ]
    },
    {
        label: 'view',
        submenu: [
            {
                label: 'fullscreen',
                accelerator: 'F11',
                click(){
                    if(startWindow.fullScreen){
                        startWindow.setFullScreen(false);}
                    else{
                        startWindow.setFullScreen(true);
                    }
                }
            }
        ]
    }
]