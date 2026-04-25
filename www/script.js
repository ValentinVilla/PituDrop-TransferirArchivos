const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const statusText = document.getElementById('statusText');
const message = document.getElementById('message');
const icon = document.getElementById('icon');

// Intentamos obtener la IP guardada, si no, usamos la actual del navegador
let savedIP = localStorage.getItem('pitu_ip');
let SERVER_URL = savedIP || window.location.origin;

// Si estamos en el celular (App nativa) y no tenemos IP guardada
if (window.location.protocol === 'http:' && !savedIP && window.location.hostname === 'localhost') {
    const nuevaIP = prompt("Por favor, ingresá la IP de tu PC (ej: http://192.168.1.15:3000):");
    if (nuevaIP) {
        localStorage.setItem('pitu_ip', nuevaIP);
        SERVER_URL = nuevaIP;
    }
}

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0]);
    }
});

function toggleQR() {
    document.getElementById("qr-modal").classList.toggle("hidden");
}

// Modificamos mostrarQR para que use toggle
function mostrarQR() {
    fetch('/get-ip')
        .then(res => res.json())
        .then(data => {
            const qrContainer = document.getElementById("qrcode-canvas");
            qrContainer.innerHTML = ""; 
            new QRCode(qrContainer, {
                text: `pitudrop:${data.ip}`,
                width: 200,
                height: 200
            });
            toggleQR();
        });
}
async function scanearQR() {
    if (!window.Capacitor || !window.Capacitor.Plugins.BarcodeScanner) {
        alert("El escáner solo funciona en la App móvil");
        return;
    }

    const { BarcodeScanner } = window.Capacitor.Plugins;
    
    const granted = await BarcodeScanner.requestPermissions();
    if (!granted) return;

    const { barcodes } = await BarcodeScanner.scan();
    if (barcodes.length > 0) {
        let rawData = barcodes[0].displayValue;

        // Buscamos dónde empieza realmente la URL (donde diga http)
        const inicioURL = rawData.indexOf("http");
        
        if (inicioURL !== -1) {
            // Cortamos todo lo anterior (pitudrop:, espacios, etc)
            const ipLimpia = rawData.substring(inicioURL).trim();
            
            localStorage.setItem('pitu_ip', ipLimpia);
            SERVER_URL = ipLimpia;
            
            alert("¡Conectado exitosamente!");
            location.reload(); // Recargamos para que SERVER_URL tome el nuevo valor
        } else {
            alert("QR no reconocido");
        }
    }
}
/*
async function scanearQR() {
    if (!window.Capacitor || !window.Capacitor.Plugins.BarcodeScanner) {
        alert("El escáner solo funciona en la App móvil");
        return;
    }

    const { BarcodeScanner } = window.Capacitor.Plugins;
    
    const granted = await BarcodeScanner.requestPermissions();
    if (!granted) return;

    const { barcodes } = await BarcodeScanner.scan();
    const data = barcodes[0].displayValue;

    if (data.startsWith('pitudrop:')) {
        const ipDescubierta = data.split(':')[1] + ":" + data.split(':')[2];
        localStorage.setItem('pitu_ip', ipDescubierta);
        SERVER_URL = ipDescubierta;
        alert("¡Conectado a PituDrop PC!");
        location.reload();
    }
}
*/
function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    
    // Configuración visual inicial
    progressContainer.classList.remove('hidden');
    message.innerText = "Subiendo " + file.name;
    icon.innerText = "⏳";

    xhr.open("POST", SERVER_URL + "/upload");

    // Progreso de carga
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percent + "%";
            statusText.innerText = `Enviando... ${percent}%`;
        }
    };

    // Al finalizar
    xhr.onload = () => {
        if (xhr.status === 200) {
            icon.innerText = "✅";
            message.innerText = "¡Archivo recibido!";
            statusText.innerText = "Completado al 100%";
            setTimeout(resetUI, 3000);
        } else {
            message.innerText = "Error al subir ❌";
        }
    };

    xhr.send(formData);
}

function resetUI() {
    progressContainer.classList.add('hidden');
    progressBar.style.width = "0%";
    icon.innerText = "📤";
    message.innerText = "Esperando archivo...";
    fileInput.value = ""; // Limpiar input
}