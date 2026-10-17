'use strict';

const CONFIG = {
  whatsappNumber: '56977164000',
  phoneHref: 'tel:+56977164000',
  phoneDisplay: '+56 9 7716 4000',
  businessEmail: 'contacto@casasprefabricadascoquimbo.cl',
  siteName: 'PrefabCoquimbo',
  whatsappDefaultMessage: 'Hola, me gustaría cotizar una casa (modular o a medida) en la Cuarta Región. ¿Podrían orientarme?',
  ga4Id: 'G-G10232ZBMD',
};

const cotizadorState = {
  step: 1,
  tipo: '',
  comuna: '',
  terreno: '',
  plazo: '',
  estilo: '',
  layoutNote: '',
};

function boot() {
  safeInit(initGA4);
  ensureCotizadorUI();
  initCotizadorModal();
  safeInit(initStickyHeader);
  safeInit(initMobileMenu);
  safeInit(initScrollReveal);
  safeInit(initFAQ);
  safeInit(initSmoothScroll);
  safeInit(initWhatsAppLinks);
  safeInit(initCallLinks);
}

function safeInit(fn) {
  try { fn(); } catch (err) { console.error('[PrefabCoquimbo]', err); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ─── GA4 ─── */
function initGA4() {
  if (!CONFIG.ga4Id) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', CONFIG.ga4Id, { send_page_view: true });
}

function trackEvent(name, params) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
}

function whatsappUrl(text) {
  const msg = text || CONFIG.whatsappDefaultMessage;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

function initWhatsAppLinks() {
  document.querySelectorAll('[data-whatsapp]').forEach(el => {
    const text = el.dataset.whatsapp || CONFIG.whatsappDefaultMessage;
    el.setAttribute('href', whatsappUrl(text));
    if (!el.getAttribute('target')) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    el.addEventListener('click', () => trackEvent('whatsapp_direct_click', { link_text: el.textContent?.trim().slice(0, 40) }));
  });
}

function initCallLinks() {
  document.querySelectorAll('a[href^="tel:"]').forEach(el => {
    el.addEventListener('click', () => trackEvent('call_click', { link_text: el.textContent?.trim().slice(0, 40) }));
  });
}

function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });
}

function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  const bars = btn.querySelectorAll('span');

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      bars[1].style.opacity = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
    }
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
    }
  });
}

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length || typeof IntersectionObserver === 'undefined') return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });
  els.forEach(el => observer.observe(el));
}

function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-btn');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : '0';
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    if (a.classList.contains('btn-cotizador-main')) return;
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        scrollToSection(id);
      }
    });
  });
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top, behavior: 'smooth' });
}

const PHONE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.01 2.19 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`;

const WA_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

/* ─── UI INJECT (modal + sticky en todas las páginas) ─── */
function ensureCotizadorUI() {
  if (!document.getElementById('cotizador-modal')) {
    document.body.insertAdjacentHTML('beforeend', getCotizadorModalHTML());
  }
  if (!document.getElementById('sticky-cot-bar')) {
    const text = document.documentElement.dataset.stickyCot || 'Casas prefabricadas · IV Región';
    document.body.insertAdjacentHTML('beforeend', getStickyBarHTML(text));
  }
}

function getStickyBarHTML(text) {
  return `<div class="sticky-cot-bar" id="sticky-cot-bar">
  <p class="sticky-cot-bar-text">${text}</p>
  <div class="sticky-cot-bar-actions">
    <a href="${CONFIG.phoneHref}" class="btn btn-primary sticky-cot-bar-btn">${PHONE_ICON} Llamar</a>
    <button type="button" class="btn btn-secondary sticky-cot-bar-btn btn-cotizador-main">Cotizar</button>
  </div>
</div>`;
}

function getCotizadorModalHTML() {
  return `<div id="cotizador-modal" class="cot-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="cot-modal-title">
  <div class="cot-modal-overlay" data-close-modal></div>
  <div class="cot-modal-dialog">
    <button type="button" class="cot-modal-close" aria-label="Cerrar cotizador" data-close-modal>&times;</button>
    <div class="cot-modal-progress" aria-hidden="true">
      <span class="cot-modal-dot active" data-dot="1"></span>
      <span class="cot-modal-dot" data-dot="2"></span>
      <span class="cot-modal-dot" data-dot="3"></span>
      <span class="cot-modal-dot" data-dot="4"></span>
    </div>

    <div class="cot-modal-step active" id="modal-step-1">
      <h2 id="cot-modal-title" class="cot-modal-title">¿Qué tipo de casa buscas?</h2>
      <p class="cot-modal-desc">Así filtramos opciones reales para tu caso.</p>
      <div class="cot-modal-options">
        <button type="button" class="cot-modal-opt" data-field="tipo" data-value="Modular">
          Casa modular
          <small class="cot-modal-opt-sub">Módulos 18–24,5 m² combinables</small>
        </button>
        <button type="button" class="cot-modal-opt" data-field="tipo" data-value="A medida">
          Casa a medida
          <small class="cot-modal-opt-sub">Diseño según tu terreno</small>
        </button>
        <button type="button" class="cot-modal-opt" data-field="tipo" data-value="No sé aún">
          No sé aún
          <small class="cot-modal-opt-sub">Te orientamos según tu terreno</small>
        </button>
      </div>
    </div>

    <div class="cot-modal-step" id="modal-step-2">
      <h2 class="cot-modal-title">¿En qué comuna la necesitas?</h2>
      <p class="cot-modal-desc">Traslado e instalación cambian según la zona.</p>
      <div class="cot-modal-options cot-modal-options--grid">
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="La Serena">La Serena</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Coquimbo">Coquimbo</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Ovalle">Ovalle</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Vicuña">Vicuña</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="La Higuera">La Higuera</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Otra comuna">Otra comuna</button>
      </div>
      <button type="button" class="cot-modal-back" data-goto-step="1">← Volver</button>
    </div>

    <div class="cot-modal-step" id="modal-step-3">
      <h2 class="cot-modal-title">¿Cómo va tu proyecto?</h2>
      <p class="cot-modal-desc">Sin preguntar presupuesto — solo para priorizar bien tu caso.</p>
      <p class="cot-modal-label">¿Tienes terreno?</p>
      <div class="cot-modal-options">
        <button type="button" class="cot-modal-opt" data-field="terreno" data-value="Sí, listo">Sí, terreno listo</button>
        <button type="button" class="cot-modal-opt" data-field="terreno" data-value="En compra">Lo estoy comprando</button>
        <button type="button" class="cot-modal-opt" data-field="terreno" data-value="Aún no">Aún no tengo</button>
      </div>
      <p class="cot-modal-label" style="margin-top:1.25rem;">¿Cuándo quieres avanzar?</p>
      <div class="cot-modal-options cot-modal-options--grid">
        <button type="button" class="cot-modal-opt cot-modal-opt--sm" data-field="plazo" data-value="Lo antes posible">Lo antes posible</button>
        <button type="button" class="cot-modal-opt cot-modal-opt--sm" data-field="plazo" data-value="1 a 3 meses">1 a 3 meses</button>
        <button type="button" class="cot-modal-opt cot-modal-opt--sm" data-field="plazo" data-value="3 a 6 meses">3 a 6 meses</button>
        <button type="button" class="cot-modal-opt cot-modal-opt--sm" data-field="plazo" data-value="Solo explorando">Solo explorando</button>
      </div>
      <button type="button" class="btn btn-primary" id="cot-step3-next" style="width:100%; justify-content:center; margin-top:1.25rem;" disabled>
        Continuar
      </button>
      <button type="button" class="cot-modal-back" data-goto-step="2">← Volver</button>
    </div>

    <div class="cot-modal-step" id="modal-step-4">
      <h2 class="cot-modal-title">Tus datos para enviarlo por WhatsApp</h2>
      <p class="cot-modal-desc">Armamos el mensaje con tu info. Tú decides enviarlo.</p>
      <form id="cot-modal-form" novalidate>
        <div class="form-field">
          <label class="form-label" for="cot-modal-nombre">Nombre</label>
          <input class="form-input" type="text" id="cot-modal-nombre" name="nombre" placeholder="Ej: María González" autocomplete="name" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="cot-modal-phone">Teléfono / WhatsApp</label>
          <input class="form-input" type="tel" id="cot-modal-phone" inputmode="numeric" placeholder="9 1234 5678" autocomplete="tel" required />
        </div>
        <p class="cot-modal-error" id="cot-modal-error" role="alert" hidden></p>
        <button type="submit" class="btn btn-wa-submit">
          ${WA_ICON}
          Enviar info por WhatsApp
        </button>
        <a href="${CONFIG.phoneHref}" class="btn btn-secondary" style="width:100%; justify-content:center; margin-top:0.75rem;">
          ${PHONE_ICON}
          Prefiero llamar
        </a>
      </form>
      <button type="button" class="cot-modal-back" data-goto-step="3">← Volver</button>
    </div>
  </div>
</div>`;
}

/* ─── MODAL COTIZADOR CUALIFICADOR ─── */
function initCotizadorModal() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.btn-cotizador-main');
    if (!trigger || trigger.hasAttribute('data-whatsapp')) return;
    e.preventDefault();
    e.stopPropagation();
    openCotizadorModal({
      estilo: trigger.dataset.presetEstilo || '',
      comuna: trigger.dataset.presetComuna || '',
      tipo: trigger.dataset.presetTipo || '',
      layoutNote: trigger.dataset.presetLayout || '',
    });
  });

  const modal = document.getElementById('cotizador-modal');
  if (!modal) return;

  modal.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeCotizadorModal);
  });

  modal.querySelectorAll('.cot-modal-opt').forEach(opt => {
    opt.addEventListener('click', () => handleModalOption(opt));
  });

  modal.querySelectorAll('[data-goto-step]').forEach(btn => {
    btn.addEventListener('click', () => showModalStep(Number(btn.dataset.gotoStep)));
  });

  document.getElementById('cot-step3-next')?.addEventListener('click', () => {
    if (cotizadorState.terreno && cotizadorState.plazo) showModalStep(4);
  });

  const form = document.getElementById('cot-modal-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitCotizadorModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeCotizadorModal();
  });
}

function openCotizadorModal(presets = {}) {
  const modal = document.getElementById('cotizador-modal');
  if (!modal) {
    window.location.href = CONFIG.phoneHref;
    return;
  }

  const estilo = presets.estilo || '';
  const comuna = presets.comuna || '';
  const tipo = presets.tipo || (estilo ? 'A medida' : '');
  const layoutNote = presets.layoutNote
    || (tipo === 'Modular' ? (window.__prefabModularLayout || '') : '');

  cotizadorState.tipo = tipo;
  cotizadorState.comuna = comuna;
  cotizadorState.terreno = '';
  cotizadorState.plazo = '';
  cotizadorState.estilo = estilo;
  cotizadorState.layoutNote = layoutNote;

  modal.querySelectorAll('.cot-modal-opt').forEach(opt => {
    opt.classList.remove('selected');
    const { field, value } = opt.dataset;
    if (field === 'tipo' && value === tipo) opt.classList.add('selected');
    if (field === 'comuna' && value === comuna) opt.classList.add('selected');
  });

  const nombreInput = document.getElementById('cot-modal-nombre');
  const phoneInput = document.getElementById('cot-modal-phone');
  const errorEl = document.getElementById('cot-modal-error');
  if (nombreInput) nombreInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (errorEl) errorEl.hidden = true;
  updateStep3Next();

  let startStep = 1;
  if (tipo && comuna) startStep = 3;
  else if (tipo) startStep = 2;
  else if (comuna) startStep = 1;

  showModalStep(startStep);
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cot-modal-open');
  trackEvent('cotizador_open', {
    preset_tipo: tipo || 'none',
    preset_estilo: estilo || 'none',
    preset_comuna: comuna || 'none',
  });

  const menu = document.getElementById('mobile-menu');
  const menuBtn = document.getElementById('mobile-menu-btn');
  if (menu?.classList.contains('open')) {
    menu.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }
}

window.openPrefabCotizador = openCotizadorModal;

function closeCotizadorModal() {
  const modal = document.getElementById('cotizador-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cot-modal-open');
}

function showModalStep(n) {
  cotizadorState.step = n;
  document.querySelectorAll('.cot-modal-step').forEach(step => {
    step.classList.toggle('active', Number(step.id.replace('modal-step-', '')) === n);
  });
  document.querySelectorAll('.cot-modal-dot').forEach(dot => {
    const dotN = Number(dot.dataset.dot);
    dot.classList.toggle('active', dotN === n);
    dot.classList.toggle('done', dotN < n);
  });
  if (n === 4) setTimeout(() => document.getElementById('cot-modal-nombre')?.focus(), 100);
}

function handleModalOption(opt) {
  const { field, value } = opt.dataset;
  modalSelectOption(field, value);

  if (field === 'tipo') {
    cotizadorState.tipo = value;
    showModalStep(2);
  } else if (field === 'comuna') {
    cotizadorState.comuna = value;
    showModalStep(3);
  } else if (field === 'terreno') {
    cotizadorState.terreno = value;
    updateStep3Next();
  } else if (field === 'plazo') {
    cotizadorState.plazo = value;
    updateStep3Next();
  }
}

function updateStep3Next() {
  const btn = document.getElementById('cot-step3-next');
  if (!btn) return;
  btn.disabled = !(cotizadorState.terreno && cotizadorState.plazo);
}

function modalSelectOption(field, value) {
  document.querySelectorAll(`.cot-modal-opt[data-field="${field}"]`).forEach(o => {
    o.classList.toggle('selected', o.dataset.value === value);
  });
}

function buildCotizadorMessage(nombre, phone) {
  const { tipo, comuna, terreno, plazo, estilo, layoutNote } = cotizadorState;
  const lines = [
    `Hola, soy *${nombre}* y vengo de la web.`,
    `Quiero cotizar una casa *${tipo || 'prefab'}* en *${comuna}*.`,
  ];
  if (estilo) lines.push(`Estilo de interés: ${estilo}.`);
  lines.push(`Terreno: ${terreno}.`);
  lines.push(`Plazo: ${plazo}.`);
  lines.push(`Mi teléfono: ${phone}.`);
  if (layoutNote) lines.push(`Configuración modular: ${layoutNote}`);
  return lines.join('\n');
}

function submitCotizadorModal() {
  const nombreInput = document.getElementById('cot-modal-nombre');
  const phoneInput = document.getElementById('cot-modal-phone');
  const errorEl = document.getElementById('cot-modal-error');
  const nombre = nombreInput?.value.trim() ?? '';
  const phone = phoneInput?.value.replace(/\D/g, '') ?? '';

  if (nombre.length < 2) {
    if (errorEl) {
      errorEl.textContent = 'Ingresa tu nombre.';
      errorEl.hidden = false;
    }
    nombreInput?.focus();
    return;
  }

  if (phone.length < 8) {
    if (errorEl) {
      errorEl.textContent = 'Ingresa un número válido (mínimo 8 dígitos).';
      errorEl.hidden = false;
    }
    phoneInput?.focus();
    return;
  }

  const { tipo, comuna, terreno, plazo } = cotizadorState;
  const msg = buildCotizadorMessage(nombre, phone);

  trackEvent('cotizador_submit', { tipo, comuna, terreno, plazo });
  window.open(whatsappUrl(msg), '_blank', 'noopener,noreferrer');
  closeCotizadorModal();
}
