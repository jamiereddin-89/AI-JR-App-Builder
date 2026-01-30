// app7.js — Chunk 7 (final chunk: lines ~3000-end of script.jsx converted to vanilla JS)
// Adds: robust panel resizing (mouse + touch), final UI glue, collapse toggles, safe iframe-overlay during drags,
// small accessibility/keyboard improvements, and marks the app as fully initialized.
// This file expects app.js..app6.js to already be loaded.

(function () {
  // Minimal helpers
  function qs(sel, root = document) { return (root || document).querySelector(sel); }
  function qsa(sel, root = document) { return Array.from((root || document).querySelectorAll(sel)); }
  function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function loadJSON(k, fallback) { try { return JSON.parse(localStorage.getItem(k) || "null") || fallback; } catch { return fallback; } }

  // Ensure main containers exist
  const container = document.getElementById("container") || (function createContainer() {
    const c = document.createElement("div");
    c.id = "container";
    document.body.prepend(c);
    return c;
  })();

  const left = qs("#aijr-left") || qs("#left-panel") || null;
  const middle = qs("#aijr-middle") || null;
  const right = qs("#aijr-right") || null;

  // Pull user settings if they exist
  const SETTINGS_KEY = "ai_jr_settings_v1";
  const settings = loadJSON(SETTINGS_KEY, {});
  // default widths (percent)
  let leftPanelWidth = settings.leftPanelWidth || Number(localStorage.getItem("leftPanelWidth")) || 25;
  let codePanelWidth = settings.codePanelWidth || Number(localStorage.getItem("codePanelWidth")) || 42;

  // Resizing state
  let isResizing = null; // 'left' | 'right' or null
  let startX = 0;
  let startLeftPct = leftPanelWidth;
  let startCodePct = codePanelWidth;

  // Utility to set widths (applies percent to left and middle)
  function applyPanelWidths() {
    if (left) {
      left.style.width = `${left.classList.contains("collapsed") ? 50 : leftPanelWidth}%`;
      left.style.minWidth = left.classList.contains("collapsed") ? "50px" : "200px";
    }
    if (middle) {
      middle.style.width = `${(middle.classList.contains("collapsed") ? 50 : codePanelWidth)}%`;
      middle.style.minWidth = middle.classList.contains("collapsed") ? "50px" : "300px";
    }
    // right will flex to remaining space
    // persist
    settings.leftPanelWidth = leftPanelWidth;
    settings.codePanelWidth = codePanelWidth;
    saveJSON(SETTINGS_KEY, settings);
    localStorage.setItem("leftPanelWidth", leftPanelWidth);
    localStorage.setItem("codePanelWidth", codePanelWidth);
  }

  // Create overlay to capture mouse/touch during resizing
  function createResizeOverlay() {
    let overlay = document.getElementById("aijr-resize-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "aijr-resize-overlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = 99999;
      overlay.style.cursor = "col-resize";
      document.body.appendChild(overlay);
    }
    return overlay;
  }
  function removeResizeOverlay() {
    const overlay = document.getElementById("aijr-resize-overlay");
    if (overlay) overlay.remove();
  }

  // Start resize
  function startResize(which, e) {
    e.preventDefault();
    isResizing = which;
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    startLeftPct = leftPanelWidth;
    startCodePct = codePanelWidth;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    createResizeOverlay();
  }

  // Compute new widths on move
  function handleMove(e) {
    if (!isResizing) return;
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const rect = container.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const pct = (offsetX / rect.width) * 100;
    if (isResizing === "left") {
      // Clamp between 10 and 40
      leftPanelWidth = Math.max(10, Math.min(40, pct));
      // keep codePanel width unchanged relative to full; if necessary clamp
      codePanelWidth = Math.max(20, Math.min(80, startCodePct));
    } else if (isResizing === "right") {
      // Right resizer moves boundary between middle and right; compute codePanelWidth as pct - leftPanelWidth
      const newCode = Math.max(10, Math.min(80, pct - leftPanelWidth));
      codePanelWidth = Math.max(10, Math.min(80, newCode));
    }
    applyPanelWidths();
  }

  function stopResize() {
    if (!isResizing) return;
    isResizing = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    removeResizeOverlay();
  }

  // Attach events to any resizers with class 'panel-resizer'
  function wireResizers() {
    const resizers = qsa(".panel-resizer");
    resizers.forEach(r => {
      r.style.touchAction = "none";
      r.addEventListener("mousedown", (e) => startResize(r.dataset.side || (r.previousElementSibling ? "left" : "right"), e));
      r.addEventListener("touchstart", (e) => startResize(r.dataset.side || (r.previousElementSibling ? "left" : "right"), e), {passive:false});
    });
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, {passive:false});
    window.addEventListener("mouseup", stopResize);
    window.addEventListener("touchend", stopResize);
  }

  // If resizers not present yet, create simple ones between panels
  function ensureResizersExist() {
    // left->middle resizer
    const existingLeft = qs(".aijr-resizer-left");
    if (!existingLeft && left && middle) {
      const r = document.createElement("div");
      r.className = "panel-resizer aijr-resizer-left";
      r.dataset.side = "left";
      r.style.width = "8px";
      r.style.cursor = "col-resize";
      r.style.background = "transparent";
      r.style.display = "flex";
      r.style.alignItems = "center";
      r.style.justifyContent = "center";
      r.style.flexShrink = "0";
      r.innerHTML = '<div style="width:4px;height:60px;background:var(--text-secondary,#666);border-radius:2px;"></div>';
      middle.parentNode.insertBefore(r, middle);
    }
    // middle->right resizer
    const existingRight = qs(".aijr-resizer-right");
    if (!existingRight && middle && right) {
      const r = document.createElement("div");
      r.className = "panel-resizer aijr-resizer-right";
      r.dataset.side = "right";
      r.style.width = "8px";
      r.style.cursor = "col-resize";
      r.style.background = "transparent";
      r.style.display = "flex";
      r.style.alignItems = "center";
      r.style.justifyContent = "center";
      r.style.flexShrink = "0";
      r.innerHTML = '<div style="width:4px;height:60px;background:var(--text-secondary,#666);border-radius:2px;"></div>';
      right.parentNode.insertBefore(r, right);
    }
    // Re-wire resizers
    wireResizers();
  }

  // Collapse button wiring: any element with class 'collapse-btn' will toggle nearest panel
  function wireCollapseButtons() {
    const collBtns = qsa(".collapse-btn");
    collBtns.forEach(btn => {
      // If an onclick already exists, keep it. Otherwise add generic behavior:
      if (!btn.dataset.aijrWired) {
        btn.dataset.aijrWired = "1";
        btn.addEventListener("click", (e) => {
          // Determine direction from data-attribute or text
          const dir = btn.dataset.direction || (btn.textContent.indexOf("→") >= 0 ? "right" : "left");
          // Find nearest panel (search ancestors)
          // If button located inside left header -> toggle left
          let panel;
          const leftPanel = qs("#aijr-left");
          const middlePanel = qs("#aijr-middle");
          const rightPanel = qs("#aijr-right");
          // Heuristic: if button is inside leftPanel -> toggle left, inside middle -> toggle middle, else toggle right
          if (leftPanel && leftPanel.contains(btn)) panel = leftPanel;
          else if (middlePanel && middlePanel.contains(btn)) panel = middlePanel;
          else if (rightPanel && rightPanel.contains(btn)) panel = rightPanel;
          else {
            // fallback: if direction left -> left panel, else right panel
            panel = dir === "left" ? leftPanel || middlePanel : rightPanel || middlePanel;
          }
          if (!panel) return;
          panel.classList.toggle("collapsed");
          // If collapsed, set fixed small width
          if (panel.classList.contains("collapsed")) {
            panel.style.minWidth = "50px";
            panel.style.maxWidth = "50px";
            // for left collapsed show vertical label (if any), keep accessible
          } else {
            panel.style.minWidth = "";
            panel.style.maxWidth = "";
          }
          // Save collapsed state to settings
          settings.leftCollapsed = qs("#aijr-left") ? qs("#aijr-left").classList.contains("collapsed") : false;
          settings.codeCollapsed = qs("#aijr-middle") ? qs("#aijr-middle").classList.contains("collapsed") : false;
          settings.previewCollapsed = qs("#aijr-right") ? qs("#aijr-right").classList.contains("collapsed") : false;
          saveJSON(SETTINGS_KEY, settings);
        });
      }
    });
  }

  // Make sure resize/collapse wiring runs after the DOM produced by earlier chunks is ready
  function setupUIEnhancements() {
    // apply widths initially
    if (left) left.style.width = `${leftPanelWidth}%`;
    if (middle) middle.style.width = `${codePanelWidth}%`;
    ensureResizersExist();
    wireCollapseButtons();
    // ensure iframes have title attribute for accessibility
    const ifr = qs("#aijr-right iframe") || qs("iframe[title='App Preview']");
    if (ifr && !ifr.getAttribute("title")) ifr.setAttribute("title", "App Preview");
  }

  // Keyboard small tweaks (additional)
  window.addEventListener("keydown", (e) => {
    // Ctrl+Shift+F to focus editor if exists
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
      const ed = (window.AIJR && window.AIJR.editor) ? window.AIJR.editor() : qs("#jr-editor");
      if (ed) { ed.focus(); e.preventDefault(); }
    }
  });

  // Final initialization call
  function finalInit() {
    try {
      setupUIEnhancements();
      pushLog("Final UI setup complete: resizers & collapse wired");
      // expose ready flag
      window.AIJR = window.AIJR || {};
      window.AIJR.ready = true;
      window.AIJR.applyPanelWidths = function (l, c) {
        if (typeof l === "number") leftPanelWidth = l;
        if (typeof c === "number") codePanelWidth = c;
        applyPanelWidths();
      };
      window.AIJR.stopResize = stopResize;
    } catch (err) {
      console.error("finalInit error", err);
    }
  }

  // Run final init after a small delay to allow earlier modules to render
  setTimeout(finalInit, 120);

  // Also attempt to re-run if modules load later
  window.addEventListener("load", () => setTimeout(finalInit, 200));

})();
