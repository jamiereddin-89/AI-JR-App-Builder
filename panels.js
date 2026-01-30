// panels.js — handles resizing and collapse/expand of the three-panel layout
const MIN_PANEL_PX = 120;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function initPanels(opts = {}) {
  const {
    containerId = 'container',
    leftId = 'left-panel',
    middleId = 'editor-panel',
    rightId = 'right-panel',
    resizer1Id = 'resizer-1',
    resizer2Id = 'resizer-2',
  } = opts;

  const container = document.getElementById(containerId);
  const left = document.getElementById(leftId);
  const middle = document.getElementById(middleId);
  const right = document.getElementById(rightId);
  const resizer1 = document.getElementById(resizer1Id);
  const resizer2 = document.getElementById(resizer2Id);

  if (!container || !left || !middle || !right || !resizer1 || !resizer2) {
    console.warn('initPanels: missing elements, panel initialization skipped.');
    return;
  }

  // Restore sizes (percent)
  const savedLeftPct = parseFloat(localStorage.getItem('panel-left-pct') || '0');
  const savedRightPct = parseFloat(localStorage.getItem('panel-right-pct') || '0');
  const applySavedSizes = () => {
    const rect = container.getBoundingClientRect();
    if (savedLeftPct > 0) left.style.width = `${(savedLeftPct / 100) * rect.width}px`;
    if (savedRightPct > 0) right.style.width = `${(savedRightPct / 100) * rect.width}px`;
  };
  window.requestAnimationFrame(applySavedSizes);

  [left, right].forEach(panel => {
    const k = `panel-${panel.id}-collapsed`;
    if (localStorage.getItem(k) === 'true') panel.classList.add('panel-collapsed');
  });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.collapse-btn[data-target]');
    if (!btn) return;
    const targetId = btn.getAttribute('data-target');
    const target = document.getElementById(targetId);
    if (!target) return;
    const k = `panel-${targetId}-collapsed`;
    const isCollapsed = target.classList.toggle('panel-collapsed');
    localStorage.setItem(k, isCollapsed ? 'true' : 'false');
  });

  let dragging = null;
  let startX = 0;
  let startLeftW = 0;
  let startRightW = 0;
  let containerRect = null;

  function saveSizes() {
    const rect = container.getBoundingClientRect();
    const leftW = left.getBoundingClientRect().width;
    const rightW = right.getBoundingClientRect().width;
    const leftPct = (leftW / rect.width) * 100;
    const rightPct = (rightW / rect.width) * 100;
    localStorage.setItem('panel-left-pct', String(leftPct));
    localStorage.setItem('panel-right-pct', String(rightPct));
  }

  function onMouseDownResizer1(e) {
    e.preventDefault();
    dragging = 'resizer1';
    containerRect = container.getBoundingClientRect();
    startX = e.clientX;
    startLeftW = left.getBoundingClientRect().width;
    startRightW = right.getBoundingClientRect().width;
    resizer1.classList.add('active');
    document.documentElement.style.cursor = 'col-resize';
  }

  function onMouseDownResizer2(e) {
    e.preventDefault();
    dragging = 'resizer2';
    containerRect = container.getBoundingClientRect();
    startX = e.clientX;
    startLeftW = left.getBoundingClientRect().width;
    startRightW = right.getBoundingClientRect().width;
    resizer2.classList.add('active');
    document.documentElement.style.cursor = 'col-resize';
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const rect = containerRect || container.getBoundingClientRect();
    const totalWidth = rect.width;
    if (dragging === 'resizer1') {
      const delta = e.clientX - startX;
      let newLeft = clamp(startLeftW + delta, MIN_PANEL_PX, totalWidth - MIN_PANEL_PX - startRightW);
      let newMiddle = totalWidth - newLeft - startRightW;
      if (newMiddle < MIN_PANEL_PX) {
        newLeft = totalWidth - startRightW - MIN_PANEL_PX;
        newMiddle = MIN_PANEL_PX;
      }
      left.style.width = `${newLeft}px`;
      middle.style.width = `${newMiddle}px`;
    } else if (dragging === 'resizer2') {
      const delta = startX - e.clientX;
      let newRight = clamp(startRightW + delta, MIN_PANEL_PX, totalWidth - MIN_PANEL_PX - startLeftW);
      let newMiddle = totalWidth - startLeftW - newRight;
      if (newMiddle < MIN_PANEL_PX) {
        newRight = totalWidth - startLeftW - MIN_PANEL_PX;
        newMiddle = MIN_PANEL_PX;
      }
      right.style.width = `${newRight}px`;
      middle.style.width = `${newMiddle}px`;
    }
  }

  function onMouseUp() {
    if (!dragging) return;
    dragging = null;
    resizer1.classList.remove('active');
    resizer2.classList.remove('active');
    document.documentElement.style.cursor = '';
    saveSizes();
  }

  resizer1.addEventListener('mousedown', onMouseDownResizer1);
  resizer2.addEventListener('mousedown', onMouseDownResizer2);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  resizer1.addEventListener('dblclick', (ev) => {
    ev.preventDefault();
    left.style.width = '280px';
    right.style.width = '360px';
    middle.style.width = '';
    saveSizes();
  });

  resizer2.addEventListener('dblclick', (ev) => {
    ev.preventDefault();
    left.style.width = '280px';
    right.style.width = '360px';
    middle.style.width = '';
    saveSizes();
  });

  window.addEventListener('resize', () => {
    const rect = container.getBoundingClientRect();
    const leftW = left.getBoundingClientRect().width;
    const rightW = right.getBoundingClientRect().width;
    const totalLR = leftW + rightW;
    if (totalLR > rect.width - 60) {
      const shrink = totalLR - (rect.width - 60);
      const newRight = Math.max(MIN_PANEL_PX, rightW - shrink);
      right.style.width = `${newRight}px`;
      saveSizes();
    }
  });

  [resizer1, resizer2].forEach(r => {
    r.addEventListener('mouseenter', () => r.classList.add('hover'));
    r.addEventListener('mouseleave', () => r.classList.remove('hover'));
  });
}
