'use strict';

/**
 * Configurador de módulos a escala real.
 * Ancho configurable (2–3,5 m). El largo de cada tipología es fijo;
 * la superficie es ancho × largo y cambia al cambiar el ancho.
 */
document.addEventListener('DOMContentLoaded', function initModularBuilder() {
  const WIDTH_OPTIONS = [
    { id: '2', m: 2, label: '2 m' },
    { id: '2.5', m: 2.5, label: '2,5 m' },
    { id: '2.8', m: 2.8, label: '2,8 m' },
    { id: '3', m: 3, label: '3 m' },
    { id: '3.5', m: 3.5, label: '3,5 m' },
  ];
  const SNAP = 0.6;
  const EPS = 0.03;
  /** Ancho de referencia del catálogo (18–24,5 m²). El largo de cada tipología nace de ahí. */
  const REF_WIDTH = 3.5;

  const SIZES = [
    { id: '18', len: 18 / REF_WIDTH },
    { id: '20', len: 20 / REF_WIDTH },
    { id: '22', len: 22 / REF_WIDTH },
    { id: '24.5', len: 24.5 / REF_WIDTH },
  ];

  /** Coordenadas en metros; origen arriba-izquierda, antes de centrar. Largos fijos; el ancho W separa filas. */
  function presetsFor(W) {
    const L = (id) => sizeById(id).len;
    return {
      linea: [
        { sizeId: '24.5', x: 0, y: 0, rot: 0 },
        { sizeId: '24.5', x: L('24.5'), y: 0, rot: 0 },
        { sizeId: '18', x: L('24.5') * 2, y: 0, rot: 0 },
      ],
      // L clásica: brazo horizontal (2 módulos) + pierna bajo el izquierdo.
      ele: [
        { sizeId: '24.5', x: 0, y: 0, rot: 0 },
        { sizeId: '20', x: L('24.5'), y: 0, rot: 0 },
        { sizeId: '24.5', x: 0, y: W, rot: 0 },
      ],
      ce: [
        { sizeId: '24.5', x: 0, y: 0, rot: 0 },
        { sizeId: '20', x: 0, y: W, rot: 90 },
        { sizeId: '24.5', x: 0, y: W + L('20'), rot: 0 },
      ],
      patio: [
        { sizeId: '24.5', x: 0, y: 0, rot: 90 },
        { sizeId: '24.5', x: 0, y: L('24.5'), rot: 0 },
        { sizeId: '18', x: L('24.5'), y: L('24.5'), rot: 0 },
        { sizeId: '24.5', x: L('24.5') + L('18') - W, y: 0, rot: 90 },
      ],
    };
  }

  const PRESET_NAMES = {
    linea: 'En línea',
    ele: 'Forma L',
    ce: 'Forma C',
    patio: 'Con patio',
  };

  const HINTS = {
    1: 'Prueba el ancho y elige una forma. Después puedes mover, girar y agregar módulos a tu gusto.',
    2: 'Arrastra para mover · al acercarlos se pegan solos. Cambia el ancho cuando quieras.',
    3: 'Cuando el layout te guste, envíalo por WhatsApp y te armamos la cotización.',
  };

  const TONES = ['#8C6239', '#6E655C', '#A68462', '#4E5C54', '#7A5A3A', '#8A8175'];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let modules = [];
  let nextId = 1;
  let selectedId = null;
  let selectedSizeId = '24.5';
  let moduleWidth = 3.5;
  let PLOT_W = 24;
  let PLOT_H = 16;
  let activePreset = null;
  let step = 1;
  let drag = null;
  let pxPerM = 20;
  const history = [];

  const root = document.getElementById('modular-builder');
  if (!root) return;

  const stage = root.querySelector('[data-mb-stage]');
  const canvas = root.querySelector('[data-mb-canvas]');
  const hint = root.querySelector('[data-mb-hint]');
  const tip = root.querySelector('[data-mb-tip]');
  const live = root.querySelector('[data-mb-live]');
  const totalM2El = root.querySelector('[data-mb-total-m2]');
  const countEl = root.querySelector('[data-mb-count]');
  const widthLabelEl = root.querySelector('[data-mb-width-label]');
  const widthExampleEl = root.querySelector('[data-mb-width-example]');
  const humanEl = root.querySelector('[data-mb-human]');
  const dockM2 = root.querySelector('[data-mb-dock-m2]');
  const dockCount = root.querySelector('[data-mb-dock-count]');

  function sizeById(id) {
    return SIZES.find((s) => s.id === id) || SIZES[3];
  }

  function areaOf(size) {
    return moduleWidth * size.len;
  }

  function sizeLabel(size) {
    return fmtArea(areaOf(size));
  }

  function parseWidth(raw) {
    const w = Number(String(raw == null ? '' : raw).replace(',', '.'));
    if (!Number.isFinite(w)) return null;
    const hit = WIDTH_OPTIONS.find((o) => Math.abs(o.m - w) < 0.001);
    return hit ? hit.m : null;
  }

  function widthLabel(m) {
    const hit = WIDTH_OPTIONS.find((w) => Math.abs(w.m - m) < 0.001);
    return hit ? hit.label : fmtMeters(m) + ' m';
  }

  function refreshPlotSize() {
    const maxLong = Math.max(...SIZES.map((s) => s.len));
    PLOT_W = Math.max(24, Math.ceil(maxLong * 3 + moduleWidth + 2));
    PLOT_H = Math.max(16, Math.ceil(maxLong * 2 + moduleWidth + 2));
  }

  function dims(mod) {
    const s = sizeById(mod.sizeId);
    const W = moduleWidth;
    const long = s.len;
    const m2 = W * long;
    const turned = mod.rot % 180 !== 0;
    return {
      w: turned ? W : long,
      h: turned ? long : W,
      m2,
      label: fmtArea(m2),
      long,
      short: W,
    };
  }

  function sizeFootprintLabel(size) {
    return `${fmtMeters(moduleWidth)} × ${fmtMeters(size.len)} m`;
  }

  function syncWidthButtons() {
    root.querySelectorAll('[data-mb-width]').forEach((btn) => {
      const on = Math.abs(Number(btn.getAttribute('data-mb-width')) - moduleWidth) < 0.001;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function updateSizeLabels() {
    root.querySelectorAll('[data-mb-size]').forEach((btn) => {
      const s = sizeById(btn.getAttribute('data-mb-size'));
      const span = btn.querySelector('span');
      const small = btn.querySelector('small');
      if (span) span.textContent = sizeLabel(s);
      if (small) small.textContent = sizeFootprintLabel(s);
    });
  }

  function setModuleWidth(next, opts) {
    opts = opts || {};
    const w = parseWidth(next);
    if (w == null) return;
    if (Math.abs(w - moduleWidth) < 0.001) {
      pulseWidthButtons();
      return;
    }

    const oldW = moduleWidth;
    const prevTotal = totals().m2;
    if (!opts.silent) pushHistory();
    moduleWidth = w;
    refreshPlotSize();

    if (activePreset && presetsFor(moduleWidth)[activePreset]) {
      applyPreset(activePreset, { silent: true, skipHistory: true });
    } else if (modules.length) {
      // Largo fijo: solo cambia el lado corto → la superficie (ancho × largo) se actualiza.
      modules.forEach((m) => {
        const s = sizeById(m.sizeId);
        const turned = m.rot % 180 !== 0;
        const oldDw = turned ? oldW : s.len;
        const oldDh = turned ? s.len : oldW;
        const cx = m.x + oldDw / 2;
        const cy = m.y + oldDh / 2;
        const newDw = turned ? moduleWidth : s.len;
        const newDh = turned ? s.len : moduleWidth;
        m.x = cx - newDw / 2;
        m.y = cy - newDh / 2;
        clamp(m);
      });
      reflowAfterWidthChange();
      centerGroup(modules);
    }

    syncWidthButtons();
    updateSizeLabels();
    updateWidthExample();
    pulseWidthButtons();
    if (!opts.silent) {
      const nextTotal = totals().m2;
      announce(
        `Ancho ${widthLabel(moduleWidth)}: superficie ${fmtArea(nextTotal)}` +
        (modules.length ? ` (antes ${fmtArea(prevTotal)}).` : '.')
      );
      render({ keepFocus: true, widthFlash: true });
    }
  }

  /** Evita solapes al ensanchar/angostar módulos que ya estaban pegados. */
  function reflowAfterWidthChange() {
    if (modules.length < 2) return;
    let guard = 0;
    while (guard++ < modules.length * 4) {
      let moved = false;
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        if (canPlace(mod.x, mod.y, mod)) continue;
        const free = findNearestFree(mod, { x: mod.x, y: mod.y });
        if (free) {
          mod.x = free.x;
          mod.y = free.y;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function pulseWidthButtons() {
    root.querySelectorAll('.mb-widths').forEach((group) => {
      group.classList.remove('is-pulse');
      // reinicia animación si ya estaba
      void group.offsetWidth;
      group.classList.add('is-pulse');
    });
  }

  function updateWidthExample() {
    if (!widthExampleEl) return;
    const demo = sizeById(selectedSizeId);
    widthExampleEl.textContent =
      `Ej.: ${sizeFootprintLabel(demo)} → ${sizeLabel(demo)}. Al cambiar el ancho, cambia la superficie.`;
  }

  function boxOf(mod) {
    const d = dims(mod);
    return { x: mod.x, y: mod.y, w: d.w, h: d.h };
  }

  function overlap(a, b) {
    return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS
      && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;
  }

  function hitsAny(mod) {
    const a = boxOf(mod);
    return modules.some((o) => o.id !== mod.id && overlap(a, boxOf(o)));
  }

  function canPlace(x, y, mod) {
    const d = dims(mod);
    if (x < -0.001 || y < -0.001 || x + d.w > PLOT_W + 0.001 || y + d.h > PLOT_H + 0.001) return false;
    const box = { x, y, w: d.w, h: d.h };
    return !modules.some((o) => o.id !== mod.id && overlap(box, boxOf(o)));
  }

  function clamp(mod) {
    const d = dims(mod);
    mod.x = Math.max(0, Math.min(PLOT_W - d.w, mod.x));
    mod.y = Math.max(0, Math.min(PLOT_H - d.h, mod.y));
  }

  function rangesNear(a, aLen, b, bLen) {
    const gap = Math.max(a, b) - Math.min(a + aLen, b + bLen);
    return gap < 0.35;
  }

  /** Acerca bordes a un vecino si el resultado no se encima ni se sale del terreno. */
  function trySnap(mod) {
    const d = dims(mod);
    const origX = mod.x;
    const origY = mod.y;
    let best = null;
    let bestDist = SNAP + 0.001;

    modules.forEach((other) => {
      if (other.id === mod.id) return;
      const o = dims(other);
      const xs = rangesNear(mod.y, d.h, other.y, o.h)
        ? [other.x + o.w, other.x - d.w, other.x, other.x + o.w - d.w]
        : [];
      const ys = rangesNear(mod.x, d.w, other.x, o.w)
        ? [other.y + o.h, other.y - d.h, other.y, other.y + o.h - d.h]
        : [];
      const xOpts = xs.length ? xs : [origX];
      const yOpts = ys.length ? ys : [origY];
      xOpts.forEach((x) => {
        yOpts.forEach((y) => {
          if (Math.abs(x - origX) < 0.001 && Math.abs(y - origY) < 0.001) return;
          const dist = Math.hypot(x - origX, y - origY);
          if (dist > SNAP || dist >= bestDist) return;
          if (!canPlace(x, y, mod)) return;
          bestDist = dist;
          best = { x, y };
        });
      });
    });

    if (!best) return false;
    mod.x = best.x;
    mod.y = best.y;
    return true;
  }

  function findNearestFree(mod, prefer) {
    const d = dims(mod);
    const cands = [];
    modules.forEach((other) => {
      if (other.id === mod.id) return;
      const o = dims(other);
      [other.y, other.y + o.h - d.h].forEach((y) => {
        cands.push({ x: other.x + o.w, y });
        cands.push({ x: other.x - d.w, y });
      });
      [other.x, other.x + o.w - d.w].forEach((x) => {
        cands.push({ x, y: other.y + o.h });
        cands.push({ x, y: other.y - d.h });
      });
    });

    let best = null;
    let bestDist = Infinity;
    cands.forEach((c) => {
      if (!canPlace(c.x, c.y, mod)) return;
      const dist = Math.hypot(c.x - prefer.x, c.y - prefer.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    });
    return best;
  }

  function settle(mod, fallback) {
    const dropped = { x: mod.x, y: mod.y };
    const snapped = trySnap(mod);
    if (!snapped) {
      const rx = Math.round(mod.x * 2) / 2;
      const ry = Math.round(mod.y * 2) / 2;
      if (canPlace(rx, ry, mod)) {
        mod.x = rx;
        mod.y = ry;
      }
    }
    clamp(mod);
    if (!canPlace(mod.x, mod.y, mod)) {
      const free = findNearestFree(mod, dropped);
      if (free) {
        mod.x = free.x;
        mod.y = free.y;
      } else {
        mod.x = fallback.x;
        mod.y = fallback.y;
      }
    }
  }

  function sharesEdge(a, b) {
    const A = boxOf(a);
    const B = boxOf(b);
    const vertTouch = Math.abs((A.x + A.w) - B.x) < 0.06 || Math.abs((B.x + B.w) - A.x) < 0.06;
    const horizOverlap = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) > 0.2;
    const horizTouch = Math.abs((A.y + A.h) - B.y) < 0.06 || Math.abs((B.y + B.h) - A.y) < 0.06;
    const vertOverlap = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > 0.2;
    return (vertTouch && horizOverlap) || (horizTouch && vertOverlap);
  }

  function neighborIndex(mod) {
    const idx = modules.findIndex((m) => sharesEdge(mod, m) && m.id !== mod.id);
    return idx;
  }

  function centerGroup(list) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    list.forEach((m) => {
      const d = dims(m);
      minX = Math.min(minX, m.x);
      minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + d.w);
      maxY = Math.max(maxY, m.y + d.h);
    });
    // El centro geométrico rara vez cae en la grilla; se acerca a 0,5 m
    // para que los bordes del ancho elegido coincidan con las líneas del plano.
    const snapHalf = (n) => Math.round(n * 2) / 2;
    let ox = snapHalf((PLOT_W - (maxX - minX)) / 2 - minX);
    let oy = snapHalf((PLOT_H - (maxY - minY)) / 2 - minY);
    const minOx = -minX;
    const maxOx = PLOT_W - maxX;
    const minOy = -minY;
    const maxOy = PLOT_H - maxY;
    ox = Math.min(maxOx, Math.max(minOx, ox));
    oy = Math.min(maxOy, Math.max(minOy, oy));
    list.forEach((m) => {
      m.x += ox;
      m.y += oy;
    });
  }

  function footprint() {
    if (!modules.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    modules.forEach((m) => {
      const d = dims(m);
      minX = Math.min(minX, m.x);
      minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + d.w);
      maxY = Math.max(maxY, m.y + d.h);
    });
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  function fmtArea(n) {
    return n.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' m²';
  }

  function fmtMeters(n) {
    const v = Math.round(n * 100) / 100;
    return v.toLocaleString('es-CL', { maximumFractionDigits: 2 });
  }

  function totals() {
    const m2 = modules.reduce((acc, m) => acc + dims(m).m2, 0);
    return { m2, count: modules.length };
  }

  function dormLabel(m2) {
    if (m2 < 26) return '1 dormitorio o estudio';
    if (m2 < 45) return '1–2 dormitorios';
    if (m2 < 75) return '2–3 dormitorios';
    return '3 o más dormitorios';
  }

  function modIndex(mod) {
    return modules.findIndex((m) => m.id === mod.id);
  }

  function cloneState() {
    return {
      modules: modules.map((m) => ({ id: m.id, sizeId: m.sizeId, x: m.x, y: m.y, rot: m.rot })),
      preset: activePreset,
      selectedId,
      moduleWidth,
      selectedSizeId,
    };
  }

  function pushHistory() {
    history.push(cloneState());
    if (history.length > 40) history.shift();
    updateUndo();
  }

  function updateUndo() {
    const btn = root.querySelector('[data-mb-undo]');
    if (btn) btn.disabled = history.length === 0;
  }

  function announce(msg) {
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = msg; });
  }

  function updateSummary() {
    const t = totals();
    const area = fmtArea(t.m2);
    const countLabel = `${t.count} ${t.count === 1 ? 'módulo' : 'módulos'}`;
    if (totalM2El) totalM2El.textContent = area;
    if (countEl) countEl.textContent = String(t.count);
    if (widthLabelEl) widthLabelEl.textContent = widthLabel(moduleWidth);
    if (dockM2) dockM2.textContent = area;
    if (dockCount) dockCount.textContent = countLabel;
    if (humanEl) {
      humanEl.textContent = t.count === 0
        ? 'Todavía no hay módulos. Elige una forma o agrega el primero.'
        : `${countLabel} · ${area} · ancho ${widthLabel(moduleWidth)} · aprox. ${dormLabel(t.m2)}*`;
    }

    const layout = modules.map((m, i) => {
      const d = dims(m);
      return `M${i + 1}: ${fmtArea(d.m2)} (${fmtMeters(d.short)} × ${fmtMeters(d.long)} m)`;
    }).join(', ');
    const note = t.count === 0
      ? `Interés en casa modular (sin layout aún; ancho ${widthLabel(moduleWidth)})`
      : `${countLabel}, ${fmtArea(t.m2)}, ancho ${widthLabel(moduleWidth)} (${layout})`;
    window.__prefabModularLayout = note;
    root.querySelectorAll('[data-mb-whatsapp]').forEach((btn) => {
      btn.setAttribute('data-preset-layout', note);
      btn.setAttribute('data-preset-tipo', 'Modular');
    });

    root.querySelectorAll('[data-mb-preset]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-mb-preset') === activePreset);
    });
    root.querySelectorAll('[data-mb-size]').forEach((btn) => {
      const on = btn.getAttribute('data-mb-size') === selectedSizeId;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    syncWidthButtons();
    updateWidthExample();
  }

  function syncScale() {
    if (!canvas) return;
    // El aspect-ratio del plano sigue al terreno real; si no, al angostar
    // el ancho los módulos se cortan o parecen no cambiar.
    canvas.style.aspectRatio = `${PLOT_W} / ${PLOT_H}`;
    const width = canvas.clientWidth;
    if (width < 20) return;
    pxPerM = width / PLOT_W;
    canvas.style.setProperty('--mb-m', pxPerM + 'px');
  }

  function clientToMeters(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * PLOT_W,
      y: ((clientY - rect.top) / rect.height) * PLOT_H,
    };
  }

  function render(opts) {
    if (!canvas) return;
    opts = opts || {};
    if (canvas.clientWidth < 20) {
      const retries = (opts.retries || 0) + 1;
      if (retries < 8) requestAnimationFrame(() => render(Object.assign({}, opts, { retries })));
      return;
    }
    syncScale();
    const keepId = opts.keepFocus ? selectedId : null;

    canvas.innerHTML = '';
    root.classList.remove('is-dragging');

    if (!modules.length) {
      const empty = document.createElement('p');
      empty.className = 'mb-empty';
      empty.textContent = 'El plano está vacío. Elige un ancho, una forma, o agrega el primer módulo.';
      canvas.appendChild(empty);
    }

    modules.forEach((mod, idx) => {
      const d = dims(mod);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'mb-module' + (mod.id === selectedId ? ' is-selected' : '');
      el.dataset.mbId = String(mod.id);
      const pw = d.w * pxPerM;
      const ph = d.h * pxPerM;
      if (pw < 86 || ph < 58) el.classList.add('is-tight');
      el.style.left = (mod.x * pxPerM) + 'px';
      el.style.top = (mod.y * pxPerM) + 'px';
      el.style.width = pw + 'px';
      el.style.height = ph + 'px';
      el.style.background = TONES[idx % TONES.length];
      el.setAttribute('aria-label', `Módulo ${idx + 1}, ${d.label}, ${fmtMeters(d.w)} por ${fmtMeters(d.h)} metros. Arrastrar para mover.`);
      el.innerHTML = `<span class="mb-module-idx">M${idx + 1}</span><span class="mb-module-label">${d.label}</span><span class="mb-module-dim">${fmtMeters(d.w)} × ${fmtMeters(d.h)} m</span>`;

      if (!reduceMotion && opts.widthFlash) {
        el.classList.add('is-width-flash');
      }

      if (!reduceMotion && opts.animateId === mod.id && opts.from) {
        el.style.left = (opts.from.x * pxPerM) + 'px';
        el.style.top = (opts.from.y * pxPerM) + 'px';
        requestAnimationFrame(() => {
          el.classList.add('is-settling');
          requestAnimationFrame(() => {
            el.style.left = (mod.x * pxPerM) + 'px';
            el.style.top = (mod.y * pxPerM) + 'px';
          });
        });
      }

      canvas.appendChild(el);
    });

    const selected = modules.find((m) => m.id === selectedId);
    if (selected && step !== 1) {
      const bar = buildFloat(selected);
      canvas.appendChild(bar);
      placeBar(bar, selected);
    }
    fillSelectedTools(selected);

    const fp = footprint();
    if (fp) canvas.appendChild(buildCotas(fp));

    updateSummary();

    if (keepId != null) {
      canvas.querySelector(`[data-mb-id="${keepId}"]`)?.focus({ preventScroll: true });
    }
  }

  function buildFloat(mod) {
    const bar = document.createElement('div');
    bar.className = 'mb-float';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', `Acciones del módulo ${modIndex(mod) + 1}`);

    const rot = document.createElement('button');
    rot.type = 'button';
    rot.dataset.mbRotate = '1';
    rot.textContent = 'Girar';
    rot.setAttribute('aria-label', 'Girar 90 grados');
    bar.appendChild(rot);

    SIZES.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.mbResize = s.id;
      b.textContent = areaOf(s).toLocaleString('es-CL', { maximumFractionDigits: 1 });
      b.className = mod.sizeId === s.id ? 'is-active' : '';
      b.setAttribute('aria-label', `Cambiar a ${sizeLabel(s)}`);
      b.setAttribute('aria-pressed', mod.sizeId === s.id ? 'true' : 'false');
      bar.appendChild(b);
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.dataset.mbRemove = '1';
    del.textContent = 'Quitar';
    del.setAttribute('aria-label', 'Quitar este módulo');
    bar.appendChild(del);

    return bar;
  }

  function fillSelectedTools(mod) {
    const box = root.querySelector('[data-mb-selected-tools]');
    const label = root.querySelector('[data-mb-selected-label]');
    if (!box || !label) return;
    box.innerHTML = '';
    if (!mod) {
      label.textContent = 'Toca un módulo del plano para girarlo o cambiar su tamaño.';
      return;
    }
    const d = dims(mod);
    label.textContent = `Módulo ${modIndex(mod) + 1} · ${d.label} · ${fmtMeters(d.short)} × ${fmtMeters(d.long)} m`;
    const tools = buildFloat(mod);
    while (tools.firstChild) box.appendChild(tools.firstChild);
  }

  /** La barra no debe tapar otro módulo: prueba arriba y, si choca, abajo. */
  function placeBar(bar, mod) {
    const d = dims(mod);
    const bw = bar.offsetWidth;
    const bh = bar.offsetHeight;
    const limitW = canvas.clientWidth;
    const limitH = canvas.clientHeight;
    const ml = mod.x * pxPerM;
    const mt = mod.y * pxPerM;
    const mw = d.w * pxPerM;
    const mh = d.h * pxPerM;
    let left = ml + mw / 2 - bw / 2;
    left = Math.max(4, Math.min(Math.max(4, limitW - bw - 4), left));

    const covers = (top) => modules.some((other) => {
      if (other.id === mod.id) return false;
      const o = dims(other);
      const ol = other.x * pxPerM;
      const ot = other.y * pxPerM;
      const orr = ol + o.w * pxPerM;
      const ob = ot + o.h * pxPerM;
      return left < orr && left + bw > ol && top < ob && top + bh > ot;
    });

    const above = mt - bh - 8;
    const below = mt + mh + 8;
    let top = above;
    if ((above < 4 || covers(above)) && below + bh < limitH - 4 && !covers(below)) top = below;
    else if (covers(above)) top = Math.max(4, Math.min(above, limitH - bh - 4));
    if (top < 4) top = 4;
    if (top + bh > limitH - 4) top = Math.max(4, limitH - bh - 4);

    bar.style.left = left + 'px';
    bar.style.top = top + 'px';
    bar.style.transform = 'none';
  }

  function buildCotas(fp) {
    const layer = document.createElement('div');
    layer.className = 'mb-cotas';
    layer.setAttribute('aria-hidden', 'true');

    const xLine = document.createElement('div');
    xLine.className = 'mb-cota mb-cota-x';
    const xTop = fp.maxY * pxPerM + 8;
    const canvasH = canvas.clientHeight || PLOT_H * pxPerM;
    const yLabelTop = xTop + 14 > canvasH - 4 ? fp.maxY * pxPerM - 22 : xTop;
    xLine.style.left = (fp.minX * pxPerM) + 'px';
    xLine.style.width = (fp.w * pxPerM) + 'px';
    xLine.style.top = yLabelTop + 'px';
    xLine.innerHTML = `<span>${fmtMeters(fp.w)} m</span>`;

    const yLine = document.createElement('div');
    yLine.className = 'mb-cota mb-cota-y';
    const xLeft = fp.maxX * pxPerM + 8;
    const canvasW = canvas.clientWidth || PLOT_W * pxPerM;
    const xLabelLeft = xLeft + 36 > canvasW ? fp.minX * pxPerM + 6 : xLeft;
    yLine.style.top = (fp.minY * pxPerM) + 'px';
    yLine.style.height = (fp.h * pxPerM) + 'px';
    yLine.style.left = xLabelLeft + 'px';
    yLine.innerHTML = `<span>${fmtMeters(fp.h)} m</span>`;

    layer.appendChild(xLine);
    layer.appendChild(yLine);
    return layer;
  }

  function setStep(n) {
    step = n;
    root.dataset.step = String(n);
    root.querySelectorAll('[data-mb-step]').forEach((btn) => {
      const on = Number(btn.getAttribute('data-mb-step')) === n;
      btn.classList.toggle('is-current', on);
      if (on) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
    root.querySelectorAll('[data-mb-panel]').forEach((panel) => {
      panel.hidden = Number(panel.getAttribute('data-mb-panel')) !== n;
    });
    if (hint) hint.textContent = HINTS[n];
    if (n === 2) showTip();
    render();
  }

  function showTip() {
    if (!tip) return;
    let seen = false;
    try { seen = localStorage.getItem('prefab-mb-tip') === '1'; } catch (err) { seen = true; }
    tip.hidden = seen;
  }

  function dismissTip() {
    if (!tip) return;
    tip.hidden = true;
    try { localStorage.setItem('prefab-mb-tip', '1'); } catch (err) { /* privado */ }
  }

  function applyPreset(name, opts) {
    const list = presetsFor(moduleWidth)[name];
    if (!list) return;
    opts = opts || {};
    if (!opts.silent && !opts.skipHistory) pushHistory();
    modules = list.map((p) => ({
      id: nextId++,
      sizeId: p.sizeId,
      x: p.x,
      y: p.y,
      rot: p.rot || 0,
    }));
    centerGroup(modules);
    selectedId = modules[0] ? modules[0].id : null;
    activePreset = name;
    const t = totals();
    if (!opts.silent) {
      announce(`${PRESET_NAMES[name]}: ${t.count} módulos, ${fmtArea(t.m2)}, ancho ${widthLabel(moduleWidth)}.`);
      setStep(2);
      return;
    }
    render();
  }

  function addModule(sizeId) {
    const s = sizeById(sizeId || selectedSizeId);
    const mod = { id: nextId++, sizeId: s.id, x: 0, y: 0, rot: 0 };
    const d = dims(mod);

    if (!modules.length) {
      mod.x = (PLOT_W - d.w) / 2;
      mod.y = (PLOT_H - d.h) / 2;
    } else {
      const anchors = [];
      const sel = modules.find((m) => m.id === selectedId);
      if (sel) anchors.push(sel);
      for (let i = modules.length - 1; i >= 0; i--) {
        if (anchors.indexOf(modules[i]) === -1) anchors.push(modules[i]);
      }
      let placed = null;
      for (let a = 0; a < anchors.length && !placed; a++) {
        const anchor = anchors[a];
        const o = dims(anchor);
        const spots = [
          { x: anchor.x + o.w, y: anchor.y },
          { x: anchor.x, y: anchor.y + o.h },
          { x: anchor.x - d.w, y: anchor.y },
          { x: anchor.x, y: anchor.y - d.h },
        ];
        for (let i = 0; i < spots.length; i++) {
          if (canPlace(spots[i].x, spots[i].y, mod)) {
            placed = spots[i];
            break;
          }
        }
      }
      if (!placed) {
        nextId -= 1;
        announce('No queda espacio libre. Mueve un módulo para hacer sitio.');
        return;
      }
      mod.x = placed.x;
      mod.y = placed.y;
    }

    pushHistory();
    modules.push(mod);
    selectedId = mod.id;
    activePreset = null;
    announce(`Módulo ${modules.length} agregado, ${sizeLabel(s)}.`);
    render({ keepFocus: true });
  }

  function removeSelected() {
    if (!modules.length) return;
    const mod = modules.find((m) => m.id === selectedId) || modules[modules.length - 1];
    const n = modIndex(mod) + 1;
    pushHistory();
    modules = modules.filter((m) => m.id !== mod.id);
    selectedId = modules.length ? modules[modules.length - 1].id : null;
    activePreset = null;
    announce(`Módulo ${n} eliminado.`);
    render({ keepFocus: true });
  }

  function rotateSelected() {
    const mod = modules.find((m) => m.id === selectedId) || modules[modules.length - 1];
    if (!mod) return;
    const prevRot = mod.rot;
    const prevPos = { x: mod.x, y: mod.y };
    pushHistory();
    mod.rot = (mod.rot + 90) % 360;
    settle(mod, prevPos);
    if (!canPlace(mod.x, mod.y, mod)) {
      mod.rot = prevRot;
      mod.x = prevPos.x;
      mod.y = prevPos.y;
      history.pop();
      updateUndo();
      announce('No se puede girar: no queda espacio.');
      render({ keepFocus: true });
      return;
    }
    selectedId = mod.id;
    activePreset = null;
    announce(`Módulo ${modIndex(mod) + 1} girado.`);
    render({ keepFocus: true, animateId: mod.id, from: prevPos });
  }

  function resizeSelected(sizeId) {
    const mod = modules.find((m) => m.id === selectedId);
    if (!mod || mod.sizeId === sizeId) return;
    const prevSize = mod.sizeId;
    const prevPos = { x: mod.x, y: mod.y };
    pushHistory();
    mod.sizeId = sizeId;
    settle(mod, prevPos);
    if (!canPlace(mod.x, mod.y, mod)) {
      mod.sizeId = prevSize;
      mod.x = prevPos.x;
      mod.y = prevPos.y;
      history.pop();
      updateUndo();
      announce('Ese tamaño no cabe ahí.');
      render({ keepFocus: true });
      return;
    }
    activePreset = null;
    announce(`Módulo ${modIndex(mod) + 1} ahora mide ${sizeLabel(sizeById(sizeId))}.`);
    render({ keepFocus: true, animateId: mod.id, from: prevPos });
  }

  function clearAll() {
    if (!modules.length) {
      setStep(1);
      return;
    }
    pushHistory();
    modules = [];
    selectedId = null;
    activePreset = null;
    announce('Plano vacío. Elige una forma para empezar de nuevo.');
    setStep(1);
  }

  function undo() {
    const prev = history.pop();
    if (!prev) return;
    modules = prev.modules;
    activePreset = prev.preset;
    selectedId = prev.selectedId;
    if (typeof prev.moduleWidth === 'number') moduleWidth = prev.moduleWidth;
    if (prev.selectedSizeId) selectedSizeId = prev.selectedSizeId;
    refreshPlotSize();
    syncWidthButtons();
    updateSizeLabels();
    updateWidthExample();
    updateUndo();
    announce('Cambio deshecho.');
    render({ keepFocus: true });
  }

  function nudge(mod, dx, dy) {
    const start = { x: mod.x, y: mod.y };
    const snapshot = cloneState();
    mod.x += dx;
    mod.y += dy;
    clamp(mod);
    settle(mod, start);
    if (Math.abs(mod.x - start.x) > 0.001 || Math.abs(mod.y - start.y) > 0.001) {
      history.push(snapshot);
      if (history.length > 40) history.shift();
      updateUndo();
      activePreset = null;
    }
    const ni = neighborIndex(mod);
    const stuck = ni >= 0 ? `, pegado al módulo ${ni + 1}` : '';
    announce(`Módulo ${modIndex(mod) + 1} movido${stuck}.`);
    render({ keepFocus: true, animateId: mod.id, from: start });
  }

  function onPointerDown(e) {
    const el = e.target.closest('.mb-module');
    if (!el || !canvas.contains(el)) return;
    const mod = modules.find((m) => m.id === Number(el.dataset.mbId));
    if (!mod) return;
    e.preventDefault();
    selectedId = mod.id;
    const g = clientToMeters(e.clientX, e.clientY);
    drag = {
      id: mod.id,
      ox: g.x - mod.x,
      oy: g.y - mod.y,
      moved: false,
      startX: mod.x,
      startY: mod.y,
      snapshot: cloneState(),
    };
    el.setPointerCapture?.(e.pointerId);
    canvas.querySelectorAll('.mb-module').forEach((n) => n.classList.toggle('is-selected', n === el));
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!drag) return;
    const mod = modules.find((m) => m.id === drag.id);
    if (!mod) return;
    const g = clientToMeters(e.clientX, e.clientY);
    const nx = g.x - drag.ox;
    const ny = g.y - drag.oy;
    if (Math.hypot(nx - drag.startX, ny - drag.startY) > 0.08) drag.moved = true;
    mod.x = nx;
    mod.y = ny;
    clamp(mod);
    const el = canvas.querySelector(`[data-mb-id="${mod.id}"]`);
    if (!el) return;
    el.style.left = (mod.x * pxPerM) + 'px';
    el.style.top = (mod.y * pxPerM) + 'px';
    root.classList.add('is-dragging');
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    if (!drag) return;
    const mod = modules.find((m) => m.id === drag.id);
    const info = drag;
    drag = null;
    if (!mod) return;
    const from = { x: info.startX, y: info.startY };
    const dropped = { x: mod.x, y: mod.y };
    if (info.moved) {
      settle(mod, from);
      const changed = Math.abs(mod.x - from.x) > 0.001 || Math.abs(mod.y - from.y) > 0.001;
      if (changed) {
        history.push(info.snapshot);
        if (history.length > 40) history.shift();
        updateUndo();
        activePreset = null;
        const ni = neighborIndex(mod);
        const stuck = ni >= 0 ? `, pegado al módulo ${ni + 1}` : '';
        announce(`Módulo ${modIndex(mod) + 1} movido${stuck}.`);
      }
    }
    selectedId = mod.id;
    if (step === 1) setStep(2);
    else render({ keepFocus: true, animateId: info.moved ? mod.id : null, from: dropped });
  }

  root.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('[data-mb-step]');
    if (stepBtn && root.contains(stepBtn)) {
      setStep(Number(stepBtn.getAttribute('data-mb-step')));
      return;
    }
    const presetBtn = e.target.closest('[data-mb-preset]');
    if (presetBtn && root.contains(presetBtn)) {
      const name = presetBtn.getAttribute('data-mb-preset');
      if (name === 'vacio') {
        if (modules.length) pushHistory();
        modules = [];
        selectedId = null;
        activePreset = null;
        announce('Plano vacío. Agrega tu primer módulo.');
        setStep(2);
        return;
      }
      applyPreset(name);
      return;
    }
    const widthBtn = e.target.closest('[data-mb-width]');
    if (widthBtn && root.contains(widthBtn) && !widthBtn.disabled) {
      setModuleWidth(widthBtn.getAttribute('data-mb-width'));
      return;
    }
    const sizeBtn = e.target.closest('[data-mb-size]');
    if (sizeBtn && root.contains(sizeBtn)) {
      selectedSizeId = sizeBtn.getAttribute('data-mb-size');
      updateSizeLabels();
      updateWidthExample();
      updateSummary();
      return;
    }
    if (e.target.closest('[data-mb-add]')) { addModule(selectedSizeId); return; }
    if (e.target.closest('[data-mb-rotate]')) { rotateSelected(); return; }
    if (e.target.closest('[data-mb-remove]')) { removeSelected(); return; }
    if (e.target.closest('[data-mb-clear]')) { clearAll(); return; }
    if (e.target.closest('[data-mb-undo]')) { undo(); return; }
    if (e.target.closest('[data-mb-tip-close]')) { dismissTip(); return; }
    const resizeBtn = e.target.closest('[data-mb-resize]');
    if (resizeBtn && root.contains(resizeBtn)) resizeSelected(resizeBtn.getAttribute('data-mb-resize'));
  });

  root.addEventListener('keydown', (e) => {
    const el = e.target.closest?.('.mb-module');
    if (!el || !root.contains(el)) return;
    const mod = modules.find((m) => m.id === Number(el.dataset.mbId));
    if (!mod) return;
    selectedId = mod.id;
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(mod, -0.5, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(mod, 0.5, 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(mod, 0, -0.5); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(mod, 0, 0.5); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateSelected(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); }
  });

  canvas.addEventListener('pointerdown', onPointerDown);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(), 120);
  }, { passive: true });

  refreshPlotSize();
  syncWidthButtons();
  updateSizeLabels();
  applyPreset('linea', { silent: true });
  setStep(1);
});
