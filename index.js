const ip = require('ip');
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

const { Bonjour } = require('bonjour-service');
const bonjour = new Bonjour();

bonjour.publish({ name: 'FileTransferServer', type: 'http', port: PORT });

console.log(`Anunciando servicio como 'FileTransferServer.local'`);

// Configuración de dónde guardar archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const qrcode = require('qrcode-terminal');
const upload = multer({ storage });

app.use(express.static(__dirname));
// Servir HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Endpoint para subir archivo
app.post('/upload', upload.single('file'), (req, res) => {
    res.send('Archivo recibido correctamente 🚀');
});

app.listen(PORT, '0.0.0.0', () => {
    const localUrl = `http://${ip.address()}:${PORT}`;
    console.log(`Servidor corriendo en: ${localUrl}`);
    console.log(`Anunciando servicio como 'FileTransferServer.local'`);
    // Genera el código QR en la consola
    qrcode.generate(localUrl, { small: true });
});