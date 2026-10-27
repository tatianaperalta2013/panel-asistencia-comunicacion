// API STATUS (puerto 4002): guarda los valores y calcula el promedio de cada sala.
require('dotenv').config();
const express = require('express');
const modelo = require('./modelo');
const controlador = require('./controlador');

const PUERTO = Number(process.env.PORT) || 4002;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'clave-de-desarrollo-gateway';

const app = express();
app.use(express.json());

// Para que Render sepa que el servicio está vivo
app.get('/health', (req, res) => res.json({ estado: 'ok' }));

// Solo acepta pedidos del API Gateway, que además manda quién es el usuario
app.use((req, res, next) => {
  if (req.get('x-gateway-secret') !== GATEWAY_SECRET || !req.get('x-usuario-id')) {
    return res.status(403).json({ mensaje: 'Acceso solo a través del API Gateway' });
  }
  next();
});

// RUTAS
app.post('/status/:salaId/valores', controlador.valores);

modelo
  .conectar(process.env.MONGO_URI)
  .then(() => app.listen(PUERTO, () => console.log(`[status] Escuchando en el puerto ${PUERTO}`)))
  .catch((e) => {
    console.error('[status] No se pudo conectar a la base de datos:', e.message);
    process.exit(1);
  });
