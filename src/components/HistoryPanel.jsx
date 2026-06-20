import { Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown } from "lucide-react";
import ScoreIndicator from "./ScoreIndicator";

const RECS = {
  STRONG_HIRE: { label: "Apply Now", color: "var(--success)", icon: CheckCircle },
  HIRE: { label: "Apply", color: "var(--success)", icon: CheckCircle },
  LEAN_HIRE: { label: "Apply with Caveats", color: "var(--warning)", icon: AlertTriangle },
  LEAN_NO_HIRE: { label: "Upskill First", color: "var(--warning)", icon: AlertTriangle },
  NO_HIRE: { label: "Look Elsewhere", color: "var(--danger)", icon: XCircle },
};

export default function HistoryPanel({ history }) {
  if (history.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-16) 0" }}>
        <Clock size={28} style={{ margin: "0 auto var(--space-4)", color: "var(--text-muted)" }} />
        <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>No generated resumes yet</p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          Results from the Generator will appear here
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
        {history.length} resume{history.length !== 1 ? "s" : ""} generated
      </p>
      {history.map((entry, idx) => {
        const result = entry.result;
        const resume = result.resume;
        const title = entry.companyName || "Untitled";
        const rec = RECS[result.recommendation] || RECS.LEAN_NO_HIRE;
        const RecIcon = rec.icon;

        return (
          <div
            key={idx}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
            }}
          >
            <div className="flex items-start" style={{ gap: "var(--space-4)" }}>
              <ScoreIndicator score={result.fit_score} compact />
              <div className="flex-1 min-w-0" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div>
                  <div className="flex items-center" style={{ gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{entry.timestamp}</span>
                  </div>
                  <span
                    className="inline-flex items-center"
                    style={{
                      gap: "var(--space-1)",
                      padding: "2px var(--space-2)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: rec.color,
                      background: `${rec.color}12`,
                    }}
                  >
                    <RecIcon size={11} /> {rec.label}
                  </span>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {result.reasoning}
                </p>

                {resume && resume.sections && (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {resume.sections.map((s) => s.heading).join(" / ")}
                  </p>
                )}

                <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-3)" }}>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--success)", marginBottom: "var(--space-1)" }}>
                      Strengths ({(result.strengths || []).length})
                    </p>
                    <ul style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {(result.strengths || []).slice(0, 2).map((s, i) => (
                        <li key={i} style={{ fontSize: "12px", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          - {s}
                        </li>
                      ))}
                      {(result.strengths || []).length > 2 && (
                        <li style={{ fontSize: "11px", color: "var(--text-muted)" }}>+{result.strengths.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--warning)", marginBottom: "var(--space-1)" }}>
                      Gaps ({(result.gaps || []).length})
                    </p>
                    <ul style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {(result.gaps || []).slice(0, 2).map((g, i) => (
                        <li key={i} style={{ fontSize: "12px", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          - {g}
                        </li>
                      ))}
                      {(result.gaps || []).length > 2 && (
                        <li style={{ fontSize: "11px", color: "var(--text-muted)" }}>+{result.gaps.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                </div>

                <details>
                  <summary
                    className="flex items-center"
                    style={{ gap: "var(--space-1)", fontSize: "11px", color: "var(--text-muted)", cursor: "pointer", listStyle: "none" }}
                  >
                    <ChevronDown size={12} /> Job description
                  </summary>
                  <div
                    style={{
                      marginTop: "var(--space-2)",
                      background: "var(--bg-primary)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3)",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "var(--text-tertiary)", whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 8, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {entry.jobDesc.slice(0, 500)}{entry.jobDesc.length > 500 ? "..." : ""}
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
