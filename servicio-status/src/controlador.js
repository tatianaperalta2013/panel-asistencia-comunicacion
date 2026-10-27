// CONTROLADOR: recibe el pedido HTTP, llama al servicio y arma la respuesta.
const servicio = require('./servicio');

// POST /status/:salaId/valores → 200 OK {X, Y, Z, W} o 500 si falla la BDD
async function valores(req, res) {
  try {
    const salaId = String(req.params.salaId).trim().toUpperCase();
    const usuarioId = req.get('x-usuario-id'); // custom header que agrega el Gateway
    const promedios = await servicio.registrarYPromediar(salaId, usuarioId, req.body || {});
    res.status(200).json(promedios);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ mensaje: e.message });
    console.error('[status]', e);
    res.status(500).json({ mensaje: 'Error en la base de datos' });
  }
}

module.exports = { valores };
