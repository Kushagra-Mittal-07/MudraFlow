import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Stat from '../../components/Stat';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Banner from '../../components/Banner';
import Tag from '../../components/Tag';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate, formatTxnRef } from '../../lib/format';
import { ArrowRight, AlertCircle, Building2, Clock, CheckCircle } from 'lucide-react';

export function StaffOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/staff/overview');
      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load staff overview');
      }
    } catch (err) {
      setError(err.message || 'Network error loading overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const totalBankBalance = parseFloat(data?.total_balance || 0);

  return (
    <AppShell title="Staff Overview">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {error && <Banner variant="error">{error}</Banner>}

        {/* ─── 1. STAT STRIP ─────────────────────────────────────────── */}
        {loading ? (
          <div className="mf-panel" style={{ padding: '20px' }}>
            <Skeleton height="60px" />
          </div>
        ) : (
          <div
            className="mf-panel"
            style={{
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '16px 20px', borderRight: '1px solid var(--line)' }}>
              <Stat label="CUSTOMERS" value={String(data?.total_customers || 0)} caption="Active accounts holder" />
            </div>
            <div style={{ padding: '16px 20px', borderRight: '1px solid var(--line)' }}>
              <Stat label="ACCOUNTS" value={String(data?.total_accounts || 0)} caption="Savings & Current" />
            </div>
            <div style={{ padding: '16px 20px', borderRight: '1px solid var(--line)' }}>
              <Stat label="TOTAL BALANCE" value={formatMoney(totalBankBalance)} caption="Bank-wide deposit base" />
            </div>
            <div style={{ padding: '16px 20px', borderRight: '1px solid var(--line)' }}>
              <Stat label="TRANSACTIONS TODAY" value={String(data?.transactions_today || 0)} caption="Ledger entries today" />
            </div>
            <div style={{ padding: '16px 20px' }}>
              <Stat
                label="PENDING APPROVALS"
                value={String(data?.pending_approvals || 0)}
                caption="Items needing review"
                style={data?.pending_approvals > 0 ? { color: 'var(--amber)' } : {}}
              />
            </div>
          </div>
        )}

        {/* ─── 2. WORK QUEUE & BRANCH SPLIT (5 cols : 7 cols) ────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}
        >
          {/* Left Column (5 cols): Needs Attention */}
          <div className="mf-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} color="var(--green-950)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0 }}>
                  Needs attention
                </h2>
              </div>
              <span className="mf-helper" style={{ fontSize: '12px' }}>Operational work queue</span>
            </div>

            {loading ? (
              <Skeleton height="160px" />
            ) : (data?.pending_loans === 0 && data?.pending_services === 0 && data?.fd_due_count === 0) ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-secondary)' }}>
                <CheckCircle size={28} color="var(--green-700)" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Nothing needs attention.</p>
                <span className="mf-helper" style={{ fontSize: '13px' }}>All queues are clear.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Row 1: Loans */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    backgroundColor: data?.pending_loans > 0 ? 'var(--paper-2)' : 'var(--surface)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Loans waiting</div>
                    <div className="mf-helper" style={{ fontSize: '12px' }}>
                      {data?.pending_loans || 0} loan application{data?.pending_loans === 1 ? '' : 's'} pending decision
                    </div>
                  </div>
                  <Button
                    variant={data?.pending_loans > 0 ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => navigate('/staff/approvals?tab=loans')}
                  >
                    Review
                  </Button>
                </div>

                {/* Row 2: Cards and Cheques */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    backgroundColor: data?.pending_services > 0 ? 'var(--paper-2)' : 'var(--surface)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Card and cheque book requests</div>
                    <div className="mf-helper" style={{ fontSize: '12px' }}>
                      {data?.pending_services || 0} service request{data?.pending_services === 1 ? '' : 's'} waiting
                    </div>
                  </div>
                  <Button
                    variant={data?.pending_services > 0 ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => navigate('/staff/approvals?tab=services')}
                  >
                    Review
                  </Button>
                </div>

                {/* Row 3: FD Maturities */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    backgroundColor: data?.fd_due_count > 0 ? 'var(--paper-2)' : 'var(--surface)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Fixed deposits due</div>
                    <div className="mf-helper" style={{ fontSize: '12px' }}>
                      {data?.fd_due_count || 0} term deposit{data?.fd_due_count === 1 ? '' : 's'} matured for payout
                    </div>
                  </div>
                  <Button
                    variant={data?.fd_due_count > 0 ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => navigate('/staff/fd')}
                  >
                    Review
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (7 cols): Money Per Branch */}
          <div className="mf-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="var(--green-950)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0 }}>
                  Money per branch
                </h2>
              </div>
              <span className="mf-helper" style={{ fontSize: '12px' }}>Deposit allocation</span>
            </div>

            {loading ? (
              <Skeleton height="160px" />
            ) : !data?.money_per_branch || data.money_per_branch.length === 0 ? (
              <p className="mf-helper">No branch data available.</p>
            ) : (
              <div className="mf-table-container">
                <table className="mf-ledger-table mf-ledger-dense">
                  <thead>
                    <tr>
                      <th scope="col">BRANCH</th>
                      <th scope="col" style={{ textAlign: 'right' }}>ACCOUNTS</th>
                      <th scope="col" style={{ textAlign: 'right' }}>TOTAL BALANCE</th>
                      <th scope="col" style={{ width: '180px' }}>SHARE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.money_per_branch.map(b => (
                      <tr key={b.branch_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.branch_name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                            {b.ifsc}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {b.accounts}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {formatMoney(b.total_balance)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '8px',
                                backgroundColor: 'var(--line)',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${b.share}%`,
                                  backgroundColor: 'var(--green-900)'
                                }}
                              />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', minWidth: '32px' }}>
                              {b.share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. LATEST TRANSACTIONS ─────────────────────────────────── */}
        <div className="mf-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--green-950)" />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0 }}>
                Latest transactions
              </h2>
            </div>
            <Link
              to="/staff/transactions"
              style={{
                fontSize: '13px',
                color: 'var(--green-700)',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>All transactions</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <Skeleton height="200px" />
          ) : !data?.latest_transactions || data.latest_transactions.length === 0 ? (
            <p className="mf-helper">No recent transactions recorded.</p>
          ) : (
            <div className="mf-table-container">
              <table className="mf-ledger-table mf-ledger-dense">
                <thead>
                  <tr>
                    <th scope="col">REFERENCE</th>
                    <th scope="col">DATE AND TIME</th>
                    <th scope="col">TYPE</th>
                    <th scope="col">FROM</th>
                    <th scope="col">TO</th>
                    <th scope="col">MODE</th>
                    <th scope="col" style={{ textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latest_transactions.map(t => (
                    <tr key={t.txn_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {formatTxnRef(t.reference_no || t.txn_id)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                        {formatDate(t.created_at, true)}
                      </td>
                      <td>
                        <Tag variant="neutral">{t.txn_type}</Tag>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {t.from_account_number || 'Bank'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {t.to_account_number || (t.txn_type === 'FD_CREATE' ? 'Locked in FD' : 'Bank')}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {t.mode || 'INTERNAL'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatMoney(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default StaffOverview;
