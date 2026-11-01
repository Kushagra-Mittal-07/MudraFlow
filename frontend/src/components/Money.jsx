import React from 'react';
import { formatMoney, splitMoney } from '../lib/format';

/**
 * Money component
 * Props:
 * - value: number or string
 * - type: 'debit' | 'credit' | 'neutral'
 * - size: 'table' | 'big'
 */
export function Money({
  value,
  type = 'neutral',
  size = 'table',
  className = ''
}) {
  if (value === null || value === undefined) return <span>–</span>;

  if (size === 'big') {
    const { rupees, paise } = splitMoney(value);
    return (
      <div className={`mf-money-big ${className}`}>
        <span className="mf-money-big-rupees">{rupees}</span>
        <span className="mf-money-big-paise">{paise}</span>
      </div>
    );
  }

  // Table size
  const formatted = formatMoney(value);

  if (type === 'debit') {
    return (
      <span className={`mf-ledger-debit ${className}`}>
        − {formatted} ↓
      </span>
    );
  }

  if (type === 'credit') {
    return (
      <span className={`mf-ledger-credit ${className}`}>
        + {formatted} ↑
      </span>
    );
  }

  return (
    <span className={`tabular-nums ${className}`}>
      {formatted}
    </span>
  );
}

export default Money;

