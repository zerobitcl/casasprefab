/* Catálogo y cotización de casas prefabricadas.
   El número va fijo: esta línea no puede salir al WhatsApp de modulares. */
(function () {
  const WA_DIGITS = '56994284048';

  const COMUNAS = [
    'La Serena',
    'Coquimbo',
    'Peñuelas',
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

  const TERRENOS = ['Sí, listo', 'En compra', 'Aún no'];
  const PLAZOS = ['Lo antes posible', '1 a 3 meses', '3 a 6 meses', 'Solo explorando'];
  const BUSCA = ['Vivienda permanente', 'Segunda vivienda o cabaña', 'Local, bodega u oficina', 'Aún no lo defino'];
  const FUENTES = ['Google', 'Instagram o Facebook', 'Recomendación', 'Letrero u obra', 'Otro'];

  const KIT_GROUPS = [
    ['Pisos y cielos', ['Kit Piso', 'Kit Viga a la Vista', 'Kit Cielo Madera', 'Kit Cielo (tipo Vulcometal)']],
    ['Revestimientos interiores', ['Kit Forro Terciado Ranurado', 'Kit Forro Yeso Cartón']],
    ['Puertas y ventanas', ['Kit Ventanas estándar', 'Kit Ventanas Termopanel', 'Pack Puertas Interior (+ accesorios)', 'Pack Puertas Exterior (+ accesorios)']],
    ['Techumbre y fachada', ['Kit Siding PVC', 'Kit Tejas + Altura Cerchas', 'Kit Siding PVC + Teja Asfáltica + Altura Cerchas', 'Elevación de Cerchas']],
  ];

  const FEATURED = [
    ['Coquimbo', '63'],
    ['Morrillos', '72'],
    ['Costa Norte', '76'],
    ['Coquimbo', '128'],
  ];

  const MODELS = [
    { name: 'Studio Costero', area: '15', beds: 1, baths: 1, floors: 1, segment: 'compacta', note: 'Formato tiny house con kitchenette.' },
    { name: 'Módulo Terraza', area: '21', beds: 1, baths: 1, floors: 1, segment: 'compacta', note: 'Diseño moderno con doble terraza proyectada.' },
    { name: 'Cabaña Clásica', area: '24', beds: 1, baths: 1, floors: 1, segment: 'compacta', note: 'Techo tradicional a dos aguas.' },
    { name: 'Refugio', area: '26', beds: 1, baths: 1, floors: 1, segment: 'compacta', note: 'Techo moderno de una caída.' },
    { name: 'Mediterránea Compacta', area: '30', beds: 1, baths: 1, floors: 1, segment: 'compacta', note: 'Área social separada del dormitorio.' },
    { name: 'Clásica', area: '36', beds: 2, baths: 1, floors: 1, segment: 'compacta', note: 'Planta rectangular tradicional, con alero frontal o planta en L.' },
    { name: 'Mediterránea', area: '36', beds: 2, baths: 1, floors: 1, segment: 'compacta', note: 'Planta en L y fachada recta contemporánea.' },
    { name: 'Loft Panorámico', area: '38', beds: 2, baths: 1, floors: 1, segment: 'compacta', note: 'Techo inclinado con ventanales superiores y cocina americana.' },
    { name: 'Clásica', area: '42', beds: 2, baths: 1, floors: 1, segment: 'compacta', note: 'Planta rectangular con porche de acceso.' },
    { name: 'Refugio Familiar', area: '47', beds: 3, baths: 1, floors: 1, segment: 'compacta', note: 'Tres dormitorios en un formato compacto.' },
    { name: 'Mirador', area: '48', beds: 3, baths: 1, floors: 1, segment: 'compacta', note: 'Living con salida en punta y vigas a la vista.' },
    { name: 'Clásica', area: '48', beds: 2, baths: 1, floors: 1, segment: 'compacta', note: 'Distribución holgada de dos habitaciones.' },
    { name: 'Tradicional', area: '54', beds: 3, baths: 1, floors: 1, segment: 'media', note: 'Doble frontón o terraza en L.' },
    { name: 'Clásica Desnivel', area: '57', beds: 3, baths: 1, floors: 1, segment: 'media', note: 'Techo a dos aguas en desnivel.' },
    { name: 'Costera', area: '60', beds: 4, baths: 2, floors: 1, segment: 'media', note: 'Fachada recta con gran terraza techada frontal.' },
    { name: 'Coquimbo', area: '63', beds: 3, baths: 2, floors: 1, segment: 'media', note: 'Fachada recta mediterránea minimalista. También en techo tradicional con suite independiente.' },
    { name: 'Familiar', area: '72', beds: 4, baths: 2, floors: 1, segment: 'media', note: 'Techo tradicional a dos aguas.' },
    { name: 'Mediterránea', area: '72', beds: 4, baths: 2, floors: 1, segment: 'media', vulcan: true, note: 'Planta en L de fachada moderna. Disponible en madera y Vulcometal.' },
    { name: 'Morrillos', area: '72', beds: 4, baths: 2, floors: 1, segment: 'media', vulcan: true, note: 'Estilo costero mediterráneo con pérgola frontal integrada. Disponible en madera y Vulcometal.' },
    { name: 'Costa Norte', area: '76', beds: 3, baths: 2, floors: 2, segment: 'media', note: 'Diseño cúbico de dos niveles, para terrenos costeros o con vista panorámica.' },
    { name: 'Terraza Premium', area: '78', beds: 2, baths: 2, floors: 1, segment: 'media', note: 'Arquitectura moderna con pérgolas perimetrales.' },
    { name: 'Mirador', area: '80', beds: 4, baths: 2, floors: 1, segment: 'media', note: 'Frontón central vidriado con vigas a la vista.' },
    { name: 'Planta en L', area: '83', beds: 4, baths: 2, floors: 1, segment: 'media', note: 'Estilo tradicional a dos aguas.' },
    { name: 'Mediterránea', area: '84', beds: 4, baths: 2, floors: 1, segment: 'media', note: 'Techo oculto, planta en L.' },
    { name: 'Clásica', area: '84', beds: 4, baths: 2, floors: 1, segment: 'media', note: 'Distribución amplia para cocina americana con isla.' },
    { name: 'Costera', area: '85', beds: 3, baths: 2, floors: 1, segment: 'media', note: 'Planta alargada moderna.' },
    { name: 'Familiar', area: '90', beds: 4, baths: 3, floors: 1, segment: 'media', note: 'Tres frontones en fachada y dos dormitorios en suite.' },
    { name: 'Estilo Nórdico', area: '95', beds: 4, baths: 3, floors: 1, segment: 'media', note: 'Diseño tipo galpón moderno con techo alto.' },
    { name: 'Moderna', area: '100', beds: 3, baths: 2, floors: 1, segment: 'grande', note: 'Aleros proyectados y grandes ventanales.' },
    { name: 'Moderna', area: '100.5', beds: 4, baths: 2, floors: 1, segment: 'grande', note: 'Cuatro dormitorios y corredor techado.' },
    { name: 'Gran Familiar', area: '108', beds: 6, baths: 3, floors: 1, segment: 'grande', note: 'Seis dormitorios en un solo volumen.' },
    { name: 'Terraza Premium', area: '110', beds: 3, baths: 2, floors: 1, segment: 'grande', note: 'Diseño contemporáneo con terraza y pérgolas.' },
    { name: 'Planta en L', area: '117', beds: 4, baths: 2, floors: 1, segment: 'grande', note: 'Suite con walk-in closet, versión tradicional.' },
    { name: 'Mediterránea', area: '117', beds: 4, baths: 2, floors: 1, segment: 'grande', note: 'Misma planta en L, con techo mediterráneo.' },
    { name: 'Doble Suite', area: '120', beds: 4, baths: 3, floors: 1, segment: 'grande', note: 'Doble dormitorio en suite, en extremos opuestos.' },
    { name: 'Coquimbo', area: '128', beds: 4, baths: 2, floors: 1, segment: 'grande', note: 'Fachada mediterránea continua y amplia zona social. También en techo tradicional.' },
    { name: 'Planta en L', area: '141', beds: 4, baths: 3, floors: 1, segment: 'grande', vulcan: true, note: 'Gran formato con sala de estar. Versión tradicional, en madera o Vulcometal.' },
    { name: 'Mediterránea', area: '141', beds: 4, baths: 3, floors: 1, segment: 'grande', vulcan: true, note: 'Planta en L mediterránea. Disponible en madera y Vulcometal.' },
    { name: 'Familiar', area: '144', beds: 4, baths: 3, floors: 1, segment: 'grande', note: 'Suite principal con gran walk-in closet.' },
    { name: 'Gran Casona', area: '171', beds: 6, baths: 3, floors: 1, segment: 'grande', note: 'El mayor metraje del catálogo: seis dormitorios y gran salón central.' },
  ];

  const SEGMENTS = {
    compacta: 'Compactas · 15 a 48 m²',
    media: 'Medianas · 54 a 95 m²',
    grande: 'Gran formato · 100 a 171 m²',
  };

  let current = null;
  let lastTrigger = null;

  function findModel(name, area) {
    return MODELS.find((model) => model.name === name && model.area === area) || null;
  }

  function modelLabel(model) {
    return `Modelo ${model.name} ${model.area} m² - ${model.beds}D/${model.baths}B`;
  }

  function roomLine(model) {
    const beds = model.beds === 1 ? '1 dormitorio' : `${model.beds} dormitorios`;
    const baths = model.baths === 1 ? '1 baño' : `${model.baths} baños`;
    const floors = model.floors === 2 ? '2 pisos' : '1 piso';
    return `${beds} · ${baths} · ${floors}`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildCard(model, featured) {
    const card = el('article', featured ? 'pf-card pf-card--featured' : 'pf-card');
    card.dataset.segment = model.segment;
    const top = el('div', 'pf-card-top');
    const area = el('p', 'pf-m2');
    area.append(el('strong', '', model.area), el('span', '', 'm²'));
    top.appendChild(area);
    if (model.vulcan) top.appendChild(el('span', 'pf-badge', 'Vulcometal'));
    card.appendChild(top);
    card.appendChild(el('h3', 'pf-name', model.name));
    card.appendChild(el('p', 'pf-spec', roomLine(model)));
    card.appendChild(el('p', 'pf-note', model.note));
    const button = el('button', 'btn btn-primary pf-quote', 'Cotizar este modelo');
    button.type = 'button';
    button.setAttribute('aria-label', `Cotizar ${modelLabel(model)}`);
    button.addEventListener('click', () => openQuote(model, button));
    card.appendChild(button);
    return card;
  }

  function renderCatalog() {
    const featuredRoot = document.getElementById('pf-featured');
    const grid = document.getElementById('pf-grid');
    if (!featuredRoot || !grid) return;
    FEATURED.forEach(([name, area]) => {
      const model = findModel(name, area);
      if (model) featuredRoot.appendChild(buildCard(model, true));
    });
    MODELS.forEach((model) => grid.appendChild(buildCard(model, false)));
  }

  function showSegment(id) {
    const grid = document.getElementById('pf-grid');
    const title = document.getElementById('pf-segment-title');
    if (!grid) return;
    grid.querySelectorAll('.pf-card').forEach((card) => {
      card.hidden = card.dataset.segment !== id;
    });
    if (title) title.textContent = SEGMENTS[id] || '';
    document.querySelectorAll('.pf-tab').forEach((tab) => {
      const on = tab.dataset.segment === id;
      tab.classList.toggle('is-on', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    select.replaceChildren(el('option', '', placeholder));
    select.firstChild.value = '';
    values.forEach((value) => select.add(new Option(value, value)));
  }

  function renderKits() {
    const root = document.getElementById('pf-kits');
    if (!root || root.childElementCount) return;
    KIT_GROUPS.forEach(([title, items]) => {
      const group = el('fieldset', 'pf-kit-group');
      group.appendChild(el('legend', '', title));
      items.forEach((item) => {
        const label = el('label', 'pf-check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'pf-kit';
        input.value = item;
        label.append(input, document.createTextNode(item));
        group.appendChild(label);
      });
      root.appendChild(group);
    });
  }

  function selectedKits() {
    return Array.from(document.querySelectorAll('#pf-kits input:checked')).map((input) => input.value);
  }

  function configValue() {
    const picked = document.querySelector('input[name="pf-config"]:checked');
    return picked ? picked.value : '';
  }

  function syncKits() {
    const panel = document.getElementById('pf-kits-panel');
    const extras = configValue() === 'Kit Inicial + Adicionales';
    if (panel) panel.hidden = !extras;
    if (!extras) {
      document.querySelectorAll('#pf-kits input:checked').forEach((input) => {
        input.checked = false;
      });
    }
  }

  function readQuote() {
    const note = (document.getElementById('pf-nota')?.value || '').trim();
    const material = document.getElementById('pf-mat')?.value || '';
    const config = configValue();
    const kits = config === 'Kit Inicial + Adicionales' ? selectedKits() : [];
    const comuna = document.getElementById('pf-comuna')?.value || '';
    const label = current ? modelLabel(current) : '';
    const base = `${label}. Materialidad ${material}. ${config}. Terreno en ${comuna}, Región de Coquimbo.`;
    return {
      nombre: (document.getElementById('pf-nombre')?.value || '').trim(),
      apellido: (document.getElementById('pf-apellido')?.value || '').trim(),
      email: (document.getElementById('pf-email')?.value || '').trim(),
      phone: (document.getElementById('pf-phone')?.value || '').replace(/\D/g, ''),
      busca: document.getElementById('pf-busca')?.value || '',
      fuente: document.getElementById('pf-fuente')?.value || '',
      comuna,
      terreno: document.getElementById('pf-terreno')?.value || '',
      plazo: document.getElementById('pf-plazo')?.value || '',
      material,
      config,
      kits,
      label,
      detalle: note.length >= 12 ? note : `${base}${note ? ` ${note}` : ''}`,
      website: document.getElementById('pf-web')?.value || '',
    };
  }

  function quoteIssue(quote) {
    if (!current) return 'Elige un modelo del catálogo.';
    if (!quote.material) return 'Elige la materialidad.';
    if (quote.material === 'Vulcometal' && !current.vulcan) return 'Este modelo se cotiza en madera.';
    if (!quote.config) return 'Elige si partes solo con el kit o sumas adicionales.';
    if (!quote.comuna) return 'Indica la comuna o el sector del terreno.';
    if (!quote.terreno || !quote.plazo) return 'Cuéntanos el estado del terreno y el plazo.';
    if (quote.nombre.length < 2 || quote.apellido.length < 2) return 'Escribe nombre y apellido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.email)) return 'Revisa el email.';
    if (quote.phone.length < 8 || quote.phone.length > 15) return 'Revisa el teléfono.';
    if (!quote.busca || !quote.fuente) return 'Completa qué buscas y cómo nos conociste.';
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

  function messageFor(quote) {
    const lines = [
      `Hola, soy *${quote.nombre} ${quote.apellido}* y vengo de la web.`,
      `Quiero cotizar el *${quote.label}*.`,
      `Materialidad: *${quote.material}*.`,
      `Configuración: *${quote.config}*.`,
    ];
    if (quote.kits.length) lines.push(`Adicionales: ${quote.kits.join(', ')}.`);
    lines.push(`Terreno en: *${quote.comuna}*, Región de Coquimbo.`);
    lines.push(`Terreno: ${quote.terreno}.`);
    lines.push(`Plazo: ${quote.plazo}.`);
    lines.push(`Busca: ${quote.busca}.`);
    lines.push(`Email: ${quote.email}.`);
    lines.push(`Teléfono: ${quote.phone}.`);
    lines.push(`Detalle: ${quote.detalle}`);
    return lines.join('\n');
  }

  function fillMaterial(model) {
    const select = document.getElementById('pf-mat');
    if (!select) return;
    select.replaceChildren();
    select.add(new Option('Madera', 'Madera'));
    /* Vulcometal solo existe en 72 m² costero/mediterráneo y en la planta en L de 141 m². */
    if (model.vulcan) select.add(new Option('Vulcometal', 'Vulcometal'));
    select.value = 'Madera';
  }

  function openQuote(model, trigger) {
    const modal = document.getElementById('pf-quote');
    if (!modal) return;
    current = model;
    lastTrigger = trigger || null;
    const title = document.getElementById('pf-quote-model');
    if (title) title.textContent = modelLabel(model);
    const meta = document.getElementById('pf-quote-meta');
    if (meta) meta.textContent = `${roomLine(model)}. ${model.note}`;
    fillMaterial(model);
    const solo = document.querySelector('input[name="pf-config"][value="Solo Kit Inicial"]');
    if (solo) solo.checked = true;
    syncKits();
    showError('');
    syncGate();
    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.classList.add('pf-lock');
    const focus = document.getElementById('pf-mat');
    if (focus) focus.focus();
  }

  function closeQuote() {
    const modal = document.getElementById('pf-quote');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.hidden = true;
    document.body.classList.remove('pf-lock');
    current = null;
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
    const kits = quote.kits.join(', ');
    queueLead({
      line: 'prefab',
      tipo: 'Prefabricada',
      nombre: quote.nombre,
      apellido: quote.apellido,
      email: quote.email,
      phone: quote.phone,
      busca: quote.busca,
      fuente: quote.fuente,
      detalle: quote.detalle,
      comuna: quote.comuna,
      terreno: quote.terreno,
      plazo: quote.plazo,
      estilo: quote.material,
      layoutNote: `${quote.label} · ${quote.material} · ${quote.config}${kits ? ` · ${kits}` : ''}`,
      page: pagePath(),
      website: quote.website,
    });
    window.open(`https://wa.me/${WA_DIGITS}?text=${encodeURIComponent(messageFor(quote))}`, '_blank', 'noopener,noreferrer');
    closeQuote();
  }

  function init() {
    if (!document.getElementById('pf-featured')) return;
    renderCatalog();
    renderKits();
    fillSelect(document.getElementById('pf-comuna'), COMUNAS, 'Elige comuna o sector');
    fillSelect(document.getElementById('pf-terreno'), TERRENOS, 'Estado del terreno');
    fillSelect(document.getElementById('pf-plazo'), PLAZOS, 'Plazo');
    fillSelect(document.getElementById('pf-busca'), BUSCA, 'Qué buscas');
    fillSelect(document.getElementById('pf-fuente'), FUENTES, 'Cómo nos conociste');
    showSegment('compacta');

    document.querySelectorAll('.pf-tab').forEach((tab) => {
      tab.addEventListener('click', () => showSegment(tab.dataset.segment));
    });

    const form = document.getElementById('pf-form');
    if (form) {
      form.addEventListener('input', () => {
        syncKits();
        syncGate();
      });
      form.addEventListener('change', () => {
        syncKits();
        syncGate();
      });
      form.addEventListener('submit', submitQuote);
    }

    document.querySelectorAll('[data-pf-close]').forEach((node) => {
      node.addEventListener('click', closeQuote);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.getElementById('pf-quote')?.classList.contains('is-open')) {
        closeQuote();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
