// Patron de Arquitectura: MVC — Modelo
// Gestiona los datos del personal, registros de acceso y el estado de alerta del sistema.
// No conoce la Vista ni el Controlador; solo expone y muta datos.

export class ModeloSistema {
  #personal    = new Map();
  #registros   = [];
  #nivelAlerta = 'NORMAL';
  #observadores = [];

  agregarPersonal(perfil) {
    this.#personal.set(perfil.id, perfil);
    this.#notificar('personal');
  }

  obtenerPersonal(id)    { return this.#personal.get(id); }
  obtenerTodoElPersonal() { return [...this.#personal.values()]; }

  registrarAcceso(entrada) {
    this.#registros.push({ ...entrada, timestamp: new Date().toISOString() });
    this.#notificar('registros');
  }

  obtenerRegistros()  { return [...this.#registros]; }

  setNivelAlerta(nivel) {
    this.#nivelAlerta = nivel;
    this.#notificar('alerta');
  }

  getNivelAlerta() { return this.#nivelAlerta; }

  suscribir(fn) { this.#observadores.push(fn); }

  #notificar(tipo) {
    this.#observadores.forEach(fn => fn(tipo));
  }
}
