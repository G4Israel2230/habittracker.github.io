// ==========================================
// VARIABLES GLOBALES
// ==========================================
window.listaHabitos = window.listaHabitos || [];
window.db = window.db || {};
window.categorias = window.categorias || {}; 
let miGrafica;

const misionesBase = [
    { nombre: "Flexiones de pecho", base: 20 },
    { nombre: "Abdominales", base: 10 },
    { nombre: "Sentadillas", base: 20 },
    { nombre: "Correr (Km)", base: 2 }
];

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
function inicializarGrafica() {
    const canvas = document.getElementById('progresoChart');
    if (!canvas) return; // Evita error si el elemento no existe aún
    
    const ctx = canvas.getContext('2d');
    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: '% Disciplina',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { min: 0, max: 100 } }
        }
    });
}

// ==========================================
// 2. ENTRADAS
// ==========================================
window.agregarEntrada = function(tipo) {
    const input = document.getElementById('new-item-name');
    const nombre = input.value.trim();

    if (!nombre) return;

    window.listaHabitos.push(nombre);
    window.categorias[nombre] = tipo;
    window.db[nombre] = [false, false, false, false, false, false, false];

    input.value = "";

    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    window.renderTable();
};

// ==========================================
// 3. RENDERIZADO
// ==========================================
window.renderTable = function() {
    const body = document.getElementById('habit-body');
    if (!body) return;
    body.innerHTML = '';
    
    window.listaHabitos.forEach((item, index) => {
        const tipo = window.categorias[item] || 'habito';
        const icono = tipo === 'ejercicio' ? '🏋️' : '📝';
        
        // CORRECCIÓN: Se agregaron las comillas invertidas (backticks) y comillas en onclick
        let row = `<tr>
            <td class="habit-name">${icono} ${item}</td>`;
        
        for (let i = 0; i < 7; i++) {
            const checked = window.db[item] && window.db[item][i] ? 'checked' : '';
            // CORRECCIÓN: Se envolvió el HTML en backticks y se escaparon comillas del item
            row += `<td><input type="checkbox" onchange="toggleHabit('${item.replace(/'/g, "\\'")}', ${i})" ${checked}></td>`;
        }
        
        row += `<td><button onclick="eliminarHabito(${index})" style="color:red; background:none; border:none; cursor:pointer; font-size:20px;">×</button></td></tr>`;
        body.innerHTML += row;
    });
    actualizarCalculos();
};

function generarMisionesVisuales(nivel) {
    const listaMisiones = document.getElementById('daily-missions-list');
    if (!listaMisiones) return;
    listaMisiones.innerHTML = "";
    
    misionesBase.forEach(m => {
        const cantidad = Math.floor(m.base + (m.base * (nivel - 1) * 0.1));
        listaMisiones.innerHTML += `
            <div class="mission-item">
                <span>${m.nombre}</span>
                <span class="mission-qty">${cantidad}</span>
            </div>`;
    });
}

// ==========================================
// 4. CÁLCULOS DE NIVEL Y XP
// ==========================================
function actualizarCalculos() {
    let totalesDiaHabitos = [0,0,0,0,0,0,0];
    let xpGanada = 0;
    let actividadHoy = false;
    
    // Ajuste de índice de día (Lunes = 0, Domingo = 6)
    const hoyIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    const soloHabitos = window.listaHabitos.filter(h => window.categorias[h] === 'habito');

    window.listaHabitos.forEach(item => {
        for (let i = 0; i < 7; i++) {
            if (window.db[item] && window.db[item][i]) {
                if (i === hoyIdx) actividadHoy = true;

                if (window.categorias[item] === 'ejercicio') {
                    xpGanada += 20; 
                } else {
                    totalesDiaHabitos[i]++;
                }
            }
        }
    });

    if (miGrafica) {
        miGrafica.data.datasets[0].data = totalesDiaHabitos.map(t => 
            soloHabitos.length > 0 ? Math.round((t / soloHabitos.length) * 100) : 0
        );
        miGrafica.update();
    }

    let nivel = Math.floor(xpGanada / 100) + 1;
    let xpActual = xpGanada % 100;
    
    // Actualización segura del DOM
    if(document.getElementById('user-level')) document.getElementById('user-level').innerText = nivel;
    if(document.getElementById('current-xp')) document.getElementById('current-xp').innerText = xpActual;
    if(document.getElementById('xp-bar-fill')) document.getElementById('xp-bar-fill').style.width = xpActual + "%";

    actualizarRango(nivel);
    generarMisionesVisuales(nivel);
    verificarPenalizacion(actividadHoy);
    verificarSubidaNivel(nivel);
}

function actualizarRango(nivel) {
    let rango = "E";
    let color = "#00d2ff";
    if(nivel > 5) { rango = "D"; color = "#4ade80"; }
    if(nivel > 10) { rango = "C"; color = "#fbbf24"; }
    if(nivel > 20) { rango = "B"; color = "#a78bfa"; }
    if(nivel > 40) { rango = "A"; color = "#f87171"; }
    if(nivel > 60) { rango = "S"; color = "#ffffff"; }

    const badge = document.getElementById('user-rank');
    if (badge) {
        badge.innerText = rango;
        badge.style.color = color;
        // CORRECCIÓN: Se agregaron comillas invertidas y 'px'
        badge.style.textShadow = `0 0 15px ${color}`;
    }
}

function verificarPenalizacion(actividad) {
    const panel = document.getElementById('penalty-zone');
    if (!panel) return;
    panel.style.display = (!actividad && window.listaHabitos.length > 0) ? 'block' : 'none';
}

function verificarSubidaNivel(nivelActual) {
    let nivelGuardado = parseInt(localStorage.getItem('nivel_anterior')) || 1;
    if (nivelActual > nivelGuardado) {
        const sonido = document.getElementById('level-up-sound');
        if (sonido) {
            sonido.play().catch(e => console.log("Audio bloqueado por el navegador"));
        }
        alert("¡SISTEMA: HAS SUBIDO DE NIVEL!");
        localStorage.setItem('nivel_anterior', nivelActual);
    }
}

// ==========================================
// 5. ACCIONES
// ==========================================
window.toggleHabit = function(item, dia) {
    if (window.db[item]) {
        window.db[item][dia] = !window.db[item][dia];
        if (typeof window.guardarEnFirebase === "function") {
            window.guardarEnFirebase();
        }
        actualizarCalculos();
    }
};

window.eliminarHabito = function(index) {
    const item = window.listaHabitos[index];
    delete window.db[item];
    delete window.categorias[item];
    window.listaHabitos.splice(index, 1);
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    window.renderTable();
};

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    inicializarGrafica();
    window.renderTable();
});