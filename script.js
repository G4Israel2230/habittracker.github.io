window.listaHabitos = [];
window.db = {};
window.categorias = {};
window.userStats = { xp: 0, nivel: 1 };

let miGrafica;
let ultimoNivel = 1;

const misionesBase = [
    { nombre: "Flexiones", base: 20 },
    { nombre: "Abdominales", base: 15 },
    { nombre: "Sentadillas", base: 25 },
    { nombre: "Correr (Km)", base: 2 }
];

function inicializarGrafica() {
    const ctx = document.getElementById("progresoChart")?.getContext("2d");
    if (!ctx) return;

    miGrafica = new Chart(ctx, {
        type: "line",
        data: {
            labels: ["L", "M", "X", "J", "V", "S", "D"],
            datasets: [{
                label: "% Disciplina",
                data: [0,0,0,0,0,0,0],
                borderColor: "#10b981",
                backgroundColor: "rgba(16,185,129,0.1)",
                fill: true
            }]
        },
        options: {
            scales: { y: { min: 0, max: 100 } },
            responsive: true
        }
    });
}

window.renderTable = function () {
    const body = document.getElementById("habit-body");
    let html = "";

    window.listaHabitos.forEach((h, i) => {
        const icon = categorias[h.id] === "ejercicio" ? "🏋️" : "📝";
        html += `<tr><td>${icon} ${h.nombre}</td>`;

        for (let d = 0; d < 7; d++) {
            html += `<td>
                <input type="checkbox" ${db[h.id][d] ? "checked" : ""}
                onchange="toggleHabit('${h.id}',${d})">
            </td>`;
        }

        html += `<td><button onclick="eliminarHabito(${i})">×</button></td></tr>`;
    });

    body.innerHTML = html;
    actualizarCalculos();
};

function actualizarCalculos() {
    const hoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    let xpHoy = 0;
    let actividadHoy = false;
    let totales = [0,0,0,0,0,0,0];

    const soloHabitos = listaHabitos.filter(h => categorias[h.id] === "habito");

    listaHabitos.forEach(h => {
        db[h.id].forEach((v, d) => {
            if (v && categorias[h.id] === "habito") totales[d]++;
            if (v && d === hoy) {
                actividadHoy = true;
                if (categorias[h.id] === "ejercicio") xpHoy += 20;
            }
        });
    });

    userStats.xp += xpHoy;
    userStats.nivel = Math.floor(userStats.xp / 100) + 1;

    document.getElementById("user-level").innerText = userStats.nivel;
    document.getElementById("current-xp").innerText = userStats.xp % 100;
    document.getElementById("xp-bar-fill").style.width = `${userStats.xp % 100}%`;

    if (userStats.nivel > ultimoNivel) {
        document.getElementById("level-up-sound").play();
        ultimoNivel = userStats.nivel;
    }

    if (miGrafica) {
        miGrafica.data.datasets[0].data =
            totales.map(v => soloHabitos.length ? Math.round(v / soloHabitos.length * 100) : 0);
        miGrafica.update();
    }

    document.getElementById("penalty-zone").style.display =
        (!actividadHoy && soloHabitos.length) ? "block" : "none";

    generarMisionesVisuales(userStats.nivel);
    guardarEnFirebase();
}

function generarMisionesVisuales(nivel) {
    const cont = document.getElementById("daily-missions-list");
    cont.innerHTML = "";

    misionesBase.forEach(m => {
        cont.innerHTML += `
            <div class="mission-item">
                ${m.nombre}: ${Math.floor(m.base * (1 + nivel * 0.1))}
            </div>`;
    });
}

window.agregarEntrada = function (tipo) {
    const nombre = document.getElementById("new-item-name").value.trim();
    if (!nombre) return;

    const id = crypto.randomUUID();
    listaHabitos.push({ id, nombre });
    categorias[id] = tipo;
    db[id] = [false,false,false,false,false,false,false];

    document.getElementById("new-item-name").value = "";
    renderTable();
};

window.toggleHabit = (id, d) => {
    db[id][d] = !db[id][d];
    actualizarCalculos();
};

window.eliminarHabito = i => {
    const id = listaHabitos[i].id;
    delete db[id];
    delete categorias[id];
    listaHabitos.splice(i, 1);
    renderTable();
};

window.resetSemana = () => {
    Object.keys(db).forEach(id => db[id] = [false,false,false,false,false,false,false]);
    renderTable();
};

window.descargarProgreso = () => {
    html2canvas(document.getElementById("main-app")).then(c => {
        const a = document.createElement("a");
        a.download = "progreso.png";
        a.href = c.toDataURL();
        a.click();
    });
};

inicializarGrafica();
