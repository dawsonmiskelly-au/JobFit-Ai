import { useState } from "react";
import { analyzeResume } from "../api";
import { evalCases } from "../evalCases";
import ScoreIndicator from "./ScoreIndicator";

function evaluateResult(result, expected) {
  const checks = [];

  const scoreInRange = result.fit_score >= expected.scoreRange[0] && result.fit_score <= expected.scoreRange[1];
  checks.push({
    name: "Score in expected range",
    passed: scoreInRange,
    detail: `Got ${result.fit_score}, expected ${expected.scoreRange[0]}–${expected.scoreRange[1]}`,
  });

  const recMatch = expected.recommendation.includes(result.recommendation);
  checks.push({
    name: "Recommendation matches",
    passed: recMatch,
    detail: `Got "${result.recommendation}", expected one of [${expected.recommendation.join(", ")}]`,
  });

  const hasStrengths = Array.isArray(result.strengths) && result.strengths.length >= expected.minStrengths;
  checks.push({
    name: "Sufficient strengths identified",
    passed: hasStrengths,
    detail: `Got ${result.strengths?.length || 0} strengths, expected ≥${expected.minStrengths}`,
  });

  const hasGaps = Array.isArray(result.gaps) && result.gaps.length >= expected.minGaps;
  checks.push({
    name: "Sufficient gaps identified",
    passed: hasGaps,
    detail: `Got ${result.gaps?.length || 0} gaps, expected ≥${expected.minGaps}`,
  });

  return {
    checks,
    passed: checks.every((c) => c.passed),
    passCount: checks.filter((c) => c.passed).length,
    totalChecks: checks.length,
  };
}

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
        setResults((prev) => [
          ...prev,
          {
            testCase: tc,
            analysis: null,
            evaluation: { checks: [], passed: false, passCount: 0, totalChecks: 4, error: err.message },
          },
        ]);
      }
    }

    setCurrentCase(null);
    setRunning(false);
  }

  const totalPassed = results.filter((r) => r.evaluation.passed).length;
  const totalChecks = results.reduce((sum, r) => sum + r.evaluation.passCount, 0);
  const maxChecks = results.reduce((sum, r) => sum + r.evaluation.totalChecks, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Evaluation Harness</h2>
          <p className="text-sm text-gray-400 mt-1">
            Runs {evalCases.length} test cases against Claude and validates output structure and scoring consistency.
          </p>
        </div>
        <button
          onClick={runEvals}
          disabled={running}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/30"
        >
          {running && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
            </svg>
          )}
          {running ? "Running..." : "Run Evals"}
        </button>
      </div>

      {running && currentCase && (
        <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
          </svg>
          <span className="text-sm text-indigo-300">
            Running: <span className="font-medium">{currentCase}</span> ({results.length + 1}/{evalCases.length})
          </span>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-200">{totalPassed}/{results.length}</div>
              <div className="text-xs text-gray-400 mt-1">Test Cases Passed</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-200">{totalChecks}/{maxChecks}</div>
              <div className="text-xs text-gray-400 mt-1">Individual Checks</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${maxChecks > 0 && totalChecks === maxChecks ? "text-emerald-400" : maxChecks > 0 && totalChecks / maxChecks >= 0.75 ? "text-amber-400" : "text-red-400"}`}>
                {maxChecks > 0 ? Math.round((totalChecks / maxChecks) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-400 mt-1">Consistency Score</div>
            </div>
          </div>

          <div className="space-y-4">
            {results.map((r, idx) => (
              <div key={idx} className={`rounded-xl border p-5 ${r.evaluation.passed ? "bg-emerald-950/20 border-emerald-500/20" : "bg-red-950/20 border-red-500/20"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.evaluation.passed ? "bg-emerald-400" : "bg-red-400"}`} />
                      <h3 className="font-semibold text-gray-200 text-sm">{r.testCase.name}</h3>
                    </div>
                    <span className={`text-xs mt-1 inline-block ${r.evaluation.passed ? "text-emerald-400" : "text-red-400"}`}>
                      {r.evaluation.passed ? "PASSED" : "FAILED"} — {r.evaluation.passCount}/{r.evaluation.totalChecks} checks
                    </span>
                  </div>
                  {r.analysis && <ScoreIndicator score={r.analysis.fit_score} />}
                </div>

                {r.evaluation.error && (
                  <p className="text-red-400 text-sm mb-3">Error: {r.evaluation.error}</p>
                )}

                <div className="grid sm:grid-cols-2 gap-2">
                  {r.evaluation.checks.map((check, ci) => (
                    <div key={ci} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 shrink-0 ${check.passed ? "text-emerald-400" : "text-red-400"}`}>
                        {check.passed ? "✓" : "✗"}
                      </span>
                      <div>
                        <div className={check.passed ? "text-gray-300" : "text-red-300"}>{check.name}</div>
                        <div className="text-xs text-gray-500">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {r.analysis && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
                      View raw output
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-900/50 rounded-lg p-3 overflow-x-auto text-gray-400">
                      {JSON.stringify(r.analysis, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!running && results.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm">Click "Run Evals" to test Claude's analysis consistency</p>
          <p className="text-xs mt-2 text-gray-600">3 test cases · 4 checks each · Validates scoring, recommendations, and output structure</p>
        </div>
      )}
    </div>
  );
}
