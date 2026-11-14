/* Cotización de proyectos a medida y ampliaciones.
   El número va fijo a la línea prefab (+56 9 9428 4048). */
(function () {
  const WA_DIGITS = '56994284048';

  const COMUNAS = [
    'La Serena',
    'Coquimbo',
    'Ovalle',
    'Vicuña',
    'Valle del Elqui',
    'Limarí',
    'Monte Patria',
    'Illapel',
    'Los Vilos',
    'Pichidangui',
    'Tongoy',
    'Guanaqueros',
    'Morrillos',
    'La Higuera',
    'Otra comuna',
  ];

  const RANGOS = [
    { id: 'compacta', label: 'Compacta / Refugio', area: '25–50 m²', note: 'Segunda vivienda, primera etapa o parcela pequeña.' },
    { id: 'familiar', label: 'Familiar Costa / Valle', area: '55–95 m²', note: '2 a 4 dormitorios, distribución a medida.' },
    { id: 'gran', label: 'Gran formato / Parcela', area: '100–180+ m²', note: 'Planta en L, U o doble altura según terreno.' },
  ];

  const ETAPAS = [
    'Obra gruesa habitable',
    'Llave en mano',
    'Aún no lo defino',
  ];

  const AMP_TIPOS = [
    { id: 'suite', label: 'Dormitorio en suite / habitaciones', tip: 'Crece tu familia sin mudarte.' },
    { id: 'piso', label: 'Segundo piso liviano', tip: 'Más m² cuidando la estructura existente.' },
    { id: 'social', label: 'Cocina, living o home office', tip: 'Espacios luminosos y aislados.' },
    { id: 'anexo', label: 'Quincho, terraza o anexo', tip: 'Uso familiar o arriendo en costa/interior.' },
  ];

  const TERRENOS = ['Sí, listo', 'En compra', 'Aún no'];
  const PLAZOS = ['Lo antes posible', '1 a 3 meses', '3 a 6 meses', 'Solo explorando'];
  const BUSCA = [
    'Vivienda permanente',
    'Segunda vivienda o cabaña',
    'Ampliar mi casa actual',
    'Local, bodega u oficina',
    'Aún no lo defino',
  ];

  let mode = 'medida';
  let selectedRango = null;
  let selectedAmp = null;
  let lastTrigger = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    select.replaceChildren(el('option', '', placeholder));
    select.firstChild.value = '';
    values.forEach((value) => select.add(new Option(value, value)));
  }

  function pagePath() {
    const path = window.location.pathname || '/';
    return /^\/[a-z0-9._/-]*$/i.test(path) ? path : '/';
  }

  function queueLead(payload) {
    if (payload.website) return;
    const body = JSON.stringify(payload);
    let queued = false;
    try {
      queued = navigator.sendBeacon('/api/leads.php', new Blob([body], { type: 'application/json' }));
    } catch (err) {
      queued = false;
    }
    if (!queued) {
      fetch('/api/leads.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  function renderRangos() {
    const root = document.getElementById('pf-featured');
    if (!root) return;
    root.replaceChildren();
    RANGOS.forEach((item) => {
      const card = el('article', 'pf-card pf-card--featured');
      const top = el('div', 'pf-card-top');
      const area = el('p', 'pf-m2');
      area.append(el('strong', '', item.area.split('–')[0] || item.area), el('span', '', 'm²'));
      if (item.area.includes('+')) area.querySelector('span').textContent = '+ m²';
      top.appendChild(area);
      card.appendChild(top);
      card.appendChild(el('h3', 'pf-name', item.label));
      card.appendChild(el('p', 'pf-spec', item.area));
      card.appendChild(el('p', 'pf-note', item.note));
      const button = el('button', 'btn btn-primary pf-quote', 'Cotizar este formato');
      button.type = 'button';
      button.addEventListener('click', () => openQuote('medida', item, null, button));
      card.appendChild(button);
      root.appendChild(card);
    });
  }

  function renderAmpCards() {
    const root = document.getElementById('amp-grid');
    if (!root || root.childElementCount) return;
    AMP_TIPOS.forEach((item) => {
      const card = el('article', 'amp-card');
      card.appendChild(el('h3', 'amp-card-title', item.label));
      card.appendChild(el('p', 'amp-card-text', item.tip));
      const button = el('button', 'btn btn-primary', 'Cotizar esta ampliación');
      button.type = 'button';
      button.setAttribute('data-preset-tipo', 'Ampliación');
      button.addEventListener('click', () => openQuote('ampliacion', null, item, button));
      card.appendChild(button);
      root.appendChild(card);
    });
  }

  function syncModeUI() {
    const title = document.getElementById('pf-quote-model');
    const meta = document.getElementById('pf-quote-meta');
    const etapaWrap = document.getElementById('pf-etapa-wrap');
    const ampWrap = document.getElementById('pf-amp-wrap');
    if (mode === 'ampliacion') {
      if (title) title.textContent = selectedAmp ? selectedAmp.label : 'Ampliación de vivienda';
      if (meta) meta.textContent = 'Cotización por WhatsApp de proyectos y ampliaciones.';
      if (etapaWrap) etapaWrap.hidden = true;
      if (ampWrap) ampWrap.hidden = false;
    } else {
      if (title) title.textContent = selectedRango ? selectedRango.label : 'Casa prefabricada a medida';
      if (meta) meta.textContent = selectedRango
        ? `${selectedRango.area}. ${selectedRango.note}`
        : 'Proyecto único según terreno, clima y presupuesto.';
      if (etapaWrap) etapaWrap.hidden = false;
      if (ampWrap) ampWrap.hidden = true;
    }
  }

  function readQuote() {
    const note = (document.getElementById('pf-nota')?.value || '').trim();
    const comuna = document.getElementById('pf-comuna')?.value || '';
    const etapa = document.getElementById('pf-etapa')?.value || '';
    const ampTipo = document.getElementById('pf-amp-tipo')?.value || '';
    const label = mode === 'ampliacion'
      ? (selectedAmp?.label || ampTipo || 'Ampliación')
      : (selectedRango ? `${selectedRango.label} (${selectedRango.area})` : 'Casa a medida');
    return {
      nombre: (document.getElementById('pf-nombre')?.value || '').trim(),
      phone: (document.getElementById('pf-phone')?.value || '').replace(/\D/g, ''),
      busca: document.getElementById('pf-busca')?.value || '',
      comuna,
      terreno: document.getElementById('pf-terreno')?.value || '',
      plazo: document.getElementById('pf-plazo')?.value || '',
      etapa,
      ampTipo,
      label,
      detalle: note,
      website: document.getElementById('pf-web')?.value || '',
    };
  }

  function quoteIssue(quote) {
    if (mode === 'medida' && !selectedRango && !quote.etapa) return 'Elige un formato o la etapa del proyecto.';
    if (mode === 'ampliacion' && !selectedAmp && !quote.ampTipo) return 'Indica el tipo de ampliación.';
    if (!quote.comuna) return 'Indica la comuna o el sector del terreno.';
    if (!quote.terreno || !quote.plazo) return 'Cuéntanos el estado del terreno y el plazo.';
    if (quote.nombre.length < 2) return 'Escribe tu nombre.';
    if (quote.phone.length < 8 || quote.phone.length > 15) return 'Revisa el teléfono.';
    if (!quote.busca) return 'Cuéntanos qué buscas.';
    return '';
  }

  function syncGate() {
    const ready = !quoteIssue(readQuote());
    const actions = document.getElementById('pf-wa-actions');
    const gate = document.getElementById('pf-gate');
    if (actions) actions.hidden = !ready;
    if (gate) gate.hidden = ready;
  }

  function showError(message) {
    const node = document.getElementById('pf-error');
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || '';
  }

  function messageFor(quote) {
    const lines = [
      `Hola, soy *${quote.nombre}* y vengo de la web.`,
      mode === 'ampliacion'
        ? `Quiero cotizar una *ampliación*: *${quote.label}*.`
        : `Quiero cotizar una *casa prefabricada a medida*: *${quote.label}*.`,
    ];
    if (mode === 'medida' && quote.etapa) lines.push(`Etapa deseada: *${quote.etapa}*.`);
    if (mode === 'ampliacion' && quote.ampTipo) lines.push(`Tipo: *${quote.ampTipo}*.`);
    lines.push(`Terreno en: *${quote.comuna}*, Región de Coquimbo.`);
    lines.push(`Terreno: ${quote.terreno}.`);
    lines.push(`Plazo: ${quote.plazo}.`);
    lines.push(`Busca: ${quote.busca}.`);
    lines.push(`Teléfono: ${quote.phone}.`);
    if (quote.detalle) lines.push(`Mensaje: ${quote.detalle}`);
    return lines.join('\n');
  }

  function openQuote(nextMode, rango, amp, trigger) {
    const modal = document.getElementById('pf-quote');
    if (!modal) {
      if (typeof window.openPrefabCotizador === 'function') {
        window.openPrefabCotizador({
          tipo: nextMode === 'ampliacion' ? 'Ampliación' : 'A medida',
          estilo: rango?.label || amp?.label || '',
        });
      }
      return;
    }
    mode = nextMode;
    selectedRango = rango;
    selectedAmp = amp;
    lastTrigger = trigger || null;
    syncModeUI();
    if (amp && document.getElementById('pf-amp-tipo')) {
      document.getElementById('pf-amp-tipo').value = amp.label;
    }
    if (mode === 'ampliacion' && document.getElementById('pf-busca')) {
      document.getElementById('pf-busca').value = 'Ampliar mi casa actual';
    }
    showError('');
    syncGate();
    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.classList.add('pf-lock');
    const focus = document.getElementById(mode === 'ampliacion' ? 'pf-amp-tipo' : 'pf-etapa');
    if (focus) focus.focus();
  }

  function closeQuote() {
    const modal = document.getElementById('pf-quote');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.hidden = true;
    document.body.classList.remove('pf-lock');
    selectedRango = null;
    selectedAmp = null;
    if (lastTrigger) lastTrigger.focus();
  }

  function submitQuote(event) {
    event.preventDefault();
    const quote = readQuote();
    const issue = quoteIssue(quote);
    if (issue) {
      showError(issue);
      syncGate();
      return;
    }
    showError('');
    const tipo = mode === 'ampliacion' ? 'Ampliación' : 'A medida';
    const estilo = mode === 'ampliacion'
      ? (quote.ampTipo || quote.label)
      : `${quote.label}${quote.etapa ? ` · ${quote.etapa}` : ''}`;
    queueLead({
      line: 'prefab',
      tipo,
      nombre: quote.nombre,
      apellido: '',
      email: '',
      phone: quote.phone,
      busca: quote.busca,
      fuente: '',
      detalle: quote.detalle || 'Quiere que lo contacten.',
      comuna: quote.comuna,
      terreno: quote.terreno,
      plazo: quote.plazo,
      estilo,
      layoutNote: estilo,
      page: pagePath(),
      website: quote.website,
    });
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'click_whatsapp', { line: 'prefab', source: 'pf_quote' });
    }
    window.open(`https://wa.me/${WA_DIGITS}?text=${encodeURIComponent(messageFor(quote))}`, '_blank', 'noopener,noreferrer');
    closeQuote();
  }

  function init() {
    const hasMedida = document.getElementById('pf-featured');
    const hasAmp = document.getElementById('amp-grid');
    if (!hasMedida && !hasAmp && !document.getElementById('pf-quote')) return;

    renderRangos();
    renderAmpCards();
    fillSelect(document.getElementById('pf-comuna'), COMUNAS, 'Elige comuna o sector');
    fillSelect(document.getElementById('pf-terreno'), TERRENOS, 'Estado del terreno');
    fillSelect(document.getElementById('pf-plazo'), PLAZOS, 'Plazo');
    fillSelect(document.getElementById('pf-busca'), BUSCA, 'Qué buscas');
    fillSelect(document.getElementById('pf-etapa'), ETAPAS, 'Etapa del proyecto');
    fillSelect(document.getElementById('pf-amp-tipo'), AMP_TIPOS.map((a) => a.label), 'Tipo de ampliación');

    const form = document.getElementById('pf-form');
    if (form) {
      form.addEventListener('input', syncGate);
      form.addEventListener('change', syncGate);
      form.addEventListener('submit', submitQuote);
    }

    document.querySelectorAll('[data-pf-close]').forEach((node) => {
      node.addEventListener('click', closeQuote);
    });
    document.querySelectorAll('[data-open-medida]').forEach((btn) => {
      btn.addEventListener('click', () => openQuote('medida', null, null, btn));
    });
    document.querySelectorAll('[data-open-ampliacion]').forEach((btn) => {
      btn.addEventListener('click', () => openQuote('ampliacion', null, null, btn));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.getElementById('pf-quote')?.classList.contains('is-open')) {
        closeQuote();
      }
    });

    window.openPrefabMedidaQuote = openQuote;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
