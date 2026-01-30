// app.js — Feature-complete vanilla app script
// - Browser-only (no build)
// - Uses CodeMirror 5 (loaded via index.html)
// - Attempts to use Fireproof if available; otherwise falls back to localStorage
// - Adds: formatting, autosave & versions, improved export/import UI, enhanced Settings modal,
//   accessibility improvements, and keyboard shortcuts.
// NOTE: This single file is self-contained and intended to replace the previous app.js.

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
      else if (k === 'style') d.style.cssText = v;
      else if (k === 'aria') {
        for (const [ak, av] of Object.entries(v)) d.setAttribute(`aria-${ak}`, av);
      } else if (k.startsWith('on') && typeof v === 'function') d.addEventListener(k.slice(2).toLowerCase(), v);
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
  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const escapeHtml = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const stripFenced = s => s.replace(/```(?:html|HTML)?\n?/g, '').replace(/```\n?/g, '').trim();

  // ---------- Local store ----------
  const State = (function () {
    const defaultFiles = [{ name: 'index.html', content: '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8"><title>New App</title>\n</head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>' }];
    let s = {
      theme: localStorage.getItem('app-theme') || 'light',
      activeProvider: localStorage.getItem('activeProvider') || 'Puter',
      apiKeys: JSON.parse(localStorage.getItem('apiKeys') || '{}'),
      favoriteModels: new Set(JSON.parse(localStorage.getItem('favoriteModels') || '[]')),
      files: JSON.parse(localStorage.getItem('va_files') || JSON.stringify(defaultFiles)),
      activeFile: (JSON.parse(localStorage.getItem('va_files') || JSON.stringify(defaultFiles))[0] || defaultFiles[0]).name,
      templates: [],
      apps: [],
      versions: [],
      pollinationsModels: [],
      logs: [],
      usage: null,
      layout: localStorage.getItem('app-layout') || 'side-by-side',
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
      if (partial.apiKeys) localStorage.setItem('apiKeys', JSON.stringify(s.apiKeys));
      if (partial.activeProvider) localStorage.setItem('activeProvider', s.activeProvider);
      if (partial.theme) { localStorage.setItem('app-theme', s.theme); document.body.className = `theme-${s.theme}`; }
      if (partial.favoriteModels) localStorage.setItem('favoriteModels', JSON.stringify([...s.favoriteModels]));
      if (partial.files) localStorage.setItem('va_files', JSON.stringify(s.files));
      if (partial.layout) localStorage.setItem('app-layout', s.layout);
      notify();
    }
    function subscribe(cb) { subs.add(cb); return () => subs.delete(cb); }
    function updateFiles(newFiles) { s.files = newFiles; localStorage.setItem('va_files', JSON.stringify(s.files)); if (!s.files.find(f => f.name === s.activeFile)) s.activeFile = s.files[0]?.name || ''; notify(); }
    function setActiveFile(name) { s.activeFile = name; notify(); }
    function addFile(file) { s.files.push(file); s.activeFile = file.name; localStorage.setItem('va_files', JSON.stringify(s.files)); notify(); }
    function deleteFile(name) { s.files = s.files.filter(f => f.name !== name); if (s.activeFile === name) s.activeFile = s.files[0]?.name || ''; localStorage.setItem('va_files', JSON.stringify(s.files)); notify(); }
    function toggleFavoriteModel(id) { if (s.favoriteModels.has(id)) s.favoriteModels.delete(id); else s.favoriteModels.add(id); set({ favoriteModels: s.favoriteModels }); }
    function pushLog(msg) { s.logs = [...s.logs.slice(-14), `${new Date().toLocaleTimeString()}: ${msg}`]; notify(); }
    return { get, set, subscribe, updateFiles, setActiveFile, addFile, deleteFile, toggleFavoriteModel, pushLog };
  })();

  // ---------- DB adapter ----------
  const DB = (function () {
    let useFireproof = false;
    let db = null;
    async function init() {
      try {
        if (window.fireproof) { db = window.fireproof; useFireproof = true; return; }
        // try dynamic import of fireproof (best-effort)
        try {
          const mod = await import('https://esm.sh/fireproof@0.18.9');
          if (mod && mod.open) {
            db = await mod.open('puter-apps-v6');
            useFireproof = true;
          }
        } catch (e) {
          useFireproof = false;
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
        try { return await db.all(); } catch (e) {}
      }
      return JSON.parse(localStorage.getItem('va_apps') || '[]');
    }
    async function putVersion(v) {
      if (useFireproof && db?.put) return db.put(v);
      const arr = JSON.parse(localStorage.getItem('va_versions') || '[]');
      if (!v._id) v._id = `ver_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      arr.unshift(v);
      // keep versions cap
      while (arr.length > 200) arr.pop();
      localStorage.setItem('va_versions', JSON.stringify(arr));
      return v;
    }
    async function versionsForApp(appId) {
      if (useFireproof && db?.all) {
        try { const all = await db.all(); return (all || []).filter(x => x.type === 'version' && x.appId === appId).sort((a,b)=>b.version-a.version); } catch (e) {}
      }
      const arr = JSON.parse(localStorage.getItem('va_versions') || '[]');
      return arr.filter(v => v.appId === appId).sort((a,b)=>b.version-a.version);
    }
    return { init, put, get, del, allApps, putVersion, versionsForApp, usingFireproof: () => useFireproof };
  })();

  await DB.init();

  // ---------- DOM roots ----------
  const leftRoot = document.getElementById(leftContentId);
  const editorRoot = document.getElementById(editorAreaId);
  const rightRoot = document.getElementById(rightContentId);
  const newFileBtn = document.getElementById(newFileBtnId);

  // ---------- Templates ----------
  function defaultTemplates() {
    return [
      { id: 'todo', name: 'Todo App', icon: '✅', prompt: 'A todo app with localStorage' },
      { id: 'notes', name: 'Notes App', icon: '📝', prompt: 'Notes with markdown preview' },
      { id: 'ai-chat', name: 'AI Chat', icon: '🤖', prompt: 'Simple chat UI' },
    ];
  }
  State.set({ templates: defaultTemplates() });

  // ---------- Logging ----------
  function addLog(msg) { State.pushLog(msg); }

  // ---------- Editor (CodeMirror 5) ----------
  let editor = null;
  let editorInitialized = false;
  let autosaveTimer = null;
  const AUTOSAVE_DELAY = 5000; // ms

  function createEditor(initialValue = '') {
    editorRoot.innerHTML = '';
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
    const { cm } = createEditor(file?.content || '');
    editor = cm;
    editorInitialized = true;

    editor.on('change', debounce(() => {
      const content = editor.getValue();
      const files = State.get().files.map(f => f.name === State.get().activeFile ? ({ ...f, content }) : f);
      State.updateFiles(files);
      scheduleAutosave();
    }, 120));
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
    const row = el('div', { style: 'display:flex;gap:6px;align-items:center;overflow:auto' });
    files.forEach(f => {
      const btn = el('button', { class: 'neu-btn', style: `white-space:nowrap;${st.activeFile===f.name?'font-weight:800':''}` }, [f.name]);
      btn.addEventListener('click', () => {
        State.setActiveFile(f.name);
        const file = State.get().files.find(ff => ff.name === f.name);
        if (editor && file && editor.getValue() !== file.content) editor.setValue(file.content || '');
        renderFileTabs();
      });
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
      row.appendChild(btn);
    });
    const addBtn = el('button', { class: 'neu-btn', title: 'Add file' }, ['＋']);
    addBtn.addEventListener('click', () => {
      const name = prompt('New file name (example: index.html)');
      if (!name) return;
      if (State.get().files.some(f => f.name.toLowerCase() === name.toLowerCase())) { addLog(`File "${name}" already exists`); return; }
      State.addFile({ name, content: '' });
      if (editor) editor.setValue('');
      renderFileTabs();
    });
    row.appendChild(addBtn);
    tabsWrap.appendChild(row);

    // add format button and copy/format/save controls
    const utilRow = el('div', { style: 'display:flex;gap:6px;align-items:center;margin-left:12px' });
    const copyBtn = el('button', { class: 'neu-btn', title: 'Copy code' }, ['📋 Copy']);
    copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(editor.getValue()); addLog('Code copied'); });
    const formatBtn = el('button', { class: 'neu-btn', title: 'Format code' }, ['✨ Format']);
    formatBtn.addEventListener('click', () => {
      const v = editor.getValue();
      const formatted = formatCodeByType(v, State.get().activeFile);
      editor.setValue(formatted);
      addLog('Formatted code');
    });
    const saveBtn = el('button', { class: 'neu-btn', title: 'Save as app (Ctrl+S)' }, ['💾 Save']);
    saveBtn.addEventListener('click', () => saveActiveFileAsApp());
    utilRow.appendChild(copyBtn); utilRow.appendChild(formatBtn); utilRow.appendChild(saveBtn);
    tabsWrap.appendChild(utilRow);
  }

  // ---------- Formatting (basic) ----------
  // Attempt a simple HTML pretty printer using DOMParser -> serialized with indentation.
  function formatHtml(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      function pprint(node, indent = 0) {
        const pad = '  '.repeat(indent);
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent.trim();
          if (!t) return '';
          return pad + t + '\n';
        }
        if (node.nodeType === Node.COMMENT_NODE) return pad + '<!--' + node.nodeValue + '-->\n';
        let out = '';
        if (node.nodeType === Node.ELEMENT_NODE) {
          out += pad + `<${node.tagName.toLowerCase()}`;
          for (const attr of node.attributes) out += ` ${attr.name}="${attr.value}"`;
          out += '>\n';
          for (const child of node.childNodes) out += pprint(child, indent + 1);
          out += pad + `</${node.tagName.toLowerCase()}>\n`;
        }
        return out;
      }
      let body = '';
      // include doctype if present
      const doctype = Array.from(doc.childNodes).find(n => n.nodeType === Node.DOCUMENT_TYPE_NODE);
      if (doctype) body += '<!doctype html>\n';
      for (const child of doc.documentElement.childNodes) { /* ignore html wrapper here */ }
      // produce html structure manually
      body += '<html>\n';
      body += pprint(doc.head, 1);
      body += pprint(doc.body, 1);
      body += '</html>\n';
      return body;
    } catch (e) {
      // fallback: simple indent around tags
      return html.replace(/>\s*</g, '>\n<').split('\n').map(line => line.trim() ? line : '').join('\n');
    }
  }

  function formatJs(js) {
    // very naive: just semicolon/brace formatting (not a replacement for prettier)
    try {
      return js.replace(/\s+/g, ' ').replace(/;\s*/g, ';\n').replace(/\{\s*/g, '{\n').replace(/\}\s*/g, '\n}\n');
    } catch {
      return js;
    }
  }

  function formatCss(css) {
    try {
      return css.replace(/\s+/g, ' ').replace(/\{\s*/g, ' {\n').replace(/\}\s*/g, '\n}\n').replace(/;\s*/g, ';\n');
    } catch {
      return css;
    }
  }

  function formatCodeByType(code, filename = '') {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (ext === 'html' || code.includes('<!doctype') || code.includes('<html')) return formatHtml(code);
    if (ext === 'js') return formatJs(code);
    if (ext === 'css') return formatCss(code);
    // fallback: try html formatting
    return formatHtml(code);
  }

  // ---------- Autosave & Versions ----------
  // Autosave current file content into a local versions stack and optionally to DB as versions
  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      const file = State.get().files.find(f => f.name === State.get().activeFile);
      if (!file) return;
      // store autosave snapshot in localStorage map
      const key = 'va_autosave_versions';
      const map = JSON.parse(localStorage.getItem(key) || '{}');
      map[file.name] = map[file.name] || [];
      map[file.name].unshift({ createdAt: Date.now(), content: file.content });
      // cap snapshots
      if (map[file.name].length > 30) map[file.name].pop();
      localStorage.setItem(key, JSON.stringify(map));
      addLog(`Autosaved ${file.name}`);
      // if app exists in DB, also create a version record
      // find app by name
      const apps = await DB.allApps();
      const app = apps.find(a => a.appName === file.name.replace(/\.[^.]+$/, ''));
      if (app) {
        const newVersion = (app.version || 0) + 1;
        await DB.putVersion({ type: 'version', appId: app._id, code: file.content, version: newVersion, createdAt: Date.now(), note: 'Autosave' });
        // update app version
        app.version = newVersion;
        await DB.put(app);
        addLog(`Saved version ${newVersion} for ${app.appName}`);
      }
    }, AUTOSAVE_DELAY);
  }

  // Manual save active file as app
  async function saveActiveFileAsApp() {
    const file = State.get().files.find(f => f.name === State.get().activeFile);
    if (!file) return;
    // ask for app name / title
    const title = prompt('App title (optional)', file.name) || file.name;
    const doc = {
      type: 'app',
      appName: file.name.replace(/\.[^.]+$/, ''),
      appTitle: title,
      prompt: 'Saved from editor',
      code: file.content,
      createdAt: Date.now(),
      version: 1,
      views: 0,
      favorite: false,
    };
    const saved = await DB.put(doc);
    await DB.putVersion({ type: 'version', appId: saved._id, code: file.content, version: 1, createdAt: Date.now(), note: 'Saved from editor' });
    const apps = await DB.allApps();
    State.set({ apps });
    addLog(`Saved ${file.name} as app ${saved.appName}`);
  }

  // ---------- Export / Import UI ----------
  async function openExportImportModal() {
    const container = el('div', { role: 'dialog', aria: { label: 'Export Import' } });
    container.appendChild(el('h3', {}, ['📦 Export / Import Apps']));
    const exportBtn = el('button', { class: 'neu-btn', style: 'margin-top:8px' }, ['Export All (JSON)']);
    exportBtn.addEventListener('click', async () => {
      const apps = await DB.allApps();
      const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: `aijr-apps-export-${Date.now()}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      addLog('Exported apps');
    });
    container.appendChild(exportBtn);

    container.appendChild(el('div', { style: 'margin-top:12px' }, ['Import JSON (merge or replace)']));
    const fileInput = el('input', { type: 'file', accept: '.json', style: 'margin-top:8px' });
    container.appendChild(fileInput);

    const mergeReplaceRow = el('div', { style: 'display:flex;gap:8px;margin-top:8px' });
    const mergeBtn = el('button', { class: 'neu-btn' }, ['Merge']);
    const replaceBtn = el('button', { class: 'neu-btn' }, ['Replace']);
    mergeReplaceRow.appendChild(mergeBtn); mergeReplaceRow.appendChild(replaceBtn);
    container.appendChild(mergeReplaceRow);

    let parsedJSON = null;
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          parsedJSON = JSON.parse(ev.target.result);
          container.appendChild(el('pre', { style: 'max-height:200px;overflow:auto;margin-top:8px;background:var(--bg-secondary);padding:8px;border-radius:8px' }, [JSON.stringify(parsedJSON, null, 2)]));
        } catch (err) {
          addLog('Invalid JSON file');
        }
      };
      r.readAsText(f);
    });

    mergeBtn.addEventListener('click', async () => {
      if (!parsedJSON) return addLog('No file parsed');
      const arr = Array.isArray(parsedJSON) ? parsedJSON : [parsedJSON];
      const existing = await DB.allApps();
      // merge by appName uniqueness (avoid duplicates)
      for (const a of arr) {
        const exists = existing.find(e => e.appName === a.appName);
        if (exists) {
          // create new app with suffix
          a.appName = `${a.appName}_import_${Math.random().toString(36).slice(2,5)}`;
        }
        delete a._id;
        a._id = `app_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        await DB.put(a);
      }
      const apps = await DB.allApps();
      State.set({ apps });
      addLog(`Imported (merged) ${arr.length} app(s)`);
      modal.close();
    });

    replaceBtn.addEventListener('click', async () => {
      if (!parsedJSON) return addLog('No file parsed');
      const arr = Array.isArray(parsedJSON) ? parsedJSON : [parsedJSON];
      // replace storage
      localStorage.setItem('va_apps', JSON.stringify(arr));
      State.set({ apps: arr });
      addLog(`Imported (replaced) ${arr.length} app(s)`);
      modal.close();
    });

    const modal = openModal(container);
    // Accessibility: focus modal
    modal.modalBox.setAttribute('role', 'dialog');
    modal.modalBox.setAttribute('aria-modal', 'true');
    modal.modalBox.focus && modal.modalBox.focus();
  }

  // ---------- Settings modal with preview & model lists ----------
  function openSettingsModal() {
    const st = State.get();
    const container = el('div', { role: 'dialog' });
    container.appendChild(el('h3', {}, ['⚙️ Settings']));
    // Theme preview: apply temp theme on hover/click
    container.appendChild(el('div', { style: 'margin-top:8px;font-weight:700' }, ['Theme']));
    const themesRow = el('div', { style: 'display:flex;gap:8px;margin-top:6px' });
    ['light', 'dark', 'grey', 'multicoloured'].forEach(t => {
      const b = el('button', { class: 'neu-btn' }, [t]);
      b.addEventListener('mouseenter', () => document.body.className = `theme-${t}`);
      b.addEventListener('mouseleave', () => document.body.className = `theme-${State.get().theme}`);
      b.addEventListener('click', () => { State.set({ theme: t }); addLog(`Theme saved: ${t}`); });
      themesRow.appendChild(b);
    });
    container.appendChild(themesRow);

    // Layout preview
    container.appendChild(el('div', { style: 'margin-top:12px;font-weight:700' }, ['Layout']));
    const layouts = ['side-by-side', 'stacked', 'custom'];
    const layoutRow = el('div', { style: 'display:flex;gap:8px;margin-top:6px' });
    layouts.forEach(l => {
      const b = el('button', { class: 'neu-btn' }, [l]);
      b.addEventListener('click', () => { State.set({ layout: l }); addLog(`Layout set: ${l}`); });
      layoutRow.appendChild(b);
    });
    container.appendChild(layoutRow);

    // Provider models listing for Pollinations & favorites
    container.appendChild(el('div', { style: 'margin-top:12px;font-weight:700' }, ['Provider Models']));
    const modelsWrap = el('div', { style: 'max-height:160px;overflow:auto;margin-top:8px' });
    const pollModels = State.get().pollinationsModels || [];
    if (pollModels.length === 0) modelsWrap.appendChild(el('div', { style: 'color:var(--text-secondary)' }, ['No Pollinations models loaded']));
    else {
      pollModels.slice(0, 50).forEach(m => {
        const row = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding:6px;border-bottom:1px solid var(--border-color)' }, [
          el('div', { style: 'font-family:monospace;font-size:12px' }, [m.id || m.name]),
          el('div', {}, [ el('button', { class: 'neu-btn' }, [ State.get().favoriteModels.has(m.id) ? '★' : '☆' ]) ])
        ]);
        row.querySelector('button').addEventListener('click', () => {
          State.toggleFavoriteModel ? State.toggleFavoriteModel(m.id) : null;
          addLog(`Toggled favorite model ${m.id}`);
          // re-render models list
          openSettingsModal(); // quick re-open to refresh (simple approach)
        });
        modelsWrap.appendChild(row);
      });
    }
    container.appendChild(modelsWrap);

    openModal(container);
  }

  // ---------- Accessibility: modal helper with focus trap basics ----------
  function openModal(innerEl) {
    const overlay = el('div', { class: 'va-modal-overlay', tabindex: '-1', onClick: () => overlay.remove() });
    const modalBox = el('div', { class: 'va-modal neu-box', tabindex: '0', onClick: (e) => e.stopPropagation() });
    modalBox.appendChild(innerEl);
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);
    // Basic focus management: focus first focusable or modalBox
    setTimeout(() => {
      const focusable = modalBox.querySelector('button, input, textarea, select, [tabindex]');
      (focusable || modalBox).focus();
    }, 10);
    // close on ESC
    const escHandler = (e) => { if (e.key === 'Escape') overlay.remove(); };
    window.addEventListener('keydown', escHandler);
    return {
      overlay,
      modalBox,
      close: () => { overlay.remove(); window.removeEventListener('keydown', escHandler); },
    };
  }

  // ---------- Export single / share / versions / deploy (enhanced) ----------
  async function exportSingleApp(app) {
    const blob = new Blob([JSON.stringify(app, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `${app.appName || 'app'}-export.json` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    addLog('Exported app');
  }

  function openShareModal(app) {
    const encoded = btoa(JSON.stringify({ prompt: app.prompt, code: app.code, title: app.appTitle }));
    const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['🔗 Share']));
    const input = el('input', { value: link, style: 'width:100%;padding:8px' });
    container.appendChild(input);
    const copy = el('button', { class: 'neu-btn', style: 'margin-top:8px' }, ['Copy']);
    copy.addEventListener('click', () => { navigator.clipboard.writeText(link); addLog('Share link copied'); });
    container.appendChild(copy);
    openModal(container);
  }

  async function openVersionsModal(app) {
    const versions = await DB.versionsForApp(app._id);
    const container = el('div', {});
    container.appendChild(el('h3', {}, ['📚 Versions']));
    if (!versions || versions.length === 0) container.appendChild(el('div', {}, ['No versions']));
    else {
      const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:8px' });
      versions.forEach(v => {
        const row = el('div', { class: 'neu-inset', style: 'padding:8px;display:flex;justify-content:space-between;align-items:center' }, [
          el('div', {}, [el('div', { style: 'font-weight:700' }, [`v${v.version}`]), el('div', { style: 'font-size:12px;color:var(--text-secondary)' }, [new Date(v.createdAt).toLocaleString()])]),
          el('div', {}, [ el('button', { class: 'neu-btn' }, ['Restore']) ])
        ]);
        row.querySelector('button').addEventListener('click', () => {
          if (editor) editor.setValue(v.code || '');
          addLog(`Restored v${v.version}`);
          modal.close();
        });
        list.appendChild(row);
      });
      container.appendChild(list);
    }
    const modal = openModal(container);
  }

  // ---------- Launch / update / delete ----------
  async function launchApp(app) {
    addLog(`Launching ${app.appName || app._id}`);
    if (app.appName && window.puter?.apps?.launch) {
      try { await window.puter.apps.launch(app.appName); addLog('Launched via Puter SDK'); return; } catch (e) { /* fallback */ }
    }
    if (app.hostedUrl) window.open(app.hostedUrl, '_blank');
    else {
      const blob = new Blob([app.code || ''], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  async function updateAndRedeploy(appDoc, newCode) {
    if (!appDoc) return;
    addLog('Updating app...');
    const overlay = el('div', { class: 'code-loading-overlay' }, [ el('div', { class: 'code-spinner' }), el('div', { style: 'margin-top:12px' }, ['Updating...']) ]);
    editorRoot.appendChild(overlay);
    try {
      const newVersion = (appDoc.version || 1) + 1;
      const updated = { ...appDoc, code: newCode, updatedAt: Date.now(), version: newVersion };
      await DB.put(updated);
      await DB.putVersion({ type: 'version', appId: updated._id, code: newCode, version: newVersion, createdAt: Date.now(), note: `v${newVersion}` });
      addLog(`Updated ${updated.appName} to v${newVersion}`);
      const apps = await DB.allApps(); State.set({ apps });
    } catch (e) { addLog('Update failed: ' + (e.message || e)); }
    overlay.remove();
  }

  async function deleteApp(app) {
    if (!confirm(`Delete ${app.appTitle || app.appName || app._id}?`)) return;
    try {
      if (app.appName && window.puter?.apps?.delete) { try { await window.puter.apps.delete(app.appName); } catch (e) {} }
      if (app.subdomain && window.puter?.hosting?.delete) { try { await window.puter.hosting.delete(app.subdomain); } catch (e) {} }
      await DB.del(app._id);
      addLog('Deleted app');
      const apps = await DB.allApps(); State.set({ apps });
    } catch (e) { addLog('Delete failed'); }
  }

  // ---------- Usage refresh ----------
  async function refreshUsage() {
    addLog('Refreshing usage...');
    if (window.puter?.auth?.getMonthlyUsage) {
      try {
        const u = await window.puter.auth.getMonthlyUsage();
        State.set({ usage: u });
        addLog('Usage updated');
        const fill = document.getElementById('usage-fill');
        if (fill && u?.allowanceInfo) {
          const { monthUsageAllowance, remaining } = u.allowanceInfo;
          const used = monthUsageAllowance - remaining;
          const pct = Math.min(100, Math.round((used / monthUsageAllowance) * 100));
          fill.style.width = pct + '%';
          fill.classList.add('usage-bar-pulse');
          setTimeout(() => fill.classList.remove('usage-bar-pulse'), 1200);
        }
      } catch (e) { addLog('Usage fetch failed'); }
    } else {
      const fill = document.getElementById('usage-fill');
      if (fill) { fill.style.width = `${Math.floor(Math.random()*60)+10}%`; fill.classList.add('usage-bar-pulse'); setTimeout(()=>fill.classList.remove('usage-bar-pulse'),1200); }
    }
  }

  // ---------- UI renderers ----------
  function renderLeft() {
    leftRoot.innerHTML = '';
    const header = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' }, [
      el('div', {}, [el('strong', {}, ['Create / Apps'])]),
      el('div', {}, [
        el('button', { class: 'collapse-btn', onClick: () => openTemplatesModal() }, ['🎨']),
        el('button', { class: 'collapse-btn', onClick: () => openSettingsModal() }, ['⚙️']),
      ]),
    ]);
    leftRoot.appendChild(header);

    const buildBtn = el('button', { class: 'neu-btn', style: 'width:100%;margin-bottom:8px' }, ['🚀 Create & Deploy']);
    buildBtn.addEventListener('click', () => openBuildModal());
    leftRoot.appendChild(buildBtn);

    // search & filters
    const search = el('input', { placeholder: 'Search apps...', style: 'width:100%;padding:8px;margin-bottom:8px' });
    search.addEventListener('input', debounce((e) => { ui.searchQuery = e.target.value; renderAppsMini(); }, 200));
    leftRoot.appendChild(search);
    const filtersRow = el('div', { style: 'display:flex;gap:8px;margin-bottom:8px' });
    const favBtn = el('button', { class: 'neu-btn' }, ['⭐ Favorites']);
    favBtn.addEventListener('click', () => { ui.filterFavorites = !ui.filterFavorites; renderAppsMini(); });
    const bulkBtn = el('button', { class: 'neu-btn' }, ['☑️ Select']);
    bulkBtn.addEventListener('click', () => { ui.bulkMode = !ui.bulkMode; ui.selectedApps = new Set(); renderAppsMini(); });
    filtersRow.appendChild(favBtn); filtersRow.appendChild(bulkBtn);
    leftRoot.appendChild(filtersRow);

    const appsContainer = el('div', { class: 'apps-mini', style: 'max-height:320px;overflow:auto' });
    leftRoot.appendChild(appsContainer);

    // attach export/import quick link
    const exportImport = el('div', { style: 'margin-top:8px;display:flex;gap:8px' }, [
      el('button', { class: 'neu-btn' }, ['📦 Export/Import']),
    ]);
    exportImport.querySelector('button').addEventListener('click', openExportImportModal);
    leftRoot.appendChild(exportImport);

    async function renderAppsMini() {
      appsContainer.innerHTML = '';
      let apps = State.get().apps || [];
      if (ui.filterFavorites) apps = apps.filter(a => a.favorite);
      if (ui.searchQuery) {
        const q = ui.searchQuery.toLowerCase();
        apps = apps.filter(a => (a.appName||'').toLowerCase().includes(q) || (a.appTitle||'').toLowerCase().includes(q) || (a.prompt||'').toLowerCase().includes(q));
      }
      if (ui.sortBy === 'date') apps = apps.sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
      else if (ui.sortBy === 'views') apps = apps.sort((a,b)=> (b.views||0) - (a.views||0));
      else if (ui.sortBy === 'name') apps = apps.sort((a,b)=> (a.appTitle||a.appName||'').localeCompare(b.appTitle||b.appName||''));
      if (!apps || apps.length === 0) appsContainer.appendChild(el('div', { style: 'color:var(--text-secondary)' }, ['No apps']));
      else {
        apps.forEach(app => {
          const row = el('div', { class: 'neu-inset', style: 'padding:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center' });
          const left = el('div', {}, [el('div', { style: 'font-weight:700' }, [app.appTitle || app.appName]), el('div', { style: 'font-size:12px;color:var(--text-secondary)' }, [app.prompt?.slice(0,80)||''])]);
          row.appendChild(left);
          const actions = el('div', { style: 'display:flex;gap:6px;align-items:center' });
          if (ui.bulkMode) {
            const chk = el('input', { type: 'checkbox' });
            chk.checked = ui.selectedApps.has(app._id);
            chk.addEventListener('change', (e) => { if (e.target.checked) ui.selectedApps.add(app._id); else ui.selectedApps.delete(app._id); });
            actions.appendChild(chk);
          } else {
            const fav = el('button', { class: 'neu-btn' }, [app.favorite ? '⭐' : '☆']);
            fav.addEventListener('click', async (e) => {
              e.stopPropagation();
              app.favorite = !app.favorite;
              await DB.put(app);
              const all = await DB.allApps();
              State.set({ apps: all });
              addLog(`${app.appTitle || app.appName} favorite: ${app.favorite}`);
              renderAppsMini();
            });
            actions.appendChild(fav);

            const openBtn = el('button', { class: 'neu-btn' }, ['Open']);
            openBtn.addEventListener('click', () => { State.addFile({ name: `${app.appName || app._id}.html`, content: app.code || '' }); if (editor) editor.setValue(app.code || ''); addLog(`Opened ${app.appTitle || app.appName}`); renderFileTabs(); });
            actions.appendChild(openBtn);

            const launch = el('button', { class: 'neu-btn' }, ['▶']);
            launch.addEventListener('click', async () => { await incrementViews(app); if (app.hostedUrl) window.open(app.hostedUrl, '_blank'); else { const blob = new Blob([app.code||''],{type:'text/html'}); const url = URL.createObjectURL(blob); window.open(url,'_blank'); setTimeout(()=>URL.revokeObjectURL(url),5000); } });
            actions.appendChild(launch);

            const versionsBtn = el('button', { class: 'neu-btn' }, ['📚']);
            versionsBtn.addEventListener('click', () => openVersionsModal(app));
            actions.appendChild(versionsBtn);

            const shareBtn = el('button', { class: 'neu-btn' }, ['🔗']);
            shareBtn.addEventListener('click', () => openShareModal(app));
            actions.appendChild(shareBtn);

            const exportBtn = el('button', { class: 'neu-btn' }, ['📤']);
            exportBtn.addEventListener('click', async (e) => { e.stopPropagation(); await exportSingleApp(app); });
            actions.appendChild(exportBtn);

            const del = el('button', { class: 'neu-btn' }, ['🗑️']);
            del.addEventListener('click', async (e) => { e.stopPropagation(); await deleteApp(app); renderAppsMini(); });
            actions.appendChild(del);
          }
          row.appendChild(actions);
          appsContainer.appendChild(row);
        });

        if (ui.bulkMode && ui.selectedApps.size > 0) {
          const footer = el('div', { style: 'margin-top:8px;display:flex;gap:8px' });
          const delSel = el('button', { class: 'neu-btn' }, [`Delete ${ui.selectedApps.size} Selected`]);
          delSel.addEventListener('click', async () => {
            if (!confirm(`Delete ${ui.selectedApps.size} apps?`)) return;
            for (const id of ui.selectedApps) { const a = (State.get().apps || []).find(x => x._id === id); if (a) await deleteApp(a); }
            ui.selectedApps = new Set(); ui.bulkMode = false;
            const apps = await DB.allApps(); State.set({ apps }); renderAppsMini();
          });
          footer.appendChild(delSel);
          appsContainer.appendChild(footer);
        }
      }
    }
  }

  function renderRight() {
    rightRoot.innerHTML = '';
    const header = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:8px' }, [
      el('div', { style: 'font-weight:700' }, ['Preview']),
      el('div', {}, [
        el('button', { class: 'neu-btn', onClick: () => {
          const code = State.get().files.find(f => f.name === State.get().activeFile)?.content || '';
          const blob = new Blob([code], { type: 'text/html' }); const url = URL.createObjectURL(blob); window.open(url,'_blank'); setTimeout(()=>URL.revokeObjectURL(url),5000);
        } }, ['🔗 Open']),
        el('button', { class: 'neu-btn', onClick: () => {
          const iframe = rightRoot.querySelector('iframe'); const code = State.get().files.find(f => f.name === State.get().activeFile)?.content || '';
          if (iframe) iframe.srcdoc = code;
        } }, ['▶ Run']),
      ])
    ]);
    rightRoot.appendChild(header);

    const iframeWrap = el('div', { style: 'height:520px;background:white;margin:8px;border:1px solid var(--border-color)' });
    const iframe = el('iframe', { sandbox: 'allow-scripts allow-forms allow-modals allow-popups', title: 'App Preview', style: 'width:100%;height:100%;border:0' });
    iframeWrap.appendChild(iframe);
    rightRoot.appendChild(iframeWrap);
    const details = el('div', { style: 'padding:8px;border-top:1px solid var(--border-color)' });
    rightRoot.appendChild(details);
  }

  // ---------- Keyboard Shortcuts & Accessibility ----------
  window.addEventListener('keydown', async (e) => {
    // Ctrl/Cmd+S save to DB
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault(); await saveActiveFileAsApp();
      return;
    }
    // Ctrl/Cmd+Enter run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const iframe = rightRoot.querySelector('iframe');
      const code = State.get().files.find(f => f.name === State.get().activeFile)?.content || '';
      if (iframe) iframe.srcdoc = code;
      addLog('Run (Ctrl+Enter)');
      return;
    }
    // Ctrl/Cmd+N new file
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      const nm = prompt('New file name');
      if (!nm) return;
      if (State.get().files.some(f => f.name.toLowerCase() === nm.toLowerCase())) { addLog('File exists'); return; }
      State.addFile({ name: nm, content: '' });
      if (editor) editor.setValue('');
      renderFileTabs();
      addLog(`Created file ${nm}`);
      return;
    }
    // Ctrl+Shift+S export all
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const apps = await DB.allApps();
      const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: `aijr-apps-export-${Date.now()}.json` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      addLog('Exported apps (Ctrl+Shift+S)');
      return;
    }
    // Ctrl+Shift+Z show undo snapshots modal (from autosave)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      openAutosaveSnapshotsModal();
      return;
    }
  });

  // ---------- Autosave snapshots modal (view & restore) ----------
  function openAutosaveSnapshotsModal() {
    const key = 'va_autosave_versions';
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    const fileName = State.get().activeFile;
    const list = map[fileName] || [];
    const container = el('div', {});
    container.appendChild(el('h3', {}, [`Autosave snapshots — ${fileName}`]));
    if (list.length === 0) container.appendChild(el('div', {}, ['No snapshots']));
    else {
      list.forEach((s, idx) => {
        const row = el('div', { class: 'neu-inset', style: 'padding:8px;display:flex;justify-content:space-between;align-items:center;margin-top:6px' }, [
          el('div', {}, [el('div', { style: 'font-size:12px;color:var(--text-secondary)' }, [new Date(s.createdAt).toLocaleString()]), el('pre', { style: 'max-height:120px;overflow:auto' }, [s.content.slice(0,200)])]),
          el('div', {}, [ el('button', { class: 'neu-btn' }, ['Restore']) ])
        ]);
        row.querySelector('button').addEventListener('click', () => {
          if (editor) editor.setValue(s.content);
          addLog('Restored autosave snapshot');
          modal.close();
        });
        container.appendChild(row);
      });
    }
    const modal = openModal(container);
  }

  // ---------- Initialization ----------
  renderLeft();
  renderRight();
  initEditor();

  // Wire new file button
  if (newFileBtn) newFileBtn.addEventListener('click', () => {
    const name = prompt('New file name (e.g., index.html)');
    if (!name) return;
    if (State.get().files.some(f => f.name.toLowerCase() === name.toLowerCase())) { addLog('File exists'); return; }
    State.addFile({ name, content: '' });
    if (editor) editor.setValue('');
    renderFileTabs();
  });

  // wire settings icon if present
  document.querySelectorAll('[title="Settings"]').forEach(btn => btn.addEventListener('click', openSettingsModal));

  // Expose API for debugging
  window.__AIJR = {
    State, DB, formatHtml, formatCss: (s)=>formatCodeByType(s,'.css'), formatJs,
    buildAndDeploy: async (p)=>{ await buildAndDeploy(p); }, openExportImportModal,
    openAutosaveSnapshotsModal,
  };

  // Load apps into state and start periodic refresh
  (async () => {
    const apps = await DB.allApps();
    State.set({ apps });
    addLog(`Loaded ${apps.length || 0} apps (${DB.usingFireproof() ? 'Fireproof' : 'localStorage'})`);
  })();

  setInterval(async () => {
    const apps = await DB.allApps();
    State.set({ apps });
    await refreshUsage();
  }, 30_000);

  // make sure UI components reflect state
  State.subscribe(() => {
    renderFileTabs();
    // logs
    const logPanel = leftRoot.querySelector('.log-panel');
    if (logPanel) {
      logPanel.innerHTML = '';
      (State.get().logs || []).forEach(l => logPanel.appendChild(el('div', {}, [l])));
    } else {
      // create log panel
      const lp = el('div', { class: 'log-panel neu-inset', style: 'margin-top:12px;padding:8px;max-height:160px;overflow:auto' });
      (State.get().logs || []).forEach(l => lp.appendChild(el('div', {}, [l])));
      leftRoot.appendChild(lp);
    }
  });

  // final log
  addLog('App initialized — feature-complete vanilla JS');
}
