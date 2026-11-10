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

// Mensajes para cuando un servicio responde algo que no es nuestra API (ej: Render despertando)
const MENSAJES_SERVICIO = {
  429: 'Demasiados pedidos seguidos. Esperá unos segundos',
  502: 'El servicio no responde, probá en unos segundos',
  503: 'El servicio se está iniciando. Esperá un minuto',
  504: 'El servicio tardó demasiado en responder',
};

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
      const conCuerpo = !['GET', 'HEAD', 'DELETE'].includes(req.method);
      const pedirAlServicio = () =>
        fetch(urlApi + req.originalUrl, {
          method: req.method,
          headers,
          body: conCuerpo ? JSON.stringify(req.body || {}) : undefined,
          signal: AbortSignal.timeout(60000), // Render gratis tarda en "despertar"
        });

      // Render a veces limita (429) o está iniciando (503) el servicio: se reintenta hasta 3 veces,
      // esperando 1 s, 2 s y 4 s, antes de devolverle el error al frontend
      let respuesta = await pedirAlServicio();
      for (let intento = 1; intento <= 3 && [429, 503].includes(respuesta.status); intento++) {
        console.warn(`[gateway] ${urlApi} respondió ${respuesta.status}, reintento ${intento} de 3`);
        await new Promise((listo) => setTimeout(listo, 1000 * 2 ** (intento - 1)));
        respuesta = await pedirAlServicio();
      }
      const texto = await respuesta.text();
      try {
        // Respuesta normal de nuestra API (JSON): se devuelve tal cual
        res.status(respuesta.status).json(texto ? JSON.parse(texto) : {});
      } catch {
        // No es JSON (por ejemplo, una página de error de Render): se arma un mensaje claro
        console.error(`[gateway] Respuesta no JSON de ${urlApi} (código ${respuesta.status})`);
        res.status(respuesta.status).json({ mensaje: MENSAJES_SERVICIO[respuesta.status] || 'El servicio respondió con un error' });
      }
    } catch (e) {
      console.error('[gateway]', e.message);
      if (e.name === 'TimeoutError') {
        return res.status(504).json({ mensaje: 'El servicio tardó demasiado en responder' });
      }
      res.status(502).json({ mensaje: 'El servicio no responde, probá en unos segundos' });
    }
  };
}

// RUTAS
app.post('/users', reenviarA(USUARIOS_URL)); // registro (pública)
app.post('/session', reenviarA(USUARIOS_URL)); // login (pública) — Diagrama 1
app.post('/salas', validarJWT, reenviarA(STATUS_URL)); // crea una reunión
app.get('/salas/:codigo', validarJWT, reenviarA(STATUS_URL)); // valida que la reunión exista antes de entrar
app.post('/status/:salaId/valores', validarJWT, reenviarA(STATUS_URL)); // guarda y devuelve promedio — Diagrama 2
app.get('/status/:salaId/promedio', validarJWT, reenviarA(STATUS_URL)); // solo lee el promedio (botón Actualizar)
app.get('/status/:salaId/historial', validarJWT, reenviarA(STATUS_URL)); // evolución del promedio (gráfico)
app.delete('/status/:salaId/valores', validarJWT, reenviarA(STATUS_URL)); // sale de la sala

// Ruta inexistente → 404 con mensaje claro
app.use((req, res) => res.status(404).json({ mensaje: `No existe la ruta ${req.method} ${req.path}` }));

// JSON mal formado u otro error inesperado → 400 / 500
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'El cuerpo del pedido no es un JSON válido' });
  console.error('[gateway]', err);
  res.status(500).json({ mensaje: 'Error interno del gateway' });
});

app.listen(PUERTO, () => {
  console.log(`[gateway] Escuchando en el puerto ${PUERTO}`);
  console.log(`[gateway] API Usuarios → ${USUARIOS_URL}`);
  console.log(`[gateway] API Status   → ${STATUS_URL}`);
});
