import { useState, useCallback } from "react";
import { isDemoMode, getProviderName } from "./api";
import {
  User, Search, FileText, Clock, Clipboard, FlaskConical,
  Briefcase, Sparkles, BarChart3, FileDown, ArrowRight,
} from "lucide-react";
import ExperiencePage from "./components/ExperiencePage";
import SearchPage from "./components/SearchPage";
import GeneratorPage from "./components/GeneratorPage";
import TrackerPage from "./components/TrackerPage";
import EvalDashboard from "./components/EvalDashboard";
import HistoryPanel from "./components/HistoryPanel";

const TABS = [
  { id: "experience", label: "Experience", icon: User },
  { id: "search", label: "Search", icon: Search },
  { id: "generator", label: "Generate", icon: FileText },
  { id: "tracker", label: "Tracker", icon: Clipboard },
  { id: "history", label: "History", icon: Clock },
  { id: "eval", label: "Eval", icon: FlaskConical },
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

const FEATURES = [
  {
    icon: Briefcase,
    title: "Experience Bank",
    desc: "Store all your work, projects, volunteer, and education in one place. Upload an existing resume or add entries manually.",
  },
  {
    icon: Sparkles,
    title: "AI Resume Generation",
    desc: "A multi-step agent pipeline extracts requirements, scores your experience, drafts a tailored resume, evaluates it honestly, and revises until it's optimized.",
  },
  {
    icon: Search,
    title: "Job Matching",
    desc: "Search job boards automatically based on your experience. Each listing gets a fit score so you focus on roles where you're competitive.",
  },
  {
    icon: BarChart3,
    title: "ATS Keyword Analysis",
    desc: "See which keywords from the job description appear in your resume and which are missing. Maximize your chances of passing automated screening.",
  },
  {
    icon: FileDown,
    title: "PDF & DOCX Export",
    desc: "Download your tailored resume as a Harvard-template PDF or an ATS-friendly Word document. One-click copy to clipboard too.",
  },
  {
    icon: Clipboard,
    title: "Application Tracker",
    desc: "Track every application from Applied through Interviewing to Offered or Rejected. Add notes and never lose track of where you stand.",
  },
];

function WelcomePage({ onGetStarted }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto" style={{ padding: "var(--space-16) var(--space-6)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-12)" }}>
          <div
            className="inline-flex items-center"
            style={{
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-xl)",
              background: "var(--accent-muted)",
              border: "1px solid var(--accent-border)",
              marginBottom: "var(--space-6)",
            }}
          >
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--accent)" }}>
              Powered by Claude & GPT-4o
            </span>
          </div>

          <h1
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Your resume, tailored to
            <br />
            <span style={{ color: "var(--accent)" }}>every job you apply for</span>
          </h1>

          <p
            style={{
              fontSize: "15px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              maxWidth: "480px",
              margin: "var(--space-5) auto 0",
            }}
          >
            Store your experience once. For every job posting, an AI agent selects your most relevant work, rewrites your bullets, and generates a resume optimized to pass ATS screening.
          </p>

          <div className="flex items-center justify-center" style={{ gap: "var(--space-3)", marginTop: "var(--space-8)" }}>
            <button
              onClick={onGetStarted}
              className="flex items-center"
              style={{
                gap: "var(--space-2)",
                padding: "var(--space-3) var(--space-6)",
                borderRadius: "var(--radius-md)",
                fontSize: "14px",
                fontWeight: 600,
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Get Started <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", marginBottom: "var(--space-8)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-8)",
              padding: "var(--space-4) 0",
            }}
          >
            {[
              { n: "1", label: "Add Experience" },
              { n: "2", label: "Find Jobs" },
              { n: "3", label: "Generate Resume" },
              { n: "4", label: "Apply" },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center" style={{ gap: "var(--space-2)" }}>
                {i > 0 && (
                  <div style={{ width: "24px", height: "1px", background: "var(--border-default)", marginRight: "var(--space-2)" }} />
                )}
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: "var(--accent-muted)",
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  {step.n}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-4)" }}>
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-5)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent-muted)",
                  }}
                >
                  <Icon size={16} style={{ color: "var(--accent)" }} />
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "var(--space-10)" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            All data stored locally in your browser. Your API keys are held in server memory only, never persisted.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem("jobfit-welcomed");
  });
  const [activeTab, setActiveTab] = useState("experience");
  const [history, setHistory] = useState(loadHistory);
  const [prefillJob, setPrefillJob] = useState(null);

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

  const handleSelectJob = useCallback((jobDescription, companyName) => {
    setPrefillJob({ jobDescription, companyName });
    setActiveTab("generator");
  }, []);

  function handleGetStarted() {
    localStorage.setItem("jobfit-welcomed", "true");
    setShowWelcome(false);
  }

  if (showWelcome) {
    return <WelcomePage onGetStarted={handleGetStarted} />;
  }

  const provider = getProviderName();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header
        className="sticky top-0 z-10"
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-5xl mx-auto" style={{ padding: "0 var(--space-6)" }}>
          <div className="flex items-center justify-between" style={{ height: "56px" }}>
            <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
              <h1
                className="font-semibold tracking-tight"
                style={{ fontSize: "15px", color: "var(--text-primary)", cursor: "pointer" }}
                onClick={() => { localStorage.removeItem("jobfit-welcomed"); setPrefillJob(null); setActiveTab("experience"); setShowWelcome(true); }}
              >
                JobFit AI
              </h1>
              {provider && provider !== "demo" && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: provider === "openai" ? "rgba(74,222,128,0.08)" : "var(--accent-muted)",
                    color: provider === "openai" ? "var(--success)" : "var(--accent)",
                    border: `1px solid ${provider === "openai" ? "rgba(74,222,128,0.15)" : "var(--accent-border)"}`,
                  }}
                >
                  {provider === "openai" ? "GPT-4o" : "Claude"}
                </span>
              )}
              {isDemoMode() && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--warning-muted)",
                    color: "var(--warning)",
                    border: "1px solid rgba(245,166,35,0.15)",
                  }}
                >
                  Demo
                </span>
              )}
            </div>

            <nav className="flex" style={{ gap: "var(--space-1)" }}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center transition-colors"
                    style={{
                      gap: "var(--space-2)",
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "13px",
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                      background: isActive ? "var(--bg-tertiary)" : "transparent",
                    }}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.id === "history" && history.length > 0 && (
                      <span
                        className="flex items-center justify-center"
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "9px",
                          fontSize: "10px",
                          fontWeight: 600,
                          background: "var(--accent-muted)",
                          color: "var(--accent)",
                        }}
                      >
                        {history.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto" style={{ padding: "var(--space-8) var(--space-6)" }}>
        {activeTab === "experience" && <ExperiencePage />}
        {activeTab === "search" && <SearchPage onSelectJob={handleSelectJob} />}
        {activeTab === "generator" && (
          <GeneratorPage
            onResult={handleResult}
            prefillJob={prefillJob}
            onPrefillConsumed={() => setPrefillJob(null)}
          />
        )}
        {activeTab === "tracker" && <TrackerPage />}
        {activeTab === "history" && <HistoryPanel history={history} />}
        {activeTab === "eval" && <EvalDashboard />}
      </main>
    </div>
  );
}
