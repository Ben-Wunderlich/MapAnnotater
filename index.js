const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
//const { type } = require('jquery');
const { dialog } = require('electron');
const { resolve } = require('dns');

const {app, BrowserWindow, Menu, ipcMain} = electron;

//set environment
//process.env.NODE_ENV = 'production';

let startWindow;
let addWindow;

// listen for app to be ready
app.on('ready', function(){
    //create new wundow
    startWindow = new BrowserWindow({
        webPreferences:{
            nodeIntegration: true,
            enableRemoteModule: true
        },
        width: 1500,
        height: 800
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


function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

//file formats here
//items in form [project_name, image_buffer]
function CreateProjectFiles(items){
    const folderpath = path.join(__dirname,'projects',items[0]);
    const textPath = path.join(folderpath, items[0].concat('.json'));
    const imagePath = path.join(folderpath, 'image.jpg');

    //making directory
    fs.mkdirSync(folderpath, { recursive: true }, (err) => {
        if (err) throw err;
    });

    //making json file
    var jsonObj = {
            id: makeid(10),
            title: items[0],
            imagepath:imagePath,
            markers:[]
    }
    fs.writeFile(textPath, JSON.stringify(jsonObj), function (err) {
        if (err) throw err;
    });

    //create image file
    fs.writeFile(imagePath, items[1], (err) => {
        if(err) throw err;
        console.log('Image Saved!');
        startWindow.webContents.send('project:open', [items[0], jsonObj]);
    });


    //old code, might be useful for copying other files
    /*fs.copyFile(items[1], imagePath, (err) => {
        if (err) throw err;
        console.log('source was copied to destination.txt');
    });*/
}

function getJson(projectName){
    return new Promise(resolve =>{

    const filePath = path.join(__dirname, 'projects', projectName, projectName.concat('.json'));
        fs.readFile(filePath, (err, data) => {
            if(err) throw err;

            console.log("The file content is : " + JSON.parse(data));
            resolve(JSON.parse(data));
        });
    });
}

function chooseProject(){
    let projectsUrl = path.join(__dirname, 'projects')
    
    dialog.showOpenDialog({
        defaultPath: projectsUrl,
        properties:["openDirectory"]
        
    }).then(result => {
        let paths = result.filePaths;
        if(paths.length == 0)
            return;
        var justName = paths[0].substring(paths[0].lastIndexOf('\\')+1);
        
        getJson(justName).then(result => {
            startWindow.webContents.send('project:open', [justName, result]);
        })
    });

    /*fs.readdirSync(projectsUrl).forEach(file => {
        fileNames.push(file)
    });*/

}

function saveProject(){
    //XXX
}

//catch project:add
//items in form [project_name, image_buffer]
ipcMain.on('project:add', function(e, items){
    console.log(items[1].byteLength);
    newProjectWindow.close();
    //console.log(typeof items[1]);
    CreateProjectFiles(items);

    //create proj files is async so need to wait for ie
    //
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
            label:'open',
            accelerator: 'Ctrl+O',
            click(){
                chooseProject();
            }
        },
        {
            label:'save',
            accelerator: 'Ctrl+S',
            click(){
                saveProject();
            }
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