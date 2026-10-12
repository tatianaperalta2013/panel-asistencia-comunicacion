// MODELO de salas (reuniones). Única parte que toca la colección "salas".
const mongoose = require('mongoose');
const { usaMemoria } = require('../db');

const salaSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },
    nombre: { type: String, default: '' },
    anfitrionId: { type: String, required: true },
    estado: { type: String, enum: ['activa', 'finalizada'], default: 'activa' },
  },
  { timestamps: { createdAt: 'creadaEn', updatedAt: false } }
);

const Sala = mongoose.model('Sala', salaSchema, 'salas');

// ---- Versión en memoria (solo para pruebas locales) ----
const salasEnMemoria = new Map(); // codigo -> sala

function aObjetoSimple(doc) {
  if (!doc) return null;
  return {
    codigo: doc.codigo,
    nombre: doc.nombre,
    anfitrionId: doc.anfitrionId,
    estado: doc.estado,
  };
}

async function buscarPorCodigo(codigo) {
  if (usaMemoria()) {
    return salasEnMemoria.get(codigo) || null;
  }
  return aObjetoSimple(await Sala.findOne({ codigo }).lean());
}

async function crear({ codigo, nombre, anfitrionId }) {
  if (usaMemoria()) {
    const sala = { codigo, nombre, anfitrionId, estado: 'activa' };
    salasEnMemoria.set(codigo, sala);
    return sala;
  }
  return aObjetoSimple(await Sala.create({ codigo, nombre, anfitrionId }));
}

async function cambiarEstado(codigo, estado) {
  if (usaMemoria()) {
    const sala = salasEnMemoria.get(codigo);
    if (sala) sala.estado = estado;
    return;
  }
  await Sala.updateOne({ codigo }, { estado });
}

module.exports = { buscarPorCodigo, crear, cambiarEstado };
