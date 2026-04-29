// Detección robusta: Capacitor.isNativePlatform() es true solo en la app instalada
const esPCMic = !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

document.addEventListener('DOMContentLoaded', () => {
    const vistaCelu = document.getElementById('vista-celu');
    const vistaPC   = document.getElementById('vista-pc');

    if (esPCMic) {
        vistaCelu.style.display = 'none';
        vistaPC.style.display   = 'block';
        iniciarReceptorPC();
    } else {
        vistaCelu.style.display = 'block';
        vistaPC.style.display   = 'none';
    }
});

// ─── CELULAR: captura y envía audio ───────────────────────────────────────────

let micActivo = false;
let mediaStream = null;
let mediaRecorder = null;
let wsEnvio = null;

async function toggleMic() {
    if (!micActivo) {
        await iniciarMic();
    } else {
        detenerMic();
    }
}

async function iniciarMic() {
    const serverIP = localStorage.getItem('pitu_ip');
    if (!serverIP) {
        alert("Primero vinculá la PC desde la pantalla principal.");
        return;
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        const wsURL = serverIP.replace('http://', 'ws://') + '/mic';
        wsEnvio = new WebSocket(wsURL);

        wsEnvio.onopen = () => {
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm;codecs=opus' });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0 && wsEnvio.readyState === WebSocket.OPEN) {
                    wsEnvio.send(e.data);
                }
            };

            mediaRecorder.start(20);
            micActivo = true;
            actualizarBtnMic(true);
        };

        wsEnvio.onerror = () => {
            alert("No se pudo conectar con la PC. ¿Está corriendo PituDrop?");
            detenerMic();
        };

        wsEnvio.onclose = () => {
            if (micActivo) detenerMic();
        };

    } catch (err) {
        alert("No se pudo acceder al micrófono: " + err.message);
    }
}

function detenerMic() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    if (wsEnvio) wsEnvio.close();

    micActivo = false;
    mediaRecorder = null;
    mediaStream = null;
    wsEnvio = null;

    actualizarBtnMic(false);
}

function actualizarBtnMic(activo) {
    const btn         = document.getElementById('btn-mic');
    const estado      = document.getElementById('mic-estado');
    const instruccion = document.getElementById('mic-instruction');

    if (activo) {
        btn.style.background  = '#34c759';
        btn.style.boxShadow   = '0 0 40px rgba(52, 199, 89, 0.6)';
        btn.style.transform   = 'scale(1.05)';
        estado.innerText      = '🔴 Transmitiendo...';
        estado.style.color    = '#34c759';
        instruccion.innerText = 'Tocá para detener';
    } else {
        btn.style.background  = 'var(--primary)';
        btn.style.boxShadow   = '0 0 30px rgba(157, 78, 221, 0.4)';
        btn.style.transform   = 'scale(1)';
        estado.innerText      = 'Desconectado';
        estado.style.color    = 'var(--text-muted)';
        instruccion.innerText = 'Tocá para usar tu celu como micrófono';
    }
}

// ─── PC: recibe y reproduce audio ─────────────────────────────────────────────

let wsPCGlobal = null;

function iniciarReceptorPC() {
    const wsPC = new WebSocket(`ws://localhost:3000/mic`);
    wsPCGlobal = wsPC;

    const audioEl = new Audio();
    audioEl.autoplay = true;

    const mediaSource = new MediaSource();
    audioEl.src = URL.createObjectURL(mediaSource);

    let sourceBuffer;
    const queue = [];

    mediaSource.addEventListener('sourceopen', () => {
        sourceBuffer = mediaSource.addSourceBuffer('audio/webm;codecs=opus');
        sourceBuffer.addEventListener('updateend', () => {
            if (queue.length > 0 && !sourceBuffer.updating) {
                sourceBuffer.appendBuffer(queue.shift());
            }
        });
    });

    wsPC.onopen = () => console.log('PC lista para recibir audio');

    wsPC.onmessage = async (event) => {
        actualizarEstadoPC(true);
        const arrayBuffer = await event.data.arrayBuffer();

        if (sourceBuffer && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(arrayBuffer);
        } else {
            queue.push(arrayBuffer);
        }

        if (audioEl.paused) {
            audioEl.play().catch(() => {});
        }
    };

    wsPC.onclose = () => { actualizarEstadoPC(false); wsPCGlobal = null; };
    wsPC.onerror = () => { actualizarEstadoPC(false); wsPCGlobal = null; };
}

function desconectarPC() {
    if (wsPCGlobal) { wsPCGlobal.close(); wsPCGlobal = null; }
    actualizarEstadoPC(false);
}

function actualizarEstadoPC(conectado) {
    const dot       = document.getElementById('dot');
    const subtitulo = document.getElementById('pc-subtitulo');
    const estadoEl  = document.getElementById('pc-estado');

    if (dot) {
        dot.style.background = conectado ? '#34c759' : 'var(--text-muted)';
        dot.style.boxShadow  = conectado ? '0 0 8px #34c759' : 'none';
    }

    if (subtitulo) {
        subtitulo.innerText   = conectado ? '¡Celular conectado!' : 'Esperando conexión del celular...';
        subtitulo.style.color = conectado ? '#34c759' : 'var(--text-muted)';
    }

    if (!estadoEl) return;

    if (conectado) {
        estadoEl.innerHTML         = '🟢 Celular conectado';
        estadoEl.style.color       = '#34c759';
        estadoEl.style.borderColor = '#34c759';
        estadoEl.style.background  = 'rgba(52, 199, 89, 0.08)';
        estadoEl.style.cursor      = 'pointer';
        estadoEl.title             = 'Clic para desconectar';
        estadoEl.onclick = () => { if (confirm('¿Desconectar el celular?')) desconectarPC(); };
    } else {
        estadoEl.innerHTML         = '⚪ Sin conexión';
        estadoEl.style.color       = 'var(--text-muted)';
        estadoEl.style.borderColor = 'var(--border)';
        estadoEl.style.background  = 'rgba(255,255,255,0.05)';
        estadoEl.style.cursor      = 'default';
        estadoEl.title             = '';
        estadoEl.onclick           = null;
    }
}


/*const esPCMic = !window.Capacitor;

document.addEventListener('DOMContentLoaded', () => {
    // Mostramos la vista correcta
    document.getElementById('vista-celu').style.display = esPCMic ? 'none' : 'block';
    document.getElementById('vista-pc').style.display  = esPCMic ? 'block' : 'none';

    if (esPCMic) {
        iniciarReceptorPC();
    }
});

// ─── CELULAR: captura y envía audio ───────────────────────────────────────────

let micActivo = false;
let mediaStream = null;
let mediaRecorder = null;
let wsEnvio = null;

async function toggleMic() {
    if (!micActivo) {
        await iniciarMic();
    } else {
        detenerMic();
    }
}

async function iniciarMic() {
    const serverIP = localStorage.getItem('pitu_ip');
    if (!serverIP) {
        alert("Primero vinculá la PC desde la pantalla principal.");
        return;
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        // Convertimos la IP http:// en ws://
        const wsURL = serverIP.replace('http://', 'ws://') + '/mic';
        wsEnvio = new WebSocket(wsURL);

        wsEnvio.onopen = () => {
            // WebSocket listo, arrancamos a grabar
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm;codecs=opus' });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0 && wsEnvio.readyState === WebSocket.OPEN) {
                    wsEnvio.send(e.data);
                }
            };

            mediaRecorder.start(100); // chunk cada 100ms
            micActivo = true;
            actualizarBtnMic(true);
        };

        wsEnvio.onerror = () => {
            alert("No se pudo conectar con la PC. ¿Está corriendo PituDrop?");
            detenerMic();
        };

        wsEnvio.onclose = () => {
            if (micActivo) detenerMic();
        };

    } catch (err) {
        alert("No se pudo acceder al micrófono: " + err.message);
    }
}

function detenerMic() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    if (wsEnvio) wsEnvio.close();

    micActivo = false;
    mediaRecorder = null;
    mediaStream = null;
    wsEnvio = null;

    actualizarBtnMic(false);
}

function actualizarBtnMic(activo) {
    const btn = document.getElementById('btn-mic');
    const estado = document.getElementById('mic-estado');
    const instruccion = document.getElementById('mic-instruction');

    if (activo) {
        btn.style.background = '#34c759';
        btn.style.boxShadow = '0 0 40px rgba(52, 199, 89, 0.6)';
        btn.style.transform = 'scale(1.05)';
        estado.innerText = '🔴 Transmitiendo...';
        estado.style.color = '#34c759';
        instruccion.innerText = 'Tocá para detener';
    } else {
        btn.style.background = 'var(--primary)';
        btn.style.boxShadow = '0 0 30px rgba(157, 78, 221, 0.4)';
        btn.style.transform = 'scale(1)';
        estado.innerText = 'Desconectado';
        estado.style.color = 'var(--text-muted)';
        instruccion.innerText = 'Tocá para usar tu celu como micrófono';
    }
}

// ─── PC: recibe y reproduce audio ─────────────────────────────────────────────

function iniciarReceptorPC() {
    const wsPC = new WebSocket(`ws://localhost:3000/mic`);
    
    // Creamos un reproductor de audio oculto
    const audioEl = new Audio();
    audioEl.autoplay = true;

    // MediaSource es el "motor" para streaming en vivo
    const mediaSource = new MediaSource();
    audioEl.src = URL.createObjectURL(mediaSource);

    let sourceBuffer;
    const queue = [];

    // Cuando el motor arranca, le decimos el formato que manda el celular
    mediaSource.addEventListener('sourceopen', () => {
        // Debe coincidir exacto con el mimeType de tu celular (webm + opus)
        sourceBuffer = mediaSource.addSourceBuffer('audio/webm;codecs=opus');

        // Cada vez que termina de procesar un pedacito, mete el siguiente
        sourceBuffer.addEventListener('updateend', () => {
            if (queue.length > 0 && !sourceBuffer.updating) {
                sourceBuffer.appendBuffer(queue.shift());
            }
        });
    });

    wsPC.onopen = () => {
        console.log('PC lista para recibir audio');
    };

    wsPC.onmessage = async (event) => {
        actualizarEstadoPC(true);
        const arrayBuffer = await event.data.arrayBuffer();

        // Si el buffer está libre, le metemos el audio. Si no, a la fila (queue).
        if (sourceBuffer && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(arrayBuffer);
        } else {
            queue.push(arrayBuffer);
        }

        // Si el navegador pausó el audio por seguridad, le damos play a la fuerza
        if (audioEl.paused) {
            audioEl.play().catch(err => console.log("Hacé clic en la pantalla para permitir el audio", err));
        }
    };

    wsPC.onclose = () => actualizarEstadoPC(false);
    wsPC.onerror = () => actualizarEstadoPC(false);
}

function actualizarEstadoPC(conectado) {
    const el = document.getElementById('pc-estado');
    if (!el) return;
    if (conectado) {
        el.innerText = '🟢 Celular conectado';
        el.style.color = '#34c759';
        el.style.borderColor = '#34c759';
        el.style.background = 'rgba(52, 199, 89, 0.08)';
    } else {
        el.innerText = '⚪ Sin conexión';
        el.style.color = 'var(--text-muted)';
        el.style.borderColor = 'var(--border)';
        el.style.background = 'rgba(255,255,255,0.05)';
    }
}
*/