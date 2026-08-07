interface NetworkMarkProps {
  className?: string;
  compact?: boolean;
}

export default function NetworkMark({ className = '', compact = false }: NetworkMarkProps) {
  const stroke = compact ? 3.5 : 2.5;

  return (
    <svg
      className={`network-mark h-full w-full ${className}`}
      viewBox="0 0 220 140"
      role="img"
      aria-label="Isotipo AutoRed: Escudo Ciber-Automotriz en red de nodos"
    >
      <defs>
        <radialGradient id="cyberShieldGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#ff8a4c" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ff5a1f" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cyberLineGrad" x1="20" y1="18" x2="194" y2="126">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ff5a1f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Interconnected Web Mesh Lines */}
      <g className="network-web" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M110 68 L38 29 L54 107 Z" stroke="rgba(56,189,248,.25)" strokeWidth="1.2" />
        <path d="M110 68 L175 32 L190 102 Z" stroke="rgba(56,189,248,.25)" strokeWidth="1.2" />
        <path d="M54 107 L190 102 L175 32 L38 29 Z" stroke="rgba(248,250,252,.15)" strokeWidth="1" />
        <path d="M38 29 L88 35 L110 68 L142 39 L175 32" stroke="url(#cyberLineGrad)" strokeWidth={stroke} />
        <path d="M54 107 L82 82 L110 68 L143 88 L190 102" stroke="url(#cyberLineGrad)" strokeWidth={stroke} />
        <path d="M88 35 L82 82 L143 88 L142 39 Z" stroke="rgba(255,90,31,.6)" strokeWidth="1.8" />
      </g>

      {/* Nodes */}
      <g className="network-nodes">
        {[
          [38, 29, 5],
          [88, 35, 5],
          [142, 39, 5],
          [175, 32, 5],
          [54, 107, 5],
          [82, 82, 4.5],
          [143, 88, 4.5],
          [190, 102, 5],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#38bdf8" stroke="#03060d" strokeWidth="2.5" />
        ))}
      </g>

      {/* Central Cyber Shield Isotype Core */}
      <g className="network-core">
        {/* Glow Aura */}
        <circle cx="110" cy="68" r="28" fill="url(#cyberShieldGlow)" />

        {/* Outer Shield Contour */}
        <path
          d="M110 46 Q122 43 130 52 Q134 76 110 90 Q86 76 90 52 Q98 43 110 46 Z"
          fill="#050a16"
          stroke="#ff5a1f"
          strokeWidth="2.2"
        />

        {/* Inner Shield Accent */}
        <path
          d="M110 51 Q118 49 124 55 Q127 72 110 83 Q93 72 96 55 Q102 49 110 51 Z"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeOpacity="0.8"
        />

        {/* Diamond Center Symbol */}
        <polygon points="110,60 118,68 110,76 102,68" fill="#ffffff" />
      </g>
    </svg>
  );
}
