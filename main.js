const { app, BrowserWindow } = require('electron'); // Este es el 'app' de Electron
const startPituDropServer = require('./www/index'); // Importamos la función

function createWindow() {
    const win = new BrowserWindow({
        width: 450,
        height: 750,
        title: "PituDrop",
        icon: __dirname + '/logo.png', // Si tenés el logo
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false
        }
    });

    win.loadURL('http://localhost:3000');
}

// Iniciamos el servidor de Express antes de abrir la ventana
app.whenReady().then(() => {
    startPituDropServer(); 
    createWindow();
});