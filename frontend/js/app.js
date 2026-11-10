// Lógica de la app: pantallas y llamadas manuales al API Gateway.
//
// Interacción con el backend (todo pasa por el API Gateway):
//   POST   /users                     → registro
//   POST   /session                   → login (devuelve el JWT)
//   POST   /salas                     → crear una reunión (devuelve un código único)
//   GET    /salas/{codigo}            → validar que la reunión exista antes de entrar
//   POST   /status/{salaId}/valores   → botón "Actualizar" (guarda los valores y devuelve el promedio)
//   GET    /status/{salaId}/promedio  → al entrar a la reunión
//   GET    /status/{salaId}/historial → al entrar y con "Actualizar" (datos del gráfico de evolución)
//   DELETE /status/{salaId}/valores   → al salir de la reunión (deja de contar en el promedio)

// Las 4 variables del panel (valor1..valor4 → X, Y, Z, W)
const VARIABLES = [
  { valor: 'valor1', letra: 'X', nombre: 'Stress' },
  { valor: 'valor2', letra: 'Y', nombre: 'Perdido' },
  { valor: 'valor3', letra: 'Z', nombre: 'Falta contexto' },
  { valor: 'valor4', letra: 'W', nombre: 'Devuelta' },
];

let salaId = null; // código de la reunión
let salaNombre = ''; // nombre de la reunión
let salaCreada = null; // última reunión creada por el usuario
let panelActivo = false; // true mientras el usuario está dentro de una reunión
let ocupado = false; // evita pedidos superpuestos

const $ = (selector) => document.querySelector(selector);

// ---------- Mensajes según el código de error HTTP ----------
// Se usan cuando el servidor no manda un mensaje propio (por ejemplo, si responde Render y no nuestra API)
const MENSAJES_ERROR = {
  0: 'No se pudo conectar con el servidor. Revisá tu conexión.',
  400: 'Los datos enviados no son válidos.',
  401: 'Usuario o contraseña incorrectos, o tu sesión venció.',
  403: 'No tenés permiso para hacer esto.',
  404: 'No se encontró lo que pediste. Revisá el código.',
  409: 'Ese usuario ya existe.',
  429: 'Demasiados pedidos seguidos. Esperá unos segundos.',
  500: 'Error interno del servidor.',
  502: 'El servicio no responde, probá en unos segundos.',
  503: 'El servicio se está iniciando. Esperá un minuto.',
  504: 'El servidor tardó demasiado en responder.',
};

// ---------- Llamadas al API Gateway ----------
async function pedir(metodo, ruta, cuerpo) {
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo) headers['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, {
      method: metodo,
      headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(70000), // Render gratis puede tardar ~1 min en despertar
    });
  } catch (error) {
    // No hubo respuesta: sin internet, servidor caído o demoró demasiado
    const e = new Error(error.name === 'TimeoutError' ? MENSAJES_ERROR[504] : MENSAJES_ERROR[0]);
    e.status = error.name === 'TimeoutError' ? 504 : 0;
    throw e;
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const e = new Error(datos.mensaje || MENSAJES_ERROR[respuesta.status] || `Error inesperado (código ${respuesta.status})`);
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

function detenerPanel() {
  panelActivo = false;
}

// Avisa al backend que el usuario salió de la sala (si falla, igual deja de contar a los 45 s)
function salirDeLaSala() {
  if (!panelActivo || !salaId) return;
  const sala = salaId;
  detenerPanel();
  pedir('DELETE', `/status/${encodeURIComponent(sala)}/valores`).catch(() => {});
}

function cerrarSesion() {
  salirDeLaSala();
  detenerPanel();
  localStorage.clear();
  salaCreada = null;
  $('#sala-creada').hidden = true;
  mostrar('login');
}
$('#btn-salir-sesion').addEventListener('click', cerrarSesion);

// ---------- Registro: POST /users ----------
$('#form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type=submit]');
  const datos = Object.fromEntries(new FormData(e.target));
  boton.disabled = true;
  try {
    await pedir('POST', '/users', datos);
    e.target.reset();
    e.target.querySelector('.error').textContent = '';
    mostrar('login');
    $('#form-login [name=usuario]').value = datos.usuario;
  } catch (error) {
    e.target.querySelector('.error').textContent = error.message;
  } finally {
    boton.disabled = false;
  }
});

// ---------- Login (Diagrama 1): POST /session → 201 {JWT} o 401 ----------
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type=submit]');
  boton.disabled = true;
  e.target.querySelector('.error').textContent = '';
  try {
    const sesion = await pedir('POST', '/session', Object.fromEntries(new FormData(e.target)));
    localStorage.setItem('token', sesion.token);
    localStorage.setItem('usuario', sesion.usuario);
    e.target.reset();
    mostrar('sala');
  } catch (error) {
    e.target.querySelector('.error').textContent = error.message;
  } finally {
    boton.disabled = false;
  }
});

// ---------- Copiar un código al portapapeles ----------
async function copiar(texto, boton) {
  const original = boton.textContent;
  try {
    await navigator.clipboard.writeText(texto);
    boton.textContent = 'Código copiado';
  } catch {
    boton.textContent = 'No se pudo copiar';
  }
  setTimeout(() => (boton.textContent = original), 2000);
}

// ---------- Entrar a una reunión: GET /salas/{codigo} → 200 o 404 ----------
$('#form-sala').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type=submit]');
  const error = e.target.querySelector('.error');
  const codigo = new FormData(e.target).get('sala').trim().toUpperCase();
  boton.disabled = true;
  error.textContent = '';
  try {
    const sala = await pedir('GET', `/salas/${encodeURIComponent(codigo)}`);
    e.target.reset();
    abrirPanel(sala);
  } catch (err) {
    if (err.status === 401) return cerrarSesionVencida();
    error.textContent = err.message;
  } finally {
    boton.disabled = false;
  }
});

// ---------- Crear una reunión: POST /salas → 201 {codigo, nombre} ----------
$('#form-crear-sala').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type=submit]');
  const error = e.target.querySelector('.error');
  boton.disabled = true;
  error.textContent = '';
  try {
    salaCreada = await pedir('POST', '/salas', { nombre: new FormData(e.target).get('nombre') });
    e.target.reset();
    $('#creada-nombre').textContent = salaCreada.nombre;
    $('#creada-codigo').textContent = salaCreada.codigo;
    $('#sala-creada').hidden = false;
  } catch (err) {
    if (err.status === 401) return cerrarSesionVencida();
    error.textContent = err.message;
  } finally {
    boton.disabled = false;
  }
});
$('#btn-copiar-creada').addEventListener('click', (e) => copiar(salaCreada.codigo, e.target));
$('#btn-entrar-creada').addEventListener('click', () => abrirPanel(salaCreada));
$('#btn-copiar-codigo').addEventListener('click', (e) => copiar(salaId, e.target));

function cerrarSesionVencida() {
  cerrarSesion();
  $('#form-login .error').textContent = 'Tu sesión venció, volvé a iniciar sesión.';
}

function abrirPanel(sala) {
  detenerPanel(); // por si quedó un panel anterior activo
  salaId = sala.codigo;
  salaNombre = sala.nombre;
  $('#sala-titulo').textContent = salaNombre;
  $('#sala-nombre').textContent = salaId;
  $('#participantes').textContent = '';
  $('#estado').textContent = '';
  $('#ultima-actualizacion').textContent = '';

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
    <div class="promedio" id="fila-${v.letra}">
      <div class="promedio-cabecera"><span>${v.nombre}</span><strong id="prom-${v.letra}">–</strong></div>
      <div class="barra-fondo"><div class="barra-relleno" id="barra-${v.letra}"></div></div>
    </div>`).join('');

  VARIABLES.forEach((v) => {
    const slider = $(`#${v.valor}`);
    // Mientras se mueve: solo actualiza el número y el relleno en pantalla (no llama al backend)
    slider.addEventListener('input', (e) => {
      $(`#ver-${v.valor}`).textContent = e.target.value;
      e.target.style.setProperty('--pct', `${e.target.value * 10}%`);
    });
  });

  mostrar('panel');
  panelActivo = true;
  Grafico.vaciar();
  // Al entrar se muestran los datos existentes; los valores propios se envían al tocar Actualizar.
  pedidoDelPanel(async () => {
    const [promedio, historial] = await Promise.all([
      pedir('GET', rutaSala('promedio')),
      pedir('GET', rutaSala('historial')),
    ]);
    return { promedio, historial };
  });
}

// Ejecuta un pedido del panel sin superponerlo con otro.
async function pedidoDelPanel(hacerPedido) {
  if (!panelActivo) return;
  if (ocupado) return;
  ocupado = true;
  $('#btn-actualizar').disabled = true;
  $('#btn-actualizar').textContent = 'Actualizando…';

  try {
    const { promedio, historial } = await hacerPedido();
    actualizarSalida(promedio);
    Grafico.cargar(historial.puntos);
    $('#estado').textContent = '';
    $('#ultima-actualizacion').textContent = `Actualizado a las ${new Date().toLocaleTimeString('es-AR')}`;
  } catch (error) {
    if (error.status === 401) {
      // JWT inválido o vencido
      cerrarSesionVencida();
      return;
    }
    $('#estado').textContent = error.message;
  } finally {
    ocupado = false;
    $('#btn-actualizar').disabled = false;
    $('#btn-actualizar').textContent = 'Actualizar';
  }
}

// ---------- Medición (Diagrama 2): POST /status/{salaId}/valores ----------
const rutaSala = (final) => `/status/${encodeURIComponent(salaId)}/${final}`;

function valoresActuales() {
  const valores = {};
  VARIABLES.forEach((v) => (valores[v.valor] = Number($(`#${v.valor}`).value)));
  return valores;
}

// ---------- Botón Actualizar: envía los valores y refresca promedio e historial ----------
function actualizarManualmente() {
  return pedidoDelPanel(async () => {
    const promedio = await pedir('POST', rutaSala('valores'), valoresActuales());
    const historial = await pedir('GET', rutaSala('historial'));
    return { promedio, historial };
  });
}
$('#btn-actualizar').addEventListener('click', actualizarManualmente);

// Actualiza Panel Salida Promedio
function actualizarSalida(promedio) {
  const n = promedio.participantes || 0;
  $('#participantes').textContent = `${n} participante${n === 1 ? '' : 's'} conectado${n === 1 ? '' : 's'}`;
  VARIABLES.forEach((v) => {
    const valor = Number(promedio[v.letra]) || 0;
    $(`#prom-${v.letra}`).textContent = n ? valor.toFixed(1) : '–';
    const barra = $(`#barra-${v.letra}`);
    barra.style.width = n ? `${valor * 10}%` : '0';
    const nivel = valor < 4 ? 'bajo' : valor < 7 ? 'medio' : 'alto';
    barra.style.background = `var(--${nivel})`;
    // Muestra la etiqueta Bajo / Medio / Alto al lado del número
    if (n) $(`#fila-${v.letra}`).dataset.nivel = nivel;
    else delete $(`#fila-${v.letra}`).dataset.nivel;
  });
}

// ---------- Salir de la reunión: DELETE /status/{salaId}/valores ----------
$('#btn-salir-sala').addEventListener('click', () => {
  salirDeLaSala();
  mostrar('sala');
});

// Si se cierra la pestaña, deja de considerarse activa al vencer el plazo del backend.
window.addEventListener('pagehide', detenerPanel);

// ---------- Al abrir la página ----------
mostrar(localStorage.getItem('token') ? 'sala' : 'login');
