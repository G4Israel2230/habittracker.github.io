// Variables globales
window.listaHabitos = [];
window.db = {};
let miGrafica;

// --- 1. INICIALIZAR GRÁFICA ---
function inicializarGrafica() {
    const ctx = document.getElementById('progresoChart').getContext('2d');
    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: '% Cumplimiento',
                data: [0,0,0,0,0,0,0],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true, tension: 0.4
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            scales: { y: { min: 0, max: 100 } }
        }
    });
}

// --- 2. RENDERIZAR TABLA ---
window.renderTable = function() {
    const body = document.getElementById('habit-body');
    if (!body) return;
    body.innerHTML = '';
    
    window.listaHabitos.forEach((habito, index) => {
        let row = `<tr><td class="habit-name">${habito}</td>`;
        for (let i = 0; i < 7; i++) {
            const checked = window.db[habito] && window.db[habito][i] ? 'checked' : '';
            row += `<td><input type="checkbox" onchange="toggleHabit('${habito}', ${i})" ${checked}></td>`;
        }
        row += `<td><button onclick="eliminarHabito(${index})" style="color:red; background:none; border:none; cursor:pointer; font-size:20px;">×</button></td></tr>`;
        body.innerHTML += row;
    });
    actualizarCalculos();
};

// --- 3. FUNCIONES DE INTERACCIÓN ---
window.agregarHabito = function() {
    const input = document.getElementById('new-habit-name');
    if (!input || !input.value.trim()) return;

    const nuevoHabito = input.value.trim();
    
    if (!window.listaHabitos) window.listaHabitos = [];
    window.listaHabitos.push(nuevoHabito);
    
    if (!window.db) window.db = {};
    window.db[nuevoHabito] = [false, false, false, false, false, false, false];

    input.value = "";

    // Sincronizar con Firebase
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    window.renderTable();
};

window.toggleHabit = function(habito, dia) {
    if (!window.db[habito]) window.db[habito] = Array(7).fill(false);
    window.db[habito][dia] = !window.db[habito][dia];
    
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    actualizarCalculos();
};

window.eliminarHabito = function(index) {
    const habito = window.listaHabitos[index];
    delete window.db[habito];
    window.listaHabitos.splice(index, 1);
    
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    window.renderTable();
};

// --- 4. LÓGICA DE PROGRESO ---
function actualizarCalculos() {
    let totalesDia = [0,0,0,0,0,0,0];
    let completadosTotal = 0;
    
    window.listaHabitos.forEach(habito => {
        for (let i = 0; i < 7; i++) {
            if (window.db[habito] && window.db[habito][i]) {
                totalesDia[i]++;
                completadosTotal++;
            }
        }
    });

    const totalPosible = window.listaHabitos.length * 7;
    const porcentajeFinal = totalPosible > 0 ? Math.round((completadosTotal/totalPosible)*100) : 0;
    
    const elementProgreso = document.getElementById('progreso-total');
    if (elementProgreso) elementProgreso.innerText = porcentajeFinal + "%";
    
    const datosGrafica = totalesDia.map(t => window.listaHabitos.length > 0 ? Math.round((t/window.listaHabitos.length)*100) : 0);
    
    if (miGrafica) {
        miGrafica.data.datasets[0].data = datosGrafica;
        miGrafica.update();
    }
}

// --- 5. EXTRAS ---
window.descargarProgreso = function() {
    html2canvas(document.getElementById('main-app')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mi-progreso-semanal.png';
        link.href = canvas.toDataURL();
        link.click();
    });
};

window.resetSemana = function() {
    if(confirm("¿Quieres reiniciar el progreso de esta semana?")) {
        window.listaHabitos.forEach(h => window.db[h] = Array(7).fill(false));
        if (typeof window.guardarEnFirebase === "function") {
            window.guardarEnFirebase();
        }
        window.renderTable();
    }
};

// --- 6. MODO OSCURO (Ponlo aquí, al final de todo) ---
const btnTheme = document.getElementById('theme-toggle');
if (btnTheme) {
    btnTheme.onclick = () => {
        document.body.classList.toggle('dark-mode');
        
        // Cambiar el icono del botón
        if (document.body.classList.contains('dark-mode')) {
            btnTheme.innerText = "☀️";
        } else {
            btnTheme.innerText = "🌙";
        }
    };
}

// Inicialización
inicializarGrafica();