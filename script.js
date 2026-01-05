import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCvLEaBBi2hoZjnU-foJ7Vlxtazs28VdzU",
    authDomain: "habittracker-1fabe.firebaseapp.com",
    databaseURL: "https://habittracker-1fabe-default-rtdb.firebaseio.com",
    projectId: "habittracker-1fabe",
    storageBucket: "habittracker-1fabe.firebasestorage.app",
    messagingSenderId: "684673822722",
    appId: "1:684673822722:web:9ce1313c5a4f5b06e7771b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbFirebase = getDatabase(app);
const provider = new GoogleAuthProvider();

// --- ESTADO GLOBAL ---
let usuarioActual = null;
let habitChart = null;
let fechaReferencia = new Date(); // Controla la semana que ves

window.userStats = { xp: 0, nivel: 1, hp: 100, edad: "-", nacionalidad: "-", status: "ALIVE" };
window.listaHabitos = [];
window.db = {};
window.categorias = {};

// --- LOGIN & AUTH ---
document.getElementById("btn-login").onclick = () => signInWithPopup(auth, provider);
window.cerrarSesion = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioActual = user;
        document.getElementById("user-photo").src = user.photoURL;
        
        // Listener de Datos en Tiempo Real
        const userRef = ref(dbFirebase, "usuarios/" + user.uid);
        onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            
            if (data) {
                // Cargar datos
                window.listaHabitos = data.lista || [];
                window.db = data.checks || {};
                window.categorias = data.categorias || {};
                window.userStats = { ...window.userStats, ...data.stats };

                // Verificar si faltan datos de perfil
                if (!window.userStats.edad || window.userStats.edad === "-") {
                    mostrarRegistro();
                } else {
                    mostrarApp();
                }
            } else {
                // Nuevo usuario
                mostrarRegistro();
            }
        });
    } else {
        document.getElementById("login-screen").style.display = "flex";
        document.getElementById("main-app").style.display = "none";
    }
});

function mostrarRegistro() {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("btn-login").style.display = "none";
    document.getElementById("registration-form").style.display = "block";
}

function mostrarApp() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-app").style.display = "block";
    
    // UI Update
    document.getElementById("p-name").innerText = usuarioActual.displayName;
    document.getElementById("p-age").innerText = window.userStats.edad;
    document.getElementById("p-nat").innerText = window.userStats.nacionalidad;
    document.getElementById("p-status").innerText = window.userStats.hp > 0 ? "VIVO" : "CRÍTICO";
    document.getElementById("p-status").style.color = window.userStats.hp > 0 ? "#0f0" : "#f00";

    // Inicializar sistemas
    checkHPLogic();
    if (!habitChart) initChart();
    renderCalendar();
}

window.completarRegistro = () => {
    const age = document.getElementById("reg-age").value;
    const nat = document.getElementById("reg-nat").value;
    if (age && nat) {
        window.userStats.edad = age;
        window.userStats.nacionalidad = nat;
        window.guardarEnFirebase();
    }
};

// --- LÓGICA DE HP Y XP ---
function checkHPLogic() {
    // 1. Calcular daño por inactividad
    const hoy = new Date().setHours(0,0,0,0);
    const ultima = window.userStats.ultimaConexion || hoy;
    const diasAusente = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));

    if (diasAusente > 0) {
        // Daño: 5 HP por cada día que no entraste
        const dano = diasAusente * 5;
        window.userStats.hp = Math.max(0, window.userStats.hp - dano);
        if(dano > 0) alert(`⚠️ ALERTA DE SISTEMA ⚠️\nEstuviste ausente ${diasAusente} días.\nHas recibido ${dano} de daño.`);
    }

    // Actualizar fecha
    window.userStats.ultimaConexion = hoy;
    
    // UI HP
    const hpBar = document.getElementById("hp-bar-fill");
    hpBar.style.width = window.userStats.hp + "%";
    document.getElementById("user-hp").innerText = window.userStats.hp;
    
    if(window.userStats.hp <= 30) hpBar.classList.add("low-hp");
    else hpBar.classList.remove("low-hp");

    // UI XP
    document.getElementById("user-level").innerText = window.userStats.nivel;
    document.getElementById("xp-bar-fill").style.width = (window.userStats.xp % 100) + "%";

    window.guardarEnFirebase();
}

// --- CALENDARIO Y TABLAS ---
window.cambiarSemana = (dir) => {
    fechaReferencia.setDate(fechaReferencia.getDate() + (dir * 7));
    renderCalendar();
};

function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function renderCalendar() {
    const monday = getMonday(fechaReferencia);
    const diasSemana = [];
    
    // Generar días de la semana seleccionada
    for (let i = 0; i < 7; i++) {
        let d = new Date(monday);
        d.setDate(monday.getDate() + i);
        diasSemana.push(d);
    }

    // Actualizar Texto de Rango
    const fmt = { month: 'short', day: 'numeric' };
    document.getElementById("week-display").innerText = 
        `${diasSemana[0].toLocaleDateString('es-ES', fmt)} - ${diasSemana[6].toLocaleDateString('es-ES', fmt)}`;

    // Headers
    const daysNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    let headerHTML = `<tr><th>MISIÓN</th>`;
    
    const todayStr = new Date().toISOString().split('T')[0];

    diasSemana.forEach((d, i) => {
        const dStr = d.toISOString().split('T')[0];
        const isToday = dStr === todayStr;
        headerHTML += `<th class="${isToday ? 'today-col' : ''}">
            <span class="day-header">${daysNames[i]}</span>
            <span class="date-num">${d.getDate()}</span>
        </th>`;
    });
    headerHTML += `<th></th></tr>`;

    document.querySelector("#habits-table thead").innerHTML = headerHTML;
    document.querySelector("#exercises-table thead").innerHTML = headerHTML;

    // Body
    const hb = document.getElementById("habits-body");
    const eb = document.getElementById("exercises-body");
    hb.innerHTML = ""; eb.innerHTML = "";

    window.listaHabitos.forEach((nombre, idx) => {
        let row = `<tr><td>${nombre}</td>`;
        
        diasSemana.forEach(fecha => {
            const fStr = fecha.toISOString().split('T')[0];
            const isChecked = window.db[nombre] && window.db[nombre][fStr] ? "checked" : "";
            const isToday = fStr === todayStr;
            // Bloquear días futuros
            const isFuture = fecha > new Date();
            const disabled = isFuture ? "disabled" : "";

            row += `<td class="${isToday ? 'today-col' : ''}">
                <input type="checkbox" onchange="toggleCheck('${nombre}', '${fStr}')" ${isChecked} ${disabled}>
            </td>`;
        });

        row += `<td><button onclick="eliminarHabito(${idx})" style="color:red; background:none; border:none; cursor:pointer;">×</button></td></tr>`;

        if (window.categorias[nombre] === 'ejercicio') eb.innerHTML += row;
        else hb.innerHTML += row;
    });

    updateChart();
}

window.toggleCheck = (nombre, fecha) => {
    if (!window.db[nombre]) window.db[nombre] = {};
    const estadoAnterior = window.db[nombre][fecha];
    window.db[nombre][fecha] = !estadoAnterior;

    // Lógica XP / Daño Inmediato (Opcional)
    const esEjercicio = window.categorias[nombre] === 'ejercicio';
    if (window.db[nombre][fecha]) {
        // Marcado
        if (esEjercicio) window.userStats.xp += 10;
        // Recuperar un poco de vida si cumple
        if (window.userStats.hp < 100) window.userStats.hp = Math.min(100, window.userStats.hp + 2);
    } else {
        // Desmarcado
        if (esEjercicio) window.userStats.xp -= 10;
    }

    // Nivel Up
    window.userStats.nivel = Math.floor(window.userStats.xp / 100) + 1;
    
    window.guardarEnFirebase();
    checkHPLogic(); // Refrescar UI
};

window.agregarEntrada = (tipo) => {
    const input = document.getElementById("new-item-name");
    const nombre = input.value.trim();
    if (!nombre) return;

    window.listaHabitos.push(nombre);
    window.categorias[nombre] = tipo;
    input.value = "";
    window.guardarEnFirebase();
};

window.eliminarHabito = (idx) => {
    const nombre = window.listaHabitos[idx];
    if(confirm("¿Borrar " + nombre + "?")) {
        window.listaHabitos.splice(idx, 1);
        delete window.db[nombre];
        delete window.categorias[nombre];
        window.guardarEnFirebase();
    }
};

window.guardarEnFirebase = () => {
    if (!usuarioActual) return;
    set(ref(dbFirebase, "usuarios/" + usuarioActual.uid), {
        lista: window.listaHabitos,
        checks: window.db,
        categorias: window.categorias,
        stats: window.userStats
    });
    // Forzar re-render para ver cambios
    renderCalendar();
};

// --- GRÁFICA RADAR ---
function initChart() {
    const ctx = document.getElementById('habitChart').getContext('2d');
    habitChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Disciplina Semanal',
                data: [0,0,0,0,0,0,0],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.2)',
                borderWidth: 2
            }]
        },
        options: {
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChart() {
    if (!habitChart) return;
    
    // Calcular % de completado por día de la semana ACTUAL mostrada
    const monday = getMonday(fechaReferencia);
    const data = [];
    
    for(let i=0; i<7; i++) {
        let d = new Date(monday);
        d.setDate(monday.getDate() + i);
        let fStr = d.toISOString().split('T')[0];
        
        let total = 0, checks = 0;
        window.listaHabitos.forEach(h => {
            // Solo contamos hábitos, no ejercicios (opcional)
            if(window.categorias[h] !== 'ejercicio') {
                total++;
                if(window.db[h] && window.db[h][fStr]) checks++;
            }
        });
        
        data.push(total > 0 ? (checks/total)*100 : 0);
    }
    
    habitChart.data.datasets[0].data = data;
    habitChart.update();
}

// --- MENU TOGGLE ---
window.toggleSAO = () => {
    document.getElementById("sao-menu").classList.toggle("active");
};
window.toggleSub = (id) => {
    const el = document.getElementById("sub-" + id);
    el.classList.toggle("open");
};