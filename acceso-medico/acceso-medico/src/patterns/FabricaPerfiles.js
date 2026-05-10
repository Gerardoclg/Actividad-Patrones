// Patron Creacional: Factory Method
// Instancia dinamicamente distintos tipos de perfil (Medico, Enfermero, Administrador, Seguridad).
// Cada subclase define sus propios permisos base sin alterar la interfaz comun.

class PerfilUsuario {
  constructor(id, nombre, turno) {
    this.id     = id;
    this.nombre = nombre;
    this.turno  = turno;
    this.activo = true;
    this.permisos = new Set(this.permisosBase());
  }

  permisosBase()   { return []; }
  getRol()         { throw new Error('Abstracto'); }
  getNivelAcceso() { throw new Error('Abstracto'); }

  tienePermiso(permiso) { return this.permisos.has(permiso); }
}

class Medico extends PerfilUsuario {
  getRol()         { return 'Medico'; }
  getNivelAcceso() { return 3; }
  permisosBase()   { return ['urgencias', 'quirofano', 'laboratorio', 'uci', 'historiales']; }
}

class Enfermero extends PerfilUsuario {
  getRol()         { return 'Enfermero'; }
  getNivelAcceso() { return 2; }
  permisosBase()   { return ['urgencias', 'salas generales', 'historiales']; }
}

class Administrador extends PerfilUsuario {
  getRol()         { return 'Administrador'; }
  getNivelAcceso() { return 2; }
  permisosBase()   { return ['administracion', 'recursos humanos', 'archivos']; }
}

class Seguridad extends PerfilUsuario {
  getRol()         { return 'Seguridad'; }
  getNivelAcceso() { return 1; }
  permisosBase()   { return ['acceso principal', 'vigilancia', 'estacionamiento']; }
}

// el factory method decide que clase concreta instanciar segun el tipo solicitado
export class FabricaPerfiles {
  static crear(tipo, id, nombre, turno) {
    const normalizado = tipo
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const tipos = { Medico, Enfermero, Administrador, Seguridad };
    const Clase = tipos[normalizado];
    if (!Clase) throw new Error(`Tipo de perfil desconocido: ${tipo}`);
    return new Clase(id, nombre, turno);
  }

  static tiposDisponibles() {
    return ['Medico', 'Enfermero', 'Administrador', 'Seguridad'];
  }
}
