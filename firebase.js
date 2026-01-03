import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// CONFIGURACIÓN FIREBASE (TUYA)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCvLEaBBi2hoZjnU-foJ7Vlxtazs28VdzU",
    authDomain: "habittracker-1fabe.firebaseapp.com",
    databaseURL: "https://habittracker-1fabe-default-rtdb.firebaseio.com",
    projectId: "habittracker-1fabe",
    storageBucket: "habittracker-1fabe.firebasestorage.app",
    messagingSenderId: "684673822722",
    appId: "1:684673822722:web:9ce1313c5a4f5b06e7771b",
    measurementId: "G-P24MX2R69X"
};

// ==========================================
// INIT
// ==========================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbFirebase = getDatabase(app);
const provider = new GoogleAuthProvider();

let usuarioActual = null;

// ==========================================
// LOGIN / LOGOUT
// ==========================================
document.getElementById("btn-login").onclick = () =>
    signInWithPopup(auth, provider);

window.cerrarSesion = () => signOut(auth);

// ==========================================
// AUTH OBSERVER
// ==========================================
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
                window.userStats = data.stats || { xp: 0, nivel: 1 };
            } else {
                window.listaHabitos = [];
                window.db = {};
                window.categorias = {};
                window.userStats = { xp: 0, nivel: 1 };
            }

            window.renderTable();
        });

    } else {
        usuarioActual = null;
        document.getElementById("login-screen").style.display = "block";
        document.getElementById("main-app").style.display = "none";
    }
});

// ==========================================
// GUARDAR EN FIREBASE
// ==========================================
window.guardarEnFirebase = function () {
    if (!usuarioActual) return;

    set(ref(dbFirebase, "usuarios/" + usuarioActual.uid), {
        lista: window.listaHabitos,
        checks: window.db,
        categorias: window.categorias,
        stats: window.userStats
    });
};
