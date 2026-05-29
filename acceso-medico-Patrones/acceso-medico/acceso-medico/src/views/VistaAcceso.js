// Patron de Arquitectura: MVC — Vista

export class VistaAcceso {
  #controlador;
  #avisos   = [];  // { id, idPersonal, nombrePersonal, texto, tipo, fecha }
  #turnos   = {};  // idPersonal → turnoOverride
  #califs   = {};  // idPersonal → { puntuacion, comentarios[] }
  #notifs   = {};  // idPersonal → [{ texto, tipo, id }] — notificaciones flotantes activas

  init(controlador) {
    this.#controlador = controlador;
    this.#seedCalificaciones();
    this.#bindEventos();
  }

  renderizarTodo() {
    this.renderizarAlerta();
    this.renderizarPersonal();
    this.renderizarRegistros();
    this.renderizarMomentos();
    this.renderizarEstadisticas();
    this.renderizarAvisos();
  }

  //RENDERIZADORES BASE

  renderizarAlerta() {
    const nivel = this.#controlador.getNivelAlerta();
    // Colores accesibles daltonismo: NO solo rojo/verde
    const colores = {
      NORMAL:     '#0369a1',  // azul
      'PRECAUCIÓN':'#92400e', // ámbar oscuro
      ALERTA:     '#c2410c',  // naranja oscuro
      'CRÍTICO':  '#1e1b4b',  // índigo profundo
    };
    const color  = colores[nivel] || '#0369a1';
    const reglas = this.#controlador.getReglasAlerta(nivel);

    document.querySelectorAll('#nivel-alerta-texto, #nivel-alerta-header').forEach(el => {
      el.textContent = nivel;
      el.style.color = color;
    });
    document.getElementById('barra-alerta').style.background = color;
    document.querySelectorAll('.btn-alerta').forEach(btn =>
      btn.classList.toggle('activo', btn.dataset.nivel === nivel)
    );

    const panel = document.getElementById('panel-restricciones');
    if (panel && reglas) {
      const bloqueadas = reglas.zonasBloqueadas.length
        ? reglas.zonasBloqueadas.map(z => `<span class="tag-bloqueada">${z.replace(/_/g,' ')}</span>`).join('')
        : '<span class="tag-libre">Ninguna</span>';
      const roles = reglas.rolesPermitidos
        ? reglas.rolesPermitidos.map(r => `<span class="tag-rol-ok">${r}</span>`).join('')
        : '<span class="tag-libre">Todos</span>';
      panel.style.borderLeftColor = color;
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
      const decs = typeof p.getDecoraciones === 'function' ? p.getDecoraciones() : [];

      // Paleta de roles accesible para daltonismo (azul/teal/violeta/ámbar)
      const rolColor = {
        Medico:       '#0369a1',
        Enfermero:    '#7c3aed',
        Administrador:'#b45309',
        Seguridad:    '#0f766e',
      };
      const color = rolColor[p.getRol()] || '#4b5563';

      const tags      = [...p.permisos].map(pm =>
        `<span class="tag-permiso">${pm.replace(/_/g,' ')}</span>`).join('');
      const decBadges = decs.map(d =>
        `<span class="tag-deco" title="${d.motivo}">${d.permiso.replace(/_/g,' ')}</span>`).join('');

      const turno      = this.#turnos[p.id] || p.turno;
      const calif      = this.#califs[p.id];
      const avisosP    = this.#avisos.filter(a => a.idPersonal === p.id);
      const avisosCnt  = avisosP.length;
      const badgeAviso = avisosCnt
        ? `<span class="badge-aviso badge-aviso-tip">📋 ${avisosCnt}<span class="aviso-tooltip">${avisosP.map(a=>'<b>'+a.tipo.toUpperCase()+'</b> '+a.texto).join('<br>')}</span></span>` : '';

      // Estrellitas con color ámbar (seguro para daltonismo — no rojo/verde)
      const stars = calif
        ? [1,2,3,4,5].map(n =>
            `<span class="em${n<=Math.round(calif.puntuacion)?' on':''}">${n<=Math.round(calif.puntuacion)?'★':'☆'}</span>`
          ).join('') + `<span class="calif-num">${calif.puntuacion.toFixed(1)}</span>`
        : '';

      // Notificaciones flotantes activas para este personal
      const notifs = (this.#notifs[p.id] || []).map(n =>
        `<span class="notif-flotante notif-${n.tipo}" id="notif-${n.id}">${n.texto}</span>`
      ).join('');

      return `
        <div class="tarjeta-personal" data-id="${p.id}">
          <div class="personal-header">
            <div class="personal-avatar" style="border-color:${color};color:${color}">${p.nombre[0]}</div>
            <div style="flex:1">
              <div class="personal-nombre">${p.nombre}${badgeAviso}</div>
              <div class="personal-meta">
                <span class="rol-badge" style="color:${color};border-color:${color}">${p.getRol()}</span>
                <span class="nivel-badge">Nv.${p.getNivelAcceso()}</span>
                <span class="turno-badge">${turno}</span>
                <span class="id-badge">${p.id}</span>
              </div>
              ${stars ? `<div class="calificacion-mini">${stars}</div>` : ''}
            </div>
          </div>
          <div class="notif-barra" id="notif-barra-${p.id}">${notifs}</div>
          <div class="permisos-wrap">${tags}${decBadges}</div>
          <div class="personal-acciones">
            <button class="btn-accion btn-validar"  data-id="${p.id}">✓ Validar Acceso</button>
            <button class="btn-accion btn-decorar"  data-id="${p.id}">⏱ Permiso Temporal</button>
            <button class="btn-accion btn-elevar"   data-id="${p.id}">▲ Elevar Nivel</button>
            <button class="btn-accion btn-revocar"  data-id="${p.id}">✗ Revocar</button>
          </div>
          <div class="personal-labels">
            <span class="lbl lbl-aviso"  data-id="${p.id}">📋 + Aviso</span>
            <span class="lbl lbl-turno"  data-id="${p.id}">🗓 Cambiar Turno</span>
            <span class="lbl lbl-perfil" data-id="${p.id}">⭐ Ver Perfil</span>
          </div>
        </div>
      `;
    }).join('');

    // Re-inyectar notificaciones activas que sobrevivieron al re-render
    Object.entries(this.#notifs).forEach(([pid, notifArr]) => {
      if (!notifArr.length) return;
      const barra = document.getElementById(`notif-barra-${pid}`);
      if (!barra) return;
      notifArr.forEach(n => {
        if (!document.getElementById(`notif-${n.id}`)) {
          const span = document.createElement('span');
          span.className = `notif-flotante notif-${n.tipo}`;
          span.id = `notif-${n.id}`;
          span.textContent = n.texto;
          span.style.animation = 'none';
          barra.appendChild(span);
        }
      });
      barra.style.display = 'flex';
    });

    // Event delegation — un solo listener en el contenedor
    lista.onclick = (e) => {
      const el = e.target.closest('[data-id]');
      if (!el) return;
      const id = el.dataset.id;
      if (el.classList.contains('btn-validar'))  { this.#mostrarDialogoZona(id);    return; }
      if (el.classList.contains('btn-decorar'))  { this.#mostrarDialogoDecorar(id); return; }
      if (el.classList.contains('btn-elevar'))   { this.#accionElevar(id);          return; }
      if (el.classList.contains('btn-revocar'))  {
        this.#controlador.revocarDecoraciones(id);
        // Limpiar notificaciones de nivel y permiso al revocar
        this.#limpiarNotifsActivas(id);
        this.renderizarTodo();
        this.mostrarToast('Decoraciones revocadas', 'info');
        return;
      }
      if (el.classList.contains('lbl-aviso'))    { this.#mostrarDialogoAviso(id);   return; }
      if (el.classList.contains('lbl-turno'))    { this.#mostrarDialogoTurno(id);   return; }
      if (el.classList.contains('lbl-perfil'))   { this.#mostrarFichaPersonal(id);  return; }
    };
  }

  renderizarRegistros() {
    const registros = this.#controlador.obtenerRegistros().slice().reverse();
    const tbody     = document.getElementById('tabla-registros');
    tbody.innerHTML = registros.slice(0, 30).map(r => {
      const cls    = r.concedido ? 'ok' : 'denegado';
      const hora   = r.timestamp ? r.timestamp.slice(11, 19) : '--';
      // Ícono + texto + color — triple indicador para daltonismo
      const estadoTxt = r.concedido ? '✓ CONCEDIDO' : '✗ DENEGADO';
      const motivo = (!r.concedido && r.motivoBloqueo)
        ? `<div class="motivo-bloqueo">⚠ ${r.motivoBloqueo}</div>` : '';
      return `
        <tr class="fila-registro ${cls}">
          <td>${hora}</td>
          <td>${r.nombre || r.idPersonal}</td>
          <td>${r.rol || '-'}</td>
          <td>${r.zona}${motivo}</td>
          <td><span class="estado-acceso ${cls}">${estadoTxt}</span></td>
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
      if (!confirm('¿Restaurar el sistema a este punto guardado?')) return;
      this.#controlador.restaurarEstado(parseInt(b.dataset.indice));
      this.renderizarTodo();
      this.mostrarToast('Estado del sistema restaurado', 'alerta');
    }));
  }

  renderizarEstadisticas() {
    const panel    = document.getElementById('panel-estadisticas');
    if (!panel) return;
    const regs     = this.#controlador.obtenerRegistros();
    const personal = this.#controlador.obtenerTodoElPersonal();
    const total    = regs.length;
    const ok       = regs.filter(r => r.concedido).length;
    const deny     = total - ok;
    const porZona  = {};
    regs.forEach(r => { porZona[r.zona] = (porZona[r.zona] || 0) + 1; });
    const top3   = Object.entries(porZona).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const maxCnt = top3[0]?.[1] || 1;

    panel.innerHTML = `
      <div class="stats-grid">
        <div class="stat-mini"><div class="stat-num-mini">${personal.length}</div><div class="stat-lbl">Personal</div></div>
        <div class="stat-mini"><div class="stat-num-mini">${total}</div><div class="stat-lbl">Accesos</div></div>
        <div class="stat-mini ok"><div class="stat-num-mini">✓ ${ok}</div><div class="stat-lbl">Concedidos</div></div>
        <div class="stat-mini err"><div class="stat-num-mini">✗ ${deny}</div><div class="stat-lbl">Denegados</div></div>
      </div>
      ${top3.length ? `
        <div class="top-zonas-titulo">Zonas más accedidas</div>
        ${top3.map(([zona, cnt]) => `
          <div class="top-zona-fila">
            <span class="top-zona-nombre">${zona.replace(/_/g,' ')}</span>
            <div class="top-zona-barra-w"><div class="top-zona-barra" style="width:${Math.round(cnt/maxCnt*100)}%"></div></div>
            <span class="top-zona-cnt">${cnt}</span>
          </div>
        `).join('')}
      ` : ''}
    `;
  }

  renderizarAvisos() {
    const contenedor = document.getElementById('panel-avisos');
    if (!contenedor) return;
    if (!this.#avisos.length) {
      contenedor.innerHTML = '<div class="sin-datos">Sin avisos activos</div>';
      return;
    }
    // Colores de tipo con ícono — no solo color
    const cfg = {
      info:       { c:'#0369a1', bg:'#e0f2fe', b:'#7dd3fc', ico:'ℹ' },
      alerta:     { c:'#92400e', bg:'#fef3c7', b:'#fcd34d', ico:'⚠' },
      urgente:    { c:'#c2410c', bg:'#fff7ed', b:'#fb923c', ico:'⛔' },
      cancelacion:{ c:'#5b21b6', bg:'#ede9fe', b:'#c4b5fd', ico:'✗' },
    };
    contenedor.innerHTML = this.#avisos.slice().reverse().map(a => {
      const s = cfg[a.tipo] || cfg.info;
      return `
        <div class="aviso-item" style="border-left-color:${s.c};background:${s.bg}">
          <div class="aviso-header">
            <span class="aviso-tipo" style="color:${s.c}">${s.ico} ${a.tipo.toUpperCase()}</span>
            <span class="aviso-hora">${a.fecha.slice(11,19)}</span>
            <button class="btn-del-aviso" data-aid="${a.id}" title="Eliminar">×</button>
          </div>
          <div class="aviso-personal">${a.nombrePersonal}</div>
          <div class="aviso-texto">${a.texto}</div>
        </div>
      `;
    }).join('');

    contenedor.querySelectorAll('.btn-del-aviso').forEach(b => {
      b.addEventListener('click', () => {
        this.#avisos = this.#avisos.filter(a => a.id !== b.dataset.aid);
        this.renderizarTodo();
        this.mostrarToast('Aviso eliminado', 'info');
      });
    });
  }

  //NOTIFICACIONES FLOTANTES

  #agregarNotif(idPersonal, texto, tipo) {
    const nid = `nf_${Date.now()}`;
    if (!this.#notifs[idPersonal]) this.#notifs[idPersonal] = [];
    this.#notifs[idPersonal].push({ id: nid, texto, tipo });

    const barra = document.getElementById(`notif-barra-${idPersonal}`);
    if (barra) {
      const span = document.createElement('span');
      span.className = `notif-flotante notif-${tipo}`;
      span.id = `notif-${nid}`;
      span.textContent = texto;
      barra.appendChild(span);
      barra.style.display = 'flex';
    }

    // Las notificaciones de nivel/permiso permanecen hasta que se revoca.
    // Las de aviso/turno desaparecen solos tras 6 segundos (son informativos).
    if (tipo === 'aviso') {
      setTimeout(() => {
        if (this.#notifs[idPersonal])
          this.#notifs[idPersonal] = this.#notifs[idPersonal].filter(n => n.id !== nid);
        const el = document.getElementById(`notif-${nid}`);
        if (el) {
          el.style.animation = 'notif-out .4s ease forwards';
          setTimeout(() => el.remove(), 400);
        }
      }, 6000);
    }
  }

  #limpiarNotifsActivas(idPersonal) {
    if (!this.#notifs[idPersonal]) return;
    const aEliminar = this.#notifs[idPersonal].filter(n => n.tipo === 'nivel' || n.tipo === 'permiso');
    aEliminar.forEach(n => {
      const el = document.getElementById(`notif-${n.id}`);
      if (el) {
        el.style.animation = 'notif-out .4s ease forwards';
        setTimeout(() => el.remove(), 400);
      }
    });
    this.#notifs[idPersonal] = this.#notifs[idPersonal].filter(n => n.tipo !== 'nivel' && n.tipo !== 'permiso');
  }

  //MÓDULO: AVISOS

  #mostrarDialogoAviso(id) {
    const perfil = this.#controlador.obtenerPerfil(id);
    const modal  = document.getElementById('modal-aviso');
    document.getElementById('modal-aviso-personal').textContent = perfil.nombre;

    let tipoSel = 'info';
    modal.querySelectorAll('.btn-tipo-aviso').forEach(b => {
      b.classList.toggle('seleccionada', b.dataset.tipo === 'info');
      b.onclick = () => {
        modal.querySelectorAll('.btn-tipo-aviso').forEach(x => x.classList.remove('seleccionada'));
        b.classList.add('seleccionada');
        tipoSel = b.dataset.tipo;
      };
    });

    const ta = document.getElementById('aviso-texto');
    ta.value = '';
    modal.classList.add('visible');

    document.getElementById('btn-aviso-cancelar').onclick = () => modal.classList.remove('visible');
    document.getElementById('btn-aviso-confirmar').onclick = () => {
      const texto = ta.value.trim();
      if (!texto) { this.mostrarToast('Escribe el aviso primero', 'error'); return; }
      this.#avisos.push({
        id:             `av_${Date.now()}`,
        idPersonal:     id,
        nombrePersonal: perfil.nombre,
        texto, tipo: tipoSel,
        fecha: new Date().toISOString()
      });
      // Notificación flotante junto al nombre
      const icosTipo = { info:'ℹ Aviso info', alerta:'⚠ Aviso alerta', urgente:'⛔ Urgente', cancelacion:'✗ Cancelación' };
      this.#agregarNotif(id, icosTipo[tipoSel] || '📋 Aviso publicado', 'aviso');
      this.renderizarTodo();
      this.mostrarToast(`Aviso publicado para ${perfil.nombre}`, 'ok');
      modal.classList.remove('visible');
    };
  }

  //MÓDULO: TURNO + CALENDARIO + DESTINATARIOS

  #mostrarDialogoTurno(id) {
    const perfil      = this.#controlador.obtenerPerfil(id);
    const turnoActual = this.#turnos[id] || perfil.turno;
    const modal       = document.getElementById('modal-turno');

    document.getElementById('modal-turno-personal').textContent =
      `${perfil.nombre} — Turno actual: ${turnoActual}`;

    document.getElementById('modal-turno-calendario').innerHTML = this.#buildCalendario();

    let fechaSel = null, turnoNuevo = null;
    const fechaLabel = document.getElementById('turno-fecha-sel');
    fechaLabel.textContent = '';

    document.getElementById('modal-turno-calendario').onclick = e => {
      const dia = e.target.closest('.cal-dia');
      if (!dia || dia.classList.contains('cal-dia-pasado')) return;
      document.querySelectorAll('#modal-turno-calendario .cal-dia').forEach(d => d.classList.remove('cal-dia-selec'));
      dia.classList.add('cal-dia-selec');
      fechaSel = dia.dataset.fecha;
      fechaLabel.textContent = `✓ Fecha seleccionada: ${fechaSel}`;
    };

    const horGrid = document.getElementById('modal-turno-horarios');
    horGrid.innerHTML = [
      { t:'Mañana', h:'07:00–15:00', e:'☀' },
      { t:'Tarde',  h:'15:00–23:00', e:'🌤' },
      { t:'Noche',  h:'23:00–07:00', e:'🌙' },
    ].map(o => `<button class="btn-zona btn-turno-op" data-turno="${o.t}">${o.e} ${o.t} (${o.h})</button>`).join('');

    horGrid.querySelectorAll('.btn-turno-op').forEach(b => {
      b.onclick = () => {
        horGrid.querySelectorAll('.btn-turno-op').forEach(x => x.classList.remove('seleccionada'));
        b.classList.add('seleccionada');
        turnoNuevo = b.dataset.turno;
      };
    });

    //Compañeros del mismo rol para intercambio
    const todosLosPersonal = this.#controlador.obtenerTodoElPersonal();
    const rolActual        = perfil.getRol();
    const companeros       = todosLosPersonal.filter(p => p.getRol() === rolActual && p.id !== id);
    const compWrap         = document.getElementById('companero-wrap');
    const compGrid         = document.getElementById('companero-grid');
    const compSel          = document.getElementById('companero-resumen');
    let   companeroElegido = null;

    if (compWrap && compGrid) {
      if (companeros.length === 0) {
        compGrid.innerHTML = `<div style="font-size:11px;color:var(--dim2);padding:6px 0">No hay otro personal con rol ${rolActual} registrado.</div>`;
      } else {
        compGrid.innerHTML = companeros.map(c => {
          const t = this.#turnos[c.id] || c.turno;
          return `<label class="companero-opt">
            <input type="radio" name="companero-radio" value="${c.id}" data-nombre="${c.nombre}" data-turno="${t}">
            <span class="companero-info">
              <span class="companero-nombre">${c.nombre}</span>
              <span class="companero-turno">${t} · ${c.id}</span>
            </span>
          </label>`;
        }).join('');
      }
      compGrid.onchange = (e) => {
        const radio = e.target;
        if (!radio || radio.type !== 'radio') return;
        companeroElegido = { id: radio.value, nombre: radio.dataset.nombre, turno: radio.dataset.turno };
        if (compSel) compSel.textContent = `✓ Intercambio con: ${companeroElegido.nombre} (turno ${companeroElegido.turno})`;
      };
      if (compSel) compSel.textContent = '';
    }

    
    const grid = document.getElementById('destinatario-grid');
    if (grid) {
      grid.querySelectorAll('input[type=checkbox]').forEach(c => {
        c.checked = ['Jefe de turno','Recursos Humanos'].includes(c.value);
      });
      const resumen = document.getElementById('destinatario-resumen');
      const actualizar = () => {
        const sel = [...grid.querySelectorAll('input:checked')].map(c => c.value);
        if (resumen) resumen.textContent = sel.length
          ? `✓ Notificando a: ${sel.join(', ')}`
          : 'Sin destinatarios seleccionados';
      };
      grid.onchange = actualizar;
      actualizar();
    }

    modal.classList.add('visible');
    document.getElementById('btn-turno-cancelar').onclick = () => modal.classList.remove('visible');
    document.getElementById('btn-turno-confirmar').onclick = () => {
      if (!fechaSel)   { this.mostrarToast('Selecciona una fecha', 'error'); return; }
      if (!turnoNuevo) { this.mostrarToast('Selecciona el nuevo turno', 'error'); return; }
      if (turnoNuevo === turnoActual) { this.mostrarToast('El turno es igual al actual', 'info'); return; }

      // Obtener destinatarios seleccionados
      const destinatarios = grid
        ? [...grid.querySelectorAll('input:checked')].map(c => c.value)
        : [];

      this.#turnos[id] = turnoNuevo;
      // Si hay intercambio, actualizar también el turno del compañero
      if (companeroElegido) {
        this.#turnos[companeroElegido.id] = turnoActual; // el compañero toma el turno anterior
      }
      const textoAviso = `Cambio de turno: ${turnoActual} → ${turnoNuevo} a partir del ${fechaSel}` +
        (companeroElegido ? `. Intercambio con: ${companeroElegido.nombre}` : '') +
        (destinatarios.length ? `. Notificado a: ${destinatarios.join(', ')}` : '');

      this.#avisos.push({
        id:             `av_${Date.now()}`,
        idPersonal:     id,
        nombrePersonal: perfil.nombre,
        texto:          textoAviso,
        tipo:           'info',
        fecha:          new Date().toISOString()
      });

      // Notificación flotante con el nuevo turno
      this.#agregarNotif(id, `🗓 Turno → ${turnoNuevo}`, 'permiso');
      this.renderizarTodo();
      this.mostrarToast(`Turno de ${perfil.nombre} cambiado a ${turnoNuevo}`, 'ok');
      modal.classList.remove('visible');
    };
  }

  #buildCalendario() {
    const hoy  = new Date();
    const dias  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const ini   = new Date(hoy);
    ini.setDate(hoy.getDate() - hoy.getDay());
    let h = `<div class="cal-header">${meses[hoy.getMonth()]} ${hoy.getFullYear()}</div>
    <div class="cal-dias-header">${dias.map(d=>`<div class="cal-dh">${d}</div>`).join('')}</div>
    <div class="cal-grid">`;
    for (let i = 0; i < 14; i++) {
      const d   = new Date(ini);
      d.setDate(ini.getDate() + i);
      const esH = d.toDateString() === hoy.toDateString();
      const esP = d < hoy && !esH;
      const f   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      h += `<div class="cal-dia${esH?' cal-dia-hoy':''}${esP?' cal-dia-pasado':''}" data-fecha="${f}">${d.getDate()}</div>`;
    }
    return h + '</div>';
  }

  //MÓDULO: FICHA PERSONAL

  #mostrarFichaPersonal(id) {
    const perfil  = this.#controlador.obtenerPerfil(id);
    const regs    = this.#controlador.obtenerRegistros().filter(r => r.idPersonal === id).slice(-20).reverse();
    const calif   = this.#califs[id] || { puntuacion:0, comentarios:[] };
    const turno   = this.#turnos[id] || perfil.turno;
    const avisosP = this.#avisos.filter(a => a.idPersonal === id);
    const modal   = document.getElementById('modal-ficha');

    const rolColor = { Medico:'#0369a1', Enfermero:'#7c3aed', Administrador:'#b45309', Seguridad:'#0f766e' };
    const color    = rolColor[perfil.getRol()] || '#4b5563';

    const total = regs.length;
    const conc  = regs.filter(r=>r.concedido).length;
    const deny  = total - conc;
    const tasa  = total ? Math.round(conc/total*100) : 0;

    const estrellas = [1,2,3,4,5].map(n =>
      `<span class="estrella${n<=Math.round(calif.puntuacion)?' on':''}">${n<=Math.round(calif.puntuacion)?'★':'☆'}</span>`
    ).join('');

    const comentHTML = calif.comentarios.length
      ? calif.comentarios.map(c=>`
          <div class="coment-item">
            <div class="coment-head">
              <span class="coment-autor">${c.autor}</span>
              <span class="coment-stars">${'★'.repeat(c.stars)}${'☆'.repeat(5-c.stars)}</span>
              <span class="coment-fecha">${c.fecha}</span>
            </div>
            <div class="coment-texto">${c.texto}</div>
          </div>`).join('')
      : '<div class="sin-datos">Sin evaluaciones aún</div>';

    const histHTML = regs.slice(0,8).map(r=>{
      const cls = r.concedido?'ok':'denegado';
      return `<div class="hist-fila ${cls}">
        <span class="h-hora">${r.timestamp?.slice(11,19)||'--'}</span>
        <span class="h-zona">${r.zona}</span>
        <span class="h-est">${r.concedido?'✓':'✗'}</span>
      </div>`;
    }).join('') || '<div class="sin-datos">Sin movimientos</div>';

    const avisosHTML = avisosP.length
      ? avisosP.map(a=>`<div class="aviso-mini" style="border-left-color:${a.tipo==='urgente'?'#c2410c':a.tipo==='cancelacion'?'#5b21b6':'#92400e'}">
          <b>${a.tipo.toUpperCase()}</b> — ${a.texto}</div>`).join('')
      : '<div class="sin-datos">Sin avisos</div>';

    document.getElementById('ficha-contenido').innerHTML = `
      <div class="ficha-hero" style="border-top:3px solid ${color};padding-top:14px">
        <div class="ficha-avatar" style="border-color:${color};color:${color}">${perfil.nombre[0]}</div>
        <div>
          <div class="ficha-nombre">${perfil.nombre}</div>
          <div class="personal-meta" style="margin-bottom:0">
            <span class="rol-badge" style="color:${color};border-color:${color}">${perfil.getRol()}</span>
            <span class="nivel-badge">Nivel ${perfil.getNivelAcceso()}</span>
            <span class="turno-badge">${turno}</span>
            <span class="id-badge">${perfil.id}</span>
          </div>
          <div class="ficha-calificacion">
            ${estrellas}
            <span class="calif-grande">${calif.puntuacion.toFixed(1)}/5.0</span>
            <span class="calif-total">(${calif.comentarios.length} eval.)</span>
          </div>
        </div>
      </div>

      <div class="ficha-stats">
        <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">Accesos</div></div>
        <div class="stat-box ok"><div class="stat-num">✓ ${conc}</div><div class="stat-label">Concedidos</div></div>
        <div class="stat-box err"><div class="stat-num">✗ ${deny}</div><div class="stat-label">Denegados</div></div>
        <div class="stat-box"><div class="stat-num">${tasa}%</div><div class="stat-label">Éxito</div></div>
      </div>

      <div class="ficha-sec">
        <div class="ficha-sec-titulo">Avisos activos</div>
        ${avisosHTML}
      </div>
      <div class="ficha-sec">
        <div class="ficha-sec-titulo">Últimos movimientos</div>
        ${histHTML}
      </div>
      <div class="ficha-sec">
        <div class="ficha-sec-titulo">Evaluaciones del equipo</div>
        ${comentHTML}
        <div class="form-coment">
          <div class="ficha-sec-titulo" style="margin-top:10px;margin-bottom:4px">Agregar evaluación</div>
          <div class="estrellas-input" id="ei-wrap-${id}">
            ${[1,2,3,4,5].map(n=>`<span class="ei" data-v="${n}">☆</span>`).join('')}
          </div>
          <input class="campo-coment" id="ei-autor-${id}" placeholder="Tu nombre / rol" maxlength="40">
          <textarea class="campo-coment" id="ei-text-${id}" placeholder="Escribe tu evaluación..." rows="2" maxlength="200"></textarea>
          <button class="btn-submit" id="ei-save-${id}" style="padding:9px">Guardar evaluación</button>
        </div>
      </div>
    `;

    // Estrellas interactivas
    let starsSel = 0;
    const wrap = document.getElementById(`ei-wrap-${id}`);
    wrap.querySelectorAll('.ei').forEach(s => {
      s.addEventListener('mouseover', () => {
        wrap.querySelectorAll('.ei').forEach((x,i) => { x.textContent = i < parseInt(s.dataset.v) ? '★' : '☆'; });
      });
      s.addEventListener('mouseleave', () => {
        wrap.querySelectorAll('.ei').forEach((x,i) => { x.textContent = i < starsSel ? '★' : '☆'; });
      });
      s.addEventListener('click', () => { starsSel = parseInt(s.dataset.v); });
    });

    document.getElementById(`ei-save-${id}`).addEventListener('click', () => {
      const autor = document.getElementById(`ei-autor-${id}`).value.trim();
      const texto = document.getElementById(`ei-text-${id}`).value.trim();
      if (!autor)    { this.mostrarToast('Escribe tu nombre', 'error'); return; }
      if (!texto)    { this.mostrarToast('Escribe la evaluación', 'error'); return; }
      if (!starsSel) { this.mostrarToast('Selecciona una puntuación', 'error'); return; }
      if (!this.#califs[id]) this.#califs[id] = { puntuacion:0, comentarios:[] };
      this.#califs[id].comentarios.push({ autor, texto, stars:starsSel, fecha:new Date().toLocaleDateString('es-MX') });
      const sum = this.#califs[id].comentarios.reduce((s,c)=>s+c.stars,0);
      this.#califs[id].puntuacion = sum / this.#califs[id].comentarios.length;
      this.mostrarToast('Evaluación guardada', 'ok');
      this.renderizarPersonal();
      this.#mostrarFichaPersonal(id);
    });

    modal.classList.add('visible');
    document.getElementById('btn-ficha-cerrar').onclick = () => modal.classList.remove('visible');
  }

  //DIÁLOGOS ORIGINALES

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

    let zonaS = null;
    grid.querySelectorAll('.btn-zona').forEach(b => {
      b.onclick = () => {
        grid.querySelectorAll('.btn-zona').forEach(x => x.classList.remove('seleccionada'));
        b.classList.add('seleccionada'); zonaS = b.dataset.zona;
      };
    });

    document.getElementById('modal-zona').classList.add('visible');
    document.getElementById('btn-zona-cancelar').onclick = () => document.getElementById('modal-zona').classList.remove('visible');
    document.getElementById('btn-zona-confirmar').onclick = () => {
      if (!zonaS) { this.mostrarToast('Selecciona una zona primero', 'error'); return; }
      try {
        const { concedido, perfil:p, motivoBloqueo } = this.#controlador.validarAcceso(id, zonaS);
        this.renderizarTodo();
        if (concedido) this.mostrarToast(`${p.nombre}: ✓ CONCEDIDO en [${zonaS}]`, 'ok');
        else if (motivoBloqueo) this.mostrarToast(motivoBloqueo, 'error');
        else this.mostrarToast(`${p.nombre}: ✗ DENEGADO en [${zonaS}]`, 'error');
      } catch(e) { this.mostrarToast(e.message,'error'); }
      finally { document.getElementById('modal-zona').classList.remove('visible'); }
    };
  }

  #mostrarDialogoDecorar(id) {
    const perfil = this.#controlador.obtenerPerfil(id);
    const rol    = perfil.getRol();
    const zpRol  = {
      Medico:       ['laboratorio','uci','farmacia','historiales','urgencias'],
      Enfermero:    ['quirofano','farmacia','uci','laboratorio','urgencias'],
      Administrador:['archivos','recursos_humanos','laboratorio','historiales','farmacia'],
      Seguridad:    ['administracion','archivos','laboratorio','urgencias','quirofano'],
    };
    const durs = [
      {label:'30 min',valor:30},{label:'1 hora',valor:60},{label:'2 horas',valor:120},
      {label:'4 horas',valor:240},{label:'8 horas',valor:480},{label:'12 horas',valor:720},
    ];
    document.getElementById('modal-temporal-personal').textContent = `${perfil.nombre} — ${rol}`;
    const grid    = document.getElementById('modal-temporal-grid');
    const gridDur = document.getElementById('modal-temporal-duracion');
    grid.innerHTML    = (zpRol[rol]||[]).map(z=>`<button class="btn-zona" data-zona="${z}">${z.replace(/_/g,' ')}</button>`).join('');
    gridDur.innerHTML = durs.map(d=>`<button class="btn-zona" data-min="${d.valor}">${d.label}</button>`).join('');

    let zonaS=null, minS=null;
    grid.querySelectorAll('.btn-zona').forEach(b=>{b.onclick=()=>{grid.querySelectorAll('.btn-zona').forEach(x=>x.classList.remove('seleccionada'));b.classList.add('seleccionada');zonaS=b.dataset.zona;};});
    gridDur.querySelectorAll('.btn-zona').forEach(b=>{b.onclick=()=>{gridDur.querySelectorAll('.btn-zona').forEach(x=>x.classList.remove('seleccionada'));b.classList.add('seleccionada');minS=parseInt(b.dataset.min);};});

    document.getElementById('modal-temporal').classList.add('visible');
    document.getElementById('btn-temporal-cancelar').onclick = () => document.getElementById('modal-temporal').classList.remove('visible');
    document.getElementById('btn-temporal-confirmar').onclick = () => {
      if (!zonaS){ this.mostrarToast('Selecciona una zona','error'); return; }
      if (!minS) { this.mostrarToast('Selecciona duración','error'); return; }
      try {
        this.#controlador.otorgarPermisoTemporal(id,zonaS,`Permiso temporal ${minS} min`,minS);
        // Notificación flotante al otorgar permiso temporal
        this.#agregarNotif(id, `⏱ Permiso: ${zonaS.replace(/_/g,' ')}`, 'permiso');
        this.renderizarTodo();
        this.mostrarToast(`Permiso [${zonaS}] otorgado`,'ok');
      } catch(e){ this.mostrarToast(e.message,'error'); }
      finally { document.getElementById('modal-temporal').classList.remove('visible'); }
    };
  }

  #accionElevar(id) {
    const perfil  = this.#controlador.obtenerPerfil(id);
    const motivos = [
      'Emergencia quirúrgica activa','Guardia médica nocturna',
      'Ausencia de personal de mayor nivel','Protocolo de desastre',
      'Cobertura de turno crítico','Autorización del jefe de área',
      'Paciente en estado crítico','Refuerzo en UCI',
    ];
    document.getElementById('modal-elevar-personal').textContent = perfil.nombre;
    const grid = document.getElementById('modal-elevar-grid');
    grid.innerHTML = motivos.map(m=>`<button class="btn-zona" data-motivo="${m}">${m}</button>`).join('');

    let motiS=null;
    grid.querySelectorAll('.btn-zona').forEach(b=>{b.onclick=()=>{grid.querySelectorAll('.btn-zona').forEach(x=>x.classList.remove('seleccionada'));b.classList.add('seleccionada');motiS=b.dataset.motivo;};});

    document.getElementById('modal-elevar').classList.add('visible');
    document.getElementById('btn-elevar-cancelar').onclick = () => document.getElementById('modal-elevar').classList.remove('visible');
    document.getElementById('btn-elevar-confirmar').onclick = () => {
      if (!motiS){ this.mostrarToast('Selecciona un motivo','error'); return; }
      try {
        this.#controlador.elevarNivelAcceso(id,motiS);
        // Notificación flotante al elevar nivel
        this.#agregarNotif(id, `▲ Nivel elevado`, 'nivel');
        this.renderizarTodo();
        this.mostrarToast('Nivel de acceso elevado','ok');
      } catch(e){ this.mostrarToast(e.message,'error'); }
      finally { document.getElementById('modal-elevar').classList.remove('visible'); }
    };
  }

  //DATOS SEMILLA

  #seedCalificaciones() {
    const datos = {
      M001:{ puntuacion:4.7, comentarios:[
        {autor:'Enf. S. Mendez',texto:'Excelente disposición en urgencias. Muy puntual y precisa.',stars:5,fecha:'12/05/2026'},
        {autor:'Adm. R. Castillo',texto:'Coordina bien con el equipo administrativo.',stars:5,fecha:'08/05/2026'},
        {autor:'Ag. L. Torres',texto:'Siempre porta correctamente su identificación.',stars:4,fecha:'01/05/2026'},
      ]},
      M002:{ puntuacion:4.0, comentarios:[
        {autor:'Enf. J. Palacios',texto:'Buen desempeño en turno nocturno, aunque a veces llega tarde.',stars:4,fecha:'10/05/2026'},
      ]},
      E001:{ puntuacion:4.8, comentarios:[
        {autor:'Dra. E. Vargas',texto:'Sofia es la mejor enfermera del turno de mañana.',stars:5,fecha:'11/05/2026'},
        {autor:'Adm. R. Castillo',texto:'Muy proactiva y organizada.',stars:5,fecha:'05/05/2026'},
      ]},
      E002:{ puntuacion:3.5, comentarios:[
        {autor:'Dr. C. Ruiz',texto:'Cumple sus responsabilidades, puede mejorar comunicación.',stars:3,fecha:'09/05/2026'},
        {autor:'Ag. L. Torres',texto:'Requiere recordatorios frecuentes.',stars:4,fecha:'03/05/2026'},
      ]},
      A001:{ puntuacion:4.3, comentarios:[
        {autor:'Dra. E. Vargas',texto:'Resuelve trámites rápido y con precisión.',stars:4,fecha:'07/05/2026'},
      ]},
      S001:{ puntuacion:4.6, comentarios:[
        {autor:'Adm. R. Castillo',texto:'Muy atento en vigilancia nocturna, sin incidentes.',stars:5,fecha:'06/05/2026'},
        {autor:'Dr. C. Ruiz',texto:'Profesional y respetuoso con el equipo médico.',stars:4,fecha:'02/05/2026'},
      ]},
    };
    Object.entries(datos).forEach(([id,cal])=>{ this.#califs[id]=cal; });
  }

  //TOAST + BIND BASE

  mostrarToast(mensaje, tipo='info') {
    const zona = document.getElementById('zona-toast');
    const el   = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.textContent = mensaje;
    zona.appendChild(el);
    setTimeout(()=>el.classList.add('visible'),10);
    setTimeout(()=>{ el.classList.remove('visible'); setTimeout(()=>el.remove(),300); },3500);
  }

  #bindEventos() {
    document.querySelectorAll('.btn-alerta').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          this.#controlador.cambiarNivelAlerta(btn.dataset.nivel);
          this.renderizarTodo();
          this.mostrarToast(`Alerta cambiada a: ${btn.dataset.nivel}`, 'alerta');
        } catch(e){ this.mostrarToast(e.message,'error'); }
      });
    });

    document.getElementById('form-nuevo-personal').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      document.getElementById('modal-tipo').textContent        = f.tipo.value;
      document.getElementById('modal-id').textContent          = f.idPersonal.value.trim();
      document.getElementById('modal-nombre').textContent      = f.nombre.value.trim();
      document.getElementById('modal-turno-valor').textContent = f.turno.value;
      document.getElementById('modal-registro').classList.add('visible');

      document.getElementById('btn-modal-cancelar').onclick = () =>
        document.getElementById('modal-registro').classList.remove('visible');

      document.getElementById('btn-modal-confirmar').onclick = () => {
        try {
          this.#controlador.registrarPersonal(
            f.tipo.value, f.idPersonal.value.trim(), f.nombre.value.trim(), f.turno.value
          );
          this.renderizarTodo();
          f.reset();
          this.mostrarToast('Personal registrado correctamente','ok');
        } catch(err){ this.mostrarToast(err.message,'error'); }
        finally{ document.getElementById('modal-registro').classList.remove('visible'); }
      };
    });
  }
}