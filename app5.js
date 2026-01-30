// app5.js — Chunk 5 (approx lines 2000-2500 of script.jsx converted to vanilla JS)
// Implements: Build & Deploy flow using available providers, update/redeploy, versioning,
// app CRUD (delete, bulk delete, toggle favorite), launch, and share link generation.
// Integrates with window.AIJR and previous chunks (app.js..app4.js).

(function () {
  // --- Helpers ---
  function loadJSON(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k) || "null") || fallback; } catch { return fallback; }
  }
  function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function uid(prefix = "id_") { return prefix + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8); }
  function pushLog(msg) { (window.AIJR && window.AIJR.pushLog ? window.AIJR.pushLog : console.log)(msg); }

  // Storage keys
  const APPS_KEY = "jr_apps";
  const VERSIONS_KEY = "jr_versions";

  // Ensure arrays exist
  saveJSON(APPS_KEY, loadJSON(APPS_KEY, []));
  saveJSON(VERSIONS_KEY, loadJSON(VERSIONS_KEY, []));

  // Exposed API object (augment existing)
  window.AIJR = window.AIJR || {};
  const api = window.AIJR.generateFromProvider || null;

  // Build & deploy: uses window.AIJR.generateFromProvider (which handles Puter/Pollinations)
  async function buildAndDeploy({ prompt, appName, appTitle, model = "", provider = (window.AIJR && window.AIJR.settings && window.AIJR.settings.activeProvider) || "Puter", pollKey = "" } = {}) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      pushLog("No prompt provided");
      return null;
    }

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
      if (!window.AIJR || !window.AIJR.generateFromProvider) {
        // Fallback simple generator
        generated = `<!doctype html><html><body><h1>${appTitle || "App"}</h1><p>${prompt.slice(0,200)}</p></body></html>`;
      } else {
        // Use provider helper; collect chunks via callback
        await window.AIJR.generateFromProvider({
          systemPrompt,
          userPrompt: prompt,
          provider,
          model,
          pollKey
        }, (chunk) => {
          // accumulate chunks; some providers deliver full text at once
          generated += (chunk || "");
          // live update to editor if available:
          if (window.AIJR && window.AIJR.editor && typeof window.AIJR.editor === "function") {
            const ed = window.AIJR.editor();
            if (ed) ed.value = generated;
          }
        });
      }

      // Post-process: strip fences and ensure doctype
      generated = (generated || "").replace(/```html?\n?/gi, "").replace(/```\n?/g, "").trim();
      const start = generated.search(/<!doctype\s+html>/i);
      if (start > 0) generated = generated.slice(start);
      if (!/<!doctype\s+html>/i.test(generated)) {
        // wrap if needed
        generated = `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><pre>${escapeHtml(generated)}</pre></body></html>`;
      }

      pushLog(`Generated ${generated.length} bytes`);

      // Save files and attempt hosting
      let hostedUrl = null;
      let previewBlobUrl = null;
      // Try Puter hosting if available
      if (window.puter && window.puter.fs && window.puter.hosting) {
        try {
          const dirName = `app_${Date.now()}`;
          if (window.puter.fs.mkdir) await window.puter.fs.mkdir(dirName);
          if (window.puter.fs.write) await window.puter.fs.write(`${dirName}/index.html`, generated);
          // try create hosting
          try {
            const site = await window.puter.hosting.create(appName || undefined, dirName);
            hostedUrl = `https://${site.subdomain}.puter.site`;
            pushLog("Hosted on Puter: " + hostedUrl);
          } catch (err) {
            pushLog("Puter hosting creation failed: " + (err.message || err));
          }
        } catch (err) {
          pushLog("Puter FS/hosting error: " + (err.message || err));
        }
      }

      if (!hostedUrl) {
        const blob = new Blob([generated], { type: "text/html" });
        previewBlobUrl = URL.createObjectURL(blob);
        pushLog("Created preview blob URL");
      }

      // Save app doc to local storage DB
      const apps = loadJSON(APPS_KEY, []);
      const newApp = {
        _id: uid("app_"),
        type: "app",
        prompt,
        code: generated,
        appName: (appName && appName.trim()) || `app_${Date.now().toString(36)}`,
        appTitle: (appTitle && appTitle.trim()) || (prompt.slice(0, 50)),
        model,
        dir: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        version: 1,
        hostedUrl,
        previewBlobUrl,
        views: 0,
        favorite: false,
        tags: []
      };
      apps.unshift(newApp);
      saveJSON(APPS_KEY, apps);

      // Save version
      const versions = loadJSON(VERSIONS_KEY, []);
      versions.unshift({
        _id: uid("ver_"),
        type: "version",
        appId: newApp._id,
        code: generated,
        version: 1,
        createdAt: Date.now(),
        note: "Initial version"
      });
      saveJSON(VERSIONS_KEY, versions);

      pushLog("✅ App created and saved locally");
      // return object
      return { app: newApp, hostedUrl: newApp.hostedUrl, previewBlobUrl: newApp.previewBlobUrl };
    } catch (err) {
      pushLog("❌ Generation error: " + (err.message || err));
      throw err;
    }
  }

  async function updateAndRedeploy(appId, newCode) {
    const apps = loadJSON(APPS_KEY, []);
    const idx = apps.findIndex(a => a._id === appId);
    if (idx < 0) { pushLog("App not found for update"); return null; }
    const app = apps[idx];
    let hostedUrl = app.hostedUrl;
    let previewBlobUrl = app.previewBlobUrl;

    // try Puter redeploy logic if available
    if (window.puter && window.puter.fs && window.puter.hosting) {
      try {
        const dirName = `app_${Date.now()}`;
        if (window.puter.fs.mkdir) await window.puter.fs.mkdir(dirName);
        if (window.puter.fs.write) await window.puter.fs.write(`${dirName}/index.html`, newCode);
        // redeploy: attempt delete old hosting then create
        try {
          if (app.subdomain && window.puter.hosting.delete) {
            await window.puter.hosting.delete(app.subdomain);
          }
        } catch (e) { /* ignore */ }
        try {
          const site = await window.puter.hosting.create(app.subdomain || app.appName || undefined, dirName);
          hostedUrl = `https://${site.subdomain}.puter.site`;
          pushLog("Redeployed on Puter: " + hostedUrl);
        } catch (err) {
          pushLog("Puter redeploy create failed: " + (err.message || err));
        }
      } catch (err) {
        pushLog("Puter redeploy error: " + (err.message || err));
      }
    }

    if (!hostedUrl) {
      // fallback to blob preview
      const blob = new Blob([newCode], { type: "text/html" });
      previewBlobUrl = URL.createObjectURL(blob);
      pushLog("Created preview blob for updated app");
    }

    // update app doc
    app.code = newCode;
    app.updatedAt = Date.now();
    app.version = (app.version || 0) + 1;
    app.hostedUrl = hostedUrl;
    app.previewBlobUrl = previewBlobUrl;
    apps[idx] = app;
    saveJSON(APPS_KEY, apps);

    // save version record
    const versions = loadJSON(VERSIONS_KEY, []);
    versions.unshift({
      _id: uid("ver_"),
      type: "version",
      appId: app._id,
      code: newCode,
      version: app.version,
      createdAt: Date.now(),
      note: `Updated to v${app.version}`
    });
    saveJSON(VERSIONS_KEY, versions);

    pushLog(`✅ Updated app ${app.appName} to v${app.version}`);
    return app;
  }

  function deleteApp(appId) {
    const apps = loadJSON(APPS_KEY, []);
    const idx = apps.findIndex(a => a._id === appId);
    if (idx < 0) { pushLog("App not found"); return false; }
    const app = apps[idx];
    // attempt to delete puter hosting if exists
    if (window.puter && window.puter.hosting && app.subdomain) {
      try {
        window.puter.hosting.delete(app.subdomain).catch(()=>{});
      } catch { /* ignore */ }
    }
    apps.splice(idx, 1);
    saveJSON(APPS_KEY, apps);
    // remove versions
    let versions = loadJSON(VERSIONS_KEY, []);
    versions = versions.filter(v => v.appId !== appId);
    saveJSON(VERSIONS_KEY, versions);
    pushLog(`✅ Deleted ${app.appName || app._id}`);
    return true;
  }

  async function bulkDelete(appIds = []) {
    for (const id of appIds) {
      deleteApp(id);
    }
    pushLog(`Bulk deleted ${appIds.length} app(s)`);
  }

  function toggleFavorite(appId) {
    const apps = loadJSON(APPS_KEY, []);
    const idx = apps.findIndex(a => a._id === appId);
    if (idx < 0) return;
    apps[idx].favorite = !apps[idx].favorite;
    saveJSON(APPS_KEY, apps);
    pushLog(`${apps[idx].appName} favorite: ${apps[idx].favorite}`);
  }

  function incrementViews(appId) {
    const apps = loadJSON(APPS_KEY, []);
    const idx = apps.findIndex(a => a._id === appId);
    if (idx < 0) return;
    apps[idx].views = (apps[idx].views || 0) + 1;
    saveJSON(APPS_KEY, apps);
  }

  function launchApp(appId) {
    const apps = loadJSON(APPS_KEY, []);
    const app = apps.find(a => a._id === appId);
    if (!app) return;
    incrementViews(appId);
    if (app.hostedUrl) {
      try { window.open(app.hostedUrl, "_blank"); pushLog(`Launched hosted: ${app.hostedUrl}`); }
      catch { window.open(app.previewBlobUrl || "about:blank", "_blank"); }
    } else if (app.previewBlobUrl) {
      window.open(app.previewBlobUrl, "_blank");
    } else {
      // create blob and open
      const blob = new Blob([app.code || ""], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      pushLog("Launched blob preview");
    }
  }

  function exportSingleApp(appId) {
    const apps = loadJSON(APPS_KEY, []);
    const app = apps.find(a => a._id === appId);
    if (!app) return;
    const data = JSON.stringify(app, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${app.appName || "app"}-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushLog(`Exported ${app.appName}`);
  }

  function generateShareLink(appId) {
    const apps = loadJSON(APPS_KEY, []);
    const app = apps.find(a => a._id === appId);
    if (!app) return null;
    const encoded = btoa(JSON.stringify({ prompt: app.prompt, code: app.code, title: app.appTitle }));
    const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    pushLog("Generated share link");
    return link;
  }

  // Simple restore version (puts code into editor if available)
  function restoreVersion(versionId) {
    const versions = loadJSON(VERSIONS_KEY, []);
    const v = versions.find(x => x._id === versionId);
    if (!v) { pushLog("Version not found"); return; }
    // If editor exists, set content
    if (window.AIJR && window.AIJR.editor && typeof window.AIJR.editor === "function") {
      const ed = window.AIJR.editor();
      if (ed) {
        ed.value = v.code;
        ed.dispatchEvent(new Event("input"));
        pushLog(`Restored v${v.version} to editor`);
      }
    }
    // Also optionally update app record
  }

  // helper
  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, function (m) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]; });
  }

  // Expose functions on window.AIJR
  window.AIJR.buildAndDeploy = buildAndDeploy;
  window.AIJR.updateAndRedeploy = updateAndRedeploy;
  window.AIJR.deleteApp = deleteApp;
  window.AIJR.bulkDelete = bulkDelete;
  window.AIJR.toggleFavorite = toggleFavorite;
  window.AIJR.incrementViews = incrementViews;
  window.AIJR.launchApp = launchApp;
  window.AIJR.exportSingleApp = exportSingleApp;
  window.AIJR.generateShareLink = generateShareLink;
  window.AIJR.restoreVersion = restoreVersion;

  pushLog("Chunk 5 loaded: build/deploy, versioning, app CRUD ready");
})();
