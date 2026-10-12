// Valida el JWT que manda la app en "Authorization: Bearer <token>".
// Si es válido, guarda el usuario en req.usuario para reenviarlo a los servicios.
const jwt = require('jsonwebtoken');
const config = require('../config');

function verificarJWT(req, res, next) {
  const header = req.get('authorization') || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Falta iniciar sesión' });
  }

  try {
    const datos = jwt.verify(token, config.jwtSecret);
    req.usuario = { id: datos.id, nombre: datos.usuario };
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Tu sesión venció, volvé a iniciar sesión' });
  }
}

module.exports = verificarJWT;
