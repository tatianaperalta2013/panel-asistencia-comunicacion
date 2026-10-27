// API USUARIOS (puerto 4001): registro y login.
require('dotenv').config();
const express = require('express');
const modelo = require('./modelo');
const controlador = require('./controlador');

const PUERTO = Number(process.env.PORT) || 4001;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'clave-de-desarrollo-gateway';

const app = express();
app.use(express.json());

// Para que Render sepa que el servicio está vivo
app.get('/health', (req, res) => res.json({ estado: 'ok' }));

// Solo acepta pedidos que vienen del API Gateway (custom header)
app.use((req, res, next) => {
  if (req.get('x-gateway-secret') !== GATEWAY_SECRET) {
    return res.status(403).json({ mensaje: 'Acceso solo a través del API Gateway' });
  }
  next();
});

// RUTAS
app.post('/users', controlador.registrar);
app.post('/session', controlador.login);

modelo
  .conectar(process.env.MONGO_URI)
  .then(() => app.listen(PUERTO, () => console.log(`[usuarios] Escuchando en el puerto ${PUERTO}`)))
  .catch((e) => {
    console.error('[usuarios] No se pudo conectar a la base de datos:', e.message);
    process.exit(1);
  });
