const { app, BrowserWindow } = require('electron'); 
const path = require('path');
const startPituDropServer = require('./www/index'); 

function createWindow() {
    const win = new BrowserWindow({
        width: 450,
        height: 750,
        title: "PituDrop",
        icon: path.join(__dirname, 'resources', 'icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false
        }
    });

    win.loadURL('http://localhost:3000');
}

// Se inicia el servidor de Express antes de abrir la ventana
app.whenReady().then(() => {
    startPituDropServer(); 
    createWindow();
});