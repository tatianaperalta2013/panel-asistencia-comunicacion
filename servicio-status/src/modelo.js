// MODELO: la única parte que habla con la base de datos (BDD Status).
// Guarda los últimos valores de cada usuario en cada sala.
// Si no hay MONGO_URI, guarda en memoria para poder probar en la compu.
const mongoose = require('mongoose');

const valoresSchema = new mongoose.Schema({
  salaId: { type: String, required: true },
  usuarioId: { type: String, required: true },
  valor1: Number,
  valor2: Number,
  valor3: Number,
  valor4: Number,
  fecha: { type: Date, default: Date.now },
});
valoresSchema.index({ salaId: 1, usuarioId: 1 }, { unique: true });
const Valores = mongoose.model('Valores', valoresSchema, 'valores');

const enMemoria = new Map(); // "salaId|usuarioId" -> valores
let usarMemoria = false;

async function conectar(mongoUri) {
  if (!mongoUri) {
    usarMemoria = true;
    console.warn('[status] Sin MONGO_URI: los datos se guardan en memoria.');
    return;
  }
  await mongoose.connect(mongoUri);
  console.log('[status] Conectado a MongoDB');
}

// "Guarda valores del usuario en la sala" (reemplaza los anteriores)
async function guardar(salaId, usuarioId, valores) {
  const fecha = new Date();
  if (usarMemoria) {
    enMemoria.set(`${salaId}|${usuarioId}`, { salaId, usuarioId, ...valores, fecha });
    return;
  }
  await Valores.updateOne({ salaId, usuarioId }, { ...valores, fecha }, { upsert: true });
}

// "Lee valores de los usuarios de esa sala" (solo los que mandaron datos hace poco)
async function leerSala(salaId, desde) {
  if (usarMemoria) {
    return [...enMemoria.values()].filter((v) => v.salaId === salaId && v.fecha >= desde);
  }
  return Valores.find({ salaId, fecha: { $gte: desde } }).lean();
}

module.exports = { conectar, guardar, leerSala };
