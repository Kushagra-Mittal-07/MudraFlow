import React from 'react';

/**
 * Stat Component & StatStrip container
 */
export function Stat({
  label,
  value,
  caption,
  monoValue = false,
  className = ''
}) {
  return (
    <div className={`mf-stat-item ${className}`}>
      <span className="mf-stat-label">{label}</span>
      <span className={`mf-stat-value ${monoValue ? 'mf-stat-value-mono' : ''}`}>
        {value}
      </span>
      {caption && <span className="mf-stat-caption">{caption}</span>}
    </div>
  );
}

export function StatStrip({ children, className = '' }) {
  return (
    <div className={`mf-stat-strip ${className}`}>
      {children}
    </div>
  );
}

export default Stat;

