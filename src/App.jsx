import { useState, useCallback } from "react";
import { validateKey, isDemoMode } from "./api";
import AnalyzerPage from "./components/AnalyzerPage";
import EvalDashboard from "./components/EvalDashboard";
import HistoryPanel from "./components/HistoryPanel";

const TABS = [
  { id: "analyzer", label: "Analyzer", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "eval", label: "Eval Dashboard", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "history", label: "History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

function loadHistory() {
  try {
    const stored = localStorage.getItem("jobfit-history");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem("jobfit-history", JSON.stringify(history));
  } catch { /* quota exceeded — silently drop */ }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("analyzer");
  const [apiKey, setApiKey] = useState("");
  const [keySet, setKeySet] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const [validating, setValidating] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  async function handleSetKey() {
    if (!apiKey.trim() || validating) return;
    setValidating(true);
    setKeyError(null);
    const { valid, error } = await validateKey(apiKey.trim());
    setValidating(false);
    if (valid) {
      setKeySet(true);
    } else {
      setKeyError(error);
    }
  }

  const handleResult = useCallback((result, resume, jobDesc) => {
    setHistory((prev) => {
      const entry = {
        result,
        resume,
        jobDesc,
        timestamp: new Date().toLocaleString(),
      };
      const updated = [entry, ...prev].slice(0, 5);
      saveHistory(updated);
      return updated;
    });
  }, []);

  if (!keySet) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 border border-indigo-500/20 rounded-full text-xs text-indigo-300 font-medium">
              Powered by Claude
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">JobFit AI</h1>
            <p className="text-gray-400 text-sm">
              Claude-powered resume and job description analyzer with built-in evaluation harness
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4 backdrop-blur">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Anthropic API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetKey()}
                placeholder="sk-ant-..."
                disabled={validating}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all disabled:opacity-50"
              />
            </div>
            {keyError && <p className="text-sm text-red-400">{keyError}</p>}
            <button
              onClick={handleSetKey}
              disabled={validating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
            >
              {validating && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                </svg>
              )}
              {validating ? "Validating..." : "Get Started"}
            </button>
            <p className="text-xs text-gray-600 text-center">
              Your key is sent to the backend server and held in memory for this session only. It is never persisted to disk.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white tracking-tight">JobFit AI</h1>
              <span className="px-2 py-0.5 bg-indigo-900/30 border border-indigo-500/20 rounded-full text-[10px] text-indigo-300 font-medium">
                claude-sonnet-4-6
              </span>
              {isDemoMode() && (
                <span className="px-2 py-0.5 bg-amber-900/30 border border-amber-500/20 rounded-full text-[10px] text-amber-300 font-medium">
                  Demo Mode
                </span>
              )}
            </div>

            <nav className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === "history" && history.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] flex items-center justify-center text-white font-bold">
                      {history.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "analyzer" && <AnalyzerPage onResult={handleResult} />}
        {activeTab === "eval" && <EvalDashboard />}
        {activeTab === "history" && <HistoryPanel history={history} />}
      </main>
    </div>
  );
}
