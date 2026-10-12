// Levanta todo el proyecto en tu compu con un solo comando: npm start
//   - Servicio Usuarios  → http://localhost:4001
//   - Servicio Status    → http://localhost:4002
//   - API Gateway        → http://localhost:3000
//   - Frontend           → http://localhost:5500  (abrir esta en el navegador)
// Para cortar todo: Ctrl + C
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const servicios = [
  { nombre: 'usuarios', carpeta: 'servicio-usuarios' },
  { nombre: 'status', carpeta: 'servicio-status' },
  { nombre: 'gateway', carpeta: 'gateway' },
];

const procesos = servicios.map(({ nombre, carpeta }) => {
  const proceso = spawn(process.execPath, ['src/index.js'], {
    cwd: path.join(__dirname, carpeta),
    stdio: 'inherit',
    env: process.env,
  });
  proceso.on('exit', (codigo) => {
    if (codigo) console.log(`[${nombre}] se detuvo (código ${codigo})`);
  });
  return proceso;
});

// Servidor simple para el frontend (en producción lo sirve Vercel)
const carpetaFrontend = path.join(__dirname, 'frontend');
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

http
  .createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let archivo = path.join(carpetaFrontend, ruta === '/' ? 'index.html' : ruta);
    if (!archivo.startsWith(carpetaFrontend) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
      archivo = path.join(carpetaFrontend, 'index.html');
    }
    res.writeHead(200, { 'content-type': (tipos[path.extname(archivo)] || 'text/plain') + '; charset=utf-8' });
    fs.createReadStream(archivo).pipe(res);
  })
  .listen(5500, () => {
    console.log('\n[frontend] Abrí http://localhost:5500 en el navegador\n');
  });

process.on('SIGINT', () => {
  procesos.forEach((p) => p.kill());
  process.exit(0);
});
