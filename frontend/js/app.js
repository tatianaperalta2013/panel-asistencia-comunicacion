// Lógica de la app: muestra cada pantalla y conecta los botones con la API.
const { Sesion, ErrorApi } = window.Api;

// Las 4 variables (X, Y, Z, W) con su explicación
const VARIABLES = [
  { clave: 'estres', nombre: 'Estrés', ayuda: 'Qué tan nervioso o tenso estoy' },
  { clave: 'perdido', nombre: 'Perdido', ayuda: 'Qué tan perdido estoy con el tema' },
  { clave: 'faltaContexto', nombre: 'Falta contexto', ayuda: 'Me falta información previa para entender' },
  { clave: 'devolucion', nombre: 'Devolución', ayuda: 'Necesito que se repita o se aclare algo' },
];

// Estado de la pantalla actual
const estado = {
  sala: null, // { codigo, nombre, link, esAnfitrion }
  intervaloPromedio: null,
  esperaSlider: null,
};

const $ = (selector) => document.querySelector(selector);

// ---------- Utilidades ----------
function mostrarVista(nombre) {
  document.querySelectorAll('.vista').forEach((v) => (v.hidden = true));
  $(`#vista-${nombre}`).hidden = false;

  const logueado = Boolean(Sesion.token());
  $('#barra-usuario').hidden = !logueado;
  $('#nombre-usuario').textContent = logueado ? Sesion.usuario() : '';
}

let temporizadorAviso;
function avisar(mensaje) {
  const aviso = $('#aviso');
  aviso.textContent = mensaje;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (aviso.hidden = true), 3500);
}

function mostrarError(form, mensaje) {
  form.querySelector('.error').textContent = mensaje || '';
}

// Ejecuta una acción de formulario desactivando el botón mientras espera
async function conBoton(form, accion) {
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  mostrarError(form, '');
  try {
    await accion();
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401 && Sesion.token()) {
      return sesionVencida();
    }
    mostrarError(form, error.message);
  } finally {
    boton.disabled = false;
  }
}

function sesionVencida() {
  detenerPanel();
  Sesion.cerrar();
  mostrarVista('login');
  avisar('Tu sesión venció, volvé a iniciar sesión');
}

// Toma el código de un link (…?sala=ABC123) o de un código suelto
function extraerCodigo(texto) {
  const limpio = String(texto || '').trim();
  try {
    const url = new URL(limpio);
    const sala = url.searchParams.get('sala');
    if (sala) return sala.toUpperCase();
  } catch (_) {
    /* no era un link */
  }
  return limpio.toUpperCase();
}

// ---------- HU1: Registro ----------
$('#form-registro').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const datos = Object.fromEntries(new FormData(form));

  if (!datos.usuario || !datos.email || !datos.password) {
    return mostrarError(form, 'Completá todos los campos');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
    return mostrarError(form, 'El email no es válido');
  }
  if (datos.password.length < 8) {
    return mostrarError(form, 'La contraseña debe tener al menos 8 caracteres');
  }
  if (datos.password !== datos.password2) {
    return mostrarError(form, 'Las contraseñas no coinciden');
  }

  conBoton(form, async () => {
    await window.Api.registrar(datos.usuario.trim(), datos.email.trim(), datos.password);
    form.reset();
    mostrarVista('login');
    $('#form-login [name="usuario"]').value = datos.usuario.trim();
    avisar('Cuenta creada. Ya podés iniciar sesión.');
  });
});

// ---------- HU2: Login ----------
$('#form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const { usuario, password } = Object.fromEntries(new FormData(form));
  if (!usuario || !password) return mostrarError(form, 'Completá usuario y contraseña');

  conBoton(form, async () => {
    const sesion = await window.Api.login(usuario.trim(), password);
    Sesion.guardar(sesion.token, sesion.usuario);
    form.reset();
    await irAlInicio();
  });
});

// Después del login: si entró con un link de sala, se une directo
async function irAlInicio() {
  const codigoEnLink = new URLSearchParams(window.location.search).get('sala');
  if (codigoEnLink) {
    history.replaceState(null, '', window.location.pathname);
    try {
      const sala = await window.Api.unirse(codigoEnLink);
      return abrirPanel(sala);
    } catch (error) {
      if (error.status === 401) return sesionVencida();
      mostrarVista('home');
      return avisar(error.message);
    }
  }
  mostrarVista('home');
}

// ---------- HU3: Crear reunión ----------
$('#form-crear').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const { nombre } = Object.fromEntries(new FormData(form));
  conBoton(form, async () => {
    const sala = await window.Api.crearSala(nombre);
    form.reset();
    abrirPanel(sala);
    avisar('Reunión creada. Compartí el link en el Meet.');
  });
});

// ---------- HU4: Unirse ----------
$('#form-unirse').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const codigo = extraerCodigo(new FormData(form).get('codigo'));
  if (!codigo) return mostrarError(form, 'Ingresá un link o código');
  conBoton(form, async () => {
    const sala = await window.Api.unirse(codigo);
    form.reset();
    abrirPanel(sala);
  });
});

// ---------- Panel de la sala ----------
function dibujarSliders() {
  $('#sliders').innerHTML = VARIABLES.map(
    (v) => `
      <div class="slider">
        <div class="slider-cabecera">
          <label class="slider-nombre" for="slider-${v.clave}">${v.nombre}</label>
          <span class="slider-valor" id="valor-${v.clave}">0</span>
        </div>
        <p class="slider-ayuda">${v.ayuda}</p>
        <input type="range" id="slider-${v.clave}" data-clave="${v.clave}" min="0" max="10" step="1" value="0" />
      </div>`
  ).join('');

  $('#promedios').innerHTML = VARIABLES.map(
    (v) => `
      <div class="promedio">
        <div class="promedio-cabecera">
          <span>${v.nombre}</span>
          <strong id="prom-${v.clave}">–</strong>
        </div>
        <div class="barra-fondo"><div class="barra-relleno" id="barra-${v.clave}"></div></div>
      </div>`
  ).join('');

  document.querySelectorAll('#sliders input[type="range"]').forEach((input) => {
    input.addEventListener('input', () => {
      $(`#valor-${input.dataset.clave}`).textContent = input.value;
      programarEnvio();
    });
  });
}

function abrirPanel(sala) {
  estado.sala = sala;
  $('#sala-nombre').textContent = sala.nombre;
  $('#sala-codigo').textContent = sala.codigo;
  $('#btn-finalizar').hidden = !sala.esAnfitrion;
  $('#estado-guardado').textContent = '';
  dibujarSliders();
  mostrarVista('panel');

  actualizarPromedio();
  estado.intervaloPromedio = setInterval(actualizarPromedio, window.CONFIG.INTERVALO_PROMEDIO_MS);
}

function detenerPanel() {
  clearInterval(estado.intervaloPromedio);
  clearTimeout(estado.esperaSlider);
  estado.intervaloPromedio = null;
  estado.sala = null;
}

function volverAlHome(mensaje) {
  detenerPanel();
  mostrarVista('home');
  if (mensaje) avisar(mensaje);
}

// ---------- HU5: Enviar mi estado ----------
// Espera medio segundo sin cambios antes de mandar (no manda por cada movimiento)
function programarEnvio() {
  clearTimeout(estado.esperaSlider);
  $('#estado-guardado').textContent = '';
  estado.esperaSlider = setTimeout(enviarEstado, window.CONFIG.ESPERA_SLIDER_MS);
}

async function enviarEstado() {
  if (!estado.sala) return;
  const valores = {};
  VARIABLES.forEach((v) => (valores[v.clave] = Number($(`#slider-${v.clave}`).value)));

  try {
    await window.Api.enviarEstado(estado.sala.codigo, valores);
    $('#estado-guardado').textContent = 'Guardado ✓';
    actualizarPromedio();
  } catch (error) {
    if (error.status === 401) return sesionVencida();
    if (error.status === 403) return volverAlHome(error.message);
    $('#estado-guardado').textContent = 'No se pudo guardar, reintentando…';
    estado.esperaSlider = setTimeout(enviarEstado, 3000);
  }
}

// ---------- HU6: Ver el promedio ----------
function colorNivel(valor) {
  if (valor < 4) return 'var(--nivel-bajo)';
  if (valor < 7) return 'var(--nivel-medio)';
  return 'var(--nivel-alto)';
}

async function actualizarPromedio() {
  if (!estado.sala) return;
  const codigo = estado.sala.codigo;
  try {
    const datos = await window.Api.promedio(codigo);
    if (!estado.sala || estado.sala.codigo !== codigo) return; // ya salió de la sala

    const n = datos.participantes;
    $('#participantes').textContent = `${n} participante${n === 1 ? '' : 's'}`;

    const hayPromedio = Boolean(datos.promedio);
    $('#espera').hidden = hayPromedio;
    $('#promedios').hidden = !hayPromedio;

    if (!hayPromedio) {
      $('#espera').textContent =
        `Esperando más participantes… El promedio se muestra desde ${datos.minimo} personas, ` +
        'para que nadie pueda deducir lo que marcó otro.';
      return;
    }

    VARIABLES.forEach((v) => {
      const valor = datos.promedio[v.clave];
      $(`#prom-${v.clave}`).textContent = valor.toFixed(1);
      const barra = $(`#barra-${v.clave}`);
      barra.style.width = `${valor * 10}%`;
      barra.style.background = colorNivel(valor);
    });
  } catch (error) {
    if (error.status === 401) return sesionVencida();
    if (error.status === 410 || error.status === 404) return volverAlHome('La reunión terminó');
    // Otros errores (red, 500): se reintenta solo en la próxima vuelta
  }
}

// ---------- HU7: Salir ----------
$('#btn-salir').addEventListener('click', async () => {
  const codigo = estado.sala?.codigo;
  detenerPanel();
  mostrarVista('home');
  if (!codigo) return;
  try {
    await window.Api.salir(codigo);
  } catch (error) {
    if (error.status === 401) sesionVencida();
  }
});

// ---------- HU8: Finalizar (solo anfitrión) ----------
$('#btn-finalizar').addEventListener('click', async () => {
  if (!estado.sala) return;
  if (!confirm('¿Finalizar la reunión para todos? Se borran los valores de los participantes.')) return;
  try {
    await window.Api.finalizar(estado.sala.codigo);
    volverAlHome('Reunión finalizada');
  } catch (error) {
    if (error.status === 401) return sesionVencida();
    avisar(error.message);
  }
});

// ---------- Copiar link ----------
$('#btn-copiar').addEventListener('click', async () => {
  if (!estado.sala) return;
  try {
    await navigator.clipboard.writeText(estado.sala.link);
    avisar('Link copiado');
  } catch (_) {
    avisar(`Link: ${estado.sala.link}`);
  }
});

// ---------- Navegación y sesión ----------
document.querySelectorAll('[data-ir]').forEach((boton) => {
  boton.addEventListener('click', () => mostrarVista(boton.dataset.ir));
});

$('#btn-cerrar-sesion').addEventListener('click', async () => {
  if (estado.sala) {
    const codigo = estado.sala.codigo;
    detenerPanel();
    await window.Api.salir(codigo).catch(() => {});
  }
  Sesion.cerrar();
  mostrarVista('login');
});

// ---------- Inicio ----------
if (Sesion.token()) {
  irAlInicio();
} else {
  mostrarVista('login');
}
