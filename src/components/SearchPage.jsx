import { useState, useEffect } from "react";
import {
  Search, Loader2, AlertCircle, Key, ExternalLink, FileText,
  ChevronLeft, Building2, Clock, DollarSign, XCircle, X, Sparkles, MapPin,
} from "lucide-react";
import {
  configureSearchApi, searchJobs, scoreJobs, isDemoMode, isKeySet, checkSearchStatus,
} from "../api";
import { loadExperiences, loadPersonalInfo } from "../store";

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "var(--radius-md)",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.15s",
};

const inputStyle = {
  background: "var(--bg-primary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3) var(--space-4)",
  fontSize: "13px",
  color: "var(--text-primary)",
  outline: "none",
};

function scoreColor(score) {
  if (score >= 70) return "var(--success)";
  if (score >= 55) return "var(--warning)";
  return "var(--danger)";
}

function scoreBg(score) {
  if (score >= 70) return "var(--success-muted)";
  if (score >= 55) return "var(--warning-muted)";
  return "var(--danger-muted)";
}

function scoreLabel(score) {
  if (score >= 85) return "Exceptional";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Borderline";
  if (score >= 40) return "Weak";
  return "Poor";
}

function buildSearchQuery(experiences, personalInfo) {
  const titles = experiences
    .filter((e) => e.type === "work")
    .map((e) => e.title)
    .filter(Boolean);
  if (titles.length > 0) return titles[0];
  const projectTitles = experiences
    .filter((e) => e.type === "project")
    .map((e) => e.title)
    .filter(Boolean);
  if (projectTitles.length > 0) return projectTitles[0];
  if (personalInfo?.summary) {
    const words = personalInfo.summary.split(/\s+/).slice(0, 5).join(" ");
    return words;
  }
  return "software engineer";
}

function SearchApiKeyPrompt({ onConfigured }) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);

  async function handleSubmit() {
    if (!apiKey.trim() || validating) return;
    setValidating(true);
    setError(null);
    const { valid, error: err } = await configureSearchApi(apiKey.trim());
    setValidating(false);
    if (valid) onConfigured();
    else setError(err);
  }

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
        <Key size={14} style={{ color: "var(--text-tertiary)" }} />
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Connect Job Search</span>
      </div>
      <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
        Enter your RapidAPI key to search job listings via JSearch. Free tier: 100 requests/day.
      </p>
      <div className="flex" style={{ gap: "var(--space-3)" }}>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="RapidAPI key..."
          disabled={validating}
          style={{ ...inputStyle, flex: 1, opacity: validating ? 0.5 : 1 }}
        />
        <button onClick={handleSubmit} disabled={validating} className="flex items-center" style={{ ...btnBase, background: "var(--accent)", color: "#fff", opacity: validating ? 0.6 : 1 }}>
          {validating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
          {validating ? "Validating" : "Connect"}
        </button>
      </div>
      {error && (
        <div className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "12px", color: "var(--danger)" }}>
          <XCircle size={13} /> {error}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, score, onSelect, onDismiss }) {
  const s = score;
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        position: "relative",
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(job.id); }}
        title="Dismiss"
        style={{
          position: "absolute",
          top: "var(--space-3)",
          right: "var(--space-3)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: "var(--space-1)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <X size={14} />
      </button>

      <div
        className="flex items-start"
        style={{ gap: "var(--space-4)", cursor: "pointer" }}
        onClick={() => onSelect(job)}
      >
        <div className="flex-1 min-w-0" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", paddingRight: "var(--space-6)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{job.title}</h3>
          <div className="flex items-center flex-wrap" style={{ gap: "var(--space-3)", fontSize: "12px", color: "var(--text-tertiary)" }}>
            <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
              <Building2 size={12} /> {job.company}
            </span>
            <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
              <MapPin size={12} /> {job.location}
            </span>
            {job.posted && (
              <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
                <Clock size={12} /> {job.posted}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
                <DollarSign size={12} /> {job.salary}
              </span>
            )}
          </div>
          {s && (
            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
              {s.reason}
            </p>
          )}
        </div>
        {s && (
          <div
            className="flex flex-col items-center"
            style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: scoreBg(s.fit_score),
              border: `1px solid ${scoreColor(s.fit_score)}20`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: 600, color: scoreColor(s.fit_score) }}>{s.fit_score}</span>
            <span style={{ fontSize: "10px", color: scoreColor(s.fit_score) }}>{scoreLabel(s.fit_score)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function JobDetail({ job, score, onBack, onGenerate, onDismiss }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <button onClick={onBack} className="flex items-center" style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)", padding: "var(--space-2) var(--space-3)" }}>
        <ChevronLeft size={14} /> Back to results
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>{job.title}</h2>
        <div className="flex items-center flex-wrap" style={{ gap: "var(--space-3)", fontSize: "13px", color: "var(--text-secondary)" }}>
          <span className="flex items-center" style={{ gap: "var(--space-1)" }}><Building2 size={13} /> {job.company}</span>
          <span className="flex items-center" style={{ gap: "var(--space-1)" }}><MapPin size={13} /> {job.location}</span>
          {job.salary && <span className="flex items-center" style={{ gap: "var(--space-1)" }}><DollarSign size={13} /> {job.salary}</span>}
        </div>
        {score && (
          <div className="flex items-center" style={{ gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
            <span
              style={{
                padding: "2px var(--space-3)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 600,
                background: scoreBg(score.fit_score),
                color: scoreColor(score.fit_score),
              }}
            >
              {score.fit_score}/100 - {scoreLabel(score.fit_score)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{score.reason}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap" style={{ gap: "var(--space-3)" }}>
        <button onClick={() => onGenerate(job)} className="flex items-center" style={{ ...btnBase, background: "var(--accent)", color: "#fff", padding: "var(--space-3) var(--space-5)" }}>
          <FileText size={14} /> Generate Resume for This Job
        </button>
        <button onClick={() => { onDismiss(job.id); onBack(); }} className="flex items-center" style={{ ...btnBase, background: "var(--danger-muted)", color: "var(--danger)" }}>
          <X size={14} /> Dismiss
        </button>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
            style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)", textDecoration: "none" }}
          >
            <ExternalLink size={14} /> View Original
          </a>
        )}
      </div>

      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
        }}
      >
        <h3 style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-4)" }}>
          Job Description
        </h3>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {job.description}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage({ onSelectJob }) {
  const [searchReady, setSearchReady] = useState(false);
  const [listings, setListings] = useState([]);
  const [scores, setScores] = useState({});
  const [dismissed, setDismissed] = useState(new Set());
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scoreWarning, setScoreWarning] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState(null);

  useEffect(() => {
    checkSearchStatus().then((configured) => {
      if (configured || isDemoMode()) setSearchReady(true);
    });
  }, []);

  async function handleFindJobs() {
    const experiences = loadExperiences();
    const personalInfo = loadPersonalInfo();

    if (experiences.length === 0) {
      setError("Add your experience in the Experience tab first.");
      return;
    }

    setLoading(true);
    setError(null);
    setScoreWarning(null);
    setDismissed(new Set());
    setSelectedJob(null);
    setScores({});

    const query = buildSearchQuery(experiences, personalInfo);
    setSearchedQuery(query);

    try {
      const data = await searchJobs(query);
      const jobs = data.jobs || [];

      if (jobs.length === 0) {
        setListings([]);
        setError("No jobs found. Try adding more specific job titles to your experience.");
        setLoading(false);
        return;
      }

      setListings(jobs);

      if (isKeySet() || isDemoMode()) {
        const jobsForScoring = jobs.map((j) => ({
          id: j.id, title: j.title, company: j.company, description: j.description,
        }));
        try {
          const scoreData = await scoreJobs(jobsForScoring, experiences, personalInfo);
          const map = {};
          for (const s of (scoreData.scores || [])) map[s.job_id] = s;
          setScores(map);
        } catch (scoreErr) {
          setScoreWarning(`Scoring unavailable: ${scoreErr.message}`);
        }
      }
    } catch (err) {
      setError(err.message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss(jobId) {
    setDismissed((prev) => new Set([...prev, jobId]));
  }

  function handleGenerate(job) {
    onSelectJob(job.description, job.company);
  }

  if (selectedJob) {
    return (
      <JobDetail
        job={selectedJob}
        score={scores[selectedJob.id]}
        onBack={() => setSelectedJob(null)}
        onGenerate={handleGenerate}
        onDismiss={handleDismiss}
      />
    );
  }

  const hasScores = Object.keys(scores).length > 0;
  const visibleListings = listings.filter((j) => !dismissed.has(j.id));
  const sortedListings = hasScores
    ? [...visibleListings].sort((a, b) => (scores[b.id]?.fit_score || 0) - (scores[a.id]?.fit_score || 0))
    : visibleListings;

  const expCount = loadExperiences().length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Job Matching</h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
          Find jobs that match your experience. We search based on your job titles and score each listing against your full profile.
        </p>
      </div>

      {!searchReady && <SearchApiKeyPrompt onConfigured={() => setSearchReady(true)} />}

      {searchReady && (
        <>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <Sparkles size={20} style={{ color: "var(--accent)" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                {expCount > 0
                  ? `${expCount} experience${expCount !== 1 ? "s" : ""} in your bank`
                  : "No experiences yet"
                }
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
                {expCount > 0
                  ? "We'll search for jobs matching your most recent role and score them against your full profile."
                  : "Add your experience in the Experience tab to get started."
                }
              </p>
            </div>
            <button
              onClick={handleFindJobs}
              disabled={loading || expCount === 0}
              className="flex items-center"
              style={{
                ...btnBase,
                padding: "var(--space-3) var(--space-6)",
                background: "var(--accent)",
                color: "#fff",
                opacity: loading || expCount === 0 ? 0.5 : 1,
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {loading ? "Finding jobs..." : "Find Matching Jobs"}
            </button>
            {searchedQuery && !loading && (
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Searched for: "{searchedQuery}"
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "12px", color: "var(--danger)" }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {scoreWarning && (
            <div className="flex items-center" style={{ gap: "var(--space-2)", fontSize: "12px", color: "var(--warning)" }}>
              <AlertCircle size={13} /> {scoreWarning}
            </div>
          )}

          {visibleListings.length > 0 && (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {visibleListings.length} job{visibleListings.length !== 1 ? "s" : ""}
                {dismissed.size > 0 ? ` (${dismissed.size} dismissed)` : ""}
                {hasScores ? " - sorted by fit" : ""}
              </span>
              {!isKeySet() && !isDemoMode() && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Connect LLM on Generate tab for fit scores
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {sortedListings.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                score={scores[job.id]}
                onSelect={setSelectedJob}
                onDismiss={handleDismiss}
              />
            ))}
          </div>

          {listings.length > 0 && visibleListings.length === 0 && (
            <div style={{ textAlign: "center", padding: "var(--space-10) 0" }}>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>All jobs dismissed</p>
              <button
                onClick={() => setDismissed(new Set())}
                style={{ ...btnBase, background: "var(--bg-tertiary)", color: "var(--text-secondary)", marginTop: "var(--space-3)" }}
              >
                Restore all
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
