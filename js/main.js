'use strict';

const CONFIG = {
  whatsappNumber: '56994284048',
  businessEmail: 'contacto@casasprefabricadascoquimbo.cl',
  siteName: 'PrefabCoquimbo',
  whatsappDefaultMessage: 'Hola, me gustaría cotizar una casa a medida en la Región de Coquimbo. ¿Podrían orientarme?',
  ga4Id: '', // Ej: 'G-XXXXXXXXXX' — dejar vacío hasta configurar GA4
};

const cotizadorState = {
  step: 1,
  estilo: '',
  metros: '',
  comuna: '',
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

/* ─── UI INJECT (modal + sticky en todas las páginas) ─── */
function ensureCotizadorUI() {
  if (!document.getElementById('cotizador-modal')) {
    document.body.insertAdjacentHTML('beforeend', getCotizadorModalHTML());
  }
  if (!document.getElementById('sticky-cot-bar')) {
    const text = document.documentElement.dataset.stickyCot || 'Casas prefabricadas a medida · IV Región';
    document.body.insertAdjacentHTML('beforeend', getStickyBarHTML(text));
  }
}

function getStickyBarHTML(text) {
  return `<div class="sticky-cot-bar" id="sticky-cot-bar">
  <p class="sticky-cot-bar-text">${text}</p>
  <button type="button" class="btn btn-primary btn-cotizador-main sticky-cot-bar-btn">Cotizar mi Casa Rápido ⚡</button>
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
      <h2 id="cot-modal-title" class="cot-modal-title">¿Qué estilo tienes en mente?</h2>
      <div class="cot-modal-options">
        <button type="button" class="cot-modal-opt" data-field="estilo" data-value="Mediterránea">Mediterránea</button>
        <button type="button" class="cot-modal-opt" data-field="estilo" data-value="Tradicional">Tradicional</button>
        <button type="button" class="cot-modal-opt" data-field="estilo" data-value="Metalcón">Metalcón</button>
      </div>
    </div>
    <div class="cot-modal-step" id="modal-step-2">
      <h2 class="cot-modal-title">¿De cuántos metros cuadrados (aprox)?</h2>
      <div class="cot-modal-options">
        <button type="button" class="cot-modal-opt" data-field="metros" data-value="54m2">54m²</button>
        <button type="button" class="cot-modal-opt" data-field="metros" data-value="72m2">72m²</button>
        <button type="button" class="cot-modal-opt" data-field="metros" data-value="+100m2">+100m²</button>
      </div>
      <button type="button" class="cot-modal-back" data-goto-step="1">← Volver</button>
    </div>
    <div class="cot-modal-step" id="modal-step-3">
      <h2 class="cot-modal-title">¿En qué comuna está tu terreno?</h2>
      <div class="cot-modal-options cot-modal-options--grid">
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="La Serena">La Serena</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Coquimbo">Coquimbo</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Ovalle">Ovalle</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Vicuña">Vicuña</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="La Higuera">La Higuera</button>
        <button type="button" class="cot-modal-opt" data-field="comuna" data-value="Otra comuna">Otra comuna</button>
      </div>
      <button type="button" class="cot-modal-back" data-goto-step="2">← Volver</button>
    </div>
    <div class="cot-modal-step" id="modal-step-4">
      <h2 class="cot-modal-title">¡Casi listo! Deja tu WhatsApp para enviarte el presupuesto.</h2>
      <form id="cot-modal-form" novalidate>
        <label class="form-label" for="cot-modal-phone">Tu número WhatsApp</label>
        <input class="form-input" type="tel" id="cot-modal-phone" inputmode="numeric" placeholder="9 1234 5678" autocomplete="tel" required />
        <p class="cot-modal-error" id="cot-modal-error" role="alert" hidden></p>
        <button type="submit" class="btn btn-wa-submit">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
          Recibir presupuesto por WhatsApp
        </button>
      </form>
      <button type="button" class="cot-modal-back" data-goto-step="3">← Volver</button>
    </div>
  </div>
</div>`;
}

/* ─── MODAL COTIZADOR 4 PASOS ─── */
function initCotizadorModal() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.btn-cotizador-main');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    openCotizadorModal(trigger.dataset.presetEstilo || '', trigger.dataset.presetComuna || '');
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

function openCotizadorModal(presetEstilo, presetComuna) {
  const modal = document.getElementById('cotizador-modal');
  if (!modal) {
    window.open(whatsappUrl(CONFIG.whatsappDefaultMessage), '_blank', 'noopener,noreferrer');
    return;
  }

  cotizadorState.estilo = presetEstilo || '';
  cotizadorState.metros = '';
  cotizadorState.comuna = presetComuna || '';

  modal.querySelectorAll('.cot-modal-opt').forEach(opt => {
    opt.classList.remove('selected');
    const { field, value } = opt.dataset;
    if (field === 'estilo' && value === presetEstilo) opt.classList.add('selected');
    if (field === 'comuna' && value === presetComuna) opt.classList.add('selected');
  });

  const phoneInput = document.getElementById('cot-modal-phone');
  const errorEl = document.getElementById('cot-modal-error');
  if (phoneInput) phoneInput.value = '';
  if (errorEl) errorEl.hidden = true;

  let startStep = 1;
  if (presetEstilo && presetComuna) startStep = 4;
  else if (presetEstilo) startStep = 2;
  else if (presetComuna) startStep = 1;

  showModalStep(startStep);
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cot-modal-open');
  trackEvent('cotizador_open', { preset_estilo: presetEstilo || 'none', preset_comuna: presetComuna || 'none' });

  const menu = document.getElementById('mobile-menu');
  const menuBtn = document.getElementById('mobile-menu-btn');
  if (menu?.classList.contains('open')) {
    menu.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }
}

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
  if (n === 4) setTimeout(() => document.getElementById('cot-modal-phone')?.focus(), 100);
}

function handleModalOption(opt) {
  const { field, value } = opt.dataset;
  modalSelectOption(field, value);

  if (field === 'estilo') {
    cotizadorState.estilo = value;
    showModalStep(2);
  } else if (field === 'metros') {
    cotizadorState.metros = value;
    showModalStep(3);
  } else if (field === 'comuna') {
    cotizadorState.comuna = value;
    showModalStep(4);
  }
}

function modalSelectOption(field, value) {
  document.querySelectorAll(`.cot-modal-opt[data-field="${field}"]`).forEach(o => {
    o.classList.toggle('selected', o.dataset.value === value);
  });
}

function submitCotizadorModal() {
  const phoneInput = document.getElementById('cot-modal-phone');
  const errorEl = document.getElementById('cot-modal-error');
  const phone = phoneInput?.value.replace(/\D/g, '') ?? '';

  if (phone.length < 8) {
    if (errorEl) {
      errorEl.textContent = 'Ingresa un número válido (mínimo 8 dígitos).';
      errorEl.hidden = false;
    }
    phoneInput?.focus();
    return;
  }

  const { estilo, metros, comuna } = cotizadorState;
  const msg = `Hola, vengo de la web. Quiero cotizar una casa ${estilo} de ${metros} en ${comuna}. Mi WhatsApp: ${phone}.`;

  trackEvent('cotizador_submit', { estilo, metros, comuna });
  window.open(whatsappUrl(msg), '_blank', 'noopener,noreferrer');
  closeCotizadorModal();
}
