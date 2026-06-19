import { useState, useCallback } from "react";
import { isDemoMode } from "./api";
import ExperiencePage from "./components/ExperiencePage";
import GeneratorPage from "./components/GeneratorPage";
import EvalDashboard from "./components/EvalDashboard";
import HistoryPanel from "./components/HistoryPanel";

const TABS = [
  { id: "experience", label: "My Experience", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "generator", label: "Generate Resume", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "history", label: "History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "eval", label: "Eval", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
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
  } catch { /* quota exceeded */ }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("experience");
  const [history, setHistory] = useState(loadHistory);

  const handleResult = useCallback((result, jobDesc, companyName) => {
    setHistory((prev) => {
      const entry = {
        result,
        jobDesc,
        companyName: companyName || "Untitled",
        timestamp: new Date().toLocaleString(),
      };
      const updated = [entry, ...prev].slice(0, 10);
      saveHistory(updated);
      return updated;
    });
  }, []);

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
        {activeTab === "experience" && <ExperiencePage />}
        {activeTab === "generator" && <GeneratorPage onResult={handleResult} />}
        {activeTab === "history" && <HistoryPanel history={history} />}
        {activeTab === "eval" && <EvalDashboard />}
      </main>
    </div>
  );
}
