// Dirección del API Gateway.
// En tu compu usa localhost; publicado usa la URL de Render.
// 👉 Después de desplegar el gateway en Render, reemplazá la URL de abajo.
const API_PRODUCCION = 'https://TU-GATEWAY.onrender.com/api';

const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.CONFIG = {
  API_URL: esLocal ? 'http://localhost:3000/api' : API_PRODUCCION,
  // Cada cuánto se pide el promedio (S6)
  INTERVALO_PROMEDIO_MS: 3000,
  // Cuánto se espera después de mover un slider para guardarlo (S5)
  ESPERA_SLIDER_MS: 500,
};
