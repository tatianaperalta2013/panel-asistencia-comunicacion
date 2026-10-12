// Punto de entrada del Servicio Status (puerto 4002)
const express = require('express');
const config = require('./config');
const { conectar } = require('./db');
const soloGateway = require('./middlewares/soloGateway');
const salasRutas = require('./rutas/salasRutas');

const app = express();
app.use(express.json());

// Para que Render sepa que el servicio está vivo (no pasa por el gateway)
app.get('/health', (req, res) => res.json({ servicio: 'status', estado: 'ok' }));

app.use(soloGateway);
app.use(salasRutas);

app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));

conectar()
  .then(() => {
    app.listen(config.puerto, () => {
      console.log(`[status] Escuchando en el puerto ${config.puerto}`);
    });
  })
  .catch((error) => {
    console.error('[status] No se pudo conectar a la base de datos:', error.message);
    process.exit(1);
  });
