export function Crosshair() {
  return (
    <svg
      className="crosshair"
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="rgba(0, 255, 65, 0.4)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      {/* Inner circle */}
      <circle
        cx="32"
        cy="32"
        r="12"
        stroke="rgba(0, 255, 65, 0.5)"
        strokeWidth="1"
      />
      {/* Cross lines */}
      <line x1="32" y1="0" x2="32" y2="20" stroke="rgba(0, 255, 65, 0.4)" strokeWidth="1" />
      <line x1="32" y1="44" x2="32" y2="64" stroke="rgba(0, 255, 65, 0.4)" strokeWidth="1" />
      <line x1="0" y1="32" x2="20" y2="32" stroke="rgba(0, 255, 65, 0.4)" strokeWidth="1" />
      <line x1="44" y1="32" x2="64" y2="32" stroke="rgba(0, 255, 65, 0.4)" strokeWidth="1" />
      {/* Center dot */}
      <circle cx="32" cy="32" r="2" fill="rgba(0, 255, 65, 0.6)" />
      {/* Corner brackets */}
      <path d="M8 20 L8 8 L20 8" stroke="rgba(0, 255, 65, 0.5)" strokeWidth="1" fill="none" />
      <path d="M44 8 L56 8 L56 20" stroke="rgba(0, 255, 65, 0.5)" strokeWidth="1" fill="none" />
      <path d="M56 44 L56 56 L44 56" stroke="rgba(0, 255, 65, 0.5)" strokeWidth="1" fill="none" />
      <path d="M20 56 L8 56 L8 44" stroke="rgba(0, 255, 65, 0.5)" strokeWidth="1" fill="none" />
    </svg>
  );
}
