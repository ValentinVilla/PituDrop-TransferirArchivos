const { app, BrowserWindow, Menu, Tray } = require('electron');
const path = require('path');
const startPituDropServer = require('./www/index'); 

let tray = null;
let win = null;
let isQuitting = false; // Flag para saber si queremos cerrar la app de verdad

function createWindow() {
  win = new BrowserWindow({
    width: 750,
    height: 750,
    icon: path.join(__dirname, 'resources', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('http://localhost:3000');

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
    return false;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'resources', 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
        label: 'Abrir PituDrop', 
        click: () => win.show() 
    },
    { type: 'separator' },
    { 
        label: 'Cerrar por completo', 
        click: () => {
            isQuitting = true;
            app.quit();
        } 
    }
  ]);

  tray.setToolTip('PituDrop - Transferencia de Archivos');
  tray.setContextMenu(contextMenu);

  // Si hacen doble clic en el ícono de la bandeja, se abre la ventana
  tray.on('double-click', () => win.show());
}

// AUTO-INICIO: Configurar para que arranque con Windows
// Esto solo funciona cuando la app ya está instalada (isPackaged)
if (app.isPackaged) {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });
}

app.whenReady().then(() => {
    startPituDropServer(); // Arranca tu servidor Express
    createTray();
    createWindow();
});

// Para MacOS (opcional, para que no se quede el proceso colgado)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // No hacemos nada aquí para que siga en segundo plano
  }
});