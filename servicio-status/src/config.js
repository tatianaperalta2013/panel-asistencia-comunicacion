// Lee la configuración desde las variables de entorno (.env).
require('dotenv').config();

const config = {
  puerto: Number(process.env.PORT) || 4002,
  mongoUri: process.env.MONGO_URI || '',
  gatewaySecret: process.env.GATEWAY_SECRET || 'clave-de-desarrollo-gateway',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5500').replace(/\/$/, ''),
  minParticipantes: Number(process.env.MIN_PARTICIPANTES) || 3,
  segundosInactividad: Number(process.env.SEGUNDOS_INACTIVIDAD) || 30,
};

module.exports = config;
