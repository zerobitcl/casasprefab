'use strict';

/* ─────────────────────────────────────────────────────────────
   CONFIGURACIÓN GLOBAL — reemplaza estos valores antes de
   publicar el sitio.
   ───────────────────────────────────────────────────────────── */
const CONFIG = {
  whatsappNumber : '56994284048',
  businessEmail  : 'contacto@casasprefabricadascoquimbo.cl',
  siteName       : 'PrefabCoquimbo',
  whatsappDefaultMessage: 'Hola, me gustaría cotizar una casa a medida en la Región de Coquimbo. ¿Podrían orientarme?',
};

/* ─────────────────────────────────────────────────────────────
   ESTADO DEL FORMULARIO MULTI-PASO
   ───────────────────────────────────────────────────────────── */
const formState = {
  currentStep : 1,
  totalSteps  : 4,
  data: {
    tipoCasa : '',
    comuna   : '',
    tipoKit  : '',
    nombre   : '',
    telefono : '',
    email    : '',
  },
};

/* ─────────────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileMenu();
  initScrollReveal();
  initFAQ();
  initModelCTAs();
  initSmoothScroll();
  initWhatsAppLinks();

  if (document.getElementById('cotizador-form')) {
    initMultiStepForm();
  }
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

/* ─────────────────────────────────────────────────────────────
   STICKY HEADER
   ───────────────────────────────────────────────────────────── */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─────────────────────────────────────────────────────────────
   MOBILE MENU
   ───────────────────────────────────────────────────────────── */
function initMobileMenu() {
  const btn  = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  const bars = btn.querySelectorAll('span');

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
      bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      bars[1].style.opacity   = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      bars[0].style.transform = '';
      bars[1].style.opacity   = '';
      bars[2].style.transform = '';
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

/* ─────────────────────────────────────────────────────────────
   SCROLL REVEAL (Intersection Observer)
   ───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   FAQ ACCORDION
   ───────────────────────────────────────────────────────────── */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-btn');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : '0';
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   MODEL CTAs (pre-seleccionan kit al hacer scroll al form)
   ───────────────────────────────────────────────────────────── */
function initModelCTAs() {
  document.querySelectorAll('[data-model-cta]').forEach(btn => {
    btn.addEventListener('click', () => {
      const model = btn.dataset.modelCta;
      const map   = { basico: 'Kit Básico', mediterraneo: 'Kit Completo', premium: 'Llave en Mano' };

      scrollToSection('cotizador');

      setTimeout(() => {
        if (map[model]) preSelectKit(map[model]);
      }, 750);
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   SMOOTH SCROLL para todos los href="#*"
   ───────────────────────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
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

/* ─────────────────────────────────────────────────────────────
   FORMULARIO MULTI-PASO
   ───────────────────────────────────────────────────────────── */
function initMultiStepForm() {
  buildStepNav();
  showStep(1);

  /* Tarjetas de opciones */
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => handleOptionCard(card));
  });

  /* Botones de navegación */
  bindBtn('btn-next-1', () => nextStep());
  bindBtn('btn-next-2', () => nextStep());
  bindBtn('btn-next-3', () => nextStep());
  bindBtn('btn-prev-2', () => prevStep());
  bindBtn('btn-prev-3', () => prevStep());
  bindBtn('btn-prev-4', () => prevStep());

  /* Submit */
  document.getElementById('cotizador-form')
    .addEventListener('submit', onFormSubmit);
}

function bindBtn(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

/* ── Step Navigator ── */
function buildStepNav() {
  const container = document.getElementById('steps-nav');
  if (!container) return;

  const labels = ['Tipo', 'Ubicación', 'Kit', 'Contacto'];
  let html = '';

  labels.forEach((label, i) => {
    const n = i + 1;
    html += `<div class="step-dot" id="sdot-${n}" aria-label="Paso ${n}: ${label}">${n}</div>`;
    if (n < labels.length) {
      html += `<div class="step-connector"><div class="step-connector-fill" id="sline-${n}"></div></div>`;
    }
  });

  container.innerHTML = html;
}

/* ── Show Step ── */
function showStep(n) {
  formState.currentStep = n;

  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));

  const target = document.getElementById(`fstep-${n}`);
  if (target) target.classList.add('active');

  updateStepUI();
  clearError();
}

function updateStepUI() {
  const cur = formState.currentStep;
  const tot = formState.totalSteps;

  for (let i = 1; i <= tot; i++) {
    const dot = document.getElementById(`sdot-${i}`);
    if (dot) {
      dot.classList.toggle('active',    i === cur);
      dot.classList.toggle('completed', i < cur);
    }
    if (i < tot) {
      const line = document.getElementById(`sline-${i}`);
      if (line) line.classList.toggle('filled', i < cur);
    }
  }

  const fill = document.getElementById('progress-fill');
  if (fill) {
    fill.style.width = `${((cur - 1) / (tot - 1)) * 100}%`;
  }
}

/* ── Navigation ── */
function nextStep() {
  if (validate(formState.currentStep)) {
    showStep(formState.currentStep + 1);
    scrollToSection('cotizador');
  }
}

function prevStep() {
  clearError();
  showStep(formState.currentStep - 1);
  scrollToSection('cotizador');
}

/* ── Option Cards ── */
function handleOptionCard(card) {
  const group = card.dataset.group;
  const value = card.dataset.value;

  document.querySelectorAll(`.option-card[data-group="${group}"]`).forEach(c => {
    c.classList.remove('selected');
    c.removeAttribute('aria-pressed');
  });
  card.classList.add('selected');
  card.setAttribute('aria-pressed', 'true');

  if (group === 'tipo-casa') formState.data.tipoCasa = value;
  if (group === 'tipo-kit')  formState.data.tipoKit  = value;

  clearError();
}

function preSelectKit(value) {
  const card = document.querySelector(`.option-card[data-group="tipo-kit"][data-value="${value}"]`);
  if (card) handleOptionCard(card);
}

/* ── Validation ── */
function validate(step) {
  clearError();

  switch (step) {
    case 1:
      if (!formState.data.tipoCasa) {
        showError('Selecciona un estilo de inspiración para continuar.');
        return false;
      }
      return true;

    case 2: {
      const sel = document.getElementById('select-comuna');
      if (!sel?.value) {
        showError('Selecciona la comuna donde se ubica tu terreno.');
        return false;
      }
      formState.data.comuna = sel.value;
      return true;
    }

    case 3:
      if (!formState.data.tipoKit) {
        showError('Selecciona el nivel de terminación que te interesa.');
        return false;
      }
      return true;

    case 4:
      return validateContact();

    default:
      return true;
  }
}

function validateContact() {
  const nombre   = document.getElementById('input-nombre')?.value.trim()   ?? '';
  const telefono = document.getElementById('input-telefono')?.value.trim() ?? '';
  const email    = document.getElementById('input-email')?.value.trim()    ?? '';

  if (nombre.length < 2) {
    showError('Ingresa tu nombre completo.');
    return false;
  }
  if (!/^\+?[\d\s\-().]{7,}$/.test(telefono)) {
    showError('Ingresa un número de teléfono válido (ej: +56 9 8765 4321).');
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Ingresa un correo electrónico válido.');
    return false;
  }

  formState.data.nombre   = nombre;
  formState.data.telefono = telefono;
  formState.data.email    = email;
  return true;
}

/* ── Submit ── */
function onFormSubmit(e) {
  e.preventDefault();
  if (!validateContact()) return;

  const { tipoCasa, comuna, tipoKit, nombre, telefono, email } = formState.data;

  const lines = [
    `¡Hola! Soy *${nombre}* y me gustaría cotizar una casa a medida estilo ${tipoCasa} en ${comuna}.`,
    ``,
    `🏠 *Estilo de inspiración:* ${tipoCasa}`,
    `📍 *Comuna del terreno:* ${comuna}`,
    `📦 *Nivel de terminación:* ${tipoKit}`,
    `📞 *Teléfono:* ${telefono}`,
    `📧 *Correo:* ${email}`,
    ``,
    `Me gustaría recibir orientación y una cotización según la materialidad. ¡Gracias!`,
  ];

  const waUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;

  showSuccess();
  setTimeout(() => window.open(waUrl, '_blank', 'noopener,noreferrer'), 650);
}

function showSuccess() {
  const stepsContainer = document.getElementById('form-steps');
  const successEl      = document.getElementById('form-success');
  const navEl          = document.getElementById('form-error');

  if (stepsContainer) stepsContainer.style.display = 'none';
  if (navEl)          navEl.style.display = 'none';
  if (successEl)      successEl.classList.add('visible');
}

/* ── UI Helpers ── */
function showError(msg) {
  const el = document.getElementById('form-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function clearError() {
  const el = document.getElementById('form-error');
  if (el) el.classList.remove('visible');
}
