'use strict';

/* Números de cada línea: deben coincidir con LINES en js/main.js. */
const LINES = {
  modular: { label: 'Casas modulares', phone: '+56 9 7716 4000' },
  prefab: { label: 'Casas prefabricadas', phone: '+56 9 9428 4048' },
};

const STATUSES = [
  ['nuevo', 'Nuevo'],
  ['conversacion', 'En conversación'],
  ['cotizado', 'Cotización enviada'],
  ['ganado', 'Cerrado'],
  ['perdido', 'No avanzó'],
];

const FILTERS = [
  ['todos', 'Todos'],
  ['nuevo', 'Nuevos'],
  ['curso', 'En curso'],
  ['ganado', 'Cerrados'],
  ['perdido', 'No avanzó'],
];

const PAGES = {
  '/': 'Inicio',
  '/index.html': 'Inicio',
  '/ovalle.html': 'Ovalle',
  '/cuarta-region.html': 'Cuarta Región',
  '/casas-prefabricadas-la-serena.html': 'La Serena',
  '/casas-prefabricadas-coquimbo.html': 'Coquimbo',
};

const TERRENO = {
  'Sí, listo': 'Terreno listo',
  'En compra': 'Terreno en compra',
  'Aún no': 'Sin terreno',
};

const state = {
  token: '',
  leads: [],
  line: 'modular',
  filter: 'todos',
  query: '',
  openId: '',
  saving: '',
};

const whenFmt = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function $(id) { return document.getElementById(id); }

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function digits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function intlPhone(phone) {
  const d = digits(phone);
  return d.startsWith('56') ? d : '56' + d;
}

function prettyPhone(phone) {
  const d = digits(phone);
  const local = d.startsWith('56') ? d.slice(2) : d;
  if (local.length === 9) return '+56 ' + local.slice(0, 1) + ' ' + local.slice(1, 5) + ' ' + local.slice(5);
  return d ? '+' + intlPhone(phone) : '';
}

function stamp(lead) {
  return new Date(lead.resubmittedAt || lead.createdAt || 0).getTime();
}

function relative(iso) {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return 'hace ' + min + ' min';
  const h = Math.round(min / 60);
  if (h < 24) return 'hace ' + h + ' h';
  const d = Math.round(h / 24);
  if (d < 14) return 'hace ' + d + ' d';
  return whenFmt.format(new Date(iso));
}

function fullName(lead) {
  return [lead.nombre, lead.apellido].filter(Boolean).join(' ').trim();
}

function haystack(lead) {
  return [
    lead.nombre, lead.apellido, lead.email, lead.phone, lead.comuna,
    lead.detalle, lead.busca, lead.fuente, lead.estilo, lead.note, lead.layoutNote,
  ].join(' ').toLowerCase();
}

function matchesQuery(lead, query) {
  if (!query) return true;
  return haystack(lead).includes(query);
}

function matchesFilter(lead) {
  if (state.filter === 'todos') return true;
  if (state.filter === 'curso') return lead.status === 'conversacion' || lead.status === 'cotizado';
  return lead.status === state.filter;
}

function ofLine(line) {
  return state.leads.filter((lead) => lead.line === line);
}

async function api(path, options) {
  const opts = options || {};
  const headers = Object.assign({ 'X-Panel-Token': state.token || '' }, opts.headers || {});
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    state.token = '';
    showLogin();
    const err = new Error('auth');
    err.auth = true;
    throw err;
  }
  if (!res.ok) {
    throw new Error(data.error || 'No se pudo completar');
  }
  return data;
}

function showLogin(message) {
  $('boot-view').hidden = true;
  $('app-view').hidden = true;
  $('login-view').hidden = false;
  const error = $('login-error');
  error.hidden = !message;
  error.textContent = message || '';
  $('panel-password').focus();
}

function showApp() {
  $('boot-view').hidden = true;
  $('login-view').hidden = true;
  $('app-view').hidden = false;
}

async function boot() {
  try {
    const data = await fetch('/api/session.php', { credentials: 'same-origin' }).then((res) => res.json());
    if (!data.ok || !data.token) {
      showLogin();
      return;
    }
    state.token = data.token;
    showApp();
    await loadLeads();
  } catch (err) {
    showLogin('No pude abrir el seguimiento. Revisa la conexión.');
  }
}

async function loadLeads() {
  const error = $('list-error');
  error.hidden = true;
  try {
    const data = await api('/api/leads.php');
    state.leads = Array.isArray(data.leads) ? data.leads : [];
    render();
  } catch (err) {
    if (err.auth) return;
    error.hidden = false;
    error.textContent = err.message;
  }
}

function renderFilters() {
  const bar = $('filters');
  bar.replaceChildren();
  FILTERS.forEach(([id, label]) => {
    const btn = el('button', 'chip', label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', state.filter === id ? 'true' : 'false');
    btn.addEventListener('click', () => {
      state.filter = id;
      render();
    });
    bar.appendChild(btn);
  });
}

function renderSwitch() {
  ['modular', 'prefab'].forEach((line) => {
    const rows = ofLine(line);
    const fresh = rows.filter((lead) => lead.status === 'nuevo').length;
    $('count-' + line).textContent = String(fresh);
    $('sub-' + line).textContent = fresh === 1 ? 'sin revisar' : 'sin revisar · ' + rows.length + ' en total';
    const tab = $('tab-' + line);
    const on = state.line === line;
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const meta = LINES[state.line];
  $('inbox-note').textContent = 'Bandeja de ' + meta.label.toLowerCase() + '. El mensaje de la web llegó al ' + meta.phone + '. Aquí queda el contacto aunque no haya llegado a enviar el chat.';
}

function renderMetrics() {
  const rows = ofLine(state.line);
  const weekAgo = Date.now() - 7 * 86400000;
  $('metric-new').textContent = String(rows.filter((lead) => lead.status === 'nuevo').length);
  $('metric-week').textContent = String(rows.filter((lead) => stamp(lead) >= weekAgo).length);
  $('metric-open').textContent = String(rows.filter((lead) => lead.status === 'conversacion' || lead.status === 'cotizado').length);
  const pending = state.leads.filter((lead) => lead.status === 'nuevo').length;
  document.title = pending ? '(' + pending + ') Seguimiento · PrefabCoquimbo' : 'Seguimiento · PrefabCoquimbo';
}

function waHref(lead) {
  const text = 'Hola ' + lead.nombre + ', te escribo de PrefabCoquimbo por tu consulta de casa ' +
    (lead.line === 'modular' ? 'modular' : 'prefabricada') + ' en ' + lead.comuna + '.';
  return 'https://wa.me/' + intlPhone(lead.phone) + '?text=' + encodeURIComponent(text);
}

function addFact(dl, label, value) {
  if (!value) return;
  dl.appendChild(el('dt', '', label));
  dl.appendChild(el('dd', '', value));
}

function renderLead(lead) {
  const open = state.openId === lead.id;
  const hot = lead.plazo === 'Lo antes posible' && lead.terreno === 'Sí, listo';
  const card = el('article', 'lead' + (lead.status === 'nuevo' ? ' is-new' : '') + (hot ? ' is-hot' : ''));

  const toggle = el('button', 'lead-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

  const top = el('div', 'lead-top');
  const chips = el('div', 'chips');
  const statusLabel = STATUSES.find((row) => row[0] === lead.status);
  chips.appendChild(el('span', 'pill pill-' + (lead.status || 'nuevo'), statusLabel ? statusLabel[1] : 'Nuevo'));
  if (hot && lead.status === 'nuevo') chips.appendChild(el('span', 'flag', 'Urgente'));
  if (lead.recontacto) chips.appendChild(el('span', 'flag flag-again', 'Escribió de nuevo'));
  top.appendChild(chips);
  const when = el('time', 'when', relative(lead.resubmittedAt || lead.createdAt));
  when.dateTime = lead.resubmittedAt || lead.createdAt || '';
  when.title = whenFmt.format(new Date(lead.createdAt));
  top.appendChild(when);
  toggle.appendChild(top);

  toggle.appendChild(el('h2', '', fullName(lead)));
  toggle.appendChild(el('p', 'lead-phone', prettyPhone(lead.phone)));
  toggle.appendChild(el('p', 'lead-meta', [lead.comuna, lead.busca].filter(Boolean).join(' · ')));
  toggle.appendChild(el('p', 'lead-meta', [TERRENO[lead.terreno] || lead.terreno, lead.plazo].filter(Boolean).join(' · ')));
  if (!open && lead.detalle) toggle.appendChild(el('p', 'excerpt', lead.detalle));

  toggle.addEventListener('click', () => {
    state.openId = open ? '' : lead.id;
    render();
  });
  card.appendChild(toggle);

  const body = el('div', 'lead-body');
  body.hidden = !open;
  if (open) {
    body.appendChild(el('p', 'detail', lead.detalle));
    const facts = el('dl', 'facts');
    addFact(facts, 'Email', lead.email);
    addFact(facts, 'Teléfono', prettyPhone(lead.phone));
    addFact(facts, 'Estilo', lead.estilo);
    addFact(facts, 'Tipo', lead.tipo);
    addFact(facts, 'Nos conoció', lead.fuente);
    addFact(facts, 'Llegó desde', PAGES[lead.page] || lead.page);
    addFact(facts, 'Módulos', lead.layoutNote);
    body.appendChild(facts);

    const statusRow = el('div', 'status-row');
    STATUSES.forEach(([id, label]) => {
      const btn = el('button', 'status-btn', label);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', lead.status === id ? 'true' : 'false');
      btn.disabled = state.saving === lead.id;
      btn.addEventListener('click', () => saveLead(lead, id, body.querySelector('textarea')));
      statusRow.appendChild(btn);
    });
    body.appendChild(statusRow);

    const note = el('textarea', 'note');
    note.value = lead.note || '';
    note.placeholder = 'Nota interna. No la ve el cliente.';
    note.dataset.note = lead.id;
    const noteStatus = el('p', 'note-status', '');
    note.addEventListener('blur', (event) => {
      const next = event.relatedTarget;
      if (next && next.classList && next.classList.contains('status-btn')) return;
      saveLead(lead, lead.status, note, noteStatus);
    });
    body.appendChild(note);
    body.appendChild(noteStatus);

    const actions = el('div', 'actions');
    const wa = el('a', 'btn btn-wa', 'WhatsApp al cliente');
    wa.href = waHref(lead);
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    const call = el('a', 'btn btn-call', 'Llamar');
    call.href = 'tel:+' + intlPhone(lead.phone);
    const copy = el('button', 'btn btn-quiet', 'Copiar teléfono');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(prettyPhone(lead.phone));
        copy.textContent = 'Copiado';
      } catch (err) {
        copy.textContent = prettyPhone(lead.phone);
      }
    });
    actions.append(wa, call, copy);
    body.appendChild(actions);

    const zone = el('div', 'danger-zone');
    const remove = el('button', 'btn btn-quiet', 'Eliminar contacto');
    remove.type = 'button';
    remove.addEventListener('click', () => removeLead(lead));
    zone.appendChild(remove);
    body.appendChild(zone);
  }

  card.appendChild(body);
  return card;
}

function renderList() {
  const list = $('list');
  const query = state.query;
  const rows = ofLine(state.line)
    .filter((lead) => matchesFilter(lead) && matchesQuery(lead, query))
    .sort((a, b) => stamp(b) - stamp(a));
  list.replaceChildren();
  if (!rows.length) {
    const box = el('div', 'empty');
    const other = state.line === 'modular' ? 'prefab' : 'modular';
    const elsewhere = query && ofLine(other).some((lead) => matchesQuery(lead, query));
    if (elsewhere) {
      box.appendChild(el('p', '', 'Ese contacto está en ' + LINES[other].label.toLowerCase() + '.'));
      const jump = el('button', 'btn btn-ink', 'Ver ' + LINES[other].label.toLowerCase());
      jump.type = 'button';
      jump.addEventListener('click', () => {
        state.line = other;
        render();
      });
      box.appendChild(jump);
    } else if (!ofLine(state.line).length) {
      box.textContent = 'Todavía no hay clientes de ' + LINES[state.line].label.toLowerCase() + '. Aparecen cuando completan el formulario y se abre WhatsApp.';
    } else {
      box.textContent = 'Nada con ese filtro.';
    }
    list.appendChild(box);
    return;
  }
  rows.forEach((lead) => list.appendChild(renderLead(lead)));
}

function render() {
  renderSwitch();
  renderMetrics();
  renderFilters();
  renderList();
}

async function saveLead(lead, status, noteNode, noteStatus) {
  const note = noteNode ? noteNode.value : (lead.note || '');
  if (status === lead.status && note === (lead.note || '')) return;
  state.saving = lead.id;
  if (noteStatus) noteStatus.textContent = 'Guardando…';
  try {
    const data = await api('/api/leads.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Panel-Token': state.token },
      body: JSON.stringify({ action: 'update', id: lead.id, status, note }),
    });
    const idx = state.leads.findIndex((row) => row.id === lead.id);
    if (idx !== -1 && data.lead) state.leads[idx] = data.lead;
    state.saving = '';
    render();
  } catch (err) {
    state.saving = '';
    if (err.auth) return;
    if (noteStatus) noteStatus.textContent = err.message;
    else {
      $('list-error').hidden = false;
      $('list-error').textContent = err.message;
    }
  }
}

async function removeLead(lead) {
  const ok = window.confirm('¿Eliminar a ' + fullName(lead) + '? Esta acción no se deshace.');
  if (!ok) return;
  try {
    await api('/api/leads.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Panel-Token': state.token },
      body: JSON.stringify({ action: 'delete', id: lead.id }),
    });
    state.leads = state.leads.filter((row) => row.id !== lead.id);
    if (state.openId === lead.id) state.openId = '';
    render();
  } catch (err) {
    if (err.auth) return;
    $('list-error').hidden = false;
    $('list-error').textContent = err.message;
  }
}

function bind() {
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const btn = event.currentTarget.querySelector('button');
    btn.disabled = true;
    $('login-error').hidden = true;
    try {
      const data = await fetch('/api/session.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: $('panel-password').value }),
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'No se pudo entrar');
        return body;
      });
      state.token = data.token;
      $('panel-password').value = '';
      showApp();
      await loadLeads();
    } catch (err) {
      showLogin(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  document.querySelectorAll('[data-line]').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.line = tab.dataset.line;
      state.openId = '';
      render();
    });
  });

  $('search').addEventListener('input', () => {
    state.query = $('search').value.trim().toLowerCase();
    renderList();
    renderSwitch();
  });

  $('refresh-btn').addEventListener('click', loadLeads);
  $('logout-btn').addEventListener('click', async () => {
    try {
      await api('/api/session.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Panel-Token': state.token },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (err) { /* la sesión local se cierra igual */ }
    state.token = '';
    state.leads = [];
    showLogin();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.token) loadLeads();
  });
}

bind();
boot();
