// MODELO: única parte del servicio que habla con la base de datos.
// El resto del código usa estas funciones y no sabe si los datos
// están en MongoDB o en memoria (ventaja de separar en capas).
const mongoose = require('mongoose');
const { usaMemoria } = require('../db');

const usuarioSchema = new mongoose.Schema(
  {
    usuario: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: 'creadoEn', updatedAt: false } }
);

const Usuario = mongoose.model('Usuario', usuarioSchema, 'usuarios');

// ---- Versión en memoria (solo para pruebas locales) ----
const usuariosEnMemoria = [];
let siguienteId = 1;

function aObjetoSimple(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id || doc.id),
    usuario: doc.usuario,
    email: doc.email,
    passwordHash: doc.passwordHash,
  };
}

async function buscarPorUsuario(usuario) {
  if (usaMemoria()) {
    return usuariosEnMemoria.find((u) => u.usuario === usuario) || null;
  }
  return aObjetoSimple(await Usuario.findOne({ usuario }).lean());
}

async function buscarPorUsuarioOEmail(usuario, email) {
  if (usaMemoria()) {
    return usuariosEnMemoria.find((u) => u.usuario === usuario || u.email === email) || null;
  }
  return aObjetoSimple(await Usuario.findOne({ $or: [{ usuario }, { email }] }).lean());
}

async function crear({ usuario, email, passwordHash }) {
  if (usaMemoria()) {
    const nuevo = { id: String(siguienteId++), usuario, email, passwordHash };
    usuariosEnMemoria.push(nuevo);
    return nuevo;
  }
  return aObjetoSimple(await Usuario.create({ usuario, email, passwordHash }));
}

module.exports = { buscarPorUsuario, buscarPorUsuarioOEmail, crear };
