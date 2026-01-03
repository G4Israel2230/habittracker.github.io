// Variables globales que se sincronizarán con Firebase
window.listaHabitos = [];
window.db = {};
let miGrafica;

// --- 1. INICIALIZAR GRÁFICA ---
function inicializarGrafica() {
    const ctx = document.getElementById('progresoChart').getContext('2d');
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#1e293b';

    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: '% Cumplimiento',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 100, ticks: { color: textColor } },
                x: { ticks: { color: textColor } }
            },
            plugins: {
                legend: { display: false }
            }
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
            // Verificamos si existe el registro, si no, es falso
            const isChecked = (window.db[habito] && window.db[habito][i]) ? 'checked' : '';
            row += `<td><input type="checkbox" onchange="toggleHabit('${habito}', ${i})" ${isChecked}></td>`;
        }
        row += `<td><button onclick="eliminarHabito(${index})" class="btn-del" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:1.2rem">×</button></td></tr>`;
        body.innerHTML += row;
    });
    actualizarLogica();
};

// --- 3. ACCIONES DE HÁBITOS ---
window.toggleHabit = function(habito, dia) {
    if (!window.db[habito]) {
        window.db[habito] = [false, false, false, false, false, false, false];
    }
    window.db[habito][dia] = !window.db[habito][dia];
    
    // Guardar en Firebase (función definida en el HTML)
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    actualizarLogica();
};

window.agregarHabito = function() {
    const input = document.getElementById('new-habit-name');
    const nombre = input.value.trim();
    
    if (!nombre) return;
    if (window.listaHabitos.includes(nombre)) {
        alert("Este hábito ya existe");
        return;
    }

    window.listaHabitos.push(nombre);
    window.db[nombre] = [false, false, false, false, false, false, false];
    input.value = "";
    
    if (typeof window.guardarEnFirebase === "function") {
        window.guardarEnFirebase();
    }
    window.renderTable();
};

window.eliminarHabito = function(index) {
    if (confirm("¿Eliminar este hábito definitivamente?")) {
        const habito = window.listaHabitos[index];
        delete window.db[habito];
        window.listaHabitos.splice(index, 1);
        
        if (typeof window.guardarEnFirebase === "function") {
            window.guardarEnFirebase();
        }
        window.renderTable();
    }
};

// --- 4. CÁLCULOS Y ESTADÍSTICAS ---
function actualizarLogica() {
    let totalesDia = [0, 0, 0, 0, 0, 0, 0];
    let completadosTotal = 0;

    window.listaHabitos.forEach(habito => {
        for (let i = 0; i < 7; i++) {
            if (window.db[habito] && window.db[habito][i]) {
                totalesDia[i]++;
                completadosTotal++;
            }
        }
    });

    // Porcentaje General
    const totalPosible = window.listaHabitos.length * 7;
    const porcentajeGral = totalPosible > 0 ? Math.round((completadosTotal / totalPosible) * 100) : 0;
    document.getElementById('progreso-total').innerText = porcentajeGral + "%";

    // Actualizar Gráfica
    if (miGrafica) {
        const datosGrafica = totalesDia.map(t => 
            window.listaHabitos.length > 0 ? Math.round((t / window.listaHabitos.length) * 100) : 0
        );
        miGrafica.data.datasets[0].data = datosGrafica;
        miGrafica.update();
    }
}

// --- 5. UTILIDADES (MODO OSCURO / IMAGEN) ---
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.innerText = isDark ? '☀️' : '🌙';
        
        // Actualizar colores de la gráfica
        const color = isDark ? '#f1f5f9' : '#1e293b';
        miGrafica.options.scales.x.ticks.color = color;
        miGrafica.options.scales.y.ticks.color = color;
        miGrafica.update();
    });
}

window.descargarProgreso = function() {
    const area = document.getElementById('main-app');
    html2canvas(area, {
        backgroundColor: getComputedStyle(document.body).getPropertyValue('--card'),
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `progreso-${new Date().toLocaleDateString()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
};

window.resetSemana = function() {
    if (confirm("¿Quieres limpiar todos los checks de esta semana?")) {
        window.listaHabitos.forEach(h => {
            window.db[h] = [false, false, false, false, false, false, false];
        });
        if (typeof window.guardarEnFirebase === "function") {
            window.guardarEnFirebase();
        }
        window.renderTable();
    }
};

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarGrafica();
    // El renderTable inicial lo disparará Firebase cuando detecte al usuario
});