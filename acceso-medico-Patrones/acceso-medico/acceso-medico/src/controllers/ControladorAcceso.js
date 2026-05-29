// Patrón de Arquitectura: MVC — Controlador
// Recibe las acciones del usuario desde la Vista, aplica la lógica de negocio,
// actualiza el Modelo y coordina los patrones de diseño del sistema.

import { FabricaPerfiles }                               from '../patterns/FabricaPerfiles.js';
import { DecoradorAccesoTemporal, DecoradorNivelElevado } from '../patterns/DecoradorPerfil.js';
import { CuidadorEstado }                                 from '../patterns/MementoEstado.js';

export class ControladorAcceso {
  #modelo;
  #cuidador = new CuidadorEstado();
  #perfilesDecorados = new Map();

  constructor(modelo) {
    this.#modelo = modelo;
    this.#inicializarPersonalDemo();
  }

  // acciones sobre el personal 

  registrarPersonal(tipo, id, nombre, turno) {
    if (this.#modelo.obtenerPersonal(id))
      throw new Error(`El ID ${id} ya existe en el sistema`);
    const perfil = FabricaPerfiles.crear(tipo, id, nombre, turno);
    this.#modelo.agregarPersonal(perfil);
    this.#guardarEstado(`Alta de personal: ${nombre} (${tipo})`);
    return perfil;
  }

  otorgarPermisoTemporal(idPersonal, permiso, motivo, minutos = 60) {
    const base = this.#obtenerPerfil(idPersonal);
    const decorado = new DecoradorAccesoTemporal(base, permiso, motivo, minutos);
    this.#perfilesDecorados.set(idPersonal, decorado);
    this.#guardarEstado(`Permiso temporal [${permiso}] otorgado a ${base.nombre}`);
    return decorado;
  }

  elevarNivelAcceso(idPersonal, motivo) {
    const base = this.#obtenerPerfil(idPersonal);
    const decorado = new DecoradorNivelElevado(base, motivo);
    this.#perfilesDecorados.set(idPersonal, decorado);
    this.#guardarEstado(`Nivel elevado otorgado a ${base.nombre}: ${motivo}`);
    return decorado;
  }

  revocarDecoraciones(idPersonal) {
    this.#perfilesDecorados.delete(idPersonal);
    this.#guardarEstado(`Decoraciones revocadas para ID ${idPersonal}`);
  }

  // reglas de restricción por nivel de alerta 
  

  static #REGLAS_ALERTA = {
    NORMAL: {
      nivelMinimo:    1,
      zonasBloqueadas: [],
      descripcion:    'Operación estándar. Sin restricciones adicionales.'
    },
    PRECAUCIÓN: {
      nivelMinimo:    2,
      zonasBloqueadas: ['estacionamiento'],
      descripcion:    'Solo personal de nivel 2 o superior. Estacionamiento cerrado.'
    },
    ALERTA: {
      nivelMinimo:    2,
      zonasBloqueadas: ['estacionamiento', 'archivos', 'administración', 'recursos humanos'],
      descripcion:    'Zonas administrativas bloqueadas. Nivel 2 mínimo requerido.'
    },
    CRÍTICO: {
      nivelMinimo:     3,
      zonasBloqueadas:  ['estacionamiento', 'archivos', 'administración', 'recursos humanos', 'laboratorio', 'quirófano'],
      rolesPermitidos: ['Médico', 'Seguridad'],
      descripcion:     'Solo Médicos y Seguridad. Acceso mínimo de emergencia.'
    }
  };

  // control de acceso 

  validarAcceso(idPersonal, zona) {
    const perfil = this.#obtenerPerfil(idPersonal);
    const activo = this.#perfilesDecorados.get(idPersonal) || perfil;
    const nivel  = this.#modelo.getNivelAlerta();
    const reglas = ControladorAcceso.#REGLAS_ALERTA[nivel];

    let concedido     = activo.tienePermiso(zona);
    let motivoBloqueo = null;

    if (concedido && activo.getNivelAcceso() < reglas.nivelMinimo) {
      concedido     = false;
      motivoBloqueo = `Alerta ${nivel}: se requiere nivel ${reglas.nivelMinimo}, el perfil tiene nivel ${activo.getNivelAcceso()}`;
    }

    if (concedido && reglas.zonasBloqueadas.includes(zona)) {
      concedido     = false;
      motivoBloqueo = `Alerta ${nivel}: zona [${zona}] bloqueada por protocolo de seguridad`;
    }

    if (concedido && reglas.rolesPermitidos && !reglas.rolesPermitidos.includes(activo.getRol())) {
      concedido     = false;
      motivoBloqueo = `Alerta CRÍTICO: solo ${reglas.rolesPermitidos.join(' y ')} pueden circular`;
    }

    this.#modelo.registrarAcceso({
      idPersonal,
      nombre:       activo.nombre,
      rol:          activo.getRol(),
      zona,
      concedido,
      motivoBloqueo,
      nivelAlerta:  nivel
    });

    return { concedido, perfil: activo, motivoBloqueo };
  }

  getReglasAlerta(nivel) {
    return ControladorAcceso.#REGLAS_ALERTA[nivel] || null;
  }

  // estado de alerta 

  cambiarNivelAlerta(nivel) {
    const niveles = ['NORMAL', 'PRECAUCIÓN', 'ALERTA', 'CRÍTICO'];
    if (!niveles.includes(nivel)) throw new Error('Nivel de alerta inválido');
    this.#modelo.setNivelAlerta(nivel);
    this.#guardarEstado(`Nivel de alerta cambiado a: ${nivel}`);
  }

  // memento: auditoría y restauración 

  obtenerHistorialEstados() { return this.#cuidador.obtenerHistorial(); }

  restaurarEstado(indice) {
    const estadoGuardado = this.#cuidador.restaurar(indice);
    estadoGuardado.registros.forEach(r => this.#modelo.registrarAcceso(r));
    this.#modelo.setNivelAlerta(estadoGuardado.nivelAlerta);
    return estadoGuardado;
  }

  // consultas

  obtenerPerfil(id) {
    const dec = this.#perfilesDecorados.get(id);
    return dec || this.#modelo.obtenerPersonal(id);
  }

  obtenerTodoElPersonal() {
    return this.#modelo.obtenerTodoElPersonal().map(p =>
      this.#perfilesDecorados.get(p.id) || p
    );
  }

  obtenerRegistros()     { return this.#modelo.obtenerRegistros(); }
  getNivelAlerta()       { return this.#modelo.getNivelAlerta(); }
  getHistorialMomentos() { return this.#cuidador.obtenerHistorial(); }
  getTotalMomentos()     { return this.#cuidador.total(); }

  // privados 

  #obtenerPerfil(id) {
    const p = this.#modelo.obtenerPersonal(id);
    if (!p) throw new Error(`Personal con ID ${id} no encontrado`);
    return p;
  }

  #guardarEstado(descripcion) {
    this.#cuidador.guardar({
      registros:   this.#modelo.obtenerRegistros(),
      nivelAlerta: this.#modelo.getNivelAlerta(),
    }, descripcion);
  }

  #inicializarPersonalDemo() {
    const demo = [
      ['Medico',        'M001', 'Dra. Elena Vargas',   'Mañana'],
      ['Medico',        'M002', 'Dr. Carlos Ruiz',     'Noche'],
      ['Enfermero',     'E001', 'Lic. Sofia Mendez',   'Mañana'],
      ['Enfermero',     'E002', 'Lic. Jorge Palacios', 'Tarde'],
      ['Administrador', 'A001', 'Ing. Rosa Castillo',  'Mañana'],
      ['Seguridad',     'S001', 'Agente Luis Torres',  'Noche'],
    ];
    demo.forEach(([tipo, id, nombre, turno]) => {
      const perfil = FabricaPerfiles.crear(tipo, id, nombre, turno);
      this.#modelo.agregarPersonal(perfil);
    });
    this.#guardarEstado('Inicialización del sistema con personal base');
  }
}