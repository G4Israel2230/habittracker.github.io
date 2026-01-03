// Base de datos local
window.listaHabitos = JSON.parse(localStorage.getItem('habitos')) || [];
window.db = JSON.parse(localStorage.getItem('db')) || {};
window.categorias = JSON.parse(localStorage.getItem('categorias')) || {};
window.dificultades = JSON.parse(localStorage.getItem('dificultades')) || {};
window.historial = JSON.parse(localStorage.getItem('historialSemanas')) || [];

const XP_VAL = { facil: 3, medio: 6, dificil: 10 };

function init() {
    verificarSemana();
    renderTable();
    mostrarHistorial();
    document.getElementById('display-date').innerText = new Date().toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'short'});
}

function obtenerDia() {
    let d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
}

function verificarSemana() {
    const hoy = new Date();
    const numSemana = Math.ceil((((hoy - new Date(hoy.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
    const last = localStorage.getItem('ultimaSemana');

    if (last && last != numSemana) {
        archivarSemana(last);
        window.listaHabitos.forEach(h => window.db[h] = [false,false,false,false,false,false,false]);
        save();
    }
    localStorage.setItem('ultimaSemana', numSemana);
}

function archivarSemana(num) {
    let xp = 0;
    window.listaHabitos.forEach(h => {
        const d = window.dificultades[h] || 'medio';
        window.db[h].forEach(c => { if(c) xp += XP_VAL[d]; });
    });
    window.historial.unshift({ sem: num, xp: xp, fecha: new Date().toLocaleDateString() });
    if(window.historial.length > 5) window.historial.pop();
    localStorage.setItem('historialSemanas', JSON.stringify(window.historial));
}

window.renderTable = function() {
    const hb = document.getElementById('habits-body');
    const eb = document.getElementById('exercises-body');
    const diaActual = obtenerDia();
    hb.innerHTML = ''; eb.innerHTML = '';

    window.listaHabitos.forEach((item, idx) => {
        const isEx = window.categorias[item] === 'ejercicio';
        let display = item;
        if(isEx && item.includes(' x')) {
            const [n, r] = item.split(' x');
            display = `${n} <span class="reps-badge">${r} REPS</span>`;
        }

        let row = `<tr><td class="habit-name">${display}</td>`;
        for(let i=0; i<7; i++){
            const checked = window.db[item][i] ? 'checked' : '';
            let status = (i < diaActual) ? 'frozen' : (i > diaActual ? 'locked' : 'today-cell');
            let disabled = (i !== diaActual) ? 'disabled' : '';
            row += `<td class="${status}"><input type="checkbox" onchange="toggle('${item}',${i})" ${checked} ${disabled}></td>`;
        }
        row += `<td><button onclick="eliminar(${idx})" style="color:#444;background:none;border:none;">×</button></td></tr>`;
        isEx ? eb.innerHTML += row : hb.innerHTML += row;
    });
    calc();
};

window.toggle = (item, dia) => {
    window.db[item][dia] = !window.db[item][dia];
    save(); calc();
};

function calc() {
    let total = 0;
    window.listaHabitos.forEach(h => {
        window.db[h].forEach(c => { if(c) total += XP_VAL[window.dificultades[h] || 'medio']; });
    });
    const lvl = Math.floor(total / 100) + 1;
    document.getElementById('user-level').innerText = lvl;
    document.getElementById('current-xp').innerText = total;
    document.getElementById('xp-bar-fill').style.width = (total % 100) + "%";
    
    const r = ["E", "D", "C", "B", "A", "S"][Math.min(Math.floor(lvl/10), 5)];
    document.getElementById('user-rank').innerText = r;
    document.getElementById('user-rank-text').innerText = "RANGO " + r;
    
    const getR = (v) => ["E","D","C","B","A","S","SS"][Math.min(Math.floor((lvl+v)/5), 6)];
    document.getElementById('stat-str').innerText = getR(3);
    document.getElementById('stat-agi').innerText = getR(1);
    document.getElementById('stat-int').innerText = getR(0);
    document.getElementById('stat-vit').innerText = getR(2);
}

window.agregarEntrada = (tipo) => {
    const input = document.getElementById('new-item-name');
    const dif = document.getElementById('new-item-difficulty').value;
    const nivel = parseInt(document.getElementById('user-level').innerText);
    let nombre = input.value.trim();
    if(!nombre) return;

    if(tipo === 'ejercicio') {
        const base = dif === 'dificil' ? 25 : 10;
        nombre = `${nombre} x${base + (nivel * 2)}`;
    }

    window.listaHabitos.push(nombre);
    window.categorias[nombre] = tipo;
    window.dificultades[nombre] = dif;
    window.db[nombre] = [false,false,false,false,false,false,false];
    input.value = ""; save(); renderTable();
};

window.eliminar = (i) => {
    delete window.db[window.listaHabitos[i]];
    window.listaHabitos.splice(i, 1);
    save(); renderTable();
};

function save() {
    localStorage.setItem('habitos', JSON.stringify(window.listaHabitos));
    localStorage.setItem('db', JSON.stringify(window.db));
    localStorage.setItem('categorias', JSON.stringify(window.categorias));
    localStorage.setItem('dificultades', JSON.stringify(window.dificultades));
}

function mostrarHistorial() {
    const c = document.getElementById('weeks-history');
    if(window.historial.length) {
        c.innerHTML = window.historial.map(s => `
            <div class="history-item">
                <span>SEM ${s.sem}</span>
                <span class="hist-xp">+${s.xp} XP</span>
            </div>
        `).join('');
    }
}

function toggleMenu() { document.getElementById('user-dropdown').classList.toggle('show'); }
function abrirPerfilModal() { document.getElementById('profile-modal').showModal(); }
function cerrarPerfilModal() { document.getElementById('profile-modal').close(); }

init();