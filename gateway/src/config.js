// Lee la configuración desde las variables de entorno (.env).
require('dotenv').config();

const sinBarraFinal = (url) => url.replace(/\/$/, '');

const config = {
  puerto: Number(process.env.PORT) || 3000,
  usuariosUrl: sinBarraFinal(process.env.USUARIOS_URL || 'http://localhost:4001'),
  statusUrl: sinBarraFinal(process.env.STATUS_URL || 'http://localhost:4002'),
  jwtSecret: process.env.JWT_SECRET || 'clave-de-desarrollo-jwt',
  gatewaySecret: process.env.GATEWAY_SECRET || 'clave-de-desarrollo-gateway',
  origenesPermitidos: (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => sinBarraFinal(o.trim()))
    .filter(Boolean),
};

if (!process.env.JWT_SECRET) {
  console.warn('[gateway] Falta JWT_SECRET: se usa una clave de desarrollo. No usar así en producción.');
}

module.exports = config;
