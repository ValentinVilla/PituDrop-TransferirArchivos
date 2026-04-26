const esPC = !window.Capacitor;

let SERVER_URL = esPC ? "http://localhost:3000" : (localStorage.getItem('pitu_ip') || "");

// Declaramos las variables pero las asignamos después del DOM
let fileInput, progressBar, progressContainer, statusText, message, icon;

document.addEventListener('DOMContentLoaded', () => {
    // Asignamos TODAS las referencias acá, cuando el DOM ya existe
    fileInput        = document.getElementById('fileInput');
    progressBar      = document.getElementById('progressBar');
    progressContainer = document.getElementById('progressContainer');
    statusText       = document.getElementById('statusText');
    message          = document.getElementById('instruction'); // ← 'instruction', no 'message'
    icon             = document.getElementById('icon');

    const pcOnlyLinks   = document.querySelectorAll('.pc-only');
    const mobileOnlyLinks = document.querySelectorAll('.mobile-only');

    if (esPC) {
        message.innerText = "Compartir archivos con el celular";
        const btnPrimary = document.querySelector('.btn-primary');
        if (btnPrimary) btnPrimary.innerText = "Compartir al Celu";
        if (icon) icon.innerText = "🖥️ -> 📱";
        pcOnlyLinks.forEach(l => l.style.display = "inline-block");
        mobileOnlyLinks.forEach(l => l.style.display = "none");
    } else {
        if (icon) icon.innerText = "📱 -> 🖥️";
        pcOnlyLinks.forEach(l => l.style.display = "none");
        mobileOnlyLinks.forEach(l => {
            l.style.display = "inline-block";
            if (l.id !== 'btn-vincular') {  // ← no tocar el color de btn-vincular
                l.style.color = "var(--primary)";
            }
            l.style.fontWeight = "bold";
        });
        actualizarBtnVincular();
    }

    // El listener del fileInput también va acá adentro
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) uploadFile(fileInput.files[0]);
    });

    // Drag & drop
    const dropArea = document.querySelector('.drop-zone');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
        dropArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(ev => {
        dropArea.addEventListener(ev, () => dropArea.classList.add('drag-active'), false);
    });
    ['dragleave', 'drop'].forEach(ev => {
        dropArea.addEventListener(ev, () => dropArea.classList.remove('drag-active'), false);
    });
    dropArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) uploadFile(files[0]);
    }, false);
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

function toggleVincular() {
    const yaVinculado = !!localStorage.getItem('pitu_ip');
    
    if (yaVinculado) {
        // Desvincular
        if (confirm("¿Desvincular esta PC?")) {
            localStorage.removeItem('pitu_ip');
            SERVER_URL = "";
            actualizarBtnVincular();
        }
    } else {
        // Vincular
        scanearQR();
    }
}

function actualizarBtnVincular() {
    const btn = document.getElementById('btn-vincular');
    if (!btn) return;
    
    const yaVinculado = !!localStorage.getItem('pitu_ip');
    if (yaVinculado) {
        btn.innerText = "Vinculado";
        btn.style.color = "#34c759";
    } else {
        btn.innerText = "Vincular PC";
        btn.style.color = "var(--primary)";
    }
}

async function scanearQR() {
    if (esPC) {
        alert("El escáner solo funciona en la App móvil");
        return;
    }

    const { BarcodeScanner } = window.Capacitor.Plugins;
    
    // 1. Pedir permisos
    const granted = await BarcodeScanner.requestPermissions();
    if (!granted) return;

    // 2. Escanear
    const { barcodes } = await BarcodeScanner.scan();
    if (barcodes.length > 0) {
        let rawData = barcodes[0].displayValue; // Ejemplo: "pitudrop:192.168.0.4:3000"

        // 3. LÓGICA DE LIMPIEZA INTELIGENTE
        // Borramos el prefijo "pitudrop:" si existe
        let ipLimpia = rawData.replace("pitudrop:", "").trim();
        
        // Si la IP no tiene el http:// adelante, se lo ponemos para que el XHR no falle
        if (!ipLimpia.startsWith("http")) {
            ipLimpia = "http://" + ipLimpia;
        }

        // 4. Guardar y Conectar
        localStorage.setItem('pitu_ip', ipLimpia);
        SERVER_URL = ipLimpia;
        actualizarBtnVincular();
        alert("¡Conectado exitosamente!");
        location.reload(); 
    }
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    const endpoint = esPC ? "/pc-share" : "/upload";

    progressContainer.classList.remove('hidden');
    message.innerText = "Subiendo " + file.name;
    icon.innerText = "⏳";

    // Arranca con animación indeterminada
    progressBar.classList.add('indeterminate');
    progressBar.style.width = "0%";
    statusText.innerText = esPC ? "Enviando al celu..." : "Enviando a PC...";

    xhr.open("POST", SERVER_URL + endpoint);

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            if (percent > 0 && percent < 100) {
                progressBar.classList.remove('indeterminate');
                progressBar.style.width = percent + "%";
                statusText.innerText = esPC ? `Enviando al celu... ${percent}%` : `Enviando a PC... ${percent}%`;
            }
        }
    };

    xhr.onload = () => {
        progressBar.classList.remove('indeterminate');
        if (xhr.status === 200) {
            progressBar.style.width = "100%";
            icon.innerText = "✅";
            message.innerText = esPC ? "¡Listo! Revisalo en tu celu." : "¡Archivo recibido!";
            statusText.innerText = "Completado al 100%";
            setTimeout(() => resetUI(), 1800);
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

const btnAbrirLocal = document.getElementById('btn-abrir-descargas');

if (btnAbrirLocal) {
    btnAbrirLocal.addEventListener('click', (e) => {
        e.preventDefault(); // Evita que la página recargue
        
        // Llamamos al endpoint del servidor para abrir la carpeta
        fetch('http://localhost:3000/open-folder')
            .then(res => {
                if (!res.ok) throw new Error("No se pudo abrir la carpeta");
            })
            .catch(err => {
                console.error("Error al intentar abrir la carpeta local:", err);
                alert("Asegurate de que el servidor esté corriendo en la PC.");
            });
    });
}

function resetUI() {
    progressContainer.classList.add('hidden');
    progressBar.style.width = "0%";

    icon.innerText = esPC ? "🖥️ -> 📱" : "📱 -> 🖥️";
    
    message.innerText = esPC ? "Compartir archivos con el celular" : "Toca para seleccionar un archivo";
    if (document.getElementById('fileInput')) {
        document.getElementById('fileInput').value = ""; 
    }
}