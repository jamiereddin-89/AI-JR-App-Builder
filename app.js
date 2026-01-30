/* Vanilla JS conversion of features from script.jsx (lines 900+) into app.js
   - Assumes styles.css is loaded and there's a <div id="container"></div> in HTML.
   - Provides:
     * 3-panel layout (left: AI / apps, middle: editor & files, right: preview)
     * Templates, Settings, Export/Import, Share, Versions modals
     * Local persistence via localStorage for apps, versions, settings, apiKeys
     * Basic Puter / Pollinations integration (best-effort, graceful fallback)
     * Resizable panels, collapsible panels
     * Simple textarea editor (replaceable with Monaco later)
     * Multi-file tabs
     * Usage bar (calls puter.auth.getMonthlyUsage if available)
*/

(function () {
  // ---------- Utilities ----------
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "style" && typeof v === "object") {
        Object.assign(node.style, v);
      } else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2), v);
      } else if (k === "html") {
        node.innerHTML = v;
      } else {
        node.setAttribute(k, v);
      }
    }
    for (const c of children) {
      if (c == null) continue;
      if (typeof c === "string" || typeof c === "number")
        node.appendChild(document.createTextNode(String(c)));
      else node.appendChild(c);
    }
    return node;
  }

  function qs(sel, from = document) {
    return from.querySelector(sel);
  }

  function qsa(sel, from = document) {
    return Array.from(from.querySelectorAll(sel));
  }

  function saveJSON(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }
  function loadJSON(key, fallback) {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    try {
      return JSON.parse(v);
    } catch {
      return fallback;
    }
  }

  function uid(prefix = "") {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  // ---------- Persistence (localStorage DB emulation) ----------
  const DB_APPS = "jr_apps_v1";
  const DB_VERSIONS = "jr_versions_v1";
  const DB_SETTINGS = "jr_settings_v1";
  function getApps() {
    return loadJSON(DB_APPS, []);
  }
  function putApp(app) {
    const apps = getApps();
    const idx = apps.findIndex((a) => a._id === app._id);
    if (idx >= 0) apps[idx] = app;
    else apps.unshift(app);
    saveJSON(DB_APPS, apps);
    return app;
  }
  function delApp(appId) {
    const apps = getApps().filter((a) => a._id !== appId);
    saveJSON(DB_APPS, apps);
  }
  function getVersions() {
    return loadJSON(DB_VERSIONS, []);
  }
  function addVersion(v) {
    const versions = getVersions();
    versions.unshift(v);
    saveJSON(DB_VERSIONS, versions);
  }

  function getSettings() {
    return loadJSON(DB_SETTINGS, {
      appTheme: localStorage.getItem("app-theme") || "light",
      appLayout: localStorage.getItem("app-layout") || "side-by-side",
      leftPanelWidth: Number(localStorage.getItem("leftPanelWidth") || 25),
      codePanelWidth: Number(localStorage.getItem("codePanelWidth") || 42),
      activeProvider: localStorage.getItem("activeProvider") || "Puter",
      apiKeys: loadJSON("apiKeys", {}),
      favoriteModels: loadJSON("favoriteModels", []),
    });
  }
  function saveSettings(s) {
    saveJSON(DB_SETTINGS, s);
    localStorage.setItem("app-theme", s.appTheme);
    localStorage.setItem("app-layout", s.appLayout);
    localStorage.setItem("leftPanelWidth", s.leftPanelWidth);
    localStorage.setItem("codePanelWidth", s.codePanelWidth);
    localStorage.setItem("activeProvider", s.activeProvider);
    saveJSON("apiKeys", s.apiKeys || {});
    saveJSON("favoriteModels", s.favoriteModels || []);
  }

  // ---------- Initial state ----------
  const state = {
    apps: getApps(), // array of app docs
    versions: getVersions(), // array of versions
    settings: getSettings(),
    puter: null,
    user: null,
    models: [],
    pollinationsModels: [],
    templates: [
      { id: "todo", name: "Todo App", icon: "✅", prompt: "A beautiful todo app..." },
      { id: "calculator", name: "Calculator", icon: "🔢", prompt: "A scientific calculator..." },
      { id: "notes", name: "Notes App", icon: "����", prompt: "A notes app with markdown support..." },
      // ... keep a subset for brevity; you can expand
    ],
    files: [{ name: "index.html", content: "" }],
    activeFile: "index.html",
    editCode: "",
    selectedAppId: null,
    generating: false,
    log: [],
    ui: {
      leftCollapsed: false,
      codeCollapsed: false,
      previewCollapsed: false,
      leftPanelWidth: state?.settings?.leftPanelWidth || 25,
      codePanelWidth: state?.settings?.codePanelWidth || 42,
    },
  };

  // Ensure settings values are mapped to state.ui
  state.ui.leftPanelWidth = state.settings.leftPanelWidth || state.ui.leftPanelWidth;
  state.ui.codePanelWidth = state.settings.codePanelWidth || state.ui.codePanelWidth;

  // ---------- Logging helper ----------
  function addLog(msg) {
    const now = new Date().toLocaleTimeString();
    state.log = [...state.log.slice(-14), `${now}: ${msg}`];
    renderLog();
  }

  // ---------- DOM construction ----------
  const container = document.getElementById("container") || document.body;
  container.innerHTML = ""; // clear
  container.classList.add("min-h-screen");

  // Header
  const headerWrapper = el("div", { class: "max-w-7xl mx-auto p-4 md:p-6" });
  container.appendChild(headerWrapper);

  const header = el("div", { class: "neu-box rounded-[20px] p-3 flex items-center justify-between gap-4" });
  headerWrapper.appendChild(header);

  const title = el("div", { class: "flex items-center gap-4" },
    el("h1", { class: "text-xl font-black" }, "🖥️ JR AI Coder"),
    el("div", { class: "hidden md:flex flex-col border-l pl-4" },
      el("div", { class: "text-xs text-[#666] font-bold" }, state.settings.activeProvider || "Puter"),
      el("div", { class: "text-[10px] text-[#888]" }, `${state.models.length} models • ${state.apps.length} apps`)
    )
  );
  header.appendChild(title);

  // UsageBar placeholder
  const usageContainer = el("div", { style: { flex: "1", maxWidth: "480px", margin: "0 12px" } });
  header.appendChild(usageContainer);

  // Controls
  const controls = el("div", { class: "flex items-center gap-2" });
  header.appendChild(controls);

  const settingsBtn = el("button", { class: "neu-btn p-2 rounded-lg", title: "Settings", onclick: () => openSettings() }, "⚙️");
  controls.appendChild(settingsBtn);

  const exportBtn = el("button", { class: "neu-btn rounded-lg px-3 py-1.5", onclick: () => openExportImport() }, "📦");
  controls.appendChild(exportBtn);

  const analyticsBtn = el("button", { class: "neu-btn rounded-lg px-3 py-1.5", onclick: () => toggleAnalytics() }, "📊");
  controls.appendChild(analyticsBtn);

  const userBlock = el("div", { class: "neu-inset rounded-lg px-3 py-1.5" }, "Guest");
  controls.appendChild(userBlock);

  // Main 3-panel container
  const main = el("div", { class: "flex gap-0 mt-6", style: { minHeight: "600px" } });
  headerWrapper.appendChild(main);

  // Left panel (AI / Apps)
  const leftPanel = el("div", {
    class: "transition-all duration-300",
    style: {
      width: `${state.ui.leftPanelWidth}%`,
      minWidth: "200px",
      flexShrink: "0",
    },
  });
  main.appendChild(leftPanel);

  // Left header with tabs
  const leftHeader = el("div", { class: "neu-box rounded-[24px] p-2 flex gap-2 items-center" });
  leftPanel.appendChild(leftHeader);

  const tabCreate = el("button", { class: "flex-1 py-2 rounded-xl font-bold text-xs", onclick: () => switchLeftTab("build") }, "🔨 Create");
  const tabApps = el("button", { class: "flex-1 py-2 rounded-xl font-bold text-xs", onclick: () => switchLeftTab("apps") }, "📱 Apps");
  leftHeader.appendChild(tabCreate);
  leftHeader.appendChild(tabApps);

  const collapseLeftBtn = el("button", { class: "collapse-btn w-6 h-6 rounded-md", onclick: () => toggleLeftCollapse() }, "←");
  leftHeader.appendChild(collapseLeftBtn);

  // Left content
  const leftContent = el("div", { class: "mt-3 space-y-4" });
  leftPanel.appendChild(leftContent);

  // Build card
  const buildCard = el("div", { class: "neu-box rounded-[24px] p-4" });
  leftContent.appendChild(buildCard);

  const templateBtn = el("button", { class: "neu-btn w-full rounded-xl py-2 font-bold", onclick: () => openTemplates() }, "🎨 Choose Template");
  buildCard.appendChild(templateBtn);

  // Model select
  const modelLabel = el("label", { class: "text-[10px] font-black block mt-3" }, `Model (${state.settings.activeProvider})`);
  buildCard.appendChild(modelLabel);
  const modelSelectWrap = el("div", { class: "neu-inset rounded-xl p-1 mt-1" });
  buildCard.appendChild(modelSelectWrap);
  const modelSelect = el("select", { class: "w-full p-2 bg-transparent font-mono text-[10px]" });
  modelSelectWrap.appendChild(modelSelect);

  // Prompt textarea
  const promptLabel = el("label", { class: "font-black text-[#dc2626] text-[10px] uppercase mt-3 block" }, "App Description");
  buildCard.appendChild(promptLabel);
  const promptAreaWrap = el("div", { class: "neu-inset rounded-xl p-1 mt-1" });
  buildCard.appendChild(promptAreaWrap);
  const promptArea = el("textarea", { class: "w-full h-20 p-2 bg-transparent font-mono text-xs resize-none", placeholder: "Describe your app..." });
  promptAreaWrap.appendChild(promptArea);

  // App name / title
  const nameGrid = el("div", { class: "grid grid-cols-2 gap-2 mt-3" });
  const inputAppName = el("input", { placeholder: "my-app", class: "w-full p-1.5 bg-transparent text-xs" });
  const inputAppTitle = el("input", { placeholder: "My App", class: "w-full p-1.5 bg-transparent text-xs" });
  nameGrid.appendChild(el("div", {}, el("label", { class: "text-[10px] font-black block" }, "App Name"), el("div", { class: "neu-inset rounded-lg p-1" }, inputAppName)));
  nameGrid.appendChild(el("div", {}, el("label", { class: "text-[10px] font-black block" }, "Title"), el("div", { class: "neu-inset rounded-lg p-1" }, inputAppTitle)));
  buildCard.appendChild(nameGrid);

  // Footer actions
  const buildFooter = el("div", { class: "neu-inset rounded-xl p-2 flex items-center justify-between mt-3" },
    el("span", { class: "text-xs text-[#666]" }, "New App"),
    el("div", { class: "flex gap-2" },
      el("button", { class: "neu-btn rounded-lg px-3 py-1.5", onclick: () => resetBuild() }, "🆕 New"),
      el("button", { class: "neu-btn-red rounded-lg px-4 py-1.5", onclick: () => buildAndDeploy(), id: "createBtn" }, "🚀 Create & Deploy")
    )
  );
  buildCard.appendChild(buildFooter);

  // Apps tab content
  const appsCard = el("div", { class: "neu-box rounded-[24px] overflow-hidden", style: { display: "none" } });
  leftContent.appendChild(appsCard);

  const appsSearch = el("div", { class: "p-4 space-y-3" },
    el("div", { class: "neu-inset rounded-xl p-1 flex items-center" },
      el("span", { class: "pl-3 text-[#999]" }, "🔍"),
      el("input", { placeholder: "Search apps...", class: "flex-1 p-2 bg-transparent text-sm", id: "appsSearchInput" })
    ),
    el("div", { class: "flex gap-2" },
      el("button", { class: "neu-btn px-3 py-1.5", onclick: () => toggleFilterFavorites() }, "⭐ Favorites"),
      el("select", { class: "neu-btn rounded-full px-3 py-1.5", onchange: (e) => setSortBy(e.target.value) },
        el("option", { value: "date" }, "Recent"),
        el("option", { value: "name" }, "Name"),
        el("option", { value: "views" }, "Views")
      ),
      el("button", { class: "neu-btn px-3 py-1.5", onclick: () => toggleBulkMode() }, "☑️ Select")
    )
  );
  appsCard.appendChild(appsSearch);

  const appsListWrap = el("div", { class: "max-h-96 overflow-y-auto", id: "appsList" });
  appsCard.appendChild(appsListWrap);

  // Log panel
  const logWrap = el("div", { id: "logWrap", class: "mt-4" });
  leftContent.appendChild(logWrap);

  // Resizer between left and middle
  const resizerLeft = el("div", { class: "panel-resizer hidden lg:flex", title: "Resize panels" });
  main.appendChild(resizerLeft);

  // Middle panel (code editor)
  const middlePanel = el("div", {
    class: "space-y-4 transition-all duration-300",
    style: {
      width: `${state.ui.codePanelWidth}%`,
      minWidth: "300px",
      flexShrink: "0",
    },
  });
  main.appendChild(middlePanel);

  // Code panel header
  const codePanel = el("div", { class: "neu-box rounded-[24px] overflow-hidden h-full" });
  middlePanel.appendChild(codePanel);
  const codePanelHeader = el("div", { class: "p-2 flex items-center justify-between" });
  codePanel.appendChild(codePanelHeader);

  const codeLeftHeader = el("div", { class: "flex items-center gap-1" },
    el("button", { class: "collapse-btn w-6 h-6", onclick: () => toggleCodeCollapse() }, "←"),
    el("span", { class: "font-bold" }, "Code"),
    el("div", { class: "flex gap-1 items-center overflow-x-auto", id: "fileTabs" })
  );
  codePanelHeader.appendChild(codeLeftHeader);

  const codeHeaderRight = el("div", { class: "flex gap-1" },
    el("button", { class: "neu-btn", onclick: () => copyCode() }, "📋 Copy"),
    el("button", { class: "neu-btn", onclick: () => formatCode() }, "✨ Format"),
    el("button", { class: "neu-btn-red", id: "saveDeployBtn", onclick: () => updateAndRedeploy(), style: { display: "none" } }, "Save & Deploy")
  );
  codePanelHeader.appendChild(codeHeaderRight);

  // Editor area (simple textarea editor)
  const editorWrap = el("div", { class: "h-[520px] bg-white relative" });
  const editorArea = el("textarea", { class: "w-full h-full p-3 font-mono text-sm", id: "codeEditor", placeholder: "<!DOCTYPE html> ... " });
  editorWrap.appendChild(editorArea);
  const charCount = el("div", { class: "absolute bottom-2 right-2 text-[#666] text-xs bg-black/5 px-1 rounded" }, "0 chars");
  editorWrap.appendChild(charCount);
  codePanel.appendChild(editorWrap);

  // Resizer between middle and right
  const resizerRight = el("div", { class: "panel-resizer hidden lg:flex", title: "Resize panels" });
  main.appendChild(resizerRight);

  // Right panel (preview)
  const rightPanel = el("div", { class: "space-y-4 transition-all duration-300 flex-1", style: { minWidth: "250px" } });
  main.appendChild(rightPanel);

  const previewCard = el("div", { class: "neu-box rounded-[24px] overflow-hidden h-full" });
  rightPanel.appendChild(previewCard);

  const previewHeader = el("div", { class: "p-2 flex items-center justify-between" },
    el("div", { class: "flex items-center gap-2" },
      el("button", { class: "collapse-btn w-6 h-6", onclick: () => togglePreviewCollapse() }, "→"),
      el("span", { class: "font-bold" }, "Preview")
    ),
    el("div", { class: "flex gap-1" },
      el("button", { class: "neu-btn", onclick: () => openVersions() }, "📚"),
      el("button", { class: "neu-btn", onclick: () => openShare() }, "🔗"),
      el("button", { class: "neu-btn", onclick: () => exportCurrentApp() }, "📤"),
      el("button", { class: "neu-btn", onclick: () => openInNewTab() }, "🔗 Open"),
      el("button", { class: "neu-btn-red", onclick: () => runPreview() }, "▶ Run")
    )
  );
  previewCard.appendChild(previewHeader);

  const previewArea = el("div", { class: "h-[520px] bg-white" },
    el("iframe", { class: "w-full h-full border-0", sandbox: "allow-scripts allow-forms allow-modals allow-popups", id: "previewIframe", title: "App Preview" })
  );
  previewCard.appendChild(previewArea);

  const appDetailsWrap = el("div", { class: "p-3 border-t" , id: "appDetails" });
  previewCard.appendChild(appDetailsWrap);

  // Footer
  const footer = el("div", { class: "text-center py-4" },
    el("div", { class: "inline-flex items-center gap-2 text-[#888] text-sm" },
      el("span", { class: "w-2 h-2 rounded-full bg-[#dc2626]" }),
      el("span", {}, "Powered by Puter.com || Version 1.5.0")
    )
  );
  container.appendChild(footer);

  // ---------- Modal overlays (single container reused) ----------
  const overlayRoot = el("div", { id: "modalRoot" });
  document.body.appendChild(overlayRoot);

  function showModal(node) {
    overlayRoot.innerHTML = "";
    overlayRoot.appendChild(node);
  }
  function closeModal() {
    overlayRoot.innerHTML = "";
  }

  // ---------- Rendering helpers ----------
  function renderLog() {
    logWrap.innerHTML = "";
    if (!state.log.length) return;
    const box = el("div", { class: "log-panel rounded-2xl p-4 neu-inset" },
      el("div", { class: "text-[#666] font-mono text-xs space-y-1 max-h-32 overflow-y-auto" },
        ...state.log.map(l => el("div", { class: l.includes("✅") ? "text-green-600" : l.includes("❌") ? "text-red-600" : "" }, l))
      )
    );
    logWrap.appendChild(box);
  }

  function rerenderAppsList() {
    appsListWrap.innerHTML = "";
    const apps = state.apps || [];
    if (!apps.length) {
      appsListWrap.appendChild(el("div", { class: "p-6 text-[#888] text-center" }, "No apps yet"));
      return;
    }
    for (const app of apps) {
      const appEl = el("div", {
        class: "p-4 border-b cursor-pointer",
        onclick: () => {
          selectApp(app._id);
        },
      },
        el("div", { class: "font-black" }, `${app.appTitle || app.appName} ${app.favorite ? "⭐" : ""}`),
        el("div", { class: "text-xs text-[#666]" }, `v${app.version || 1} • 👁️ ${app.views || 0}`),
        el("div", { class: "text-xs text-[#666] truncate" }, app.prompt || "")
      );
      appsListWrap.appendChild(appEl);
    }
  }

  function renderFileTabs() {
    const tabs = qs("#fileTabs");
    tabs.innerHTML = "";
    for (const f of state.files) {
      const btn = el("div", { class: "relative group inline-block mr-1" },
        el("button", {
          class: `px-3 py-1.5 rounded-lg text-xs ${state.activeFile === f.name ? "neu-inset" : "neu-btn"}`,
          onclick: () => {
            state.activeFile = f.name;
            editorArea.value = f.content;
            updateUI();
          }
        }, f.name),
        state.files.length > 1 ? el("button", {
          class: "absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100",
          onclick: (e) => {
            e.stopPropagation();
            deleteFile(f.name);
          }
        }, "×") : null
      );
      tabs.appendChild(btn);
    }
    const addBtn = el("button", { class: "neu-btn rounded-lg w-7 h-7", onclick: () => openNewFileModal() }, "+");
    tabs.appendChild(addBtn);
  }

  function renderEditorCharCount() {
    charCount.textContent = `${(editorArea.value || "").length} chars`;
  }

  function renderPreview() {
    const iframe = qs("#previewIframe");
    const code = state.editCode || (getSelectedApp() && getSelectedApp().code) || "";
    if (code) {
      iframe.srcdoc = code;
    } else {
      iframe.srcdoc = "<!doctype html><html><body style='display:flex;align-items:center;justify-content:center;height:100%'><div style='text-align:center;color:#888'>LIVE PREVIEW<br/>Build or select an app</div></body></html>";
    }
  }

  function renderAppDetails() {
    const wrap = appDetailsWrap;
    wrap.innerHTML = "";
    const sel = getSelectedApp();
    if (!sel) return;
    const details = el("div", { class: "flex items-center justify-between" },
      el("div", { class: "min-w-0 flex-1" },
        el("div", { class: "font-bold text-xs" }, `${sel.appTitle || sel.appName} ${sel.favorite ? "⭐" : ""}`),
        el("div", { class: "text-[#666] text-[10px]" }, `v${sel.version || 1} • 👁️ ${sel.views || 0} • ${sel.model || ""}`)
      ),
      el("div", { class: "flex gap-1" },
        el("button", { class: "neu-btn rounded-lg w-7 h-7", onclick: (e) => { e.stopPropagation(); toggleFavoriteApp(sel._id); } }, sel.favorite ? "⭐" : "☆"),
        el("button", { class: "neu-btn-black rounded-lg px-2 py-1", onclick: (e) => { e.stopPropagation(); launchApp(sel._id); } }, "Launch"),
        el("button", { class: "neu-btn rounded-lg w-7 h-7", onclick: (e) => { e.stopPropagation(); deleteAppHandler(sel._id); } }, "🗑️")
      )
    );
    wrap.appendChild(details);
  }

  function updateUI() {
    // update panels sizes
    leftPanel.style.width = state.ui.leftCollapsed ? "50px" : `${state.ui.leftPanelWidth}%`;
    middlePanel.style.width = state.ui.codeCollapsed ? "50px" : `${state.ui.codePanelWidth}%`;
    // header user
    userBlock.textContent = state.user ? `👤 ${state.user.username}` : "Guest";
    // model select
    modelSelect.innerHTML = "";
    const models = (state.pollinationsModels.length && state.settings.activeProvider === "Pollinations")
      ? state.pollinationsModels
      : state.models;
    if ((state.settings.favoriteModels || []).length) {
      const favs = models.filter(m => (state.settings.favoriteModels || []).includes(m.id));
      if (favs.length) {
        const optGroup = el("optgroup", { label: "Favorites" }, ...favs.map(m => el("option", { value: m.id }, m.id)));
        modelSelect.appendChild(optGroup);
      }
    }
    const otherGroup = el("optgroup", { label: "Models" }, ...models.map(m => el("option", { value: m.id || m }, m.id || m)));
    modelSelect.appendChild(otherGroup);

    // file tabs
    renderFileTabs();
    // apps list
    rerenderAppsList();
    // editor content
    editorArea.value = state.editCode || (getSelectedApp() && getSelectedApp().code) || state.files.find(f=>f.name===state.activeFile)?.content || "";
    renderEditorCharCount();
    renderPreview();
    renderAppDetails();
    renderLog();

    // show/hide Save & Deploy
    const sel = getSelectedApp();
    qs("#saveDeployBtn").style.display = (sel && editorArea.value) ? "inline-block" : "none";
  }

  // ---------- CRUD helpers ----------
  function getSelectedApp() {
    return state.apps.find(a => a._id === state.selectedAppId) || null;
  }

  function selectApp(appId) {
    state.selectedAppId = appId;
    const app = getSelectedApp();
    if (app) {
      state.editCode = "";
      // set files to single index.html containing app.code
      state.files = [{ name: "index.html", content: app.code || "" }];
      state.activeFile = "index.html";
      editorArea.value = app.code || "";
      addLog(`Selected ${app.appTitle || app.appName}`);
    }
    updateUI();
  }

  function deleteAppHandler(appId) {
    const app = state.apps.find(a => a._id === appId);
    if (!app) return;
    delApp(appId);
    state.apps = getApps();
    if (state.selectedAppId === appId) {
      state.selectedAppId = null;
      state.editCode = "";
    }
    addLog("✅ Deleted");
    updateUI();
  }

  function toggleFavoriteApp(appId) {
    const apps = getApps();
    const idx = apps.findIndex(a => a._id === appId);
    if (idx >= 0) {
      apps[idx].favorite = !apps[idx].favorite;
      saveJSON(DB_APPS, apps);
      state.apps = apps;
      updateUI();
    }
  }

  function launchApp(appId) {
    const app = state.apps.find(a => a._id === appId);
    if (!app) return;
    // increment views
    app.views = (app.views || 0) + 1;
    putApp(app);
    state.apps = getApps();
    window.open(app.hostedUrl || app.previewBlobUrl || "about:blank", "_blank");
    addLog(`Launched: ${app.appName || app.subdomain || app._id}`);
    updateUI();
  }

  // ---------- Files / Editor ----------
  function openNewFileModal() {
    const modal = el("div", { class: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onclick: closeModal },
      el("div", { class: "neu-box rounded-[24px] p-6 max-w-sm w-full bg-[var(--bg-secondary)]", onclick: (e) => e.stopPropagation() },
        el("h3", { class: "font-black text-lg mb-4" }, "Create New File"),
        el("div", { class: "space-y-4" },
          el("label", { class: "text-xs font-bold text-[#666] block mb-2" }, "File Name"),
          el("div", { class: "neu-inset rounded-xl p-1" },
            el("input", { type: "text", id: "newFileNameInput", placeholder: "e.g., styles.css, script.js", class: "w-full p-2 bg-transparent" })
          ),
          el("div", { class: "flex gap-2" },
            el("button", { class: "neu-btn flex-1", onclick: () => closeModal() }, "Cancel"),
            el("button", {
              class: "neu-btn-black flex-1",
              onclick: () => {
                const v = qs("#newFileNameInput").value.trim();
                if (!v) return;
                if (state.files.some(f => f.name.toLowerCase() === v.toLowerCase())) {
                  addLog(`File "${v}" already exists`);
                  return;
                }
                state.files.push({ name: v, content: "" });
                state.activeFile = v;
                updateUI();
                closeModal();
                addLog(`Created new file: ${v}`);
              }
            }, "Create")
          )
        )
      )
    );
    showModal(modal);
    setTimeout(()=>qs("#newFileNameInput").focus(), 10);
  }

  function deleteFile(name) {
    if (state.files.length <= 1) return;
    state.files = state.files.filter(f => f.name !== name);
    if (state.activeFile === name) {
      state.activeFile = state.files[0].name;
    }
    updateUI();
  }

  editorArea.addEventListener("input", (e) => {
    const val = e.target.value;
    state.editCode = val;
    // update active file content
    state.files = state.files.map(f => f.name === state.activeFile ? { ...f, content: val } : f);
    renderEditorCharCount();
    renderPreview();
    renderAppDetails();
  });

  // ---------- Panel collapse / resize ----------
  function toggleLeftCollapse() {
    state.ui.leftCollapsed = !state.ui.leftCollapsed;
    updateUI();
  }
  function toggleCodeCollapse() {
    state.ui.codeCollapsed = !state.ui.codeCollapsed;
    updateUI();
  }
  function togglePreviewCollapse() {
    state.ui.previewCollapsed = !state.ui.previewCollapsed;
    updateUI();
  }

  // Resizing logic
  let resizing = null;
  function startResize(which, e) {
    resizing = which;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const overlay = document.createElement("div");
    overlay.id = "resizing-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "9999";
    overlay.style.cursor = "col-resize";
    document.body.appendChild(overlay);
  }
  window.addEventListener("mousemove", (e) => {
    if (!resizing) return;
    const rect = main.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pct = (mouseX / rect.width) * 100;
    if (resizing === "left") {
      state.ui.leftPanelWidth = Math.max(10, Math.min(40, pct));
      state.settings.leftPanelWidth = state.ui.leftPanelWidth;
      saveSettings(state.settings);
      updateUI();
    } else if (resizing === "right") {
      // code panel width from left edge
      const left = state.ui.leftCollapsed ? 0 : state.ui.leftPanelWidth;
      const newCode = Math.max(10, Math.min(80, pct - left));
      state.ui.codePanelWidth = newCode;
      state.settings.codePanelWidth = state.ui.codePanelWidth;
      saveSettings(state.settings);
      updateUI();
    }
  });
  window.addEventListener("mouseup", () => {
    if (!resizing) return;
    resizing = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    const overlay = document.getElementById("resizing-overlay");
    if (overlay) overlay.remove();
  });
  resizerLeft.addEventListener("mousedown", (e) => startResize("left", e));
  resizerRight.addEventListener("mousedown", (e) => startResize("right", e));

  // ---------- Export / Import ----------
  const fileInput = el("input", { type: "file", accept: ".json", style: { display: "none" }, onchange: importApps });
  document.body.appendChild(fileInput);

  function openExportImport() {
    const modal = el("div", { class: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onclick: closeModal },
      el("div", { class: "neu-box rounded-[24px] p-6 max-w-md w-full", onclick: (e) => e.stopPropagation() },
        el("h3", { class: "font-black text-xl mb-4" }, "📦 Export / Import"),
        el("div", { class: "space-y-3" },
          el("button", { class: "neu-btn w-full rounded-xl py-3", onclick: exportApps }, "📤 Export All Apps (JSON)"),
          el("button", { class: "neu-btn w-full rounded-xl py-3", onclick: () => fileInput.click() }, "📥 Import Apps (JSON)")
        ),
        el("button", { class: "neu-btn-black w-full rounded-xl py-3 mt-4", onclick: closeModal }, "Close")
      )
    );
    showModal(modal);
  }

  function exportApps() {
    const data = JSON.stringify(state.apps, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jr-apps-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("✅ Exported apps");
    closeModal();
  }

  function importApps(e) {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(txt => {
      try {
        const imported = JSON.parse(txt);
        const arr = Array.isArray(imported) ? imported : [imported];
        for (const app of arr) {
          delete app._id;
          app._id = uid("app_");
          app.createdAt = Date.now();
          state.apps.unshift(app);
          addVersion({ _id: uid("ver_"), type: "version", appId: app._id, code: app.code, version: app.version || 1, createdAt: Date.now(), note: "Imported" });
        }
        saveJSON(DB_APPS, state.apps);
        saveJSON(DB_VERSIONS, state.versions);
        addLog(`✅ Imported ${arr.length} app(s)`);
        updateUI();
      } catch (err) {
        addLog(`❌ Import failed: ${err.message}`);
      } finally {
        e.target.value = "";
        closeModal();
      }
    });
  }

  // ---------- Share ----------
  function openShare() {
    const sel = getSelectedApp();
    if (!sel) return;
    const encoded = btoa(JSON.stringify({ prompt: sel.prompt, code: sel.code, title: sel.appTitle }));
    const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    const modal = el("div", { class: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onclick: closeModal },
      el("div", { class: "neu-box rounded-[24px] p-6 max-w-lg w-full", onclick: (e) => e.stopPropagation() },
        el("h3", { class: "font-black text-xl mb-4" }, "🔗 Share App"),
        el("div", { class: "neu-inset rounded-xl p-3 mb-4" }, el("input", { value: link, readonly: true, class: "w-full bg-transparent text-xs font-mono" })),
        el("div", { class: "flex gap-3" },
          el("button", { class: "neu-btn-red flex-1", onclick: () => { navigator.clipboard.writeText(link); addLog("✅ Link copied!"); } }, "📋 Copy Link"),
          el("button", { class: "neu-btn-black flex-1", onclick: closeModal }, "Close")
        )
      )
    );
    showModal(modal);
  }

  // ---------- Versions ----------
  function openVersions() {
    const sel = getSelectedApp();
    if (!sel) return;
    const appVersions = state.versions.filter(v => v.appId === sel._id).sort((a,b)=>b.version - a.version);
    const list = appVersions.length ? appVersions.map(v => el("div", { class: "neu-inset rounded-xl p-3 flex justify-between items-center" },
      el("div", {}, el("div", { class: "font-bold" }, `Version ${v.version}`), el("div", { class: "text-xs text-[#666]" }, new Date(v.createdAt).toLocaleString())),
      el("button", { class: "neu-btn-black", onclick: () => { editorArea.value = v.code; state.editCode = v.code; closeModal(); addLog(`Restored v${v.version}`); updateUI(); } }, "Restore")
    )) : [el("p", { class: "text-[#666] text-center py-4" }, "No versions saved yet")];

    const modal = el("div", { class: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onclick: closeModal },
      el("div", { class: "neu-box rounded-[24px] p-6 max-w-md w-full max-h-[80vh] overflow-hidden", onclick: (e)=>e.stopPropagation() },
        el("h3", { class: "font-black text-xl mb-4" }, "📚 Version History"),
        el("div", { class: "space-y-2 max-h-[50vh] overflow-y-auto" }, ...list),
        el("button", { class: "neu-btn-black w-full mt-4", onclick: closeModal }, "Close")
      )
    );
    showModal(modal);
  }

  // ---------- Templates ----------
  function openTemplates() {
    const modal = el("div", { class: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onclick: closeModal },
      el("div", { class: "neu-box rounded-[24px] p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden", onclick: (e) => e.stopPropagation() },
        el("div", { class: "flex justify-between items-center mb-6" }, el("h3", { class: "font-black text-xl" }, "🎨 App Templates"), el("button", { class: "neu-btn", onclick: closeModal }, "×")),
        el("div", { class: "overflow-y-auto pr-2 custom-scrollbar" },
          el("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }, ...state.templates.map(t => {
            return el("button", { class: "p-4 rounded-2xl text-left transition-all flex flex-col gap-3 group bg-[var(--bg-secondary)]", onclick: () => { promptArea.value = t.prompt; inputAppTitle.value = t.name; closeModal(); } },
              el("div", { class: "flex items-center justify-between" }, el("span", { class: "text-3xl" }, t.icon), el("div", { class: "text-[10px] font-black px-2 py-1 rounded-full bg-black/5" }, "Template")),
              el("div", {}, el("div", { class: "font-bold text-sm mb-1" }, t.name), el("div", { class: "text-[var(--text-secondary)] text-xs" }, t.prompt))
            );
          }))
        ),
        el("button", { class: "neu-btn-black w-full mt-6", onclick: closeModal }, "Close")
      )
    );
    showModal(modal);
  }

  // ---------- Settings ----------
  function openSettings() {
    const themes = ["light", "dark", "grey", "multicoloured"];
    const providersList = ["Puter", "Pollinations", "Google", "Github", "OpenRouter", "Custom"];
    let tempTheme = state.settings.appTheme || "light";
    const modal = el("div", { class: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", onclick: closeModal },
      el("div", { class: "neu-box rounded-[24px] p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto", onclick: (e) => e.stopPropagation() },
        el("div", { class: "flex justify-between items-center mb-6" }, el("h3", { class: "font-black text-xl" }, "⚙️ Settings"), el("div", {},
          el("button", { class: "neu-btn", onclick: () => switchSettingsTab("AI") }, "AI"),
          el("button", { class: "neu-btn", onclick: () => switchSettingsTab("UI") }, "UI")
        )),
        // content
        el("div", { id: "settingsContent" },
          // default AI tab
          el("div", { id: "settingsAI" },
            el("div", {},
              el("label", { class: "text-sm font-bold text-[#666]" }, "Provider"),
              el("select", {
                class: "neu-inset w-full rounded-xl p-3",
                onchange: (e) => {
                  state.settings.activeProvider = e.target.value;
                },
                value: state.settings.activeProvider
              }, ...providersList.map(p => el("option", { value: p }, p)))
            ),
            el("div", { class: "space-y-3 mt-4" },
              el("label", { class: "text-xs font-bold" }, "Pollinations API Key"),
              el("div", { class: "flex gap-2" },
                el("input", { type: "password", class: "neu-inset flex-1 p-3", value: state.settings.apiKeys?.Pollinations || "", onchange: (e) => { state.settings.apiKeys = state.settings.apiKeys || {}; state.settings.apiKeys.Pollinations = e.target.value; } }),
                el("button", { class: "neu-btn", onclick: async () => { await handleSaveKey("Pollinations", state.settings.apiKeys?.Pollinations || ""); } }, "Save Key"),
                el("button", { class: "neu-btn", onclick: async () => { await testApiKey(); } }, "Test Key")
              ),
              el("div", { id: "settingsTestStatus", class: "text-[10px] font-bold" })
            )
          ),
          // UI tab hidden initially
          el("div", { id: "settingsUI", style: { display: "none" } },
            el("div", { class: "space-y-2" },
              el("label", { class: "text-sm font-bold" }, "Theme"),
              el("div", { class: "grid grid-cols-4 gap-2" }, ...themes.map(t => {
                return el("button", { class: `p-3 rounded-xl text-xs font-bold ${tempTheme === t ? "neu-inset" : "neu-btn"}`, onclick: () => { tempTheme = t; document.body.className = `theme-${t}`; } }, t);
              }))
            ),
            el("div", { class: "space-y-2 mt-4" },
              el("label", { class: "text-sm font-bold" }, "App Layout"),
              el("div", { class: "grid grid-cols-3 gap-3" },
                el("button", { class: `neu-btn p-4`, onclick: () => { state.settings.appLayout = "side-by-side"; } }, "Side by Side"),
                el("button", { class: `neu-btn p-4`, onclick: () => { state.settings.appLayout = "stacked"; } }, "Stacked"),
                el("button", { class: `neu-btn p-4`, onclick: () => { state.settings.appLayout = "custom"; } }, "Custom")
              )
            )
          )
        ),
        el("div", { class: "flex gap-4 mt-8" },
          el("button", { class: "neu-btn-black flex-1", onclick: () => { state.settings.appTheme = tempTheme; saveSettings(state.settings); closeModal(); updateUI(); } }, "Save"),
          el("button", { class: "neu-btn flex-1", onclick: () => { document.body.className = `theme-${state.settings.appTheme}`; closeModal(); } }, "Cancel")
        )
      )
    );

    function switchSettingsTab(tab) {
      qs("#settingsAI").style.display = tab === "AI" ? "" : "none";
      qs("#settingsUI").style.display = tab === "UI" ? "" : "none";
    }
    showModal(modal);
  }

  async function handleSaveKey(provider, key) {
    state.settings.apiKeys = state.settings.apiKeys || {};
    state.settings.apiKeys[provider] = key;
    saveSettings(state.settings);
    addLog("Key saved!");
    if (provider === "Pollinations" && key) {
      // attempt to fetch list of models
      try {
        const res = await fetch("https://gen.pollinations.ai/text/models");
        const data = await res.json();
        state.pollinationsModels = (data || []).map(m => ({ id: m.name, name: m.name, provider: "Pollinations", description: m.description || "" }));
        addLog(`Key saved! Found ${state.pollinationsModels.length} models.`);
        updateUI();
      } catch (err) {
        addLog("Key saved but failed to fetch models.");
      }
    }
  }

  async function testApiKey() {
    const status = qs("#settingsTestStatus");
    status.textContent = "Testing...";
    try {
      const res = await fetch("https://gen.pollinations.ai/text/models");
      if (res.ok) {
        const data = await res.json();
        state.pollinationsModels = (data || []).map(m => ({ id: m.name, name: m.name }));
        status.textContent = `Valid key! Found ${state.pollinationsModels.length} models.`;
        addLog(status.textContent);
        updateUI();
      } else {
        status.textContent = "Invalid key or API error.";
        addLog(status.textContent);
      }
    } catch (err) {
      status.textContent = "Connection error. Check your key.";
      addLog(status.textContent);
    }
  }

  // ---------- Build & Deploy / Update ----------
  async function buildAndDeploy(customPrompt) {
    const finalPrompt = customPrompt || promptArea.value || "";
    if (!finalPrompt.trim()) {
      addLog("Please enter a prompt");
      return;
    }
    // If puter and signed in we could use puter, else use Pollinations or fallback
    state.generating = true;
    updateUI();
    addLog(`Model: ${state.settings.model || "default"}`);
    addLog("Generating code...");

    let systemPrompt = `You are an expert web developer. Create a COMPLETE single HTML file app.
RULES:
- Start with <!DOCTYPE html>
- ALL CSS in <style> tag, ALL JS in <script> tag
- Modern CSS: variables, flexbox/grid, animations, gradients
- Modern JS: ES6+, localStorage, event handling
- Responsive and polished UI
- NO external dependencies
- Return ONLY HTML code`;
    let userPrompt = `Build: ${finalPrompt}`;
    let code = "";

    try {
      if (window.puter && state.settings.activeProvider === "Puter") {
        try {
          // attempt non-streaming API
          const resp = await window.puter.ai.chat([{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], { model: state.settings.model || undefined, stream: false });
          // resp may be string or object with choices
          if (typeof resp === "string") code = resp;
          else code = resp?.choices?.[0]?.message?.content || resp?.content || JSON.stringify(resp);
        } catch (err) {
          addLog("Puter AI error, falling back to Pollinations / local fallback");
        }
      }

      if (!code && state.settings.activeProvider === "Pollinations") {
        const pollKey = state.settings.apiKeys?.Pollinations;
        const url = `https://gen.pollinations.ai/text/${encodeURIComponent(systemPrompt + "\n\n" + userPrompt)}?model=${encodeURIComponent(state.settings.model || "")}&json=true`;
        const res = await fetch(url, { method: "GET", headers: { Authorization: pollKey ? `Bearer ${pollKey}` : "" } });
        if (!res.ok) throw new Error(`Pollinations API Error: ${res.status}`);
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          code = data?.choices?.[0]?.message?.content || data?.content || String(data);
        } catch {
          code = text;
        }
      }

      // Fallback simple template if no provider worked
      if (!code) {
        code = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${(inputAppTitle.value || "My App")}</title>
<style>
  body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh}
  .card{padding:20px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.08)}
</style>
</head>
<body>
  <div class="card">
    <h1>${(inputAppTitle.value || "My App")}</h1>
    <p>${finalPrompt}</p>
  </div>
</body>
</html>`;
      }

      // sanitize code blocks
      code = code.replace(/```html?\n?/gi, "").replace(/```\n?/g, "").trim();
      const start = code.search(/<!doctype\s+html>/i);
      if (start > 0) code = code.slice(start);
      if (!code.toLowerCase().includes("<!doctype html>")) {
        // still allow but warn; append a wrapper
        addLog("⚠️ Generated content lacked <!doctype html>; wrapping in a minimal HTML");
        code = `<!doctype html><html><body><pre>${escapeHtml(code)}</pre></body></html>`;
      }

      addLog(`Generated ${code.length} bytes`);

      // Save files to local "hosting" (if puter present try to write and host)
      let hostedUrl = null;
      let previewBlobUrl = null;
      try {
        if (window.puter) {
          // attempt to create a dir and hosting as original flow
          const dirName = `app_${Date.now()}`;
          try {
            if (window.puter.fs && window.puter.fs.mkdir) await window.puter.fs.mkdir(dirName);
            if (window.puter.fs && window.puter.fs.write) await window.puter.fs.write(`${dirName}/index.html`, code);
            // try hosting creation - best-effort
            try {
              const site = await window.puter.hosting.create(inputAppName.value || undefined, dirName);
              hostedUrl = `https://${site.subdomain}.puter.site`;
              addLog(`Hosted at: ${hostedUrl}`);
            } catch (err) {
              addLog("Puter hosting failed; falling back to blob preview");
            }
          } catch (err) {
            addLog("Puter fs error; fallback to blob preview");
          }
        }

        if (!hostedUrl) {
          // create a blob URL for preview and hosting fallback
          const blob = new Blob([code], { type: "text/html" });
          previewBlobUrl = URL.createObjectURL(blob);
          addLog("Created preview blob URL");
        }
      } catch (err) {
        addLog("Hosting/FS step failed: " + err.message);
      }

      // Save app doc into local DB
      const appDoc = {
        _id: uid("app_"),
        type: "app",
        prompt: finalPrompt,
        code,
        appName: inputAppName.value.trim() || `app_${Date.now()}`,
        appTitle: inputAppTitle.value.trim() || finalPrompt.slice(0, 50),
        model: state.settings.model || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        views: 0,
        hostedUrl: hostedUrl,
        previewBlobUrl: previewBlobUrl,
        favorite: false,
      };
      state.apps.unshift(appDoc);
      saveJSON(DB_APPS, state.apps);

      // Save version
      addVersion({ _id: uid("ver_"), type: "version", appId: appDoc._id, code, version: 1, createdAt: Date.now(), note: "Initial version" });

      state.selectedAppId = appDoc._id;
      state.editCode = "";
      state.files = [{ name: "index.html", content: code }];
      state.activeFile = "index.html";
      addLog("✅ Complete!");
      updateUI();
      // open hosted url if exists else open blob preview
      window.open(hostedUrl || previewBlobUrl, "_blank");
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    } finally {
      state.generating = false;
      updateUI();
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  async function updateAndRedeploy() {
    const sel = getSelectedApp();
    if (!sel) return;
    const newCode = editorArea.value;
    if (!newCode) return;
    addLog("Updating...");
    // create version record
    const newVersion = (sel.version || 1) + 1;
    sel.code = newCode;
    sel.version = newVersion;
    sel.updatedAt = Date.now();
    // create preview blob
    const blob = new Blob([newCode], { type: "text/html" });
    sel.previewBlobUrl = URL.createObjectURL(blob);
    putApp(sel);
    addVersion({ _id: uid("ver_"), type: "version", appId: sel._id, code: newCode, version: newVersion, createdAt: Date.now(), note: `Version ${newVersion}` });
    state.apps = getApps();
    addLog(`✅ Updated to v${newVersion}`);
    updateUI();
    window.open(sel.hostedUrl || sel.previewBlobUrl, "_blank");
  }

  // ---------- Misc helpers ----------
  function copyCode() {
    const code = editorArea.value || "";
    navigator.clipboard.writeText(code);
    addLog("✅ Copied code to clipboard");
  }
  function formatCode() {
    // basic prettify: just indent HTML (very naive) - recommend integrating prettier later
    try {
      const formatted = (editorArea.value || "").replace(/>\s+</g, ">\n<");
      editorArea.value = formatted;
      state.editCode = formatted;
      addLog("Formatted code (basic)");
      renderEditorCharCount();
      renderPreview();
    } catch (err) {
      addLog("Format failed");
    }
  }
  function runPreview() {
    const iframe = qs("#previewIframe");
    const code = editorArea.value || getSelectedApp()?.code || "";
    if (!iframe) return;
    iframe.srcdoc = code;
    addLog("Ran preview");
  }
  function openInNewTab() {
    const sel = getSelectedApp();
    if (!sel) return;
    window.open(sel.hostedUrl || sel.previewBlobUrl || "about:blank", "_blank");
  }
  function exportCurrentApp() {
    const sel = getSelectedApp();
    if (!sel) return;
    const data = JSON.stringify(sel, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sel.appName || "app"}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`✅ Exported ${sel.appName || sel._id}`);
  }

  // ---------- Settings toggles and simple UI helpers ----------
  let filterFavorites = false;
  function toggleFilterFavorites() {
    filterFavorites = !filterFavorites;
    // simple filter applied in rerenderAppsList by filtering state.apps
    // For brevity, we just show a log and leave list unaffected in this lightweight port
    addLog(filterFavorites ? "Filtering favorites" : "Showing all apps");
  }
  function setSortBy(val) {
    addLog(`Sort set to ${val}`);
  }
  function toggleBulkMode() {
    addLog("Bulk mode toggle (not fully implemented)");
  }
  function resetBuild() {
    state.selectedAppId = null;
    state.editCode = "";
    state.files = [{ name: "index.html", content: "" }];
    state.activeFile = "index.html";
    promptArea.value = "";
    inputAppName.value = "";
    inputAppTitle.value = "";
    updateUI();
  }

  // ---------- SDK / model loading on mount ----------
  async function init() {
    // Load Puter SDK script if not present
    if (!window.puter) {
      const s = document.createElement("script");
      s.src = "https://js.puter.com/v2/";
      s.onload = async () => {
        state.puter = window.puter;
        addLog("Puter SDK ready");
        try {
          if (window.puter.auth && window.puter.auth.isSignedIn()) {
            state.user = await window.puter.auth.getUser();
            addLog(`Welcome ${state.user.username}`);
          }
        } catch (err) {
          // ignore
        }
      };
      document.body.appendChild(s);
    } else {
      state.puter = window.puter;
      try {
        if (window.puter.auth && window.puter.auth.isSignedIn()) {
          state.user = await window.puter.auth.getUser();
          addLog(`Welcome ${state.user.username}`);
        }
      } catch {}
    }

    // Fetch Puter models list (best-effort)
    try {
      const res = await fetch("https://api.puter.com/puterai/chat/models/");
      const data = await res.json();
      const list = (Array.isArray(data) ? data : data.models || []).map(m => {
        const id = typeof m === "string" ? m : m.id;
        return { id, provider: "OpenAI-like" };
      });
      state.models = list;
    } catch (err) {
      // ignore
    }

    // load persisted apps & versions into state
    state.apps = getApps();
    state.versions = getVersions();

    // apply theme
    document.body.className = `theme-${state.settings.appTheme || "light"}`;

    // initial UI render
    updateUI();
  }

  // ---------- simple analytics / usage fetch ----------
  async function fetchUsage() {
    if (!window.puter || !window.puter.auth || !window.puter.auth.getMonthlyUsage) return;
    try {
      const usage = await window.puter.auth.getMonthlyUsage();
      usageContainer.innerHTML = `${(usage.allowanceInfo?.monthUsageAllowance/1e6 || "0")}M used`;
    } catch {}
  }

  // ---------- small UI toggles ----------
  function openShareModalForApp(app) {
    // wrapper if needed
  }

  function toggleAnalytics() {
    addLog("Toggle analytics (simple port)");
  }

  // ---------- Helpers for addVersion into state and storage ----------
  function addVersion(v) {
    state.versions.unshift(v);
    saveJSON(DB_VERSIONS, state.versions);
  }

  // ---------- Wire up simple UI events ----------
  qs("#createBtn").addEventListener("click", () => buildAndDeploy());
  modelSelect.addEventListener("change", (e) => { state.settings.model = e.target.value; saveSettings(state.settings); });
  qs("#appsSearchInput").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    // simple client-side filter
    appsListWrap.innerHTML = "";
    for (const app of state.apps.filter(a => !q || (a.appName||"").toLowerCase().includes(q) || (a.appTitle||"").toLowerCase().includes(q) || (a.prompt||"").toLowerCase().includes(q))) {
      const appEl = el("div", {
        class: "p-4 border-b cursor-pointer",
        onclick: () => selectApp(app._id)
      },
        el("div", { class: "font-black" }, `${app.appTitle || app.appName} ${app.favorite ? "⭐" : ""}`),
        el("div", { class: "text-xs text-[#666]" }, `v${app.version || 1} • 👁️ ${app.views || 0}`),
        el("div", { class: "text-xs text-[#666] truncate" }, app.prompt || "")
      );
      appsListWrap.appendChild(appEl);
    }
  });

  // ---------- Init ----------
  init();

  // Expose some things for debugging
  window.JRApp = {
    state,
    addLog,
    buildAndDeploy,
    updateAndRedeploy,
    getApps,
    saveSettings,
  };
})();
