// CONTROLADOR de estados: traduce HTTP <-> servicio.
const estadosService = require('../servicios/estadosService');
const manejarError = require('./manejarError');

// PUT /salas/:codigo/estado
async function guardar(req, res) {
  try {
    await estadosService.guardarEstado({
      codigo: req.params.codigo,
      usuarioId: req.usuarioId,
      body: req.body,
    });
    res.status(204).end();
  } catch (error) {
    manejarError(error, res);
  }
}

// GET /salas/:codigo/promedio
async function promedio(req, res) {
  try {
    const resultado = await estadosService.obtenerPromedio({
      codigo: req.params.codigo,
      usuarioId: req.usuarioId,
    });
    res.status(200).json(resultado);
  } catch (error) {
    manejarError(error, res);
  }
}

module.exports = { guardar, promedio };
