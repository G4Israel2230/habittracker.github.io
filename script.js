// ===============================
// VARIABLES GLOBALES
// ===============================
window.listaHabitos = [];
window.db = {};
window.categorias = {};
window.userStats = { xp: 0, nivel: 1 };

const XP_POR_EJERCICIO = 20;

// ===============================
// AGREGAR HÁBITO / EJERCICIO
// ===============================
window.agregarEntrada = function (tipo) {
    const input = document.getElementById("new-item-name");
    const nombre = input.value.trim();

    if (!nombre) return;

    const id = Date.now().toString();

    listaHabitos.push({ id, nombre, tipo });
    categorias[id] = tipo;

    if (tipo === "ejercicio") {
        sumarXP(XP_POR_EJERCICIO);
    }

    input.value = "";
    guardarEnFirebase();
    renderTable();
};

// ===============================
// RENDER TABLA
// ===============================
window.renderTable = function () {
    const tbody = document.getElementById("habit-body");
    tbody.innerHTML = "";

    listaHabitos.forEach(h => {
        const tr = document.createElement("tr");

        const tdNombre = document.createElement("td");
        tdNombre.textContent = h.nombre;
        tr.appendChild(tdNombre);

        for (let d = 0; d < 7; d++) {
            const td = document.createElement("td");
            const chk = document.createElement("input");
            chk.type = "checkbox";

            const key = h.id + "_" + d;
            chk.checked = db[key] || false;

            chk.onchange = () => {
                db[key] = chk.checked;
                guardarEnFirebase();
            };

            td.appendChild(chk);
            tr.appendChild(td);
        }

        const tdDel = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "❌";
        btn.onclick = () => eliminarHabito(h.id);
        tdDel.appendChild(btn);
        tr.appendChild(tdDel);

        tbody.appendChild(tr);
    });

    actualizarUI();
};

// ===============================
// ELIMINAR
// ===============================
function eliminarHabito(id) {
    listaHabitos = listaHabitos.filter(h => h.id !== id);

    Object.keys(db).forEach(k => {
        if (k.startsWith(id)) delete db[k];
    });

    delete categorias[id];
    guardarEnFirebase();
    renderTable();
}

// ===============================
// XP Y NIVEL
// ===============================
function sumarXP(xp) {
    userStats.xp += xp;

    while (userStats.xp >= 100) {
        userStats.xp -= 100;
        userStats.nivel++;
        document.getElementById("level-up-sound").play();
    }

    guardarEnFirebase();
}

function actualizarUI() {
    document.getElementById("user-level").innerText = userStats.nivel;
    document.getElementById("current-xp").innerText = userStats.xp;
    document.getElementById("xp-bar-fill").style.width = userStats.xp + "%";
}

// ===============================
// REINICIAR SEMANA
// ===============================
window.resetSemana = function () {
    db = {};
    guardarEnFirebase();
    renderTable();
};

// ===============================
// GUARDAR IMAGEN (ARREGLADO)
// ===============================
window.descargarProgreso = function () {
    html2canvas(document.body, {
        scale: 1
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "progreso.png";
        link.href = canvas.toDataURL();
        link.click();
    });
};
