import { useState } from "react";
import {
  Clipboard, Trash2, ChevronDown, Building2, Calendar, MessageSquare,
  Send, PhoneCall, Gift, Ghost, XCircle,
} from "lucide-react";
import { loadApplications, saveApplications } from "../store";

const STATUSES = [
  { id: "applied", label: "Applied", icon: Send, color: "var(--accent)" },
  { id: "interviewing", label: "Interviewing", icon: PhoneCall, color: "var(--warning)" },
  { id: "offered", label: "Offered", icon: Gift, color: "var(--success)" },
  { id: "rejected", label: "Rejected", icon: XCircle, color: "var(--danger)" },
  { id: "ghosted", label: "Ghosted", icon: Ghost, color: "var(--text-muted)" },
];

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-md)",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
};

function scoreColor(score) {
  if (score >= 70) return "var(--success)";
  if (score >= 55) return "var(--warning)";
  return "var(--danger)";
}

export default function TrackerPage() {
  const [applications, setApplications] = useState(loadApplications);
  const [filter, setFilter] = useState("all");

  function updateApp(id, updates) {
    setApplications((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      saveApplications(next);
      return next;
    });
  }

  function deleteApp(id) {
    setApplications((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveApplications(next);
      return next;
    });
  }

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);
  const counts = applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Application Tracker</h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
          Track your job applications. Mark as applied from the Generate tab to add entries here.
        </p>
      </div>

      {applications.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: "var(--space-2)" }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              ...btnBase,
              background: filter === "all" ? "var(--bg-tertiary)" : "transparent",
              color: filter === "all" ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            All ({applications.length})
          </button>
          {STATUSES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setFilter(s.id)}
                className="flex items-center"
                style={{
                  ...btnBase,
                  background: filter === s.id ? "var(--bg-tertiary)" : "transparent",
                  color: filter === s.id ? "var(--text-primary)" : "var(--text-tertiary)",
                }}
              >
                <Icon size={12} /> {s.label} ({counts[s.id] || 0})
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-16) 0" }}>
          <Clipboard size={28} style={{ margin: "0 auto var(--space-4)", color: "var(--text-muted)" }} />
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
            {applications.length === 0 ? "No applications tracked yet" : "No applications match this filter"}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Generate a resume and click "Mark Applied" to start tracking
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {filtered.map((app) => {
          return (
            <div
              key={app.id}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
              }}
            >
              <div className="flex items-start justify-between" style={{ gap: "var(--space-4)" }}>
                <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{app.company}</h3>
                    {app.fitScore && (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: scoreColor(app.fitScore), padding: "1px var(--space-2)", borderRadius: "var(--radius-sm)", background: `${scoreColor(app.fitScore)}12` }}>
                        {app.fitScore}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center flex-wrap" style={{ gap: "var(--space-3)", fontSize: "12px", color: "var(--text-tertiary)" }}>
                    {app.role && (
                      <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
                        <Building2 size={12} /> {app.role}
                      </span>
                    )}
                    <span className="flex items-center" style={{ gap: "var(--space-1)" }}>
                      <Calendar size={12} /> {app.dateApplied}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap" style={{ gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                    {STATUSES.map((s) => {
                      const Icon = s.icon;
                      const isActive = app.status === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => updateApp(app.id, { status: s.id })}
                          className="flex items-center"
                          style={{
                            ...btnBase,
                            padding: "var(--space-1) var(--space-2)",
                            fontSize: "11px",
                            background: isActive ? `${s.color}15` : "transparent",
                            color: isActive ? s.color : "var(--text-muted)",
                            border: isActive ? `1px solid ${s.color}30` : "1px solid transparent",
                          }}
                        >
                          <Icon size={11} /> {s.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: "var(--space-2)" }}>
                    <div className="flex items-center" style={{ gap: "var(--space-1)", marginBottom: "var(--space-1)" }}>
                      <MessageSquare size={11} style={{ color: "var(--text-muted)" }} />
                      <label style={{ fontSize: "11px", color: "var(--text-muted)" }}>Notes</label>
                    </div>
                    <textarea
                      value={app.notes}
                      onChange={(e) => updateApp(app.id, { notes: e.target.value })}
                      placeholder="Interview dates, contact info, follow-up reminders..."
                      rows={2}
                      style={{
                        width: "100%",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-2) var(--space-3)",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        outline: "none",
                        resize: "none",
                      }}
                    />
                  </div>

                  <details>
                    <summary className="flex items-center" style={{ gap: "var(--space-1)", fontSize: "11px", color: "var(--text-muted)", cursor: "pointer", listStyle: "none" }}>
                      <ChevronDown size={12} /> Job description
                    </summary>
                    <div style={{ marginTop: "var(--space-2)", background: "var(--bg-primary)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-tertiary)", whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 10, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {app.jobDescription?.slice(0, 800) || "No description saved"}
                        {app.jobDescription?.length > 800 ? "..." : ""}
                      </p>
                    </div>
                  </details>
                </div>

                <button
                  onClick={() => deleteApp(app.id)}
                  title="Remove"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "var(--space-1)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
