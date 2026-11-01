import React from 'react';
import Stamp from './Stamp';

/**
 * Slip component (Receipt and Certificate paper with zigzag edge)
 * Props:
 * - title: string
 * - subtitle: string
 * - stamp: { text, variant }
 * - rows: Array of { label, value, mono, bold }
 * - children: ReactNode (optional additional content)
 */
export function Slip({
  title,
  subtitle,
  stamp,
  rows = [],
  children,
  className = ''
}) {
  return (
    <div className={`mf-slip-container ${className}`}>
      {/* Header with Title, optional Subtitle, and Stamp */}
      <div className="mf-slip-header">
        <div>
          <h2 className="mf-slip-title">{title}</h2>
          {subtitle && <p className="mf-slip-subtitle">{subtitle}</p>}
        </div>
        {stamp && (
          <Stamp variant={stamp.variant || 'green'}>
            {stamp.text}
          </Stamp>
        )}
      </div>

      {/* Label / Value Rows */}
      {rows.length > 0 && (
        <div className="mf-slip-rows">
          {rows.map((row, idx) => (
            <div key={idx} className="mf-slip-row">
              <span className="mf-slip-label">{row.label}</span>
              <span className={`mf-slip-value ${row.mono === false ? 'mf-slip-value-sans' : ''}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {children}

      {/* Zigzag bottom edge (14px wide, 8px tall teeth) */}
      <div className="mf-slip-zigzag" aria-hidden="true" />
    </div>
  );
}

export default Slip;
