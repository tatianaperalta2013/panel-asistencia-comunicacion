// Convierte los errores del servicio en respuestas HTTP
const { ErrorNegocio } = require('../servicios/errores');

function manejarError(error, res) {
  if (error instanceof ErrorNegocio) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  console.error('[status]', error);
  return res.status(500).json({ mensaje: 'Error interno del servidor' });
}

module.exports = manejarError;
