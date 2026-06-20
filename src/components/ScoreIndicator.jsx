import { useMemo } from "react";

export default function ScoreIndicator({ score, compact = false }) {
  const { color, label } = useMemo(() => {
    if (score >= 85) return { color: "var(--success)", label: "Exceptional" };
    if (score >= 70) return { color: "var(--success)", label: "Strong" };
    if (score >= 55) return { color: "var(--warning)", label: "Borderline" };
    if (score >= 40) return { color: "var(--warning)", label: "Weak" };
    return { color: "var(--danger)", label: "Poor" };
  }, [score]);

  const strokeColor = score >= 70 ? "var(--success)" : score >= 55 ? "var(--warning)" : "var(--danger)";
  const size = compact ? 72 : 120;
  const viewBox = compact ? 80 : 120;
  const radius = compact ? 34 : 52;
  const strokeW = compact ? 5 : 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = viewBox / 2;

  return (
    <div
      className="flex flex-col items-center"
      style={{
        gap: compact ? "var(--space-1)" : "var(--space-2)",
        padding: compact ? "var(--space-3)" : "var(--space-5)",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${viewBox} ${viewBox}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeW}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span
            className="font-semibold"
            style={{ fontSize: compact ? "20px" : "28px", color }}
          >
            {score}
          </span>
          {!compact && (
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>/ 100</span>
          )}
        </div>
      </div>
      <span
        style={{
          fontSize: compact ? "10px" : "11px",
          fontWeight: 500,
          color,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
