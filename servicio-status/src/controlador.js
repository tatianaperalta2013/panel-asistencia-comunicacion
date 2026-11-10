// CONTROLADOR: recibe el pedido HTTP, llama al servicio y arma la respuesta.
const servicio = require('./servicio');

function responderError(res, e) {
  if (e.status) return res.status(e.status).json({ mensaje: e.message });
  console.error('[status]', e);
  res.status(500).json({ mensaje: 'Error en la base de datos' });
}

// POST /salas → 201 (created) {codigo, nombre, creada}, 400 si el nombre no es válido, 500 si falla la BDD
async function crearSala(req, res) {
  try {
    const sala = await servicio.crearSala((req.body || {}).nombre, req.get('x-usuario-id'));
    res.status(201).json(sala);
  } catch (e) {
    responderError(res, e);
  }
}

// GET /salas/:codigo → 200 OK {codigo, nombre, creada} o 404 si no existe
async function obtenerSala(req, res) {
  try {
    res.status(200).json(await servicio.obtenerSala(String(req.params.codigo).trim().toUpperCase()));
  } catch (e) {
    responderError(res, e);
  }
}

// Datos comunes de cada pedido
function datosDelPedido(req) {
  return {
    salaId: String(req.params.salaId).trim().toUpperCase(),
    usuarioId: req.get('x-usuario-id'), // custom header que agrega el Gateway
  };
}

// POST /status/:salaId/valores → 200 OK {X, Y, Z, W, participantes}, 400 valores inválidos, 404 reunión inexistente, 500 si falla la BDD
async function valores(req, res) {
  try {
    const { salaId, usuarioId } = datosDelPedido(req);
    res.status(200).json(await servicio.registrarYPromediar(salaId, usuarioId, req.body || {}));
  } catch (e) {
    responderError(res, e);
  }
}

// GET /status/:salaId/promedio → 200 OK {X, Y, Z, W, participantes}, 404 reunión inexistente, 500 si falla la BDD
async function promedio(req, res) {
  try {
    const { salaId } = datosDelPedido(req);
    res.status(200).json(await servicio.promediar(salaId, true));
  } catch (e) {
    responderError(res, e);
  }
}

// GET /status/:salaId/historial → 200 OK {minutos, puntos: [{fecha, X, Y, Z, W, participantes}]}, 404 reunión inexistente
async function historial(req, res) {
  try {
    const { salaId } = datosDelPedido(req);
    res.status(200).json(await servicio.historial(salaId));
  } catch (e) {
    responderError(res, e);
  }
}

// DELETE /status/:salaId/valores → 204 No Content o 500 si falla la BDD
async function salir(req, res) {
  try {
    const { salaId, usuarioId } = datosDelPedido(req);
    await servicio.salir(salaId, usuarioId);
    res.status(204).end();
  } catch (e) {
    responderError(res, e);
  }
}

module.exports = { crearSala, obtenerSala, valores, promedio, historial, salir };
