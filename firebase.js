import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

let usuarioActual = null;
let habitChart = null;

// ELEMENTOS DOM
const habitsBody = document.getElementById("habits-body");
const exercisesBody = document.getElementById("exercises-body");

// GLOBALES DE LA APP
window.listaHabitos = [];
window.db = {};
window.categorias = {};
window.userStats = { xp: 0, nivel: 1, edad: "-", nacionalidad: "-" };

// LOGIN
document.getElementById("btn-login").onclick = () => signInWithPopup(auth, provider);
window.cerrarSesion = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioActual = user;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("main-app").style.display = "block";
        document.getElementById("user-name").innerText = user.displayName;
        document.getElementById("user-photo").src = user.photoURL;

        const userRef = ref(dbFirebase, "usuarios/" + user.uid);
        onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                window.listaHabitos = data.lista || [];
                window.db = data.checks || {};
                window.categorias = data.categorias || {};
                window.userStats = data.stats || { xp: 0, nivel: 1, edad: "-", nacionalidad: "-" };
                
                // Si no tiene edad, pedir registro
                if (!data.stats || !data.stats.edad || data.stats.edad === "-") {
                    document.getElementById("login-screen").style.display = "flex";
                    document.getElementById("registration-form").style.display = "block";
                    document.getElementById("btn-login").style.display = "none";
                }

                document.getElementById("disp-age").innerText = window.userStats.edad;
                document.getElementById("disp-nat").innerText = window.userStats.nacionalidad;
                
                renderEverything();
            } else {
                // Nuevo usuario: Mostrar formulario de registro SAO
                document.getElementById("login-screen").style.display = "flex";
                document.getElementById("registration-form").style.display = "block";
                document.getElementById("btn-login").style.display = "none";
            }
        });
        if(!habitChart) initChart();
    } else {
        document.getElementById("login-screen").style.display = "flex";
        document.getElementById("main-app").style.display = "none";
    }
});

// REGISTRO DE DATOS EXTRA
window.completarRegistro = () => {
    const age = document.getElementById("reg-age").value;
    const nat = document.getElementById("reg-nat").value;
    if(!age || !nat) return alert("Sincronización fallida: faltan datos");

    window.userStats.edad = age;
    window.userStats.nacionalidad = nat;
    window.guardarEnFirebase();
    document.getElementById("login-screen").style.display = "none";
};

// LÓGICA DE TABLAS
window.renderEverything = () => {
    habitsBody.innerHTML = "";
    exercisesBody.innerHTML = "";
    const hoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    window.listaHabitos.forEach((nombre, idx) => {
        let row = `<tr><td class="task-name">${nombre}</td>`;
        for (let i = 0; i < 7; i++) {
            const isChecked = window.db[nombre] && window.db[nombre][i] ? "checked" : "";
            const isDisabled = i !== hoy ? "disabled" : "";
            row += `<td><input type="checkbox" onchange="toggleTask('${nombre}', ${i})" ${isChecked} ${isDisabled}></td>`;
        }
        row += `<td><button onclick="eliminarTarea(${idx})" class="btn-del">×</button></td></tr>`;

        if (window.categorias[nombre] === 'ejercicio') exercisesBody.innerHTML += row;
        else habitsBody.innerHTML += row;
    });

    updateVisuals();
};

window.toggleTask = (nombre, dia) => {
    if (!window.db[nombre]) window.db[nombre] = Array(7).fill(false);
    window.db[nombre][dia] = !window.db[nombre][dia];
    
    // Calcular XP si es ejercicio
    if (window.categorias[nombre] === 'ejercicio' && window.db[nombre][dia]) {
        window.userStats.xp += 10; 
    } else if (window.categorias[nombre] === 'ejercicio' && !window.db[nombre][dia]) {
        window.userStats.xp -= 10;
    }
    
    window.guardarEnFirebase();
};

window.agregarEntrada = (tipo) => {
    const input = document.getElementById("new-item-name");
    const name = input.value.trim();
    if (!name) return;

    window.listaHabitos.push(name);
    window.categorias[name] = tipo;
    window.db[name] = Array(7).fill(false);
    input.value = "";
    window.guardarEnFirebase();
};

window.eliminarTarea = (idx) => {
    const nombre = window.listaHabitos[idx];
    delete window.db[nombre];
    delete window.categorias[nombre];
    window.listaHabitos.splice(idx, 1);
    window.guardarEnFirebase();
};

window.guardarEnFirebase = () => {
    if (!usuarioActual) return;
    set(ref(dbFirebase, "usuarios/" + usuarioActual.uid), {
        lista: window.listaHabitos,
        checks: window.db,
        categorias: window.categorias,
        stats: window.userStats
    });
};

// UI Y GRÁFICA
function updateVisuals() {
    // Nivel
    window.userStats.nivel = Math.floor(window.userStats.xp / 100) + 1;
    document.getElementById("user-level").innerText = window.userStats.nivel;
    document.getElementById("xp-bar-fill").style.width = (window.userStats.xp % 100) + "%";

    // Radar
    let habCount = 0;
    let diaStats = Array(7).fill(0);
    window.listaHabitos.forEach(h => {
        if(window.categorias[h] !== 'ejercicio') {
            habCount++;
            window.db[h]?.forEach((c, i) => { if(c) diaStats[i]++; });
        }
    });

    if(habitChart) {
        habitChart.data.datasets[0].data = diaStats.map(v => habCount > 0 ? (v/habCount)*100 : 0);
        habitChart.update();
    }
}

function initChart() {
    const ctx = document.getElementById('habitChart').getContext('2d');
    habitChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
            datasets: [{
                data: [0,0,0,0,0,0,0],
                borderColor: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.1)',
                borderWidth: 2
            }]
        },
        options: {
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } },
            plugins: { legend: { display: false } }
        }
    });
}

// MENÚ SAO TOGGLES
window.toggleSAO = () => document.getElementById("sao-menu").classList.toggle("active");
window.toggleSub = (id) => {
    const panels = document.querySelectorAll(".sao-sub-panel");
    panels.forEach(p => p.id === `sub-${id}` ? p.classList.toggle("open") : p.classList.remove("open"));
};