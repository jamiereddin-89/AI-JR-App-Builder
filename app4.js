// app4.js — Chunk 4 (approx lines 1500-2000 of script.jsx converted to vanilla JS)
// Adds: Puter SDK loader, model fetching for Puter & Pollinations, and helper functions
// for requesting text generation (stream-aware where possible).
// This chunk expects app.js/app2.js/app3.js to have run and exposed window.AIJR.

(function () {
  // Lightweight helpers
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
  function loadJSON(k, fallback) { try { return JSON.parse(localStorage.getItem(k) || "null") || fallback; } catch { return fallback; } }
  function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  // Bridge to existing app state / utilities
  window.AIJR = window.AIJR || {};
  const pushLog = window.AIJR.pushLog || ((m) => console.log("[AIJR]", m));
  const settings = window.AIJR.settings || (window.AIJR.settings = loadJSON("ai_jr_settings_v1", { theme: "light", activeProvider: "Puter", apiKeys: {} }));

  // Local cache
  let puterReady = false;
  let puter = window.puter || null;
  let puterModels = [];
  let pollinationsModels = settings.pollinationsModels || [];

  // Exposed API
  const API = {
    initPuterSDK,
    fetchPuterModels,
    fetchPollinationsModels,
    aiChatWithPuterStreaming, // async generator
    generateWithPollinations,
  };

  window.AIJR.api = Object.assign(window.AIJR.api || {}, API);

  // 1) Load Puter SDK if not present
  function initPuterSDK() {
    return new Promise((resolve) => {
      if (window.puter) {
        puter = window.puter;
        puterReady = true;
        pushLog("Puter already available");
        resolve(puter);
        return;
      }
      // Create and append script
      const existing = document.querySelector('script[src="https://js.puter.com/v2/"]');
      if (existing) {
        existing.addEventListener("load", () => {
          puter = window.puter;
          puterReady = !!puter;
          pushLog("Puter SDK loaded (existing script)");
          resolve(puter);
        });
        return;
      }
      const s = document.createElement("script");
      s.src = "https://js.puter.com/v2/";
      s.async = true;
      s.onload = () => {
        puter = window.puter;
        puterReady = !!puter;
        pushLog("Puter SDK loaded");
        resolve(puter);
      };
      s.onerror = () => {
        pushLog("Failed to load Puter SDK");
        resolve(null);
      };
      document.body.appendChild(s);
    });
  }

  // 2) Fetch Puter models (best-effort)
  async function fetchPuterModels() {
    // Try SDK first
    if (!puterReady && window.puter) {
      puter = window.puter;
      puterReady = true;
    }
    if (puterReady && puter && typeof puter.ai === "object") {
      try {
        // some Puter SDKs may provide list endpoints; fallback to REST
        if (puter.ai.listModels) {
          const list = await puter.ai.listModels();
          puterModels = Array.isArray(list) ? list.map(m => (typeof m === "string" ? { id: m } : m)) : [];
        } else {
          // fallback to public endpoint used earlier in original repo
          const res = await fetch("https://api.puter.com/puterai/chat/models/");
          const data = await res.json();
          puterModels = (Array.isArray(data) ? data : (data.models || [])).map(m => (typeof m === "string" ? { id: m } : m));
        }
        pushLog(`Fetched ${puterModels.length} Puter models`);
      } catch (err) {
        pushLog("Failed to fetch Puter models: " + (err.message || err));
        puterModels = [];
      }
    } else {
      // fallback to public REST
      try {
        const res = await fetch("https://api.puter.com/puterai/chat/models/");
        const data = await res.json();
        puterModels = (Array.isArray(data) ? data : (data.models || [])).map(m => (typeof m === "string" ? { id: m } : m));
        pushLog(`Fetched ${puterModels.length} Puter models (REST)`);
      } catch (err) {
        pushLog("Failed to fetch Puter models (REST): " + (err.message || err));
        puterModels = [];
      }
    }
    return puterModels;
  }

  // 3) Fetch Pollinations models
  async function fetchPollinationsModels() {
    try {
      const res = await fetch("https://gen.pollinations.ai/text/models");
      if (!res.ok) {
        pushLog("Pollinations models fetch returned non-OK");
        return pollinationsModels;
      }
      const data = await res.json();
      pollinationsModels = (data || []).map(m => ({ id: m.name, name: m.name, description: m.description || "" }));
      settings.pollinationsModels = pollinationsModels;
      saveJSON("ai_jr_settings_v1", settings);
      pushLog(`Fetched ${pollinationsModels.length} Pollinations models`);
    } catch (err) {
      pushLog("Failed to fetch Pollinations models: " + (err.message || err));
    }
    return pollinationsModels;
  }

  // 4) Puter streaming chat helper (async generator)
  // This attempts to call puter.ai.chat with stream: true and yield chunks as they arrive.
  // If streaming unavailable, yields full response once.
  async function* aiChatWithPuterStreaming(messages = [], opts = {}) {
    // Ensure SDK present
    if (!puterReady) await initPuterSDK();
    if (!puter || !puter.ai) {
      // fallback - yield nothing and throw
      throw new Error("Puter SDK not available");
    }
    // If SDK supports streaming (original repo used 'for await (const part of stream)')
    try {
      const stream = await puter.ai.chat(messages, Object.assign({}, opts, { stream: true }));
      // If stream is async iterable
      if (stream && typeof stream[Symbol.asyncIterator] === "function") {
        for await (const part of stream) {
          yield part;
        }
        return;
      }
      // If stream is synchronous iterable
      if (stream && typeof stream[Symbol.iterator] === "function") {
        for (const part of stream) yield part;
        return;
      }
      // If stream is a single response
      yield stream;
      return;
    } catch (err) {
      // If streaming fails, try non-streaming call
      try {
        const resp = await puter.ai.chat(messages, Object.assign({}, opts, { stream: false }));
        yield resp;
        return;
      } catch (err2) {
        throw err2;
      }
    }
  }

  // 5) Pollinations generation (non-streaming GET)
  // systemPlusUser should be a combined prompt (string)
  async function generateWithPollinations(systemPlusUser, model = "", apiKey = "") {
    // Example endpoint used in original repo:
    // https://gen.pollinations.ai/text/<encodedPrompt>?model=<model>&json=true
    try {
      const urlSafe = encodeURIComponent(systemPlusUser);
      const url = `https://gen.pollinations.ai/text/${urlSafe}?model=${encodeURIComponent(model || "")}&json=true`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "*/*",
          Authorization: apiKey ? `Bearer ${apiKey}` : "",
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Pollinations API error ${res.status}: ${txt}`);
      }
      const text = await res.text();
      // Pollinations sometimes returns JSON or raw text
      try {
        const data = JSON.parse(text);
        // original mapping: data?.choices?.[0]?.message?.content || data?.content || String(data)
        return data?.choices?.[0]?.message?.content || data?.content || String(data);
      } catch {
        return text;
      }
    } catch (err) {
      pushLog("Pollinations generation error: " + (err.message || err));
      throw err;
    }
  }

  // 6) Small convenience helper: attempt provider generation (used by later chunks)
  async function generateFromProvider({ systemPrompt, userPrompt, provider = settings.activeProvider, model = "", pollKey = "" }, onChunk = null) {
    const combined = `${systemPrompt}\n\n${userPrompt}`;
    if (provider === "Puter") {
      // Use streaming if available
      try {
        const gen = aiChatWithPuterStreaming([{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], { model, stream: true });
        // If onChunk provided, call it for each chunk
        for await (const part of gen) {
          if (part?.text) {
            if (onChunk) onChunk(part.text);
          } else if (part?.choices) {
            // Non-standard: attempt to extract text
            const t = part.choices?.[0]?.message?.content || part.content || JSON.stringify(part);
            if (onChunk) onChunk(t);
          } else {
            // other parts
            if (onChunk && typeof part === "string") onChunk(part);
          }
        }
        return; // done
      } catch (err) {
        pushLog("Puter streaming failed, trying non-stream call: " + (err.message || err));
        try {
          const resp = await puter.ai.chat([{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], { model, stream: false });
          const text = resp?.choices?.[0]?.message?.content || resp?.content || String(resp);
          if (onChunk) onChunk(text);
          return;
        } catch (err2) {
          pushLog("Puter non-streaming call failed: " + (err2.message || err2));
          // fallthrough to Pollinations if configured
        }
      }
    }
    if (provider === "Pollinations") {
      const txt = await generateWithPollinations(combined, model, pollKey || settings.apiKeys?.Pollinations || "");
      if (onChunk) onChunk(txt);
      return;
    }

    // If provider is not Puter or Pollinations, return a simple fallback
    const fallback = `<!doctype html><html><body><h1>Fallback Generated App</h1><p>${userPrompt.slice(0, 200)}</p></body></html>`;
    if (onChunk) onChunk(fallback);
    return;
  }

  // Initialize quickly: attempt to load puter SDK and fetch models
  (async function bootstrap() {
    await initPuterSDK();
    await fetchPuterModels();
    // try pollinations models if api key exists or public list
    try { await fetchPollinationsModels(); } catch (_) { /* ignore */ }
    pushLog("Chunk 4 loaded: Puter SDK loader and model fetch helpers ready");
  })();

  // Expose for other chunks
  window.AIJR.puter = puter;
  window.AIJR.fetchPuterModels = fetchPuterModels;
  window.AIJR.fetchPollinationsModels = fetchPollinationsModels;
  window.AIJR.generateFromProvider = generateFromProvider;
  window.AIJR.aiChatWithPuterStreaming = aiChatWithPuterStreaming;
  window.AIJR.generateWithPollinations = generateWithPollinations;
})();
