'use strict';

/**
 * Configurador visual de módulos: arrastrar rectángulos (18–24,5 m²)
 * Presets pegados + snap magnético + escala responsive.
 */
document.addEventListener('DOMContentLoaded', function initModularBuilder() {
  const PRICE_PER_M2 = 700000;
  const GRID_W = 20;
  const GRID_H = 12;
  const SNAP = 0.4;

  /** Dimensiones en enteros de grilla para que se peguen sin huecos */
  const SIZES = [
    { id: '18', label: '18 m²', w: 6, h: 3, m2: 18 },
    { id: '20', label: '20 m²', w: 5, h: 4, m2: 20 },
    { id: '22', label: '22 m²', w: 5, h: 4, m2: 22 },
    { id: '24.5', label: '24,5 m²', w: 7, h: 3, m2: 24.5 },
  ];

  /**
   * Presets con lados compartidos (módulos conectados).
   * Coordenadas relativas; se centran al aplicar.
   */
  const PRESETS = {
    /* ─── en línea: lados cortos pegados ─── */
    linea: [
      { sizeId: '24.5', x: 0, y: 0, rot: 0 },
      { sizeId: '24.5', x: 7, y: 0, rot: 0 },
      { sizeId: '18', x: 14, y: 0, rot: 0 },
    ],
    /* ─── L: horizontal + vertical compartiendo borde ─── */
    ele: [
      { sizeId: '24.5', x: 0, y: 0, rot: 0 },
      { sizeId: '24.5', x: 0, y: 3, rot: 90 },
      { sizeId: '20', x: 3, y: 3, rot: 0 },
    ],
    /* ─── C: superior + lateral + inferior, todos pegados ─── */
    ce: [
      { sizeId: '24.5', x: 0, y: 0, rot: 0 },
      { sizeId: '20', x: 3, y: 3, rot: 90 },
      { sizeId: '24.5', x: 0, y: 8, rot: 0 },
    ],
    /* ─── patio / U: laterales + base continua ─── */
    patio: [
      { sizeId: '24.5', x: 0, y: 0, rot: 90 },
      { sizeId: '24.5', x: 0, y: 7, rot: 0 },
      { sizeId: '18', x: 7, y: 7, rot: 0 },
      { sizeId: '24.5', x: 10, y: 0, rot: 90 },
    ],
  };

  const COLORS = ['#B45309', '#0F766E', '#1D4ED8', '#BE123C', '#A16207', '#4338CA'];

  let modules = [];
  let nextId = 1;
  let selectedId = null;
  let drag = null;
  let selectedSizeId = '24.5';
  let cell = 28;

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

  function overlapsY(a, ah, b, bh) {
    return a < b + bh && a + ah > b;
  }

  function overlapsX(a, aw, b, bw) {
    return a < b + bw && a + aw > b;
  }

  /** Pega el módulo a vecinos cercanos (bordes compartidos) */
  function snapToNeighbors(mod) {
    const d = dims(mod);
    let bestX = null;
    let bestY = null;
    let bestXd = SNAP;
    let bestYd = SNAP;

    modules.forEach((other) => {
      if (other.id === mod.id) return;
      const o = dims(other);

      if (overlapsY(mod.y, d.h, other.y, o.h)) {
        const toRight = Math.abs(mod.x - (other.x + o.w));
        const toLeft = Math.abs(mod.x + d.w - other.x);
        if (toRight < bestXd) { bestXd = toRight; bestX = other.x + o.w; }
        if (toLeft < bestXd) { bestXd = toLeft; bestX = other.x - d.w; }

        const alignL = Math.abs(mod.x - other.x);
        const alignR = Math.abs(mod.x + d.w - (other.x + o.w));
        if (alignL < bestXd) { bestXd = alignL; bestX = other.x; }
        if (alignR < bestXd) { bestXd = alignR; bestX = other.x + o.w - d.w; }
      }

      if (overlapsX(mod.x, d.w, other.x, o.w)) {
        const toBottom = Math.abs(mod.y - (other.y + o.h));
        const toTop = Math.abs(mod.y + d.h - other.y);
        if (toBottom < bestYd) { bestYd = toBottom; bestY = other.y + o.h; }
        if (toTop < bestYd) { bestYd = toTop; bestY = other.y - d.h; }

        const alignT = Math.abs(mod.y - other.y);
        const alignB = Math.abs(mod.y + d.h - (other.y + o.h));
        if (alignT < bestYd) { bestYd = alignT; bestY = other.y; }
        if (alignB < bestYd) { bestYd = alignB; bestY = other.y + o.h - d.h; }
      }
    });

    if (bestX != null) mod.x = bestX;
    if (bestY != null) mod.y = bestY;
    clamp(mod);
  }

  function centerPreset(list) {
    let maxR = 0;
    let maxB = 0;
    list.forEach((p) => {
      const s = sizeById(p.sizeId);
      const rot = (p.rot || 0) % 180 !== 0;
      const w = rot ? s.h : s.w;
      const h = rot ? s.w : s.h;
      maxR = Math.max(maxR, p.x + w);
      maxB = Math.max(maxB, p.y + h);
    });
    const ox = Math.max(0, Math.floor((GRID_W - maxR) / 2));
    const oy = Math.max(0, Math.floor((GRID_H - maxB) / 2));
    return list.map((p) => ({ ...p, x: p.x + ox, y: p.y + oy }));
  }

  function computeCell() {
    if (!stage) return 28;
    const pad = 16;
    const availW = Math.max(200, stage.clientWidth - pad);
    const availH = Math.max(180, Math.min(stage.clientHeight || 360, window.innerWidth < 640 ? 280 : 420) - pad);
    const byW = Math.floor(availW / GRID_W);
    const byH = Math.floor(availH / GRID_H);
    return Math.max(12, Math.min(32, Math.min(byW, byH)));
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

  function clientToGrid(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = (GRID_W * cell) / rect.width;
    const scaleY = (GRID_H * cell) / rect.height;
    return {
      x: (clientX - rect.left) * scaleX / cell,
      y: (clientY - rect.top) * scaleY / cell,
    };
  }

  function render() {
    if (!canvas) return;
    cell = computeCell();
    if (stage) stage.style.setProperty('--mb-cell', cell + 'px');

    canvas.style.width = GRID_W * cell + 'px';
    canvas.style.height = GRID_H * cell + 'px';
    canvas.innerHTML = '';

    modules.forEach((mod, idx) => {
      const d = dims(mod);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'mb-module' + (mod.id === selectedId ? ' is-selected' : '');
      el.style.left = mod.x * cell + 'px';
      el.style.top = mod.y * cell + 'px';
      el.style.width = d.w * cell + 'px';
      el.style.height = d.h * cell + 'px';
      el.style.background = COLORS[idx % COLORS.length];
      el.setAttribute('aria-label', `Módulo ${idx + 1}, ${d.label}. Arrastrar para mover.`);
      el.innerHTML = `<span class="mb-module-label">${d.label}</span><span class="mb-module-idx">M${idx + 1}</span>`;

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        selectedId = mod.id;
        const g = clientToGrid(e.clientX, e.clientY);
        drag = {
          id: mod.id,
          ox: g.x - mod.x,
          oy: g.y - mod.y,
          moved: false,
        };
        el.setPointerCapture(e.pointerId);
        root.querySelectorAll('.mb-module').forEach((n) => n.classList.toggle('is-selected', n === el));
      });

      el.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== mod.id) return;
        drag.moved = true;
        const g = clientToGrid(e.clientX, e.clientY);
        mod.x = g.x - drag.ox;
        mod.y = g.y - drag.oy;
        clamp(mod);
        el.style.left = mod.x * cell + 'px';
        el.style.top = mod.y * cell + 'px';
      });

      el.addEventListener('pointerup', () => {
        if (!drag || drag.id !== mod.id) return;
        mod.x = Math.round(mod.x);
        mod.y = Math.round(mod.y);
        snapToNeighbors(mod);
        drag = null;
        render();
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
      x: Math.floor(GRID_W / 2 - s.w / 2),
      y: Math.floor(GRID_H / 2 - s.h / 2),
      rot: 0,
    };
    if (modules.length) {
      const last = modules[modules.length - 1];
      const ld = dims(last);
      mod.x = last.x + ld.w;
      mod.y = last.y;
    }
    clamp(mod);
    snapToNeighbors(mod);
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
    snapToNeighbors(mod);
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
    const centered = centerPreset(list);
    modules = centered.map((p) => {
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

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 120);
  }, { passive: true });

  applyPreset('linea');
  root.querySelector('[data-mb-size="24.5"]')?.classList.add('is-active');
});
