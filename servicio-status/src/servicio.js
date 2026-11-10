// SERVICIO: reglas de negocio del panel (Diagrama de Secuencia 2).
const modelo = require('./modelo');

// Si alguien no manda datos en 10 minutos (no tocó «Actualizar» o cerró la pestaña), deja de contar en el promedio.
// Es largo porque la app no se actualiza sola: así nadie desaparece mientras sigue en la reunión.
const SEGUNDOS_ACTIVO = 10 * 60;

function error(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

// Cada valor tiene que ser un número entre 0 y 10
function validar(body) {
  const valores = {};
  for (const clave of ['valor1', 'valor2', 'valor3', 'valor4']) {
    const n = Number(body[clave]);
    if (body[clave] === undefined || body[clave] === null || !Number.isFinite(n) || n < 0 || n > 10) {
      throw error(400, `${clave} tiene que ser un número entre 0 y 10`);
    }
    valores[clave] = n;
  }
  return valores;
}

// ---------- Reuniones ----------
// Letras y números fáciles de dictar (sin 0/O ni 1/I/L para no confundirse)
const CARACTERES = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generarCodigo = () => {
  const parte = () => Array.from({ length: 3 }, () => CARACTERES[Math.floor(Math.random() * CARACTERES.length)]).join('');
  return `${parte()}-${parte()}`; // ej: K7M-4QP
};

const datosPublicos = (sala) => ({ codigo: sala.codigo, nombre: sala.nombre, creada: sala.creada });

// POST /salas: crea una reunión nueva con un código único
async function crearSala(nombre, usuarioId) {
  nombre = String(nombre || '').trim();
  if (nombre.length < 3 || nombre.length > 60) {
    throw error(400, 'El nombre de la reunión tiene que tener entre 3 y 60 caracteres');
  }
  for (let intento = 0; intento < 5; intento++) {
    try {
      return datosPublicos(await modelo.crearSala(generarCodigo(), nombre, usuarioId));
    } catch (e) {
      if (e.code !== 11000) throw e; // 11000 = código repetido: se prueba con otro
    }
  }
  throw error(500, 'No se pudo generar un código para la reunión');
}

// GET /salas/:codigo: devuelve la reunión o 404 si no existe
async function obtenerSala(codigo) {
  const sala = await modelo.buscarSala(codigo);
  if (!sala) throw error(404, 'No existe una reunión con ese código. Revisalo o creá una nueva.');
  return datosPublicos(sala);
}

const promedio = (lista, clave) =>
  lista.length ? Math.round((lista.reduce((suma, v) => suma + v[clave], 0) / lista.length) * 10) / 10 : 0;

// Lee los valores de los usuarios activos de la sala y calcula el promedio por variable (X, Y, Z, W).
// Nunca se devuelven los valores individuales de nadie.
async function promediar(salaId, comprobarSala = false) {
  if (comprobarSala) await obtenerSala(salaId); // 404 si la reunión no existe
  const desde = new Date(Date.now() - SEGUNDOS_ACTIVO * 1000);
  const deLaSala = await modelo.leerSala(salaId, desde);
  return {
    X: promedio(deLaSala, 'valor1'),
    Y: promedio(deLaSala, 'valor2'),
    Z: promedio(deLaSala, 'valor3'),
    W: promedio(deLaSala, 'valor4'),
    participantes: deLaSala.length,
  };
}

// ---------- Historial ----------
const SEGUNDOS_ENTRE_PUNTOS = 15; // como máximo un punto cada 15 s por sala
const MINUTOS_HISTORIAL = 30; // el gráfico muestra los últimos 30 minutos
const ultimoPunto = new Map(); // salaId -> fecha del último punto guardado

async function registrarPunto(salaId, resultado) {
  const ahora = Date.now();
  if (ahora - (ultimoPunto.get(salaId) || 0) < SEGUNDOS_ENTRE_PUNTOS * 1000) return;
  ultimoPunto.set(salaId, ahora);
  await modelo.guardarPunto(salaId, resultado);
}

// GET /status/:salaId/historial: evolución del promedio en los últimos 30 minutos
async function historial(salaId) {
  await obtenerSala(salaId); // 404 si la reunión no existe
  const desde = new Date(Date.now() - MINUTOS_HISTORIAL * 60 * 1000);
  const puntos = await modelo.leerHistorial(salaId, desde, 120);
  return {
    minutos: MINUTOS_HISTORIAL,
    puntos: puntos.map(({ fecha, X, Y, Z, W, participantes }) => ({ fecha, X, Y, Z, W, participantes })),
  };
}

// POST: guarda los valores del usuario, devuelve el promedio actualizado y lo suma al historial
async function registrarYPromediar(salaId, usuarioId, body) {
  const valores = validar(body);
  await obtenerSala(salaId); // la reunión tiene que existir (si no, 404)
  await modelo.guardar(salaId, usuarioId, valores);
  const resultado = await promediar(salaId);
  await registrarPunto(salaId, resultado);
  return resultado;
}

// DELETE: el usuario sale de la sala y deja de contar en el promedio
async function salir(salaId, usuarioId) {
  await modelo.borrar(salaId, usuarioId);
}

module.exports = { crearSala, obtenerSala, registrarYPromediar, promediar, historial, salir };
