// MODELO de estados: lo que marcó cada participante en los 4 sliders.
// Única parte que toca la colección "estados".
const mongoose = require('mongoose');
const { usaMemoria } = require('../db');

const estadoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  usuarioId: { type: String, required: true },
  estres: { type: Number, default: 0 },
  perdido: { type: Number, default: 0 },
  faltaContexto: { type: Number, default: 0 },
  devolucion: { type: Number, default: 0 },
  ultimaActividad: { type: Date, default: Date.now },
});
// Un solo estado por persona y por sala
estadoSchema.index({ codigo: 1, usuarioId: 1 }, { unique: true });

const Estado = mongoose.model('Estado', estadoSchema, 'estados');

// ---- Versión en memoria (solo para pruebas locales) ----
const estadosEnMemoria = new Map(); // "codigo|usuarioId" -> estado
const clave = (codigo, usuarioId) => `${codigo}|${usuarioId}`;

// Crea el estado en 0 si no existía; si existía, solo marca actividad
async function agregarParticipante(codigo, usuarioId) {
  const ahora = new Date();
  if (usaMemoria()) {
    const existente = estadosEnMemoria.get(clave(codigo, usuarioId));
    if (existente) {
      existente.ultimaActividad = ahora;
    } else {
      estadosEnMemoria.set(clave(codigo, usuarioId), {
        codigo, usuarioId, estres: 0, perdido: 0, faltaContexto: 0, devolucion: 0, ultimaActividad: ahora,
      });
    }
    return;
  }
  await Estado.updateOne(
    { codigo, usuarioId },
    {
      $set: { ultimaActividad: ahora },
      $setOnInsert: { estres: 0, perdido: 0, faltaContexto: 0, devolucion: 0 },
    },
    { upsert: true }
  );
}

async function existe(codigo, usuarioId) {
  if (usaMemoria()) {
    return estadosEnMemoria.has(clave(codigo, usuarioId));
  }
  return Boolean(await Estado.exists({ codigo, usuarioId }));
}

async function guardarValores(codigo, usuarioId, valores) {
  const ahora = new Date();
  if (usaMemoria()) {
    const estado = estadosEnMemoria.get(clave(codigo, usuarioId));
    if (estado) Object.assign(estado, valores, { ultimaActividad: ahora });
    return;
  }
  await Estado.updateOne({ codigo, usuarioId }, { ...valores, ultimaActividad: ahora });
}

async function marcarActividad(codigo, usuarioId) {
  const ahora = new Date();
  if (usaMemoria()) {
    const estado = estadosEnMemoria.get(clave(codigo, usuarioId));
    if (estado) estado.ultimaActividad = ahora;
    return;
  }
  await Estado.updateOne({ codigo, usuarioId }, { ultimaActividad: ahora });
}

async function buscarActivos(codigo, desde) {
  if (usaMemoria()) {
    return [...estadosEnMemoria.values()].filter(
      (e) => e.codigo === codigo && e.ultimaActividad >= desde
    );
  }
  return Estado.find({ codigo, ultimaActividad: { $gte: desde } }).lean();
}

async function eliminar(codigo, usuarioId) {
  if (usaMemoria()) {
    estadosEnMemoria.delete(clave(codigo, usuarioId));
    return;
  }
  await Estado.deleteOne({ codigo, usuarioId });
}

async function eliminarTodosDeSala(codigo) {
  if (usaMemoria()) {
    for (const [k, e] of estadosEnMemoria) {
      if (e.codigo === codigo) estadosEnMemoria.delete(k);
    }
    return;
  }
  await Estado.deleteMany({ codigo });
}

module.exports = {
  agregarParticipante,
  existe,
  guardarValores,
  marcarActividad,
  buscarActivos,
  eliminar,
  eliminarTodosDeSala,
};
