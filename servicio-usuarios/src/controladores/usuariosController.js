// CONTROLADOR: recibe el pedido HTTP, llama al servicio y arma la respuesta.
const usuariosService = require('../servicios/usuariosService');

function manejarError(error, res) {
  if (error instanceof usuariosService.ErrorNegocio) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  console.error('[usuarios]', error);
  return res.status(500).json({ mensaje: 'Error interno del servidor' });
}

// POST /usuarios
async function registrar(req, res) {
  try {
    const { usuario, email, password } = req.body || {};
    const creado = await usuariosService.registrar({ usuario, email, password });
    res.status(201).json(creado);
  } catch (error) {
    manejarError(error, res);
  }
}

// POST /sesiones
async function login(req, res) {
  try {
    const { usuario, password } = req.body || {};
    const sesion = await usuariosService.login({ usuario, password });
    res.status(200).json(sesion);
  } catch (error) {
    manejarError(error, res);
  }
}

module.exports = { registrar, login };
