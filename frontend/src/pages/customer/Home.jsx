import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useActiveAccount } from '../../context/ActiveAccountContext';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';
import AppShell from '../../components/AppShell';
import MaskedValue from '../../components/MaskedValue';
import LedgerTable from '../../components/LedgerTable';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import Skeleton from '../../components/Skeleton';
import Drawer from '../../components/Drawer';
import Field from '../../components/Field';
import RadioTiles from '../../components/RadioTiles';
import Slip from '../../components/Slip';
import Banner from '../../components/Banner';

export function Home() {
  const { user } = useAuth();
  const { activeAccountId, activeAccount, accounts, switchAccount, refreshAccounts } = useActiveAccount();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Open another account drawer state
  const [openAccountDrawer, setOpenAccountDrawer] = useState(false);
  const [openAccType, setOpenAccType] = useState('CURRENT');
  const [openBranchId, setOpenBranchId] = useState('1');
  const [openFundingAccId, setOpenFundingAccId] = useState('');
  const [openAmount, setOpenAmount] = useState('2000');
  const [openPassword, setOpenPassword] = useState('Demo@123');
  const [openLoading, setOpenLoading] = useState(false);
  const [openError, setOpenError] = useState('');
  const [openSuccessReceipt, setOpenSuccessReceipt] = useState(null);
  const [branches, setBranches] = useState([]);

  // Fetch branches for drawer
  useEffect(() => {
    apiRequest('/branches')
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          setBranches(res.data);
          if (res.data.length > 0) setOpenBranchId(String(res.data[0].branch_id));
        }
      })
      .catch(console.error);
  }, []);

  // Fetch dashboard data whenever activeAccountId changes or on initial mount
  useEffect(() => {
    loadDashboard(activeAccountId || '');
  }, [activeAccountId]);

  // Set default funding account
  useEffect(() => {
    if (activeAccountId) {
      setOpenFundingAccId(String(activeAccountId));
    }
  }, [activeAccountId]);

  const loadDashboard = async (accId) => {
    setLoading(true);
    setError('');
    try {
      const endpoint = accId ? `/dashboard?account_id=${accId}` : '/dashboard';
      const res = await apiRequest(endpoint);
      if (res.ok) {
        setDashboardData(res.data);
        if (!activeAccountId && res.data?.selected_account?.account_id) {
          switchAccount(res.data.selected_account.account_id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load account dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Greeting time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Customer';

  // Handler for opening another account
  const handleOpenAccountSubmit = async () => {
    setOpenLoading(true);
    setOpenError('');
    try {
      const res = await apiRequest('/accounts', {
        method: 'POST',
        body: {
          account_type: openAccType,
          branch_id: parseInt(openBranchId),
          from_account_id: parseInt(openFundingAccId),
          amount: parseFloat(openAmount),
          password: openPassword
        }
      });

      if (res.ok) {
        setOpenSuccessReceipt(res.data);
        await refreshAccounts();
        if (res.data?.account_id) {
          switchAccount(res.data.account_id);
        }
      }
    } catch (err) {
      setOpenError(err.message || 'Failed to open account');
    } finally {
      setOpenLoading(false);
    }
  };

  return (
    <AppShell title="Home">
      {/* 1. Greeting Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <h2 style={{ fontSize: '30px', color: 'var(--ink)' }}>
          {greeting}, {firstName}
        </h2>
        <div
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--ink-2)'
          }}
        >
          {formatDate(new Date())}
        </div>
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      {loading && !dashboardData ? (
        <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '24px' }}>
          <Skeleton height="320px" />
          <Skeleton height="320px" />
        </div>
      ) : (
        /* 2. Main 12-Column Grid (8 cols left / 4 cols right) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* ─── LEFT COLUMN (8 cols) ─────────────────────────────────── */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }} className="mf-home-col-left">
            {/* Account Summary Card with 4px Green Left Bar */}
            <div className="mf-panel mf-panel-accent-left">
              {/* Top Row: Type and Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="mf-label" style={{ marginBottom: 0, color: 'var(--green-900)' }}>
                  {dashboardData?.selected_account?.account_type || activeAccount?.account_type || 'SAVINGS'} ACCOUNT
                </span>
                <Tag status={dashboardData?.selected_account?.status || activeAccount?.status || 'ACTIVE'}>
                  {dashboardData?.selected_account?.status || activeAccount?.status || 'ACTIVE'}
                </Tag>
              </div>

              {/* Masked Account Number with VIEW and COPY */}
              <div style={{ marginBottom: '20px' }}>
                <MaskedValue
                  type="account"
                  value={dashboardData?.selected_account?.account_number_masked || activeAccount?.account_number_masked}
                  fullValue={dashboardData?.selected_account?.account_number || activeAccount?.account_number}
                  large
                />
              </div>

              {/* Balance (Hidden by default, SHOW/HIDE chip, amount in words) */}
              <div style={{ marginBottom: '24px' }}>
                <MaskedValue
                  type="balance"
                  label="AVAILABLE BALANCE"
                  value={parseFloat(dashboardData?.selected_account?.balance ?? activeAccount?.balance ?? 0)}
                  fullValue={parseFloat(dashboardData?.selected_account?.balance ?? activeAccount?.balance ?? 0)}
                />
              </div>

              {/* Action Row */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
                <Button variant="primary" arrow onClick={() => navigate('/app/transfer')}>
                  Transfer money
                </Button>
                <Button variant="secondary" onClick={() => navigate('/app/fd')}>
                  New fixed deposit
                </Button>
                <Button variant="secondary" onClick={() => navigate('/app/services')}>
                  Apply for a loan
                </Button>
                <Button variant="link" onClick={() => window.print()}>
                  Print statement →
                </Button>
              </div>

              {/* Bottom Band (--paper-2): Branch, IFSC, Month In/Out */}
              <div
                style={{
                  backgroundColor: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <span className="mf-label" style={{ display: 'inline', marginRight: '6px' }}>BRANCH</span>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {dashboardData?.selected_account?.branch_name || activeAccount?.branch_name || 'Main Branch'}
                    </span>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '16px' }}>
                    <span className="mf-label" style={{ display: 'inline', marginRight: '6px' }}>IFSC</span>
                    <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
                      {dashboardData?.selected_account?.ifsc || activeAccount?.ifsc || 'MUDF0000482'}
                    </span>
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '16px', display: 'flex', gap: '16px' }}>
                  <div>
                    <span className="mf-label" style={{ display: 'inline', marginRight: '6px' }}>THIS MONTH IN</span>
                    <span className="tabular-nums" style={{ color: 'var(--credit)', fontWeight: 600 }}>
                      + {formatMoney(dashboardData?.month_in || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="mf-label" style={{ display: 'inline', marginRight: '6px' }}>OUT</span>
                    <span className="tabular-nums" style={{ color: 'var(--debit)', fontWeight: 600 }}>
                      − {formatMoney(dashboardData?.month_out || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Entries Panel (Last 5 transactions) */}
            <div className="mf-panel" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--ink)' }}>Recent entries</h3>
                  <Tag status="ACTIVE">LEDGER</Tag>
                </div>
                <Link to="/app/history" style={{ fontSize: '13px', color: 'var(--green-700)', fontWeight: 500 }}>
                  View full history →
                </Link>
              </div>

              <LedgerTable
                entries={(dashboardData?.recent_transactions || []).map(t => ({
                  id: t.txn_id,
                  date: t.created_at,
                  description: t.description,
                  debit: t.direction === 'debit' ? t.amount : null,
                  credit: t.direction === 'credit' ? t.amount : null,
                  balance: t.balance_after,
                  receiptLink: `/app/receipt/${t.reference_no}`
                }))}
                emptyMessage="No entries yet. Your opening deposit will appear here."
              />
            </div>
          </div>

          {/* ─── RIGHT COLUMN (4 cols) ────────────────────────────────── */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '24px' }} className="mf-home-col-right">
            {/* 1. Your Accounts List */}
            <div className="mf-panel">
              <div className="mf-panel-header">
                <h3 className="mf-panel-title">Your accounts</h3>
                <span className="mf-label" style={{ marginBottom: 0 }}>
                  {(dashboardData?.accounts || accounts).length} TOTAL
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(dashboardData?.accounts || accounts).map((acc) => {
                  const isSelected = acc.account_id === activeAccountId;
                  const isAccFrozen = acc.status === 'FROZEN';

                  return (
                    <div
                      key={acc.account_id}
                      onClick={() => switchAccount(acc.account_id)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--line)',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--green-100)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--green-900)' : '3px solid transparent',
                        transition: 'background-color 120ms ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--page)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                          {acc.account_type}
                        </span>
                        {isAccFrozen ? (
                          <Tag status="FROZEN">FROZEN</Tag>
                        ) : (
                          <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            ₹{parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: 'var(--ink-2)',
                          marginTop: '4px'
                        }}
                      >
                        •••• {acc.last4 || (acc.account_number ? acc.account_number.slice(-4) : '----')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <Button
                  variant="link"
                  onClick={() => {
                    setOpenSuccessReceipt(null);
                    setOpenAccountDrawer(true);
                  }}
                >
                  + Open another account
                </Button>
              </div>
            </div>

            {/* 2. At A Glance Panel */}
            <div className="mf-panel">
              <div className="mf-panel-header">
                <h3 className="mf-panel-title">At a glance</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span className="mf-label">ACTIVE FIXED DEPOSITS</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
                      {dashboardData?.active_fd_count || 0}
                    </span>
                    <Link to="/app/fd" style={{ fontSize: '13px', color: 'var(--green-700)' }}>
                      View deposits →
                    </Link>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <span className="mf-label">NEXT MATURITY</span>
                  <div style={{ marginTop: '4px' }}>
                    {dashboardData?.next_fd_maturity ? (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {formatMoney(dashboardData.next_fd_maturity.amount)}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                          {formatDate(dashboardData.next_fd_maturity.date)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '14px', color: 'var(--ink-3)' }}>None active</span>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <span className="mf-label">PENDING REQUESTS</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
                      {dashboardData?.pending_count || 0}
                    </span>
                    <Link to="/app/services" style={{ fontSize: '13px', color: 'var(--green-700)' }}>
                      Track →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Open Applications Panel */}
            <div className="mf-panel">
              <div className="mf-panel-header">
                <h3 className="mf-panel-title">Open applications</h3>
                <Link to="/app/services" style={{ fontSize: '12px', color: 'var(--green-700)' }}>
                  All →
                </Link>
              </div>

              {(!dashboardData?.recent_applications || dashboardData.recent_applications.length === 0) ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: '14px' }}>
                  Nothing pending.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dashboardData.recent_applications.map((app, idx) => (
                    <div
                      key={idx}
                      style={{
                        paddingBottom: '10px',
                        borderBottom: idx === dashboardData.recent_applications.length - 1 ? 'none' : '1px solid var(--line)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                          {app.application_type === 'LOAN' ? `LN-${String(app.application_id).padStart(4, '0')}` : `SR-${String(app.application_id).padStart(4, '0')}`}
                        </span>
                        <Tag status={app.status}>{app.status}</Tag>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
                        {app.details}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DRAWER: OPEN ANOTHER ACCOUNT ─────────────────────────────── */}
      <Drawer
        isOpen={openAccountDrawer}
        onClose={() => setOpenAccountDrawer(false)}
        title="Open another account"
        primaryLabel={openSuccessReceipt ? null : 'Open Account'}
        onPrimary={handleOpenAccountSubmit}
        primaryLoading={openLoading}
      >
        {openError && <Banner variant="error">{openError}</Banner>}

        {openSuccessReceipt ? (
          <div>
            <Slip
              title="Account created"
              subtitle="Your new account is now active and ready."
              stamp={{ text: 'ACCOUNT OPENED', variant: 'green' }}
              rows={[
                { label: 'New Account Number', value: openSuccessReceipt.account_number },
                { label: 'Classification', value: openAccType },
                { label: 'Opening Deposit', value: formatMoney(openAmount) },
                { label: 'Funded from Account', value: `••••${openFundingAccId}` },
                { label: 'Date', value: formatDate(new Date()) }
              ]}
            >
              <Button
                variant="primary"
                full
                style={{ marginTop: '20px' }}
                onClick={() => setOpenAccountDrawer(false)}
              >
                Done
              </Button>
            </Slip>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="mf-label" style={{ marginBottom: '6px' }}>Account Classification</span>
              <RadioTiles
                value={openAccType}
                onChange={setOpenAccType}
                options={[
                  { value: 'SAVINGS', title: 'Savings', caption: 'Everyday interest-bearing account' },
                  { value: 'CURRENT', title: 'Current', caption: 'Business account with higher limits' }
                ]}
              />
            </div>

            <Field
              label="Branch"
              type="select"
              value={openBranchId}
              onChange={(e) => setOpenBranchId(e.target.value)}
              options={branches.map(b => ({
                value: String(b.branch_id),
                label: `${b.branch_name} · ${b.ifsc}`
              }))}
            />

            <Field
              label="Funding Account"
              type="select"
              value={openFundingAccId}
              onChange={(e) => setOpenFundingAccId(e.target.value)}
              options={accounts.map(a => ({
                value: String(a.account_id),
                label: `${a.account_type} ••••${a.last4 || (a.account_number ? a.account_number.slice(-4) : '----')} (Bal: ₹${parseFloat(a.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
              }))}
            />

            <Field
              label="Opening Amount (min ₹1,000)"
              type="amount"
              value={openAmount}
              onChange={(e) => setOpenAmount(e.target.value)}
            />

            <div style={{ fontSize: '13px', color: 'var(--ink-2)', padding: '10px 12px', background: 'var(--paper-2)', border: '1px solid var(--line)' }}>
              ₹{parseFloat(openAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will move from your funding account to the new account in one atomic transaction.
            </div>

            <Field
              label="Confirm with your password"
              type="password"
              value={openPassword}
              onChange={(e) => setOpenPassword(e.target.value)}
              placeholder="Demo@123"
            />
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}

export default Home;
