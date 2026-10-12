// Todas las llamadas al API Gateway pasan por acá.
// Agrega el JWT automáticamente y convierte los errores en mensajes claros.
// Todo va dentro de una función para no chocar con nombres de app.js;
// lo único que se comparte es window.Api.
(() => {
  class ErrorApi extends Error {
    constructor(status, mensaje) {
      super(mensaje);
      this.status = status;
    }
  }

  const Sesion = {
    guardar(token, usuario) {
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', usuario);
    },
    token: () => localStorage.getItem('token'),
    usuario: () => localStorage.getItem('usuario'),
    cerrar() {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    },
  };

  async function pedir(metodo, ruta, cuerpo) {
    const headers = { 'Content-Type': 'application/json' };
    const token = Sesion.token();
    if (token) headers.Authorization = `Bearer ${token}`;

    let respuesta;
    try {
      respuesta = await fetch(window.CONFIG.API_URL + ruta, {
        method: metodo,
        headers,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
    } catch (error) {
      throw new ErrorApi(0, 'No se pudo conectar con el servidor');
    }

    if (respuesta.status === 204) return null;

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new ErrorApi(respuesta.status, datos.mensaje || 'Ocurrió un error');
    }
    return datos;
  }

  const sala = (codigo) => `/salas/${encodeURIComponent(codigo)}`;

  window.Api = {
    ErrorApi,
    Sesion,
    registrar: (usuario, email, password) => pedir('POST', '/auth/registro', { usuario, email, password }), // S1
    login: (usuario, password) => pedir('POST', '/auth/login', { usuario, password }), // S2
    crearSala: (nombre) => pedir('POST', '/salas', { nombre }), // S3
    unirse: (codigo) => pedir('POST', `${sala(codigo)}/participantes`), // S4
    enviarEstado: (codigo, valores) => pedir('PUT', `${sala(codigo)}/estado`, valores), // S5
    promedio: (codigo) => pedir('GET', `${sala(codigo)}/promedio`), // S6
    salir: (codigo) => pedir('DELETE', `${sala(codigo)}/participantes/yo`), // S7
    finalizar: (codigo) => pedir('PATCH', sala(codigo), { estado: 'finalizada' }), // S8
  };
})();
