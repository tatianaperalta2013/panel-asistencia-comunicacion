// RUTAS: qué URL atiende el servicio y qué controlador la resuelve.
const { Router } = require('express');
const controller = require('../controladores/usuariosController');

const router = Router();

router.post('/usuarios', controller.registrar); // S1 — Registro
router.post('/sesiones', controller.login); // S2 — Login

module.exports = router;
