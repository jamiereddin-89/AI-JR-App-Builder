// app.js — Chunk 1 (lines ~1-500 of script.jsx converted to vanilla JS)
// Implements: utilities, debounce, simple settings store, log panel,
// Export/Import modal, Settings modal (theme, provider, Pollinations key save/test).
// Usage: include this script in the page after styles.css and a <div id="container"></div>.

(function () {
  // ---------- Utilities ----------
  function cn(...classes) {
    return classes.filter(Boolean).join(" ");
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") node.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) {
      if (c == null) continue;
      if (typeof c === "string" || typeof c === "number") node.appendChild(document.createTextNode(String(c)));
      else node.appendChild(c);
    }
    return node;
  }

  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

  // Debounce similar to useDebounce but as function wrapper
  function debounce(fn, ms = 300) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ---------- Simple Settings Store ----------
  const SETTINGS_KEY = "ai_jr_settings_v1";
  const defaultSettings = {
    theme: localStorage.getItem("app-theme") || "light",
    appLayout: localStorage.getItem("app-layout") || "side-by-side",
    activeProvider: localStorage.getItem("activeProvider") || "Puter",
    apiKeys: JSON.parse(localStorage.getItem("apiKeys") || "{}"),
    favoriteModels: JSON.parse(localStorage.getItem("favoriteModels") || "[]"),
  };

  function loadSettings() {
    try {
      return Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
    } catch {
      return Object.assign({}, defaultSettings);
    }
  }
  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    // also keep these quick keys in top-level storage for older code paths
    if (s.theme) localStorage.setItem("app-theme", s.theme);
    if (s.appLayout) localStorage.setItem("app-layout", s.appLayout);
    if (s.activeProvider) localStorage.setItem("activeProvider", s.activeProvider);
    if (s.apiKeys) localStorage.setItem("apiKeys", JSON.stringify(s.apiKeys));
    if (s.favoriteModels) localStorage.setItem("favoriteModels", JSON.stringify(s.favoriteModels));
  }

  let settings = loadSettings();

  // Apply theme initially
  document.body.className = `theme-${settings.theme || "light"}`;

  // ---------- Logging (LogPanel) ----------
  const logs = [];
  function pushLog(msg) {
    const time = new Date().toLocaleTimeString();
    logs.push(`${time}: ${msg}`);
    if (logs.length > 100) logs.shift();
    renderLogPanel();
  }

  // Create an area for log panel in the page (if container exists)
  const container = document.getElementById("container") || (() => {
    const node = document.createElement("div"); document.body.appendChild(node); return node;
  })();

  // Top-level header / controls container
  const header = el("div", { class: "app-header", style: { margin: "12px" } });
  container.appendChild(header);

  const headerTitle = el("h1", { style: { display: "inline-block", marginRight: "12px" } }, "JR AI App Builder (vanilla)");
  header.appendChild(headerTitle);

  const openSettingsBtn = el("button", { class: "neu-btn", onclick: () => openSettingsModal() }, "Settings");
  header.appendChild(openSettingsBtn);

  const openExportBtn = el("button", { class: "neu-btn", style: { marginLeft: "8px" }, onclick: () => openExportImportModal() }, "Export/Import");
  header.appendChild(openExportBtn);

  // Log panel root
  const leftColumn = el("div", { style: { display: "flex", gap: "12px", marginTop: "8px" } });
  container.appendChild(leftColumn);
  const logRoot = el("div", { class: "log-panel", style: { maxWidth: "360px", width: "360px" } });
  leftColumn.appendChild(logRoot);

  function renderLogPanel() {
    logRoot.innerHTML = "";
    const box = el("div", { class: "neu-inset", style: { padding: "12px", borderRadius: "12px" } });
    const title = el("div", { style: { fontWeight: 700, marginBottom: "8px" } }, "Logs");
    box.appendChild(title);
    const list = el("div", { style: { fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary, #666)", maxHeight: "300px", overflow: "auto", whiteSpace: "pre-wrap" } });
    logs.slice().reverse().forEach(l => list.appendChild(el("div", {}, l)));
    box.appendChild(list);
    logRoot.appendChild(box);
  }
  renderLogPanel();

  // ---------- Export/Import Modal ----------
  function openExportImportModal() {
    const overlay = el("div", { class: "modal-overlay", style: modalOverlayStyle(), onclick: () => closeModal(overlay) });
    const modal = el("div", { class: "modal", style: modalBoxStyle(), onclick: (e) => e.stopPropagation() });

    modal.appendChild(el("h3", { style: { marginTop: 0 } }, "📦 Export / Import"));
    const exportBtn = el("button", { class: "neu-btn", onclick: exportAllApps, style: { display: "block", width: "100%", marginBottom: "8px" } }, "📤 Export All Apps (JSON)");
    modal.appendChild(exportBtn);

    const importBtn = el("button", { class: "neu-btn", onclick: () => fileInput.click(), style: { display: "block", width: "100%", marginBottom: "8px" } }, "📥 Import Apps (JSON)");
    modal.appendChild(importBtn);

    const fileInput = el("input", { type: "file", accept: ".json", style: { display: "none" }, onchange: handleImportFile });
    modal.appendChild(fileInput);

    const closeBtn = el("button", { class: "neu-btn-black", onclick: () => closeModal(overlay), style: { display: "block", width: "100%", marginTop: "8px" } }, "Close");
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function exportAllApps() {
    const apps = JSON.parse(localStorage.getItem("jr_apps") || "[]");
    const data = JSON.stringify(apps, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `aijr-apps-export-${Date.now()}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushLog("✅ Exported apps");
  }

  async function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const imported = JSON.parse(txt);
      const arr = Array.isArray(imported) ? imported : [imported];
      // Merge into local storage apps list (basic merge)
      const current = JSON.parse(localStorage.getItem("jr_apps") || "[]");
      for (const a of arr) {
        if (!a._id) a._id = `app_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        current.unshift(a);
      }
      localStorage.setItem("jr_apps", JSON.stringify(current));
      pushLog(`✅ Imported ${arr.length} app(s)`);
      closeAllModals();
    } catch (err) {
      pushLog("❌ Import failed: " + (err.message || err));
    } finally {
      e.target.value = "";
    }
  }

  // ---------- Settings Modal (theme, provider, Pollinations key) ----------
  function openSettingsModal() {
    const overlay = el("div", { class: "modal-overlay", style: modalOverlayStyle(), onclick: () => closeModal(overlay) });
    const modal = el("div", { class: "modal", style: Object.assign({}, modalBoxStyle(), { maxWidth: "720px" }), onclick: (e) => e.stopPropagation() });

    modal.appendChild(el("h3", { style: { marginTop: 0 } }, "⚙️ Settings"));

    // Provider selector
    const providerLabel = el("div", { style: { fontWeight: 700, marginTop: "8px" } }, "Provider");
    modal.appendChild(providerLabel);
    const providerSelect = el("select", { class: "neu-inset", style: { width: "100%", padding: "8px", marginTop: "6px" }, onchange: (e) => { settings.activeProvider = e.target.value; saveSettings(settings); pushLog(`Provider set: ${e.target.value}`); } });
    ["Puter", "Pollinations", "Google", "Github", "OpenRouter", "Custom"].forEach(p => providerSelect.appendChild(el("option", { value: p }, p)));
    providerSelect.value = settings.activeProvider;
    modal.appendChild(providerSelect);

    // Theme buttons
    modal.appendChild(el("div", { style: { marginTop: "12px", fontWeight: 700 } }, "Theme"));
    const themeRow = el("div", { style: { display: "flex", gap: "8px", marginTop: "6px" } });
    const themes = ["light", "dark", "grey", "multicoloured"];
    let tempTheme = settings.theme || "light";
    themes.forEach(t => {
      const b = el("button", { class: "neu-btn", onclick: () => { tempTheme = t; document.body.className = `theme-${t}`; } }, t);
      themeRow.appendChild(b);
    });
    modal.appendChild(themeRow);

    // Pollinations key area
    modal.appendChild(el("div", { style: { marginTop: "12px", fontWeight: 700 } }, "Pollinations API Key"));
    const keyInput = el("input", { type: "text", value: settings.apiKeys?.Pollinations || "", placeholder: "Enter API key", style: { width: "100%", padding: "8px", marginTop: "6px" } });
    modal.appendChild(keyInput);
    const keyRow = el("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } });
    const saveKeyBtn = el("button", { class: "neu-btn", onclick: async () => { await handleSaveKey("Pollinations", keyInput.value.trim()); } }, "Save Key");
    const testKeyBtn = el("button", { class: "neu-btn", onclick: async () => { await testApiKey(keyInput.value.trim()); } }, "Test Key");
    keyRow.appendChild(saveKeyBtn);
    keyRow.appendChild(testKeyBtn);
    modal.appendChild(keyRow);

    // Test status
    const statusEl = el("div", { id: "settingsTestStatus", style: { marginTop: "8px", fontSize: "12px" } });
    modal.appendChild(statusEl);

    // Buttons
    const footer = el("div", { style: { display: "flex", gap: "8px", marginTop: "16px" } });
    const saveBtn = el("button", { class: "neu-btn-black", onclick: () => { settings.theme = tempTheme; saveSettings(settings); closeModal(overlay); pushLog(`Theme saved: ${tempTheme}`); } }, "Save");
    const cancelBtn = el("button", { class: "neu-btn", onclick: () => { document.body.className = `theme-${settings.theme}`; closeModal(overlay); } }, "Cancel");
    footer.appendChild(saveBtn);
    footer.appendChild(cancelBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  async function handleSaveKey(provider, key) {
    settings.apiKeys = settings.apiKeys || {};
    settings.apiKeys[provider] = key;
    saveSettings(settings);
    pushLog("Key saved!");
    // Optionally, fetch models from Pollinations if key present
    if (provider === "Pollinations" && key) {
      try {
        const res = await fetch("https://gen.pollinations.ai/text/models", { headers: { Authorization: `Bearer ${key}` } });
        if (res.ok) {
          const data = await res.json();
          // Map to simple list of model ids
          settings.pollinationsModels = (data || []).map(m => ({ id: m.name, name: m.name, description: m.description || "" }));
          saveSettings(settings);
          pushLog(`Loaded ${settings.pollinationsModels.length} Pollinations models`);
        } else {
          pushLog("Saved key but failed to fetch models (non-OK response)");
        }
      } catch (err) {
        pushLog("Saved key but failed to fetch models (" + (err.message || err) + ")");
      }
    }
    // update status text in any open settings modal
    const sEl = qs("#settingsTestStatus");
    if (sEl) sEl.textContent = "Key saved!";
  }

  async function testApiKey(key) {
    const statusEl = qs("#settingsTestStatus");
    if (!key) {
      if (statusEl) statusEl.textContent = "Enter a key first";
      return;
    }
    if (statusEl) statusEl.textContent = "Testing...";
    try {
      const res = await fetch("https://gen.pollinations.ai/text/models", { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) {
        if (statusEl) statusEl.textContent = "Invalid key or API error.";
        pushLog("Test key failed: non-OK response");
        return;
      }
      const data = await res.json();
      settings.pollinationsModels = (data || []).map(m => ({ id: m.name, name: m.name, description: m.description || "" }));
      saveSettings(settings);
      if (statusEl) statusEl.textContent = `Valid key! Found ${settings.pollinationsModels.length} models.`;
      pushLog("Valid Pollinations key; models loaded");
    } catch (err) {
      if (statusEl) statusEl.textContent = "Connection error. Check your key.";
      pushLog("Pollinations key test failed: " + (err.message || err));
    }
  }

  // ---------- Modal helpers ----------
  function modalOverlayStyle() {
    return {
      position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    };
  }
  function modalBoxStyle() {
    return {
      background: "var(--bg-color, #fff)", padding: "18px", borderRadius: "16px", minWidth: "320px", maxWidth: "640px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
    };
  }
  function closeModal(overlay) { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }
  function closeAllModals() { qsa(".modal-overlay").forEach(n => n.remove()); }

  // ---------- Init / small demo wiring ----------
  pushLog("App (chunk 1) initialized");
  // Expose a small API for subsequent chunks to extend
  window.AIJR = window.AIJR || {};
  window.AIJR.settings = settings;
  window.AIJR.pushLog = pushLog;
  window.AIJR.openSettingsModal = openSettingsModal;
  window.AIJR.openExportImportModal = openExportImportModal;
})();
