const ip = require('ip');
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); 
const fs = require('fs');

const app = express();
const PORT = 3000;

const { Bonjour } = require('bonjour-service');
const bonjour = new Bonjour();

bonjour.publish({ name: 'FileTransferServer', type: 'http', port: PORT });
console.log(`Anunciando servicio como 'FileTransferServer.local'`);

// Crear la carpeta de descargas si no existe
const downloadPath = path.join(__dirname, 'downloads');

if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
}

// Configuración de dónde guardar archivos cel -> pc
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

///////////////////////////////////////////////////////////////

// Configuración de dónde guardar archivos pc -> cel
const pcStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, downloadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});
const uploadFromPC = multer({ storage: pcStorage })

///////////////////////////////////////////////////////////////

const qrcode = require('qrcode-terminal');

app.use(express.static(__dirname)); 
app.use(cors());
app.use('/public-downloads', express.static(path.join(__dirname, 'downloads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/get-ip', (req, res) => {
    res.json({ ip: `http://${ip.address()}:${PORT}` });
});

// Endpoint para subir archivo desde el celular a la pc
app.post('/upload', upload.single('file'), (req, res) => {
    res.send('Archivo recibido correctamente 🚀');
});

// Endpoint para que la PC guarde archivos que el celu va a bajar
app.post('/pc-share', uploadFromPC.single('file'), (req, res) => {
    console.log("Archivo recibido en PC:", req.file);
    res.send('Archivo listo en la sala de espera 📦');
});

// Endpoint para que el celu sepa qué archivos hay disponibles
app.get('/list-downloads', (req, res) => {
    fs.readdir(downloadPath, (err, files) => {
        if (err) return res.status(500).json([]);
        res.json(files);
    });
});

app.get('/download-file/:filename', (req, res) => {
    const filepath = path.join(downloadPath, req.params.filename);
    res.download(filepath);
});

const startServer = () => {
    app.listen(PORT, '0.0.0.0', () => {
        const localUrl = `http://${ip.address()}:${PORT}`;
        console.log(`Servidor PituDrop en: ${localUrl}`);
        qrcode.generate(localUrl, { small: true });
    });
};

// Exportamos la función para que Electron la use
module.exports = startServer;

if (require.main === module) {
    startServer();
}