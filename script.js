const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const statusText = document.getElementById('statusText');
const message = document.getElementById('message');
const icon = document.getElementById('icon');

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0]);
    }
});

function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    
    // Configuración visual inicial
    progressContainer.classList.remove('hidden');
    message.innerText = "Subiendo " + file.name;
    icon.innerText = "⏳";

    xhr.open("POST", "/upload");

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