'use strict';

/**
 * Configurador visual de módulos: arrastrar rectángulos (18–24,5 m²)
 * para entender el sistema modular y filtrar curiosos antes de WhatsApp.
 */
document.addEventListener('DOMContentLoaded', function initModularBuilder() {
  const PRICE_PER_M2 = 700000;
  const CELL = 26;
  const GRID_W = 24;
  const GRID_H = 14;

  const SIZES = [
    { id: '18', label: '18 m²', w: 6, h: 3, m2: 18 },
    { id: '20', label: '20 m²', w: 5, h: 4, m2: 20 },
    { id: '22', label: '22 m²', w: 5.5, h: 4, m2: 22 },
    { id: '24.5', label: '24,5 m²', w: 7, h: 3.5, m2: 24.5 },
  ];

  const PRESETS = {
    linea: [
      { sizeId: '24.5', x: 1, y: 5, rot: 0 },
      { sizeId: '24.5', x: 8.5, y: 5, rot: 0 },
      { sizeId: '18', x: 16.5, y: 5, rot: 0 },
    ],
    ele: [
      { sizeId: '24.5', x: 3, y: 2, rot: 0 },
      { sizeId: '24.5', x: 3, y: 6, rot: 90 },
      { sizeId: '20', x: 7, y: 6.5, rot: 0 },
    ],
    ce: [
      { sizeId: '22', x: 3, y: 2, rot: 0 },
      { sizeId: '22', x: 3, y: 8.5, rot: 0 },
      { sizeId: '18', x: 9, y: 2, rot: 90 },
      { sizeId: '18', x: 9, y: 8, rot: 90 },
    ],
    patio: [
      { sizeId: '24.5', x: 2, y: 2, rot: 0 },
      { sizeId: '20', x: 2, y: 8, rot: 0 },
      { sizeId: '24.5', x: 12, y: 2, rot: 90 },
      { sizeId: '18', x: 12, y: 9.5, rot: 0 },
    ],
  };

  const COLORS = ['#B45309', '#0F766E', '#1D4ED8', '#BE123C', '#A16207', '#4338CA'];

  let modules = [];
  let nextId = 1;
  let selectedId = null;
  let drag = null;
  let selectedSizeId = '24.5';

  const root = document.getElementById('modular-builder');
  if (!root) return;

  const stage = root.querySelector('[data-mb-stage]');
  const canvas = root.querySelector('[data-mb-canvas]');
  const totalM2El = root.querySelector('[data-mb-total-m2]');
  const totalPriceEl = root.querySelector('[data-mb-total-price]');
  const countEl = root.querySelector('[data-mb-count]');
  const waBtn = root.querySelector('[data-mb-whatsapp]');

  function sizeById(id) {
    return SIZES.find((s) => s.id === id) || SIZES[3];
  }

  function dims(mod) {
    const s = sizeById(mod.sizeId);
    const rot = mod.rot % 180 !== 0;
    return {
      w: rot ? s.h : s.w,
      h: rot ? s.w : s.h,
      m2: s.m2,
      label: s.label,
    };
  }

  function formatCLP(n) {
    return '$' + Math.round(n).toLocaleString('es-CL');
  }

  function totals() {
    const m2 = modules.reduce((acc, m) => acc + dims(m).m2, 0);
    return { m2, price: m2 * PRICE_PER_M2, count: modules.length };
  }

  function clamp(mod) {
    const d = dims(mod);
    mod.x = Math.max(0, Math.min(GRID_W - d.w, mod.x));
    mod.y = Math.max(0, Math.min(GRID_H - d.h, mod.y));
  }

  function updateSummary() {
    const t = totals();
    if (totalM2El) totalM2El.textContent = t.m2.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' m²';
    if (totalPriceEl) totalPriceEl.textContent = formatCLP(t.price);
    if (countEl) countEl.textContent = String(t.count);

    if (waBtn) {
      const layout = modules.map((m, i) => {
        const d = dims(m);
        return `M${i + 1}: ${d.label}`;
      }).join(', ');
      const msg = t.count === 0
        ? 'Hola, me interesa una casa modular en la Cuarta Región. ¿Me orientan?'
        : `Hola, armé una configuración modular en el sitio: ${t.count} módulo(s), ${t.m2} m² aprox. (${layout}). Valor referencial ~${formatCLP(t.price)} a $700.000/m². ¿Me cotizan en la Cuarta Región?`;
      waBtn.setAttribute('data-whatsapp', msg);
      if (typeof whatsappUrl === 'function') {
        waBtn.setAttribute('href', whatsappUrl(msg));
      } else {
        const phone = (typeof CONFIG !== 'undefined' && CONFIG.whatsappNumber) || '569977164000';
        waBtn.setAttribute('href', `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
      }
    }
  }

  function render() {
    if (!canvas) return;
    canvas.innerHTML = '';
    canvas.style.width = GRID_W * CELL + 'px';
    canvas.style.height = GRID_H * CELL + 'px';

    modules.forEach((mod, idx) => {
      const d = dims(mod);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'mb-module' + (mod.id === selectedId ? ' is-selected' : '');
      el.style.left = mod.x * CELL + 'px';
      el.style.top = mod.y * CELL + 'px';
      el.style.width = d.w * CELL + 'px';
      el.style.height = d.h * CELL + 'px';
      el.style.background = COLORS[idx % COLORS.length];
      el.setAttribute('aria-label', `Módulo ${idx + 1}, ${d.label}. Arrastrar para mover.`);
      el.innerHTML = `<span class="mb-module-label">${d.label}</span><span class="mb-module-idx">M${idx + 1}</span>`;

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        selectedId = mod.id;
        const rect = canvas.getBoundingClientRect();
        drag = {
          id: mod.id,
          ox: e.clientX - rect.left - mod.x * CELL,
          oy: e.clientY - rect.top - mod.y * CELL,
        };
        el.setPointerCapture(e.pointerId);
        render();
      });

      el.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== mod.id) return;
        const rect = canvas.getBoundingClientRect();
        mod.x = (e.clientX - rect.left - drag.ox) / CELL;
        mod.y = (e.clientY - rect.top - drag.oy) / CELL;
        clamp(mod);
        el.style.left = mod.x * CELL + 'px';
        el.style.top = mod.y * CELL + 'px';
      });

      el.addEventListener('pointerup', () => {
        if (!drag || drag.id !== mod.id) return;
        mod.x = Math.round(mod.x * 2) / 2;
        mod.y = Math.round(mod.y * 2) / 2;
        clamp(mod);
        drag = null;
        render();
        updateSummary();
      });

      canvas.appendChild(el);
    });

    updateSummary();
  }

  function addModule(sizeId) {
    const s = sizeById(sizeId || selectedSizeId);
    const mod = {
      id: nextId++,
      sizeId: s.id,
      x: 1 + (modules.length % 3) * 0.5,
      y: 1 + (modules.length % 4) * 0.5,
      rot: 0,
    };
    clamp(mod);
    modules.push(mod);
    selectedId = mod.id;
    render();
  }

  function removeSelected() {
    if (selectedId == null) {
      modules.pop();
    } else {
      modules = modules.filter((m) => m.id !== selectedId);
      selectedId = null;
    }
    render();
  }

  function rotateSelected() {
    const mod = modules.find((m) => m.id === selectedId) || modules[modules.length - 1];
    if (!mod) return;
    mod.rot = (mod.rot + 90) % 360;
    selectedId = mod.id;
    clamp(mod);
    render();
  }

  function clearAll() {
    modules = [];
    selectedId = null;
    render();
  }

  function applyPreset(name) {
    const list = PRESETS[name];
    if (!list) return;
    modules = list.map((p) => {
      const mod = {
        id: nextId++,
        sizeId: p.sizeId,
        x: p.x,
        y: p.y,
        rot: p.rot || 0,
      };
      clamp(mod);
      return mod;
    });
    selectedId = modules[0]?.id ?? null;
    render();
  }

  root.querySelectorAll('[data-mb-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedSizeId = btn.getAttribute('data-mb-size');
      root.querySelectorAll('[data-mb-size]').forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });

  root.querySelector('[data-mb-add]')?.addEventListener('click', () => addModule(selectedSizeId));
  root.querySelector('[data-mb-remove]')?.addEventListener('click', removeSelected);
  root.querySelector('[data-mb-rotate]')?.addEventListener('click', rotateSelected);
  root.querySelector('[data-mb-clear]')?.addEventListener('click', clearAll);

  root.querySelectorAll('[data-mb-preset]').forEach((btn) => {
    btn.addEventListener('click', () => applyPreset(btn.getAttribute('data-mb-preset')));
  });

  if (stage) {
    stage.style.setProperty('--mb-cell', CELL + 'px');
  }

  applyPreset('linea');
  root.querySelector('[data-mb-size="24.5"]')?.classList.add('is-active');
});
