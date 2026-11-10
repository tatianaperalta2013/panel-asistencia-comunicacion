// Levanta los 3 microservicios del backend en UN solo servidor de Render.
//
// ¿Por qué? En el plan gratis de Render, cuando el Gateway llamaba a los otros servicios
// por Internet (https://...onrender.com), Render limitaba los pedidos (error 429) porque
// salen por una IP compartida con muchos otros proyectos. Además, el plan gratis no permite
// recibir tráfico por la red privada de Render.
//
// Solución: los 3 servicios siguen siendo independientes (cada uno con su carpeta, su código,
// su base de datos y su puerto), pero corren en el mismo servidor y se hablan por localhost:
//   - API Gateway       → puerto que asigna Render (público)
//   - Servicio Usuarios → http://127.0.0.1:4001 (interno)
//   - Servicio Status   → http://127.0.0.1:4002 (interno)
//
// En Render:  Build Command: npm install   ·   Start Command: npm run backend
// Variables:  MONGO_URI_USUARIOS, MONGO_URI_STATUS, JWT_SECRET, GATEWAY_SECRET, FRONTEND_URL (opcional)
const { spawn } = require('child_process');
const path = require('path');

const PUERTO_USUARIOS = 4001;
const PUERTO_STATUS = 4002;
const comun = {
  JWT_SECRET: process.env.JWT_SECRET,
  GATEWAY_SECRET: process.env.GATEWAY_SECRET,
};

const servicios = [
  {
    nombre: 'usuarios',
    carpeta: 'servicio-usuarios',
    env: { ...comun, PORT: PUERTO_USUARIOS, MONGO_URI: process.env.MONGO_URI_USUARIOS || process.env.MONGO_URI },
  },
  {
    nombre: 'status',
    carpeta: 'servicio-status',
    env: { ...comun, PORT: PUERTO_STATUS, MONGO_URI: process.env.MONGO_URI_STATUS || process.env.MONGO_URI },
  },
  {
    nombre: 'gateway',
    carpeta: 'gateway',
    env: {
      ...comun,
      PORT: process.env.PORT || 3000,
      USUARIOS_URL: `http://127.0.0.1:${PUERTO_USUARIOS}`,
      STATUS_URL: `http://127.0.0.1:${PUERTO_STATUS}`,
      FRONTEND_URL: process.env.FRONTEND_URL,
    },
  },
];

const faltan = ['JWT_SECRET', 'GATEWAY_SECRET'].filter((clave) => !process.env[clave]);
if (faltan.length) console.warn(`[backend] Faltan variables: ${faltan.join(', ')} (se usan claves de desarrollo)`);

const procesos = servicios.map(({ nombre, carpeta, env }) => {
  // Solo se pasan las variables definidas (las vacías se descartan)
  const variables = Object.fromEntries(Object.entries(env).filter(([, valor]) => valor !== undefined && valor !== ''));
  const proceso = spawn(process.execPath, ['src/index.js'], {
    cwd: path.join(__dirname, carpeta),
    stdio: 'inherit',
    env: { PATH: process.env.PATH, NODE_ENV: process.env.NODE_ENV, ...variables },
  });
  // Si un servicio se cae, se corta todo para que Render reinicie el servidor completo
  proceso.on('exit', (codigo) => {
    console.error(`[backend] El servicio ${nombre} se detuvo (código ${codigo}). Reiniciando todo…`);
    procesos.forEach((p) => p !== proceso && p.kill());
    process.exit(1);
  });
  return proceso;
});

const cortar = () => {
  procesos.forEach((p) => p.kill());
  process.exit(0);
};
process.on('SIGTERM', cortar);
process.on('SIGINT', cortar);
