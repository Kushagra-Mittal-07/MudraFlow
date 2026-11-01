import React from 'react';

/**
 * Skeleton loader component
 * Props:
 * - width: string/number
 * - height: string/number
 * - rows: number (for table skeleton)
 * - type: 'text' | 'table' | 'box'
 */
export function Skeleton({
  width = '100%',
  height = '20px',
  rows = 1,
  type = 'text',
  className = ''
}) {
  if (type === 'table') {
    return (
      <div className={`mf-ledger-wrapper ${className}`}>
        <table className="mf-ledger-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}><div className="mf-skeleton" style={{ height: '14px', width: '60px' }} /></th>
              <th><div className="mf-skeleton" style={{ height: '14px', width: '120px' }} /></th>
              <th className="mf-text-right"><div className="mf-skeleton" style={{ height: '14px', width: '80px', marginLeft: 'auto' }} /></th>
              <th className="mf-text-right"><div className="mf-skeleton" style={{ height: '14px', width: '80px', marginLeft: 'auto' }} /></th>
              <th className="mf-text-right"><div className="mf-skeleton" style={{ height: '14px', width: '90px', marginLeft: 'auto' }} /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows || 5 }).map((_, i) => (
              <tr key={i}>
                <td><div className="mf-skeleton" style={{ height: '16px', width: '90px' }} /></td>
                <td><div className="mf-skeleton" style={{ height: '16px', width: '70%' }} /></td>
                <td><div className="mf-skeleton" style={{ height: '16px', width: '80px', marginLeft: 'auto' }} /></td>
                <td><div className="mf-skeleton" style={{ height: '16px', width: '80px', marginLeft: 'auto' }} /></td>
                <td><div className="mf-skeleton" style={{ height: '16px', width: '90px', marginLeft: 'auto' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (rows > 1) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="mf-skeleton"
            style={{ width: i === rows - 1 ? '70%' : width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`mf-skeleton ${className}`}
      style={{ width, height }}
    />
  );
}

export default Skeleton;

