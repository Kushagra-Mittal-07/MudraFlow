import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Stat from '../../components/Stat';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import Modal from '../../components/Modal';
import Banner from '../../components/Banner';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';
import { CheckCircle2, Play, PiggyBank } from 'lucide-react';

export function StaffFdMaturities() {
  const [fds, setFds] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  const [totalPayout, setTotalPayout] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  // Process Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadDueFds = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/staff/fd/due');
      if (res.ok && res.data) {
        setFds(res.data.fds || []);
        setDueCount(res.data.due_count || 0);
        setTotalPayout(res.data.total_payout || '0.00');
      }
    } catch (err) {
      console.error('Failed to load due FDs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueFds();
  }, []);

  const handleExecuteProcess = async () => {
    setProcessing(true);
    setModalError('');
    try {
      const res = await apiRequest('/staff/fd/process-maturities', {
        method: 'POST'
      });

      if (res.ok) {
        setConfirmModalOpen(false);
        const count = res.data?.processed_count || 0;
        setBanner({
          type: 'success',
          text: `Processed ${count} maturities.`
        });
        loadDueFds();
      } else {
        setModalError(res.message || 'Maturity processing failed');
      }
    } catch (err) {
      setModalError(err.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppShell title="Fixed Deposit Maturities">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {banner && (
          <Banner variant={banner.type} onDismiss={() => setBanner(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{banner.text}</span>
            </div>
          </Banner>
        )}

        {/* ─── STAT STRIP & BATCH TRIGGER ────────────────────────────── */}
        <div
          className="mf-panel"
          style={{
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            <Stat
              label="DUE NOW"
              value={String(dueCount)}
              caption="Active deposits at or past maturity date"
              style={dueCount > 0 ? { color: 'var(--amber)' } : {}}
            />
            <div style={{ width: '1px', height: '48px', backgroundColor: 'var(--line)' }} />
            <Stat
              label="TOTAL TO PAY OUT"
              value={formatMoney(totalPayout)}
              caption="Estimated credit to linked accounts"
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={<Play size={16} />}
            disabled={dueCount === 0}
            onClick={() => {
              setModalError('');
              setConfirmModalOpen(true);
            }}
          >
            Process maturities ({dueCount} due)
          </Button>
        </div>

        {/* ─── DUE FDS TABLE ─────────────────────────────────────────── */}
        <div className="mf-panel" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px' }}>
              <Skeleton height="36px" width="100%" count={4} style={{ marginBottom: '8px' }} />
            </div>
          ) : fds.length === 0 ? (
            <div style={{ padding: '48px 24px' }}>
              <EmptyState
                title="No fixed deposits are due."
                description="There are currently no active term deposits past their maturity date."
              />
            </div>
          ) : (
            <div className="mf-table-container">
              <table className="mf-ledger-table mf-ledger-dense">
                <thead>
                  <tr>
                    <th scope="col">FD NO</th>
                    <th scope="col">CUSTOMER</th>
                    <th scope="col">ACCOUNT</th>
                    <th scope="col" style={{ textAlign: 'right' }}>PRINCIPAL</th>
                    <th scope="col">RATE</th>
                    <th scope="col">MATURITY DATE</th>
                    <th scope="col" style={{ textAlign: 'right' }}>MATURITY AMOUNT</th>
                    <th scope="col">ON MATURITY</th>
                  </tr>
                </thead>
                <tbody>
                  {fds.map(fd => (
                    <tr key={fd.fd_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
                        FD-{String(fd.fd_id).padStart(4, '0')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fd.customer_name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                          ID: {fd.customer_id}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                        {fd.account_number}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMoney(fd.amount)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {fd.rate}%
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                        {formatDate(fd.maturity_date)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatMoney(fd.maturity_amount)}
                      </td>
                      <td>
                        <Tag variant={fd.maturity_instruction === 'CREDIT' ? 'success' : 'neutral'}>
                          {fd.maturity_instruction}
                        </Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── CONFIRM PROCESS MODAL ─────────────────────────────────── */}
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title="Process maturities"
          actionLabel="Process all due maturities"
          actionVariant="primary"
          onAction={handleExecuteProcess}
          actionLoading={processing}
        >
          {modalError && <Banner variant="error" style={{ marginBottom: '12px' }}>{modalError}</Banner>}

          <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: '22px', margin: 0 }}>
            Process <strong>{dueCount}</strong> fixed deposit {dueCount === 1 ? 'maturity' : 'maturities'}? Matured funds will be credited to active accounts or renewed into new term deposits. Frozen accounts will be skipped.
          </p>
        </Modal>
      </div>
    </AppShell>
  );
}

export default StaffFdMaturities;

