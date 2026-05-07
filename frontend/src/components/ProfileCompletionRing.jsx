/**
 * ProfileCompletionRing.jsx
 * Animated SVG circular progress ring for profile completion percentage.
 */

function ProfileCompletionRing({ percentage = 0, size = 80, strokeWidth = 7, showLabel = true, className = '' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Color: red → amber → indigo → emerald based on percentage
  const getColor = (pct) => {
    if (pct < 34) return '#f87171'; // red-400
    if (pct < 67) return '#fbbf24'; // amber-400
    if (pct < 100) return '#818cf8'; // indigo-400
    return '#34d399'; // emerald-400
  };

  const color = getColor(percentage);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 6px ${color}60)`,
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xs font-extrabold" style={{ color }}>
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

export default ProfileCompletionRing;
