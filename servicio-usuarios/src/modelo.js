// MODELO: la única parte que habla con la base de datos (BDD Usuarios).
// Si no hay MONGO_URI, guarda en memoria para poder probar en la compu.
const mongoose = require('mongoose');

const Usuario = mongoose.model(
  'Usuario',
  new mongoose.Schema({
    usuario: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  }),
  'usuarios'
);

const enMemoria = [];
let usarMemoria = false;

async function conectar(mongoUri) {
  if (!mongoUri) {
    usarMemoria = true;
    console.warn('[usuarios] Sin MONGO_URI: los datos se guardan en memoria.');
    return;
  }
  await mongoose.connect(mongoUri);
  console.log('[usuarios] Conectado a MongoDB');
}

async function buscarPorUsuario(usuario) {
  if (usarMemoria) return enMemoria.find((u) => u.usuario === usuario) || null;
  const doc = await Usuario.findOne({ usuario }).lean();
  return doc ? { id: String(doc._id), usuario: doc.usuario, passwordHash: doc.passwordHash } : null;
}

async function crear(usuario, passwordHash) {
  if (usarMemoria) {
    const nuevo = { id: String(enMemoria.length + 1), usuario, passwordHash };
    enMemoria.push(nuevo);
    return nuevo;
  }
  const doc = await Usuario.create({ usuario, passwordHash });
  return { id: String(doc._id), usuario: doc.usuario };
}

module.exports = { conectar, buscarPorUsuario, crear };
