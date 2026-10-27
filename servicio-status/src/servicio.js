// SERVICIO: reglas de negocio del panel (Diagrama de Secuencia 2).
const modelo = require('./modelo');

// Si alguien no manda datos en 10 segundos (cerró la pestaña), deja de contar
const SEGUNDOS_ACTIVO = 10;

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
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      throw error(400, `${clave} tiene que ser un número entre 0 y 10`);
    }
    valores[clave] = n;
  }
  return valores;
}

const promedio = (lista, clave) =>
  Math.round((lista.reduce((suma, v) => suma + v[clave], 0) / lista.length) * 10) / 10;

async function registrarYPromediar(salaId, usuarioId, body) {
  const valores = validar(body);

  // 1. Guarda valores del usuario en la sala
  await modelo.guardar(salaId, usuarioId, valores);

  // 2. Lee valores de los usuarios de esa sala
  const desde = new Date(Date.now() - SEGUNDOS_ACTIVO * 1000);
  const deLaSala = await modelo.leerSala(salaId, desde);

  // 3. Calcula promedio por variable (X, Y, Z, W)
  //    Nunca se devuelven los valores individuales de nadie
  return {
    X: promedio(deLaSala, 'valor1'),
    Y: promedio(deLaSala, 'valor2'),
    Z: promedio(deLaSala, 'valor3'),
    W: promedio(deLaSala, 'valor4'),
    participantes: deLaSala.length,
  };
}

module.exports = { registrarYPromediar };
