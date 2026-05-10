// Patron Estructural: Decorator
// Agrega permisos o responsabilidades adicionales a un perfil base en tiempo de ejecucion
// sin modificar la clase original ni crear subclases nuevas.

class DecoradorPerfil {
  constructor(perfilBase) {
    this.base     = perfilBase;
    this.id       = perfilBase.id;
    this.nombre   = perfilBase.nombre;
    this.turno    = perfilBase.turno;
    this.activo   = perfilBase.activo;
    this.permisos = new Set(perfilBase.permisos);
    this.decoraciones = [];
  }

  getRol()         { return this.base.getRol(); }
  getNivelAcceso() { return this.base.getNivelAcceso(); }
  tienePermiso(p)  { return this.permisos.has(p); }

  agregarPermiso(permiso, motivo, expiresMin = 60) {
    this.permisos.add(permiso);
    const expira = new Date(Date.now() + expiresMin * 60000).toISOString();
    this.decoraciones.push({ permiso, motivo, expira, otorgadoEn: new Date().toISOString() });
  }

  revocarPermiso(permiso) {
    this.permisos.delete(permiso);
    this.decoraciones = this.decoraciones.filter(d => d.permiso !== permiso);
  }

  getDecoraciones() { return [...this.decoraciones]; }
}

export class DecoradorAccesoTemporal extends DecoradorPerfil {
  constructor(perfilBase, permiso, motivo, expiresMin = 60) {
    super(perfilBase);
    this.agregarPermiso(permiso, motivo, expiresMin);
  }
}

export class DecoradorNivelElevado extends DecoradorPerfil {
  constructor(perfilBase, motivo) {
    super(perfilBase);
    this.#nivelExtra = 1;
    this.#motivo     = motivo;
    this.decoraciones.push({
      permiso: 'nivel_elevado',
      motivo,
      expira: new Date(Date.now() + 8 * 3600000).toISOString(),
      otorgadoEn: new Date().toISOString()
    });
  }

  #nivelExtra = 0;
  #motivo     = '';
  getNivelAcceso() { return this.base.getNivelAcceso() + this.#nivelExtra; }
}

export { DecoradorPerfil };
