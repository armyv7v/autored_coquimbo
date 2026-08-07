import React from 'react';

export default function PantherLogo({ className = "w-7 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pantherEyeGrad" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFEE58" />
          <stop offset="50%" stopColor="#FFA726" />
          <stop offset="100%" stopColor="#E65100" />
        </radialGradient>
        <filter id="pantherGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FFFFFF" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FFA726" floodOpacity="0.3" />
        </filter>
      </defs>
      
      {/* Left Panther Eye */}
      <g filter="url(#pantherGlow)">
        {/* Outer Eye Shape */}
        <path
          d="M 20 28 C 45 15 85 22 95 48 C 75 52 65 60 82 82 C 78 70 70 54 66 50 C 60 48 40 48 20 28 Z"
          fill="#020617"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.5"
        />
        {/* Iris */}
        <path
          d="M 38 33 C 55 24 78 30 86 48 C 72 52 58 52 38 33 Z"
          fill="url(#pantherEyeGrad)"
        />
        {/* Vertical Pupil Slit */}
        <path
          d="M 62 30 C 64 35 64 43 60 47 C 65 43 65 35 62 30 Z"
          fill="#020617"
        />
      </g>

      {/* Right Panther Eye */}
      <g filter="url(#pantherGlow)">
        {/* Outer Eye Shape */}
        <path
          d="M 220 28 C 195 15 155 22 145 48 C 165 52 175 60 158 82 C 162 70 170 54 174 50 C 180 48 200 48 220 28 Z"
          fill="#020617"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.5"
        />
        {/* Iris */}
        <path
          d="M 202 33 C 185 24 162 30 154 48 C 168 52 182 52 202 33 Z"
          fill="url(#pantherEyeGrad)"
        />
        {/* Vertical Pupil Slit */}
        <path
          d="M 178 30 C 176 35 176 43 180 47 C 175 43 175 35 178 30 Z"
          fill="#020617"
        />
      </g>
    </svg>
  );
}
