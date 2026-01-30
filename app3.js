// app3.js — Chunk 3 (approx lines 1000-1500 of script.jsx converted to vanilla JS)
// Adds: Editor area (file tabs, multi-file support), formatting, autosave & versions,
// keyboard shortcuts (Ctrl+S, Ctrl+Enter, Ctrl+N), preview run wiring.
// Loads after app.js and app2.js. Integrates via window.AIJR.

(function () {
  // Small helpers (local)
  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    for (const c of children) {
      if (c == null) continue;
      if (typeof c === "string" || typeof c === "number") n.appendChild(document.createTextNode(String(c)));
      else n.appendChild(c);
    }
    return n;
  }
  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function saveJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }
  function loadJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch { return fallback; } }

  // Get middle and right panels created by previous chunk
  const middle = qs("#aijr-middle");
  const right = qs("#aijr-right");
  const left = qs("#aijr-left");
  const pushLog = (window.AIJR && window.AIJR.pushLog) ? window.AIJR.pushLog : (m)=>console.log(m);

  // Files store (persisted)
  let files = loadJSON("jr_files", [{ name: "index.html", content: "<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\"><title>New App</title>\n</head>\n<body>\n<h1>Hello</h1>\n</body>\n</html>" }]);
  saveJSON("jr_files", files); // ensure key exists
  window.AIJR.files = files;

  // Active file name
  let activeFile = files[0].name;

  // Autosave snapshots map key -> [{ createdAt, content }]
  const AUTOSAVE_KEY = "jr_autosave_versions";

  // --- Editor UI ---
  function buildEditorUI() {
    middle.innerHTML = "";
    const wrapper = el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });

    // Header: file tabs + utilities
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } });
    const tabs = el("div", { id: "editor-file-tabs", style: { display: "flex", gap: "6px", overflowX: "auto" } });
    header.appendChild(tabs);

    const utils = el("div", { style: { display: "flex", gap: "6px", alignItems: "center" } });
    const copyBtn = el("button", { class: "neu-btn", onclick: () => { navigator.clipboard.writeText(editor.value); pushLog("Code copied"); } }, "📋 Copy");
    const formatBtn = el("button", { class: "neu-btn", onclick: () => { editor.value = formatCodeByType(editor.value, activeFile); pushLog("Formatted code"); scheduleAutosave(); renderCharCount(); } }, "✨ Format");
    const saveAsAppBtn = el("button", { class: "neu-btn-black", onclick: () => saveActiveFileAsApp() }, "💾 Save as App");
    utils.appendChild(copyBtn); utils.appendChild(formatBtn); utils.appendChild(saveAsAppBtn);
    header.appendChild(utils);

    wrapper.appendChild(header);

    // Editor area (textarea)
    const editorWrap = el("div", { style: { background: "white", border: "1px solid var(--border-color,#d1d1d1)", borderRadius: "12px", height: "520px", position: "relative" } });
    const editorEl = el("textarea", { id: "jr-editor", style: { width: "100%", height: "100%", padding: "12px", boxSizing: "border-box", fontFamily: "monospace", fontSize: "13px", border: "0", outline: "0", resize: "none" } });
    editorWrap.appendChild(editorEl);
    const charCount = el("div", { id: "jr-charcount", style: { position: "absolute", right: "8px", bottom: "8px", fontSize: "12px", color: "var(--text-secondary,#666)" } }, "0 chars");
    editorWrap.appendChild(charCount);
    wrapper.appendChild(editorWrap);

    middle.appendChild(wrapper);

    // Keep reference
    editor = editorEl;
    renderFileTabs();
    editor.value = getActiveFileContent();
    renderCharCount();

    // Editor change handling
    let changeTimer = null;
    editor.addEventListener("input", () => {
      // update files array
      files = files.map(f => f.name === activeFile ? { ...f, content: editor.value } : f);
      saveJSON("jr_files", files);
      window.AIJR.files = files;
      renderCharCount();
      scheduleAutosave();
    });
  }

  // Editor variable
  let editor = null;

  function renderFileTabs() {
    const tabs = qs("#editor-file-tabs");
    if (!tabs) return;
    tabs.innerHTML = "";
    files.forEach(f => {
      const tab = el("button", { class: activeFile === f.name ? "neu-inset" : "neu-btn", style: { whiteSpace: "nowrap", paddingRight: "20px", position: "relative" }, onclick: () => switchFile(f.name) }, f.name);
      if (files.length > 1) {
        const del = el("button", { style: { position: "absolute", right: "2px", top: "2px", width: "18px", height: "18px", borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer" }, onclick: (e) => { e.stopPropagation(); deleteFile(f.name); } }, "×");
        tab.appendChild(del);
      }
      tabs.appendChild(tab);
    });
    const addBtn = el("button", { class: "neu-btn", onclick: () => window.AIJR.openNewFileModal() }, "＋");
    tabs.appendChild(addBtn);
  }

  function switchFile(name) {
    // save current content already done on input
    activeFile = name;
    const f = files.find(x => x.name === name);
    if (f && editor) editor.value = f.content || "";
    renderFileTabs();
    renderCharCount();
  }

  function getActiveFileContent() {
    const f = files.find(x => x.name === activeFile);
    return f ? (f.content || "") : "";
  }

  // Formatting helpers (basic)
  function formatHtml(html) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      function walk(node, depth = 0) {
        const pad = "  ".repeat(depth);
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent.trim();
          if (!t) return "";
          return pad + t + "\n";
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          let s = pad + `<${node.tagName.toLowerCase()}`;
          for (const attr of node.attributes) s += ` ${attr.name}="${attr.value}"`;
          s += ">\n";
          for (const child of node.childNodes) s += walk(child, depth + 1);
          s += pad + `</${node.tagName.toLowerCase()}>\n`;
          return s;
        }
        return "";
      }
      let out = "<!doctype html>\n";
      out += "<html>\n";
      out += walk(doc.head, 1);
      out += walk(doc.body, 1);
      out += "</html>\n";
      return out;
    } catch {
      return html.replace(/>\s*</g, ">\n<");
    }
  }
  function formatJs(js) {
    return js.replace(/\s+/g, " ").replace(/;\s*/g, ";\n").replace(/\{\s*/g, "{\n").replace(/\}\s*/g, "\n}\n");
  }
  function formatCss(css) {
    return css.replace(/\s+/g, " ").replace(/\{\s*/g, " {\n").replace(/\}\s*/g, "\n}\n").replace(/;\s*/g, ";\n");
  }
  function formatCodeByType(code, filename = "") {
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "html" || code.includes("<!doctype") || code.includes("<html")) return formatHtml(code);
    if (ext === "js") return formatJs(code);
    if (ext === "css") return formatCss(code);
    // fallback try html
    return formatHtml(code);
  }

  // Autosave & versions
  let autosaveTimer = null;
  const AUTOSAVE_DELAY = 4000;
  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      const content = editor ? editor.value : getActiveFileContent();
      const map = loadJSON(AUTOSAVE_KEY, {});
      map[activeFile] = map[activeFile] || [];
      map[activeFile].unshift({ createdAt: Date.now(), content });
      if (map[activeFile].length > 40) map[activeFile].pop();
      saveJSON(AUTOSAVE_KEY, map);
      pushLog(`Autosaved ${activeFile}`);
      // Also create jr_versions app-level if file corresponds to an app
      const apps = loadJSON("jr_apps", []);
      const app = apps.find(a => (a.appName && `${a.appName}.html`) === activeFile || a._id === activeFile);
      if (app) {
        const versions = loadJSON("jr_versions", []);
        const vnum = (app.version || 0) + 1;
        versions.unshift({ _id: `ver_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, appId: app._id, code: content, version: vnum, createdAt: Date.now(), note: "Autosave" });
        saveJSON("jr_versions", versions);
        app.version = vnum;
        // update app
        const idx = apps.findIndex(a => a._id === app._id);
        apps[idx] = app;
        saveJSON("jr_apps", apps);
        pushLog(`Saved version ${vnum} for ${app.appName}`);
      }
    }, AUTOSAVE_DELAY);
  }

  // Save active file as app (basic)
  function saveActiveFileAsApp() {
    const content = editor ? editor.value : getActiveFileContent();
    const apps = loadJSON("jr_apps", []);
    const appDoc = {
      _id: `app_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      appName: activeFile.replace(/\.[^.]+$/, ""),
      appTitle: activeFile.replace(/\.[^.]+$/, ""),
      prompt: "Saved from editor",
      code: content,
      createdAt: Date.now(),
      version: 1,
      views: 0,
      favorite: false
    };
    apps.unshift(appDoc);
    saveJSON("jr_apps", apps);
    pushLog(`Saved ${activeFile} as app ${appDoc.appName}`);
  }

  // Export single file / app
  function exportActiveFile() {
    const content = editor ? editor.value : getActiveFileContent();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: activeFile });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    pushLog(`Exported ${activeFile}`);
  }

  // Versions modal (show autosaves for current file and jr_versions for apps)
  function openVersionsModal() {
    const overlays = document.querySelectorAll(".modal-overlay"); overlays.forEach(o => o.remove());
    const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() });
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999";
    const box = el("div", { class: "neu-box", onclick: (e) => e.stopPropagation() });
    box.style.cssText = "background:var(--bg-color,#fff);padding:18px;border-radius:12px;max-width:720px;width:100%;max-height:80vh;overflow:auto;";
    box.appendChild(el("h3", { style: { marginTop: 0 } }, "📚 Versions"));

    // Autosave snapshots
    const map = loadJSON(AUTOSAVE_KEY, {});
    const snapshots = map[activeFile] || [];
    if (!snapshots.length) {
      box.appendChild(el("div", { style: { color: "var(--text-secondary,#666)" } }, "No snapshots found"));
    } else {
      snapshots.forEach((s, idx) => {
        const row = el("div", { class: "neu-inset", style: { padding: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" } });
        const left = el("div", {}, el("div", { style: { fontWeight: 700 } }, `Snapshot ${idx+1}`), el("div", { style: { fontSize: "12px", color: "var(--text-secondary,#666)" } }, new Date(s.createdAt).toLocaleString()));
        const btn = el("div", {}, el("button", { class: "neu-btn", onclick: () => { editor.value = s.content; editor.dispatchEvent(new Event("input")); pushLog("Restored snapshot"); overlay.remove(); } }, "Restore"));
        row.appendChild(left); row.appendChild(btn);
        box.appendChild(row);
      });
    }

    box.appendChild(el("div", { style: { marginTop: "12px" } }, el("button", { class: "neu-btn-black", onclick: () => overlay.remove() }, "Close")));
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveActiveFileAsApp();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      // Run preview: set iframe in right panel
      runPreview();
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      // open new file modal from previous chunk
      if (window.AIJR && window.AIJR.openNewFileModal) window.AIJR.openNewFileModal();
    }
  });

  // Preview run (update iframe in right panel)
  function runPreview() {
    const iframe = qs("#aijr-right iframe") || qs("#previewIframe");
    if (!iframe) {
      pushLog("No preview iframe found");
      return;
    }
    const code = editor ? editor.value : getActiveFileContent();
    iframe.srcdoc = code;
    pushLog("Preview updated");
  }

  // Utility to format and export code etc. (exposed)
  window.AIJR.getFiles = () => files;
  window.AIJR.switchFile = (n) => switchFile(n);
  window.AIJR.openVersionsModal = openVersionsModal;
  window.AIJR.saveActiveFileAsApp = saveActiveFileAsApp;

  // Render editor UI now
  buildEditorUI();

  // If window.AIJR.onFilesChanged exists, attach listener to update local files variable
  window.AIJR.onFilesChanged = function (newFiles) {
    files = newFiles || files;
    if (!files.find(f => f.name === activeFile)) {
      activeFile = files[0]?.name || (files[0] ? files[0].name : "index.html");
    }
    saveJSON("jr_files", files);
    renderFileTabs();
    if (editor) editor.value = getActiveFileContent();
  };

  // Expose for other chunks
  window.AIJR.editor = () => editor;

  pushLog("Chunk 3 loaded: Editor area, file tabs, autosave, versions, shortcuts");
})();
