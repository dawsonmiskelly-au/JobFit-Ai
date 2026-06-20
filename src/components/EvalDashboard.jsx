import { useState } from "react";
import { Play, Loader2, CheckCircle, XCircle, FlaskConical, ChevronDown } from "lucide-react";
import { analyzeResume } from "../api";
import { evalCases } from "../evalCases";
import ScoreIndicator from "./ScoreIndicator";

function evaluateResult(result, expected) {
  const checks = [];

  checks.push({
    name: "Score in expected range",
    passed: result.fit_score >= expected.scoreRange[0] && result.fit_score <= expected.scoreRange[1],
    detail: `Got ${result.fit_score}, expected ${expected.scoreRange[0]}-${expected.scoreRange[1]}`,
  });

  checks.push({
    name: "Recommendation matches",
    passed: expected.recommendation.includes(result.recommendation),
    detail: `Got "${result.recommendation}", expected one of [${expected.recommendation.join(", ")}]`,
  });

  checks.push({
    name: "Sufficient strengths",
    passed: Array.isArray(result.strengths) && result.strengths.length >= expected.minStrengths,
    detail: `Got ${result.strengths?.length || 0}, expected >= ${expected.minStrengths}`,
  });

  checks.push({
    name: "Sufficient gaps",
    passed: Array.isArray(result.gaps) && result.gaps.length >= expected.minGaps,
    detail: `Got ${result.gaps?.length || 0}, expected >= ${expected.minGaps}`,
  });

  return {
    checks,
    passed: checks.every((c) => c.passed),
    passCount: checks.filter((c) => c.passed).length,
    totalChecks: checks.length,
  };
}

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
};

export default function EvalDashboard() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [currentCase, setCurrentCase] = useState(null);

  async function runEvals() {
    setRunning(true);
    setResults([]);
    for (let i = 0; i < evalCases.length; i++) {
      const tc = evalCases[i];
      setCurrentCase(tc.name);
      try {
        const analysis = await analyzeResume(tc.resume, tc.jobDescription);
        const evaluation = evaluateResult(analysis, tc.expected);
        setResults((prev) => [...prev, { testCase: tc, analysis, evaluation }]);
      } catch (err) {
        setResults((prev) => [...prev, { testCase: tc, analysis: null, evaluation: { checks: [], passed: false, passCount: 0, totalChecks: 4, error: err.message } }]);
      }
    }
    setCurrentCase(null);
    setRunning(false);
  }

  const totalPassed = results.filter((r) => r.evaluation.passed).length;
  const totalChecks = results.reduce((sum, r) => sum + r.evaluation.passCount, 0);
  const maxChecks = results.reduce((sum, r) => sum + r.evaluation.totalChecks, 0);
  const pct = maxChecks > 0 ? Math.round((totalChecks / maxChecks) * 100) : 0;
  const pctColor = maxChecks > 0 && totalChecks === maxChecks ? "var(--success)" : maxChecks > 0 && totalChecks / maxChecks >= 0.75 ? "var(--warning)" : "var(--danger)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>Evaluation Harness</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
            {evalCases.length} test cases validating scoring consistency and output structure.
          </p>
        </div>
        <button
          onClick={runEvals}
          disabled={running}
          style={{
            ...btnBase,
            background: "var(--accent)",
            color: "#fff",
            opacity: running ? 0.6 : 1,
          }}
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {running ? "Running..." : "Run Evals"}
        </button>
      </div>

      {running && currentCase && (
        <div
          className="flex items-center"
          style={{
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--accent-muted)",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "13px", color: "var(--accent)" }}>
            {currentCase} ({results.length + 1}/{evalCases.length})
          </span>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3" style={{ gap: "var(--space-4)" }}>
            {[
              { value: `${totalPassed}/${results.length}`, label: "Cases Passed" },
              { value: `${totalChecks}/${maxChecks}`, label: "Checks Passed" },
              { value: `${pct}%`, label: "Consistency", color: pctColor },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-4)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: 600, color: stat.color || "var(--text-primary)" }}>{stat.value}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {results.map((r, idx) => {
              const passed = r.evaluation.passed;
              return (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-secondary)",
                    border: `1px solid ${passed ? "rgba(74,222,128,0.12)" : "rgba(239,107,107,0.12)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-5)",
                  }}
                >
                  <div className="flex items-start justify-between" style={{ marginBottom: "var(--space-4)" }}>
                    <div>
                      <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                        {passed ? <CheckCircle size={14} style={{ color: "var(--success)" }} /> : <XCircle size={14} style={{ color: "var(--danger)" }} />}
                        <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{r.testCase.name}</h3>
                      </div>
                      <span style={{ fontSize: "11px", color: passed ? "var(--success)" : "var(--danger)", marginTop: "var(--space-1)", display: "inline-block" }}>
                        {passed ? "PASSED" : "FAILED"} - {r.evaluation.passCount}/{r.evaluation.totalChecks} checks
                      </span>
                    </div>
                    {r.analysis && <ScoreIndicator score={r.analysis.fit_score} compact />}
                  </div>

                  {r.evaluation.error && (
                    <p style={{ fontSize: "12px", color: "var(--danger)", marginBottom: "var(--space-3)" }}>Error: {r.evaluation.error}</p>
                  )}

                  <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-2)" }}>
                    {r.evaluation.checks.map((check, ci) => (
                      <div key={ci} className="flex items-start" style={{ gap: "var(--space-2)", fontSize: "13px" }}>
                        {check.passed ? <CheckCircle size={13} style={{ color: "var(--success)", marginTop: "2px", flexShrink: 0 }} /> : <XCircle size={13} style={{ color: "var(--danger)", marginTop: "2px", flexShrink: 0 }} />}
                        <div>
                          <div style={{ color: check.passed ? "var(--text-secondary)" : "var(--danger)" }}>{check.name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{check.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {r.analysis && (
                    <details style={{ marginTop: "var(--space-3)" }}>
                      <summary className="flex items-center" style={{ gap: "var(--space-1)", fontSize: "11px", color: "var(--text-muted)", cursor: "pointer", listStyle: "none" }}>
                        <ChevronDown size={12} /> Raw output
                      </summary>
                      <pre
                        style={{
                          marginTop: "var(--space-2)",
                          fontSize: "11px",
                          background: "var(--bg-primary)",
                          borderRadius: "var(--radius-md)",
                          padding: "var(--space-3)",
                          overflow: "auto",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {JSON.stringify(r.analysis, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!running && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-16) 0" }}>
          <FlaskConical size={28} style={{ margin: "0 auto var(--space-4)", color: "var(--text-muted)" }} />
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Run eval cases to test scoring consistency</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            {evalCases.length} test cases with {evalCases.length * 4} total checks
          </p>
        </div>
      )}
    </div>
  );
}
