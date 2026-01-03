window.listaHabitos = [];
window.db = {};
window.categorias = {}; 
let miGrafica;

const misionesBase = [
    { nombre: "Flexiones de pecho", base: 20 },
    { nombre: "Abdominales", base: 10 },
    { nombre: "Sentadillas", base: 20 },
    { nombre: "Correr (Km)", base: 2 }
];

function inicializarGrafica() {
    const ctx = document.getElementById('progresoChart').getContext('2d');
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
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });
}

window.renderTable = function() {
    const body = document.getElementById('habit-body');
    if (!body) return;
    body.innerHTML = '';
    
    window.listaHabitos.forEach((item, index) => {
        const tipo = window.categorias[item] || 'habito';
        const icono = tipo === 'ejercicio' ? '🏋️' : '📝';
        let row = <tr><td class="habit-name">${icono} ${item}</td>;
        for (let i = 0; i < 7; i++) {
            const checked = window.db[item] && window.db[item][i] ? 'checked' : '';
            row += <td><input type="checkbox" onchange="toggleHabit('${item}', ${i})" ${checked}></td>;
        }
        row += <td><button onclick="eliminarHabito(${index})" style="color:red; background:none; border:none; cursor:pointer;">×</button></td></tr>;
        body.innerHTML += row;
    });
    actualizarCalculos(); // Forzar actualización de XP al renderizar
};

function actualizarCalculos() {
    let totalesDiaHabitos = [0,0,0,0,0,0,0];
    let xpGanada = 0;
    let actividadHoy = false;
    const hoyIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    window.listaHabitos.forEach(item => {
        for (let i = 0; i < 7; i++) {
            if (window.db[item] && window.db[item][i]) {
                if (i === hoyIdx) actividadHoy = true;
                if (window.categorias[item] === 'ejercicio') xpGanada += 20;
                else totalesDiaHabitos[i]++;
            }
        }
    });

    if (miGrafica) {
        const soloHabitos = window.listaHabitos.filter(h => window.categorias[h] === 'habito');
        miGrafica.data.datasets[0].data = totalesDiaHabitos.map(t => 
            soloHabitos.length > 0 ? Math.round((t / soloHabitos.length) * 100) : 0
        );
        miGrafica.update();
    }

    let nivel = Math.floor(xpGanada / 100) + 1;
    let xpActual = xpGanada % 100;
    
    document.getElementById('user-level').innerText = nivel;
    document.getElementById('current-xp').innerText = xpActual;
    document.getElementById('xp-bar-fill').style.width = ${xpActual}%;

    actualizarRango(nivel);
    generarMisionesVisuales(nivel);
    document.getElementById('penalty-zone').style.display = (!actividadHoy && window.listaHabitos.length > 0) ? 'block' : 'none';
}

function actualizarRango(nivel) {
    const badge = document.getElementById('user-rank');
    let r = "E", c = "#00d2ff";
    if(nivel > 5) { r = "D"; c = "#4ade80"; }
    if(nivel > 10) { r = "C"; c = "#fbbf24"; }
    if(badge) {
        badge.innerText = r; badge.style.color = c;
        badge.style.textShadow = 0 0 15px ${c}; // Corregido: Uso de backticks
    }
}

window.agregarEntrada = (t) => {
    const n = document.getElementById('new-item-name').value.trim();
    if(!n) return;
    window.listaHabitos.push(n);
    window.categorias[n] = t;
    window.db[n] = [false,false,false,false,false,false,false];
    document.getElementById('new-item-name').value = "";
    window.guardarEnFirebase();
    window.renderTable();
};

window.toggleHabit = (item, dia) => {
    window.db[item][dia] = !window.db[item][dia];
    window.guardarEnFirebase();
    actualizarCalculos();
};

window.eliminarHabito = (idx) => {
    const item = window.listaHabitos[idx];
    delete window.db[item]; delete window.categorias[item];
    window.listaHabitos.splice(idx, 1);
    window.guardarEnFirebase();
    window.renderTable();
};

function generarMisionesVisuales(nivel) {
    const lista = document.getElementById('daily-missions-list');
    if(!lista) return;
    lista.innerHTML = "";
    misionesBase.forEach(m => {
        const cant = Math.floor(m.base + (m.base * (nivel - 1) * 0.1));
        lista.innerHTML += <div class="mission-item"><span>${m.nombre}</span><span class="mission-qty">${cant}</span></div>;
    });
}

window.enviarReporte = (p) => {
    const res = ⚡ REPORTE SISTEMA ⚡\nNivel: ${document.getElementById('user-level').innerText}\nRango: ${document.getElementById('user-rank').innerText};
    if(p === 'whatsapp') window.open(https://wa.me/?text=${encodeURIComponent(res)}, '_blank');
    else window.location.href = mailto:?subject=Reporte&body=${encodeURIComponent(res)};
};

inicializarGrafica();