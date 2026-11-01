import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/format';
import Money from './Money';

/**
 * LedgerTable component
 * Props:
 * - entries: Array of { id, date, description, debit, credit, balance, receiptLink }
 * - dense: boolean (for staff view)
 * - footer: ReactNode
 */
export function LedgerTable({
  entries = [],
  dense = false,
  footer = null,
  emptyMessage = 'No entries yet.',
  className = ''
}) {
  if (entries.length === 0) {
    return (
      <div className={`mf-ledger-wrapper ${className}`} style={{ padding: '32px', textAlign: 'center' }}>
        <p className="mf-helper">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`mf-ledger-wrapper ${className}`}>
      <table className={`mf-ledger-table ${dense ? 'mf-ledger-dense' : ''}`}>
        <thead>
          <tr>
            <th scope="col" style={{ width: '130px' }}>Date</th>
            <th scope="col">Description</th>
            <th scope="col" className="mf-text-right" style={{ width: '150px' }}>Debit</th>
            <th scope="col" className="mf-text-right" style={{ width: '150px' }}>Credit</th>
            <th scope="col" className="mf-text-right" style={{ width: '150px' }}>Balance</th>
            {entries.some(e => e.receiptLink) && (
              <th scope="col" className="mf-text-right" style={{ width: '80px' }}>Receipt</th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((item, idx) => (
            <tr key={item.id || idx}>
              {/* Desktop cells */}
              <td className="mf-ledger-date">
                <div className="mf-desktop-only">{formatDate(item.date)}</div>
                {/* Mobile line 1: Date & Amount */}
                <div className="mf-mobile-only mf-mobile-card-row1">
                  <span>{formatDate(item.date)}</span>
                  {item.debit ? (
                    <Money value={item.debit} type="debit" />
                  ) : item.credit ? (
                    <Money value={item.credit} type="credit" />
                  ) : null}
                </div>
              </td>

              <td className="mf-ledger-desc">
                <div className="mf-desktop-only">{item.description}</div>
                {/* Mobile line 2: Description */}
                <div className="mf-mobile-only mf-mobile-card-row2">
                  {item.description}
                </div>
              </td>

              <td className="mf-text-right mf-desktop-only">
                {item.debit ? <Money value={item.debit} type="debit" /> : <span>–</span>}
              </td>

              <td className="mf-text-right mf-desktop-only">
                {item.credit ? <Money value={item.credit} type="credit" /> : <span>–</span>}
              </td>

              <td className="mf-ledger-balance">
                <div className="mf-desktop-only">
                  <Money value={item.balance} type="neutral" />
                </div>
                {/* Mobile line 3: Balance */}
                <div className="mf-mobile-only mf-mobile-card-row3">
                  <span>Bal: <Money value={item.balance} type="neutral" /></span>
                  {item.receiptLink && (
                    <Link to={item.receiptLink} className="mf-btn-link">View slip →</Link>
                  )}
                </div>
              </td>

              {entries.some(e => e.receiptLink) && (
                <td className="mf-text-right mf-desktop-only">
                  {item.receiptLink ? (
                    <Link to={item.receiptLink} className="mf-btn-link">Slip →</Link>
                  ) : <span>–</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {footer && (
        <div className="mf-pagination">
          {footer}
        </div>
      )}
    </div>
  );
}

export default LedgerTable;

