// API Gateway (puerto 3000): única puerta de entrada al backend.
// - Rutas /api/auth/*  → públicas → Servicio Usuarios
// - Rutas /api/salas/* → piden JWT → Servicio Status
const express = require('express');
const cors = require('cors');
const config = require('./config');
const verificarJWT = require('./middlewares/verificarJWT');
const reenviar = require('./proxy');

const app = express();

app.use(
  cors({
    // Si no se configuró FRONTEND_URL, se permite cualquier origen
    origin: config.origenesPermitidos.length ? config.origenesPermitidos : true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ servicio: 'gateway', estado: 'ok' }));

// ---- Rutas públicas → Servicio Usuarios ----
app.post('/api/auth/registro', reenviar(config.usuariosUrl, '/usuarios')); // S1
app.post('/api/auth/login', reenviar(config.usuariosUrl, '/sesiones')); // S2

// ---- Rutas protegidas → Servicio Status ----
// El JWT se valida acá, una sola vez, y no en cada servicio
const aStatus = reenviar(config.statusUrl, (req) => req.originalUrl.replace(/^\/api/, ''));

app.post('/api/salas', verificarJWT, aStatus); // S3
app.post('/api/salas/:codigo/participantes', verificarJWT, aStatus); // S4
app.put('/api/salas/:codigo/estado', verificarJWT, aStatus); // S5
app.get('/api/salas/:codigo/promedio', verificarJWT, aStatus); // S6
app.delete('/api/salas/:codigo/participantes/yo', verificarJWT, aStatus); // S7
app.patch('/api/salas/:codigo', verificarJWT, aStatus); // S8

app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));

app.listen(config.puerto, () => {
  console.log(`[gateway] Escuchando en el puerto ${config.puerto}`);
  console.log(`[gateway] Usuarios → ${config.usuariosUrl}`);
  console.log(`[gateway] Status   → ${config.statusUrl}`);
});
