window.listaHabitos = [];
window.db = {};
window.categorias = {};
window.dificultades = {};
let miGrafica;

const XP_VALUES = { 'facil': 3, 'medio': 6, 'dificil': 10 };
const STAT_RANKS = ["E", "E+", "D", "D+", "C", "C+", "B", "B+", "A", "A+", "S", "SS"];
const misionesBase = [
    { nombre: "Flexiones", base: 10 },
    { nombre: "Abdominales", base: 10 },
    { nombre: "Sentadillas", base: 10 }
];

function inicializarGrafica() {
    const ctx = document.getElementById('progresoChart')?.getContext('2d');
    if (!ctx) return;
    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
            datasets: [{
                label: '% Disciplina',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: {color: '#555'} } } }
    });
}

window.renderTable = function() {
    const hb = document.getElementById('habits-body');
    const eb = document.getElementById('exercises-body');
    if (!hb || !eb) return;
    
    hb.innerHTML = ''; eb.innerHTML = '';
    
    let hoy = new Date().getDay(); 
    let diaActualIdx = hoy === 0 ? 6 : hoy - 1; 

    window.listaHabitos.forEach((item, index) => {
        const tipo = window.categorias[item];
        const dif = window.dificultades[item];
        const isEx = tipo === 'ejercicio';

        let display = item;
        if (isEx && item.includes(' x')) {
            const [n, r] = item.split(' x');
            display = `${n} <span class="reps-badge">${r} REPS</span>`;
        }

        let dot = isEx ? `<span class="dot ${dif}"></span>` : '';
        let row = `<tr><td class="habit-name">${dot} ${display}</td>`;
        
        for (let i = 0; i < 7; i++) {
            const checked = window.db[item] && window.db[item][i] ? 'checked' : '';
            const isLocked = i > diaActualIdx ? 'disabled' : '';
            const cellClass = i > diaActualIdx ? 'locked' : (i === diaActualIdx ? 'today' : '');
            
            row += `<td class="${cellClass}">
                <input type="checkbox" onchange="toggleHabit('${item}', ${i})" ${checked} ${isLocked}>
            </td>`;
        }
        
        row += `<td><button onclick="eliminarHabito(${index})" class="del-btn">×</button></td></tr>`;
        isEx ? eb.innerHTML += row : hb.innerHTML += row;
    });
    actualizarCalculos();
};

function actualizarCalculos() {
    let totalesDia = [0,0,0,0,0,0,0];
    let xpTotal = 0;
    const totalItems = window.listaHabitos.length;

    window.listaHabitos.forEach(item => {
        const tipo = window.categorias[item];
        const dif = window.dificultades[item] || 'medio';
        for (let i = 0; i < 7; i++) {
            if (window.db[item] && window.db[item][i]) {
                totalesDia[i]++;
                if (tipo === 'ejercicio') xpTotal += XP_VALUES[dif];
            }
        }
    });

    if (miGrafica) {
        miGrafica.data.datasets[0].data = totalesDia.map(t => totalItems > 0 ? Math.round((t/totalItems)*100) : 0);
        miGrafica.update();
    }

    let nivel = Math.floor(xpTotal / 100) + 1;
    let xpBarra = xpTotal % 100;
    
    document.getElementById('user-level').innerText = nivel;
    document.getElementById('current-xp').innerText = xpTotal;
    document.getElementById('xp-bar-fill').style.width = `${xpBarra}%`;

    actualizarRangoVisual(nivel);
    actualizarStats(nivel, xpTotal);
    generarMisiones(nivel);
}

function actualizarRangoVisual(nivel) {
    const b = document.getElementById('user-rank');
    let r = "E", c = "#aaa";
    if(nivel >= 5) { r = "D"; c = "#4ade80"; }
    if(nivel >= 10) { r = "C"; c = "#00d2ff"; }
    if(nivel >= 20) { r = "B"; c = "#fbbf24"; }
    if(nivel >= 40) { r = "S"; c = "#f472b6"; }
    b.innerText = r; b.style.color = c; b.style.borderColor = c;
    b.style.boxShadow = `0 0 15px ${c}`;
}

function actualizarStats(nivel, totalXp) {
    const getR = (v) => STAT_RANKS[Math.min(Math.floor(v/5), STAT_RANKS.length-1)];
    document.getElementById('stat-str').innerText = getR(nivel + 3);
    document.getElementById('stat-agi').innerText = getR(nivel + 1);
    document.getElementById('stat-int').innerText = getR(nivel);
    document.getElementById('stat-vit').innerText = getR(nivel + 2);
    document.getElementById('stat-total-xp').innerText = totalXp + " XP";
}

window.agregarEntrada = (tipo) => {
    const input = document.getElementById('new-item-name');
    const dif = document.getElementById('new-item-difficulty').value;
    const nivel = parseInt(document.getElementById('user-level').innerText);
    let nombre = input.value.trim();
    if(!nombre) return;

    if(tipo === 'ejercicio') {
        const base = dif === 'dificil' ? 30 : (dif === 'medio' ? 20 : 10);
        const reps = base + Math.floor(base * (nivel - 1) * 0.1);
        nombre = `${nombre} x${reps}`;
    }

    window.listaHabitos.push(nombre);
    window.categorias[nombre] = tipo;
    window.dificultades[nombre] = dif;
    window.db[nombre] = [false,false,false,false,false,false,false];
    input.value = "";
    if (window.guardarEnFirebase) window.guardarEnFirebase();
    window.renderTable();
};

window.toggleHabit = (item, dia) => {
    window.db[item][dia] = !window.db[item][dia];
    if (window.guardarEnFirebase) window.guardarEnFirebase();
    actualizarCalculos();
};

window.eliminarHabito = (idx) => {
    const item = window.listaHabitos[idx];
    delete window.db[item]; delete window.categorias[item]; delete window.dificultades[item];
    window.listaHabitos.splice(idx, 1);
    if (window.guardarEnFirebase) window.guardarEnFirebase();
    window.renderTable();
};

function generarMisiones(nivel) {
    const l = document.getElementById('daily-missions-list');
    l.innerHTML = "";
    misionesBase.forEach(m => {
        const cant = Math.floor(m.base + (m.base * (nivel-1) * 0.1));
        l.innerHTML += `<div class="mission-item"><span>${m.nombre}</span><span class="mission-qty">${cant}</span></div>`;
    });
}

function toggleMenu() { document.getElementById('user-dropdown').classList.toggle('show'); }
function abrirPerfilModal() { document.getElementById('profile-modal').showModal(); }
function cerrarPerfilModal() { document.getElementById('profile-modal').close(); }

document.getElementById('display-date').innerText = new Date().toLocaleDateString('es-ES', {weekday:'short', day:'numeric', month:'short'});
inicializarGrafica();