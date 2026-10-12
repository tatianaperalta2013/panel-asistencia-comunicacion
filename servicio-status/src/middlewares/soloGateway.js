// Solo acepta pedidos que vienen del API Gateway y toma el usuario
// que el gateway agregó en el header X-Usuario-Id (después de validar el JWT).
const config = require('../config');

function soloGateway(req, res, next) {
  if (req.get('x-gateway-secret') !== config.gatewaySecret) {
    return res.status(403).json({ mensaje: 'Acceso solo a través del API Gateway' });
  }
  const usuarioId = req.get('x-usuario-id');
  if (!usuarioId) {
    return res.status(401).json({ mensaje: 'Falta el usuario' });
  }
  req.usuarioId = usuarioId;
  next();
}

module.exports = soloGateway;
