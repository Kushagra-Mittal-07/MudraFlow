import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import MaskedValue from '../../components/MaskedValue';
import Tag from '../../components/Tag';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Banner from '../../components/Banner';
import OpenAccountDrawer from '../../components/OpenAccountDrawer';
import { useActiveAccount } from '../../context/ActiveAccountContext';
import { Plus, User, Shield, CreditCard, Building2 } from 'lucide-react';

export function Profile() {
  const { refreshAccounts } = useActiveAccount();
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDrawer, setOpenDrawer] = useState(false);
  const [visibleBalances, setVisibleBalances] = useState({});

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profRes, accRes] = await Promise.all([
        apiRequest('/profile'),
        apiRequest('/accounts')
      ]);

      if (profRes.ok && profRes.data) {
        setProfile(profRes.data);
      } else {
        setError(profRes.message || 'Could not load profile');
      }

      if (accRes.ok && accRes.data) {
        setAccounts(accRes.data);
      }
    } catch (err) {
      setError(err.message || 'Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleBalance = (accId) => {
    setVisibleBalances(prev => ({
      ...prev,
      [accId]: !prev[accId]
    }));
  };

  const handleAccountOpened = async () => {
    await refreshAccounts();
    await fetchData();
  };

  return (
    <AppShell title="Profile & Account Details">
      {error && (
        <Banner variant="danger" style={{ marginBottom: '16px' }}>
          {error}
        </Banner>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '24px' }}>
          <Skeleton height="320px" />
          <Skeleton height="320px" />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}
        >
          {/* Left Column (5 cols equivalent): Account Holder Information */}
          <div className="mf-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <User size={18} color="var(--green-900)" />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', margin: 0 }}>
                Account holder
              </h2>
            </div>

            {profile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div className="mf-label">Customer ID</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 600 }}>
                    {profile.customer_id}
                  </div>
                </div>

                <div>
                  <div className="mf-label">Full Name</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 600 }}>
                    {profile.full_name}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div className="mf-label">Date of Birth</div>
                    <div style={{ fontSize: '14px' }}>
                      {profile.dob ? formatDate(profile.dob) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="mf-label">PAN on Record</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.05em' }}>
                      {profile.pan_masked || '••••••1234'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mf-label">Mobile Number</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                    +91 {profile.phone}
                  </div>
                </div>

                <div>
                  <div className="mf-label">Email Address</div>
                  <div style={{ fontSize: '14px' }}>{profile.email}</div>
                </div>

                <div>
                  <div className="mf-label">Permanent Address</div>
                  <div style={{ fontSize: '14px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                    {profile.address || '—'}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '6px' }}>
                  <div className="mf-label">Customer Since</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                    {formatDate(profile.created_at)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mf-helper">No customer profile details available.</p>
            )}
          </div>

          {/* Right Column (7 cols equivalent): Your Accounts */}
          <div className="mf-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="var(--green-900)" />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', margin: 0 }}>
                  Your accounts
                </h2>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setOpenDrawer(true)}
              >
                Open another account
              </Button>
            </div>

            {accounts.length === 0 ? (
              <p className="mf-helper">No accounts found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {accounts.map(acc => {
                  const isBalVisible = !!visibleBalances[acc.account_id];
                  return (
                    <div
                      key={acc.account_id}
                      style={{
                        border: '1px solid var(--border)',
                        padding: '14px 16px',
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>
                            {acc.account_type.toLowerCase()} Account
                          </span>
                          <Tag variant={acc.status === 'ACTIVE' ? 'success' : 'danger'}>
                            {acc.status}
                          </Tag>
                        </div>

                        {/* Branch info */}
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--ink-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Building2 size={12} />
                          <span>{acc.branch_name || 'Main Branch'}</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{acc.ifsc || 'MUDR0000001'}</span>
                        </div>
                      </div>

                      {/* Masked Account Number */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div className="mf-label" style={{ marginBottom: '2px' }}>Account Number</div>
                          <MaskedValue
                            type="account"
                            value={acc.account_number}
                            fullValue={acc.account_number}
                          />
                        </div>

                        {/* Balance display with show/hide */}
                        <div style={{ textAlign: 'right' }}>
                          <div className="mf-label" style={{ marginBottom: '2px' }}>Available Balance</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 600 }}>
                              {isBalVisible ? formatMoney(acc.balance) : '₹ ••,••,•••.••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleBalance(acc.account_id)}
                              style={{
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                cursor: 'pointer'
                              }}
                            >
                              {isBalVisible ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open Another Account Drawer */}
      <OpenAccountDrawer
        isOpen={openDrawer}
        onClose={() => setOpenDrawer(false)}
        onSuccess={handleAccountOpened}
      />
    </AppShell>
  );
}

export default Profile;
