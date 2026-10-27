// API GATEWAY (puerto 3000): la única puerta de entrada al backend.
// - Valida el JWT
// - Reenvía cada pedido a la API que corresponde, agregando custom headers
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const PUERTO = Number(process.env.PORT) || 3000;
const USUARIOS_URL = (process.env.USUARIOS_URL || 'http://localhost:4001').replace(/\/$/, '');
const STATUS_URL = (process.env.STATUS_URL || 'http://localhost:4002').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'clave-de-desarrollo-jwt';
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'clave-de-desarrollo-gateway';
const FRONTEND_URL = process.env.FRONTEND_URL; // URL de Vercel (vacío = cualquiera)

const app = express();
app.use(cors({ origin: FRONTEND_URL || true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ estado: 'ok' }));

// "Valida JWT": si es válido, guarda el usuario en req.usuario
function validarJWT(req, res, next) {
  const token = (req.get('authorization') || '').replace('Bearer ', '');
  try {
    const datos = jwt.verify(token, JWT_SECRET);
    req.usuario = { id: datos.id, nombre: datos.usuario };
    next();
  } catch (e) {
    res.status(401).json({ mensaje: 'Unauthorized: iniciá sesión de nuevo' });
  }
}

// "Reenvía request": manda el pedido a la API y devuelve la respuesta tal cual
function reenviarA(urlApi) {
  return async (req, res) => {
    const headers = { 'content-type': 'application/json', 'x-gateway-secret': GATEWAY_SECRET };
    if (req.usuario) {
      // Custom headers: la API sabe quién es el usuario sin volver a validar el JWT
      headers['x-usuario-id'] = req.usuario.id;
      headers['x-usuario-nombre'] = req.usuario.nombre;
    }
    try {
      const respuesta = await fetch(urlApi + req.originalUrl, {
        method: req.method,
        headers,
        body: JSON.stringify(req.body || {}),
        signal: AbortSignal.timeout(60000), // Render gratis tarda en "despertar"
      });
      const texto = await respuesta.text();
      res.status(respuesta.status).type('application/json').send(texto || '{}');
    } catch (e) {
      console.error('[gateway]', e.message);
      res.status(502).json({ mensaje: 'El servicio no responde, probá en unos segundos' });
    }
  };
}

// RUTAS
app.post('/users', reenviarA(USUARIOS_URL)); // registro (pública)
app.post('/session', reenviarA(USUARIOS_URL)); // login (pública) — Diagrama 1
app.post('/status/:salaId/valores', validarJWT, reenviarA(STATUS_URL)); // Diagrama 2

app.listen(PUERTO, () => {
  console.log(`[gateway] Escuchando en el puerto ${PUERTO}`);
  console.log(`[gateway] API Usuarios → ${USUARIOS_URL}`);
  console.log(`[gateway] API Status   → ${STATUS_URL}`);
});
