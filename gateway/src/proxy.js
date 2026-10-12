// Reenvía un pedido a un servicio y devuelve su respuesta tal cual.
// Agrega la clave del gateway y, si hay usuario logueado, los headers X-Usuario-*.
const config = require('./config');

function reenviar(urlServicio, rutaDestino) {
  return async (req, res) => {
    // rutaDestino puede ser un texto fijo o una función que arma la ruta
    const ruta = typeof rutaDestino === 'function' ? rutaDestino(req) : rutaDestino;

    const headers = {
      'content-type': 'application/json',
      'x-gateway-secret': config.gatewaySecret,
    };
    if (req.usuario) {
      headers['x-usuario-id'] = req.usuario.id;
      headers['x-usuario-nombre'] = req.usuario.nombre;
    }

    const tieneCuerpo = !['GET', 'DELETE'].includes(req.method);

    try {
      const respuesta = await fetch(urlServicio + ruta, {
        method: req.method,
        headers,
        body: tieneCuerpo ? JSON.stringify(req.body || {}) : undefined,
        // 60 s: en Render gratis los servicios tardan en "despertar"
        signal: AbortSignal.timeout(60000),
      });

      const texto = await respuesta.text();
      res.status(respuesta.status);
      if (texto) {
        res.type('application/json').send(texto);
      } else {
        res.end();
      }
    } catch (error) {
      console.error(`[gateway] No responde ${urlServicio}:`, error.message);
      res.status(502).json({ mensaje: 'El servicio no está disponible, probá de nuevo en unos segundos' });
    }
  };
}

module.exports = reenviar;
