// Conexión a la base de datos.
// Si hay MONGO_URI se conecta a MongoDB; si no, trabaja en "modo memoria".
const mongoose = require('mongoose');
const config = require('./config');

let modoMemoria = false;

async function conectar() {
  if (!config.mongoUri) {
    modoMemoria = true;
    console.warn('[status] Sin MONGO_URI: los datos se guardan en memoria y se pierden al reiniciar.');
    return;
  }
  await mongoose.connect(config.mongoUri);
  console.log('[status] Conectado a MongoDB');
}

function usaMemoria() {
  return modoMemoria;
}

module.exports = { conectar, usaMemoria };
