let userData = JSON.parse(localStorage.getItem('userData')) || null;
let habitos = JSON.parse(localStorage.getItem('habitos')) || [];
let db = JSON.parse(localStorage.getItem('db')) || {};
let habitChart;

function init() {
    if (!userData) {
        document.getElementById('login-screen').style.display = 'flex';
    } else {
        iniciarSistema();
    }
}

function mostrarRegistro() {
    document.querySelector('.google-btn').style.display = 'none';
    document.getElementById('registration-form').style.display = 'block';
}

function registrarUsuario() {
    const name = document.getElementById('reg-name').value;
    const age = document.getElementById('reg-age').value;
    const nat = document.getElementById('reg-nat').value;

    if(!name || !age) return alert("Completa los campos");

    userData = { name, age, nat, level: 1, xp: 0 };
    localStorage.setItem('userData', JSON.stringify(userData));
    iniciarSistema();
}

function iniciarSistema() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Cargar datos en el perfil del menú
    document.getElementById('p-name').innerText = userData.name;
    document.getElementById('p-age').innerText = userData.age;
    document.getElementById('p-nat').innerText = userData.nat;
    
    document.getElementById('display-date').innerText = new Date().toLocaleDateString();
    
    setupChart();
    render();
}

// MENÚ SAO RESPONSIVE
function toggleSAO() {
    document.getElementById('sao-menu').classList.toggle('active');
}

function toggleSub(id) {
    const panels = document.querySelectorAll('.sao-sub-panel');
    panels.forEach(p => {
        if(p.id === `sub-${id}`) p.classList.toggle('open');
        else p.classList.remove('open');
    });
}

// GRÁFICA
function setupChart() {
    const ctx = document.getElementById('habitChart').getContext('2d');
    habitChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
            datasets: [{
                label: 'DISCIPLINA',
                data: [0,0,0,0,0,0,0],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.1)'
            }]
        },
        options: {
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } },
            plugins: { legend: { display: false } }
        }
    });
}

// CRUD MISIONES
window.agregarEntrada = (tipo) => {
    const nameInput = document.getElementById('new-item-name');
    const name = nameInput.value.trim();
    if (!name) return;

    let finalName = name;
    if(tipo === 'ejercicio') {
        const dif = document.getElementById('new-item-difficulty').value;
        const base = dif === 'dificil' ? 30 : 15;
        finalName = `${name} x${base + (userData.level * 2)}`;
    }

    habitos.push(finalName);
    db[finalName] = Array(7).fill(false);
    localStorage.setItem('habitos', JSON.stringify(habitos));
    localStorage.setItem('db', JSON.stringify(db));
    
    nameInput.value = "";
    render();
};

function render() {
    const hb = document.getElementById('habits-body');
    const eb = document.getElementById('exercises-body');
    hb.innerHTML = ''; eb.innerHTML = '';

    const hoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    habitos.forEach((item, idx) => {
        let row = `<tr><td>${item}</td>`;
        for(let i=0; i<7; i++) {
            const checked = db[item][i] ? 'checked' : '';
            const disabled = i !== hoy ? 'disabled' : '';
            row += `<td><input type="checkbox" onchange="toggle('${item}',${i})" ${checked} ${disabled}></td>`;
        }
        row += `<td><button onclick="eliminar(${idx})" style="background:none; border:none; color:red;">×</button></td></tr>`;
        
        // Si el nombre tiene "x" lo mandamos a ejercicios
        item.includes(' x') ? eb.innerHTML += row : hb.innerHTML += row;
    });
    actualizarStats();
}

function toggle(item, dia) {
    db[item][dia] = !db[item][dia];
    localStorage.setItem('db', JSON.stringify(db));
    render();
}

function actualizarStats() {
    let xp = 0;
    let diaCount = Array(7).fill(0);
    let habTotal = 0;

    habitos.forEach(h => {
        if(h.includes(' x')) {
            db[h].forEach(c => { if(c) xp += 10; });
        } else {
            habTotal++;
            db[h].forEach((c, i) => { if(c) diaCount[i]++; });
        }
    });

    // Radar
    if(habitChart) {
        habitChart.data.datasets[0].data = diaCount.map(v => habTotal > 0 ? (v/habTotal)*100 : 0);
        habitChart.update();
    }

    // Nivel
    userData.level = Math.floor(xp / 100) + 1;
    document.getElementById('user-level').innerText = userData.level;
    document.getElementById('xp-bar-fill').style.width = (xp % 100) + "%";
}

function eliminar(i) {
    delete db[habitos[i]];
    habitos.splice(i, 1);
    localStorage.setItem('habitos', JSON.stringify(habitos));
    localStorage.setItem('db', JSON.stringify(db));
    render();
}

function cerrarSesion() {
    localStorage.clear();
    location.reload();
}

init();