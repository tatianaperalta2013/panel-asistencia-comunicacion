// RUTAS del Servicio Status
const { Router } = require('express');
const salas = require('../controladores/salasController');
const estados = require('../controladores/estadosController');

const router = Router();

router.post('/salas', salas.crear); // S3 — Crear reunión
router.post('/salas/:codigo/participantes', salas.unirse); // S4 — Unirse
router.put('/salas/:codigo/estado', estados.guardar); // S5 — Enviar mi estado
router.get('/salas/:codigo/promedio', estados.promedio); // S6 — Ver promedio
router.delete('/salas/:codigo/participantes/yo', salas.salir); // S7 — Salir
router.patch('/salas/:codigo', salas.actualizar); // S8 — Finalizar

module.exports = router;
