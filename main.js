// main.js — initializes panels, theme, and the main app module
import { initPanels } from './panels.js';
import { initApp } from './app.js';

function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
}

function initThemeButtons() {
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-theme');
      localStorage.setItem('aijr-theme', t);
      applyTheme(t);
    });
  });

  const saved = localStorage.getItem('aijr-theme') || 'light';
  applyTheme(saved);
}

function initUsageBarDemo() {
  const fill = document.getElementById('usage-fill');
  if (!fill) return;
  setTimeout(() => {
    fill.style.width = '44%';
    fill.classList.add('usage-bar-pulse');
    setTimeout(() => fill.classList.remove('usage-bar-pulse'), 1200);
  }, 400);
}

window.addEventListener('DOMContentLoaded', async () => {
  initPanels({
    containerId: 'container',
    leftId: 'left-panel',
    middleId: 'editor-panel',
    rightId: 'right-panel',
    resizer1Id: 'resizer-1',
    resizer2Id: 'resizer-2',
  });

  initThemeButtons();
  initUsageBarDemo();

  // init the app (wires UI, editor, storage, providers)
  await initApp({
    leftContentId: 'left-content',
    editorAreaId: 'editor-area',
    rightContentId: 'right-content',
    newFileBtnId: 'new-file-btn',
  });
});
