// CONTROLADOR: recibe el pedido HTTP, llama al servicio y arma la respuesta.
const servicio = require('./servicio');

function responderError(res, e) {
  if (e.status) return res.status(e.status).json({ mensaje: e.message });
  console.error('[usuarios]', e);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
}

// POST /users
async function registrar(req, res) {
  try {
    const { usuario, password } = req.body || {};
    res.status(201).json(await servicio.registrar(usuario, password));
  } catch (e) {
    responderError(res, e);
  }
}

// POST /session → 201 (created) {JWT} o 401 (unauthorized)
async function login(req, res) {
  try {
    const { usuario, password } = req.body || {};
    res.status(201).json(await servicio.login(usuario, password));
  } catch (e) {
    responderError(res, e);
  }
}

module.exports = { registrar, login };
