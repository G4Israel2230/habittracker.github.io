// ==========================================
// VARIABLES GLOBALES
// ==========================================
window.listaHabitos = []; // {id, nombre}
window.db = {};           // id => [bool x7]
window.categorias = {};   // id => 'habito' | 'ejercicio'
window.userStats = { xp: 0, nivel: 1 };

let miGrafica;

const misionesBase = [
    { nombre: "Flexiones de pecho", base: 20 },
    { nombre: "Abdominales", base: 10 },
    { nombre: "Sentadillas", base: 20 },
    { nombre: "Correr (Km)", base: 2 }
];

// ==========================================
// 1. INICIALIZACIÓN DE GRÁFICA
// ==========================================
function inicializarGrafica() {
    const canvas = document.getElementById('progresoChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: '% Disciplina',
                data: [0,0,0,0,0,0,0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.1)',
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
// 2. RENDERIZADO
// ==========================================
window.renderTable = function () {
    const body = document.getElementById('habit-body');
    if (!body) return;

    let html = '';

    window.listaHabitos.forEach((item, index) => {
        const tipo = window.categorias[item.id];
        const icono = tipo === 'ejercicio' ? '🏋️' : '📝';

        html += `<tr>
            <td class="habit-name">${icono} ${item.nombre}</td>`;

        for (let i = 0; i < 7; i++) {
            const checked = window.db[item.id][i] ? 'checked' : '';
            html += `<td>
                <input type="checkbox" onchange="toggleHabit('${item.id}', ${i})" ${checked}>
            </td>`;
        }

        html += `<td>
            <button onclick="eliminarHabito(${index})"
                style="color:red;background:none;border:none;font-size:20px;cursor:pointer;">×</button>
        </td></tr>`;
    });

    body.innerHTML = html;
    actualizarCalculos();
};

// ==========================================
// 3. CÁLCULOS DE XP, NIVEL Y GRÁFICA
// ==========================================
function actualizarCalculos() {
    const hoyIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    let totalesDiaHabitos = [0,0,0,0,0,0,0];
    let xpHoy = 0;
    let actividadHoy = false;

    const soloHabitos = window.listaHabitos.filter(h => window.categorias[h.id] === 'habito');

    window.listaHabitos.forEach(item => {
        for (let i = 0; i < 7; i++) {
            if (window.db[item.id][i]) {
                if (window.categorias[item.id] === 'habito') {
                    totalesDiaHabitos[i]++;
                }

                if (i === hoyIdx) {
                    actividadHoy = true;
                    if (window.categorias[item.id] === 'ejercicio') {
                        xpHoy += 20;
                    }
                }
            }
        }
    });

    // XP acumulado (NO baja)
    window.userStats.xp += xpHoy;
    window.userStats.nivel = Math.floor(window.userStats.xp / 100) + 1;
    const xpActual = window.userStats.xp % 100;

    // UI XP
    document.getElementById('user-level')?.innerText = window.userStats.nivel;
    document.getElementById('current-xp')?.innerText = xpActual;
    document.getElementById('xp-bar-fill')?.style.width = `${xpActual}%`;

    // Gráfica
    if (miGrafica) {
        miGrafica.data.datasets[0].data = totalesDiaHabitos.map(v =>
            soloHabitos.length ? Math.round((v / soloHabitos.length) * 100) : 0
        );
        miGrafica.update();
    }

    actualizarRango(window.userStats.nivel);
    generarMisionesVisuales(window.userStats.nivel);
    verificarPenalizacion(actividadHoy, soloHabitos.length);
}

// ==========================================
// 4. RANGO
// ==========================================
function actualizarRango(nivel) {
    let rango = "E", color = "#00d2ff";
    if (nivel > 5)  { rango = "D"; color = "#4ade80"; }
    if (nivel > 10) { rango = "C"; color = "#fbbf24"; }
    if (nivel > 20) { rango = "B"; color = "#a78bfa"; }
    if (nivel > 40) { rango = "A"; color = "#f87171"; }
    if (nivel > 60) { rango = "S"; color = "#ffffff"; }

    const badge = document.getElementById('user-rank');
    if (badge) {
        badge.innerText = rango;
        badge.style.color = color;
        badge.style.textShadow = `0 0 15px ${color}`;
    }
}

// ==========================================
// 5. CRUD DE HÁBITOS
// ==========================================
window.agregarEntrada = function (tipo) {
    const input = document.getElementById('new-item-name');
    const nombre = input.value.trim();
    if (!nombre) return;

    const id = crypto.randomUUID();

    window.listaHabitos.push({ id, nombre });
    window.categorias[id] = tipo;
    window.db[id] = [false,false,false,false,false,false,false];

    input.value = '';
    window.guardarEnFirebase?.();
    window.renderTable();
};

window.toggleHabit = function (id, dia) {
    window.db[id][dia] = !window.db[id][dia];
    window.guardarEnFirebase?.();
    actualizarCalculos();
};

window.eliminarHabito = function (index) {
    const id = window.listaHabitos[index].id;
    delete window.db[id];
    delete window.categorias[id];
    window.listaHabitos.splice(index, 1);

    window.guardarEnFirebase?.();
    window.renderTable();
};

// ==========================================
// 6. MISIONES Y PENALIZACIÓN
// ==========================================
function generarMisionesVisuales(nivel) {
    const lista = document.getElementById('daily-missions-list');
    if (!lista) return;

    lista.innerHTML = '';
    misionesBase.forEach(m => {
        const cant = Math.floor(m.base * (1 + (nivel - 1) * 0.1));
        lista.innerHTML += `
            <div class="mission-item">
                <span>${m.nombre}</span>
                <span class="mission-qty">${cant}</span>
            </div>`;
    });
}

function verificarPenalizacion(activoHoy, totalHabitos) {
    const p = document.getElementById('penalty-zone');
    if (!p) return;
    p.style.display = (!activoHoy && totalHabitos > 0) ? 'block' : 'none';
}

// ==========================================
// INIT
// ==========================================
inicializarGrafica();
