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
        <p className="text-sm">No generated resumes yet</p>
        <p className="text-xs mt-2 text-gray-600">Results from the Generator will appear here for comparison</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Showing last {history.length} generated resume{history.length !== 1 ? "s" : ""} (most recent first)
      </p>
      {history.map((entry, idx) => {
        const result = entry.result;
        const resume = result.resume;

        return (
          <div key={idx} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-4">
              <ScoreIndicator score={result.fit_score} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">#{history.length - idx}</span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-500">{entry.timestamp}</span>
                </div>
                <div className={`inline-block px-3 py-1 rounded-md text-xs font-semibold mb-2 ${
                  result.fit_score >= 70 ? "bg-emerald-900/40 text-emerald-300" :
                  result.fit_score >= 55 ? "bg-amber-900/40 text-amber-300" :
                  result.fit_score >= 40 ? "bg-orange-900/40 text-orange-300" :
                  "bg-red-900/40 text-red-300"
                }`}>
                  {RECS[result.recommendation] || result.recommendation}
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{result.reasoning}</p>

                {resume && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-gray-300">
                      Generated for: <span className="text-gray-400">{resume.name}</span>
                    </div>
                    {resume.sections && (
                      <div className="text-xs text-gray-500">
                        Sections: {resume.sections.map((s) => s.heading).join(", ")}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-emerald-400 mb-1">Strengths ({result.strengths.length})</div>
                    <ul className="space-y-1">
                      {result.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-gray-400 truncate">• {s}</li>
                      ))}
                      {result.strengths.length > 3 && (
                        <li className="text-xs text-gray-600">+{result.strengths.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-amber-400 mb-1">Gaps ({result.gaps.length})</div>
                    <ul className="space-y-1">
                      {result.gaps.slice(0, 3).map((g, i) => (
                        <li key={i} className="text-xs text-gray-400 truncate">• {g}</li>
                      ))}
                      {result.gaps.length > 3 && (
                        <li className="text-xs text-gray-600">+{result.gaps.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">
                    View job description
                  </summary>
                  <div className="mt-2 bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 line-clamp-6 whitespace-pre-wrap">
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
