// Variables globales
window.listaHabitos = [];
window.db = {};
let miGrafica;

// --- 1. INICIALIZAR GRÁFICA ---
function inicializarGrafica() {
    const ctx = document.getElementById('progresoChart').getContext('2d');
    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: '% Cumplimiento',
                data: [0,0,0,0,0,0,0],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true, tension: 0.4
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            scales: { y: { min: 0, max: 100 } }
        }
    });
}

// --- 2. RENDERIZAR TABLA ---
window.renderTable = function() {
    const body = document.getElementById('habit-body');
    if (!body) return;
    body.innerHTML = '';
    
    window.listaHabitos.forEach((habito, index) => {
        let row = `<tr><td class="habit-name">${habito}</td>`;
        for (let i = 0; i < 7; i++) {
            const checked = window.db[habito] && window.db[habito][i] ? 'checked' : '';
            row += `<td><input type="checkbox" onchange="toggleHabit('${habito}', ${i})" ${checked}></td>`;
        }
        row += `<td><button onclick="eliminarHabito(${index})" style="color:red; background:none; border:none; cursor:pointer; font-size:20px;">×</button></td></tr>`;
        body.innerHTML += row;
    });
    actualizarCalculos();
};



// --- 3. FUNCIONES DE INTERACCIÓN ---
window.agregarHabito = function() {
    const input = document.getElementById('new-habit-name');
    if (!input || !input.value.trim()) return;

    const nuevoHabito = input.value.trim();
    
    if (!window.listaHabitos) window.listaHabitos = [];
    window.listaHabitos.push(nuevoHabito);
    
    if (!window.db) window.db = {};
    window.db[nuevoHabito] = [false, false, false, false, false, false, false];

    input.value = "";

    // Sincronizar con Firebase
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    window.renderTable();
};

window.toggleHabit = function(habito, dia) {
    if (!window.db[habito]) window.db[habito] = Array(7).fill(false);
    window.db[habito][dia] = !window.db[habito][dia];
    
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    actualizarCalculos();
};

window.eliminarHabito = function(index) {
    const habito = window.listaHabitos[index];
    delete window.db[habito];
    window.listaHabitos.splice(index, 1);
    
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    window.renderTable();
};

// --- 4. LÓGICA DE PROGRESO ---
const misionesBase = [
    { id: 'pushups', nombre: "Flexiones de pecho", base: 20 },
    { id: 'abs', nombre: "Abdominales", base: 10 },
    { id: 'squats', nombre: "Sentadillas", base: 20 },
    { id: 'run', nombre: "Correr (Km)", base: 2 }
];

function actualizarCalculos() {
    let totalChecks = 0;
    let diasActivos = 0;
    
    // Calcular XP (10 XP por cada cuadrito marcado)
    Object.values(window.db).forEach(dias => {
        dias.forEach(check => { if(check) totalChecks++; });
    });

    let xpTotal = totalChecks * 10;
    let nivel = Math.floor(xpTotal / 100) + 1;
    let xpActual = xpTotal % 100;

    // 1. Manejar Subida de Nivel
    let nivelGuardado = localStorage.getItem('sys_level') || 1;
    if (nivel > nivelGuardado) {
        document.getElementById('level-up-sound').play();
        alert("¡SISTEMA: HAS SUBIDO DE NIVEL!\nTu fuerza aumenta, la dificultad sube.");
        localStorage.setItem('sys_level', nivel);
    }

    // 2. Renderizar Misiones Escalables
    const listaMisiones = document.getElementById('daily-missions-list');
    listaMisiones.innerHTML = "";
    
    misionesBase.forEach(m => {
        // Aumenta 10% por cada nivel
        let cantidad = Math.floor(m.base + (m.base * (nivel - 1) * 0.1));
        listaMisiones.innerHTML += `
            <div class="mission-item">
                <span>${m.nombre}</span>
                <span class="mission-qty">${cantidad}</span>
            </div>
        `;
    });

    // 3. Sistema de Penalización (Si no hay checks hoy)
    const hoy = new Date().getDay(); // 0-6 (Dom-Sab)
    let haHechoAlgoHoy = false;
    Object.values(window.db).forEach(dias => {
        if(dias[hoy === 0 ? 6 : hoy - 1]) haHechoAlgoHoy = true;
    });

    const panelPenalizacion = document.getElementById('penalty-zone');
    if (!haHechoAlgoHoy && totalChecks > 0) {
        panelPenalizacion.style.display = 'block';
    } else {
        panelPenalizacion.style.display = 'none';
    }

    // 4. Actualizar Rango
    let rango = "E";
    if(nivel > 5) rango = "D";
    if(nivel > 10) rango = "C";
    if(nivel > 20) rango = "B";
    if(nivel > 40) rango = "A";
    if(nivel > 60) rango = "S";

    // 5. UI
    document.getElementById('user-level').innerText = nivel;
    document.getElementById('user-rank').innerText = rango;
    document.getElementById('current-xp').innerText = xpActual;
    document.getElementById('xp-bar-fill').style.width = xpActual + "%";
}

// --- 5. EXTRAS ---
window.descargarProgreso = function() {
    html2canvas(document.getElementById('main-app')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mi-progreso-semanal.png';
        link.href = canvas.toDataURL();
        link.click();
    });
};

window.resetSemana = function() {
    if(confirm("¿Quieres reiniciar el progreso de esta semana?")) {
        window.listaHabitos.forEach(h => window.db[h] = Array(7).fill(false));
        if (typeof window.guardarEnFirebase === "function") {
            window.guardarEnFirebase();
        }
        window.renderTable();
    }
};

// --- 6. MODO OSCURO (Ponlo aquí, al final de todo) ---
const btnTheme = document.getElementById('theme-toggle');
if (btnTheme) {
    btnTheme.onclick = () => {
        document.body.classList.toggle('dark-mode');
        
        // Cambiar el icono del botón
        if (document.body.classList.contains('dark-mode')) {
            btnTheme.innerText = "☀️";
        } else {
            btnTheme.innerText = "🌙";
        }
    };
}

// Inicialización
inicializarGrafica();