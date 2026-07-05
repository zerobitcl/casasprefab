'use strict';

const CONFIG = {
  whatsappNumber: '56994284048',
  businessEmail: 'contacto@casasprefabricadascoquimbo.cl',
  siteName: 'PrefabCoquimbo',
  whatsappDefaultMessage: 'Hola, me gustaría cotizar una casa a medida en la Región de Coquimbo. ¿Podrían orientarme?',
};

const cotizadorState = {
  step: 1,
  estilo: '',
  metros: '',
};

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileMenu();
  initScrollReveal();
  initFAQ();
  initSmoothScroll();
  initWhatsAppLinks();
  initCotizadorModal();
});

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
  });
}

/* ─── STICKY HEADER ─── */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });
}

/* ─── MOBILE MENU ─── */
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

/* ─── SCROLL REVEAL ─── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

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

/* ─── FAQ ─── */
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

/* ─── SMOOTH SCROLL ─── */
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

/* ─── MODAL COTIZADOR 3 PASOS ─── */
function initCotizadorModal() {
  const modal = document.getElementById('cotizador-modal');
  if (!modal) return;

  const form = document.getElementById('cot-modal-form');
  const phoneInput = document.getElementById('cot-modal-phone');
  const errorEl = document.getElementById('cot-modal-error');

  document.querySelectorAll('.btn-cotizador-main').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const preset = btn.dataset.presetEstilo || '';
      openCotizadorModal(preset);
    });
  });

  modal.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeCotizadorModal);
  });

  modal.querySelectorAll('.cot-modal-opt').forEach(opt => {
    opt.addEventListener('click', () => handleModalOption(opt));
  });

  modal.querySelectorAll('[data-goto-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      showModalStep(Number(btn.dataset.gotoStep));
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitCotizadorModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeCotizadorModal();
    }
  });
}

function openCotizadorModal(presetEstilo) {
  const modal = document.getElementById('cotizador-modal');
  if (!modal) return;

  cotizadorState.step = 1;
  cotizadorState.estilo = presetEstilo || '';
  cotizadorState.metros = '';

  modal.querySelectorAll('.cot-modal-opt').forEach(opt => {
    opt.classList.remove('selected');
    const field = opt.dataset.field;
    const value = opt.dataset.value;
    if (field === 'estilo' && value === presetEstilo) {
      opt.classList.add('selected');
    }
  });

  const phoneInput = document.getElementById('cot-modal-phone');
  const errorEl = document.getElementById('cot-modal-error');
  if (phoneInput) phoneInput.value = '';
  if (errorEl) errorEl.hidden = true;

  showModalStep(presetEstilo ? 2 : 1);

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

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
  document.body.style.overflow = '';
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

  if (n === 3) {
    setTimeout(() => document.getElementById('cot-modal-phone')?.focus(), 100);
  }
}

function handleModalOption(opt) {
  const field = opt.dataset.field;
  const value = opt.dataset.value;

  modalSelectOption(field, value);

  if (field === 'estilo') {
    cotizadorState.estilo = value;
    showModalStep(2);
  } else if (field === 'metros') {
    cotizadorState.metros = value;
    showModalStep(3);
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

  const { estilo, metros } = cotizadorState;
  const msg = `Hola, vengo de la web. Quiero cotizar una casa ${estilo} de ${metros}. Mi WhatsApp: ${phone}.`;
  const url = whatsappUrl(msg);

  window.open(url, '_blank', 'noopener,noreferrer');
  closeCotizadorModal();
}
