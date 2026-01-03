let userData = JSON.parse(localStorage.getItem('userData')) || null;
let habitos = JSON.parse(localStorage.getItem('habitos')) || [];
let db = JSON.parse(localStorage.getItem('db')) || {};
let categorias = JSON.parse(localStorage.getItem('categorias')) || {};
let dificultades = JSON.parse(localStorage.getItem('dificultades')) || {};

// SFX
const sfxMenu = document.getElementById('sfx-menu');

function init() {
    if (!userData) {
        document.getElementById('login-screen').style.display = 'flex';
    } else {
        iniciarApp();
    }
}

function registrarUsuario() {
    const name = document.getElementById('reg-name').value;
    const age = document.getElementById('reg-age').value;
    const weight = document.getElementById('reg-weight').value;

    if (!name || !age) return alert("Faltan datos críticos");

    userData = { name, age, weight, level: 1, xp: 0 };
    localStorage.setItem('userData', JSON.stringify(userData));
    iniciarApp();
}

function iniciarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('display-date').innerText = new Date().toLocaleDateString();
    render();
    setupChart();
}

// LÓGICA DEL MENÚ SAO
function toggleSAO() {
    sfxMenu.currentTime = 0; sfxMenu.play();
    document.getElementById('sao-menu').classList.toggle('active');
    // Por defecto mostrar perfil al abrir
    showSubMenu('profile');
}

function showSubMenu(type) {
    const subMenu = document.getElementById('sub-menu');
    const detailCard = document.getElementById('detail-card');
    
    if (type === 'profile') {
        subMenu.innerHTML = `
            <div class="sao-node active"><span>STATUS</span></div>
            <div class="sao-node"><span>EQUIPMENT</span></div>
        `;
        detailCard.innerHTML = `
            <h2>${userData.name.toUpperCase()}</h2>
            <div class="detail-row"><span>LEVEL</span> <b>${userData.level}</b></div>
            <div class="detail-row"><span>EDAD</span> <b>${userData.age}</b></div>
            <div class="detail-row"><span>PESO</span> <b>${userData.weight} kg</b></div>
            <div class="detail-row"><span>HP</span> <b>100 / 100</b></div>
        `;
    } else if (type === 'skills') {
        subMenu.innerHTML = `<div class="sao-node active"><span>ACTIVE SKILLS</span></div>`;
        detailCard.innerHTML = `
            <h2>HABILIDADES</h2>
            <p style="font-size:0.8rem">No hay habilidades desbloqueadas aún.</p>
        `;
    }
}

// LÓGICA DE HÁBITOS Y EJERCICIOS
window.agregarEntrada = (tipo) => {
    const nameInput = document.getElementById('new-item-name');
    const name = nameInput.value.trim();
    const dif = document.getElementById('new-item-difficulty').value;

    if (!name) return;

    let finalName = name;
    if (tipo === 'ejercicio') {
        const base = dif === 'dificil' ? 30 : 15;
        finalName = `${name} x${base + (userData.level * 2)}`;
    }

    habitos.push(finalName);
    categorias[finalName] = tipo;
    dificultades[finalName] = dif;
    db[finalName] = Array(7).fill(false);

    save(); render();
    nameInput.value = "";
}

function render() {
    const hb = document.getElementById('habits-body');
    const eb = document.getElementById('exercises-body');
    hb.innerHTML = ''; eb.innerHTML = '';

    const hoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    habitos.forEach((item, idx) => {
        let row = `<tr><td width="50%">${item}</td>`;
        for(let i=0; i<7; i++){
            const checked = db[item][i] ? 'checked' : '';
            const disabled = i !== hoy ? 'disabled' : '';
            row += `<td><input type="checkbox" onchange="toggle('${item}',${i})" ${checked} ${disabled}></td>`;
        }
        row += `<td><button onclick="eliminar(${idx})">×</button></td></tr>`;
        
        categorias[item] === 'ejercicio' ? eb.innerHTML += row : hb.innerHTML += row;
    });
    actualizarXP();
}

function toggle(item, dia) {
    db[item][dia] = !db[item][dia];
    save(); render();
}

function actualizarXP() {
    let totalXP = 0;
    habitos.forEach(h => {
        if(categorias[h] === 'ejercicio') {
            db[h].forEach(c => { if(c) totalXP += 10; });
        }
    });

    userData.xp = totalXP;
    userData.level = Math.floor(totalXP / 100) + 1;
    document.getElementById('user-level').innerText = userData.level;
    document.getElementById('current-xp').innerText = totalXP % 100;
    document.getElementById('xp-bar-fill').style.width = (totalXP % 100) + "%";
    
    localStorage.setItem('userData', JSON.stringify(userData));
}

function save() {
    localStorage.setItem('habitos', JSON.stringify(habitos));
    localStorage.setItem('db', JSON.stringify(db));
    localStorage.setItem('categorias', JSON.stringify(categorias));
    localStorage.setItem('dificultades', JSON.stringify(dificultades));
}

function eliminar(i) {
    habitos.splice(i, 1);
    save(); render();
}

function cerrarSesion() {
    localStorage.clear();
    location.reload();
}

init();