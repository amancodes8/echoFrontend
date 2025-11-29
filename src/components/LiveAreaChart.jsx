// src/components/LiveAreaChart.jsx
import React from "react";

/** Minimal sparkline-like area chart using SVG */
export default function LiveAreaChart({ data = [], compact = false }) {
  const w = 400, h = compact ? 60 : 120;
  const values = data.map(d=>d.value ?? 0);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1e-6, max - min);
  const points = values.map((v,i) => {
    const x = (i / Math.max(1, values.length-1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const path = values.length ? `M0,${h} L${points} L${w},${h} Z` : "";
  const strokePath = values.length ? `M${points}` : "";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="rounded">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.6)"/>
          <stop offset="100%" stopColor="rgba(79,70,229,0.1)"/>
        </linearGradient>
      </defs>
      <path d={path} fill="url(#g)" />
      <path d={strokePath} fill="none" stroke="rgba(99,102,241,0.9)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}
