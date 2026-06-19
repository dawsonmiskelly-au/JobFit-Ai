import ScoreIndicator from "./ScoreIndicator";

const REC_STYLES = {
  STRONG_HIRE: "bg-emerald-900/40 text-emerald-300 border-emerald-500/30",
  HIRE: "bg-emerald-900/30 text-emerald-300 border-emerald-500/20",
  LEAN_HIRE: "bg-amber-900/30 text-amber-300 border-amber-500/20",
  LEAN_NO_HIRE: "bg-orange-900/30 text-orange-300 border-orange-500/20",
  NO_HIRE: "bg-red-900/30 text-red-300 border-red-500/20",
};

const REC_LABELS = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  LEAN_HIRE: "Lean Hire",
  LEAN_NO_HIRE: "Lean No Hire",
  NO_HIRE: "No Hire",
};

export default function ResultsPanel({ result }) {
  if (!result) return null;

  const recStyle = REC_STYLES[result.recommendation] || REC_STYLES.LEAN_NO_HIRE;
  const recLabel = REC_LABELS[result.recommendation] || result.recommendation;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ScoreIndicator score={result.fit_score} />
        <div className="flex-1 space-y-3">
          <div className={`inline-block px-4 py-2 rounded-lg border font-semibold text-sm ${recStyle}`}>
            {recLabel}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{result.reasoning}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Strengths
          </h3>
          <ul className="space-y-2">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-emerald-500 mt-1 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Gaps
          </h3>
          <ul className="space-y-2">
            {result.gaps.map((g, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-red-500 mt-1 shrink-0">•</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
