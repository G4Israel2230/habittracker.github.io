let habitos = JSON.parse(localStorage.getItem('habitos')) || [];
let db = JSON.parse(localStorage.getItem('db')) || {};
let categorias = JSON.parse(localStorage.getItem('categorias')) || {};
let dificultades = JSON.parse(localStorage.getItem('dificultades')) || {};
let currentLevel = 1;
let habitChart;

// Sonidos
const sfxClick = document.getElementById('sfx-click');
const sfxLevel = document.getElementById('sfx-level');
const sfxMenu = document.getElementById('sfx-menu');

function playSound(type) {
    if(type === 'click') { sfxClick.currentTime = 0; sfxClick.play(); }
    if(type === 'level') { sfxLevel.play(); }
    if(type === 'menu') { sfxMenu.currentTime = 0; sfxMenu.play(); }
}

function init() {
    setupChart();
    render();
}

function setupChart() {
    const ctx = document.getElementById('habitChart').getContext('2d');
    habitChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
            datasets: [{
                data: [0,0,0,0,0,0,0],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.1)',
                pointRadius: 0
            }]
        },
        options: {
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(0,210,255,0.1)' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function toggleSAOMenu() {
    playSound('menu');
    document.getElementById('sao-menu').classList.toggle('active');
}

window.agregarEntrada = (tipo) => {
    playSound('click');
    const input = document.getElementById('new-item-name');
    const name = input.value.trim();
    const dif = document.getElementById('new-item-difficulty').value;

    if (!name) return;

    let finalName = name;
    if (tipo === 'ejercicio') {
        const base = dif === 'dificil' ? 30 : (dif === 'medio' ? 20 : 10);
        finalName = `${name} x${base + (currentLevel * 2)}`;
    }

    habitos.push(finalName);
    categorias[finalName] = tipo;
    dificultades[finalName] = dif;
    db[finalName] = Array(7).fill(false);

    save(); render();
    input.value = "";
};

function render() {
    const hb = document.getElementById('habits-body');
    const eb = document.getElementById('exercises-body');
    const diaActual = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    hb.innerHTML = ''; eb.innerHTML = '';

    habitos.forEach((item, idx) => {
        const isEx = categorias[item] === 'ejercicio';
        let row = `<tr><td>${item}</td>`;
        
        for (let i = 0; i < 7; i++) {
            const checked = db[item][i] ? 'checked' : '';
            const isToday = i === diaActual;
            const disabled = i !== diaActual ? 'disabled' : '';
            row += `<td class="${isToday ? 'today' : ''}"><input type="checkbox" onchange="toggle('${item}',${i})" ${checked} ${disabled}></td>`;
        }
        
        row += `<td><button onclick="eliminar(${idx})" style="background:none; border:none; color:red; cursor:pointer;">×</button></td></tr>`;
        isEx ? eb.innerHTML += row : hb.innerHTML += row;
    });
    actualizarSistemas();
}

function toggle(item, dia) {
    playSound('click');
    db[item][dia] = !db[item][dia];
    save(); render();
}

function actualizarSistemas() {
    let xpTotal = 0;
    let habitosCount = 0;
    let diaStats = Array(7).fill(0);

    habitos.forEach(h => {
        if (categorias[h] === 'ejercicio') {
            db[h].forEach(c => { if(c) xpTotal += (dificultades[h] === 'dificil' ? 10 : 5); });
        } else {
            habitosCount++;
            db[h].forEach((c, i) => { if(c) diaStats[i]++; });
        }
    });

    // Lógica de Nivel
    const oldLevel = currentLevel;
    currentLevel = Math.floor(xpTotal / 100) + 1;
    if(currentLevel > oldLevel) playSound('level');

    document.getElementById('user-level').innerText = currentLevel;
    document.getElementById('current-xp').innerText = xpTotal % 100;
    document.getElementById('xp-bar-fill').style.width = (xpTotal % 100) + "%";

    if (habitChart) {
        habitChart.data.datasets[0].data = diaStats.map(v => habitosCount > 0 ? (v/habitosCount)*100 : 0);
        habitChart.update();
    }
}

function eliminar(i) {
    playSound('click');
    delete db[habitos[i]];
    habitos.splice(i, 1);
    save(); render();
}

function save() {
    localStorage.setItem('habitos', JSON.stringify(habitos));
    localStorage.setItem('db', JSON.stringify(db));
    localStorage.setItem('categorias', JSON.stringify(categorias));
    localStorage.setItem('dificultades', JSON.stringify(dificultades));
}

function abrirPerfilModal() { playSound('menu'); document.getElementById('profile-modal').showModal(); }
function cerrarPerfilModal() { document.getElementById('profile-modal').close(); }

init();