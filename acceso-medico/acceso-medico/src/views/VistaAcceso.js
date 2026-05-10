// Patron de Arquitectura: MVC — Vista
// Renderiza la interfaz a partir de los datos del Modelo.
// No contiene logica de negocio; solo recibe datos y emite eventos al Controlador.

export class VistaAcceso {
  #controlador;

  init(controlador) {
    this.#controlador = controlador;
    this.#bindEventos();
  }

  renderizarTodo() {
    this.renderizarAlerta();
    this.renderizarPersonal();
    this.renderizarRegistros();
    this.renderizarMomentos();
  }

  renderizarAlerta() {
    const nivel   = this.#controlador.getNivelAlerta();
    const colores = { NORMAL: '#22c55e', PRECAUCION: '#f59e0b', ALERTA: '#f97316', CRITICO: '#ef4444' };
    const color   = colores[nivel] || '#22c55e';
    const reglas  = this.#controlador.getReglasAlerta(nivel);

    document.getElementById('nivel-alerta-texto').textContent = nivel;
    document.getElementById('nivel-alerta-texto').style.color = color;
    document.getElementById('barra-alerta').style.background  = color;

    document.querySelectorAll('.btn-alerta').forEach(btn => {
      btn.classList.toggle('activo', btn.dataset.nivel === nivel);
    });

    const panel = document.getElementById('panel-restricciones');
    if (panel && reglas) {
      const bloqueadas = reglas.zonasBloqueadas.length
        ? reglas.zonasBloqueadas.map(z => `<span class="tag-bloqueada">${z.replace(/_/g,' ')}</span>`).join('')
        : '<span class="tag-libre">Ninguna</span>';
      const roles = reglas.rolesPermitidos
        ? reglas.rolesPermitidos.map(r => `<span class="tag-rol-ok">${r}</span>`).join('')
        : '<span class="tag-libre">Todos</span>';
      panel.style.borderColor = color;
      panel.innerHTML = `
        <div class="restriccion-titulo" style="color:${color}">${nivel} — Restricciones activas</div>
        <div class="restriccion-fila"><span class="rkey">Descripcion</span><span class="rval">${reglas.descripcion}</span></div>
        <div class="restriccion-fila"><span class="rkey">Nivel minimo</span><span class="rval">${reglas.nivelMinimo}</span></div>
        <div class="restriccion-fila"><span class="rkey">Zonas bloqueadas</span><div class="rtags">${bloqueadas}</div></div>
        <div class="restriccion-fila"><span class="rkey">Roles autorizados</span><div class="rtags">${roles}</div></div>
      `;
    }
  }

  renderizarPersonal() {
    const personal = this.#controlador.obtenerTodoElPersonal();
    const lista    = document.getElementById('lista-personal');
    lista.innerHTML = personal.map(p => {
      const decs     = typeof p.getDecoraciones === 'function' ? p.getDecoraciones() : [];
      const rolColor = { Medico:'#38bdf8', Enfermero:'#a78bfa', Administrador:'#fb923c', Seguridad:'#4ade80' };
      const color    = rolColor[p.getRol()] || '#94a3b8';
      const tags     = [...p.permisos].map(pm =>
        `<span class="tag-permiso">${pm.replace(/_/g,' ')}</span>`
      ).join('');
      const decBadges = decs.map(d =>
        `<span class="tag-deco" title="${d.motivo}">${d.permiso.replace(/_/g,' ')}</span>`
      ).join('');
      return `
        <div class="tarjeta-personal" data-id="${p.id}">
          <div class="personal-header">
            <div class="personal-avatar" style="border-color:${color};color:${color}">${p.nombre[0]}</div>
            <div class="personal-info">
              <div class="personal-nombre">${p.nombre}</div>
              <div class="personal-meta">
                <span class="rol-badge" style="color:${color};border-color:${color}">${p.getRol()}</span>
                <span class="nivel-badge">Nv.${p.getNivelAcceso()}</span>
                <span class="turno-badge">${p.turno}</span>
                <span class="id-badge">${p.id}</span>
              </div>
            </div>
          </div>
          <div class="permisos-wrap">${tags}${decBadges}</div>
          <div class="personal-acciones">
            <button class="btn-accion btn-validar" data-id="${p.id}">Validar Acceso</button>
            <button class="btn-accion btn-decorar" data-id="${p.id}">Permiso Temporal</button>
            <button class="btn-accion btn-elevar"  data-id="${p.id}">Elevar Nivel</button>
            <button class="btn-accion btn-revocar" data-id="${p.id}">Revocar</button>
          </div>
        </div>
      `;
    }).join('');

    lista.querySelectorAll('.btn-validar').forEach(b => b.addEventListener('click', () => this.#mostrarDialogoZona(b.dataset.id)));
    lista.querySelectorAll('.btn-decorar').forEach(b => b.addEventListener('click', () => this.#mostrarDialogoDecorar(b.dataset.id)));
    lista.querySelectorAll('.btn-elevar') .forEach(b => b.addEventListener('click', () => this.#accionElevar(b.dataset.id)));
    lista.querySelectorAll('.btn-revocar').forEach(b => b.addEventListener('click', () => {
      this.#controlador.revocarDecoraciones(b.dataset.id);
      this.renderizarTodo();
      this.mostrarToast('Decoraciones revocadas', 'info');
    }));
  }

  renderizarRegistros() {
    const registros = this.#controlador.obtenerRegistros().slice().reverse();
    const tbody     = document.getElementById('tabla-registros');
    tbody.innerHTML = registros.slice(0, 30).map(r => {
      const cls    = r.concedido ? 'OK' : 'denegado';
      const hora   = r.timestamp ? r.timestamp.slice(11, 19) : '--';
      const motivo = (!r.concedido && r.motivoBloqueo)
        ? `<div class="motivo-bloqueo">${r.motivoBloqueo}</div>` : '';
      return `
        <tr class="fila-registro ${cls}">
          <td>${hora}</td>
          <td>${r.nombre || r.idPersonal}</td>
          <td>${r.rol || '-'}</td>
          <td>${r.zona}${motivo}</td>
          <td><span class="estado-acceso ${cls}">${r.concedido ? 'CONCEDIDO' : 'DENEGADO'}</span></td>
          <td><span class="alerta-mini alerta-${r.nivelAlerta}">${r.nivelAlerta}</span></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6" class="sin-datos">Sin registros aun</td></tr>';
  }

  renderizarMomentos() {
    const historial = this.#controlador.getHistorialMomentos();
    const lista     = document.getElementById('lista-momentos');
    lista.innerHTML = historial.slice().reverse().map((m, i) => {
      const idx  = historial.length - 1 - i;
      const hora = m.fecha.slice(11, 19);
      return `
        <div class="momento-item">
          <div class="momento-info">
            <span class="momento-hora">${hora}</span>
            <span class="momento-desc">${m.descripcion}</span>
          </div>
          <button class="btn-restaurar" data-indice="${idx}">Restaurar</button>
        </div>
      `;
    }).join('') || '<div class="sin-datos">Sin momentos guardados</div>';

    lista.querySelectorAll('.btn-restaurar').forEach(b => b.addEventListener('click', () => {
      if (!confirm('Restaurar el sistema a este punto guardado?')) return;
      this.#controlador.restaurarEstado(parseInt(b.dataset.indice));
      this.renderizarTodo();
      this.mostrarToast('Estado del sistema restaurado', 'alerta');
    }));
  }

  mostrarToast(mensaje, tipo = 'info') {
    const zona = document.getElementById('zona-toast');
    const el   = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.textContent = mensaje;
    zona.appendChild(el);
    setTimeout(() => el.classList.add('visible'), 10);
    setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 300); }, 3000);
  }

#mostrarDialogoZona(id) {
  const perfil = this.#controlador.obtenerPerfil(id);
  const zonas  = ['urgencias','quirofano','laboratorio','uci','historiales',
                  'salas_generales','farmacia','administracion','recursos_humanos',
                  'archivos','acceso_principal','vigilancia','estacionamiento'];

  document.getElementById('modal-zona-personal').textContent = perfil.nombre;

  const grid = document.getElementById('modal-zonas-grid');
  grid.innerHTML = zonas.map(z =>
    `<button class="btn-zona" data-zona="${z}">${z.replace(/_/g,' ')}</button>`
  ).join('');

  let zonaSeleccionada = null;

  grid.querySelectorAll('.btn-zona').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.btn-zona').forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      zonaSeleccionada = btn.dataset.zona;
    });
  });

  document.getElementById('modal-zona').classList.add('visible');

  document.getElementById('btn-zona-cancelar').onclick = () => {
    document.getElementById('modal-zona').classList.remove('visible');
  };

  document.getElementById('btn-zona-confirmar').onclick = () => {
    if (!zonaSeleccionada) {
      this.mostrarToast('Selecciona una zona primero', 'error');
      return;
    }
    try {
      const { concedido, perfil, motivoBloqueo } = this.#controlador.validarAcceso(id, zonaSeleccionada);
      this.renderizarTodo();
      if (concedido) {
        this.mostrarToast(`${perfil.nombre}: acceso CONCEDIDO a [${zonaSeleccionada}]`, 'ok');
      } else if (motivoBloqueo) {
        this.mostrarToast(motivoBloqueo, 'error');
      } else {
        this.mostrarToast(`${perfil.nombre}: acceso DENEGADO a [${zonaSeleccionada}]`, 'error');
      }
    } catch (e) {
      this.mostrarToast(e.message, 'error');
    } finally {
      document.getElementById('modal-zona').classList.remove('visible');
    }
  };
}

  #mostrarDialogoDecorar(id) {
  const perfil = this.#controlador.obtenerPerfil(id);
  const rol    = perfil.getRol();

  const zonasPorRol = {
    Medico:         ['quirofano', 'laboratorio', 'uci', 'farmacia', 'historiales', 'urgencias'],
    Enfermero:      ['quirofano', 'farmacia', 'uci', 'laboratorio', 'urgencias'],
    Administrador:  ['archivos', 'recursos_humanos', 'laboratorio', 'historiales', 'farmacia'],
    Seguridad:      ['administracion', 'archivos', 'laboratorio', 'urgencias', 'quirofano'],
  };

  const duraciones = [
    { label: '30 min',  valor: 30  },
    { label: '1 hora',  valor: 60  },
    { label: '2 horas', valor: 120 },
    { label: '4 horas', valor: 240 },
    { label: '8 horas', valor: 480 },
    { label: '12 horas',valor: 720 },
  ];

  const zonas = zonasPorRol[rol] || [];

  document.getElementById('modal-temporal-personal').textContent = `${perfil.nombre} — ${rol}`;

  const grid = document.getElementById('modal-temporal-grid');
  grid.innerHTML = zonas.map(z =>
    `<button class="btn-zona" data-zona="${z}">${z.replace(/_/g,' ')}</button>`
  ).join('');

  const gridDur = document.getElementById('modal-temporal-duracion');
  gridDur.innerHTML = duraciones.map(d =>
    `<button class="btn-zona" data-minutos="${d.valor}">${d.label}</button>`
  ).join('');

  let zonaSeleccionada    = null;
  let minutosSeleccionados = null;

  grid.querySelectorAll('.btn-zona').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.btn-zona').forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      zonaSeleccionada = btn.dataset.zona;
    });
  });

  gridDur.querySelectorAll('.btn-zona').forEach(btn => {
    btn.addEventListener('click', () => {
      gridDur.querySelectorAll('.btn-zona').forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      minutosSeleccionados = parseInt(btn.dataset.minutos);
    });
  });

  document.getElementById('modal-temporal').classList.add('visible');

  document.getElementById('btn-temporal-cancelar').onclick = () => {
    document.getElementById('modal-temporal').classList.remove('visible');
  };

  document.getElementById('btn-temporal-confirmar').onclick = () => {
    if (!zonaSeleccionada) {
      this.mostrarToast('Selecciona una zona primero', 'error');
      return;
    }
    if (!minutosSeleccionados) {
      this.mostrarToast('Selecciona una duración primero', 'error');
      return;
    }
    try {
      this.#controlador.otorgarPermisoTemporal(
        id, zonaSeleccionada,
        `Permiso temporal por ${minutosSeleccionados} minutos`,
        minutosSeleccionados
      );
      this.renderizarTodo();
      this.mostrarToast(`Permiso temporal [${zonaSeleccionada}] otorgado`, 'ok');
    } catch (e) {
      this.mostrarToast(e.message, 'error');
    } finally {
      document.getElementById('modal-temporal').classList.remove('visible');
    }
  };
}

  #accionElevar(id) {
  const perfil  = this.#controlador.obtenerPerfil(id);
  const motivos = [
    'Emergencia quirúrgica activa',
    'Guardia médica nocturna',
    'Ausencia de personal de mayor nivel',
    'Protocolo de desastre',
    'Cobertura de turno crítico',
    'Autorización del jefe de área',
    'Paciente en estado crítico',
    'Refuerzo en UCI',
  ];

  document.getElementById('modal-elevar-personal').textContent = perfil.nombre;

  const grid = document.getElementById('modal-elevar-grid');
  grid.innerHTML = motivos.map(m =>
    `<button class="btn-zona" data-motivo="${m}">${m}</button>`
  ).join('');

  let motivoSeleccionado = null;

  grid.querySelectorAll('.btn-zona').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.btn-zona').forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      motivoSeleccionado = btn.dataset.motivo;
    });
  });

  document.getElementById('modal-elevar').classList.add('visible');

  document.getElementById('btn-elevar-cancelar').onclick = () => {
    document.getElementById('modal-elevar').classList.remove('visible');
  };

  document.getElementById('btn-elevar-confirmar').onclick = () => {
    if (!motivoSeleccionado) {
      this.mostrarToast('Selecciona un motivo primero', 'error');
      return;
    }
    try {
      this.#controlador.elevarNivelAcceso(id, motivoSeleccionado);
      this.renderizarTodo();
      this.mostrarToast('Nivel de acceso elevado', 'ok');
    } catch (e) {
      this.mostrarToast(e.message, 'error');
    } finally {
      document.getElementById('modal-elevar').classList.remove('visible');
    }
  };
}

  #bindEventos() {
    document.querySelectorAll('.btn-alerta').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          this.#controlador.cambiarNivelAlerta(btn.dataset.nivel);
          this.renderizarTodo();
          this.mostrarToast(`Alerta: ${btn.dataset.nivel}`, 'alerta');
        } catch (e) { this.mostrarToast(e.message, 'error'); }
      });
    });

    document.getElementById('form-nuevo-personal').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;

      document.getElementById('modal-tipo').textContent   = f.tipo.value;
      document.getElementById('modal-id').textContent     = f.idPersonal.value.trim();
      document.getElementById('modal-nombre').textContent = f.nombre.value.trim();
      document.getElementById('modal-turno').textContent  = f.turno.value;

      document.getElementById('modal-registro').classList.add('visible');

      document.getElementById('btn-modal-cancelar').onclick = () => {
        document.getElementById('modal-registro').classList.remove('visible');
      };

      document.getElementById('btn-modal-confirmar').onclick = () => {
        try {
          this.#controlador.registrarPersonal(
            f.tipo.value,
            f.idPersonal.value.trim(),
            f.nombre.value.trim(),
            f.turno.value
          );
          this.renderizarTodo();
          f.reset();
          this.mostrarToast('Personal registrado correctamente', 'ok');
        } catch (err) {
          this.mostrarToast(err.message, 'error');
        } finally {
          document.getElementById('modal-registro').classList.remove('visible');
        }
      };
    });
  }
}