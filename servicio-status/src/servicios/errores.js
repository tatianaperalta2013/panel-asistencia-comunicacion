// Error con código HTTP, para que el controlador sepa qué responder
class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

module.exports = { ErrorNegocio };
