// app.bundle.js — merged bundle from chunked conversion of script.jsx
// - Single-file vanilla-JS port of the main features from script.jsx
// - Assumes styles.css is loaded and there is <div id="container"></div>
// - Exposes window.AIJR for interactive extension/testing

(function () {
  /* -------------------------
     Core utilities & storage
     ------------------------- */
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
      node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return node;
  }
  function qs(sel, root = document) { return (root || document).querySelector(sel); }
  function qsa(sel, root = document) { return Array.from((root || document).querySelectorAll(sel)); }
  function debounce(fn, ms = 300) { let t = null; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }
  function loadJSON(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
  function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function uid(prefix = "id_") { return prefix + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8); }
  function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[m]); }

  /* -------------------------
     Application state
     ------------------------- */
  const SETTINGS_KEY = "ai_jr_settings_v1";
  const defaultSettings = {
    theme: localStorage.getItem("app-theme") || "light",
    appLayout: localStorage.getItem("app-layout") || "side-by-side",
    activeProvider: localStorage.getItem("activeProvider") || "Puter",
    apiKeys: loadJSON("apiKeys", {}),
    favoriteModels: loadJSON("favoriteModels", []),
    pollinationsModels: loadJSON("pollinationsModels", []),
    leftPanelWidth: Number(localStorage.getItem("leftPanelWidth") || 25),
    codePanelWidth: Number(localStorage.getItem("codePanelWidth") || 42),
    leftCollapsed: false,
    codeCollapsed: false,
    previewCollapsed: false,
  };
  let settings = Object.assign({}, defaultSettings, loadJSON(SETTINGS_KEY, {}));
  document.body.className = `theme-${settings.theme || "light"}`;

  const APPS_KEY = "jr_apps";
  const VERSIONS_KEY = "jr_versions";
  const FILES_KEY = "jr_files";
  const AUTOSAVE_KEY = "jr_autosave_versions";

  // Initialize persistent collections if missing
  saveJSON(APPS_KEY, loadJSON(APPS_KEY, []));
  saveJSON(VERSIONS_KEY, loadJSON(VERSIONS_KEY, []));
  saveJSON(FILES_KEY, loadJSON(FILES_KEY, [{ name: "index.html", content: "<!doctype html>\n<html>\n<head>\n<meta charset='utf-8'>\n<title>New App</title>\n</head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>" }]));

  // Simple logging
  const logs = [];
  function pushLog(msg) {
    const t = new Date().toLocaleTimeString();
    logs.push(`${t}: ${msg}`);
    if (logs.length > 200) logs.shift();
    renderLogPanel();
    console.log(`[AI-JR] ${t} ${msg}`);
  }

  // Expose API container
  window.AIJR = window.AIJR || {};
  window.AIJR.settings = settings;
  window.AIJR.pushLog = pushLog;

  /* -------------------------
     UI skeleton: header & container
     ------------------------- */
  const container = document.getElementById("container") || (function create() { const d = el("div", { id: "container" }); document.body.prepend(d); return d; })();
  container.innerHTML = ""; // start clean

  // Header: title + controls
  const header = el("div", { class: "app-header", style: { margin: "12px" } });
  const title = el("h1", { style: { display: "inline-block", marginRight: "12px" } }, "JR AI Coder (vanilla)");
  header.appendChild(title);

  const settingsBtn = el("button", { class: "neu-btn", onclick: () => openSettingsModal() }, "Settings");
  header.appendChild(settingsBtn);
  const exportBtn = el("button", { class: "neu-btn", style: { marginLeft: "8px" }, onclick: () => openExportImportModal() }, "Export/Import");
  header.appendChild(exportBtn);

  // Usage placeholder inserted later by left-panel builder
  container.appendChild(header);

  // Two-column: left column for logs + main area below
  const topRow = el("div", { style: { display: "flex", gap: "12px", marginTop: "8px" } });
  container.appendChild(topRow);
  // Log panel on left
  const logRoot = el("div", { class: "log-panel", style: { maxWidth: "360px", width: "360px" } });
  topRow.appendChild(logRoot);

  // main area (panels)
  const mainWrap = el("div", { id: "aijr-main", style: { display: "flex", gap: "12px", padding: "12px" } });
  container.appendChild(mainWrap);

  // Left / Middle / Right
  const leftPanel = el("div", { id: "aijr-left", style: { width: `${settings.leftPanelWidth}%`, minWidth: "200px", flexShrink: "0" } });
  const middlePanel = el("div", { id: "aijr-middle", style: { flex: "1 1 auto", minWidth: "300px" } });
  const rightPanel = el("div", { id: "aijr-right", style: { width: `${settings.codePanelWidth}%`, minWidth: "240px", flexShrink: "0" } });
  mainWrap.appendChild(leftPanel);
  mainWrap.appendChild(middlePanel);
  mainWrap.appendChild(rightPanel);

  /* -------------------------
     Render log panel
     ------------------------- */
  function renderLogPanel() {
    logRoot.innerHTML = "";
    const box = el("div", { class: "neu-inset", style: { padding: "12px", borderRadius: "12px" } });
    box.appendChild(el("div", { style: { fontWeight: 700, marginBottom: "8px" } }, "Logs"));
    const list = el("div", { style: { fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary,#666)", maxHeight: "300px", overflow: "auto", whiteSpace: "pre-wrap" } });
    logs.slice().reverse().forEach(l => list.appendChild(el("div", {}, l)));
    box.appendChild(list);
    logRoot.appendChild(box);
  }
  renderLogPanel();

  /* -------------------------
     Modals: export/import & settings
     ------------------------- */
  function modalOverlayStyleObj() {
    return { position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
  }
  function modalBoxStyleObj() {
    return { background: "var(--bg-color,#fff)", padding: "18px", borderRadius: "16px", minWidth: "320px", maxWidth: "720px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" };
  }
  function openExportImportModal() {
    const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() });
    Object.assign(overlay.style, modalOverlayStyleObj());
    const box = el("div", { class: "modal-box", onclick: e => e.stopPropagation() });
    Object.assign(box.style, modalBoxStyleObj());
    box.appendChild(el("h3", { style: { marginTop: 0 } }, "📦 Export / Import"));
    const exportBtn = el("button", { class: "neu-btn", onclick: exportAllApps, style: { display: "block", width: "100%", marginBottom: "8px" } }, "📤 Export All Apps (JSON)");
    box.appendChild(exportBtn);
    const importBtn = el("button", { class: "neu-btn", onclick: () => fileInput.click(), style: { display: "block", width: "100%", marginBottom: "8px" } }, "📥 Import Apps (JSON)");
    box.appendChild(importBtn);
    const fileInput = el("input", { type: "file", accept: ".json", style: { display: "none" }, onchange: handleImportFile });
    box.appendChild(fileInput);
    const closeBtn = el("button", { class: "neu-btn-black", onclick: () => overlay.remove(), style: { width: "100%", marginTop: "8px" } }, "Close");
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
  function exportAllApps() {
    const apps = loadJSON(APPS_KEY, []);
    const blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `aijr-apps-export-${Date.now()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
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
      const current = loadJSON(APPS_KEY, []);
      for (const a of arr) { if (!a._id) a._id = uid("app_"); current.unshift(a); }
      saveJSON(APPS_KEY, current);
      pushLog(`✅ Imported ${arr.length} app(s)`);
      // Refresh lists if displayed
      if (window.AIJR.renderAppsList) window.AIJR.renderAppsList();
      document.querySelectorAll(".modal-overlay").forEach(m => m.remove());
    } catch (err) {
      pushLog("❌ Import failed: " + (err.message || err));
    } finally { e.target.value = ""; }
  }

  function openSettingsModal() {
    const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() });
    Object.assign(overlay.style, modalOverlayStyleObj());
    const box = el("div", { class: "modal-box", onclick: e => e.stopPropagation() });
    Object.assign(box.style, modalBoxStyleObj());

    box.appendChild(el("h3", { style: { marginTop: 0 } }, "⚙️ Settings"));

    // Provider
    box.appendChild(el("div", { style: { fontWeight: 700, marginTop: "8px" } }, "Provider"));
    const providerSelect = el("select", { style: { width: "100%", padding: "8px", marginTop: "6px" }, onchange: e => { settings.activeProvider = e.target.value; saveJSON(SETTINGS_KEY, settings); pushLog(`Provider set: ${e.target.value}`); } });
    ["Puter", "Pollinations", "Google", "Github", "OpenRouter", "Custom"].forEach(p => providerSelect.appendChild(el("option", { value: p }, p)));
    providerSelect.value = settings.activeProvider;
    box.appendChild(providerSelect);

    // Theme
    box.appendChild(el("div", { style: { marginTop: "12px", fontWeight: 700 } }, "Theme"));
    const themeRow = el("div", { style: { display: "flex", gap: "8px", marginTop: "6px" } });
    ["light", "dark", "grey", "multicoloured"].forEach(t => {
      themeRow.appendChild(el("button", { class: "neu-btn", onclick: () => { settings.theme = t; document.body.className = `theme-${t}`; saveJSON(SETTINGS_KEY, settings); pushLog(`Theme set: ${t}`); } }, t));
    });
    box.appendChild(themeRow);

    // Pollinations key
    box.appendChild(el("div", { style: { marginTop: "12px", fontWeight: 700 } }, "Pollinations API Key"));
    const keyInput = el("input", { type: "text", value: settings.apiKeys?.Pollinations || "", placeholder: "Enter API key", style: { width: "100%", padding: "8px", marginTop: "6px" } });
    box.appendChild(keyInput);
    const keyRow = el("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } },
      el("button", { class: "neu-btn", onclick: async () => { settings.apiKeys = settings.apiKeys || {}; settings.apiKeys.Pollinations = keyInput.value.trim(); saveJSON(SETTINGS_KEY, settings); pushLog("Saved Pollinations key"); } }, "Save Key"),
      el("button", { class: "neu-btn", onclick: async () => { await testPollinationsKey(keyInput.value.trim()); } }, "Test Key")
    );
    box.appendChild(keyRow);
    const statusEl = el("div", { id: "settingsTestStatus", style: { marginTop: "8px", fontSize: "12px" } });
    box.appendChild(statusEl);

    box.appendChild(el("div", { style: { display: "flex", gap: "8px", marginTop: "16px" } },
      el("button", { class: "neu-btn-black", onclick: () => { saveJSON(SETTINGS_KEY, settings); overlay.remove(); pushLog("Settings saved"); } }, "Save"),
      el("button", { class: "neu-btn", onclick: () => overlay.remove() }, "Cancel")
    ));

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  async function testPollinationsKey(key) {
    const statusEl = qs("#settingsTestStatus");
    if (!key) { if (statusEl) statusEl.textContent = "Enter a key first"; return; }
    if (statusEl) statusEl.textContent = "Testing...";
    try {
      const res = await fetch("https://gen.pollinations.ai/text/models", { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) { if (statusEl) statusEl.textContent = "Invalid key or API error."; pushLog("Test key failed"); return; }
      const data = await res.json();
      settings.pollinationsModels = (data || []).map(m => ({ id: m.name, name: m.name, description: m.description || "" }));
      saveJSON(SETTINGS_KEY, settings);
      if (statusEl) statusEl.textContent = `Valid key! Found ${settings.pollinationsModels.length} models.`;
      pushLog("Valid Pollinations key; models loaded");
    } catch (err) {
      if (statusEl) statusEl.textContent = "Connection error. Check your key.";
      pushLog("Pollinations key test failed: " + (err.message || err));
    }
  }

  /* -------------------------
     Templates, New File, Usage Bar
     ------------------------- */
  const templates = [
    { id: "todo", name: "Todo App", icon: "✅", prompt: "A todo app with localStorage, add/edit/delete todos, simple UI." },
    { id: "notes", name: "Notes App", icon: "📝", prompt: "Notes with markdown preview and autosave to localStorage." },
    { id: "ai-chat", name: "AI Chat", icon: "🤖", prompt: "A chat UI that sends messages to an AI and displays responses." },
    { id: "timer", name: "Pomodoro Timer", icon: "⏱️", prompt: "Pomodoro timer with configurable intervals and notifications." },
  ];
  window.AIJR.templates = templates;

  function openTemplatesModal() {
    const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() }); Object.assign(overlay.style, modalOverlayStyleObj());
    const box = el("div", { class: "neu-box", onclick: e => e.stopPropagation() }); Object.assign(box.style, modalBoxStyleObj());
    box.appendChild(el("h3", { style: { marginTop: 0 } }, "🎨 App Templates"));
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "12px" } });
    templates.forEach(t => {
      const card = el("button", { class: "template-card", onclick: () => { applyTemplate(t); overlay.remove(); } });
      card.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px;border-radius:12px;background:var(--bg-secondary,#f7f7f7);border:1px solid var(--border-color,#ddd);text-align:left";
      card.appendChild(el("div", { style: { fontSize: "24px" } }, t.icon));
      card.appendChild(el("div", { style: { fontWeight: 800 } }, t.name));
      card.appendChild(el("div", { style: { color: "var(--text-secondary,#666)", fontSize: "12px" } }, t.prompt));
      grid.appendChild(card);
    });
    box.appendChild(grid);
    box.appendChild(el("div", { style: { marginTop: "12px" } }, el("button", { class: "neu-btn-black", onclick: () => overlay.remove() }, "Close")));
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
  function applyTemplate(tpl) {
    const promptEl = qs("textarea[placeholder*='Describe your app']") || qs("textarea");
    if (promptEl) { promptEl.value = tpl.prompt; promptEl.dispatchEvent(new Event("input", { bubbles: true })); pushLog(`Template applied: ${tpl.name}`); }
    else { window.AIJR.pendingTemplate = tpl; pushLog(`Template saved: ${tpl.name}`); }
  }

  function openNewFileModal() {
    const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() }); Object.assign(overlay.style, modalOverlayStyleObj());
    const box = el("div", { class: "neu-box", onclick: e => e.stopPropagation() }); Object.assign(box.style, modalBoxStyleObj());
    box.appendChild(el("h3", { style: { marginTop: 0 } }, "Create New File"));
    const input = el("input", { placeholder: "e.g., styles.css, script.js", style: { width: "100%", padding: "8px", marginTop: "8px" } });
    box.appendChild(input);
    const row = el("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
      el("button", { class: "neu-btn", onclick: () => overlay.remove() }, "Cancel"),
      el("button", { class: "neu-btn-black", onclick: () => { createNewFile(input.value.trim()); overlay.remove(); } }, "Create")
    );
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 40);
  }
  function createNewFile(name) {
    if (!name) { pushLog("No filename supplied"); return; }
    const files = loadJSON(FILES_KEY, []);
    if (files.some(f => f.name.toLowerCase() === name.toLowerCase())) { pushLog(`File "${name}" already exists`); return; }
    files.push({ name, content: "" }); saveJSON(FILES_KEY, files);
    window.AIJR.files = files;
    if (window.AIJR.onFilesChanged) window.AIJR.onFilesChanged(files);
    pushLog(`Created file ${name}`);
  }

  function createUsageBar({ slim = false, onRefresh = null } = {}) {
    const wrap = el("div", { style: { display: "flex", alignItems: "center", gap: "8px" } });
    const left = el("div", { style: { minWidth: "60px", fontSize: "12px", color: "var(--text-secondary,#666)" } }, "0M");
    const barWrap = el("div", { style: { flex: "1", height: slim ? "8px" : "18px", background: "var(--bg-secondary,#eee)", borderRadius: "12px", position: "relative", overflow: "hidden" } });
    const fill = el("div", { style: { width: "20%", height: "100%", background: "var(--accent-color,#0010d9)", transition: "width 600ms ease" } });
    barWrap.appendChild(fill);
    const right = el("div", { style: { minWidth: "60px", fontSize: "12px", color: "var(--text-secondary,#666)", textAlign: "right" } }, "0M");
    const refresh = el("button", { class: "neu-btn", onclick: async () => { await refreshUsage(); if (onRefresh) onRefresh(); } }, "⟳");
    wrap.appendChild(left); wrap.appendChild(barWrap); wrap.appendChild(right); wrap.appendChild(refresh);

    async function refreshUsage() {
      pushLog("Refreshing usage (mock)...");
      if (window.puter && window.puter.auth && typeof window.puter.auth.getMonthlyUsage === "function") {
        try {
          const u = await window.puter.auth.getMonthlyUsage();
          const allowance = u?.allowanceInfo?.monthUsageAllowance || 1000000;
          const remaining = u?.allowanceInfo?.remaining || allowance * 0.6;
          const used = allowance - remaining;
          const pct = Math.min(100, Math.round((used / allowance) * 100));
          fill.style.width = pct + "%"; left.textContent = `${(used / 1e6).toFixed(2)}M`; right.textContent = `${(allowance / 1e6).toFixed(2)}M`;
          pushLog("Usage updated from Puter");
        } catch (err) { pushLog("Usage fetch failed: " + (err.message || err)); }
      } else {
        const pct = Math.floor(Math.random() * 70) + 10; fill.style.width = pct + "%"; left.textContent = `${(pct / 100 * 5).toFixed(2)}M`; right.textContent = `5.00M`;
        pushLog("Usage updated (mock)");
      }
    }
    return { node: wrap, refreshUsage };
  }

  /* -------------------------
     Left panel: Create / Apps
     ------------------------- */
  function buildLeftPanel() {
    leftPanel.innerHTML = "";
    // header with tabs
    const header = el("div", { style: { display: "flex", gap: "8px", alignItems: "center" } });
    const tabs = el("div", { style: { display: "flex", gap: "6px", flex: "1" } });
    const btnCreate = el("button", { class: "neu-btn", onclick: () => switchLeftTab("create") }, "🔨 Create");
    const btnApps = el("button", { class: "neu-btn", onclick: () => switchLeftTab("apps") }, "📱 Apps");
    tabs.appendChild(btnCreate); tabs.appendChild(btnApps);
    header.appendChild(tabs);
    const collapse = el("button", { class: "collapse-btn", onclick: () => { leftPanel.classList.toggle("collapsed"); } }, "←");
    header.appendChild(collapse);
    leftPanel.appendChild(header);

    // body
    const body = el("div", { id: "left-body", style: { marginTop: "12px" } });
    leftPanel.appendChild(body);

    // Build default tab
    switchLeftTab.current = "create";
    switchLeftTab("create");

    // Add usage bar to header area (small slim variant)
    const usage = createUsageBar({ slim: true, onRefresh: () => pushLog("Usage refreshed") });
    header.appendChild(usage.node);
    usage.refreshUsage();
  }

  function switchLeftTab(tab) {
    const body = qs("#left-body");
    if (!body) return;
    body.innerHTML = "";
    if (tab === "create") {
      body.appendChild(el("button", { class: "neu-btn", onclick: () => openTemplatesModal() }, "🎨 Choose Template"));
      body.appendChild(el("div", { style: { marginTop: "10px", fontWeight: 700 } }, `Model (${settings.activeProvider})`));
      body.appendChild(el("select", { style: { width: "100%", padding: "8px", marginTop: "6px" } }, el("option", { value: "default" }, "default-model")));
      const ta = el("textarea", { placeholder: "Describe your app in detail...", style: { width: "100%", height: "90px", marginTop: "8px", padding: "8px" } });
      if (window.AIJR.pendingTemplate) ta.value = window.AIJR.pendingTemplate.prompt;
      body.appendChild(ta);
      const grid = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" } });
      const nameInput = el("input", { placeholder: "my-app", style: { padding: "8px" } });
      const titleInput = el("input", { placeholder: "My App", style: { padding: "8px" } });
      grid.appendChild(nameInput); grid.appendChild(titleInput);
      body.appendChild(grid);
      const footer = el("div", { style: { display: "flex", justifyContent: "space-between", marginTop: "12px", gap: "8px" } },
        el("button", { class: "neu-btn", onclick: () => { ta.value = ""; nameInput.value = ""; titleInput.value = ""; pushLog("New build form cleared"); } }, "🆕 New"),
        el("button", { class: "neu-btn-red", onclick: async () => {
          const prompt = ta.value.trim(); if (!prompt) { pushLog("Enter a description before generating"); return; }
          // perform generation (uses window.AIJR.buildAndDeploy if present)
          if (window.AIJR && window.AIJR.buildAndDeploy) {
            try {
              await window.AIJR.buildAndDeploy({ prompt, appName: nameInput.value.trim(), appTitle: titleInput.value.trim(), model: settings.model, provider: settings.activeProvider, pollKey: settings.apiKeys?.Pollinations || "" });
              pushLog("Generation complete");
              if (window.AIJR.renderAppsList) window.AIJR.renderAppsList();
            } catch (err) { pushLog("Generation error: " + (err.message || err)); }
          } else {
            // fallback local save
            const apps = loadJSON(APPS_KEY, []);
            const app = { _id: uid("app_"), appName: nameInput.value.trim() || `app_${Date.now()}`, appTitle: titleInput.value.trim() || prompt.slice(0,50), prompt, code: "<!doctype html><html><body><h1>Generated App (fallback)</h1></body></html>", createdAt: Date.now(), version: 1, views: 0, favorite: false };
            apps.unshift(app); saveJSON(APPS_KEY, apps); pushLog("Saved generated app (fallback)");
            if (window.AIJR.renderAppsList) window.AIJR.renderAppsList();
          }
        } }, "🚀 Create & Deploy")
      );
      body.appendChild(footer);
    } else { // apps
      const search = el("input", { id: "appsSearchInput", placeholder: "Search apps...", style: { width: "100%", padding: "8px" }, oninput: debounce((e) => { if (window.AIJR.renderAppsList) window.AIJR.renderAppsList(e.target.value.trim()); }, 250) });
      body.appendChild(search);
      const actions = el("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } },
        el("button", { class: "neu-btn", onclick: () => { pushLog("Toggled favorites (stub)"); } }, "⭐ Favorites"),
        el("button", { class: "neu-btn", onclick: () => { pushLog("Toggled bulk (stub)"); } }, "☑️ Select")
      );
      body.appendChild(actions);
      body.appendChild(el("div", { id: "apps-list", style: { marginTop: "12px", maxHeight: "360px", overflow: "auto" } }));
      if (window.AIJR.renderAppsList) window.AIJR.renderAppsList();
    }
    switchLeftTab.current = tab;
  }

  // expose left-panel builder to global for external refresh
  window.AIJR.buildLeftPanel = buildLeftPanel;
  buildLeftPanel(); // initialize left panel

  /* -------------------------
     Editor area (middle panel)
     ------------------------- */
  let files = loadJSON(FILES_KEY, [{ name: "index.html", content: "<!doctype html>\n<html>\n<head>\n<meta charset='utf-8'>\n<title>New App</title>\n</head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>" }]);
  window.AIJR.files = files;
  let activeFile = files[0].name;
  let editorEl = null;

  function buildEditor() {
    middlePanel.innerHTML = "";
    const wrapper = el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });

    // header: file tabs + buttons
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } });
    const tabs = el("div", { id: "editor-file-tabs", style: { display: "flex", gap: "6px", overflowX: "auto" } });
    header.appendChild(tabs);

    const utils = el("div", { style: { display: "flex", gap: "6px", alignItems: "center" } },
      el("button", { class: "neu-btn", onclick: () => { navigator.clipboard.writeText(editorEl.value); pushLog("Code copied"); } }, "📋"),
      el("button", { class: "neu-btn", onclick: () => { editorEl.value = formatCodeByType(editorEl.value, activeFile); pushLog("Formatted code"); scheduleAutosave(); renderCharCount(); } }, "✨"),
      el("button", { class: "neu-btn-black", onclick: () => saveActiveFileAsApp() }, "💾 Save as App")
    );
    header.appendChild(utils);
    wrapper.appendChild(header);

    // editor area
    const editorWrap = el("div", { style: { background: "white", border: "1px solid var(--border-color,#d1d1d1)", borderRadius: "12px", height: "520px", position: "relative" } });
    editorEl = el("textarea", { id: "jr-editor", style: { width: "100%", height: "100%", padding: "12px", boxSizing: "border-box", fontFamily: "monospace", fontSize: "13px", border: "0", outline: "0", resize: "none" } });
    editorWrap.appendChild(editorEl);
    const charCount = el("div", { id: "jr-charcount", style: { position: "absolute", right: "8px", bottom: "8px", fontSize: "12px", color: "var(--text-secondary,#666)" } }, "0 chars");
    editorWrap.appendChild(charCount);
    wrapper.appendChild(editorWrap);
    middlePanel.appendChild(wrapper);

    renderFileTabs();
    editorEl.value = getActiveFileContent();
    renderCharCount();

    editorEl.addEventListener("input", () => {
      files = files.map(f => f.name === activeFile ? { ...f, content: editorEl.value } : f);
      saveJSON(FILES_KEY, files);
      window.AIJR.files = files;
      renderCharCount();
      scheduleAutosave();
    });
  }

  function renderFileTabs() {
    const tabs = qs("#editor-file-tabs");
    if (!tabs) return;
    tabs.innerHTML = "";
    files.forEach(f => {
      const tab = el("div", { style: { position: "relative" } },
        el("button", { class: activeFile === f.name ? "neu-inset" : "neu-btn", onclick: () => switchFile(f.name), style: { whiteSpace: "nowrap", paddingRight: "22px" } }, f.name)
      );
      if (files.length > 1) {
        const del = el("button", { style: { position: "absolute", right: "2px", top: "2px", width: "18px", height: "18px", borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer" }, onclick: (e) => { e.stopPropagation(); deleteFile(f.name); } }, "×");
        tab.appendChild(del);
      }
      tabs.appendChild(tab);
    });
    const addBtn = el("button", { class: "neu-btn", onclick: () => openNewFileModal() }, "＋");
    tabs.appendChild(addBtn);
  }

  function switchFile(name) { activeFile = name; const f = files.find(x => x.name === name); if (f && editorEl) editorEl.value = f.content || ""; renderFileTabs(); renderCharCount(); }
  function getActiveFileContent() { const f = files.find(x => x.name === activeFile); return f ? f.content || "" : ""; }
  function deleteFile(name) { if (files.length <= 1) { pushLog("Cannot delete last file"); return; } files = files.filter(f => f.name !== name); saveJSON(FILES_KEY, files); if (activeFile === name) activeFile = files[0]?.name || "index.html"; if (window.AIJR.onFilesChanged) window.AIJR.onFilesChanged(files); renderFileTabs(); if (editorEl) editorEl.value = getActiveFileContent(); }
  function renderCharCount() { const cc = qs("#jr-charcount"); if (cc) cc.textContent = `${(editorEl ? editorEl.value : getActiveFileContent() || "").length} chars`; }

  // Simple formatting helpers
  function formatHtml(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      function walk(node, depth = 0) {
        const pad = "  ".repeat(depth);
        if (node.nodeType === Node.TEXT_NODE) { const t = node.textContent.trim(); if (!t) return ""; return pad + t + "\n"; }
        if (node.nodeType === Node.ELEMENT_NODE) {
          let s = pad + `<${node.tagName.toLowerCase()}`; for (const attr of node.attributes) s += ` ${attr.name}="${attr.value}"`; s += ">\n";
          for (const child of node.childNodes) s += walk(child, depth + 1);
          s += pad + `</${node.tagName.toLowerCase()}>\n`; return s;
        } return "";
      }
      let out = "<!doctype html>\n<html>\n";
      out += walk(doc.head, 1);
      out += walk(doc.body, 1);
      out += "</html>\n";
      return out;
    } catch { return html.replace(/>\s*</g, ">\n<"); }
  }
  function formatJs(js) { return js.replace(/\s+/g, " ").replace(/;\s*/g, ";\n").replace(/\{\s*/g, "{\n").replace(/\}\s*/g, "\n}\n"); }
  function formatCss(css) { return css.replace(/\s+/g, " ").replace(/\{\s*/g, " {\n").replace(/\}\s*/g, "\n}\n").replace(/;\s*/g, ";\n"); }
  function formatCodeByType(code, filename = "") {
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "html" || code.includes("<!doctype") || code.includes("<html")) return formatHtml(code);
    if (ext === "js") return formatJs(code);
    if (ext === "css") return formatCss(code);
    return formatHtml(code);
  }

  // Autosave (per-file snapshots)
  let autosaveTimer = null;
  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      const content = editorEl ? editorEl.value : getActiveFileContent();
      const map = loadJSON(AUTOSAVE_KEY, {});
      map[activeFile] = map[activeFile] || [];
      map[activeFile].unshift({ createdAt: Date.now(), content });
      if (map[activeFile].length > 40) map[activeFile].pop();
      saveJSON(AUTOSAVE_KEY, map);
      pushLog(`Autosaved ${activeFile}`);
      // If file corresponds to an app, record a version
      const apps = loadJSON(APPS_KEY, []);
      const app = apps.find(a => (a.appName && `${a.appName}.html`) === activeFile || a._id === activeFile);
      if (app) {
        const versions = loadJSON(VERSIONS_KEY, []); const vnum = (app.version || 0) + 1;
        versions.unshift({ _id: uid("ver_"), type: "version", appId: app._id, code: content, version: vnum, createdAt: Date.now(), note: "Autosave" });
        saveJSON(VERSIONS_KEY, versions);
        app.version = vnum; const idx = apps.findIndex(a => a._id === app._id); apps[idx] = app; saveJSON(APPS_KEY, apps);
        pushLog(`Saved version ${vnum} for ${app.appName}`);
      }
    }, 4000);
  }

  function saveActiveFileAsApp() {
    const content = editorEl ? editorEl.value : getActiveFileContent();
    const apps = loadJSON(APPS_KEY, []);
    const appDoc = { _id: uid("app_"), appName: activeFile.replace(/\.[^.]+$/, ""), appTitle: activeFile.replace(/\.[^.]+$/, ""), prompt: "Saved from editor", code: content, createdAt: Date.now(), version: 1, views: 0, favorite: false };
    apps.unshift(appDoc); saveJSON(APPS_KEY, apps);
    pushLog(`Saved ${activeFile} as app ${appDoc.appName}`);
    if (window.AIJR.renderAppsList) window.AIJR.renderAppsList();
  }

  function openVersionsModal() {
    const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() }); Object.assign(overlay.style, modalOverlayStyleObj());
    const box = el("div", { class: "neu-box", onclick: e => e.stopPropagation() }); Object.assign(box.style, modalBoxStyleObj());
    box.appendChild(el("h3", { style: { marginTop: 0 } }, "📚 Versions"));
    const map = loadJSON(AUTOSAVE_KEY, {}); const snapshots = map[activeFile] || [];
    if (!snapshots.length) box.appendChild(el("div", { style: { color: "var(--text-secondary,#666)" } }, "No snapshots found"));
    else snapshots.forEach((s, idx) => {
      const row = el("div", { class: "neu-inset", style: { padding: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" } },
        el("div", {}, el("div", { style: { fontWeight: 700 } }, `Snapshot ${idx+1}`), el("div", { style: { fontSize: "12px", color: "var(--text-secondary,#666)" } }, new Date(s.createdAt).toLocaleString())),
        el("div", {}, el("button", { class: "neu-btn", onclick: () => { if (editorEl) editorEl.value = s.content; editorEl && editorEl.dispatchEvent(new Event("input")); pushLog("Restored snapshot"); overlay.remove(); } }, "Restore"))
      );
      box.appendChild(row);
    });
    box.appendChild(el("div", { style: { marginTop: "12px" } }, el("button", { class: "neu-btn-black", onclick: () => overlay.remove() }, "Close")));
    overlay.appendChild(box); document.body.appendChild(overlay);
  }

  // Initialize editor UI
  buildEditor();
  window.AIJR.editor = () => editorEl;
  window.AIJR.onFilesChanged = (nf) => { files = nf || files; if (!files.find(f => f.name === activeFile)) activeFile = files[0]?.name || "index.html"; saveJSON(FILES_KEY, files); renderFileTabs(); if (editorEl) editorEl.value = getActiveFileContent(); };

  /* -------------------------
     Provider SDK & model helpers (Puter & Pollinations)
     ------------------------- */
  async function initPuterSDK() {
    if (window.puter) { pushLog("Puter already available"); return window.puter; }
    const existing = document.querySelector('script[src="https://js.puter.com/v2/"]');
    if (existing) { return new Promise(res => existing.addEventListener("load", () => { pushLog("Puter loaded (existing)"); res(window.puter); })); }
    return new Promise((resolve) => {
      const s = document.createElement("script"); s.src = "https://js.puter.com/v2/"; s.onload = () => { pushLog("Puter SDK loaded"); resolve(window.puter); }; s.onerror = () => { pushLog("Failed to load Puter SDK"); resolve(null); }; document.body.appendChild(s);
    });
  }

  async function fetchPuterModels() {
    try {
      const res = await fetch("https://api.puter.com/puterai/chat/models/");
      const data = await res.json();
      const list = (Array.isArray(data) ? data : (data.models || [])).map(m => (typeof m === "string" ? { id: m } : m));
      pushLog(`Fetched ${list.length} Puter models`);
      return list;
    } catch (err) { pushLog("Failed to fetch Puter models: " + (err.message || err)); return []; }
  }

  async function fetchPollinationsModels() {
    try {
      const res = await fetch("https://gen.pollinations.ai/text/models");
      const data = await res.json();
      const list = (data || []).map(m => ({ id: m.name, name: m.name, description: m.description || "" }));
      settings.pollinationsModels = list; saveJSON(SETTINGS_KEY, settings);
      pushLog(`Fetched ${list.length} Pollinations models`);
      return list;
    } catch (err) { pushLog("Failed to fetch Pollinations models: " + (err.message || err)); return []; }
  }

  async function* aiChatWithPuterStreaming(messages = [], opts = {}) {
    if (!window.puter) await initPuterSDK();
    if (!window.puter || !window.puter.ai) throw new Error("Puter SDK not available");
    try {
      const stream = await window.puter.ai.chat(messages, Object.assign({}, opts, { stream: true }));
      if (stream && typeof stream[Symbol.asyncIterator] === "function") for await (const part of stream) yield part;
      else if (stream && typeof stream[Symbol.iterator] === "function") for (const part of stream) yield part;
      else yield stream;
    } catch (err) {
      try { const resp = await window.puter.ai.chat(messages, Object.assign({}, opts, { stream: false })); yield resp; } catch (e) { throw e; }
    }
  }

  async function generateWithPollinations(systemPlusUser, model = "", apiKey = "") {
    try {
      const urlSafe = encodeURIComponent(systemPlusUser);
      const url = `https://gen.pollinations.ai/text/${urlSafe}?model=${encodeURIComponent(model || "")}&json=true`;
      const res = await fetch(url, { method: "GET", headers: { Accept: "*/*", Authorization: apiKey ? `Bearer ${apiKey}` : "" } });
      if (!res.ok) { const txt = await res.text(); throw new Error(`Pollinations API error ${res.status}: ${txt}`); }
      const text = await res.text();
      try { const data = JSON.parse(text); return data?.choices?.[0]?.message?.content || data?.content || String(data); } catch { return text; }
    } catch (err) { pushLog("Pollinations generation error: " + (err.message || err)); throw err; }
  }

  async function generateFromProvider({ systemPrompt, userPrompt, provider = settings.activeProvider, model = "", pollKey = "" }, onChunk = null) {
    const combined = `${systemPrompt}\n\n${userPrompt}`;
    if (provider === "Puter") {
      try {
        const gen = aiChatWithPuterStreaming([{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], { model, stream: true });
        for await (const part of gen) {
          const text = part?.text || part?.choices?.[0]?.message?.content || (typeof part === "string" ? part : "");
          if (onChunk) onChunk(text);
        }
        return;
      } catch (err) {
        pushLog("Puter streaming failed: " + (err.message || err));
      }
    }
    if (provider === "Pollinations") {
      const txt = await generateWithPollinations(combined, model, pollKey || settings.apiKeys?.Pollinations || "");
      if (onChunk) onChunk(txt);
      return;
    }
    if (onChunk) onChunk(`<!doctype html><html><body><h1>Fallback Generated App</h1><p>${userPrompt.slice(0,200)}</p></body></html>`);
  }

  // Expose provider helpers
  window.AIJR.initPuterSDK = initPuterSDK;
  window.AIJR.fetchPuterModels = fetchPuterModels;
  window.AIJR.fetchPollinationsModels = fetchPollinationsModels;
  window.AIJR.generateFromProvider = generateFromProvider;
  window.AIJR.generateWithPollinations = generateWithPollinations;

  /* -------------------------
     Build & Deploy, versioning, CRUD
     ------------------------- */
  function saveAppDoc(app) {
    const apps = loadJSON(APPS_KEY, []); const idx = apps.findIndex(a => a._id === app._id);
    if (idx >= 0) apps[idx] = app; else apps.unshift(app);
    saveJSON(APPS_KEY, apps);
    if (window.AIJR.renderAppsList) window.AIJR.renderAppsList();
  }

  async function buildAndDeploy({ prompt, appName, appTitle, model = "", provider = settings.activeProvider, pollKey = "" } = {}) {
    if (!prompt || !prompt.trim()) { pushLog("No prompt provided"); return null; }
    pushLog("Starting generation...");
    const systemPrompt = `You are an expert web developer. Create a COMPLETE single HTML file app.
RULES:
- Start with <!DOCTYPE html>
- ALL CSS in <style> tag, ALL JS in <script> tag
- Modern CSS: variables, flexbox/grid, animations, gradients
- Modern JS: ES6+, localStorage, event handling
- Responsive and polished UI
- NO external dependencies
- Return ONLY HTML code`;
    let generated = "";
    try {
      await generateFromProvider({ systemPrompt, userPrompt: prompt, provider, model, pollKey }, (chunk) => { generated += (chunk || ""); if (editorEl) editorEl.value = generated; });
      generated = generated.replace(/```html?\n?/gi, "").replace(/```\n?/g, "").trim(); const start = generated.search(/<!doctype\s+html>/i);
      if (start > 0) generated = generated.slice(start);
      if (!/<!doctype\s+html>/i.test(generated)) { generated = `<!doctype html>\n<html><body><pre>${escapeHtml(generated)}</pre></body></html>`; }

      // attempt Puter hosting if available (best-effort)
      let hostedUrl = null; let previewBlobUrl = null;
      if (window.puter && window.puter.fs && window.puter.hosting) {
        try { const dir = `app_${Date.now()}`; window.puter.fs.mkdir && await window.puter.fs.mkdir(dir); window.puter.fs.write && await window.puter.fs.write(`${dir}/index.html`, generated); try { const site = await window.puter.hosting.create(appName || undefined, dir); hostedUrl = `https://${site.subdomain}.puter.site`; pushLog("Hosted on Puter: " + hostedUrl); } catch (e) { pushLog("Hosting create failed: " + (e.message || e)); } } catch (e) { pushLog("Puter FS error: " + (e.message || e)); }
      }
      if (!hostedUrl) { const blob = new Blob([generated], { type: "text/html" }); previewBlobUrl = URL.createObjectURL(blob); pushLog("Created preview blob"); }

      const app = { _id: uid("app_"), type: "app", prompt, code: generated, appName: (appName && appName.trim()) || `app_${Date.now().toString(36)}`, appTitle: (appTitle && appTitle.trim()) || prompt.slice(0,50), model, dir: null, createdAt: Date.now(), updatedAt: Date.now(), version: 1, hostedUrl, previewBlobUrl, views: 0, favorite: false, tags: [] };
      saveAppDoc(app);
      const versions = loadJSON(VERSIONS_KEY, []); versions.unshift({ _id: uid("ver_"), type: "version", appId: app._id, code: generated, version: 1, createdAt: Date.now(), note: "Initial version" }); saveJSON(VERSIONS_KEY, versions);
      pushLog("✅ App created and saved locally");
      return app;
    } catch (err) { pushLog("❌ Generation error: " + (err.message || err)); throw err; }
  }

  async function updateAndRedeploy(appId, newCode) {
    const apps = loadJSON(APPS_KEY, []); const idx = apps.findIndex(a => a._id === appId); if (idx < 0) { pushLog("App not found for update"); return null; }
    const app = apps[idx]; let hostedUrl = app.hostedUrl; let previewBlobUrl = app.previewBlobUrl;
    if (window.puter && window.puter.fs && window.puter.hosting) {
      try { const dir = `app_${Date.now()}`; window.puter.fs.mkdir && await window.puter.fs.mkdir(dir); window.puter.fs.write && await window.puter.fs.write(`${dir}/index.html`, newCode); try { if (app.subdomain) await window.puter.hosting.delete(app.subdomain).catch(()=>{}); } catch{}; try { const site = await window.puter.hosting.create(app.subdomain || app.appName || undefined, dir); hostedUrl = `https://${site.subdomain}.puter.site`; pushLog("Redeployed on Puter: " + hostedUrl); } catch(e) { pushLog("Redeploy create failed: " + (e.message || e)); } } catch (e) { pushLog("Puter redeploy error: " + (e.message || e)); }
    }
    if (!hostedUrl) { const blob = new Blob([newCode], { type: "text/html" }); previewBlobUrl = URL.createObjectURL(blob); }
    app.code = newCode; app.updatedAt = Date.now(); app.version = (app.version || 0) + 1; app.hostedUrl = hostedUrl; app.previewBlobUrl = previewBlobUrl; saveAppDoc(app);
    const versions = loadJSON(VERSIONS_KEY, []); versions.unshift({ _id: uid("ver_"), type: "version", appId: app._id, code: newCode, version: app.version, createdAt: Date.now(), note: `Updated to v${app.version}` }); saveJSON(VERSIONS_KEY, versions);
    pushLog(`✅ Updated app ${app.appName} to v${app.version}`);
    return app;
  }

  function deleteApp(appId) {
    const apps = loadJSON(APPS_KEY, []); const idx = apps.findIndex(a => a._id === appId); if (idx < 0) { pushLog("App not found"); return false; }
    const app = apps[idx]; if (window.puter && window.puter.hosting && app.subdomain) { try { window.puter.hosting.delete(app.subdomain).catch(()=>{}); } catch {} }
    apps.splice(idx, 1); saveJSON(APPS_KEY, apps);
    let versions = loadJSON(VERSIONS_KEY, []); versions = versions.filter(v => v.appId !== appId); saveJSON(VERSIONS_KEY, versions);
    pushLog(`✅ Deleted ${app.appName || app._id}`); if (window.AIJR.renderAppsList) window.AIJR.renderAppsList();
    return true;
  }
  function bulkDelete(ids = []) { ids.forEach(id => deleteApp(id)); pushLog(`Bulk deleted ${ids.length} app(s)`); }
  function toggleFavorite(appId) { const apps = loadJSON(APPS_KEY, []); const idx = apps.findIndex(a => a._id === appId); if (idx < 0) return; apps[idx].favorite = !apps[idx].favorite; saveJSON(APPS_KEY, apps); pushLog(`${apps[idx].appName} favorite: ${apps[idx].favorite}`); if (window.AIJR.renderAppsList) window.AIJR.renderAppsList(); }
  function incrementViews(appId) { const apps = loadJSON(APPS_KEY, []); const idx = apps.findIndex(a => a._id === appId); if (idx < 0) return; apps[idx].views = (apps[idx].views || 0) + 1; saveJSON(APPS_KEY, apps); }

  function launchApp(appId) {
    const apps = loadJSON(APPS_KEY, []); const app = apps.find(a => a._id === appId); if (!app) return;
    incrementViews(appId);
    if (app.hostedUrl) { window.open(app.hostedUrl, "_blank"); pushLog(`Launched hosted: ${app.hostedUrl}`); }
    else if (app.previewBlobUrl) { window.open(app.previewBlobUrl, "_blank"); }
    else { const blob = new Blob([app.code || ""], { type: "text/html" }); const url = URL.createObjectURL(blob); window.open(url, "_blank"); pushLog("Launched blob preview"); }
  }

  function exportSingleApp(appId) {
    const apps = loadJSON(APPS_KEY, []); const app = apps.find(a => a._id === appId); if (!app) return;
    const blob = new Blob([JSON.stringify(app, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `${app.appName || 'app'}-export.json` }); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); pushLog(`Exported ${app.appName}`);
  }

  function generateShareLink(appId) {
    const apps = loadJSON(APPS_KEY, []); const app = apps.find(a => a._id === appId); if (!app) return null;
    const encoded = btoa(JSON.stringify({ prompt: app.prompt, code: app.code, title: app.appTitle })); const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    pushLog("Generated share link"); return link;
  }

  window.AIJR.buildAndDeploy = buildAndDeploy;
  window.AIJR.updateAndRedeploy = updateAndRedeploy;
  window.AIJR.deleteApp = deleteApp;
  window.AIJR.bulkDelete = bulkDelete;
  window.AIJR.toggleFavorite = toggleFavorite;
  window.AIJR.incrementViews = incrementViews;
  window.AIJR.launchApp = launchApp;
  window.AIJR.exportSingleApp = exportSingleApp;
  window.AIJR.generateShareLink = generateShareLink;

  /* -------------------------
     Apps list + analytics (enhanced)
     ------------------------- */
  function statCard(label, value, icon) { return el("div", { class: "neu-inset", style: { padding: "12px", borderRadius: "12px", textAlign: "center" } }, el("div", { style: { fontSize: "22px", marginBottom: "6px" } }, icon), el("div", { style: { fontWeight: 800, fontSize: "18px" } }, value), el("div", { style: { color: "var(--text-secondary,#666)", fontSize: "12px" } }, label)); }
  function computeAnalytics() { const apps = loadJSON(APPS_KEY, []); const versions = loadJSON(VERSIONS_KEY, []); const totalApps = apps.length; const totalVersions = versions.length; const favorites = apps.filter(a => a.favorite).length; const totalViews = apps.reduce((s,a)=>s+(a.views||0),0); const modelsUsed = new Set(apps.map(a => a.model)).size; const avgCodeSize = apps.length ? Math.round(apps.reduce((s,a)=>s+((a.code&&a.code.length)||0),0)/apps.length) : 0; return { totalApps, totalVersions, favorites, totalViews, modelsUsed, avgCodeSize }; }
  function openAnalyticsModal() { const s = computeAnalytics(); const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() }); Object.assign(overlay.style, modalOverlayStyleObj()); const box = el("div", { class: "neu-box", onclick: (e)=>e.stopPropagation() }); Object.assign(box.style, modalBoxStyleObj()); box.appendChild(el("h3", { style: { marginTop: 0 } }, "📊 Analytics")); const grid = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginTop: "12px" } }, statCard("Total Apps", s.totalApps, "📱"), statCard("Favorites", s.favorites, "⭐"), statCard("Total Views", s.totalViews, "👁️"), statCard("Models Used", s.modelsUsed, "🤖"), statCard("Avg Code Size", `${(s.avgCodeSize/1024).toFixed(1)}KB`, "📄"), statCard("Versions", s.totalVersions, "📚")); box.appendChild(grid); box.appendChild(el("div", { style: { marginTop: "14px", textAlign: "right" } }, el("button", { class: "neu-btn-black", onclick: () => overlay.remove() }, "Close"))); overlay.appendChild(box); document.body.appendChild(overlay); }

  function renderAppsList(query = "") {
    const wrap = qs("#apps-list");
    if (!wrap) return;
    wrap.innerHTML = "";
    const apps = loadJSON(APPS_KEY, []);
    const q = (query || "").toLowerCase();
    const filtered = apps.filter(a => !q || (a.appName||"").toLowerCase().includes(q) || (a.appTitle||"").toLowerCase().includes(q) || (a.prompt||"").toLowerCase().includes(q));
    if (!filtered.length) { wrap.appendChild(el("div", { style: { color: "var(--text-secondary,#666)", padding: "12px" } }, "No apps")); return; }
    filtered.forEach(app => {
      const row = el("div", { style: { padding: "10px", borderBottom: "1px solid var(--border-color,#e1e1e1)", cursor: "pointer" }, onclick: () => { window.AIJR.selectedApp = app; if (window.AIJR.onAppSelected) window.AIJR.onAppSelected(app); pushLog(`Opened ${app.appName}`); } });
      row.appendChild(el("div", { style: { fontWeight: 800 } }, app.appTitle || app.appName));
      row.appendChild(el("div", { style: { color: "var(--text-secondary,#666)", fontSize: "12px" } }, (app.prompt || "").slice(0,80)));
      const actions = el("div", { style: { marginTop: "8px", display: "flex", gap: "8px" } });
      actions.appendChild(el("button", { class: "neu-btn", onclick: (e)=>{ e.stopPropagation(); toggleFavorite(app._id); } }, app.favorite ? "★" : "☆"));
      actions.appendChild(el("button", { class: "neu-btn", onclick: (e)=>{ e.stopPropagation(); launchApp(app._id); } }, "▶"));
      actions.appendChild(el("button", { class: "neu-btn", onclick: (e)=>{ e.stopPropagation(); exportSingleApp(app._id); } }, "📤"));
      row.appendChild(actions);
      wrap.appendChild(row);
    });
  }
  window.AIJR.renderAppsList = renderAppsList;

  /* -------------------------
     Panel resizing & collapse wiring
     ------------------------- */
  function ensureResizers() {
    if (!qs(".aijr-resizer-left") && leftPanel && middlePanel) {
      const r = el("div", { class: "panel-resizer aijr-resizer-left", dataset: { side: "left" } }); r.style.cssText = "width:8px;cursor:col-resize;display:flex;align-items:center;justify-content:center;flex-shrink:0";
      r.innerHTML = '<div style="width:4px;height:60px;background:var(--text-secondary,#666);border-radius:2px"></div>'; middlePanel.parentNode.insertBefore(r, middlePanel);
    }
    if (!qs(".aijr-resizer-right") && middlePanel && rightPanel) {
      const r = el("div", { class: "panel-resizer aijr-resizer-right", dataset: { side: "right" } }); r.style.cssText = "width:8px;cursor:col-resize;display:flex;align-items:center;justify-content:center;flex-shrink:0";
      r.innerHTML = '<div style="width:4px;height:60px;background:var(--text-secondary,#666);border-radius:2px"></div>'; rightPanel.parentNode.insertBefore(r, rightPanel);
    }

    qsa(".panel-resizer").forEach(res => {
      if (!res._wired) {
        res._wired = true;
        res.addEventListener("mousedown", (e) => startResize(res.dataset.side || "left", e));
        res.addEventListener("touchstart", (e) => startResize(res.dataset.side || "left", e), { passive: false });
      }
    });

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  let resizing = null;
  let startClientX = 0;
  let initialLeftPct = settings.leftPanelWidth;
  let initialCodePct = settings.codePanelWidth;

  function startResize(which, e) {
    resizing = which;
    startClientX = (e.touches ? e.touches[0].clientX : e.clientX);
    initialLeftPct = settings.leftPanelWidth;
    initialCodePct = settings.codePanelWidth;
    document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize";
    if (!qs("#aijr-resize-overlay")) { const o = el("div", { id: "aijr-resize-overlay" }); Object.assign(o.style, { position: "fixed", inset: 0, zIndex: 99999, cursor: "col-resize" }); document.body.appendChild(o); }
  }

  function onMove(e) {
    if (!resizing) return;
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const rect = mainWrap.getBoundingClientRect();
    const mousePct = ((clientX - rect.left) / rect.width) * 100;
    if (resizing === "left") {
      settings.leftPanelWidth = Math.max(10, Math.min(40, mousePct));
    } else {
      const newCode = Math.max(10, Math.min(80, mousePct - settings.leftPanelWidth));
      settings.codePanelWidth = Math.max(10, Math.min(80, newCode));
    }
    leftPanel.style.width = `${settings.leftPanelWidth}%`;
    middlePanel.style.width = `${settings.codePanelWidth}%`;
    saveJSON(SETTINGS_KEY, settings);
    localStorage.setItem("leftPanelWidth", settings.leftPanelWidth);
    localStorage.setItem("codePanelWidth", settings.codePanelWidth);
  }
  function onUp() { resizing = null; document.body.style.userSelect = ""; document.body.style.cursor = ""; const ov = qs("#aijr-resize-overlay"); if (ov) ov.remove(); }

  // Collapse buttons wiring (generic)
  function wireCollapseBtns() {
    qsa(".collapse-btn").forEach(btn => {
      if (!btn._wired) {
        btn._wired = true;
        btn.addEventListener("click", (e) => {
          const leftP = qs("#aijr-left"), middleP = qs("#aijr-middle"), rightP = qs("#aijr-right");
          let panel = leftP && leftP.contains(btn) ? leftP : middleP && middleP.contains(btn) ? middleP : rightP && rightP.contains(btn) ? rightP : null;
          if (!panel) panel = leftP;
          panel.classList.toggle("collapsed");
          if (panel.classList.contains("collapsed")) { panel.style.minWidth = "50px"; panel.style.maxWidth = "50px"; } else { panel.style.minWidth = ""; panel.style.maxWidth = ""; }
          settings.leftCollapsed = leftP.classList.contains("collapsed"); settings.codeCollapsed = middleP.classList.contains("collapsed"); settings.previewCollapsed = rightP.classList.contains("collapsed");
          saveJSON(SETTINGS_KEY, settings);
        });
      }
    });
  }

  // Apply initial UI wiring
  ensureResizers();
  wireCollapseBtns();

  /* -------------------------
     Final exports + init
     ------------------------- */
  window.AIJR.renderLog = renderLogPanel;
  window.AIJR.renderAppsList = renderAppsList;
  window.AIJR.openTemplatesModal = openTemplatesModal;
  window.AIJR.openNewFileModal = openNewFileModal;
  window.AIJR.openVersionsModal = openVersionsModal;
  window.AIJR.buildEditor = buildEditor;
  window.AIJR.buildLeftPanel = buildLeftPanel;

  pushLog("app.bundle.js initialized — UI built. Ready.");

})(); 
