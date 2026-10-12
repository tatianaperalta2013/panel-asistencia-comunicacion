// SERVICIO: reglas de negocio de los usuarios.
// No sabe nada de HTTP (eso lo maneja el controlador).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const UsuarioModelo = require('../modelos/usuarioModelo');

// Error con código HTTP, para que el controlador sepa qué responder
class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const REGEX_USUARIO = /^[a-zA-Z0-9_.-]{3,20}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarRegistro({ usuario, email, password }) {
  if (!usuario || !email || !password) {
    throw new ErrorNegocio(400, 'Completá usuario, email y contraseña');
  }
  if (!REGEX_USUARIO.test(usuario)) {
    throw new ErrorNegocio(400, 'El usuario debe tener entre 3 y 20 caracteres (letras, números, punto, guion o guion bajo)');
  }
  if (!REGEX_EMAIL.test(email)) {
    throw new ErrorNegocio(400, 'El email no es válido');
  }
  if (String(password).length < 8) {
    throw new ErrorNegocio(400, 'La contraseña debe tener al menos 8 caracteres');
  }
}

// S1 — Registro
async function registrar({ usuario, email, password }) {
  validarRegistro({ usuario, email, password });
  const emailNormalizado = email.trim().toLowerCase();

  const existente = await UsuarioModelo.buscarPorUsuarioOEmail(usuario, emailNormalizado);
  if (existente) {
    throw new ErrorNegocio(409, 'Ese usuario o email ya está registrado');
  }

  // Nunca se guarda la contraseña: se guarda su hash
  const passwordHash = await bcrypt.hash(password, 10);
  const nuevo = await UsuarioModelo.crear({ usuario, email: emailNormalizado, passwordHash });
  return { id: nuevo.id, usuario: nuevo.usuario };
}

// S2 — Login
async function login({ usuario, password }) {
  const mensajeError = 'Usuario o contraseña incorrectos';
  if (!usuario || !password) {
    throw new ErrorNegocio(401, mensajeError);
  }

  // Se busca SOLO por usuario y después se compara el hash con bcrypt
  // (bcrypt usa una "sal" aleatoria: no sirve hashear y buscar el hash)
  const encontrado = await UsuarioModelo.buscarPorUsuario(usuario);
  const coincide = encontrado ? await bcrypt.compare(password, encontrado.passwordHash) : false;

  if (!coincide) {
    // Mismo mensaje en los dos casos: no revelamos si el usuario existe
    throw new ErrorNegocio(401, mensajeError);
  }

  const token = jwt.sign(
    { id: encontrado.id, usuario: encontrado.usuario },
    config.jwtSecret,
    { expiresIn: config.jwtDuracion }
  );
  return { token, usuario: encontrado.usuario };
}

module.exports = { registrar, login, ErrorNegocio };
