// app.js — Vanilla conversion of script.jsx features (core set)
// - Browser-only (no build)
// - Uses CodeMirror 5 (loaded in index.html)
// - Attempts to use Fireproof if available; otherwise falls back to localStorage
//
// Exports: initApp(options) called from main.js

// NOTE: This is a pragmatic conversion keeping the major UI flows and features.
// Some advanced Puter SDK features are attempted if window.puter exists; otherwise
// they gracefully degrade to local-only behaviors.

export async function initApp(opts = {}) {
  const {
    leftContentId = 'left-content',
    editorAreaId = 'editor-area',
    rightContentId = 'right-content',
    newFileBtnId = 'new-file-btn',
  } = opts;

  // Utility: class join
  const cn = (...parts) => parts.filter(Boolean).join(' ');

  // Simple in-memory app state + persistence adapter
  const State = (function () {
    let s = {
      theme: localStorage.getItem('app-theme') || localStorage.getItem('aijr-theme') || 'light',
      activeProvider: localStorage.getItem('activeProvider') || 'Puter',
      apiKeys: JSON.parse(localStorage.getItem('apiKeys') || '{}'),
      favoriteModels: new Set(JSON.parse(localStorage.getItem('favoriteModels') || '[]')),
      files: [{ name: 'index.html', content: '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8"><title>New App</title>\n</head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>' }],
      activeFile: 'index.html',
      templates: getDefaultTemplates(),
      apps: [], // persisted apps (from DB or localStorage)
      versions: [], // saved versions
      models: [],
      pollinationsModels: [],
    };
    const subs = new Set();
    function notify() { subs.forEach(cb => cb(get())); }
    function get() { return JSON.parse(JSON.stringify({
      ...s,
      favoriteModels: [...s.favoriteModels],
    })); }
    function set(partial) {
      Object.assign(s, partial);
      if (partial.apiKeys) localStorage.setItem('apiKeys', JSON.stringify(s.apiKeys));
      if (partial.activeProvider) localStorage.setItem('activeProvider', s.activeProvider);
      if (partial.theme) { localStorage.setItem('app-theme', s.theme); document.body.className = `theme-${s.theme}`; }
      if (partial.favoriteModels) localStorage.setItem('favoriteModels', JSON.stringify([...s.favoriteModels]));
      notify();
    }
    function subscribe(cb) { subs.add(cb); return () => subs.delete(cb); }
    function updateFiles(newFiles) { s.files = newFiles; if (!s.files.find(f => f.name === s.activeFile)) s.activeFile = s.files[0]?.name || ''; notify(); }
    function setActiveFile(name) { s.activeFile = name; notify(); }
    function addFile(file) { s.files.push(file); s.activeFile = file.name; notify(); }
    function deleteFile(name) { s.files = s.files.filter(f => f.name !== name); if (s.activeFile === name) s.activeFile = s.files[0]?.name || ''; notify(); }
    function toggleFavoriteModel(id) { if (s.favoriteModels.has(id)) s.favoriteModels.delete(id); else s.favoriteModels.add(id); set({ favoriteModels: s.favoriteModels }); }
    return { get, set, subscribe, updateFiles, setActiveFile, addFile, deleteFile, toggleFavoriteModel };
  })();

  // Simple DB adapter: try Fireproof (via global or dynamic import) else fallback to localStorage arrays
  const DB = (function () {
    let useFireproof = false;
    let fireDb = null;

    async function init() {
      try {
        if (window.fireproof) {
          fireDb = window.fireproof;
          useFireproof = true;
        } else {
          // Try dynamic import (esm.sh). This may fail depending on CORS; it's an attempt.
          try {
            const mod = await import('https://esm.sh/fireproof@0.18.9');
            // some versions export default open; others may differ.
            if (mod && mod.open) {
              fireDb = await mod.open('puter-apps-v6');
              useFireproof = true;
            }
          } catch (e) {
            // ignore, we'll fallback
            useFireproof = false;
          }
        }
      } catch (e) {
        useFireproof = false;
      }
      if (!useFireproof) {
        // ensure local storage buckets exist
        localStorage.setItem('va_apps', localStorage.getItem('va_apps') || '[]');
        localStorage.setItem('va_versions', localStorage.getItem('va_versions') || '[]');
      }
    }

    async function put(doc) {
      if (useFireproof && fireDb?.put) return fireDb.put(doc);
      // fallback: push or replace by _id
      const arr = JSON.parse(localStorage.getItem('va_apps') || '[]');
      if (!doc._id) doc._id = `app_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const idx = arr.findIndex(a => a._id === doc._id);
      if (idx >= 0) arr[idx] = doc; else arr.unshift(doc);
      localStorage.setItem('va_apps', JSON.stringify(arr));
      return doc;
    }

    async function get(id) {
      if (useFireproof && fireDb?.get) return fireDb.get(id);
      const arr = JSON.parse(localStorage.getItem('va_apps') || '[]');
      return arr.find(a => a._id === id) || null;
    }

    async function del(id) {
      if (useFireproof && fireDb?.del) return fireDb.del(id);
      const arr = JSON.parse(localStorage.getItem('va_apps') || '[]');
      const filtered = arr.filter(a => a._id !== id);
      localStorage.setItem('va_apps', JSON.stringify(filtered));
      return true;
    }

    async function allApps() {
      if (useFireproof && fireDb?.all) {
        // best effort
        const docs = await fireDb.all?.();
        return docs || [];
      }
      return JSON.parse(localStorage.getItem('va_apps') || '[]');
    }

    async function putVersion(v) {
      if (useFireproof && fireDb?.put) return fireDb.put(v);
      const arr = JSON.parse(localStorage.getItem('va_versions') || '[]');
      if (!v._id) v._id = `ver_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      arr.unshift(v);
      localStorage.setItem('va_versions', JSON.stringify(arr));
      return v;
    }

    async function versionsForApp(appId) {
      if (useFireproof && fireDb?.query) {
        // best effort; library specifics vary
        try {
          const all = await fireDb.all?.();
          return (all || []).filter(v => v.type === 'version' && v.appId === appId).sort((a, b) => b.version - a.version);
        } catch (e) { /* fall through */ }
      }
      const arr = JSON.parse(localStorage.getItem('va_versions') || '[]');
      return arr.filter(v => v.appId === appId).sort((a, b) => b.version - a.version);
    }

    return { init, put, get, del, allApps, putVersion, versionsForApp, usingFireproof: () => useFireproof };
  })();

  await DB.init();

  // DOM nodes
  const leftRoot = document.getElementById(leftContentId);
  const editorRoot = document.getElementById(editorAreaId);
  const rightRoot = document.getElementById(rightContentId);
  const newFileBtn = document.getElementById(newFileBtnId);

  // ----- Templates / Settings / Modals -----
  function getDefaultTemplates() {
    return [
      { id: "todo", name: "Todo App", icon: "✅", prompt: "A beautiful todo app with categories, priorities, due dates, dark/light mode toggle, and local storage persistence" },
      { id: "calculator", name: "Calculator", icon: "🔢", prompt: "A scientific calculator with history, memory functions, keyboard support, and a sleek modern UI" },
      { id: "notes", name: "Notes App", icon: "📝", prompt: "A notes app with markdown support, folders, search, tags, and auto-save functionality" },
      { id: "chat", name: "AI Chat App", icon: "🤖", prompt: "A sophisticated AI chat interface with markdown rendering, code highlighting, and conversation history." },
    ];
  }

  // Modal helpers
  function openModal(contentEl) {
    const overlay = document.createElement('div');
    overlay.className = 'va-modal-overlay';
    overlay.addEventListener('click', () => overlay.remove());
    const modal = document.createElement('div');
    modal.className = 'va-modal neu-box';
    modal.addEventListener('click', (e) => e.stopPropagation());
    modal.appendChild(contentEl);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    return { overlay, modal, close: () => overlay.remove() };
  }

  // Simple toast/log area
  function addLog(msg) {
    const t = document.createElement('div');
    t.textContent = `${new Date().toLocaleTimeString()}: ${msg}`;
    t.style.fontSize = '12px';
    t.style.marginTop = '6px';
    leftRoot.appendChild(t);
    setTimeout(() => t.remove(), 8000);
  }

  // ----- Editor (CodeMirror 5) -----
  let editor = null;

  function createEditor(initialValue = '', options = {}) {
    editorRoot.innerHTML = ''; // clear
    const area = document.createElement('textarea');
    area.value = initialValue;
    area.style.height = '100%';
    area.style.width = '100%';
    area.className = 'cm-editor';
    editorRoot.appendChild(area);

    const cm = CodeMirror.fromTextArea(area, {
      mode: 'htmlmixed',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentWithTabs: false,
      autofocus: false,
      viewportMargin: Infinity,
      ...options,
    });

    // small styling fix: ensure editor fills the area
    editorRoot.style.height = '100%';
    cm.setSize('100%', '100%');
    return cm;
  }

  // initialize editor with current active file
  function initEditor() {
    const st = State.get();
    const file = st.files.find(f => f.name === st.activeFile) || st.files[0];
    editor = createEditor(file?.content || '');
    editor.on('change', () => {
      const content = editor.getValue();
      const files = State.get().files.map(f => f.name === State.get().activeFile ? ({ ...f, content }) : f);
      State.updateFiles(files);
    });
  }

  // ----- UI Rendering -----
  function renderLeft() {
    leftRoot.innerHTML = '';
    const st = State.get();

    // Build tab buttons (Create / Apps)
    const tabs = document.createElement('div');
    tabs.style.display = 'flex';
    tabs.style.gap = '8px';
    tabs.style.marginBottom = '12px';

    const createBtn = document.createElement('button');
    createBtn.className = 'collapse-btn';
    createBtn.textContent = 'Create';
    createBtn.onclick = () => openCreatePanel();
    tabs.appendChild(createBtn);

    const appsBtn = document.createElement('button');
    appsBtn.className = 'collapse-btn';
    appsBtn.textContent = 'Apps';
    appsBtn.onclick = () => openAppsPanel();
    tabs.appendChild(appsBtn);

    leftRoot.appendChild(tabs);

    // Default content: quick actions
    const quick = document.createElement('div');
    quick.innerHTML = `
      <div style="margin-bottom:8px;font-weight:700">Quick Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="choose-template" class="neu-btn">🎨 Templates</button>
        <button id="settings-button" class="neu-btn">⚙️ Settings</button>
        <button id="export-button" class="neu-btn">📦 Export</button>
      </div>
    `;
    leftRoot.appendChild(quick);

    // Log area title
    const logLabel = document.createElement('div');
    logLabel.style.marginTop = '12px';
    logLabel.style.fontSize = '12px';
    logLabel.textContent = 'Activity';
    leftRoot.appendChild(logLabel);

    // wire actions
    document.getElementById('choose-template').addEventListener('click', () => openTemplatesModal());
    document.getElementById('settings-button').addEventListener('click', () => openSettingsModal());
    document.getElementById('export-button').addEventListener('click', () => exportAllApps());
  }

  function renderRight() {
    rightRoot.innerHTML = '';

    const previewHeader = document.createElement('div');
    previewHeader.style.display = 'flex';
    previewHeader.style.justifyContent = 'space-between';
    previewHeader.style.alignItems = 'center';
    previewHeader.style.padding = '8px';
    previewHeader.innerHTML = `<div style="font-weight:700">Preview</div>`;
    rightRoot.appendChild(previewHeader);

    const iframeHolder = document.createElement('div');
    iframeHolder.style.height = 'calc(100% - 48px)';
    iframeHolder.style.background = 'white';
    iframeHolder.style.border = '1px solid var(--border-color)';
    iframeHolder.style.overflow = 'hidden';
    iframeHolder.style.position = 'relative';
    iframeHolder.style.margin = '8px';

    const iframe = document.createElement('iframe');
    iframe.title = 'App Preview';
    iframe.sandbox = 'allow-scripts allow-forms allow-modals allow-popups';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframeHolder.appendChild(iframe);

    rightRoot.appendChild(iframeHolder);

    // Run button
    const runWrap = document.createElement('div');
    runWrap.style.display = 'flex';
    runWrap.style.gap = '8px';
    runWrap.style.justifyContent = 'flex-end';
    runWrap.style.marginTop = '8px';
    const runBtn = document.createElement('button');
    runBtn.className = 'neu-btn';
    runBtn.textContent = '▶ Run';
    runBtn.onclick = () => {
      const code = (State.get().files.find(f => f.name === State.get().activeFile) || {}).content || '';
      iframe.srcdoc = code;
    };
    runWrap.appendChild(runBtn);
    rightRoot.appendChild(runWrap);
  }

  // ----- Templates Modal -----
  function openTemplatesModal() {
    const templates = State.get().templates;
    const container = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = '🎨 Templates';
    title.style.marginTop = '0';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid-templates';
    templates.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'neu-btn';
      btn.style.textAlign = 'left';
      btn.innerHTML = `<div style="font-size:18px">${t.icon} <strong style="display:block">${t.name}</strong></div><div style="font-size:12px;color:var(--text-secondary)">${t.prompt.slice(0,80)}${t.prompt.length>80?'…':''}</div>`;
      btn.onclick = () => {
        // apply template: set prompt as file content basic HTML scaffold for now
        const scaffold = `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8"><title>${t.name}</title>\n</head>\n<body>\n<h1>${t.name}</h1>\n<p>${t.prompt}</p>\n</body>\n</html>`;
        State.addFile({ name: `${t.id}.html`, content: scaffold });
        initEditorAndSync();
        modal.close();
        addLog(`Template "${t.name}" applied`);
      };
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    const modal = openModal(container);
  }

  // ----- Settings Modal -----
  function openSettingsModal() {
    const st = State.get();
    const node = document.createElement('div');

    const title = document.createElement('h3');
    title.textContent = '⚙️ Settings';
    node.appendChild(title);

    // Theme selector
    const themeWrap = document.createElement('div');
    themeWrap.style.marginTop = '8px';
    themeWrap.innerHTML = `<div style="font-weight:700;font-size:12px">Theme</div>`;
    ['light','dark','grey','multicoloured'].forEach(t => {
      const b = document.createElement('button');
      b.className = 'neu-btn';
      b.textContent = t;
      b.style.margin = '6px 6px 0 0';
      b.onclick = () => {
        State.set({ theme: t });
        addLog(`Theme set to ${t}`);
      };
      themeWrap.appendChild(b);
    });
    node.appendChild(themeWrap);

    // Provider select and pollinations key field
    const provWrap = document.createElement('div');
    provWrap.style.marginTop = '12px';
    provWrap.innerHTML = `<div style="font-weight:700;font-size:12px">Provider</div>`;
    const select = document.createElement('select');
    ['Puter','Pollinations','Custom'].forEach(p => {
      const o = document.createElement('option'); o.value = p; o.textContent = p;
      select.appendChild(o);
    });
    select.value = st.activeProvider;
    select.onchange = () => { State.set({ activeProvider: select.value }); addLog(`Provider: ${select.value}`); };
    provWrap.appendChild(select);

    // Pollinations key test
    const keyLabel = document.createElement('div'); keyLabel.style.marginTop = '8px'; keyLabel.style.fontSize = '12px'; keyLabel.textContent = 'Pollinations Key (optional)';
    provWrap.appendChild(keyLabel);
    const keyInput = document.createElement('input'); keyInput.type = 'text'; keyInput.value = (st.apiKeys && st.apiKeys.Pollinations) || '';
    keyInput.style.width = '100%';
    provWrap.appendChild(keyInput);
    const keyBtns = document.createElement('div'); keyBtns.style.marginTop = '8px'; keyBtns.style.display = 'flex'; keyBtns.style.gap = '8px';
    const saveKeyBtn = document.createElement('button'); saveKeyBtn.className = 'neu-btn'; saveKeyBtn.textContent = 'Save Key';
    saveKeyBtn.onclick = async () => {
      const k = keyInput.value.trim();
      const apiKeys = st.apiKeys || {};
      apiKeys.Pollinations = k;
      State.set({ apiKeys });
      addLog('Pollinations key saved');
      // try to fetch models
      if (k) {
        try {
          const res = await fetch('https://gen.pollinations.ai/text/models');
          const data = await res.json();
          State.set({ pollinationsModels: (data || []).map(m => ({ id: m.name, name: m.name })) });
          addLog(`Found ${data.length} pollinations models`);
        } catch (e) {
          addLog('Failed to fetch models (public endpoint may be rate-limited)');
        }
      }
    };
    const testKeyBtn = document.createElement('button'); testKeyBtn.className = 'neu-btn'; testKeyBtn.textContent = 'Test Key';
    testKeyBtn.onclick = async () => {
      const k = keyInput.value.trim();
      if (!k) { addLog('Enter a key first'); return; }
      try {
        const res = await fetch('https://gen.pollinations.ai/text/models', { headers: { Authorization: `Bearer ${k}` } });
        if (!res.ok) { addLog('Invalid key or API error'); return; }
        const data = await res.json();
        State.set({ pollinationsModels: (data || []).map(m => ({ id: m.name, name: m.name })) });
        addLog(`Valid key — found ${data.length} models`);
      } catch (e) { addLog('Connection error while testing key'); }
    };
    keyBtns.appendChild(saveKeyBtn); keyBtns.appendChild(testKeyBtn);
    provWrap.appendChild(keyBtns);

    node.appendChild(provWrap);

    const modal = openModal(node);
  }

  // ----- Apps listing panel (left) -----
  async function openAppsPanel() {
    const apps = await DB.allApps();
    const container = document.createElement('div');
    const title = document.createElement('h3'); title.textContent = 'Saved Apps'; container.appendChild(title);

    if (!apps || apps.length === 0) {
      const p = document.createElement('div'); p.textContent = 'No apps saved yet.'; container.appendChild(p);
      openModal(container);
      return;
    }

    const list = document.createElement('div'); list.style.display = 'grid'; list.style.gap = '8px';
    apps.forEach(app => {
      const item = document.createElement('div');
      item.className = 'neu-inset';
      item.style.padding = '8px';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      const left = document.createElement('div');
      left.innerHTML = `<div style="font-weight:700">${app.appTitle || app.appName}</div><div style="font-size:12px;color:var(--text-secondary)">${app.prompt?.slice(0,80)||''}</div>`;
      item.appendChild(left);
      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.gap = '6px';
      const openBtn = document.createElement('button'); openBtn.className = 'neu-btn'; openBtn.textContent = 'Open';
      openBtn.onclick = () => {
        // load app code into a file
        State.addFile({ name: `${app.appName || app._id}.html`, content: app.code || '' });
        initEditorAndSync();
        modal.close();
      };
      const delBtn = document.createElement('button'); delBtn.className = 'neu-btn'; delBtn.textContent = 'Delete';
      delBtn.onclick = async () => { await DB.del(app._id); addLog('Deleted app'); modal.close(); };
      actions.appendChild(openBtn); actions.appendChild(delBtn);
      item.appendChild(actions);
      list.appendChild(item);
    });

    container.appendChild(list);
    const modal = openModal(container);
  }

  // ----- Export / Import -----
  async function exportAllApps() {
    const apps = await DB.allApps();
    const data = JSON.stringify(apps, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `aijr-apps-export-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    addLog('Exported apps');
  }

  function importAppsFromFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        const arr = Array.isArray(obj) ? obj : [obj];
        for (const app of arr) {
          // strip ids to avoid collision
          delete app._id;
          app._id = `app_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          await DB.put(app);
        }
        addLog(`Imported ${arr.length} app(s)`);
      } catch (err) {
        addLog('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ----- Share link -----
  function generateShareLink(app) {
    const encoded = btoa(JSON.stringify({ prompt: app.prompt, code: app.code, title: app.appTitle }));
    const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    // quick modal to copy
    const node = document.createElement('div');
    const input = document.createElement('input'); input.value = link; input.style.width = '100%';
    node.appendChild(input);
    const copyBtn = document.createElement('button'); copyBtn.className = 'neu-btn'; copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => { navigator.clipboard.writeText(link); addLog('Share link copied'); };
    node.appendChild(copyBtn);
    openModal(node);
  }

  // ----- Build & Deploy (simplified) -----
  // For Pollinations: we call the public `gen.pollinations.ai/text` endpoint as used in original code.
  // For Puter: if window.puter is present we attempt to use it, otherwise fall back to a simple generator.
  async function buildFromPrompt(promptText, opts = {}) {
    const provider = State.get().activeProvider;
    const model = 'default';
    addLog(`Building app using ${provider}...`);

    // create a user-visible "generating" overlay
    const overlay = document.createElement('div');
    overlay.className = 'code-loading-overlay';
    overlay.innerHTML = `<div class="code-spinner"></div><div style="margin-top:12px">Generating...</div>`;
    editorRoot.appendChild(overlay);

    try {
      if (provider === 'Pollinations') {
        const key = State.get().apiKeys?.Pollinations;
        const url = `https://gen.pollinations.ai/text/${encodeURIComponent(promptText)}?model=${encodeURIComponent(model)}&json=true`;
        const res = await fetch(url, { headers: { Authorization: key ? `Bearer ${key}` : '' } });
        if (!res.ok) {
          throw new Error(`Pollinations error ${res.status}`);
        }
        const text = await res.text();
        // try parse JSON; API may return JSON or plain text
        let code = text;
        try { const j = JSON.parse(text); code = j?.choices?.[0]?.message?.content || j?.content || code; } catch (e) { /* fallback */ }
        code = stripFenced(code);
        // Save into a new file
        const name = `app_${Date.now()}.html`;
        State.addFile({ name, content: code });
        addLog('Generated app (Pollinations)');
        initEditorAndSync();
      } else if (provider === 'Puter' && window.puter?.ai?.chat) {
        // best-effort: attempt Puter streaming if available
        try {
          const stream = await window.puter.ai.chat([{ role: 'user', content: promptText }], { model: 'gpt-4o-mini', stream: false });
          // some SDKs return an object or string
          let code = '';
          if (typeof stream === 'string') code = stream;
          else if (stream?.text) code = stream.text;
          else if (stream?.choices?.[0]?.message?.content) code = stream.choices[0].message.content;
          code = stripFenced(code);
          const name = `app_${Date.now()}.html`;
          State.addFile({ name, content: code });
          addLog('Generated app (Puter)');
          initEditorAndSync();
        } catch (e) {
          // fallback
          const fallback = generateFallbackHTML(promptText);
          const name = `app_${Date.now()}.html`;
          State.addFile({ name, content: fallback });
          addLog('Puter SDK failed — used fallback generator');
          initEditorAndSync();
        }
      } else {
        // fallback local generator (use a simple scaffold)
        const fallback = generateFallbackHTML(promptText);
        const name = `app_${Date.now()}.html`;
        State.addFile({ name, content: fallback });
        addLog('Generated app (local fallback)');
        initEditorAndSync();
      }
    } catch (err) {
      addLog('❌ Error: ' + err.message);
      console.error(err);
    } finally {
      overlay.remove();
    }
  }

  function stripFenced(s) {
    return s.replace(/```(?:html|HTML)?\n?/g, '').replace(/```\n?/g, '').trim();
  }

  function generateFallbackHTML(promptText) {
    return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Generated App</title>
<style>
body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:24px}
</style>
</head>
<body>
<h1>Generated App</h1>
<p>${escapeHtml(promptText).slice(0,500)}</p>
</body>
</html>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
  }

  // ----- Editor file tab UI and interactions -----
  const fileTabsContainer = document.createElement('div');
  fileTabsContainer.style.display = 'flex';
  fileTabsContainer.style.gap = '6px';
  fileTabsContainer.style.padding = '8px';
  fileTabsContainer.style.alignItems = 'center';

  function renderFileTabs() {
    // ensure editor area top shows tabs
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.appendChild(fileTabsContainer);
    const cmRoot = editorRoot.querySelector('.CodeMirror')?.parentElement;
    if (cmRoot) {
      cmRoot.style.height = 'calc(100% - 48px)';
      // insert tabs above cmRoot
      if (!editorRoot.querySelector('.file-tabs-wrapper')) {
        const ft = document.createElement('div');
        ft.className = 'file-tabs-wrapper';
        ft.style.padding = '8px';
        ft.style.borderBottom = '1px solid var(--border-color)';
        editorRoot.insertBefore(ft, editorRoot.firstChild);
        ft.appendChild(fileTabsContainer);
      }
    }
    // populate tabs
    fileTabsContainer.innerHTML = '';
    const st = State.get();
    st.files.forEach(f => {
      const b = document.createElement('button');
      b.className = cn('neu-btn');
      b.textContent = f.name;
      b.style.whiteSpace = 'nowrap';
      if (st.activeFile === f.name) b.style.fontWeight = '800';
      b.onclick = () => {
        State.set({}); // trigger subscribers
        State.setActiveFile?.(f.name); // some methods may not exist in state, so fallback
        State.set({}); // ensure update
        State.setActiveFile ? State.setActiveFile(f.name) : null;
        // read fresh and set editor content
        const file = State.get().files.find(x => x.name === f.name);
        if (editor && file) editor.setValue(file.content || '');
        renderFileTabs();
      };
      // delete control
      if (st.files.length > 1) {
        const del = document.createElement('span');
        del.style.marginLeft = '6px';
        del.style.cursor = 'pointer';
        del.textContent = '×';
        del.onclick = (e) => {
          e.stopPropagation();
          State.deleteFile ? State.deleteFile(f.name) : State.updateFiles(State.get().files.filter(ff => ff.name !== f.name));
          if (editor && State.get().activeFile === f.name) editor.setValue((State.get().files[0] || {}).content || '');
          renderFileTabs();
        };
        b.appendChild(del);
      }
      fileTabsContainer.appendChild(b);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'neu-btn';
    addBtn.textContent = '+';
    addBtn.onclick = () => {
      const name = prompt('Filename (e.g. index.html)');
      if (!name) return;
      if (State.get().files.some(f => f.name.toLowerCase() === name.toLowerCase())) { addLog('File exists'); return; }
      State.addFile({ name, content: '' });
      if (editor) editor.setValue('');
      renderFileTabs();
    };
    fileTabsContainer.appendChild(addBtn);
  }

  // Initialize editor and sync with state
  function initEditorAndSync() {
    const st = State.get();
    const file = st.files.find(f => f.name === st.activeFile) || st.files[0];
    if (!editor) {
      editor = createEditor(file.content || '');
      editor.on('change', () => {
        // sync with state
        const content = editor.getValue();
        const files = State.get().files.map(f => f.name === (State.get().activeFile || file.name) ? ({ ...f, content }) : f);
        State.updateFiles(files);
      });
    } else {
      editor.setValue(file.content || '');
    }
    renderFileTabs();
    renderRight(); // ensure preview iframe exists
  }

  // Wire new file button
  if (newFileBtn) {
    newFileBtn.addEventListener('click', () => {
      const name = prompt('New file name (e.g., index.html)');
      if (!name) return;
      if (State.get().files.some(f => f.name.toLowerCase() === name.toLowerCase())) { addLog('File exists'); return; }
      State.addFile({ name, content: '' });
      initEditorAndSync();
    });
  }

  // Wire import via hidden file input
  function createImportControl() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) importAppsFromFile(f);
    };
    document.body.appendChild(input);
    return input;
  }
  const importer = createImportControl();

  // Provide a button in leftRoot to open import file dialog
  function addImportButton() {
    const impBtn = document.createElement('button');
    impBtn.className = 'neu-btn';
    impBtn.textContent = 'Import Apps';
    impBtn.onclick = () => importer.click();
    leftRoot.appendChild(impBtn);
  }

  // ----- Initialization & subscribers -----
  // initial render
  renderLeft();
  initEditor(); // create editor from default file
  renderRight();
  renderFileTabs();
  addImportButton();

  // Subscribe to state changes to update UI pieces as needed
  State.subscribe((s) => {
    // update file tabs, editor content if active file changed
    const file = s.files.find(f => f.name === s.activeFile);
    if (editor && file && editor.getValue() !== file.content) {
      const cursor = editor.getCursor && editor.getCursor();
      editor.setValue(file.content || '');
      if (cursor) editor.setCursor(cursor);
    }
    renderFileTabs();
  });

  // Expose some actions to console for debugging
  window.__AIJR = { State, DB, buildFromPrompt, generateShareLink };

  // If URL contains a share param, try to load it
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('share')) {
      const dec = atob(params.get('share'));
      const obj = JSON.parse(dec);
      State.addFile({ name: 'shared.html', content: obj.code || obj.prompt || '' });
      initEditorAndSync();
      addLog('Loaded shared content from URL');
    }
  } catch (e) { /* ignore bad share */ }

  // expose a simple UI for building from prompt (basic)
  function openCreatePanel() {
    const node = document.createElement('div');
    const t = document.createElement('h3'); t.textContent = '🛠️ Build from prompt'; node.appendChild(t);
    const ta = document.createElement('textarea'); ta.style.width = '100%'; ta.style.height = '120px'; ta.placeholder = 'Describe your app...';
    node.appendChild(ta);
    const btns = document.createElement('div'); btns.style.display = 'flex'; btns.style.gap = '8px'; btns.style.marginTop = '8px';
    const buildBtn = document.createElement('button'); buildBtn.className = 'neu-btn'; buildBtn.textContent = '🚀 Build';
    buildBtn.onclick = () => {
      const p = ta.value.trim();
      if (!p) { alert('Enter a prompt'); return; }
      modal.close();
      buildFromPrompt(p);
    };
    btns.appendChild(buildBtn);
    node.appendChild(btns);
    const modal = openModal(node);
  }

  // initial DB load: fetch apps and populate simple list
  (async function loadApps() {
    const apps = await DB.allApps();
    State.set({ apps });
    if (!apps || apps.length === 0) addLog('No remote apps found (local only)');
    else addLog(`Loaded ${apps.length} apps`);
  })();

  // helper: delete file shortcut (Cmd/Ctrl + Shift + K)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
      const name = State.get().activeFile;
      if (confirm(`Delete file ${name}?`)) {
        State.deleteFile ? State.deleteFile(name) : State.updateFiles(State.get().files.filter(f => f.name !== name));
        addLog(`Deleted ${name}`);
        renderFileTabs();
      }
    }
  });

  // finished init
  addLog(`App initialized — ${DB.usingFireproof() ? 'Fireproof enabled' : 'Using localStorage fallback'}`);
  // ensure body theme applied
  document.body.className = `theme-${State.get().theme}`;
}
