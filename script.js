import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- 1. TU CONFIGURACIÓN DE FIREBASE ---
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

// --- 2. VARIABLES GLOBALES ---
let usuarioActual = null;
let habitChart = null;
let fechaReferencia = new Date(); // Controla la semana visible en el calendario

// Inicializamos objetos vacíos para evitar errores antes de cargar Firebase
window.userStats = { xp: 0, nivel: 1, hp: 100, edad: "-", nacionalidad: "-", status: "ALIVE" };
window.listaHabitos = [];
window.db = {}; // Ahora será un objeto de fechas: { "Habito": { "2023-10-01": true } }
window.categorias = {};

// =========================================================
//  3. FUNCIONES GLOBALES (ACCESIBLES DESDE HTML)
// =========================================================

// Login y Logout
window.iniciarSesion = () => signInWithPopup(auth, provider);
window.cerrarSesion = () => signOut(auth).then(() => location.reload());

// Navegación del Calendario
window.cambiarSemana = (dir) => {
    fechaReferencia.setDate(fechaReferencia.getDate() + (dir * 7));
    renderCalendar();
};

// Añadir nueva misión
window.agregarEntrada = (tipo) => {
    const input = document.getElementById("new-item-name");
    const nombre = input.value.trim();
    
    if (!nombre) return alert("Escribe un nombre para la misión");
    if (!usuarioActual) return alert("Debes iniciar sesión primero");

    window.listaHabitos.push(nombre);
    window.categorias[nombre] = tipo;
    
    // Inicializamos el objeto en la DB local
    if(!window.db[nombre]) window.db[nombre] = {};

    input.value = "";
    guardarEnFirebase();
    console.log("Misión añadida:", nombre);
};

// Marcar/Desmarcar casilla (Lógica Principal)
window.toggleCheck = (nombre, fechaStr) => {
    if (!usuarioActual) return;

    if (!window.db[nombre]) window.db[nombre] = {};
    
    // Invertir valor
    const estadoAnterior = window.db[nombre][fechaStr] || false;
    window.db[nombre][fechaStr] = !estadoAnterior;

    // Lógica de XP y Vida Inmediata
    const esEjercicio = window.categorias[nombre] === 'ejercicio';
    
    if (window.db[nombre][fechaStr]) {
        // Al marcar
        if (esEjercicio) window.userStats.xp += 10;
        // Pequeña curación si la vida está baja
        if (window.userStats.hp < 100) window.userStats.hp = Math.min(100, window.userStats.hp + 1);
    } else {
        // Al desmarcar
        if (esEjercicio) window.userStats.xp = Math.max(0, window.userStats.xp - 10);
    }

    // Calcular Nivel (cada 100 XP sube nivel)
    window.userStats.nivel = Math.floor(window.userStats.xp / 100) + 1;

    guardarEnFirebase();
    updateUIStats(); // Actualizar barras de vida/xp
    renderCalendar(); // Refrescar tabla
};

window.eliminarHabito = (idx) => {
    if(!confirm("¿Borrar esta misión y su historial?")) return;
    const nombre = window.listaHabitos[idx];
    
    window.listaHabitos.splice(idx, 1);
    if(window.db[nombre]) delete window.db[nombre];
    if(window.categorias[nombre]) delete window.categorias[nombre];
    
    guardarEnFirebase();
};

// Registro de datos faltantes
window.completarRegistro = () => {
    const age = document.getElementById("reg-age").value;
    const nat = document.getElementById("reg-nat").value;
    if (age && nat) {
        window.userStats.edad = age;
        window.userStats.nacionalidad = nat;
        guardarEnFirebase();
        mostrarApp();
    }
};

// Menú SAO Desplegable
window.toggleSAO = () => document.getElementById("sao-menu").classList.toggle("active");
window.toggleSub = (id) => document.getElementById("sub-" + id).classList.toggle("open");


// =========================================================
//  4. LÓGICA DE FIREBASE Y ESTADOS
// =========================================================

function guardarEnFirebase() {
    if (!usuarioActual) return;
    set(ref(dbFirebase, "usuarios/" + usuarioActual.uid), {
        lista: window.listaHabitos,
        checks: window.db,
        categorias: window.categorias,
        stats: window.userStats
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioActual = user;
        console.log("Usuario conectado:", user.displayName);
        
        const img = document.getElementById("user-photo");
        if(img) img.src = user.photoURL;

        const userRef = ref(dbFirebase, "usuarios/" + user.uid);
        onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            
            if (data) {
                // Cargar datos
                window.listaHabitos = data.lista || [];
                window.db = data.checks || {};
                window.categorias = data.categorias || {};
                window.userStats = { ...window.userStats, ...data.stats };
                
                if (!window.userStats.edad || window.userStats.edad === "-") {
                    mostrarRegistro();
                } else {
                    mostrarApp();
                }
            } else {
                // Usuario nuevo
                mostrarRegistro();
            }
        });
    } else {
        document.getElementById("login-screen").style.display = "flex";
        document.getElementById("main-app").style.display = "none";
    }
});

// =========================================================
//  5. RENDERIZADO Y LÓGICA VISUAL (CALENDARIO & HP)
// =========================================================

function mostrarRegistro() {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("btn-login").style.display = "none";
    document.getElementById("registration-form").style.display = "block";
}

function mostrarApp() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-app").style.display = "block";
    
    // Info Perfil
    document.getElementById("p-name").innerText = usuarioActual.displayName;
    document.getElementById("p-age").innerText = window.userStats.edad;
    document.getElementById("p-nat").innerText = window.userStats.nacionalidad;

    checkSurvivalLogic(); // Verificar si perdió vida por inactividad
    if (!habitChart) initChart();
    renderCalendar();
}

// Lógica "Hardcore": Calcular daño por días ausentes
function checkSurvivalLogic() {
    const hoy = new Date().setHours(0,0,0,0);
    const ultima = window.userStats.ultimaConexion || hoy;
    
    // Diferencia en días
    const diasAusente = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));

    if (diasAusente > 0) {
        // Daño: 5 HP por cada día perdido
        const dano = diasAusente * 5;
        window.userStats.hp = Math.max(0, window.userStats.hp - dano);
        
        if(dano > 0) {
            alert(`⚠️ REPORTE DE SISTEMA ⚠️\nEstuviste ausente ${diasAusente} días.\nTu HP se redujo en -${dano}.`);
        }
    }

    window.userStats.ultimaConexion = hoy; // Actualizar última conexión a hoy
    guardarEnFirebase();
    updateUIStats();
}

function updateUIStats() {
    // Barra de Vida
    const hpBar = document.getElementById("hp-bar-fill");
    if(hpBar) {
        hpBar.style.width = window.userStats.hp + "%";
        if(window.userStats.hp <= 30) hpBar.classList.add("low-hp");
        else hpBar.classList.remove("low-hp");
    }
    const hpText = document.getElementById("user-hp");
    if(hpText) hpText.innerText = Math.floor(window.userStats.hp);

    // Barra de XP y Nivel
    const xpBar = document.getElementById("xp-bar-fill");
    if(xpBar) xpBar.style.width = (window.userStats.xp % 100) + "%";
    
    const lvlText = document.getElementById("user-level");
    if(lvlText) lvlText.innerText = window.userStats.nivel;
}

// Función auxiliar para obtener el Lunes de la semana visible
function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// EL CORAZÓN DEL CALENDARIO
function renderCalendar() {
    const monday = getMonday(fechaReferencia);
    const diasSemana = [];
    
    // Generar los 7 objetos Date de la semana actual
    for (let i = 0; i < 7; i++) {
        let d = new Date(monday);
        d.setDate(monday.getDate() + i);
        diasSemana.push(d);
    }

    // Actualizar texto del rango de fechas
    const fmt = { month: 'short', day: 'numeric' };
    const display = document.getElementById("week-display");
    if(display) display.innerText = `${diasSemana[0].toLocaleDateString('es-ES', fmt)} - ${diasSemana[6].toLocaleDateString('es-ES', fmt)}`;

    // Generar Encabezados de Tabla (Lun 4, Mar 5...)
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

    // Inyectar Headers
    const hHead = document.querySelector("#habits-table thead");
    const eHead = document.querySelector("#exercises-table thead");
    if(hHead) hHead.innerHTML = headerHTML;
    if(eHead) eHead.innerHTML = headerHTML;

    // Generar Cuerpos de Tabla (Checkboxes)
    const hb = document.getElementById("habits-body");
    const eb = document.getElementById("exercises-body");
    if(hb) hb.innerHTML = ""; 
    if(eb) eb.innerHTML = "";

    window.listaHabitos.forEach((nombre, idx) => {
        let row = `<tr><td class="task-name">${nombre}</td>`;
        
        diasSemana.forEach(fecha => {
            const fStr = fecha.toISOString().split('T')[0];
            
            // Verificar si está marcado en la DB
            const isChecked = (window.db[nombre] && window.db[nombre][fStr]) ? "checked" : "";
            const isToday = fStr === todayStr;
            const isFuture = fecha > new Date(); // Bloquear futuro
            
            // Creamos el checkbox con la función toggleCheck(nombre, '2023-10-05')
            row += `<td class="${isToday ? 'today-col' : ''}">
                <input type="checkbox" onchange="toggleCheck('${nombre}', '${fStr}')" ${isChecked} ${isFuture ? 'disabled' : ''}>
            </td>`;
        });

        row += `<td><button onclick="eliminarHabito(${idx})" class="btn-del">×</button></td></tr>`;

        if (window.categorias[nombre] === 'ejercicio') {
            if(eb) eb.innerHTML += row;
        } else {
            if(hb) hb.innerHTML += row;
        }
    });

    updateChart(diasSemana);
}

// --- GRÁFICA RADAR ---
function initChart() {
    const canvas = document.getElementById('habitChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    habitChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Disciplina',
                data: [0,0,0,0,0,0,0],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.2)',
                borderWidth: 2
            }]
        },
        options: {
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: 'white' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChart(diasSemana) {
    if (!habitChart) return;
    
    const data = [];
    diasSemana.forEach(fecha => {
        let fStr = fecha.toISOString().split('T')[0];
        let total = 0, checks = 0;
        
        window.listaHabitos.forEach(h => {
            // Solo contamos hábitos para la gráfica de consistencia
            if(window.categorias[h] !== 'ejercicio') { 
                total++;
                if(window.db[h] && window.db[h][fStr]) checks++;
            }
        });
        
        data.push(total > 0 ? (checks/total)*100 : 0);
    });
    
    habitChart.data.datasets[0].data = data;
    habitChart.update();
}