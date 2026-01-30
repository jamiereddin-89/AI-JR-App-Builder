import ReactDOMClient from "react-dom/client";

// React imports
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Editor from "@monaco-editor/react";
import { useFireproof } from "use-fireproof";

// Helper function to combine class names
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Debounce hook to delay value updates
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// Log list component
function LogPanel({ log }) {
  return (
    <div className="log-panel bg-[#e8e8e8] shadow-[inset_4px_4px_8px_#c5c5c5,inset_-4px_-4px_8px_#ffffff] rounded-2xl p-4">
      <div className="text-[#666] font-mono text-xs space-y-1 max-h-32 overflow-y-auto">
        {log.map((l, i) => (
          <div
            key={i}
            className={
              l.includes("✅")
                ? "text-green-600"
                : l.includes("❌")
                  ? "text-red-600"
                  : ""
            }
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// Export/Import Modal component
function ExportImportModal({
  neu,
  neuBtn,
  neuBtnBlack,
  onClose,
  onExport,
  onImport,
  fileInputRef,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(neu, "rounded-[24px] p-6 max-w-md w-full")}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black text-[#1a1a1a] text-xl mb-4">
          📦 Export / Import
        </h3>
        <div className="space-y-3">
          <button
            onClick={onExport}
            className={cn(
              "w-full",
              neuBtn,
              "rounded-xl py-3 font-bold text-[#1a1a1a]",
            )}
          >
            📤 Export All Apps (JSON)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full",
              neuBtn,
              "rounded-xl py-3 font-bold text-[#1a1a1a]",
            )}
          >
            📥 Import Apps (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onImport}
          />
        </div>
        <button
          onClick={onClose}
          className={cn(
            "w-full",
            neuBtnBlack,
            "rounded-xl py-3 font-bold mt-4",
          )}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Settings Modal component
function SettingsModal({
  neu,
  neuInset,
  neuBtn,
  neuBtnRed,
  neuBtnBlack,
  activeProvider,
  setActiveProvider,
  apiKeys,
  setApiKeys,
  favoriteModels,
  setFavoriteModels,
  models,
  pollinationsModels,
  setPollinationsModels,
  user,
  puter,
  onClose,
  signIn,
  apps,
  appLayout,
  setAppLayout,
}) {
  const [activeTab, setActiveTab] = useState("AI");
  const [testStatus, setTestStatus] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKeys["Pollinations"] || "");
  const [loadingModels, setLoadingModels] = useState(false);
  const [tempTheme, setTempTheme] = useState(
    document.body.className.replace("theme-", "") || "light",
  );

  const layouts = [
    { id: "side-by-side", name: "Side by Side", icon: "▢▢▢" },
    { id: "stacked", name: "Stacked", icon: "▭\n▭\n▭" },
    { id: "custom", name: "Custom", icon: "▭\n▢▢" },
  ];

  const providersList = [
    "Puter",
    "Pollinations",
    "Google",
    "Github",
    "OpenRouter",
    "Custom",
  ];

  const themes = ["light", "dark", "grey", "multicoloured"];

  const handleSaveTheme = () => {
    document.body.className = `theme-${tempTheme}`;
    localStorage.setItem("app-theme", tempTheme);
    onClose();
  };

  const handleCancelTheme = () => {
    const savedTheme = localStorage.getItem("app-theme") || "light";
    setTempTheme(savedTheme);
    document.body.className = `theme-${savedTheme}`;
    onClose();
  };

  const handleThemeChange = (newTheme) => {
    setTempTheme(newTheme);
    document.body.className = `theme-${newTheme}`;
  };

  const handleSaveKey = async (provider, key) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }));
    setTestStatus("Key saved!");

    if (provider === "Pollinations" && key) {
      setLoadingModels(true);
      try {
        const res = await fetch("https://gen.pollinations.ai/text/models");
        const data = await res.json();
        const modelList = data
          .map((m) => ({
            id: m.name,
            name: m.name,
            provider: "Pollinations",
            description: m.description || "",
          }))
          .filter((m) => !["gpt-4o-mini", "gpt-4o", "gpt-4"].includes(m.id));
        setPollinationsModels(modelList);
        setTestStatus(`Key saved! Found ${modelList.length} models.`);
      } catch (err) {
        setTestStatus("Key saved but failed to fetch models.");
      }
      setLoadingModels(false);
    }
  };

  const testApiKey = async () => {
    if (!keyInput) {
      setTestStatus("Please enter an API key first.");
      return;
    }
    setTestStatus("Testing...");
    try {
      const res = await fetch("https://gen.pollinations.ai/text/models");
      if (res.ok) {
        const data = await res.json();
        const modelList = data
          .map((m) => ({
            id: m.name,
            name: m.name,
            provider: "Pollinations",
            description: m.description || "",
          }))
          .filter((m) => !["gpt-4o-mini", "gpt-4o", "gpt-4"].includes(m.id));
        setPollinationsModels(modelList);
        setTestStatus(`Valid key! Found ${modelList.length} models.`);
      } else {
        setTestStatus("Invalid key or API error.");
      }
    } catch (err) {
      setTestStatus("Connection error. Check your key.");
    }
  };

  const toggleFavorite = (modelId) => {
    setFavoriteModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  const providerModels = useMemo(() => {
    if (activeProvider === "Puter")
      return models.filter(
        (m) => m.provider !== "Other" && m.provider !== "Pollinations",
      );
    if (activeProvider === "Pollinations") return pollinationsModels;
    return [];
  }, [models, pollinationsModels, activeProvider]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          neu,
          "rounded-[24px] p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-[#1a1a1a] text-xl flex items-center gap-2">
            ⚙️ Settings
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("AI")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === "AI" ? neuInset : neuBtn,
              )}
            >
              AI
            </button>
            <button
              onClick={() => setActiveTab("UI")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === "UI" ? neuInset : neuBtn,
              )}
            >
              UI
            </button>
          </div>
        </div>

        {activeTab === "AI" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#666]">Provider</label>
              <select
                value={activeProvider}
                onChange={(e) => setActiveProvider(e.target.value)}
                className={cn(
                  neuInset,
                  "w-full rounded-xl p-3 outline-none font-bold text-inherit bg-transparent",
                )}
              >
                {providersList.map((p) => (
                  <option key={p} value={p} className="bg-[var(--bg-secondary)] text-[var(--text-color)]">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {activeProvider === "Custom" && (
              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#666]">Provider Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Local LLM"
                      value={apiKeys.customName || ""}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, customName: e.target.value }))}
                      className={cn(neuInset, "w-full rounded-xl p-3 text-xs outline-none bg-transparent text-inherit")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#666]">Base URL</label>
                    <input
                      type="text"
                      placeholder="https://api.example.com/v1"
                      value={apiKeys.customBaseUrl || ""}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, customBaseUrl: e.target.value }))}
                      className={cn(neuInset, "w-full rounded-xl p-3 text-xs outline-none bg-transparent text-inherit")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#666]">API Key</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={apiKeys.customKey || ""}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, customKey: e.target.value }))}
                      className={cn(neuInset, "w-full rounded-xl p-3 text-xs outline-none bg-transparent text-inherit")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#666]">Custom Model ID</label>
                    <input
                      type="text"
                      placeholder="gpt-3.5-turbo"
                      value={apiKeys.customModelId || ""}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, customModelId: e.target.value }))}
                      className={cn(neuInset, "w-full rounded-xl p-3 text-xs outline-none bg-transparent text-inherit")}
                    />
                  </div>
                  <button
                    onClick={() => setTestStatus("Custom settings saved!")}
                    className={cn(neuBtnBlack, "w-full rounded-xl py-2 font-bold text-sm mt-2")}
                  >
                    Save Custom Provider
                  </button>
                </div>
              </div>
            )}

            {activeProvider === "Puter" && (
              <div className="space-y-4 pt-4 border-t border-[#d1d1d1]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#666]">Logged in as</p>
                    <p className="font-bold text-[#1a1a1a]">
                      {user?.username || "Guest"}
                    </p>
                  </div>
                  {user ? (
                    <button
                      onClick={async () => {
                        if (puter?.auth?.signOut) {
                          await puter.auth.signOut();
                          window.location.reload();
                        }
                      }}
                      className={cn(
                        neuBtnRed,
                        "px-4 py-2 rounded-xl text-xs font-bold",
                      )}
                    >
                      Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={signIn}
                      className={cn(
                        neuBtn,
                        "px-4 py-2 rounded-xl text-xs font-bold",
                      )}
                    >
                      Sign In
                    </button>
                  )}
                </div>

                {user && apps && apps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#666]">
                      Saved Apps ({apps.length})
                    </p>
                    <div
                      className={cn(
                        neuInset,
                        "rounded-xl p-3 max-h-32 overflow-y-auto",
                      )}
                    >
                      <div className="space-y-2">
                        {apps.slice(0, 10).map((app) => (
                          <div
                            key={app._id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-[#1a1a1a] truncate">
                              {app.appTitle || app.appName}
                            </span>
                            {app.hostedUrl && (
                              <a
                                href={app.hostedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0010D9] hover:underline ml-2"
                              >
                                View
                              </a>
                            )}
                          </div>
                        ))}
                        {apps.length > 10 && (
                          <p className="text-[#888] text-xs text-center">
                            + {apps.length - 10} more apps
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <a
                  href="https://puter.com/tools/dev-center"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    neuBtn,
                    "block w-full text-center py-3 rounded-xl font-bold text-sm",
                  )}
                >
                  🚀 Open Puter Dev Center
                </a>
              </div>
            )}

            {activeProvider === "Pollinations" && (
              <div className="space-y-4 pt-4 border-t border-[#d1d1d1]">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#666]">
                    Pollinations API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showKey ? "text" : "password"}
                      placeholder="Enter API Key"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className={cn(
                        neuInset,
                        "flex-1 rounded-xl p-3 text-xs outline-none bg-transparent",
                      )}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className={cn(
                        neuBtn,
                        "px-3 py-2 rounded-xl text-xs font-bold",
                      )}
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? "Hide" : "Show"} Key
                    </button>
                    <button
                      className={cn(
                        neuBtn,
                        "px-3 py-2 rounded-xl text-xs font-bold",
                      )}
                      onClick={() => handleSaveKey("Pollinations", keyInput)}
                    >
                      Save Key
                    </button>
                    <button
                      className={cn(
                        neuBtn,
                        "px-3 py-2 rounded-xl text-xs font-bold",
                      )}
                      onClick={testApiKey}
                    >
                      Test Key
                    </button>
                  </div>
                  {testStatus && (
                    <p
                      className={cn(
                        "text-[10px] font-bold",
                        testStatus.includes("Valid") ||
                          testStatus.includes("saved")
                          ? "text-green-600"
                          : "text-orange-500",
                      )}
                    >
                      {testStatus}
                    </p>
                  )}
                </div>

                {loadingModels && (
                  <p className="text-xs text-[#666]">Loading models...</p>
                )}

                {apiKeys["Pollinations"] && pollinationsModels.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#666]">
                      Available Models ({pollinationsModels.length})
                    </label>
                    <div
                      className={cn(
                        neuInset,
                        "rounded-xl p-3 max-h-40 overflow-y-auto",
                      )}
                    >
                      <div className="space-y-1">
                        {pollinationsModels.slice(0, 20).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-xs py-1"
                          >
                            <span className="font-mono truncate">{m.id}</span>
                            <button
                              onClick={() => toggleFavorite(m.id)}
                              className="text-lg ml-2"
                            >
                              {favoriteModels.has(m.id) ? "⭐" : "☆"}
                            </button>
                          </div>
                        ))}
                        {pollinationsModels.length > 20 && (
                          <p className="text-[#888] text-xs text-center pt-2">
                            + {pollinationsModels.length - 20} more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-[#888]">
                  Get your API key at{" "}
                  <a
                    href="https://enter.pollinations.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0010D9] hover:underline"
                  >
                    enter.pollinations.ai
                  </a>
                </p>
              </div>
            )}

            {["Google", "Github", "OpenRouter", "Custom"].includes(
              activeProvider,
            ) && (
              <div className="pt-4 border-t border-[#d1d1d1] text-center py-8">
                <p className="text-[#666] italic text-sm">
                  Integration coming soon...
                </p>
              </div>
            )}

            {providerModels.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#d1d1d1]">
                <label className="text-sm font-bold text-[#666]">
                  Favorite Models
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {providerModels.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-black/5"
                    >
                      <span className="text-xs font-mono truncate mr-2">
                        {m.id}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(m.id)}
                          className="text-2xl p-2 hover:scale-110 transition-transform"
                          title="Toggle Favorite"
                        >
                          {favoriteModels.has(m.id) ? "⭐" : "☆"}
                        </button>
                        <button
                          onClick={() => {
                            setTestStatus(`Model Details: ${m.name || m.id}\nProvider: ${m.provider}\n${m.description || 'No description available.'}`);
                          }}
                          className={cn(neuBtn, "px-3 py-1 rounded-lg text-[10px] font-bold")}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className={cn(
                neuBtnBlack,
                "w-full rounded-xl py-3 font-bold mt-8",
              )}
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#666]">Theme</label>
              <div className="grid grid-cols-4 gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={cn(
                      "p-3 rounded-xl text-xs font-bold capitalize transition-all",
                      tempTheme === t
                        ? neuInset + " text-[#0010d9]"
                        : neuBtn + " text-[#1a1a1a] hover:scale-105",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#666]">
                App Layout
              </label>
              <div className="grid grid-cols-3 gap-3">
                {layouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      setAppLayout(layout.id);
                      localStorage.setItem("app-layout", layout.id);
                    }}
                    className={cn(
                      "p-4 rounded-xl text-center transition-all flex flex-col items-center gap-2",
                      appLayout === layout.id
                        ? neuInset + " text-[#0010d9]"
                        : neuBtn + " text-[#1a1a1a] hover:scale-105",
                    )}
                  >
                    <div className="text-2xl font-mono leading-tight whitespace-pre">
                      {layout.icon}
                    </div>
                    <span className="text-xs font-bold">{layout.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveTheme}
                className={cn(neuBtnBlack, "flex-1 rounded-xl py-3 font-bold")}
              >
                Save
              </button>
              <button
                onClick={handleCancelTheme}
                className={cn(neuBtn, "flex-1 rounded-xl py-3 font-bold")}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Share Modal component
function ShareModal({
  neu,
  neuInset,
  neuBtnRed,
  neuBtnBlack,
  shareLink,
  onClose,
  onCopy,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(neu, "rounded-[24px] p-6 max-w-lg w-full")}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black text-[#1a1a1a] text-xl mb-4">🔗 Share App</h3>
        <div className={cn(neuInset, "rounded-xl p-3 mb-4")}>
          <input
            value={shareLink}
            readOnly
            className="w-full bg-transparent text-xs font-mono text-[#1a1a1a] outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCopy}
            className={cn("flex-1", neuBtnRed, "rounded-xl py-3 font-bold")}
          >
            📋 Copy Link
          </button>
          <button
            onClick={onClose}
            className={cn("flex-1", neuBtnBlack, "rounded-xl py-3 font-bold")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Versions Modal component
function VersionsModal({
  neu,
  neuInset,
  neuBtnBlack,
  appVersions,
  onClose,
  onRestore,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          neu,
          "rounded-[24px] p-6 max-w-md w-full max-h-[80vh] overflow-hidden",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black text-[#1a1a1a] text-xl mb-4">
          📚 Version History
        </h3>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {appVersions.length === 0 ? (
            <p className="text-[#666] text-center py-4">
              No versions saved yet
            </p>
          ) : (
            appVersions.map((v) => (
              <div
                key={v._id}
                className={cn(
                  neuInset,
                  "rounded-xl p-3 flex justify-between items-center",
                )}
              >
                <div>
                  <div className="font-bold text-[#1a1a1a]">
                    Version {v.version}
                  </div>
                  <div className="text-[#666] text-xs">
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => onRestore(v)}
                  className={cn(
                    neuBtnBlack,
                    "rounded-full px-3 py-1 text-sm font-bold text-[#1a1a1a]",
                  )}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
        <button
          onClick={onClose}
          className={cn(
            "w-full",
            neuBtnBlack,
            "rounded-xl py-3 font-bold mt-4",
          )}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Template Modal component
function TemplatesModal({
  neu,
  neuBtn,
  neuBtnBlack,
  templates,
  selectedTemplate,
  onSelect,
  onClose,
  neuInset,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          neu,
          "rounded-[24px] p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col bg-[var(--bg-color)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-inherit text-xl flex items-center gap-2">
            🎨 App Templates
          </h3>
          <button
            onClick={onClose}
            className={cn(
              neuBtn,
              "w-8 h-8 rounded-full flex items-center justify-center text-inherit",
            )}
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className={cn(
                  "p-4 rounded-2xl text-left transition-all flex flex-col gap-3 group bg-[var(--bg-secondary)]",
                  selectedTemplate?.id === t.id ? neuInset : neu,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{t.icon}</span>
                  <div
                    className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider",
                      selectedTemplate?.id === t.id
                        ? "bg-[#0010d9] text-white"
                        : "bg-black/5 text-[#666]",
                    )}
                  >
                    {selectedTemplate?.id === t.id ? "Selected" : "Template"}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-inherit text-sm mb-1 group-hover:text-[#0010d9] transition-colors">
                    {t.name}
                  </div>
                  <div className="text-[var(--text-secondary)] text-xs line-clamp-2 leading-relaxed">
                    {t.prompt}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className={cn(neuBtnBlack, "w-full rounded-xl py-3 font-bold mt-6")}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// New File Modal component
function NewFileModal({
  neu,
  neuBtn,
  neuBtnBlack,
  neuInset,
  onClose,
  onCreate,
}) {
  const [fileName, setFileName] = useState("");

  const handleCreate = () => {
    if (fileName.trim()) {
      onCreate(fileName.trim());
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(neu, "rounded-[24px] p-6 max-w-sm w-full bg-[var(--bg-secondary)]")}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black text-inherit text-lg mb-4">
          Create New File
        </h3>
        <div className="space-y-4">
          <div>
            <label className="font-bold text-[#666] text-xs block mb-2">
              File Name
            </label>
            <div className={cn(neuInset, "rounded-xl p-1")}>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., styles.css, script.js"
                className="w-full p-2 bg-transparent text-sm text-inherit border-0 outline-none placeholder-[#999]"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={cn(
                neuBtn,
                "flex-1 rounded-xl py-2.5 font-bold text-sm text-inherit",
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!fileName.trim()}
              className={cn(
                neuBtnBlack,
                "flex-1 rounded-xl py-2.5 font-bold text-sm disabled:opacity-50",
              )}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Panel Collapse Button component
function CollapseButton({ isCollapsed, onToggle, direction = "left" }) {
  const icon = isCollapsed
    ? direction === "left"
      ? "→"
      : "←"
    : direction === "left"
      ? "←"
      : "→";

  return (
    <button
      onClick={onToggle}
      className="collapse-btn w-6 h-6 rounded-md bg-[#e8e8e8] shadow-[2px_2px_4px_#c5c5c5,-2px_-2px_4px_#ffffff] hover:bg-[#dc2626] hover:text-white flex items-center justify-center text-xs font-bold transition-all"
      title={isCollapsed ? "Expand panel" : "Collapse panel"}
    >
      {icon}
    </button>
  );
}

// UsageBar component - centred and auto sizes to header width
function UsageBar({ puter, slim, onFetch, loading, isPulsing }) {
  const [usageData, setUsageData] = useState(null);

  const fetchUsageInternal = useCallback(async () => {
    if (!puter?.auth?.getMonthlyUsage) return;
    try {
      const usage = await puter.auth.getMonthlyUsage();
      setUsageData(usage);
      if (onFetch) onFetch(usage);
    } catch {
      // ignore errors
    }
  }, [puter, onFetch]);

  useEffect(() => {
    fetchUsageInternal();
    const intervalId = setInterval(fetchUsageInternal, 30000);
    return () => clearInterval(intervalId);
  }, [fetchUsageInternal]);

  if (!usageData?.allowanceInfo) return null;

  const { monthUsageAllowance, remaining } = usageData.allowanceInfo;
  const used = monthUsageAllowance - remaining;
  const percentUsed = Math.min(
    100,
    Math.max(0, (used / monthUsageAllowance) * 100),
  );
  const percentRemaining = (100 - percentUsed).toFixed(1);

  if (slim) {
    return (
      <div className="flex-1 max-w-[400px] mx-4 select-none">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono text-[#666] whitespace-nowrap">
            {(used / 1000000).toFixed(1)}M
          </div>
          <div
            className={cn(
              "flex-1 relative h-2 bg-[#e8e8e8] rounded-full shadow-[inset_1px_1px_2px_#c5c5c5,inset_-1px_-1px_2px_#ffffff] overflow-hidden",
              isPulsing && "usage-bar-pulse",
            )}
          >
            <div
              style={{
                width: `${percentUsed}%`,
                transition: "width 1s ease-in-out",
              }}
              className="h-full bg-[#0010d9] relative z-10"
            />
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <span className="text-[8px] font-mono font-bold text-[#444] drop-shadow-sm">
                {percentRemaining}%
              </span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#666] whitespace-nowrap">
            {(monthUsageAllowance / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 select-none w-full">
      {/* Label and Refresh Row */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-sm font-bold text-[#666]">Usage</span>
      </div>

      {/* Stats and Bar Row */}
      <div className="flex items-center gap-3">
        <div className="text-[10px] font-mono text-[#666] whitespace-nowrap text-left min-w-[60px]">
          <div className="font-bold">{(used / 1000000).toFixed(2)}M</div>
          <div className="opacity-70">Used</div>
        </div>

        <div
          className={cn(
            "flex-1 relative h-5 bg-[#e8e8e8] rounded-full shadow-[inset_2px_2px_4px_#c5c5c5,inset_-2px_-2px_4px_#ffffff] overflow-hidden",
            isPulsing && "usage-bar-pulse",
          )}
        >
          <div
            style={{
              width: `${percentUsed}%`,
              transition: "width 1s ease-in-out",
            }}
            className="h-full bg-[#0010d9] relative z-10"
          />
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <span className="text-[10px] font-mono font-bold text-[#1a1a1a] drop-shadow-sm">
              {percentRemaining}% Rem
            </span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-[#666] whitespace-nowrap text-right min-w-[60px]">
          <div className="font-bold">
            {(monthUsageAllowance / 1000000).toFixed(2)}M
          </div>
          <div className="opacity-70">Total</div>
        </div>
      </div>
    </div>
  );
}

// Main React App Component
export default function App() {
  // Initialize Fireproof DB access and live queries for "apps" and "versions"
  const { useLiveQuery, database } = useFireproof("puter-apps-v6");
  const { docs: apps } = useLiveQuery("type", { key: "app", descending: true });
  const { docs: versions } = useLiveQuery("type", {
    key: "version",
    descending: true,
  });

  const fetchUsage = useCallback(async () => {
    if (!puter?.auth?.getMonthlyUsage) return;
    setUsageLoading(true);
    setUsageRefreshComplete(false);
    setUsagePulsing(true);
    try {
      await puter.auth.getMonthlyUsage();
      // The UsageBar component has its own internal state and also updates via this call if needed
      // but we mainly need this for the manual refresh button trigger
      setUsageRefreshComplete(true);
      // Reset the completion indicator and pulse after 2 seconds
      setTimeout(() => {
        setUsageRefreshComplete(false);
        setUsagePulsing(false);
      }, 2000);
    } catch {
      // ignore
      setUsagePulsing(false);
    }
    setUsageLoading(false);
  }, [puter]);

  // Panel resize handlers
  const handleMouseDown = useCallback((resizer, e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(resizer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const percentage = (mouseX / containerWidth) * 100;

      if (isResizing === "left") {
        // Resizing between left panel and code panel
        const newLeftWidth = Math.max(15, Math.min(40, percentage));
        setLeftPanelWidth(newLeftWidth);
        localStorage.setItem("leftPanelWidth", newLeftWidth.toString());
      } else if (isResizing === "right") {
        // Resizing between code panel and preview panel
        const newCodeWidth = Math.max(
          20,
          Math.min(60, percentage - leftPanelWidth),
        );
        setCodePanelWidth(newCodeWidth);
        localStorage.setItem("codePanelWidth", newCodeWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      
      // Add a transparent overlay to prevent iframe from capturing events
      const overlay = document.createElement("div");
      overlay.id = "resizing-overlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "9999";
      overlay.style.cursor = "col-resize";
      document.body.appendChild(overlay);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const overlay = document.getElementById("resizing-overlay");
      if (overlay) overlay.remove();
    };
  }, [isResizing, leftPanelWidth]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem("activeProvider", activeProvider);
  }, [activeProvider]);

  useEffect(() => {
    localStorage.setItem("favoriteModels", JSON.stringify([...favoriteModels]));
  }, [favoriteModels]);

  useEffect(() => {
    localStorage.setItem("apiKeys", JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem("model", model);
  }, [model]);

  // Load persisted settings on mount
  useEffect(() => {
    const savedActiveProvider = localStorage.getItem("activeProvider");
    if (savedActiveProvider) setActiveProvider(savedActiveProvider);

    const savedFavoriteModels = localStorage.getItem("favoriteModels");
    if (savedFavoriteModels) {
      try {
        setFavoriteModels(new Set(JSON.parse(savedFavoriteModels)));
      } catch (e) {}
    }

    const savedApiKeys = localStorage.getItem("apiKeys");
    if (savedApiKeys) {
      try {
        setApiKeys(JSON.parse(savedApiKeys));
      } catch (e) {}
    }

    const savedModel = localStorage.getItem("model");
    if (savedModel) setModel(savedModel);
  }, []);

  // State variables for app logic
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("gpt-4o-mini");
  const [provider, setProvider] = useState("All");
  const [puter, setPuter] = useState(null);
  const [user, setUser] = useState(null);
  const [log, setLog] = useState([]);
  const [showCode, setShowCode] = useState(false);

  // Sync editCode with activeFile content when activeFile changes
  useEffect(() => {
    const file = files.find((f) => f.name === activeFile);
    if (file) {
      setEditCode(file.content);
    }
  }, [activeFile, files]);

  // Derived state to replace missing displayCode
  const displayCode = showCode || editCode || selectedApp?.code;

  // New feature states (filters, bulk mode, modals)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeProvider, setActiveProvider] = useState("Puter");
  const [apiKeys, setApiKeys] = useState({});
  const [favoriteModels, setFavoriteModels] = useState(new Set());
  const [pollinationsModels, setPollinationsModels] = useState([]);
  const [shareLink, setShareLink] = useState("");
  const [activeTab, setActiveTab] = useState("build");
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageRefreshComplete, setUsageRefreshComplete] = useState(false);
  const fileInputRef = useRef(null);

  // Panel collapse states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [codePanelCollapsed, setCodePanelCollapsed] = useState(false);
  const [previewPanelCollapsed, setPreviewPanelCollapsed] = useState(false);

  // Panel width states (percentages)
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem("leftPanelWidth");
    return saved ? parseFloat(saved) : 25;
  });
  const [codePanelWidth, setCodePanelWidth] = useState(() => {
    const saved = localStorage.getItem("codePanelWidth");
    return saved ? parseFloat(saved) : 42;
  });

  // Resizing state
  const [isResizing, setIsResizing] = useState(null);
  const containerRef = useRef(null);

  // Handle panel resizing
  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseXPercent = (mouseX / containerRect.width) * 100;

    if (isResizing === "left") {
      const newWidth = Math.max(10, Math.min(40, mouseXPercent));
      setLeftPanelWidth(newWidth);
      localStorage.setItem("leftPanelWidth", newWidth);
    } else if (isResizing === "right") {
      // Calculate from the right if needed, or based on total width
      const codeStartPercent = leftPanelCollapsed ? 0 : leftPanelWidth;
      const newCodeWidth = Math.max(10, Math.min(80, mouseXPercent - codeStartPercent));
      setCodePanelWidth(newCodeWidth);
      localStorage.setItem("codePanelWidth", newCodeWidth);
    }
  }, [isResizing, leftPanelWidth, leftPanelCollapsed]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);


  // App layout state (side-by-side, stacked, custom)
  const [appLayout, setAppLayout] = useState(() => {
    return localStorage.getItem("app-layout") || "side-by-side";
  });

  // File creation modal state
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // File tabs state for multi-file support
  const [files, setFiles] = useState([{ name: "index.html", content: "" }]);
  const [activeFile, setActiveFile] = useState("index.html");

  // Get current file content for the editor
  const currentFileContent = useMemo(() => {
    const file = files.find((f) => f.name === activeFile);
    return file ? file.content : "";
  }, [files, activeFile]);

  // Update file content when editor changes
  const updateFileContent = useCallback(
    (newContent) => {
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.name === activeFile ? { ...f, content: newContent } : f,
        ),
      );
    },
    [activeFile],
  );

  // Run button handler
  const handleRun = useCallback(() => {
    const iframe = document.querySelector('iframe[title="App Preview"]');
    if (iframe) {
      const currentSrc = iframe.src;
      iframe.src = 'about:blank';
      setTimeout(() => {
        iframe.src = currentSrc;
        iframe.srcdoc = editCode || selectedApp?.code || "";
      }, 10);
    }
  }, [editCode, selectedApp]);

  // Delete a file
  const deleteFile = useCallback(
    (fileName) => {
      if (files.length <= 1) return; // Don't delete last file
      setFiles((prevFiles) => prevFiles.filter((f) => f.name !== fileName));
      if (activeFile === fileName) {
        const remainingFiles = files.filter((f) => f.name !== fileName);
        setActiveFile(remainingFiles[0]?.name || "index.html");
      }
    },
    [files, activeFile],
  );

  // Usage bar pulse state
  const [usagePulsing, setUsagePulsing] = useState(false);

  // Show editor by default (for pasting code)
  const [showEditorDefault, setShowEditorDefault] = useState(true);

  // Predefined app templates the user can select from
  const templates = useMemo(
    () => [
      {
        id: "todo",
        name: "Todo App",
        icon: "✅",
        prompt:
          "A beautiful todo app with categories, priorities, due dates, dark/light mode toggle, and local storage persistence",
      },
      {
        id: "calculator",
        name: "Calculator",
        icon: "🔢",
        prompt:
          "A scientific calculator with history, memory functions, keyboard support, and a sleek modern UI",
      },
      {
        id: "notes",
        name: "Notes App",
        icon: "📝",
        prompt:
          "A notes app with markdown support, folders, search, tags, and auto-save functionality",
      },
      {
        id: "timer",
        name: "Pomodoro Timer",
        icon: "⏱️",
        prompt:
          "A pomodoro timer with customizable work/break intervals, statistics, sounds, and notifications",
      },
      {
        id: "weather",
        name: "Weather Dashboard",
        icon: "🌤️",
        prompt:
          "A weather dashboard that shows current conditions, 5-day forecast, with beautiful animations and location search",
      },
      {
        id: "kanban",
        name: "Kanban Board",
        icon: "📋",
        prompt:
          "A kanban board with drag-and-drop cards, multiple columns, labels, and local storage",
      },
      {
        id: "password",
        name: "Password Generator",
        icon: "🔐",
        prompt:
          "A password generator with strength meter, customizable options, copy to clipboard, and password history",
      },
      {
        id: "quiz",
        name: "Quiz Game",
        icon: "🎯",
        prompt:
          "An interactive quiz game with multiple categories, scoring, timer, and leaderboard",
      },
      {
        id: "expense",
        name: "Expense Tracker",
        icon: "💰",
        prompt:
          "An expense tracker with categories, charts, monthly budgets, and export functionality",
      },
      {
        id: "drawing",
        name: "Drawing App",
        icon: "🎨",
        prompt:
          "A drawing canvas with brush sizes, colors, shapes, layers, undo/redo, and save as image",
      },
      {
        id: "music",
        name: "Music Player",
        icon: "🎵",
        prompt:
          "A music player UI with playlist, progress bar, volume control, shuffle, and visualizer",
      },
      {
        id: "chat",
        name: "Chat Interface",
        icon: "💬",
        prompt:
          "A chat interface with message bubbles, typing indicators, timestamps, and emoji picker",
      },
      {
        id: "image-describer",
        name: "Image Describer",
        icon: "🖼️",
        prompt:
          "An app where users can upload or paste an image URL, and it uses AI to describe the content in detail.",
      },
      {
        id: "rss-reader",
        name: "RSS Feed Reader",
        icon: "📰",
        prompt:
          "A modern RSS feed reader with article preview, categorization, and the ability to add custom feed URLs.",
      },
      {
        id: "ai-chat",
        name: "AI Chat App",
        icon: "🤖",
        prompt:
          "A sophisticated AI chat interface with markdown rendering, code highlighting, and conversation history.",
      },
      {
        id: "tts-app",
        name: "TTS App",
        icon: "🗣️",
        prompt:
          "A Text-to-Speech application with multiple voice options, speed control, and the ability to download audio.",
      },
      {
        id: "unit-converter",
        name: "Unit Converter",
        icon: "🔄",
        prompt:
          "A comprehensive unit converter for length, weight, temperature, and more with a clean, easy-to-use UI.",
      },
      {
        id: "code-beautifier",
        name: "Code Beautifier",
        icon: "✨",
        prompt:
          "A tool to format and beautify code for various languages like HTML, CSS, JS, and Python.",
      },
    ],
    [],
  );

  // Utility to add message to logs (keeping last 15)
  const addLog = useCallback((msg) => {
    setLog((prev) => [
      ...prev.slice(-14),
      `${new Date().toLocaleTimeString()}: ${msg}`,
    ]);
  }, []);

  // App details for selected app
  const selectedAppDetails = useMemo(() => {
    if (!selectedApp) return null;
    return (
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-inherit text-xs flex items-center gap-1 truncate">
              <span className="text-[#dc2626]">📱</span>
              {selectedApp.appTitle || selectedApp.appName}
              {selectedApp.favorite && <span>⭐</span>}
            </div>
            <div className="text-[var(--text-secondary)] text-[10px] flex items-center gap-2 mt-0.5">
              <span>v{selectedApp.version || 1}</span>
              <span>•</span>
              <span>👁️ {selectedApp.views || 0}</span>
              <span>•</span>
              <span className="truncate">{selectedApp.model}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => toggleFavorite(selectedApp, e)}
              className={cn(
                neuBtn,
                "rounded-lg w-7 h-7 flex items-center justify-center text-sm text-inherit",
              )}
            >
              {selectedApp.favorite ? "⭐" : "☆"}
            </button>
            <button
              onClick={(e) => launchApp(selectedApp, e)}
              className={cn(
                neuBtnBlack,
                "rounded-lg px-2 py-1 font-bold text-xs",
              )}
            >
              Launch
            </button>
            <button
              onClick={(e) => deleteApp(selectedApp, e)}
              className={cn(
                neuBtn,
                "rounded-lg w-7 h-7 flex items-center justify-center text-sm text-[#dc2626]",
              )}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    );
  }, [selectedApp, toggleFavorite, launchApp, deleteApp]);

  // Debounced search input to reduce filtering overhead
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // List of unique providers + All option (sorted)
  const providers = useMemo(
    () => ["All", ...new Set(models.map((m) => m.provider))].sort(),
    [models],
  );

  const filteredModels = useMemo(() => {
    let list;

    // Filter based on activeProvider
    if (activeProvider === "Pollinations") {
      list = pollinationsModels;
    } else if (activeProvider === "Puter") {
      // For Puter, use puter models filtered by secondary provider dropdown
      list =
        provider === "All"
          ? models.filter((m) => m.provider !== "Pollinations")
          : models.filter(
              (m) => m.provider === provider && m.provider !== "Pollinations",
            );
    } else {
      // Fallback for other providers
      list =
        provider === "All"
          ? models
          : models.filter((m) => m.provider === provider);
    }

    // Separate favorites and non-favorites
    const favorites = list.filter((m) => favoriteModels.has(m.id));
    const nonFavorites = list.filter((m) => !favoriteModels.has(m.id));

    // Return favorites first, then non-favorites
    return [...favorites, ...nonFavorites];
  }, [models, pollinationsModels, provider, activeProvider, favoriteModels]);

  // Filtered and sorted apps based on states: memoized
  const filteredApps = useMemo(() => {
    if (!apps) return [];
    return apps
      .filter((app) => {
        if (filterFavorites && !app.favorite) return false;
        if (debouncedSearchQuery) {
          const q = debouncedSearchQuery.toLowerCase();
          return (
            app.appName?.toLowerCase().includes(q) ||
            app.appTitle?.toLowerCase().includes(q) ||
            app.prompt?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date") return (b.createdAt || 0) - (a.createdAt || 0);
        if (sortBy === "name")
          return (a.appTitle || a.appName || "").localeCompare(
            b.appTitle || b.appName || "",
          );
        if (sortBy === "views") return (b.views || 0) - (a.views || 0);
        return 0;
      });
  }, [apps, filterFavorites, debouncedSearchQuery, sortBy]);

  // Calculate app analytics stats for display
  const analytics = useMemo(() => {
    return {
      totalApps: apps.length,
      totalVersions: versions.filter(
        (v) => selectedApp && v.appId === selectedApp._id,
      ).length,
      favorites: apps.filter((a) => a.favorite).length,
      totalViews: apps.reduce((sum, a) => sum + (a.views || 0), 0),
      modelsUsed: new Set(apps.map((a) => a.model)).size,
      avgCodeSize: apps.length
        ? Math.round(
            apps.reduce((sum, a) => sum + (a.code?.length || 0), 0) /
              apps.length,
          )
        : 0,
    };
  }, [apps, versions, selectedApp]);

  // On mount, load Puter SDK, user, and AI models list
  useEffect(() => {
    // Load Puter SDK script
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.onload = async () => {
      setPuter(window.puter);
      addLog("SDK ready");
      if (window.puter.auth.isSignedIn()) {
        const u = await window.puter.auth.getUser();
        setUser(u);
        addLog(`Welcome ${u.username}`);
      }
    };
    document.body.appendChild(script);

    // Fetch AI models from Puter API
    fetch("https://api.puter.com/puterai/chat/models/")
      .then((r) => r.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.models || []).map(
          (m) => {
            const id = typeof m === "string" ? m : m.id;
            // Determine model provider by pattern matching
            let prov = "Other";
            if (/gpt|o1|o3|chatgpt/i.test(id)) prov = "OpenAI";
            else if (/claude/i.test(id)) prov = "Anthropic";
            else if (/gemini|gemma/i.test(id)) prov = "Google";
            else if (/llama/i.test(id)) prov = "Meta";
            else if (/mistral|mixtral/i.test(id)) prov = "Mistral";
            else if (/deepseek/i.test(id)) prov = "DeepSeek";
            else if (/grok/i.test(id)) prov = "xAI";
            else if (/qwen/i.test(id)) prov = "Alibaba";
            return { id, provider: prov };
          },
        );
        setModels(list);
      })
      .catch(() => {});
  }, [addLog]);

  // Sign in the user through Puter auth
  const signIn = useCallback(async () => {
    if (!puter) return;
    await puter.auth.signIn();
    const u = await puter.auth.getUser();
    setUser(u);
    addLog(`Welcome ${u.username}`);
  }, [puter, addLog]);

  // Build and deploy app from prompt or template
  const buildAndDeploy = useCallback(
    async (customPrompt) => {
      const finalPrompt = customPrompt || prompt;
      if (!finalPrompt.trim() || !puter || !user) return;
      setGenerating(true);

      const isIterative = !!selectedApp;
      if (!isIterative) {
        setSelectedApp(null);
        setEditCode("");
      }
      setLog([]);
      setShowTemplates(false);

      try {
        addLog(`Model: ${model}`);
        addLog(
          isIterative
            ? "Updating app with new instructions..."
            : "Generating code...",
        );

        // System prompt to instruct AI for proper html app generation
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
        if (isIterative) {
          systemPrompt += `\n\nYou are updating an existing app. Here is the current code:\n${selectedApp.code}\n\nApply the user's requested changes while keeping the existing functionality intact. Return the FULL updated HTML.`;
          userPrompt = `Update Request: ${finalPrompt}`;
        }

        // Ask AI chat for HTML generation from prompt
        let code = "";
        if (activeProvider === "Puter") {
          // Streaming implementation for Puter AI
          const stream = await puter.ai.chat(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            { model, stream: true },
          );

          let fullCode = "";
          for await (const part of stream) {
            if (part?.text) {
              fullCode += part.text;
              // Update editor live
              setEditCode(fullCode);
              updateFileContent(fullCode);
            }
          }
          code = fullCode;
        } else if (activeProvider === "Pollinations") {
          const pollKey = apiKeys["Pollinations"];
          const url = `https://gen.pollinations.ai/text/${encodeURIComponent(systemPrompt + "\n\n" + userPrompt)}?model=${model}&json=true`;

          const res = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "*/*",
              Authorization: pollKey ? `Bearer ${pollKey}` : "",
            },
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(
              `Pollinations API Error: ${res.status} ${errorText}`,
            );
          }

          const text = await res.text();
          try {
            const data = JSON.parse(text);
            code =
              data?.choices?.[0]?.message?.content ||
              data?.content ||
              String(data);
          } catch (e) {
            // If not JSON, use the raw text as code
            code = text;
          }
        }

        code = code
          .replace(/```html?\n?/gi, "")
          .replace(/```\n?/g, "")
          .trim();
        const start = code.search(/<!doctype\s+html>/i);
        if (start > 0) code = code.slice(start);
        if (!code.toLowerCase().includes("<!doctype html>"))
          throw new Error("Invalid HTML");

        addLog(`Generated ${code.length} bytes`);

        addLog("Updating files...");
        const dirName = selectedApp?.dir || `app_${Date.now()}`;
        if (!selectedApp) await puter.fs.mkdir(dirName);
        await puter.fs.write(`${dirName}/index.html`, code);
        addLog(`Wrote to ${dirName}/index.html`);

        let hostedUrl = selectedApp?.hostedUrl;
        let subdomain = selectedApp?.subdomain;

        if (!selectedApp) {
          addLog("Creating hosted site...");
          subdomain =
            appName
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "") || puter.randName();
          const site = await puter.hosting.create(subdomain, dirName);
          hostedUrl = `https://${site.subdomain}.puter.site`;
          addLog(`Hosted at: ${hostedUrl}`);
        } else {
          addLog("Redeploying site...");
          // Ensure hosting is up to date
          try {
            const site = await puter.hosting.create(subdomain, dirName);
            hostedUrl = `https://${site.subdomain}.puter.site`;
          } catch (e) {}
        }

        const finalAppName = isIterative
          ? selectedApp.appName
          : appName.trim() || puter.randName();
        const finalAppTitle = isIterative
          ? selectedApp.appTitle
          : appTitle.trim() || finalPrompt.slice(0, 50);

        if (!isIterative) {
          addLog("Registering Puter app...");
          let puterApp;
          try {
            puterApp = await puter.apps.create({
              name: finalAppName,
              indexURL: hostedUrl,
              title: finalAppTitle,
              description: finalPrompt,
              maximizeOnStart: true,
              dedupeName: true,
            });
            addLog(`App registered: ${puterApp.name}`);
          } catch (appErr) {
            addLog(`Name taken, using random...`);
            const randomName = puter.randName();
            puterApp = await puter.apps.create({
              name: randomName,
              indexURL: hostedUrl,
              title: finalAppTitle,
              description: finalPrompt,
              maximizeOnStart: true,
            });
            addLog(`App registered: ${puterApp.name}`);
          }
        }

        addLog("Saving to database...");
        const newVersion = (selectedApp?.version || 0) + 1;

        const appDoc = {
          ...(selectedApp || {}),
          type: "app",
          prompt: isIterative
            ? `${selectedApp.prompt}\n\nUpdate: ${finalPrompt}`
            : finalPrompt,
          code,
          subdomain,
          hostedUrl,
          appName: isIterative ? selectedApp.appName : finalAppName,
          appTitle: finalAppTitle,
          model,
          dir: dirName,
          updatedAt: Date.now(),
          version: newVersion,
        };

        if (!isIterative) {
          appDoc.createdAt = Date.now();
          appDoc.views = 0;
          appDoc.favorite = false;
          appDoc.tags = [];
        }

        const doc = await database.put(appDoc);

        // Save version record
        await database.put({
          type: "version",
          appId: doc.id,
          code,
          version: newVersion,
          createdAt: Date.now(),
          note: isIterative
            ? `Update: ${finalPrompt.slice(0, 30)}...`
            : "Initial version",
        });

        const saved = await database.get(doc.id);
        setSelectedApp(saved);
        if (!isIterative) {
          setAppName("");
          setAppTitle("");
        }
        setPrompt("");
        setSelectedTemplate(null);
        addLog("✅ Complete!");
        window.open(hostedUrl, "_blank");
      } catch (err) {
        addLog(`❌ Error: ${err.message}`);
      }
      setGenerating(false);
    },
    [
      puter,
      user,
      model,
      prompt,
      appName,
      appTitle,
      database,
      addLog,
      selectedApp,
      activeProvider,
      apiKeys,
    ],
  );

  // Update existing app and redeploy
  const updateAndRedeploy = useCallback(async () => {
    if (!selectedApp || !editCode || !puter) return;
    setGenerating(true);
    try {
      addLog("Updating...");

      const dirName = `app_${Date.now()}`;
      await puter.fs.mkdir(dirName);
      await puter.fs.write(`${dirName}/index.html`, editCode);

      // Delete old hosting then create new
      try {
        await puter.hosting.delete(selectedApp.subdomain);
      } catch (e) {}

      const site = await puter.hosting.create(selectedApp.subdomain, dirName);
      const hostedUrl = `https://${site.subdomain}.puter.site`;

      // Update Puter app record
      if (selectedApp.appName) {
        try {
          await puter.apps.update(selectedApp.appName, { indexURL: hostedUrl });
          addLog(`Updated app: ${selectedApp.appName}`);
        } catch (e) {}
      }

      const newVersion = (selectedApp.version || 1) + 1;

      // Save new version record
      await database.put({
        type: "version",
        appId: selectedApp._id,
        code: editCode,
        version: newVersion,
        createdAt: Date.now(),
        note: `Version ${newVersion}`,
      });

      // Update app document with new code and metadata
      await database.put({
        ...selectedApp,
        code: editCode,
        dir: dirName,
        hostedUrl,
        updatedAt: Date.now(),
        version: newVersion,
      });

      const updated = await database.get(selectedApp._id);
      setSelectedApp(updated);
      setEditCode("");
      addLog(`✅ Updated to v${newVersion}`);
      window.open(hostedUrl, "_blank");
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    }
    setGenerating(false);
  }, [selectedApp, editCode, puter, database, addLog]);

  // Delete an app and cleanup its hosting and versions
  const deleteApp = useCallback(
    async (app, e) => {
      e?.stopPropagation();
      try {
        addLog(`Deleting ${app.appName || app.subdomain}...`);
        if (app.appName) {
          try {
            await puter.apps.delete(app.appName);
          } catch (e) {}
        }
        if (app.subdomain) {
          try {
            await puter.hosting.delete(app.subdomain);
          } catch (e) {}
        }
        // Delete all version records for this app
        const appVersions = versions.filter((v) => v.appId === app._id);
        for (const v of appVersions) {
          await database.del(v._id);
        }
        await database.del(app._id);
        if (selectedApp?._id === app._id) {
          setSelectedApp(null);
          setEditCode("");
        }
        addLog("✅ Deleted");
      } catch (e) {
        addLog(`❌ Error: ${e.message}`);
      }
    },
    [puter, versions, database, selectedApp, addLog],
  );

  // Bulk delete selected apps
  const bulkDelete = useCallback(async () => {
    if (selectedApps.size === 0) return;
    for (const appId of selectedApps) {
      const app = apps.find((a) => a._id === appId);
      if (app) await deleteApp(app);
    }
    setSelectedApps(new Set());
    setBulkMode(false);
  }, [selectedApps, apps, deleteApp]);

  // Toggle app's favorite flag
  const toggleFavorite = useCallback(
    async (app, e) => {
      e?.stopPropagation();
      await database.put({ ...app, favorite: !app.favorite });
      if (selectedApp?._id === app._id) {
        setSelectedApp({ ...app, favorite: !app.favorite });
      }
    },
    [database, selectedApp],
  );

  // Increment view count when app is launched
  const incrementViews = useCallback(
    async (app) => {
      await database.put({ ...app, views: (app.views || 0) + 1 });
    },
    [database],
  );

  // Launch app either via Puter app or fallback to hosted url
  const launchApp = useCallback(
    async (app, e) => {
      e?.stopPropagation();
      await incrementViews(app);
      if (app.appName && puter) {
        try {
          await puter.apps.launch(app.appName);
          addLog(`Launched: ${app.appName}`);
        } catch (err) {
          window.open(app.hostedUrl, "_blank");
        }
      } else {
        window.open(app.hostedUrl, "_blank");
      }
    },
    [puter, incrementViews, addLog],
  );

  // Restore version from version history to editor
  const restoreVersion = useCallback(
    async (version) => {
      if (!selectedApp) return;
      setEditCode(version.code);
      addLog(`Restored v${version.version}`);
      setShowVersions(false);
    },
    [selectedApp, addLog],
  );

  // Export all apps as JSON file download
  const exportApps = useCallback(() => {
    const data = JSON.stringify(apps, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `puter-apps-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("✅ Exported apps");
    setShowExportModal(false);
  }, [apps, addLog]);

  // Export single app as JSON download
  const exportSingleApp = useCallback(
    (app) => {
      const data = JSON.stringify(app, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${app.appName || "app"}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog(`✅ Exported ${app.appName}`);
    },
    [addLog],
  );

  // Import apps from JSON file upload
  const importApps = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const imported = JSON.parse(text);
        const appsToImport = Array.isArray(imported) ? imported : [imported];
        for (const app of appsToImport) {
          delete app._id; // Remove ID to avoid conflicts
          app.imported = true;
          app.createdAt = Date.now();
          await database.put(app);
        }
        addLog(`✅ Imported ${appsToImport.length} app(s)`);
      } catch (err) {
        addLog(`❌ Import failed: ${err.message}`);
      }
      e.target.value = "";
      setShowExportModal(false);
    },
    [database, addLog],
  );

  // Generate a shareable encoded URL for an app
  const generateShareLink = useCallback((app) => {
    const encoded = btoa(
      JSON.stringify({
        prompt: app.prompt,
        code: app.code,
        title: app.appTitle,
      }),
    );
    const link = `${window.location.origin}?share=${encoded}`;
    setShareLink(link);
    setShowShareModal(true);
  }, []);

  // Copy share link text to clipboard
  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink);
    addLog("✅ Link copied!");
  }, [shareLink, addLog]);

  // Select an app template and set prompt and title
  const selectTemplate = useCallback((template) => {
    setSelectedTemplate(template);
    setPrompt(template.prompt);
    setAppTitle(template.name);
    setShowTemplates(false);
  }, []);

  // Get versions related to selected app sorted by version desc
  const appVersions = useMemo(() => {
    return selectedApp
      ? versions
          .filter((v) => v.appId === selectedApp._id)
          .sort((a, b) => b.version - a.version)
      : [];
  }, [versions, selectedApp]);

  // Force re-render when theme changes
  const [, forceUpdate] = useState(0);

  // Neomorphic UI styling classes - use CSS classes that reference CSS variables
  const neu = "neu-box";
  const neuInset = "neu-inset";
  const neuBtn = "neu-btn";
  const neuBtnRed = "neu-btn-red";
  const neuBtnBlack = "neu-btn-black";

  // JSX for layout
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "light";
    document.body.className = `theme-${savedTheme}`;
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header including app stats and user login */}
        <div className={cn(neu, "rounded-[20px] p-3")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <h1 className="text-xl md:text-2xl font-black text-[#1a1a1a] flex items-center gap-2 shrink-0">
                <span className="text-[#dc2626]">🖥️</span> JR AI Coder
              </h1>
              <div className="hidden md:flex flex-col border-l border-[#ccc] pl-4">
                <p className="text-[#666] text-xs font-bold uppercase tracking-wider">
                  {activeProvider}
                </p>
                <p className="text-[#888] text-[10px]">
                  {models.length} models • {apps.length} apps •{" "}
                  {analytics.totalViews} views
                </p>
              </div>
            </div>

            <UsageBar
              puter={puter}
              slim
              onFetch={() => {}}
              loading={usageLoading}
              isPulsing={usagePulsing}
            />

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowSettings(true)}
                className={cn(
                  neuBtn,
                  "p-2 rounded-lg flex items-center justify-center transition-all hover:scale-105",
                )}
                title="Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="settings-icon"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              {user && (
                <>
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={cn(
                      neuBtn,
                      "rounded-lg px-3 py-1.5 font-bold text-[#1a1a1a] text-xs transition-all hover:scale-105",
                    )}
                    title="Toggle Analytics"
                  >
                    📊
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className={cn(
                      neuBtn,
                      "rounded-lg px-3 py-1.5 font-bold text-[#1a1a1a] text-xs transition-all hover:scale-105",
                    )}
                    title="Export/Import Apps"
                  >
                    📦
                  </button>
                </>
              )}
              {user ? (
                <div className="flex items-center gap-2 relative group">
                  <div
                    className={cn(
                      neuInset,
                      "rounded-lg px-3 py-1.5 cursor-default flex items-center gap-2",
                    )}
                  >
                    <span className="font-bold text-[#1a1a1a] text-xs">
                      👤 {user.username}
                    </span>
                  </div>
                  {/* Logout popup on hover */}
                  <div className="absolute right-0 top-full pt-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto z-50 transform translate-y-2 group-hover:translate-y-0">
                    <div
                      className={cn(
                        neu,
                        "rounded-xl p-1.5 min-w-[100px] border border-[#d1d1d1]",
                      )}
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <button
                          onClick={fetchUsage}
                          disabled={usageLoading}
                          className={cn(
                            neuBtn,
                            "w-full rounded-lg px-3 py-2 font-bold text-xs transition-all text-left flex items-center gap-2",
                            usageRefreshComplete
                              ? "text-green-600"
                              : "text-[#1a1a1a]",
                          )}
                        >
                          {usageRefreshComplete ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-green-600"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={cn(usageLoading ? "animate-spin" : "")}
                            >
                              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
                              <path d="M21 3v9h-9" />
                            </svg>
                          )}
                          {usageRefreshComplete ? "Updated!" : "Refresh Usage"}
                        </button>
                        <button
                          onClick={() => {
                            puter.auth.signOut();
                            window.location.reload();
                          }}
                          className={cn(
                            neuBtn,
                            "w-full rounded-lg px-3 py-2 font-bold text-red-600 text-xs transition-all text-left flex items-center gap-2",
                          )}
                        >
                          <span>🚪</span> Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={signIn}
                  disabled={!puter}
                  className={cn(
                    neuBtnRed,
                    "rounded-lg px-4 py-2 font-black text-xs disabled:opacity-50 transition-all hover:scale-105",
                  )}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Analytics Panel - shows app metrics */}
        {showAnalytics && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { label: "Total Apps", value: analytics.totalApps, icon: "📱" },
              { label: "Favorites", value: analytics.favorites, icon: "⭐" },
              {
                label: "Total Views",
                value: analytics.totalViews,
                icon: "👁️",
              },
              {
                label: "Models Used",
                value: analytics.modelsUsed,
                icon: "🤖",
              },
              {
                label: "Avg Code Size",
                value: `${(analytics.avgCodeSize / 1024).toFixed(1)}KB`,
                icon: "📄",
              },
              { label: "Versions", value: versions.length, icon: "📚" },
            ].map((stat, i) => (
              <div
                key={i}
                className={cn(neuInset, "rounded-2xl p-4 text-center")}
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="font-black text-[#1a1a1a] text-xl">
                  {stat.value}
                </div>
                <div className="text-[#666] text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export/Import Modal */}
      {showExportModal && (
        <ExportImportModal
          neu={neu}
          neuBtn={neuBtn}
          neuBtnBlack={neuBtnBlack}
          onClose={() => setShowExportModal(false)}
          onExport={exportApps}
          onImport={importApps}
          fileInputRef={fileInputRef}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          neu={neu}
          neuInset={neuInset}
          neuBtnRed={neuBtnRed}
          neuBtnBlack={neuBtnBlack}
          shareLink={shareLink}
          onClose={() => setShowShareModal(false)}
          onCopy={copyShareLink}
        />
      )}

      {/* Versions Modal */}
      {showVersions && selectedApp && (
        <VersionsModal
          neu={neu}
          neuInset={neuInset}
          neuBtnBlack={neuBtnBlack}
          appVersions={appVersions}
          onClose={() => setShowVersions(false)}
          onRestore={restoreVersion}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          neu={neu}
          neuBtn={neuBtn}
          neuBtnBlack={neuBtnBlack}
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelect={selectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          neu={neu}
          neuInset={neuInset}
          neuBtn={neuBtn}
          neuBtnRed={neuBtnRed}
          neuBtnBlack={neuBtnBlack}
          activeProvider={activeProvider}
          setActiveProvider={setActiveProvider}
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
          favoriteModels={favoriteModels}
          setFavoriteModels={setFavoriteModels}
          models={models}
          pollinationsModels={pollinationsModels}
          setPollinationsModels={setPollinationsModels}
          user={user}
          puter={puter}
          onClose={() => setShowSettings(false)}
          signIn={signIn}
          apps={apps}
          appLayout={appLayout}
          setAppLayout={setAppLayout}
        />
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <NewFileModal
          neu={neu}
          neuBtn={neuBtn}
          neuBtnBlack={neuBtnBlack}
          neuInset={neuInset}
          onClose={() => {
            setShowNewFileModal(false);
            setNewFileName("");
          }}
          onCreate={(fileName) => {
            const fileExists = files.some(
              (f) => f.name.toLowerCase() === fileName.toLowerCase(),
            );
            if (fileExists) {
              addLog(`File "${fileName}" already exists`);
              return;
            }
            setFiles((prev) => [...prev, { name: fileName, content: "" }]);
            setActiveFile(fileName);
            addLog(`Created new file: ${fileName}`);
            setNewFileName("");
            setShowNewFileModal(false);
          }}
        />
      )}

      {/* If no user signed in show get started screen */}
      {!user ? (
        <div className={cn(neu, "rounded-[32px] p-12 text-center")}>
          <div
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#dc2626] flex items-center justify-center shadow-[inset_4px_4px_8px_#b91c1c,inset_-4px_-4px_8px_#ef4444]"
            aria-hidden="true"
          >
            <span className="text-5xl">🚀</span>
          </div>
          <h2 className="text-3xl font-black text-[#1a1a1a] mb-3">
            Build & Deploy Puter Apps
          </h2>
          <p className="text-[#666] mb-8 max-w-md mx-auto">
            Describe your app → AI builds it → Deploy as a real Puter app with
            live URL
          </p>
          <button
            onClick={signIn}
            disabled={!puter}
            className={cn(
              neuBtnRed,
              "rounded-full px-10 py-4 font-black text-lg disabled:opacity-50",
            )}
          >
            Get Started Free
          </button>
        </div>
      ) : (
        // Main logged-in UI with 3-panel layout: AI Generate | Code Editor | Preview
        <div
          ref={containerRef}
          className={cn(
            "flex gap-0",
            appLayout === "stacked"
              ? "flex-col"
              : appLayout === "custom"
                ? "flex-col"
                : "lg:flex-row flex-col",
          )}
          style={{ minHeight: "600px" }}
        >
          {/* Left Panel: AI Generate */}

          <div
            className={cn(
              "transition-all duration-300",
              leftPanelCollapsed && "lg:min-w-[50px] lg:max-w-[50px]",
              (appLayout === "custom" || appLayout === "stacked") ? "w-full" : "space-y-4",
            )}
            style={{
              width:
                (appLayout === "custom" || appLayout === "stacked")
                  ? "100%"
                  : leftPanelCollapsed
                    ? "50px"
                    : `${leftPanelWidth}%`,
              minWidth: leftPanelCollapsed
                ? "50px"
                : (appLayout === "custom" || appLayout === "stacked")
                  ? "100%"
                  : "200px",
              flexShrink: 0,
            }}
          >
            {/* Panel Header with Collapse Button */}
            <div
              className={cn(neu, "rounded-[24px] p-2 flex gap-2 items-center")}
            >
              {!leftPanelCollapsed ? (
                <>
                  {[
                    { id: "build", label: "Create", icon: "🔨" },
                    { id: "apps", label: "Apps", icon: "📱" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex-1 py-2 rounded-xl font-bold text-xs transition-all",
                        activeTab === tab.id
                          ? cn(neuInset, "text-[#dc2626]")
                          : cn(neuBtn, "text-[#1a1a1a]"),
                      )}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                  <CollapseButton
                    isCollapsed={leftPanelCollapsed}
                    onToggle={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                    direction="left"
                  />
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full py-2">
                  <CollapseButton
                    isCollapsed={leftPanelCollapsed}
                    onToggle={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                    direction="left"
                  />
                  <span
                    className="text-xs font-bold text-[#666] writing-mode-vertical"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }}
                  >
                    AI
                  </span>
                </div>
              )}
            </div>

            {!leftPanelCollapsed && (
              <>
                {/* Build Tab Content */}
                {activeTab === "build" && (
                  <div className={cn(neu, "rounded-[24px] p-4")}>
                    {/* Button to open template modal */}
                    <button
                      onClick={() => setShowTemplates(true)}
                      className={cn(
                        "w-full",
                        neuBtn,
                        "rounded-xl py-2 font-bold text-[#1a1a1a] text-xs mb-3 flex items-center justify-center gap-2",
                      )}
                    >
                      🎨 Choose Template
                    </button>

                    {/* If template selected show info with clear */}
                    {selectedTemplate && (
                      <div
                        className={cn(
                          neuInset,
                          "rounded-xl p-2 mb-3 flex items-center gap-2",
                        )}
                      >
                        <span className="text-lg">{selectedTemplate.icon}</span>
                        <div>
                          <div className="font-bold text-[#1a1a1a] text-xs">
                            {selectedTemplate.name}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTemplate(null);
                              setPrompt("");
                            }}
                            className="text-[#dc2626] text-[10px]"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Model selector dropdown */}
                    <div className="mb-3">
                      <label className="font-black text-inherit text-[10px] uppercase tracking-wider mb-1 block">
                        Model ({activeProvider})
                      </label>
                      <div className={cn(neuInset, "rounded-xl p-1")}>
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full p-2 bg-transparent font-mono text-[10px] text-inherit border-0 outline-none"
                        >
                          {filteredModels.filter((m) =>
                            favoriteModels.has(m.id),
                          ).length > 0 && (
                            <optgroup label="Favorites" className="bg-[var(--bg-secondary)] text-inherit">
                              {filteredModels
                                .filter((m) => favoriteModels.has(m.id))
                                .map((m) => (
                                  <option key={m.id} value={m.id} className="bg-[var(--bg-secondary)] text-inherit">
                                    {m.id}
                                  </option>
                                ))}
                            </optgroup>
                          )}
                          <optgroup
                            label={
                              filteredModels.filter((m) =>
                                favoriteModels.has(m.id),
                              ).length > 0
                                ? "All Models"
                                : "Models"
                            }
                            className="bg-[var(--bg-secondary)] text-inherit"
                          >
                            {filteredModels
                              .filter((m) => !favoriteModels.has(m.id))
                              .map((m) => (
                                <option key={m.id} value={m.id} className="bg-[var(--bg-secondary)] text-inherit">
                                  {m.id}
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {/* App Description textarea */}
                    <div className="mb-3">
                      <label className="font-black text-[#dc2626] text-[10px] uppercase tracking-wider mb-1 block">
                        {selectedApp
                          ? `Modify "${selectedApp.appTitle || selectedApp.appName}"`
                          : "App Description"}
                      </label>
                      <div className={cn(neuInset, "rounded-xl p-1")}>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={
                            selectedApp
                              ? "Describe changes to apply to the current app..."
                              : "Describe your app in detail..."
                          }
                          className="w-full h-20 p-2 bg-transparent font-mono text-xs text-inherit resize-none border-0 outline-none placeholder-[#999]"
                        />
                      </div>
                    </div>

                    {/* Inputs for app name and title */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="font-black text-inherit text-[10px] uppercase tracking-wider mb-1 block">
                          App Name
                        </label>
                        <div className={cn(neuInset, "rounded-lg p-1")}>
                          <input
                            value={appName}
                            onChange={(e) =>
                              setAppName(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, ""),
                              )
                            }
                            placeholder="my-app"
                            className="w-full p-1.5 bg-transparent font-mono text-xs text-inherit border-0 outline-none placeholder-[#999]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-black text-inherit text-[10px] uppercase tracking-wider mb-1 block">
                          Title
                        </label>
                        <div className={cn(neuInset, "rounded-lg p-1")}>
                          <input
                            value={appTitle}
                            onChange={(e) => setAppTitle(e.target.value)}
                            placeholder="My App"
                            className="w-full p-1.5 bg-transparent text-xs text-inherit border-0 outline-none placeholder-[#999]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Build & Deploy Footer - matching Code/Preview panel style */}
                    <div
                      className={cn(
                        neuInset,
                        "rounded-xl p-2 flex items-center justify-between gap-2 mt-3",
                      )}
                    >
                      <span className="text-xs font-bold text-[#666] px-2 truncate">
                        {selectedApp
                          ? `Editing: ${selectedApp.appTitle || selectedApp.appName}`
                          : "New App"}
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        {selectedApp && (
                          <button
                            onClick={() => {
                              setSelectedApp(null);
                              setEditCode("");
                              setPrompt("");
                            }}
                            className={cn(
                              neuBtn,
                              "rounded-lg px-3 py-1.5 font-bold text-xs",
                            )}
                          >
                            🆕 New
                          </button>
                        )}
                        <button
                          onClick={() => buildAndDeploy()}
                          disabled={generating || !prompt.trim()}
                          className={cn(
                            neuBtnRed,
                            "rounded-lg px-4 py-1.5 font-bold text-xs disabled:opacity-50",
                            generating && "generating-pulse",
                          )}
                        >
                          {generating
                            ? "⏳ Building..."
                            : selectedApp
                              ? "✨ Update"
                              : "🚀 Create & Deploy"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Apps Tab Content: Search, filter and list of saved apps */}
                {activeTab === "apps" && (
                  <div className={cn(neu, "rounded-[24px] overflow-hidden")}>
                    {/* Search & Filters */}
                    <div className="p-4 space-y-3">
                      <div
                        className={cn(
                          neuInset,
                          "rounded-xl p-1 flex items-center",
                        )}
                      >
                        <span className="pl-3 text-[#999]">🔍</span>
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search apps..."
                          className="flex-1 p-2 bg-transparent text-sm text-[#1a1a1a] border-0 outline-none placeholder-[#999]"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setFilterFavorites(!filterFavorites)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold",
                            filterFavorites
                              ? "bg-[#dc2626] text-white"
                              : cn(neuBtn, "text-[#1a1a1a]"),
                          )}
                        >
                          ⭐ Favorites
                        </button>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className={cn(
                            neuBtn,
                            "rounded-full px-3 py-1.5 text-xs font-bold text-[#1a1a1a] outline-none",
                          )}
                        >
                          <option value="date">Recent</option>
                          <option value="name">Name</option>
                          <option value="views">Views</option>
                        </select>
                        <button
                          onClick={() => setBulkMode(!bulkMode)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold",
                            bulkMode
                              ? "bg-[#1a1a1a] text-white"
                              : cn(neuBtn, "text-[#1a1a1a]"),
                          )}
                        >
                          ☑️ Select
                        </button>
                      </div>

                      {/* Bulk delete button when in bulk mode with selections */}
                      {bulkMode && selectedApps.size > 0 && (
                        <button
                          onClick={bulkDelete}
                          className={cn(
                            neuBtnRed,
                            "rounded-xl w-full py-2 text-sm font-bold",
                          )}
                        >
                          🗑️ Delete {selectedApps.size} Selected
                        </button>
                      )}
                    </div>

                    {/* Apps list scroll area */}
                    <div className="max-h-96 overflow-y-auto">
                      {filteredApps.length === 0 ? (
                        <div className="p-6 text-[#888] text-center">
                          {searchQuery || filterFavorites
                            ? "No matching apps"
                            : "No apps yet"}
                        </div>
                      ) : (
                        filteredApps.map((app) => (
                          <div
                            key={app._id}
                            onClick={() => {
                              if (!bulkMode) {
                                setSelectedApp(app);
                                setEditCode("");
                              }
                            }}
                            className={cn(
                              "p-4 border-b border-[#d0d0d0] cursor-pointer transition-all",
                              selectedApp?._id === app._id
                                ? neuInset
                                : "hover:bg-[#ddd]",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox for bulk select */}
                              {bulkMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedApps.has(app._id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedApps);
                                    e.target.checked
                                      ? newSet.add(app._id)
                                      : newSet.delete(app._id);
                                    setSelectedApps(newSet);
                                  }}
                                  className="mt-1 w-5 h-5"
                                />
                              )}
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-inherit flex items-center gap-2">
                        <span className="text-[#dc2626]">📱</span>
                        {app.appTitle || app.appName}
                        {app.favorite && <span>⭐</span>}
                      </div>
                      <div className="text-[var(--text-secondary)] text-xs flex items-center gap-2 mt-1">
                        <span>v{app.version || 1}</span>
                        <span>•</span>
                        <span>👁️ {app.views || 0}</span>
                      </div>
                      <div className="text-[var(--text-secondary)] text-xs mt-1 truncate">
                        {app.prompt}
                      </div>
                    </div>
                              {!bulkMode && (
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={(e) => toggleFavorite(app, e)}
                                    className={cn(
                                      neuBtn,
                                      "rounded-full w-8 h-8 flex items-center justify-center text-sm",
                                    )}
                                  >
                                    {app.favorite ? "⭐" : "☆"}
                                  </button>
                                  <button
                                    onClick={(e) => launchApp(app, e)}
                                    className={cn(
                                      neuBtnBlack,
                                      "rounded-full w-8 h-8 flex items-center justify-center text-xs",
                                    )}
                                  >
                                    ▶
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Log panel showing recent actions and messages */}
                {log.length > 0 && <LogPanel log={log} />}
              </>
            )}
          </div>

          {/* Resizer 1 */}
          {!leftPanelCollapsed && !codePanelCollapsed && (appLayout === "side-by-side" || !appLayout) && (
            <div
              onMouseDown={(e) => handleMouseDown("left", e)}
              className={cn(
                "panel-resizer",
                isResizing === "left" && "active",
                "hidden lg:flex",
              )}
            />
          )}

          {/* Middle Panel: Code Editor */}
          <div
            className={cn(
              "space-y-4 transition-all duration-300",
              codePanelCollapsed && "lg:min-w-[50px] lg:max-w-[50px]",
              (appLayout === "custom" || appLayout === "stacked") && "w-full",
              appLayout === "custom" && "flex-1",
            )}
            style={{
              width:
                (appLayout === "custom" || appLayout === "stacked")
                  ? "100%"
                  : codePanelCollapsed
                    ? "50px"
                    : `${codePanelWidth}%`,
              minWidth: codePanelCollapsed ? "50px" : (appLayout === "custom" || appLayout === "stacked") ? "100%" : "300px",
              flexShrink: appLayout === "custom" ? 1 : 0,
            }}
          >
            {codePanelCollapsed ? (
              <div
                className={cn(
                  neu,
                  "rounded-[24px] p-2 flex flex-col items-center gap-2 h-full",
                )}
              >
                <CollapseButton
                  isCollapsed={codePanelCollapsed}
                  onToggle={() => setCodePanelCollapsed(!codePanelCollapsed)}
                  direction="left"
                />
                <span
                  className="text-xs font-bold text-[#666]"
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  Code
                </span>
              </div>
            ) : (
              <div className={cn(neu, "rounded-[24px] overflow-hidden h-full")}>
                {/* Code Panel Header */}
                <div
                  className={cn(neu, "p-2 flex items-center justify-between")}
                >
                  <div className="flex items-center gap-1">
                    <CollapseButton
                      isCollapsed={codePanelCollapsed}
                      onToggle={() =>
                        setCodePanelCollapsed(!codePanelCollapsed)
                      }
                      direction="left"
                    />
                    <span className="font-bold text-inherit text-sm px-2">
                      Code
                    </span>
                    {/* File tabs */}
                    <div className="flex gap-1 items-center overflow-x-auto">
                      {files.map((file) => (
                        <div key={file.name} className="relative group">
                          <button
                            onClick={() => {
                              setActiveFile(file.name);
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap pr-6",
                              activeFile === file.name ? neuInset : neuBtn,
                              "text-inherit",
                            )}
                          >
                            {file.name}
                          </button>
                          {files.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFile(file.name);
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded text-xs text-red-500 hover:bg-red-100"
                              title="Delete file"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setShowNewFileModal(true)}
                        className={cn(
                          neuBtn,
                          "rounded-lg w-7 h-7 flex items-center justify-center text-sm flex-shrink-0",
                        )}
                        title="Add file"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const code = editCode || selectedApp?.code || "";
                        navigator.clipboard.writeText(code);
                      }}
                      disabled={!displayCode && !editCode}
                      className={cn(
                        neuBtn,
                        "rounded-lg px-2 py-1 font-bold text-xs text-[#1a1a1a] disabled:opacity-50",
                      )}
                      title="Copy code"
                    >
                      📋 Copy
                    </button>
                    <button
                      disabled={!displayCode && !editCode}
                      className={cn(
                        neuBtn,
                        "rounded-lg px-2 py-1 font-bold text-xs text-[#1a1a1a] disabled:opacity-50",
                      )}
                      title="Format code"
                    >
                      ✨ Format
                    </button>
                    {selectedApp && editCode && (
                      <button
                        onClick={updateAndRedeploy}
                        disabled={generating}
                        className={cn(
                          neuBtnRed,
                          "rounded-lg px-3 py-1.5 font-bold text-xs disabled:opacity-50",
                        )}
                      >
                        Save & Deploy
                      </button>
                    )}
                  </div>
                </div>

                {/* Code Editor - Always visible so users can paste code */}
                <div className="h-[520px] bg-white">
                  <div className="relative h-full">
                    {generating && (
                      <div className="code-loading-overlay">
                        <div className="code-spinner"></div>
                        <p className="mt-4 text-sm font-bold text-[#666]">
                          Generating code...
                        </p>
                      </div>
                    )}
                    <Editor
                      height="100%"
                      defaultLanguage="html"
                      theme={
                        document.body.className.includes("theme-dark")
                          ? "vs-dark"
                          : "light"
                      }
                      value={
                        currentFileContent ||
                        editCode ||
                        selectedApp?.code ||
                        ""
                      }
                      onChange={(value) => {
                        setEditCode(value);
                        updateFileContent(value);
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        wordWrap: "on",
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                        lineNumbers: "on",
                        scrollbar: { vertical: "hidden", horizontal: "hidden" },
                      }}
                    />
                    <div className="absolute bottom-2 right-2 text-[#666] text-xs z-10 bg-black/5 px-1 rounded">
                      {(editCode || selectedApp?.code || "").length} chars
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Resizer */}
          {!codePanelCollapsed && !previewPanelCollapsed && (appLayout === "side-by-side" || !appLayout) && (
            <div
              className={cn(
                "panel-resizer hidden lg:flex",
                isResizing === "right" && "active",
              )}
              onMouseDown={(e) => handleMouseDown("right", e)}
            />
          )}

          {/* Right Panel: Live Preview */}
          <div
            className={cn(
              "space-y-4 transition-all duration-300 flex-1",
              previewPanelCollapsed &&
                "lg:min-w-[50px] lg:max-w-[50px] lg:flex-none",
            )}
            style={{
              minWidth: previewPanelCollapsed ? "50px" : "250px",
            }}
          >
            {previewPanelCollapsed ? (
              <div
                className={cn(
                  neu,
                  "rounded-[24px] p-2 flex flex-col items-center gap-2 h-full",
                )}
              >
                <CollapseButton
                  isCollapsed={previewPanelCollapsed}
                  onToggle={() =>
                    setPreviewPanelCollapsed(!previewPanelCollapsed)
                  }
                  direction="right"
                />
                <span
                  className="text-xs font-bold text-[#666]"
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  Preview
                </span>
              </div>
            ) : (
              <div className={cn(neu, "rounded-[24px] overflow-hidden h-full")}>
                {/* Preview Header with controls */}
                <div
                  className={cn(
                    neu,
                    "p-2 flex items-center justify-between flex-wrap gap-2",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CollapseButton
                      isCollapsed={previewPanelCollapsed}
                      onToggle={() =>
                        setPreviewPanelCollapsed(!previewPanelCollapsed)
                      }
                      direction="right"
                    />
                    <span className="font-bold text-inherit text-sm px-2">
                      Preview
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {selectedApp && (
                      <>
                        <button
                          onClick={() => setShowVersions(true)}
                          className={cn(
                            neuBtn,
                            "rounded-lg px-2 py-1 font-bold text-xs text-[#1a1a1a]",
                          )}
                          title="Versions"
                        >
                          📚
                        </button>
                        <button
                          onClick={() => generateShareLink(selectedApp)}
                          className={cn(
                            neuBtn,
                            "rounded-lg px-2 py-1 font-bold text-xs text-[#1a1a1a]",
                          )}
                          title="Share"
                        >
                          🔗
                        </button>
                        <button
                          onClick={() => exportSingleApp(selectedApp)}
                          className={cn(
                            neuBtn,
                            "rounded-lg px-2 py-1 font-bold text-xs text-[#1a1a1a]",
                          )}
                          title="Export"
                        >
                          📤
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => selectedApp && launchApp(selectedApp, e)}
                      disabled={!displayCode}
                      className={cn(
                        neuBtn,
                        "rounded-lg px-2 py-1 font-bold text-xs text-[#1a1a1a] disabled:opacity-50",
                      )}
                      title="Open in new tab"
                    >
                      🔗 Open
                    </button>
                    <button
                      onClick={handleRun}
                      disabled={!displayCode}
                      className={cn(
                        neuBtnRed,
                        "rounded-lg px-3 py-1.5 font-bold text-xs disabled:opacity-50 flex items-center gap-1",
                      )}
                    >
                      ▶ Run
                    </button>
                  </div>
                </div>

                {/* Preview iframe or placeholder */}
                <div className="h-[520px] bg-white">
                  {displayCode ? (
                    <iframe
                      srcDoc={editCode || selectedApp?.code}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      title="App Preview"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        {generating ? (
                          <div
                            className={cn(
                              "w-16 h-16 mx-auto mb-4 rounded-full",
                              neuInset,
                              "flex items-center justify-center",
                            )}
                          >
                            <span
                              className="text-2xl animate-spin"
                              aria-label="Loading"
                            >
                              ⚙️
                            </span>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "w-16 h-16 mx-auto mb-4 rounded-full",
                              neu,
                              "flex items-center justify-center",
                            )}
                          >
                            <span className="text-2xl" aria-hidden="true">
                              📱
                            </span>
                          </div>
                        )}
                        <div className="font-black text-inherit text-sm">
                          {generating ? "BUILDING..." : "LIVE PREVIEW"}
                        </div>
                        {!generating && (
                          <div className="text-[#888] text-xs mt-2">
                            Build or select an app
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* App Details (compact) for selected app */}
                {selectedApp && (
                  <div className="p-3 border-t border-[#d0d0d0]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#1a1a1a] text-xs flex items-center gap-1 truncate">
                          <span className="text-[#dc2626]">📱</span>
                          {selectedApp.appTitle || selectedApp.appName}
                          {selectedApp.favorite && <span>⭐</span>}
                        </div>
                        <div className="text-[#666] text-[10px] flex items-center gap-2 mt-0.5">
                          <span>v{selectedApp.version || 1}</span>
                          <span>•</span>
                          <span>👁️ {selectedApp.views || 0}</span>
                          <span>•</span>
                          <span className="truncate">{selectedApp.model}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => toggleFavorite(selectedApp, e)}
                          className={cn(
                            neuBtn,
                            "rounded-lg w-7 h-7 flex items-center justify-center text-sm",
                          )}
                        >
                          {selectedApp.favorite ? "⭐" : "☆"}
                        </button>
                        <button
                          onClick={(e) => launchApp(selectedApp, e)}
                          className={cn(
                            neuBtnBlack,
                            "rounded-lg px-2 py-1 font-bold text-xs",
                          )}
                        >
                          Launch
                        </button>
                        <button
                          onClick={(e) => deleteApp(selectedApp, e)}
                          className={cn(
                            neuBtn,
                            "rounded-lg w-7 h-7 flex items-center justify-center text-sm text-[#dc2626]",
                          )}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 text-[#888] text-sm">
          <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
          Powered by <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-[#0010d9]">Puter.com</a> || Version 1.5.0 || Created by <a href="https://jayreddin.github.io" target="_blank" rel="noopener noreferrer" className="hover:underline text-[#0010d9]">Jayreddin</a>
          <span className="w-2 h-2 rounded-full bg-[#1a1a1a]"></span>
        </div>
      </div>
    </div>
  );
}

// Render the React App into #container div
const rootElement = document.getElementById("container");
if (rootElement) {
  ReactDOMClient.createRoot(rootElement).render(<App />);
}
