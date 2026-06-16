import { useId, type CSSProperties } from 'react';

/** Decorative background for auth — orbs in dark, chart geometry in light (per mockups). */
export function AuthAmbient() {
  const areaGradId = useId().replace(/:/g, '');

  return (
    <div className="auth-ambient" aria-hidden>
      <span className="auth-orb auth-orb--1" />
      <span className="auth-orb auth-orb--2" />
      <span className="auth-orb auth-orb--3" />
      <span className="auth-orb auth-orb--spark" />
      <span className="auth-orb auth-orb--mesh" />

      <div className="auth-chart auth-chart--grid" />

      <div className="auth-chart auth-chart--area">
        <svg className="auth-chart__svg" viewBox="0 0 120 48" fill="none" aria-hidden>
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="auth-chart__fill"
            d="M4 40 L24 32 L44 36 L64 20 L84 24 L104 14 L116 10 L116 48 L4 48 Z"
            fill={`url(#${areaGradId})`}
          />
          <path
            className="auth-chart__stroke"
            pathLength={100}
            d="M4 40 L24 32 L44 36 L64 20 L84 24 L104 14 L116 10"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="auth-chart auth-chart--donut">
        <svg className="auth-chart__svg auth-chart__svg--donut" viewBox="0 0 80 80" fill="none" aria-hidden>
          <circle cx="40" cy="40" r="26" stroke="rgba(37,99,235,0.1)" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r="26"
            stroke="#4f46e5"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="95 168"
            transform="rotate(-90 40 40)"
          />
          <circle
            cx="40"
            cy="40"
            r="26"
            stroke="#f97316"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="48 215"
            strokeDashoffset="-100"
            transform="rotate(-90 40 40)"
          />
        </svg>
      </div>

      <div className="auth-chart auth-chart--line">
        <svg className="auth-chart__svg" viewBox="0 0 140 52" fill="none" aria-hidden>
          <path
            className="auth-chart__stroke"
            pathLength={100}
            d="M6 38 L30 30 L54 34 L78 18 L102 22 L126 10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="auth-chart__dot" cx="126" cy="10" r="3.5" fill="currentColor" />
        </svg>
      </div>

      <div className="auth-chart auth-chart--bars">
        <div className="auth-chart__bars">
          <span className="auth-chart__bar" style={{ '--h': '48%' } as CSSProperties} />
          <span className="auth-chart__bar" style={{ '--h': '72%' } as CSSProperties} />
          <span className="auth-chart__bar" style={{ '--h': '58%' } as CSSProperties} />
          <span className="auth-chart__bar" style={{ '--h': '88%' } as CSSProperties} />
          <span className="auth-chart__bar" style={{ '--h': '64%' } as CSSProperties} />
        </div>
      </div>

      <div className="auth-chart auth-chart--hbar">
        <span className="auth-chart__hbar" style={{ '--w': '82%' } as CSSProperties} />
        <span className="auth-chart__hbar" style={{ '--w': '54%' } as CSSProperties} />
        <span className="auth-chart__hbar" style={{ '--w': '24%' } as CSSProperties} />
      </div>
    </div>
  );
}
