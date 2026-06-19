import { useMemo } from "react";

export default function ScoreIndicator({ score }) {
  const { color, bg, border, label } = useMemo(() => {
    if (score >= 85) return { color: "text-emerald-400", bg: "bg-emerald-950/50", border: "border-emerald-500/30", label: "Exceptional Fit" };
    if (score >= 70) return { color: "text-emerald-400", bg: "bg-emerald-950/50", border: "border-emerald-500/30", label: "Strong Fit" };
    if (score >= 55) return { color: "text-amber-400", bg: "bg-amber-950/50", border: "border-amber-500/30", label: "Borderline Fit" };
    if (score >= 40) return { color: "text-orange-400", bg: "bg-orange-950/50", border: "border-orange-500/30", label: "Weak Fit" };
    return { color: "text-red-400", bg: "bg-red-950/50", border: "border-red-500/30", label: "Poor Fit" };
  }, [score]);

  const strokeColor = score >= 70 ? "#34d399" : score >= 55 ? "#fbbf24" : score >= 40 ? "#fb923c" : "#f87171";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`flex flex-col items-center gap-3 p-6 rounded-2xl border ${bg} ${border}`}>
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={strokeColor} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${color}`}>{score}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{label}</span>
    </div>
  );
}
