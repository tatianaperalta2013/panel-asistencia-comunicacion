// Solo acepta pedidos que vienen del API Gateway.
// El gateway manda una clave secreta en el header X-Gateway-Secret.
const config = require('../config');

function soloGateway(req, res, next) {
  if (req.get('x-gateway-secret') !== config.gatewaySecret) {
    return res.status(403).json({ mensaje: 'Acceso solo a través del API Gateway' });
  }
  next();
}

module.exports = soloGateway;
