// Dirección del API Gateway.
// En la compu usa localhost; publicado usa la URL de Render.
// 👉 Después de publicar el gateway en Render, poné su URL acá (sin / al final).
const GATEWAY_PRODUCCION = 'https://TU-GATEWAY.onrender.com';

const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_URL = esLocal ? 'http://localhost:3000' : GATEWAY_PRODUCCION;
