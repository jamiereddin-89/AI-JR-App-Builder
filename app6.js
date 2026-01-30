// app6.js — Chunk 6 (approx lines 2500-3000 of script.jsx converted to vanilla JS)
// Adds: enhanced apps list UI (filtering, sorting, bulk select/delete), analytics panel/modal,
// and helper functions to compute analytics from stored apps/versions.
// Integrates with previous chunks via window.AIJR.

(function () {
  // Small helpers
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
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return n;
  }
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function loadJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch { return fallback; } }
  function saveJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

  const APPS_KEY = "jr_apps";
  const VERSIONS_KEY = "jr_versions";

  window.AIJR = window.AIJR || {};
  const pushLog = window.AIJR.pushLog || (m => console.log(m));

  // UI state for apps list
  let appsFilterFavorites = false;
  let appsSortBy = "date"; // date | name | views
  let appsBulkMode = false;
  let appsSelected = new Set();

  // find apps list container (created in chunk2)
  const appsListWrap = qs("#apps-list") || (() => {
    // if not present, create a panel under left panel
    const left = qs("#aijr-left") || document.body;
    const w = el("div", { id: "apps-list", style: { padding: "8px", maxHeight: "360px", overflow: "auto" } });
    left.appendChild(w);
    return w;
  })();

  function computeAnalytics() {
    const apps = loadJSON(APPS_KEY, []);
    const versions = loadJSON(VERSIONS_KEY, []);
    const totalApps = apps.length;
    const totalVersions = versions.length;
    const favorites = apps.filter(a => a.favorite).length;
    const totalViews = apps.reduce((s, a) => s + (a.views || 0), 0);
    const modelsUsed = new Set(apps.map(a => a.model)).size;
    const avgCodeSize = apps.length ? Math.round(apps.reduce((s, a) => s + ((a.code && a.code.length) || 0), 0) / apps.length) : 0;
    return { totalApps, totalVersions, favorites, totalViews, modelsUsed, avgCodeSize };
  }

  function openAnalyticsModal() {
    const s = computeAnalytics();
    const overlay = el("div", { class: "modal-overlay", onclick: () => overlay.remove() });
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999";
    const box = el("div", { class: "neu-box", onclick: (e) => e.stopPropagation() });
    box.style.cssText = "background:var(--bg-color,#fff);padding:18px;border-radius:12px;max-width:600px;width:90%";
    box.appendChild(el("h3", { style: { marginTop: 0 } }, "📊 Analytics"));
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginTop: "12px" } },
      statCard("Total Apps", s.totalApps, "📱"),
      statCard("Favorites", s.favorites, "⭐"),
      statCard("Total Views", s.totalViews, "👁️"),
      statCard("Models Used", s.modelsUsed, "🤖"),
      statCard("Avg Code Size", `${(s.avgCodeSize / 1024).toFixed(1)}KB`, "📄"),
      statCard("Versions", s.totalVersions, "📚")
    );
    box.appendChild(grid);
    box.appendChild(el("div", { style: { marginTop: "14px", textAlign: "right" } }, el("button", { class: "neu-btn-black", onclick: () => overlay.remove() }, "Close")));
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function statCard(label, value, icon) {
    return el("div", { class: "neu-inset", style: { padding: "12px", borderRadius: "12px", textAlign: "center" } },
      el("div", { style: { fontSize: "22px", marginBottom: "6px" } }, icon),
      el("div", { style: { fontWeight: 800, fontSize: "18px" } }, value),
      el("div", { style: { color: "var(--text-secondary,#666)", fontSize: "12px" } }, label)
    );
  }

  // Enhanced render of apps list with bulk/select controls
  function renderAppsListEnhanced(searchQ = "") {
    const wrap = appsListWrap;
    wrap.innerHTML = "";

    const apps = loadJSON(APPS_KEY, []);
    // filter favorites if set
    let list = apps.slice();
    if (appsFilterFavorites) list = list.filter(a => a.favorite);
    // search
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(a => (a.appName || "").toLowerCase().includes(q) || (a.appTitle || "").toLowerCase().includes(q) || (a.prompt || "").toLowerCase().includes(q));
    }
    // sort
    if (appsSortBy === "date") list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    else if (appsSortBy === "name") list.sort((a,b)=>( (a.appTitle||a.appName||"").localeCompare((b.appTitle||b.appName||"")) ));
    else if (appsSortBy === "views") list.sort((a,b)=>(b.views||0)-(a.views||0));

    // Bulk header
    const header = el("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" } },
      el("div", {},
        el("button", { class: "neu-btn", onclick: () => { appsFilterFavorites = !appsFilterFavorites; renderAppsListEnhanced(searchQ); } }, appsFilterFavorites ? "★ Favorites" : "☆ Favorites"),
        el("select", { onchange: (e) => { appsSortBy = e.target.value; renderAppsListEnhanced(searchQ); }, style: { marginLeft: "8px" } },
          el("option", { value: "date" }, "Recent"),
          el("option", { value: "name" }, "Name"),
          el("option", { value: "views" }, "Views")
        )
      ),
      el("div", { style: { display: "flex", gap: "8px" } },
        el("button", { class: "neu-btn", onclick: () => { appsBulkMode = !appsBulkMode; if (!appsBulkMode) appsSelected.clear(); renderAppsListEnhanced(searchQ); } }, appsBulkMode ? "Exit Select" : "Select"),
        el("button", { class: "neu-btn", onclick: () => openAnalyticsModal() }, "📊 Analytics")
      )
    );
    wrap.appendChild(header);

    if (appsBulkMode && appsSelected.size > 0) {
      const bulkRow = el("div", { style: { marginBottom: "8px", display: "flex", gap: "8px" } },
        el("button", { class: "neu-btn-red", onclick: () => { if (confirm(`Delete ${appsSelected.size} apps?`)) { window.AIJR.bulkDelete(Array.from(appsSelected)); appsSelected.clear(); renderAppsListEnhanced(searchQ); } } }, `🗑️ Delete ${appsSelected.size} Selected`),
        el("button", { class: "neu-btn", onclick: () => { appsSelected.clear(); renderAppsListEnhanced(searchQ); } }, "Clear Selection")
      );
      wrap.appendChild(bulkRow);
    }

    if (!list.length) {
      wrap.appendChild(el("div", { style: { color: "var(--text-secondary,#666)", padding: "8px" } }, "No apps"));
      return;
    }

    for (const app of list) {
      const row = el("div", { style: { borderBottom: "1px solid var(--border-color,#e1e1e1)", padding: "8px", display: "flex", gap: "8px", alignItems: "flex-start" } });
      if (appsBulkMode) {
        const cb = el("input", { type: "checkbox", checked: appsSelected.has(app._id), onchange: (e) => {
          if (e.target.checked) appsSelected.add(app._id); else appsSelected.delete(app._id);
          // rerender header bulk actions
          renderAppsListEnhanced(searchQ);
        }});
        row.appendChild(el("div", { style: { minWidth: "28px" } }, cb));
      }

      const main = el("div", { style: { flex: "1 1 auto" } },
        el("div", { style: { fontWeight: 800 } }, app.appTitle || app.appName || "Untitled"),
        el("div", { style: { color: "var(--text-secondary,#666)", fontSize: "12px", marginTop: "4px" } }, (app.prompt || "").slice(0, 140))
      );
      row.appendChild(main);

      const actions = el("div", { style: { display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" } });
      const favBtn = el("button", { class: "neu-btn", onclick: (e) => { e.stopPropagation(); window.AIJR.toggleFavorite(app._id); renderAppsListEnhanced(searchQ); } }, app.favorite ? "★" : "☆");
      const openBtn = el("button", { class: "neu-btn", onclick: (e) => { e.stopPropagation(); window.AIJR.launchApp(app._id); } }, "▶");
      const exportBtn = el("button", { class: "neu-btn", onclick: (e) => { e.stopPropagation(); window.AIJR.exportSingleApp(app._id); } }, "📤");
      const shareBtn = el("button", { class: "neu-btn", onclick: (e) => { e.stopPropagation(); const link = window.AIJR.generateShareLink(app._id); if (link) { navigator.clipboard.writeText(link); pushLog("Share link copied"); } } }, "🔗");
      const delBtn = el("button", { class: "neu-btn", onclick: (e) => { e.stopPropagation(); if (confirm("Delete app?")) { window.AIJR.deleteApp(app._id); renderAppsListEnhanced(searchQ); } } }, "🗑️");
      actions.appendChild(favBtn); actions.appendChild(openBtn); actions.appendChild(exportBtn); actions.appendChild(shareBtn); actions.appendChild(delBtn);
      row.appendChild(actions);

      // Clicking main area when not in bulk mode selects and opens app in editor/preview
      row.addEventListener("click", () => {
        if (appsBulkMode) {
          // toggle checkbox
          if (appsSelected.has(app._id)) appsSelected.delete(app._id); else appsSelected.add(app._id);
          renderAppsListEnhanced(searchQ);
        } else {
          // notify selection; other chunks may listen
          window.AIJR.selectedApp = app;
          if (window.AIJR.onAppSelected) window.AIJR.onAppSelected(app);
          pushLog(`Selected ${app.appName || app._id}`);
        }
      });

      wrap.appendChild(row);
    }
  }

  // wire up to existing search input if present (chunk2 created #appsSearchInput)
  const searchInput = qs("#appsSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderAppsListEnhanced(e.target.value.trim()));
  }

  // if earlier chunk created a renderAppsList function, replace or enhance it
  if (window.AIJR) {
    window.AIJR.renderAppsListEnhanced = renderAppsListEnhanced;
    // override old render to point here
    window.AIJR.renderAppsList = renderAppsListEnhanced;
  }

  // Initial render
  renderAppsListEnhanced();

  pushLog("Chunk 6 loaded: enhanced apps UI, bulk selection, analytics");

})();
