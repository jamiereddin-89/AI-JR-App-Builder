// main.js — bootstrap for the vanilla app shell
// Keep this minimal: initializes theme toggles and panel behavior.

import { initPanels } from './panels.js';

// Tiny state utility (centralized state)
export const state = (function () {
  let store = {
    theme: localStorage.getItem('aijr-theme') || 'light',
  };
  const subs = new Set();
  function get() { return { ...store }; }
  function set(partial) {
    store = { ...store, ...partial };
    subs.forEach((cb) => cb(get()));
    // persist theme automatically
    if (partial.theme) localStorage.setItem('aijr-theme', partial.theme);
  }
  function subscribe(cb) { subs.add(cb); return () => subs.delete(cb); }
  return { get, set, subscribe };
})();

function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
}

// Hook up theme buttons
function initThemeButtons() {
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-theme');
      state.set({ theme: t });
    });
  });

  // Apply persisted theme on load
  applyTheme(state.get().theme);
  state.subscribe(s => applyTheme(s.theme));
}

function initUsageBarDemo() {
  // Fake usage refresh demo (we'll just animate the fill on boot)
  const fill = document.getElementById('usage-fill');
  if (!fill) return;
  setTimeout(() => {
    fill.style.width = '44%';
    fill.classList.add('usage-bar-pulse');
    setTimeout(() => fill.classList.remove('usage-bar-pulse'), 1200);
  }, 400);
}

window.addEventListener('DOMContentLoaded', () => {
  // initialize panels and resizers
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

  // example: new file button hook (placeholder)
  const newFileBtn = document.getElementById('new-file-btn');
  if (newFileBtn) {
    newFileBtn.addEventListener('click', () => {
      // In the full migration we'll show a modal and create a new editor tab.
      alert('New file flow will be added in the next step.');
    });
  }
});
