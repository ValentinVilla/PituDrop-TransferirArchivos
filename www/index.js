const ip = require('ip');
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); 

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
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/get-ip', (req, res) => {
    res.json({ ip: `http://${ip.address()}:${PORT}` });
});

// Endpoint para subir archivo
app.post('/upload', upload.single('file'), (req, res) => {
    res.send('Archivo recibido correctamente 🚀');
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

// Si querés seguir pudiendo ejecutarlo solo con node, agregá esto:
if (require.main === module) {
    startServer();
}