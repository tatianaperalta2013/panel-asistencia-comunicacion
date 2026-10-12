// SERVICIO de estados: guardar lo que marca cada uno y calcular el promedio.
const config = require('../config');
const { ErrorNegocio } = require('./errores');
const EstadoModelo = require('../modelos/estadoModelo');
const { validarSalaActiva, normalizarCodigo } = require('./salasService');

// Las 4 variables que se miden (X, Y, Z, W)
const VARIABLES = ['estres', 'perdido', 'faltaContexto', 'devolucion'];

function validarValores(body) {
  const valores = {};
  for (const variable of VARIABLES) {
    const valor = Number(body[variable]);
    if (!Number.isFinite(valor) || valor < 0 || valor > 10) {
      throw new ErrorNegocio(400, `El valor de "${variable}" tiene que ser un número entre 0 y 10`);
    }
    valores[variable] = valor;
  }
  return valores;
}

// S5 — Enviar mi estado
async function guardarEstado({ codigo, usuarioId, body }) {
  const cod = normalizarCodigo(codigo);
  const valores = validarValores(body || {});

  const sala = await validarSalaActiva(cod).catch((error) => {
    // Si la sala terminó, para este pedido corresponde 403 (ver S5)
    if (error.status === 410) throw new ErrorNegocio(403, 'Ya no estás en esta reunión');
    throw error;
  });

  if (!(await EstadoModelo.existe(sala.codigo, usuarioId))) {
    throw new ErrorNegocio(403, 'Ya no estás en esta reunión');
  }
  await EstadoModelo.guardarValores(sala.codigo, usuarioId, valores);
}

function calcularPromedio(estados) {
  const promedio = {};
  for (const variable of VARIABLES) {
    const suma = estados.reduce((total, e) => total + e[variable], 0);
    promedio[variable] = Math.round((suma / estados.length) * 10) / 10; // 1 decimal
  }
  return promedio;
}

// S6 — Ver el promedio de la sala
async function obtenerPromedio({ codigo, usuarioId }) {
  const sala = await validarSalaActiva(normalizarCodigo(codigo));

  // Cada consulta cuenta como "sigo conectado"
  await EstadoModelo.marcarActividad(sala.codigo, usuarioId);

  const desde = new Date(Date.now() - config.segundosInactividad * 1000);
  const activos = await EstadoModelo.buscarActivos(sala.codigo, desde);

  // Con pocos participantes no se muestra nada, para proteger el anonimato
  if (activos.length < config.minParticipantes) {
    return { participantes: activos.length, minimo: config.minParticipantes, promedio: null };
  }
  return { participantes: activos.length, minimo: config.minParticipantes, promedio: calcularPromedio(activos) };
}

module.exports = { guardarEstado, obtenerPromedio, calcularPromedio, VARIABLES };
