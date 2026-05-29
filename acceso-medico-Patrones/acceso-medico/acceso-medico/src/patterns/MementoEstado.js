// Patron de Comportamiento: Memento
// Guarda instantaneas del estado del sistema para auditoria y recuperacion.
// Permite revertir a un punto seguro sin exponer la estructura interna del estado.

class MomentoSistema {
  #estado;
  #fecha;
  #descripcion;

  constructor(estado, descripcion) {
    this.#estado      = JSON.parse(JSON.stringify(estado));
    this.#fecha       = new Date().toISOString();
    this.#descripcion = descripcion;
  }

  getEstado()      { return JSON.parse(JSON.stringify(this.#estado)); }
  getFecha()       { return this.#fecha; }
  getDescripcion() { return this.#descripcion; }
}

// el Cuidador administra el historial de momentos sin acceder a su contenido interno
export class CuidadorEstado {
  #historial = [];
  #limite    = 20;

  guardar(estado, descripcion) {
    const momento = new MomentoSistema(estado, descripcion);
    this.#historial.push(momento);
    if (this.#historial.length > this.#limite)
      this.#historial.shift();
    return momento;
  }

  obtenerHistorial() {
    return this.#historial.map((m, i) => ({
      indice:      i,
      fecha:       m.getFecha(),
      descripcion: m.getDescripcion()
    }));
  }

  restaurar(indice) {
    const momento = this.#historial[indice];
    if (!momento) throw new Error('Momento no encontrado');
    return momento.getEstado();
  }

  ultimo() {
    const m = this.#historial[this.#historial.length - 1];
    return m ? m.getEstado() : null;
  }

  total() { return this.#historial.length; }
}
