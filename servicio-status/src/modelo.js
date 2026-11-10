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

// Reuniones creadas: cada una tiene un código único que comparten los participantes
const salaSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  creadorId: { type: String, required: true },
  creada: { type: Date, default: Date.now },
});
const Sala = mongoose.model('Sala', salaSchema, 'salas');

// Historial: un punto del promedio de la sala cada 15 s (se borra solo a las 24 h)
const historialSchema = new mongoose.Schema({
  salaId: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  X: Number,
  Y: Number,
  Z: Number,
  W: Number,
  participantes: Number,
});
historialSchema.index({ salaId: 1, fecha: 1 });
historialSchema.index({ fecha: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
const Historial = mongoose.model('Historial', historialSchema, 'historial');

const enMemoria = new Map(); // "salaId|usuarioId" -> valores
const historialEnMemoria = []; // puntos del historial
const salasEnMemoria = new Map(); // codigo -> sala
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

// "Borra los valores del usuario en la sala" (cuando sale de la reunión)
async function borrar(salaId, usuarioId) {
  if (usarMemoria) {
    enMemoria.delete(`${salaId}|${usuarioId}`);
    return;
  }
  await Valores.deleteOne({ salaId, usuarioId });
}

// "Crea la reunión" (falla con código 11000 si el código ya existe)
async function crearSala(codigo, nombre, creadorId) {
  const sala = { codigo, nombre, creadorId, creada: new Date() };
  if (usarMemoria) {
    if (salasEnMemoria.has(codigo)) {
      const e = new Error('Código repetido');
      e.code = 11000;
      throw e;
    }
    salasEnMemoria.set(codigo, sala);
    return sala;
  }
  await Sala.create(sala);
  return sala;
}

// "Busca la reunión por código" → la reunión o null
async function buscarSala(codigo) {
  if (usarMemoria) return salasEnMemoria.get(codigo) || null;
  return Sala.findOne({ codigo }).lean();
}

// "Guarda un punto del historial"
async function guardarPunto(salaId, punto) {
  const fila = { salaId, fecha: new Date(), ...punto };
  if (usarMemoria) {
    historialEnMemoria.push(fila);
    return;
  }
  await Historial.create(fila);
}

// "Lee el historial de la sala" desde una fecha, ordenado del más viejo al más nuevo
async function leerHistorial(salaId, desde, limite) {
  if (usarMemoria) {
    return historialEnMemoria.filter((p) => p.salaId === salaId && p.fecha >= desde).slice(-limite);
  }
  const filas = await Historial.find({ salaId, fecha: { $gte: desde } }).sort({ fecha: -1 }).limit(limite).lean();
  return filas.reverse();
}

module.exports = { conectar, guardar, leerSala, borrar, crearSala, buscarSala, guardarPunto, leerHistorial };
