import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useActiveAccount } from '../context/ActiveAccountContext';
import Tag from './Tag';

export function AccountSwitcher({ onOpenNewAccount, className = '' }) {
  const { accounts, activeAccount, activeAccountId, switchAccount } = useActiveAccount();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!activeAccount || accounts.length === 0) return null;

  const isFrozen = activeAccount.status === 'FROZEN';

  return (
    <div className={`mf-account-switcher-wrapper ${className}`} ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="mf-chip"
        style={{
          height: '36px',
          padding: '0 12px',
          fontSize: '13px',
          gap: '8px',
          backgroundColor: 'var(--paper)',
          borderColor: isFrozen ? 'var(--debit)' : 'var(--line-strong)',
          color: 'var(--ink)'
        }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isFrozen ? 'var(--debit)' : 'var(--green-900)',
            display: 'inline-block'
          }}
        />
        <span style={{ fontWeight: 600 }}>{activeAccount.account_type}</span>
        <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
          {activeAccount.account_number || ('••••' + (activeAccount.last4 || '----'))}
        </span>
        {isFrozen && <Tag status="FROZEN">FROZEN</Tag>}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: '280px',
            backgroundColor: 'var(--paper)',
            border: '1px solid var(--line-strong)',
            zIndex: 500,
            boxShadow: 'none',
            borderRadius: 'var(--radius)'
          }}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
            <span className="mf-label" style={{ marginBottom: 0 }}>Select Active Account</span>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {accounts.map((acc) => {
              const isSelected = acc.account_id === activeAccountId;
              const accFrozen = acc.status === 'FROZEN';

              return (
                <div
                  key={acc.account_id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    switchAccount(acc.account_id);
                    setOpen(false);
                  }}
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--green-100)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--green-900)' : '3px solid transparent',
                    borderBottom: '1px solid var(--line)',
                    transition: 'background-color 120ms ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--page)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: accFrozen ? 'var(--debit)' : 'var(--green-900)',
                        opacity: isSelected ? 1 : 0.4
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                        {acc.account_type}
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                        {acc.account_number || ('•••• ' + (acc.last4 || '----'))}
                      </div>
                    </div>
                  </div>

                  <div>
                    {accFrozen ? (
                      <Tag status="FROZEN">FROZEN</Tag>
                    ) : (
                      <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--ink-2)', fontWeight: 500 }}>
                        ₹{parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            onClick={() => {
              setOpen(false);
              if (onOpenNewAccount) onOpenNewAccount();
            }}
            style={{
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--green-700)',
              cursor: 'pointer',
              backgroundColor: 'var(--paper)',
              borderTop: '1px solid var(--line)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--page)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--paper)'; }}
          >
            <Plus size={14} />
            <span>Open another account</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountSwitcher;

