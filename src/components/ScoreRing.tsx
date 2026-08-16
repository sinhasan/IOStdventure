import { useState, useEffect } from 'react';

interface ScoreRingProps {
  value: number | null | undefined;
  max?: number;
  size?: number;
  strokeWidth?: number;
}

export default function ScoreRing({ value, max = 100, size = 84, strokeWidth = 7 }: ScoreRingProps) {
  const hasValue = value !== null && value !== undefined;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!hasValue) return;
    const t = setTimeout(() => setDisplayValue(value as number), 50);
    return () => clearTimeout(t);
  }, [value, hasValue]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = hasValue ? Math.max(0, Math.min(1, displayValue / max)) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 block">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-white/10" strokeWidth={strokeWidth} />
        {hasValue && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-cyan-300"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.65,0,.35,1)' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white leading-none">{hasValue ? Math.round(displayValue) : '—'}</span>
        {hasValue && <span className="text-[9px] text-gray-600 font-medium mt-0.5">/{max}</span>}
      </div>
    </div>
  );
}
