const ip = require('ip');
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); 
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

const { Bonjour } = require('bonjour-service');
const bonjour = new Bonjour();

bonjour.publish({ name: 'FileTransferServer', type: 'http', port: PORT });
console.log(`Anunciando servicio como 'FileTransferServer.local'`);


const homeDir = os.homedir();
const downloadPath = path.join(homeDir, 'Downloads', 'PituDrop'); 
const uploadPath = path.join(homeDir, 'Downloads', 'PituDrop', 'Recibidos');

// Crear la carpeta de descargas si no existe
//const downloadPath = path.join(__dirname, 'downloads');

//if (!fs.existsSync(downloadPath)) {
 //   fs.mkdirSync(downloadPath);
//}

// Crear las carpetas si no existen (esto ahora funcionará siempre)
[downloadPath, uploadPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuración de dónde guardar archivos cel -> pc
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
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
app.use('/public-downloads', express.static(downloadPath));

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

        // 1. Filtramos: quitamos archivos ocultos y evitamos que las CARPETAS (como 'Recibidos') salgan en la lista
        const archivosFiltrados = files.filter(file => {
            const filePath = path.join(downloadPath, file);
            const esArchivo = fs.lstatSync(filePath).isFile();
            return !file.startsWith('.') && esArchivo;
        });

        // 2. Mapeamos y ordenamos por fecha de modificación
        const archivosOrdenados = archivosFiltrados
            .map(file => {
                const filePath = path.join(downloadPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    time: stats.mtime.getTime()
                };
            })
            .sort((a, b) => b.time - a.time) // Del más nuevo al más viejo
            .map(fileObj => fileObj.name);
            
        res.json(archivosOrdenados);
    });
});

app.get('/download-file/:filename', (req, res) => {
    const filepath = path.join(downloadPath, req.params.filename);
    res.download(filepath);
});

app.delete('/delete-file/:filename', (req, res) => {
    const filepath = path.join(downloadPath, req.params.filename);
    
    // Verificamos si el archivo existe antes de intentar borrarlo
    if (fs.existsSync(filepath)) {
        fs.unlink(filepath, (err) => {
            if (err) {
                console.error("Error al borrar:", err);
                return res.status(500).send('Error al borrar el archivo');
            }
            res.send('Archivo eliminado correctamente');
        });
    } else {
        res.status(404).send('Archivo no encontrado');
    }
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