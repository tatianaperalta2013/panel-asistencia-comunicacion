// Punto de entrada del Servicio Usuarios (puerto 4001)
const express = require('express');
const config = require('./config');
const { conectar } = require('./db');
const soloGateway = require('./middlewares/soloGateway');
const usuariosRutas = require('./rutas/usuariosRutas');

const app = express();
app.use(express.json());

// Para que Render sepa que el servicio está vivo (no pasa por el gateway)
app.get('/health', (req, res) => res.json({ servicio: 'usuarios', estado: 'ok' }));

app.use(soloGateway);
app.use(usuariosRutas);

app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));

conectar()
  .then(() => {
    app.listen(config.puerto, () => {
      console.log(`[usuarios] Escuchando en el puerto ${config.puerto}`);
    });
  })
  .catch((error) => {
    console.error('[usuarios] No se pudo conectar a la base de datos:', error.message);
    process.exit(1);
  });
