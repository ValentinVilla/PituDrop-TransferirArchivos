// 1. DETECCIÓN INFALIBLE: Si NO hay Capacitor, estamos 100% seguros de que es la PC
const esPC = !window.Capacitor;

// 2. CONFIGURACIÓN DE URL A PRUEBA DE BALAS
let SERVER_URL = "";
if (esPC) {
    // La PC SIEMPRE le habla a su propio puerto local, evitamos el error de "file://"
    SERVER_URL = "http://localhost:3000";
} else {
    // El celular usa la IP descubierta por el QR
    let savedIP = localStorage.getItem('pitu_ip');
    SERVER_URL = savedIP || ""; 
    
    // Fallback por si lo abrís en un navegador móvil sin IP guardada
    if (!savedIP && window.location.hostname === 'localhost') {
        const nuevaIP = prompt("Por favor, ingresá la IP de tu PC (ej: http://192.168.0.4:3000):");
        if (nuevaIP) {
            localStorage.setItem('pitu_ip', nuevaIP);
            SERVER_URL = nuevaIP;
        }
    }
}

const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const statusText = document.getElementById('statusText');
const message = document.getElementById('message');
const icon = document.getElementById('icon');

// Ajustar interfaz al cargar
document.addEventListener('DOMContentLoaded', () => {
    const iconElement = document.getElementById('icon');
    
    if (esPC) {
        document.getElementById('instruction').innerText = "Compartir archivos con el celular";
        const btnPrimary = document.querySelector('.btn-primary');
        if (btnPrimary) btnPrimary.innerText = "Compartir al Celu";
        // Ícono para PC según tu pedido
        if (iconElement) iconElement.innerText = "🖥️ -> 📱"; 
    } else {
        // Ícono para Celular
        if (iconElement) iconElement.innerText   = "📱 -> 🖥️";
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0]);
    }
});

function toggleQR() {
    document.getElementById("qr-modal").classList.toggle("hidden");
}

function mostrarQR() {
    fetch('http://localhost:3000/get-ip')
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
    if (esPC) {
        alert("El escáner solo funciona en la App móvil");
        return;
    }

    const { BarcodeScanner } = window.Capacitor.Plugins;
    
    const granted = await BarcodeScanner.requestPermissions();
    if (!granted) return;

    const { barcodes } = await BarcodeScanner.scan();
    if (barcodes.length > 0) {
        let rawData = barcodes[0].displayValue;

        const inicioURL = rawData.indexOf("http");
        if (inicioURL !== -1) {
            const ipLimpia = rawData.substring(inicioURL).trim();
            localStorage.setItem('pitu_ip', ipLimpia);
            SERVER_URL = ipLimpia;
            
            alert("¡Conectado exitosamente!");
            location.reload(); 
        } else {
            alert("QR no reconocido");
        }
    }
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    
    // CLAVE: Si es PC va a descargas, si es celu va a uploads
    const endpoint = esPC ? "/pc-share" : "/upload";

    progressContainer.classList.remove('hidden');
    message.innerText = "Subiendo " + file.name;
    icon.innerText = "⏳";

    xhr.open("POST", SERVER_URL + endpoint);

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percent + "%";
            statusText.innerText = esPC ? `Enviando al celu... ${percent}%` : `Enviando a PC... ${percent}%`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            icon.innerText = "✅";
            message.innerText = esPC ? "¡Listo! Revisalo en tu celu." : "¡Archivo recibido!";
            statusText.innerText = "Completado al 100%";
            setTimeout(() => {
                resetUI();
            }, 4000);
        } else {
            message.innerText = "Error en la transferencia ❌";
        }
    };

    xhr.send(formData);
}

// --- LÓGICA DE DESCARGAS ---
const btnDescargas = document.getElementById('btn-descargas');
const dropZone = document.querySelector('.drop-zone'); 

if (btnDescargas) {
    btnDescargas.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantallaDescargas();
    });
}


function mostrarPantallaDescargas() {
    // 1. Cambiamos la UI
    document.getElementById('instruction').innerText = "Archivos disponibles";
    dropZone.innerHTML = '<div id="lista-descargas">Cargando archivos...</div>';
    
    // 2. Pedimos la lista al servidor
    fetch(SERVER_URL + '/list-downloads')
        .then(res => res.json())
        .then(files => {
            const container = document.getElementById('lista-descargas');
            if (files.length === 0) {
                container.innerHTML = "<p>No hay archivos compartidos por la PC.</p>";
                return;
            }
            container.innerHTML = ""; // Limpiamos el "Cargando"
            
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = "download-item";
                
                // --- Lógica de UX/UI para detectar imágenes ---
                const ext = file.split('.').pop().toLowerCase();
                const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
                const fileUrl = `${SERVER_URL}/public-downloads/${file}`;
                const downloadUrl = `${SERVER_URL}/download-file/${encodeURIComponent(file)}`;
                
                // Si es imagen, mostramos el preview. Si no, un icono de documento.
                let previewHtml = isImage 
                    ? `<img src="${fileUrl}" class="file-preview" alt="preview">` 
                    : `<div class="file-icon">📄</div>`;

                // Inyectamos el HTML usando la etiqueta <a> (Perfecto para la PC)
                item.innerHTML = `
                    ${previewHtml}
                    <div class="file-info">
                        <span class="file-name" title="${file}">${file}</span>
                        <span class="file-type">Archivo ${ext.toUpperCase()}</span>
                    </div>
                    <div class="action-buttons">
                        <a href="${downloadUrl}" download="${file}" class="btn-download">Bajar</a>
                        <button class="btn-delete" title="Eliminar archivo">🗑️</button>
                    </div>
                `;
                container.appendChild(item);

                // --- LÓGICA DE DESCARGA (CELULAR) ---
                if (!esPC) {
                    const btnBajar = item.querySelector('.btn-download');
                    btnBajar.addEventListener('click', async (e) => {
                        e.preventDefault(); 
                        if (window.Capacitor && window.Capacitor.Plugins.Browser) {
                            // Le tiramos el enlace al Chrome de Android para que lo descargue
                            await window.Capacitor.Plugins.Browser.open({ url: downloadUrl });
                        } else {
                            alert("Error: Plugin de navegador no disponible.");
                        }
                    });
                }
                
                // --- LÓGICA DEL TACHO DE BASURA ---
                const btnDelete = item.querySelector('.btn-delete');
                btnDelete.addEventListener('click', async () => {
                    // Confirmación de seguridad
                    if (confirm(`¿Seguro que querés borrar "${file}" de la PC?`)) {
                        try {
                            const response = await fetch(`${SERVER_URL}/delete-file/${encodeURIComponent(file)}`, {
                                method: 'DELETE'
                            });

                            if (response.ok) {
                                // Animación de desaparición
                                item.style.opacity = "0";
                                setTimeout(() => {
                                    item.remove();
                                    // Si la lista queda vacía, mostramos el mensaje
                                    if (container.children.length === 0) {
                                        container.innerHTML = "<p>No hay archivos compartidos por la PC.</p>";
                                    }
                                }, 300);
                            } else {
                                alert("No se pudo borrar el archivo.");
                            }
                        } catch (error) {
                            alert("Error de conexión al intentar borrar.");
                        }
                    }
                });
            }); // Cierre del forEach
        })
        .catch(err => {
            document.getElementById('lista-descargas').innerHTML = "<p>Error al conectar con la PC.</p>";
        });
}

function resetUI() {
    progressContainer.classList.add('hidden');
    progressBar.style.width = "0%";

    icon.innerText = esPC ? "🖥️ -> 📱" : "📱 -> 🖥️";
    
    message.innerText = "Esperando archivo...";
    if (document.getElementById('fileInput')) {
        document.getElementById('fileInput').value = ""; 
    }
}