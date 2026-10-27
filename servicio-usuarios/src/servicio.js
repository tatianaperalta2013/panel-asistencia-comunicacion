// SERVICIO: las reglas de negocio de los usuarios.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const modelo = require('./modelo');

const JWT_SECRET = process.env.JWT_SECRET || 'clave-de-desarrollo-jwt';

// Error con código HTTP para que el controlador sepa qué responder
function error(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

// Registro: guarda el usuario con la contraseña hasheada (nunca en texto plano)
async function registrar(usuario, password) {
  if (!usuario || !password || password.length < 8) {
    throw error(400, 'Completá usuario y una contraseña de al menos 8 caracteres');
  }
  if (await modelo.buscarPorUsuario(usuario)) {
    throw error(409, 'Ese usuario ya existe');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const nuevo = await modelo.crear(usuario, passwordHash);
  return { id: nuevo.id, usuario: nuevo.usuario };
}

// Login (Diagrama de Secuencia 1):
// 1. busca al usuario por nombre
// 2. compara la contraseña con bcrypt.compare
// 3. si coincide, crea el JWT
async function login(usuario, password) {
  const encontrado = await modelo.buscarPorUsuario(usuario);
  const coincide = encontrado ? await bcrypt.compare(password || '', encontrado.passwordHash) : false;
  if (!coincide) {
    throw error(401, 'Usuario o contraseña incorrectos');
  }
  const token = jwt.sign({ id: encontrado.id, usuario: encontrado.usuario }, JWT_SECRET, { expiresIn: '2h' });
  return { token, usuario: encontrado.usuario };
}

module.exports = { registrar, login };
