'use strict';

const PRECIOS_URL = 'data/precios.json';
const PDF_API = 'api/generar-pdf.php';

const state = {
  precios: null,
  estilo: 'Tradicional',
  metros: '54',
  comuna: 'La Serena',
  materialidad: 'sip',
  terminacion: 'estandar',
  extras: new Set(),
};

function bootPresupuesto() {
  const root = document.getElementById('presupuesto-app');
  if (!root) return;

  fetch(PRECIOS_URL)
    .then((r) => {
      if (!r.ok) throw new Error('No se pudo cargar precios');
      return r.json();
    })
    .then((data) => {
      state.precios = data;
      data.extras.forEach((ex) => {
        if (ex.default) state.extras.add(ex.id);
      });
      renderForm(root);
      bindForm(root);
      refreshQuote();
    })
    .catch((err) => {
      root.innerHTML = `<p class="pq-error">No pudimos cargar el armador. Revisa data/precios.json.<br><small>${escapeHtml(err.message)}</small></p>`;
    });
}

function formatClp(n) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildQuoteLocal() {
  const p = state.precios;
  const m2 = p.metros[state.metros].m2;
  const estilo = p.estilos[state.estilo];
  const mat = p.materialidad[state.materialidad];
  const term = p.terminacion[state.terminacion];
  const traslado = p.traslado[state.comuna];

  const items = [];

  const base = Math.round(estilo.clpPorM2 * m2 * mat.factor);
  items.push({ codigo: 'EST', nombre: `Estructura y cerramiento — ${estilo.label} (${m2} m²)`, total: base });

  const termAmt = Math.round(term.clpPorM2 * m2);
  if (termAmt > 0) {
    items.push({ codigo: 'TER', nombre: `Terminación ${term.label}`, total: termAmt });
  }

  items.push({
    codigo: 'FUN',
    nombre: p.fijos.fundaciones.nombre,
    total: Math.round(p.fijos.fundaciones.clpPorM2 * m2),
  });
  items.push({
    codigo: 'MON',
    nombre: p.fijos.montaje.nombre,
    total: Math.round(p.fijos.montaje.clpPorM2 * m2),
  });
  items.push({
    codigo: 'TRA',
    nombre: `Traslado e izaje — ${state.comuna} (${traslado.zona})`,
    total: traslado.clp,
  });
  items.push({
    codigo: 'ASE',
    nombre: p.fijos.asesoria.nombre,
    total: p.fijos.asesoria.clp,
  });

  p.extras.forEach((ex) => {
    if (state.extras.has(ex.id)) {
      items.push({ codigo: 'EXT', nombre: ex.nombre, total: ex.clp });
    }
  });

  const neto = items.reduce((sum, it) => sum + it.total, 0);
  const iva = Math.round(neto * p.iva);
  const total = neto + iva;

  return {
    items,
    totales: {
      neto,
      iva,
      total,
      clpPorM2: Math.round(total / m2),
    },
    proyecto: {
      m2,
      metrosLabel: p.metros[state.metros].label,
      dormitorios: p.metros[state.metros].dormitorios,
      hint: p.metros[state.metros].hint,
      estilo: estilo.label,
      materialidad: mat.label,
      terminacion: term.label,
      terminacionIncluye: term.incluye,
      comuna: state.comuna,
      zona: traslado.zona,
    },
  };
}

function renderForm(root) {
  const p = state.precios;

  const estiloOpts = Object.keys(p.estilos)
    .map(
      (k) =>
        `<button type="button" class="pq-chip${state.estilo === k ? ' is-on' : ''}" data-field="estilo" data-value="${escapeHtml(k)}">${escapeHtml(p.estilos[k].label)}</button>`
    )
    .join('');

  const metrosOpts = Object.keys(p.metros)
    .map((k) => {
      const m = p.metros[k];
      return `<button type="button" class="pq-card-opt${state.metros === k ? ' is-on' : ''}" data-field="metros" data-value="${escapeHtml(k)}">
        <strong>${escapeHtml(m.label)}</strong>
        <span>${escapeHtml(m.dormitorios)}</span>
        <em>${escapeHtml(m.hint)}</em>
      </button>`;
    })
    .join('');

  const comunaOpts = Object.keys(p.traslado)
    .map(
      (k) =>
        `<option value="${escapeHtml(k)}"${state.comuna === k ? ' selected' : ''}>${escapeHtml(k)} · ${escapeHtml(p.traslado[k].zona)}</option>`
    )
    .join('');

  const matOpts = Object.keys(p.materialidad)
    .map(
      (k) =>
        `<button type="button" class="pq-chip${state.materialidad === k ? ' is-on' : ''}" data-field="materialidad" data-value="${escapeHtml(k)}">${escapeHtml(p.materialidad[k].label)}</button>`
    )
    .join('');

  const termOpts = Object.keys(p.terminacion)
    .map((k) => {
      const t = p.terminacion[k];
      return `<button type="button" class="pq-term${state.terminacion === k ? ' is-on' : ''}" data-field="terminacion" data-value="${escapeHtml(k)}">
        <strong>${escapeHtml(t.label)}</strong>
        <span>${escapeHtml(t.incluye)}</span>
      </button>`;
    })
    .join('');

  const extrasOpts = p.extras
    .map((ex) => {
      const on = state.extras.has(ex.id);
      return `<label class="pq-extra${on ? ' is-on' : ''}">
        <input type="checkbox" data-extra="${escapeHtml(ex.id)}"${on ? ' checked' : ''} />
        <span class="pq-extra-text">
          <strong>${escapeHtml(ex.nombre)}</strong>
          <em>${formatClp(ex.clp)}</em>
        </span>
      </label>`;
    })
    .join('');

  root.innerHTML = `
    <div class="pq-layout">
      <section class="pq-panel" aria-label="Armar presupuesto">
        <div class="pq-block">
          <h2 class="pq-label">Estilo</h2>
          <div class="pq-chips" id="pq-estilo">${estiloOpts}</div>
          <p class="pq-hint" id="pq-estilo-hint"></p>
        </div>

        <div class="pq-block">
          <h2 class="pq-label">Metros</h2>
          <div class="pq-cards" id="pq-metros">${metrosOpts}</div>
        </div>

        <div class="pq-block pq-block--row">
          <div>
            <h2 class="pq-label">Comuna</h2>
            <select class="pq-select" id="pq-comuna">${comunaOpts}</select>
          </div>
          <div>
            <h2 class="pq-label">Materialidad</h2>
            <div class="pq-chips" id="pq-mat">${matOpts}</div>
          </div>
        </div>

        <div class="pq-block">
          <h2 class="pq-label">Nivel de terminación</h2>
          <div class="pq-terms" id="pq-term">${termOpts}</div>
        </div>

        <div class="pq-block">
          <h2 class="pq-label">Opcionales</h2>
          <div class="pq-extras" id="pq-extras">${extrasOpts}</div>
        </div>

        <div class="pq-block">
          <h2 class="pq-label">Datos del cliente <span>(opcional para el PDF)</span></h2>
          <div class="pq-fields">
            <input class="form-input" type="text" id="pq-nombre" placeholder="Nombre" autocomplete="name" />
            <input class="form-input" type="tel" id="pq-telefono" placeholder="WhatsApp" inputmode="numeric" autocomplete="tel" />
            <input class="form-input" type="email" id="pq-email" placeholder="Email" autocomplete="email" />
            <textarea class="form-input pq-textarea" id="pq-notas" placeholder="Notas del terreno, acceso, plazos…" rows="2"></textarea>
          </div>
        </div>
      </section>

      <aside class="pq-summary" aria-live="polite">
        <div class="pq-summary-inner">
          <p class="pq-summary-kicker">Estimación referencial</p>
          <h2 class="pq-summary-title" id="pq-summary-title">—</h2>
          <p class="pq-summary-sub" id="pq-summary-sub"></p>

          <ul class="pq-lines" id="pq-lines"></ul>

          <div class="pq-totals">
            <div class="pq-tot-row"><span>Neto</span><strong id="pq-neto">—</strong></div>
            <div class="pq-tot-row"><span>IVA 19%</span><strong id="pq-iva">—</strong></div>
            <div class="pq-tot-row pq-tot-row--grand"><span>Total</span><strong id="pq-total">—</strong></div>
            <p class="pq-per-m2" id="pq-perm2"></p>
          </div>

          <p class="pq-disclaimer">${escapeHtml(p.nota)}</p>

          <div class="pq-actions">
            <button type="button" class="btn btn-primary" id="pq-pdf">Descargar PDF</button>
            <button type="button" class="btn btn-secondary" id="pq-wa">Enviar por WhatsApp</button>
          </div>
          <p class="pq-status" id="pq-status" hidden></p>
        </div>
      </aside>
    </div>
  `;
}

function bindForm(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-field]');
    if (!btn) return;
    const { field, value } = btn.dataset;
    if (!field) return;
    state[field] = value;
    root.querySelectorAll(`[data-field="${field}"]`).forEach((el) => {
      el.classList.toggle('is-on', el.dataset.value === value);
    });
    refreshQuote();
  });

  root.querySelector('#pq-comuna')?.addEventListener('change', (e) => {
    state.comuna = e.target.value;
    refreshQuote();
  });

  root.querySelectorAll('[data-extra]').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.dataset.extra;
      if (input.checked) state.extras.add(id);
      else state.extras.delete(id);
      input.closest('.pq-extra')?.classList.toggle('is-on', input.checked);
      refreshQuote();
    });
  });

  document.getElementById('pq-pdf')?.addEventListener('click', generatePdf);
  document.getElementById('pq-wa')?.addEventListener('click', sendWhatsApp);
}

function refreshQuote() {
  if (!state.precios) return;
  const q = buildQuoteLocal();
  const estiloHint = state.precios.estilos[state.estilo].descripcion;

  const hintEl = document.getElementById('pq-estilo-hint');
  if (hintEl) hintEl.textContent = estiloHint;

  document.getElementById('pq-summary-title').textContent =
    `${q.proyecto.estilo} · ${q.proyecto.metrosLabel}`;
  document.getElementById('pq-summary-sub').textContent =
    `${q.proyecto.dormitorios} · ${q.proyecto.comuna} · ${q.proyecto.materialidad} · ${q.proyecto.terminacion}`;

  const lines = document.getElementById('pq-lines');
  lines.innerHTML = q.items
    .map(
      (it) =>
        `<li><span>${escapeHtml(it.nombre)}</span><strong>${formatClp(it.total)}</strong></li>`
    )
    .join('');

  document.getElementById('pq-neto').textContent = formatClp(q.totales.neto);
  document.getElementById('pq-iva').textContent = formatClp(q.totales.iva);
  document.getElementById('pq-total').textContent = formatClp(q.totales.total);
  document.getElementById('pq-perm2').textContent =
    `${formatClp(q.totales.clpPorM2)} / m² c/IVA · pensado para familia en IV Región`;
}

function payloadFromForm() {
  return {
    estilo: state.estilo,
    metros: state.metros,
    comuna: state.comuna,
    materialidad: state.materialidad,
    terminacion: state.terminacion,
    extras: Array.from(state.extras),
    cliente: {
      nombre: document.getElementById('pq-nombre')?.value.trim() || '',
      telefono: document.getElementById('pq-telefono')?.value.trim() || '',
      email: document.getElementById('pq-email')?.value.trim() || '',
      notas: document.getElementById('pq-notas')?.value.trim() || '',
    },
  };
}

function setStatus(msg, isError) {
  const el = document.getElementById('pq-status');
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
  el.classList.toggle('is-error', !!isError);
}

async function generatePdf() {
  const btn = document.getElementById('pq-pdf');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generando PDF…';
  }
  setStatus('Armando PDF con tu marca…');

  try {
    const res = await fetch(PDF_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFromForm()),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.pdfUrl) {
      throw new Error(data.error || 'No se pudo generar el PDF');
    }
    setStatus(`Listo · ${data.numero}`);
    window.open(data.pdfUrl, '_blank', 'noopener,noreferrer');
    if (typeof trackEvent === 'function') {
      trackEvent('presupuesto_pdf', { estilo: state.estilo, metros: state.metros, comuna: state.comuna });
    }
  } catch (err) {
    setStatus(err.message || 'Error al generar PDF', true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Descargar PDF';
    }
  }
}

function sendWhatsApp() {
  const q = buildQuoteLocal();
  const cliente = payloadFromForm().cliente;
  const parts = [
    'Hola PrefabCoquimbo, armé una estimación referencial en la web:',
    `• ${q.proyecto.estilo} ${q.proyecto.metrosLabel} (${q.proyecto.dormitorios})`,
    `• ${q.proyecto.comuna} · ${q.proyecto.materialidad} · terminación ${q.proyecto.terminacion}`,
    `• Total estimado c/IVA: ${formatClp(q.totales.total)}`,
  ];
  if (cliente.nombre) parts.push(`• Nombre: ${cliente.nombre}`);
  if (cliente.telefono) parts.push(`• WhatsApp: ${cliente.telefono}`);
  if (cliente.notas) parts.push(`• Notas: ${cliente.notas}`);
  parts.push('¿Me ayudan a ajustar al terreno?');

  const phone = (typeof CONFIG !== 'undefined' && CONFIG.whatsappNumber) || '56994284048';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(parts.join('\n'))}`;
  if (typeof trackEvent === 'function') {
    trackEvent('presupuesto_whatsapp', { estilo: state.estilo, metros: state.metros, total: q.totales.total });
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootPresupuesto);
} else {
  bootPresupuesto();
}
