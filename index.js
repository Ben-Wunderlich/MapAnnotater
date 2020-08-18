const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');

const {app, BrowserWindow, Menu, ipcMain} = electron;

let startWindow;
let addWindow;

// listen for app to be ready
app.on('ready', function(){
    //create new wundow
    startWindow = new BrowserWindow({
        
    });

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
        webPreferences: {
            nodeIntegration: true,
            safeDialogs: true
        },
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

    //garbage collection
    newProjectWindow.on('close', function(){
        newProjectWindow=null;
    });
}

function UrlTaken(url){
    return true;
}

//file formats here
function CreateProjectFiles(items){
    const folderpath = path.join(__dirname,'projects',items[0]);
    const textPath = path.join(folderpath, items[0].concat('.mapan'));
    const imagePath = path.join(folderpath, 'image.jpg');
    console.log(imagePath);

    //making directory
    fs.mkdirSync(folderpath, { recursive: true }, (err) => {
        if (err) throw err;
    });

    //making file
    fs.writeFile(textPath, imagePath, function (err) {
        if (err) throw err;
    });

    //create image file
    fs.writeFile(imagePath, items[1], (err) => {
        if(err) throw err;
        console.log('Image Saved!');
    });


    //old code, might be useful for copying other files
    /*fs.copyFile(items[1], imagePath, (err) => {
        if (err) throw err;
        console.log('source was copied to destination.txt');
    });*/
}

//catch project:add
//items in form [project_name, image_buffer]
ipcMain.on('project:add', function(e, items){
    console.log(items[1].byteLength);
    newProjectWindow.close();
    //console.log(typeof items[1]);
    CreateProjectFiles(items);
    //startWindow.webContents.send('project:add', item);


});

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

if(process.env.NODE_ENV !== 'production'){
    mainMenuTemplate.push({
            label: 'dev tools',
            submenu: [
                {
                    label:"toggle background info",
                    accelerator: "F12",
                    click(item, focusedWindow){
                        focusedWindow.toggleDevTools();
                    }
                },
                {
                    role:'reload'
                }
            ]
    })
}