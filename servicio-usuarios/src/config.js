// Lee la configuración desde las variables de entorno (.env).
// Si falta algo, usa un valor por defecto para poder probar en la compu.
require('dotenv').config();

const config = {
  puerto: Number(process.env.PORT) || 4001,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'clave-de-desarrollo-jwt',
  gatewaySecret: process.env.GATEWAY_SECRET || 'clave-de-desarrollo-gateway',
  jwtDuracion: '2h',
};

if (!process.env.JWT_SECRET) {
  console.warn('[usuarios] Falta JWT_SECRET: se usa una clave de desarrollo. No usar así en producción.');
}

module.exports = config;
