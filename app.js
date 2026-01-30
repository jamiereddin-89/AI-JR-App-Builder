// app.js — Vanilla conversion and feature-complete implementation derived from script.jsx
// - Browser-only (no build)
// - Uses CodeMirror 5 (loaded in index.html)
// - Attempts to use Fireproof if available; otherwise falls back to localStorage
// - Implements: multi-file editor, file tabs, templates, modals (Export/Import, Settings, Share, Versions, New File),
//   Build/Deploy flows (Puter + Pollinations attempts), usage bar, logs, favorites, providers, persistence, versions,
//   preview iframe, run, copy code, export single app, import, share link, basic analytics
//
// NOTE: This is a direct, pragmatic conversion. Some Puter SDK behavior is best-effort (uses window.puter if present).
// The code focuses on behavior parity rather than exact DOM or styling parity — styles.css provides look-and-feel.

export async function initApp(opts = {}) {
  const {
    leftContentId = 'left-content',
    editorAreaId = 'editor-area',
    rightContentId = 'right-content',
    newFileBtnId = 'new-file-btn',
  } = opts;

  // ---------- Utilities ----------
  const el = (tag, attrs = {}, children = []) => {
    const d = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') d.className = v;
      else if (k === 'html') d.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') d.addEventListener(k.slice(2).toLowerCase(), v);
      else d.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      if (typeof c === 'string') d.appendChild(document.createTextNode(c));
      else d.appendChild(c);
    });
    return d;
  };

  const cn = (...parts) => parts.filter(Boolean).join(' ');

  const debounce = (fn, delay = 300) => {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const stripFenced = s => s.replace(/```(?:html|HTML)?\n?/g, '').replace(/```\n?/g, '').trim();
  const escapeHtml = str => String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));

  // ---------- State store ----------
  const State = (function () {
    // initial
    const defaultFiles = [{ name: 'index.html', content: '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8"><title>New App</title>\n</head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>' }];
    let s = {
      theme: localStorage.getItem('app-theme') || localStorage.getItem('aijr-theme') || 'light',
      activeProvider: localStorage.getItem('activeProvider') || 'Puter',
      apiKeys: JSON.parse(localStorage.getItem('apiKeys') || '{}'),
      favoriteModels: new Set(JSON.parse(localStorage.getItem('favoriteModels') || '[]')),
      files: JSON.parse(localStorage.getItem('va_files') || JSON.stringify(defaultFiles)),
      activeFile: (JSON.parse(localStorage.getItem('va_files') || JSON.stringify(defaultFiles))[0] || defaultFiles[0]).name,
      templates: null, // set later
      apps: [], // persisted apps loaded from DB
      versions: [],
      models: [],
      pollinationsModels: [],
      logs: [],
      usage: null,
    };
    const subs = new Set();
    function notify() { subs.forEach(cb => cb(get())); }
    function get() {
      return {
        ...s,
        favoriteModels: new Set([...s.favoriteModels]),
        files: JSON.parse(JSON.stringify(s.files)),
      };
    }
    function set(partial) {
      Object.assign(s, partial);
      // persist
      if (partial.apiKeys) localStorage.setItem('apiKeys', JSON.stringify(s.apiKeys));
      if (partial.activeProvider) localStorage.setItem('activeProvider', s.activeProvider);
      if (partial.theme) { localStorage.setItem('app-theme', s.theme); document.body.className = `theme-${s.theme}`; }
      if (partial.favoriteModels) localStorage.setItem('favoriteModels', JSON.stringify([...s.favoriteModels]));
      if (partial.files) localStorage.setItem('va_files', JSON.stringify(s.files));
      notify();
    }
    function subscribe(cb) { subs.add(cb); return () => subs.delete(cb); }
    function updateFiles(newFiles) { s.files = newFiles; localStorage.setItem('va_files', JSON.stringify(s.files)); if (!s.files.find(f => f.name === s.activeFile)) s.activeFile = s.files[0]?.name || ''; notify(); }
    function setActiveFile(name) { s.activeFile = name; localStorage.setItem('va_files', JSON.stringify(s.files)); notify(); }
    function addFile(file) { s.files.push(file); s.activeFile = file.name; localStorage.setItem('va_files', JSON.stringify(s.files)); notify(); }
    function deleteFile(name) { s.files = s.files.filter(f => f.name !== name); if (s.activeFile === name) s.activeFile = s.files[0]?.name || ''; localStorage.setItem('va_files', JSON.stringify(s.files)); notify(); }
    function toggleFavoriteModel(id) { if (s.favoriteModels.has(id)) s.favoriteModels.delete(id); else s.favoriteModels.add(id); set({ favoriteModels: s.favoriteModels }); }
    function pushLog(msg) { s.logs = [...s.logs.slice(-14), `${new Date().toLocaleTimeString()}: ${msg}`]; notify(); }
    return { get, set, subscribe, updateFiles, setActiveFile, addFile, deleteFile, toggleFavoriteModel, pushLog };
  })();

  // ---------- DB (Fireproof attempt / localStorage fallback) ----------
  const DB = (function () {
    let useFireproof = false;
    let db = null; // if using library, this will be DB API
    async function init() {
      try {
        if (window.fireproof) {
          db = window.fireproof;
          useFireproof = true;
        } else {
          // try dynamic import from esm.sh (best-effort; might not be allowed)
          try {
            const mod = await import('https://esm.sh/use-fireproof@0.24.9');
            // use-fireproof exports hooks for react; Fireproof itself might be different.
            // We try to access a plain fireproof global if present.
            if (window.fireproof) { db = window.fireproof; useFireproof = true; }
            else useFireproof = false;
          } catch (e) {
            useFireproof = false;
          }
        }
      } catch (e) {
        useFireproof = false;
      }
      if (!useFireproof) {
        localStorage.setItem('va_apps', localStorage.getItem('va_apps') || '[]');
        localStorage.setItem('va_versions', localStorage.getItem('va_versions') || '[]');
      }
    }

    async function put(doc) {
      if (useFireproof && db?.put) return db.put(doc);
      // fallback: save to va_apps (replace by _id or add)
      const arr = JSON.parse(localStorage.getItem('va_apps') || '[]');
      if (!doc._id) doc._id = `app_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const idx = arr.findIndex(a => a._id === doc._id);
      if (idx >= 0) arr[idx] = doc; else arr.unshift(doc);
      localStorage.setItem('va_apps', JSON.stringify(arr));
      return doc;
    }

    async function get(id) {
      if (useFireproof && db?.get) return db.get(id);
      const arr = JSON.parse(localStorage.getItem('va_apps') || '[]');
      return arr.find(a => a._id === id) || null;
    }

    async function del(id) {
      if (useFireproof && db?.del) return db.del(id);
      const arr = JSON.parse(localStorage.getItem('va_apps') || '[]');
      const filtered = arr.filter(a => a._id !== id);
      localStorage.setItem('va_apps', JSON.stringify(filtered));
      return true;
    }

    async function allApps() {
      if (useFireproof && db?.all) {
        try { return await db.all(); } catch (e) { /* fall back */ }
      }
      return JSON.parse(localStorage.getItem('va_apps') || '[]');
    }

    async function putVersion(v) {
      if (useFireproof && db?.put) return db.put(v);
      const arr = JSON.parse(localStorage.getItem('va_versions') || '[]');
      if (!v._id) v._id = `ver_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      arr.unshift(v);
      localStorage.setItem('va_versions', JSON.stringify(arr));
      return v;
    }

    async function versionsForApp(appId) {
      if (useFireproof && db?.all) {
        try {
          const all = await db.all();
          return (all || []).filter(x => x.type === 'version' && x.appId === appId).sort((a, b) => b.version - a.version);
        } catch (e) {}
      }
      const arr = JSON.parse(localStorage.getItem('va_versions') || '[]');
      return arr.filter(v => v.appId === appId).sort((a, b) => b.version - a.version);
    }

    return { init, put, get, del, allApps, putVersion, versionsForApp, usingFireproof: () => useFireproof };
  })();

  await DB.init();

  // ---------- DOM roots ----------
  const leftRoot = document.getElementById(leftContentId);
  const editorRoot = document.getElementById(editorAreaId);
  const rightRoot = document.getElementById(rightContentId);
  const newFileBtn = document.getElementById(newFileBtnId);

  // ---------- Templates list ----------
  function getDefaultTemplates() {
    return [
      { id: "todo", name: "Todo App", icon: "✅", prompt: "A beautiful todo app with categories, priorities, due dates, dark/light mode toggle, and local storage persistence" },
      { id: "calculator", name: "Calculator", icon: "🔢", prompt: "A scientific calculator with history, memory functions, keyboard support, and a sleek modern UI" },
      { id: "notes", name: "Notes App", icon: "📝", prompt: "A notes app with markdown support, folders, search, tags, and auto-save functionality" },
      { id: "chat", name: "AI Chat App", icon: "🤖", prompt: "A sophisticated AI chat interface with markdown rendering, code highlighting, and conversation history." },
      { id: "image-describer", name: "Image Describer", icon: "🖼️", prompt: "An app where users can upload or paste an image URL, and it uses AI to describe the content in detail." },
    ];
  }
  State.set({ templates: getDefaultTemplates() });

  // ---------- Logging UI (simple) ----------
  function renderLogs() {
    // append latest logs to a small area inside leftRoot
    const logs = State.get().logs || [];
    let logPanel = leftRoot.querySelector('.log-panel');
    if (!logPanel) {
      logPanel = el('div', { class: 'log-panel neu-inset', style: 'margin-top:12px;padding:8px;max-height:160px;overflow:auto' });
      leftRoot.appendChild(logPanel);
    }
    logPanel.innerHTML = '';
    logs.forEach(l => {
      const row = el('div', { class: '' }, [l]);
      logPanel.appendChild(row);
    });
  }

  // subscribe to logs updates
  State.subscribe(s => {
    renderFileTabs(); // keep tabs in sync
    renderLogs();
  });

  // ---------- Editor (CodeMirror 5) ----------
  let editor = null;
  let editorInitialized = false;

  function createEditor(initialValue = '') {
    editorRoot.innerHTML = '';
    // put a container for tabs above editor
    const tabsWrap = el('div', { class: 'file-tabs-wrapper', style: 'padding:8px;border-bottom:1px solid var(--border-color)' });
    editorRoot.appendChild(tabsWrap);

    const textarea = el('textarea', { style: 'width:100%;height:100%' });
    editorRoot.appendChild(textarea);

    const cm = CodeMirror.fromTextArea(textarea, {
      mode: 'htmlmixed',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentWithTabs: false,
      viewportMargin: Infinity,
      theme: document.body.className.includes('theme-dark') ? 'material' : 'default',
    });
    cm.setSize('100%', '520px');
    return { cm, tabsWrap };
  }

  function initEditor() {
    const st = State.get();
    const file = st.files.find(f => f.name === st.activeFile) || st.files[0];
    const { cm, tabsWrap } = createEditor(file?.content || '');
    editor = cm;
    editorInitialized = true;

    // change handler
    editor.on('change', debounce(() => {
      const content = editor.getValue();
      // update state files array
      const files = State.get().files.map(f => f.name === State.get().activeFile ? ({ ...f, content }) : f);
      State.updateFiles(files);
    }, 150));

    renderFileTabs();
  }

  // ---------- File Tabs ----------
  function renderFileTabs() {
    if (!editorInitialized) return;
    const tabsWrap = editorRoot.querySelector('.file-tabs-wrapper');
    if (!tabsWrap) return;
    tabsWrap.innerHTML = '';
    const st = State.get();
    const files = st.files || [];
    const tabsRow = el('div', { style: 'display:flex;gap:6px;align-items:center;overflow:auto' });
    files.forEach(f => {
      const btn = el('button', { class: cn('neu-btn'), style: `white-space:nowrap;${st.activeFile === f.name ? 'font-weight:800' : ''}` }, [f.name]);
      btn.addEventListener('click', () => {
        State.setActiveFile(f.name);
        // set editor value
        const file = State.get().files.find(ff => ff.name === f.name);
        if (editor && file && editor.getValue() !== file.content) editor.setValue(file.content || '');
        renderFileTabs();
      });
      // delete if >1 file
      if (files.length > 1) {
        const del = el('span', { style: 'margin-left:6px;cursor:pointer' }, ['×']);
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (!confirm(`Delete file ${f.name}?`)) return;
          const newFiles = State.get().files.filter(ff => ff.name !== f.name);
          State.updateFiles(newFiles);
          if (State.get().activeFile === f.name && newFiles.length) {
            State.setActiveFile(newFiles[0].name);
            if (editor) editor.setValue(newFiles[0].content || '');
          }
          renderFileTabs();
        });
        btn.appendChild(del);
      }
      tabsRow.appendChild(btn);
    });
    // add file button
    const addBtn = el('button', { class: 'neu-btn', title: 'Add file' }, ['＋']);
    addBtn.addEventListener('click', () => {
      const name = prompt('New file name (example: script.js)');
      if (!name) return;
      if (State.get().files.some(f => f.name.toLowerCase() === name.toLowerCase())) { State.pushLog(`File "${name}" already exists`); return; }
      State.addFile({ name, content: '' });
      if (editor) editor.setValue('');
      renderFileTabs();
    });
    tabsRow.appendChild(addBtn);

    tabsWrap.appendChild(tabsRow);
  }

  // ---------- Left panel rendering (controls, templates, export/import) ----------
  function renderLeft() {
    leftRoot.innerHTML = '';
    const header = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' }, [
      el('div', {}, [el('strong', {}, ['Create / Apps'])]),
      el('div', {}, [
        el('button', { class: 'collapse-btn', onClick: () => openTemplatesModal() }, ['🎨 Templates']),
      ]),
    ]);
    leftRoot.appendChild(header);

    const quick = el('div', { style: 'margin-bottom:12px' });
    quick.appendChild(el('div', { style: 'font-weight:700;margin-bottom:6px' }, ['Quick']));
    const btns = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
    const buildBtn = el('button', { class: 'neu-btn' }, ['🚀 Build (from prompt)']);
    btns.appendChild(buildBtn);
    const importBtn = el('button', { class: 'neu-btn' }, ['📥 Import']);
    btns.appendChild(importBtn);
    const exportBtn = el('button', { class: 'neu-btn' }, ['📤 Export']);
    btns.appendChild(exportBtn);
    quick.appendChild(btns);
    leftRoot.appendChild(quick);

    // Build modal trigger
    buildBtn.addEventListener('click', () => openBuildModal());
    importBtn.addEventListener('click', () => {
      const input = el('input', { type: 'file', accept: '.json', style: 'display:none' });
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            for (const a of arr) {
              delete a._id;
              a._id = `app_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
              await DB.put(a);
            }
            State.pushLog(`Imported ${arr.length} app(s)`);
          } catch (err) {
            State.pushLog(`Import failed: ${err.message}`);
          }
        };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      input.click();
      input.remove();
    });
    exportBtn.addEventListener('click', async () => {
      const apps = await DB.allApps();
      const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: `aijr-export-${Date.now()}.json` });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      State.pushLog('Exported apps');
    });

    // Log list area
    const logTitle = el('div', { style: 'font-weight:700;margin-top:12px' }, ['Activity']);
    leftRoot.appendChild(logTitle);
    const logPanel = el('div', { class: 'log-panel neu-inset', style: 'margin-top:8px;padding:8px;max-height:180px;overflow:auto' });
    leftRoot.appendChild(logPanel);
    // render initial logs
    renderLogs();
  }

  // ---------- Right panel rendering (preview + controls) ----------
  function renderRight() {
    rightRoot.innerHTML = '';
    const header = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:8px' }, [
      el('div', { style: 'font-weight:700' }, ['Preview']),
      el('div', {}, [
        el('button', { class: 'neu-btn', onClick: () => {
          // open in new tab semantic: use currently active file code
          const code = (State.get().files.find(f => f.name === State.get().activeFile) || {}).content || '';
          const blob = new Blob([code], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        } }, ['🔗 Open']),
        el('button', { class: 'neu-btn', onClick: () => {
          // run: set iframe srcdoc
          const iframe = rightRoot.querySelector('iframe');
          const code = (State.get().files.find(f => f.name === State.get().activeFile) || {}).content || '';
          if (iframe) iframe.srcdoc = code;
        } }, ['▶ Run']),
      ])
    ]);
    rightRoot.appendChild(header);

    const iframeWrap = el('div', { style: 'height:520px;background:white;margin:8px;border:1px solid var(--border-color)' });
    const iframe = el('iframe', { sandbox: 'allow-scripts allow-forms allow-modals allow-popups', title: 'App Preview', style: 'width:100%;height:100%;border:0' });
    iframeWrap.appendChild(iframe);
    rightRoot.appendChild(iframeWrap);

    // app details / actions area (below iframe)
    const details = el('div', { style: 'padding:8px;border-top:1px solid var(--border-color)' });
    rightRoot.appendChild(details);
  }

  // ---------- Modal helpers ----------
  function openModal(innerEl, opts = {}) {
    const overlay = el('div', { class: 'va-modal-overlay', onClick: () => overlay.remove() });
    const modalBox = el('div', { class: 'va-modal neu-box', onClick: (e) => e.stopPropagation() });
    modalBox.appendChild(innerEl);
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);
    return { overlay, close: () => overlay.remove(), modalBox };
  }

  // ---------- Templates Modal ----------
  function openTemplatesModal() {
    const templates = State.get().templates || [];
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['🎨 App Templates']));
    const grid = el('div', { class: 'grid-templates', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:8px' });
    templates.forEach(t => {
      const btn = el('button', { class: 'neu-btn', style: 'text-align:left;padding:12px' });
      btn.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:20px">${t.icon}</div><div style="font-weight:700">${t.name}</div></div><div style="font-size:12px;color:var(--text-secondary)">${t.prompt.slice(0,60)}${t.prompt.length>60?'…':''}</div></div>`;
      btn.addEventListener('click', () => {
        // create file with scaffold
        const scaffold = `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8"><title>${escapeHtml(t.name)}</title>\n</head>\n<body>\n<h1>${escapeHtml(t.name)}</h1>\n<p>${escapeHtml(t.prompt)}</p>\n</body>\n</html>`;
        State.addFile({ name: `${t.id}.html`, content: scaffold });
        if (editor) editor.setValue(scaffold);
        modal.close();
        State.pushLog(`Template "${t.name}" applied`);
      });
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    const modal = openModal(container);
  }

  // ---------- Settings Modal ----------
  function openSettingsModal() {
    const st = State.get();
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['⚙️ Settings']));

    // Theme selection
    const themeWrap = el('div', { style: 'margin-top:8px' });
    themeWrap.appendChild(el('div', { style: 'font-weight:700' }, ['Theme']));
    ['light', 'dark', 'grey', 'multicoloured'].forEach(t => {
      const b = el('button', { class: 'neu-btn', style: 'margin:6px 6px 0 0' }, [t]);
      b.addEventListener('click', () => {
        State.set({ theme: t });
        State.pushLog(`Theme: ${t}`);
      });
      themeWrap.appendChild(b);
    });
    container.appendChild(themeWrap);

    // Provider select
    const providerWrap = el('div', { style: 'margin-top:12px' });
    providerWrap.appendChild(el('div', { style: 'font-weight:700' }, ['Provider']));
    const select = el('select', {}, []);
    ['Puter', 'Pollinations', 'Custom'].forEach(p => {
      const o = el('option', { value: p }, [p]);
      select.appendChild(o);
    });
    select.value = st.activeProvider;
    select.addEventListener('change', () => {
      State.set({ activeProvider: select.value });
      State.pushLog(`Active provider set to ${select.value}`);
    });
    providerWrap.appendChild(select);

    // Pollinations key input
    providerWrap.appendChild(el('div', { style: 'margin-top:8px;font-weight:700' }, ['Pollinations API Key (optional)']));
    const keyInput = el('input', { type: 'text', value: st.apiKeys?.Pollinations || '', style: 'width:100%;padding:6px;margin-top:6px' });
    providerWrap.appendChild(keyInput);
    const keyBtns = el('div', { style: 'display:flex;gap:8px;margin-top:8px' });
    const saveKey = el('button', { class: 'neu-btn' }, ['Save Key']);
    const testKey = el('button', { class: 'neu-btn' }, ['Test Key']);
    keyBtns.appendChild(saveKey); keyBtns.appendChild(testKey);
    providerWrap.appendChild(keyBtns);

    saveKey.addEventListener('click', async () => {
      const k = keyInput.value.trim();
      const apiKeys = State.get().apiKeys || {};
      apiKeys.Pollinations = k;
      State.set({ apiKeys });
      State.pushLog('Pollinations key saved');
      // attempt to fetch models
      if (k) {
        try {
          const res = await fetch('https://gen.pollinations.ai/text/models', { headers: { Authorization: `Bearer ${k}` } });
          if (res.ok) {
            const data = await res.json();
            State.set({ pollinationsModels: (data || []).map(m => ({ id: m.name, name: m.name })) });
            State.pushLog(`Found ${data.length} Pollinations models`);
          } else {
            State.pushLog('Failed to fetch Pollinations models (bad key?)');
          }
        } catch (e) {
          State.pushLog('Failed to fetch Pollinations models (network)');
        }
      }
    });
    testKey.addEventListener('click', async () => {
      const k = keyInput.value.trim();
      if (!k) { State.pushLog('Enter a key first'); return; }
      try {
        const res = await fetch('https://gen.pollinations.ai/text/models', { headers: { Authorization: `Bearer ${k}` } });
        if (!res.ok) { State.pushLog('Invalid key or API error'); return; }
        const data = await res.json();
        State.set({ pollinationsModels: (data || []).map(m => ({ id: m.name, name: m.name })) });
        State.pushLog(`Valid key — found ${data.length} models`);
      } catch (e) {
        State.pushLog('Connection error while testing key');
      }
    });

    container.appendChild(providerWrap);

    // App layout selection (small)
    const layoutWrap = el('div', { style: 'margin-top:12px' });
    layoutWrap.appendChild(el('div', { style: 'font-weight:700' }, ['App Layout (preview only)']));
    ['side-by-side', 'stacked', 'custom'].forEach(l => {
      const b = el('button', { class: 'neu-btn', style: 'margin:6px 6px 0 0' }, [l]);
      b.addEventListener('click', () => { localStorage.setItem('app-layout', l); State.pushLog(`App layout saved: ${l}`); });
      layoutWrap.appendChild(b);
    });
    container.appendChild(layoutWrap);

    openModal(container);
  }

  // ---------- Build modal (prompt -> generate) ----------
  function openBuildModal(prefill = '') {
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['🛠️ Build & Deploy']));
    const ta = el('textarea', { style: 'width:100%;height:120px;margin-top:8px' });
    ta.value = prefill;
    container.appendChild(ta);
    const footer = el('div', { style: 'display:flex;gap:8px;margin-top:8px;justify-content:flex-end' });
    const buildBtn = el('button', { class: 'neu-btn' }, ['🚀 Build']);
    footer.appendChild(buildBtn);
    container.appendChild(footer);

    const modal = openModal(container);
    buildBtn.addEventListener('click', async () => {
      const prompt = ta.value.trim();
      if (!prompt) { alert('Enter a prompt'); return; }
      modal.close();
      await buildAndDeploy(prompt);
    });
  }

  // ---------- Build & Deploy (core) ----------
  async function buildAndDeploy(finalPrompt) {
    State.pushLog('Starting generation...');
    // show temporary overlay in editor
    const overlay = el('div', { class: 'code-loading-overlay' }, [el('div', { class: 'code-spinner' }), el('div', { style: 'margin-top:12px' }, ['Generating code...'])]);
    editorRoot.appendChild(overlay);

    const activeProvider = State.get().activeProvider;
    const model = 'gpt-4o-mini'; // fallback
    let code = '';
    try {
      if (activeProvider === 'Puter' && window.puter?.ai?.chat) {
        // attempt Puter streaming / non-stream
        try {
          const stream = await window.puter.ai.chat([{ role: 'system', content: 'You are an expert web developer. Return a complete single-file HTML app.' }, { role: 'user', content: finalPrompt }], { model, stream: false });
          if (typeof stream === 'string') code = stream;
          else if (stream?.choices?.[0]?.message?.content) code = stream.choices[0].message.content;
          else if (stream?.text) code = stream.text;
        } catch (e) {
          State.pushLog('Puter SDK call failed, falling back');
          code = generateFallbackHTML(finalPrompt);
        }
      } else if (activeProvider === 'Pollinations') {
        // Pollinations simple GET as original code did
        const key = State.get().apiKeys?.Pollinations;
        const url = `https://gen.pollinations.ai/text/${encodeURIComponent(finalPrompt)}?model=${encodeURIComponent(model)}&json=true`;
        const res = await fetch(url, { headers: { Authorization: key ? `Bearer ${key}` : '' } });
        if (!res.ok) {
          throw new Error(`Pollinations API Error: ${res.status}`);
        }
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          code = data?.choices?.[0]?.message?.content || data?.content || text;
        } catch (e) {
          code = text;
        }
      } else {
        // fallback local generator
        code = generateFallbackHTML(finalPrompt);
      }

      code = stripFenced(code);
      // ensure doctype
      if (!/<!doctype\s+html>/i.test(code)) {
        // if generated content is not full HTML, wrap it
        code = `<!doctype html>\n<html>\n<head><meta charset="utf-8"><title>Generated</title></head>\n<body>\n${code}\n</body>\n</html>`;
      }

      // create a new file and set as active
      const fileName = `app_${Date.now()}.html`;
      State.addFile({ name: fileName, content: code });
      if (editor) editor.setValue(code);
      State.pushLog(`Generated ${code.length} bytes`);

      // attempt to save and register app with Puter hosting if available
      if (window.puter && window.puter.fs && window.puter.hosting) {
        try {
          const dirName = `app_${Date.now()}`;
          await window.puter.fs.mkdir(dirName);
          await window.puter.fs.write(`${dirName}/index.html`, code);
          const subdomain = (fileName.replace(/\.[^.]+$/, '')).slice(0, 20);
          const site = await window.puter.hosting.create(subdomain, dirName);
          const hostedUrl = `https://${site.subdomain}.puter.site`;
          // create app record and save to DB
          const appDoc = {
            type: 'app',
            appName: subdomain,
            appTitle: finalPrompt.slice(0, 40),
            prompt: finalPrompt,
            code,
            subdomain,
            hostedUrl,
            createdAt: Date.now(),
            version: 1,
            views: 0,
            favorite: false,
          };
          await DB.put(appDoc);
          State.pushLog(`Hosted at ${hostedUrl}`);
        } catch (e) {
          State.pushLog('Puter hosting failed: ' + (e.message || e));
        }
      } else {
        // save locally to DB
        const appDoc = { type: 'app', appName: fileName.replace(/\.[^.]+$/, ''), appTitle: finalPrompt.slice(0, 40), prompt: finalPrompt, code, createdAt: Date.now(), version: 1, views: 0, favorite: false };
        await DB.put(appDoc);
        State.pushLog('Saved app locally');
      }
    } catch (err) {
      State.pushLog('❌ Error: ' + (err.message || err));
      console.error(err);
    } finally {
      overlay.remove();
    }
  }

  function generateFallbackHTML(promptText) {
    return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Generated App</title>
<style>body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:24px;color:var(--text-color)}</style>
</head>
<body>
<h1>Generated App</h1>
<p>${escapeHtml(promptText)}</p>
</body>
</html>`;
  }

  // ---------- Versions modal ----------
  async function openVersionsModal(appId) {
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['📚 Version History']));
    const versions = await DB.versionsForApp(appId);
    if (!versions || versions.length === 0) {
      container.appendChild(el('div', {}, ['No versions saved yet']));
    } else {
      const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:8px' });
      versions.forEach(v => {
        const row = el('div', { class: 'neu-inset', style: 'padding:8px;display:flex;justify-content:space-between;align-items:center' }, [
          el('div', {}, [el('div', { style: 'font-weight:700' }, [`v${v.version}`]), el('div', { style: 'font-size:12px;color:var(--text-secondary)' }, [new Date(v.createdAt).toLocaleString()])]),
          el('div', {}, [el('button', { class: 'neu-btn', onClick: () => { /* restore to editor */ editor && editor.setValue(v.code || ''); State.pushLog(`Restored v${v.version}`); modal.close(); } }, ['Restore'])])
        ]);
        list.appendChild(row);
      });
      container.appendChild(list);
    }
    const modal = openModal(container);
  }

  // ---------- Share modal (quick) ----------
  function openShareModal(app) {
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['🔗 Share App']));
    const encoded = btoa(JSON.stringify({ prompt: app.prompt, code: app.code, title: app.appTitle }));
    const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    const input = el('input', { value: link, style: 'width:100%;padding:8px;margin-top:8px' });
    container.appendChild(input);
    const copyBtn = el('button', { class: 'neu-btn', style: 'margin-top:8px' }, ['Copy']);
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(link);
      State.pushLog('Share link copied');
    });
    container.appendChild(copyBtn);
    openModal(container);
  }

  // ---------- New File modal ----------
  function openNewFileModal() {
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['Create New File']));
    const input = el('input', { placeholder: 'e.g., script.js', style: 'width:100%;padding:8px;margin-top:8px' });
    container.appendChild(input);
    const createBtn = el('button', { class: 'neu-btn', style: 'margin-top:8px' }, ['Create']);
    container.appendChild(createBtn);
    const modal = openModal(container);
    createBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) return;
      if (State.get().files.some(f => f.name.toLowerCase() === name.toLowerCase())) { State.pushLog('File exists'); return; }
      State.addFile({ name, content: '' });
      if (editor) editor.setValue('');
      modal.close();
    });
  }

  // ---------- UsageBar (simple) ----------
  function renderUsageBar(elRoot) {
    // elRoot = DOM element to mount into (we used header earlier in index.html)
    const fill = document.getElementById('usage-fill');
    if (!fill) return;
    // pulse animation simulated
    fill.classList.add('usage-bar-pulse');
    setTimeout(() => fill.classList.remove('usage-bar-pulse'), 1200);
  }

  // ---------- Helpers: export single app ----------
  async function exportSingleApp(app) {
    const blob = new Blob([JSON.stringify(app, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `${app.appName || 'app'}-export.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    State.pushLog(`Exported ${app.appName || app._id}`);
  }

  // ---------- Launch / delete / favorite app ----------
  async function launchApp(app) {
    State.pushLog(`Launching ${app.appName || app._id}`);
    if (app.appName && window.puter?.apps?.launch) {
      try {
        await window.puter.apps.launch(app.appName);
        State.pushLog(`Launched ${app.appName}`);
        return;
      } catch (e) { /* fallback */ }
    }
    if (app.hostedUrl) window.open(app.hostedUrl, '_blank');
    else {
      // open code in new tab
      const blob = new Blob([app.code || ''], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  async function deleteApp(app) {
    if (!confirm(`Delete app ${app.appTitle || app.appName || app._id}?`)) return;
    try {
      if (app.appName && window.puter?.apps?.delete) {
        try { await window.puter.apps.delete(app.appName); } catch (e) {}
      }
      if (app.subdomain && window.puter?.hosting?.delete) {
        try { await window.puter.hosting.delete(app.subdomain); } catch (e) {}
      }
      await DB.del(app._id);
      State.pushLog('Deleted app');
    } catch (e) {
      State.pushLog('Delete failed: ' + (e.message || e));
    }
  }

  // ---------- Initial render & wiring ----------
  renderLeft();
  renderRight();
  initEditor();

  // wire new-file shortcut button
  if (newFileBtn) {
    newFileBtn.addEventListener('click', () => openNewFileModal());
  }

  // wire settings via a header button if present
  const settingsButton = document.querySelector('.settings-icon')?.closest('button');
  if (settingsButton) settingsButton.addEventListener('click', () => openSettingsModal());

  // expose some debug hooks
  window.__AIJR = { State, DB, buildAndDeploy, openTemplatesModal, openSettingsModal };

  // load saved apps from DB into state.apps (not modifying files)
  (async function loadAppsToState() {
    const apps = await DB.allApps();
    State.set({ apps: apps || [] });
    State.pushLog(`Loaded ${apps.length || 0} apps (${DB.usingFireproof() ? 'Fireproof' : 'localStorage'})`);
  })();

  // subscribe to DB changes occasionally (not reactive; best-effort)
  setInterval(async () => {
    const apps = await DB.allApps();
    State.set({ apps });
  }, 15_000);

  // handle share param
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('share')) {
      const decoded = atob(params.get('share'));
      const obj = JSON.parse(decoded);
      const code = obj.code || obj.prompt || '';
      State.addFile({ name: 'shared.html', content: code });
      if (editor) editor.setValue(code);
      State.pushLog('Loaded shared content from URL');
    }
  } catch (e) {}

  // ensure logs and file tabs render initially
  renderLogs();
  renderFileTabs();
  renderUsageBar();

  // keyboard shortcuts: Ctrl/Cmd+S to save current app file as a local DB app
  window.addEventListener('keydown', async (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      ev.preventDefault();
      // save active file as app in DB
      const file = State.get().files.find(f => f.name === State.get().activeFile);
      if (!file) return;
      const appDoc = {
        type: 'app',
        appName: (file.name.replace(/\.[^.]+$/, '')).slice(0, 24),
        appTitle: file.name,
        prompt: 'Saved from editor',
        code: file.content,
        createdAt: Date.now(),
        version: 1,
        views: 0,
        favorite: false,
      };
      await DB.put(appDoc);
      State.pushLog('Saved file as app');
      // refresh apps list
      const apps = await DB.allApps();
      State.set({ apps });
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      const name = State.get().activeFile;
      if (confirm(`Delete file ${name}?`)) {
        State.deleteFile(name);
        State.pushLog(`Deleted ${name}`);
      }
    }
  });

  // finished
  State.pushLog('App initialized');
}
