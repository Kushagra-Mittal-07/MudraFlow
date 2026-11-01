import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';
import { amountInWords } from '../../lib/amountInWords';
import AppShell from '../../components/AppShell';
import Slip from '../../components/Slip';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import Skeleton from '../../components/Skeleton';

export function Receipt() {
  const { reference } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [txn, setTxn] = useState(null);

  useEffect(() => {
    if (!reference) return;
    setLoading(true);
    setError('');

    apiRequest(`/transactions/${reference}`)
      .then(res => {
        if (res.ok && res.data) {
          setTxn(res.data);
        } else {
          setError(res.message || 'Transaction receipt not found');
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load transaction receipt');
      })
      .finally(() => setLoading(false));
  }, [reference]);

  // Determine stamp text & variant based on txn_type
  const getStamp = (txnType) => {
    if (!txnType) return { text: 'RECORDED', variant: 'green' };
    switch (txnType) {
      case 'TRANSFER':
        return { text: 'PAID', variant: 'green' };
      case 'FD_CREATED':
        return { text: 'LOCKED', variant: 'gold' };
      case 'OPENING_DEPOSIT':
      case 'LOAN_CREDITED':
      case 'FD_MATURED':
        return { text: 'CREDITED', variant: 'green' };
      default:
        return { text: 'PROCESSED', variant: 'green' };
    }
  };

  const stamp = txn ? getStamp(txn.txn_type) : null;

  const rows = txn ? [
    { label: 'Reference', value: txn.reference_no, mono: true },
    { label: 'Date and time', value: formatDate(txn.created_at, { includeTime: true }), mono: true },
    { label: 'Type', value: txn.txn_type },
    { label: 'Mode', value: txn.mode || 'INTERNAL' },
    { label: 'From account', value: txn.from_account_masked || 'MudraFlow Reserve' },
    {
      label: 'To beneficiary',
      value: txn.receiver_name
        ? `${txn.receiver_name} (${txn.to_account_masked || '—'})`
        : txn.to_account_masked || '—',
      mono: false
    },
    { label: 'Amount paid', value: formatMoney(txn.amount), mono: true },
    { label: 'Amount in words', value: amountInWords(txn.amount), mono: false },
    { label: 'Remarks', value: txn.remarks || 'None', mono: false },
    { label: 'Ledger status', value: 'SUCCESSFUL' }
  ] : [];

  return (
    <AppShell title="Transaction Receipt">
      <div style={{ maxWidth: '580px', margin: '0 auto', paddingBottom: '40px' }}>
        {/* Navigation Breadcrumb (hidden on print) */}
        <div className="no-print" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button variant="secondary" onClick={() => navigate('/app/history')}>
            <ArrowLeft size={16} /> Back to history
          </Button>
        </div>

        {loading ? (
          <div className="mf-panel" style={{ padding: '40px' }}>
            <Skeleton height="32px" width="60%" style={{ marginBottom: '20px' }} />
            <Skeleton height="20px" width="100%" count={6} style={{ marginBottom: '12px' }} />
          </div>
        ) : error ? (
          <Banner variant="error">{error}</Banner>
        ) : txn ? (
          <div>
            <Slip
              title="Transaction receipt"
              subtitle={`Official ledger record · ${txn.reference_no}`}
              stamp={stamp}
              rows={rows}
            >
              {/* Highlighted Amount Callout */}
              <div
                style={{
                  backgroundColor: 'var(--paper-2)',
                  padding: '16px',
                  margin: '20px 0',
                  border: '1px solid var(--line)',
                  textAlign: 'center'
                }}
              >
                <div className="mf-label" style={{ marginBottom: '4px' }}>SETTLED AMOUNT</div>
                <div
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: 'var(--green-950)'
                  }}
                >
                  {formatMoney(txn.amount)}
                </div>
                <div className="mf-helper" style={{ marginTop: '4px', fontStyle: 'italic' }}>
                  {amountInWords(txn.amount)}
                </div>
              </div>

              {/* Action Buttons (hidden during print) */}
              <div className="no-print" style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => window.print()} style={{ flex: 1 }}>
                  <Printer size={16} /> Print Receipt
                </Button>
                <Button variant="primary" onClick={() => navigate('/app/transfer')} style={{ flex: 1 }}>
                  Make another transfer →
                </Button>
              </div>
            </Slip>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default Receipt;

