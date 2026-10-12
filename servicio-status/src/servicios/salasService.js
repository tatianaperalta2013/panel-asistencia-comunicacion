// SERVICIO de salas: crear, unirse, salir y finalizar reuniones.
const crypto = require('crypto');
const config = require('../config');
const { ErrorNegocio } = require('./errores');
const SalaModelo = require('../modelos/salaModelo');
const EstadoModelo = require('../modelos/estadoModelo');

// Sin letras ni números que se confunden (O/0, I/1)
const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generarCodigo() {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += CARACTERES[crypto.randomInt(CARACTERES.length)];
  }
  return codigo;
}

function normalizarCodigo(codigo) {
  return String(codigo || '').trim().toUpperCase();
}

function armarLink(codigo) {
  return `${config.frontendUrl}/?sala=${codigo}`;
}

// Devuelve la sala si existe y está activa; si no, lanza el error que corresponde
async function validarSalaActiva(codigo) {
  const sala = await SalaModelo.buscarPorCodigo(codigo);
  if (!sala) throw new ErrorNegocio(404, 'No existe una reunión con ese código');
  if (sala.estado === 'finalizada') throw new ErrorNegocio(410, 'Esta reunión ya terminó');
  return sala;
}

// S3 — Crear reunión
async function crearSala({ nombre, usuarioId }) {
  let codigo = generarCodigo();
  // Por si el código ya existe (muy poco probable)
  while (await SalaModelo.buscarPorCodigo(codigo)) {
    codigo = generarCodigo();
  }
  const nombreLimpio = String(nombre || '').trim().slice(0, 60) || 'Reunión sin nombre';

  const sala = await SalaModelo.crear({ codigo, nombre: nombreLimpio, anfitrionId: usuarioId });
  await EstadoModelo.agregarParticipante(codigo, usuarioId); // el anfitrión arranca en 0

  return { codigo: sala.codigo, nombre: sala.nombre, link: armarLink(sala.codigo), esAnfitrion: true };
}

// S4 — Unirse a una reunión
async function unirse({ codigo, usuarioId }) {
  const cod = normalizarCodigo(codigo);
  const sala = await validarSalaActiva(cod);
  await EstadoModelo.agregarParticipante(cod, usuarioId);
  return {
    codigo: sala.codigo,
    nombre: sala.nombre,
    link: armarLink(sala.codigo),
    esAnfitrion: sala.anfitrionId === usuarioId,
  };
}

// S7 — Salir de la reunión
async function salir({ codigo, usuarioId }) {
  await EstadoModelo.eliminar(normalizarCodigo(codigo), usuarioId);
}

// S8 — Finalizar la reunión (solo el anfitrión)
async function finalizar({ codigo, usuarioId }) {
  const cod = normalizarCodigo(codigo);
  const sala = await SalaModelo.buscarPorCodigo(cod);
  if (!sala) throw new ErrorNegocio(404, 'No existe una reunión con ese código');
  if (sala.anfitrionId !== usuarioId) {
    throw new ErrorNegocio(403, 'Solo quien creó la reunión puede finalizarla');
  }
  await SalaModelo.cambiarEstado(cod, 'finalizada');
  await EstadoModelo.eliminarTodosDeSala(cod); // se borran los valores de todos
  return { codigo: cod, estado: 'finalizada' };
}

module.exports = { crearSala, unirse, salir, finalizar, validarSalaActiva, normalizarCodigo };
