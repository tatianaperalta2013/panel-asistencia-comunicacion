// CONTROLADOR de salas: traduce HTTP <-> servicio.
const salasService = require('../servicios/salasService');
const manejarError = require('./manejarError');

// POST /salas
async function crear(req, res) {
  try {
    const sala = await salasService.crearSala({ nombre: req.body?.nombre, usuarioId: req.usuarioId });
    res.status(201).json(sala);
  } catch (error) {
    manejarError(error, res);
  }
}

// POST /salas/:codigo/participantes
async function unirse(req, res) {
  try {
    const sala = await salasService.unirse({ codigo: req.params.codigo, usuarioId: req.usuarioId });
    res.status(200).json(sala);
  } catch (error) {
    manejarError(error, res);
  }
}

// DELETE /salas/:codigo/participantes/yo
async function salir(req, res) {
  try {
    await salasService.salir({ codigo: req.params.codigo, usuarioId: req.usuarioId });
    res.status(204).end();
  } catch (error) {
    manejarError(error, res);
  }
}

// PATCH /salas/:codigo  { estado: "finalizada" }
async function actualizar(req, res) {
  try {
    if (req.body?.estado !== 'finalizada') {
      return res.status(400).json({ mensaje: 'Solo se puede cambiar el estado a "finalizada"' });
    }
    const resultado = await salasService.finalizar({ codigo: req.params.codigo, usuarioId: req.usuarioId });
    res.status(200).json(resultado);
  } catch (error) {
    manejarError(error, res);
  }
}

module.exports = { crear, unirse, salir, actualizar };
