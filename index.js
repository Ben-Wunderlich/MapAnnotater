/*

Starting point for the application

*/

const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
//const { start } = require('repl');
const nativeImage = electron.nativeImage;
//const { dialog } = require('electron');

const {app, BrowserWindow, Menu, ipcMain, dialog} = electron;

//set environment
//process.env.NODE_ENV = 'production';
process.env.NODE_ENV = 'dev';

let startWindow;
let currentProjectTitle = -1;

var unsavedWork = false;

const NOTHING = -1;
const NEW = 0;
const OPEN = 1;
const QUIT = 2
var toDoAfterSaving = NOTHING;

console.log(app.getPath("documents"));//"home"

// listen for app to be ready
app.on('ready', function(){
    //create new wundow
    startWindow = new BrowserWindow({
        webPreferences:{
            worldSafeExecuteJavaScript: true,
            nodeIntegration: true,
            enableRemoteModule: true,
            webSecurity: false
        },
        width: 1500,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        icon: nativeImage.createFromPath('myicon.ico')
    });

    //load html file into window
    //var startPath = __dirname;
    
    //if(startPath.includes("app.asar")){
      //  startPath
    //}

    startWindow.loadURL(url.format({
        pathname: path.join(app.getAppPath(), 'start.html'),//XXX maybe could load from other place if is from uninstalled, could use __dirname to check
        protocol:'file:',
        slashes: true
    }));

    //build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    //insert menu
    Menu.setApplicationMenu(mainMenu);

    //quit app when closed
    startWindow.on('close', function(e){
        var userChoice = unsavedWorkCheck();

        if(userChoice == 0){//save and quit
            e.preventDefault();
            toDoAfterSaving = QUIT;
            startWindow.webContents.send('project:save');
        }
        else if(userChoice == 1){//quit without saving
            //just dont prevent default
        }
        else if(userChoice == 2){// if is cancel
            e.preventDefault();
        }
        else{//some kind of error
            console.log("ERROR ON ISLE 4!");
        }
    });
});

//handle create add wundow
function NewProjectMenu(){
    newProjectWindow = new BrowserWindow({
        webPreferences: {
            worldSafeExecuteJavaScript: true,
            nodeIntegration: true,
            safeDialogs: true,
            enableRemoteModule: true

        },
        width: 400,
        height: 370,
        resizable: false,
        title: "make new project"
    });

    //load html file into window
    newProjectWindow.loadURL(url.format({
        pathname: path.join(app.getAppPath(), 'newProjectWindow.html'),
        protocol:'file:',
        slashes: true
    }));

    //garbage collection
    newProjectWindow.on('close', function(){
        newProjectWindow=null;
    });
}

/**
 * makes a string of random numbers
 * @param {int} length length of string you want to make
 * @returns {string} the random string
 */
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

/**
 * recsively majes a directory
 * is a workaround for when is installed
 * @param {string} dir the directory to make
 */
function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = path.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

/**
 * creates all files for a new project
 * @param {[string, Buffer]} items has form [project_name, image_buffer]
 */
function CreateProjectFiles(items){
    const folderpath = path.join(__dirname,'projects',items[0]);
    const textPath = path.join(folderpath, items[0].concat('.json'));
    const imagePath = path.join(folderpath, 'image.jpg');

    //making directory
    mkdirp(folderpath);

    //making json file
    var jsonObj = {
            id: makeid(10),//this is not needed for now but might in future
            title: items[0],
            version:1.1,
            markers:{}
    }
    fs.writeFile(textPath, JSON.stringify(jsonObj), function (err) {
        if (err) throw err;
    });

    currentProjectTitle = items[0];
    //create image file
    fs.writeFile(imagePath, items[1], (err) => {
        if(err) throw err;
        console.log('Image Saved!');
        startWindow.webContents.send('project:open', [items[0], jsonObj]);
    });

}

/**
 * returns a promise to get a projects json
 * @param {string} projectName the project to get the json for
 */
function getJson(projectName){
    return new Promise(resolve =>{

    const filePath = path.join(__dirname, 'projects', projectName, projectName.concat('.json'));
        fs.readFile(filePath, (err, data) => {
            if(err) throw err;
            resolve(JSON.parse(data));
        });
    });
}

/** 
 * called after saving to see if anything was waiting for a save */
function afterSaveCheck(){

    if(toDoAfterSaving == NOTHING){
        //do nothing
    }
    else if(toDoAfterSaving == NEW){
        NewProjectMenu();
    }
    else if(toDoAfterSaving == OPEN){
        chooseProject();
    }
    else if(toDoAfterSaving == QUIT){
        app.quit();
    }
    else{
        console.log("ERROR ON SOME ISLE OR OTHER "+toDoAfterSaving);
    }
    toDoAfterSaving = NOTHING;
}

function projectFolderisValid(projPath, title){
    if (fs.existsSync(projPath) &&
    fs.existsSync(path.join(projPath, title+".json")) &&
    fs.existsSync(path.join(projPath, "image.jpg"))){
        return true;
    }
    return false;
}

/** 
 * opens dialog to choose which project to open, then opens that project
*/
function chooseProject(){
    let projectsUrl = path.join(__dirname, 'projects');
    
    dialog.showOpenDialog({
        defaultPath: projectsUrl,
        properties:["openDirectory"]
        
    }).then(result => {
        let paths = result.filePaths;
        var justName = paths[0].substring(paths[0].lastIndexOf('\\')+1);
        currentProjectTitle = justName;
        if(paths.length == 0 || !projectFolderisValid(paths[0], justName)){
            //XXX make alert here for when path is not valid
            return;}
        getJson(justName).then(result => {
            startWindow.webContents.send('project:open', [justName, result]);
            
        })
    }).catch(err => {
        console.log("promise was rejected");
    });

    /*fs.readdirSync(projectsUrl).forEach(file => {
        fileNames.push(file)
    });*/
}


/* opens dialog to make sure you want to leave without saving changes.
Returns:
0 if save and quit
1 if don't save and quit
2 cancel
*/

/**
 * opens dialog to make sure user wants to leave without saving changes.
 * @returns {int} 0: save and quit, 1: quit without saving, 2: cancel
 */
function unsavedWorkCheck(){
    if(unsavedWork){
        var choice = dialog.showMessageBoxSync(
            {
              type: 'question',
              buttons: ['save and quit', "don't save", 'cancel'],
              title: 'Confirm',
              message: 'You have unsaved work, do you still want to exit?'
           });
        if(choice==1){
            unsavedWork = false;
        }
        return choice;
    }
    else{
        return 1;//nothing to save
    }
}

/**
 * opens dialog to make sure you want to delete a project.
 * @returns true if want to cancel, false if delete project
 */
function deleteVerify(){
    var choice = dialog.showMessageBoxSync(
        {
          type: 'question',
          buttons: ['delete project', 'maybe not', 'cancel'],
          title: 'Confirm',
          message: 'Are you sure you want to delete the project "'+currentProjectTitle+'"?'
       });
    if(choice === 0){//cancel
        return true;
    }
    else {//kill it
        return false;
    }
}

/** 
 * deletes all files of the current project
 * */ 
function deleteProjectFiles(){
    var folderPath = path.join(__dirname, 'projects', currentProjectTitle); 

    fs.rmdir(folderPath, { recursive: true }, (err) => {
        if (err) {
            throw err;
        }
    
        console.log(currentProjectTitle +' is deleted!');
    });

    currentProjectTitle = undefined;
    //at end
}

/**
 * changes whether the redo button is activated or not
 * @param {bool} isEnabled whether to be active
 */
function setRedo(isEnabled){
    var menuItem = Menu.getApplicationMenu().getMenuItemById('redoMenuItem');
    menuItem.enabled = isEnabled;
}

function sendModeChange(mouseValue){
    startWindow.webContents.send('change:mousemode', mouseValue);
}

/*var choice = dialog.showMessageBoxSync(this,
    {
      type: 'question',
      buttons: ['save and quit', "don't save", 'cancel'],
      title: 'Confirm',
      message: 'You have unsaved work, do you still want to exit?'
   });*/

//recieves json file from window
ipcMain.on('project:savefile', function(e, fileContents){
    jsonPath = path.join(__dirname, 'projects', fileContents.title, fileContents.title.concat('.json'));
    unsavedWork = false;
    startWindow.setTitle(currentProjectTitle);

    fs.writeFile(jsonPath, JSON.stringify(fileContents), function(err) {
        if(err) throw err;
        console.log("The file was saved!");
    }); 

    afterSaveCheck()
});

ipcMain.on('change:redo', function(e, isEnabled){
    setRedo(isEnabled);
});

//items in form [project_name, image_buffer]
ipcMain.on('project:add', function(e, items){
    console.log(items[1].byteLength);
    newProjectWindow.close();
    //console.log(typeof items[1]);
    CreateProjectFiles(items);

    //create proj files is async so need to wait for ie
    //
});

ipcMain.on('setTitle', function(e, newTitle){
    startWindow.setTitle(newTitle);
})

ipcMain.on('work-unsaved', function(e, True){
    unsavedWork = true;
    startWindow.setTitle(currentProjectTitle+"*");
})

const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
        {
            label:'new project',
            accelerator: "Ctrl+N",
            click(){
                if(currentProjectTitle != -1){
                    var userChoice = unsavedWorkCheck();

                    if(userChoice == 0){//save and quit
                        toDoAfterSaving = NEW;
                        startWindow.webContents.send('project:save');
                    }
                    else if(userChoice == 1){//quit without saving
                        NewProjectMenu();
                    }
                    else if(userChoice == 2){// if is cancel
                       //do nothing
                    }
                    else{//some kind of error
                        console.log("ERROR ON ISLE 6!");
                    }
                }
                else{
                    NewProjectMenu();
                }
            },
        },
        {
            label:'open',
            accelerator: 'Ctrl+O',
            click(){
                if(currentProjectTitle != -1){
                    var userChoice = unsavedWorkCheck();

                    if(userChoice == 0){//save and quit
                        toDoAfterSaving = OPEN;
                        startWindow.webContents.send('project:save');
                    }
                    else if(userChoice == 1){//quit without saving
                        chooseProject();
                    }
                    else if(userChoice == 2){// if is cancel
                       //do nothing
                    }
                    else{//some kind of error
                        console.log("ERROR ON ISLE 5!");
                    }
                }
                else{
                    chooseProject();
                }
            }
        },
        {
            label:'save',
            accelerator: 'Ctrl+S',
            click(){
                startWindow.webContents.send('project:save');
            }
        },
        {
            label:'delete current project',
            click(){
                if(currentProjectTitle==-1){
                    return;
                }
                if(deleteVerify()){
                    console.log("deleteing current project")

                    //clear screen
                    startWindow.webContents.send('project:delete');

                    //delete files
                    deleteProjectFiles();
                    currentProjectTitle = -1;
                }
            }
        }
        ]
    },
    {
        label: 'edit',
        submenu: [
            {
                label: 'delete selected marker',
                accelerator: 'Delete',
                click(){
                    console.log("del")
                    startWindow.webContents.send('delete:marker');
                }
            },
            {
                label: 'undo',
                accelerator: 'Ctrl+Z',
            },
            {
                label: 'redo',
                id: 'redoMenuItem',
                accelerator: 'Ctrl+Y',
                click(){
                    startWindow.webContents.send('redo:step');
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
    },
    {
        label: 'tools',
        submenu: [
            {
                label: 'enter view mode',
                accelerator: 'Ctrl+1',
                click(){
                    sendModeChange('view');
                }
            },
            {
                label: 'enter add mode',
                accelerator: 'Ctrl+2',
                click(){
                    sendModeChange('add');
                }
            },
            {
                label: 'enter edit mode',
                accelerator: 'Ctrl+3',
                click(){
                    sendModeChange('edit');
                }
            },
            {
                label: 'select all markers',
                accelerator: 'Ctrl+Shift+A',
                click(){
                    startWindow.webContents.send('select:all');
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