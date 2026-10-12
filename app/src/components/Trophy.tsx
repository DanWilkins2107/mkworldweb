type TrophyProps = {
  color?: string;
  size?: number;
  className?: string;
};

export function Trophy({ color = "#ffd34d", size = 64, className }: TrophyProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Side handles */}
      <path
        d="M14 10H6v8a12 12 0 0 0 12 12v-6a6 6 0 0 1-6-6v-2h2v-6Z"
        fill={color}
        stroke="#0d1b2a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M50 10h8v8a12 12 0 0 1-12 12v-6a6 6 0 0 0 6-6v-2h-2v-6Z"
        fill={color}
        stroke="#0d1b2a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Cup */}
      <path
        d="M16 6h32v14a16 16 0 0 1-32 0V6Z"
        fill={color}
        stroke="#0d1b2a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Highlight */}
      <path
        d="M22 10v8a10 10 0 0 0 4 8"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Stem */}
      <rect x="29" y="34" width="6" height="10" fill={color} stroke="#0d1b2a" strokeWidth="2" />
      {/* Base */}
      <path
        d="M20 44h24l-3 8H23l-3-8Z"
        fill={color}
        stroke="#0d1b2a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="16" y="52" width="32" height="6" rx="2" fill={color} stroke="#0d1b2a" strokeWidth="2" />
    </svg>
  );
}

export function colorForRank(rank: number): string {
  if (rank === 1) return "#ffd34d"; // gold
  if (rank === 2) return "#cdd3da"; // silver
  if (rank === 3) return "#e08a3c"; // bronze
  return "#8fb7e8"; // default blue
}
