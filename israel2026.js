window.listaHabitos = [];
window.db = {};
let miGrafica;

// --- INICIALIZAR GRÁFICA ---
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

// --- RENDERIZAR TABLA ---
window.renderTable = function() {
    const body = document.getElementById('habit-body');
    body.innerHTML = '';
    window.listaHabitos.forEach((habito, index) => {
        let row = `<tr><td class="habit-name">${habito}</td>`;
        for (let i = 0; i < 7; i++) {
            const checked = window.db[habito] && window.db[habito][i] ? 'checked' : '';
            row += `<td><input type="checkbox" onchange="toggleHabit('${habito}', ${i})" ${checked}></td>`;
        }
        row += `<td><button onclick="eliminarHabito(${index})" style="color:red; background:none; border:none; cursor:pointer">×</button></td></tr>`;
        body.innerHTML += row;
    });
    actualizarCalculos();
};

function toggleHabit(habito, dia) {
    if (!window.db[habito]) window.db[habito] = Array(7).fill(false);
    window.db[habito][dia] = !window.db[habito][dia];
    window.guardarEnFirebase();
}

function agregarHabito() {
    const input = document.getElementById('new-habit-name');
    if (!input.value.trim()) return;
    window.listaHabitos.push(input.value);
    window.db[input.value] = Array(7).fill(false);
    input.value = "";
    window.guardarEnFirebase();
}

function eliminarHabito(index) {
    delete window.db[window.listaHabitos[index]];
    window.listaHabitos.splice(index, 1);
    window.guardarEnFirebase();
}

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
    document.getElementById('progreso-total').innerText = (totalPosible > 0 ? Math.round((completadosTotal/totalPosible)*100) : 0) + "%";
    
    const datosGrafica = totalesDia.map(t => window.listaHabitos.length > 0 ? Math.round((t/window.listaHabitos.length)*100) : 0);
    miGrafica.data.datasets[0].data = datosGrafica;
    miGrafica.update();
}

// --- FUNCIONES EXTRA ---
function descargarProgreso() {
    html2canvas(document.getElementById('main-app')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'mi-progreso.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}

function resetSemana() {
    if(confirm("¿Borrar progreso de la semana?")) {
        window.listaHabitos.forEach(h => window.db[h] = Array(7).fill(false));
        window.guardarEnFirebase();
    }
}

// Tema Oscuro
document.getElementById('theme-toggle').onclick = () => {
    document.body.classList.toggle('dark-mode');
};

inicializarGrafica();