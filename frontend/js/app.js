// Lógica de la app: pantallas, llamadas al API Gateway y el ciclo de cada 1 segundo.

// Las 4 variables del panel (valor1..valor4 → X, Y, Z, W)
const VARIABLES = [
  { valor: 'valor1', letra: 'X', nombre: 'Stress' },
  { valor: 'valor2', letra: 'Y', nombre: 'Perdido' },
  { valor: 'valor3', letra: 'Z', nombre: 'Falta contexto' },
  { valor: 'valor4', letra: 'W', nombre: 'Devuelta' },
];

let salaId = null;
let ciclo = null; // el setInterval de cada 1 segundo

const $ = (selector) => document.querySelector(selector);

// ---------- Llamadas al API Gateway ----------
async function pedir(ruta, cuerpo) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(API_URL + ruta, { method: 'POST', headers, body: JSON.stringify(cuerpo) });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const e = new Error(datos.mensaje || 'Ocurrió un error');
    e.status = respuesta.status;
    throw e;
  }
  return datos;
}

// ---------- Pantallas ----------
function mostrar(vista) {
  document.querySelectorAll('.vista').forEach((v) => (v.hidden = true));
  $(`#vista-${vista}`).hidden = false;
  const usuario = localStorage.getItem('usuario');
  $('#barra-usuario').hidden = !usuario;
  $('#nombre-usuario').textContent = usuario || '';
}

document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.ir)));

function cerrarSesion() {
  clearInterval(ciclo);
  localStorage.clear();
  mostrar('login');
}
$('#btn-salir-sesion').addEventListener('click', cerrarSesion);

// ---------- Registro ----------
$('#form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  try {
    await pedir('/users', datos);
    e.target.reset();
    mostrar('login');
    $('#form-login [name=usuario]').value = datos.usuario;
  } catch (error) {
    e.target.querySelector('.error').textContent = error.message;
  }
});

// ---------- Login (Diagrama 1): POST /session → 201 {JWT} o 401 ----------
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const sesion = await pedir('/session', Object.fromEntries(new FormData(e.target)));
    localStorage.setItem('token', sesion.token);
    localStorage.setItem('usuario', sesion.usuario);
    e.target.reset();
    e.target.querySelector('.error').textContent = '';
    mostrar('sala');
  } catch (error) {
    e.target.querySelector('.error').textContent = error.message;
  }
});

// ---------- Entrar a una reunión ----------
$('#form-sala').addEventListener('submit', (e) => {
  e.preventDefault();
  salaId = new FormData(e.target).get('sala').trim().toUpperCase();
  abrirPanel();
});

function abrirPanel() {
  $('#sala-nombre').textContent = salaId;
  $('#participantes').textContent = '';
  $('#estado').textContent = '';

  // Todo arranca en 0 por defecto
  $('#sliders').innerHTML = VARIABLES.map((v) => `
    <div class="slider">
      <div class="slider-cabecera">
        <label for="${v.valor}">${v.nombre}</label>
        <span class="slider-valor" id="ver-${v.valor}">0</span>
      </div>
      <input type="range" id="${v.valor}" min="0" max="10" value="0" />
    </div>`).join('');

  $('#promedios').innerHTML = VARIABLES.map((v) => `
    <div class="promedio">
      <div class="promedio-cabecera"><span>${v.nombre}</span><strong id="prom-${v.letra}">–</strong></div>
      <div class="barra-fondo"><div class="barra-relleno" id="barra-${v.letra}"></div></div>
    </div>`).join('');

  // Mueve slider → actualiza Panel Entrada Anónima
  VARIABLES.forEach((v) => {
    $(`#${v.valor}`).addEventListener('input', (e) => ($(`#ver-${v.valor}`).textContent = e.target.value));
  });

  mostrar('panel');
  enviarValores();
  ciclo = setInterval(enviarValores, 1000); // loop: cada 1 segundo
}

// ---------- Medición (Diagrama 2): POST /status/{salaId}/valores ----------
async function enviarValores() {
  const valores = {};
  VARIABLES.forEach((v) => (valores[v.valor] = Number($(`#${v.valor}`).value)));

  try {
    const promedio = await pedir(`/status/${encodeURIComponent(salaId)}/valores`, valores);
    actualizarSalida(promedio);
    $('#estado').textContent = '';
  } catch (error) {
    if (error.status === 401) {
      cerrarSesion(); // JWT inválido o vencido
      $('#form-login .error').textContent = 'Tu sesión venció, volvé a iniciar sesión';
    } else {
      $('#estado').textContent = 'No se pudo actualizar, reintentando…'; // 500 u otro error
    }
  }
}

// Actualiza Panel Salida Promedio
function actualizarSalida(promedio) {
  const n = promedio.participantes;
  $('#participantes').textContent = `${n} participante${n === 1 ? '' : 's'}`;
  VARIABLES.forEach((v) => {
    const valor = promedio[v.letra];
    $(`#prom-${v.letra}`).textContent = valor.toFixed(1);
    const barra = $(`#barra-${v.letra}`);
    barra.style.width = `${valor * 10}%`;
    barra.style.background = valor < 4 ? 'var(--bajo)' : valor < 7 ? 'var(--medio)' : 'var(--alto)';
  });
}

// ---------- Salir de la reunión ----------
$('#btn-salir-sala').addEventListener('click', () => {
  clearInterval(ciclo); // deja de mandar datos: a los 10 s ya no cuenta en el promedio
  mostrar('sala');
});

// ---------- Al abrir la página ----------
mostrar(localStorage.getItem('token') ? 'sala' : 'login');
