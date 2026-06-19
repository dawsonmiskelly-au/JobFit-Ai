import ScoreIndicator from "./ScoreIndicator";

const RECS = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  LEAN_HIRE: "Lean Hire",
  LEAN_NO_HIRE: "Lean No Hire",
  NO_HIRE: "No Hire",
};

export default function HistoryPanel({ history }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No analyses yet</p>
        <p className="text-xs mt-2 text-gray-600">Results from the Analyzer will appear here for comparison</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Showing last {history.length} analysis{history.length !== 1 ? "es" : ""} (most recent first)
      </p>
      {history.map((entry, idx) => (
        <div key={idx} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <ScoreIndicator score={entry.result.fit_score} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">#{history.length - idx}</span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-500">{entry.timestamp}</span>
              </div>
              <div className={`inline-block px-3 py-1 rounded-md text-xs font-semibold mb-2 ${
                entry.result.fit_score >= 70 ? "bg-emerald-900/40 text-emerald-300" :
                entry.result.fit_score >= 55 ? "bg-amber-900/40 text-amber-300" :
                entry.result.fit_score >= 40 ? "bg-orange-900/40 text-orange-300" :
                "bg-red-900/40 text-red-300"
              }`}>
                {RECS[entry.result.recommendation] || entry.result.recommendation}
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{entry.result.reasoning}</p>

              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-emerald-400 mb-1">Strengths ({entry.result.strengths.length})</div>
                  <ul className="space-y-1">
                    {entry.result.strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="text-xs text-gray-400 truncate">• {s}</li>
                    ))}
                    {entry.result.strengths.length > 3 && (
                      <li className="text-xs text-gray-600">+{entry.result.strengths.length - 3} more</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium text-red-400 mb-1">Gaps ({entry.result.gaps.length})</div>
                  <ul className="space-y-1">
                    {entry.result.gaps.slice(0, 3).map((g, i) => (
                      <li key={i} className="text-xs text-gray-400 truncate">• {g}</li>
                    ))}
                    {entry.result.gaps.length > 3 && (
                      <li className="text-xs text-gray-600">+{entry.result.gaps.length - 3} more</li>
                    )}
                  </ul>
                </div>
              </div>

              <details className="mt-3">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
                  View inputs
                </summary>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Resume (preview)</div>
                    <p className="text-xs text-gray-400 line-clamp-4 whitespace-pre-wrap">{entry.resume.slice(0, 300)}{entry.resume.length > 300 ? "..." : ""}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Job Description (preview)</div>
                    <p className="text-xs text-gray-400 line-clamp-4 whitespace-pre-wrap">{entry.jobDesc.slice(0, 300)}{entry.jobDesc.length > 300 ? "..." : ""}</p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
