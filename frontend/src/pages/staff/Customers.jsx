import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import SplitView from '../../components/SplitView';
import Field from '../../components/Field';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import Modal from '../../components/Modal';
import Banner from '../../components/Banner';
import Skeleton from '../../components/Skeleton';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';
import { Search, ShieldAlert, ShieldCheck, User, CreditCard } from 'lucide-react';

export function StaffCustomers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [banner, setBanner] = useState(null);

  // Freeze/Unfreeze Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetAccount, setTargetAccount] = useState(null); // { account_id, account_number, status }
  const [actionType, setActionType] = useState('FROZEN'); // 'FROZEN' | 'ACTIVE'
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch customers matching query
  const searchCustomers = async (q = '') => {
    setLoadingList(true);
    try {
      const res = await apiRequest(`/staff/customers?q=${encodeURIComponent(q)}`);
      if (res.ok && Array.isArray(res.data)) {
        setCustomers(res.data);
        setSelectedCustomerId(prev => {
          if (res.data.some(c => c.customer_id === prev)) return prev;
          return res.data.length > 0 ? res.data[0].customer_id : null;
        });
      }
    } catch (err) {
      console.error('Failed to search customers:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load selected customer detail
  const loadCustomerDetail = async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await apiRequest(`/staff/customers/${id}`);
      if (res.ok && res.data) {
        setCustomerDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerDetail(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleOpenStatusModal = (account, newStatus) => {
    setTargetAccount(account);
    setActionType(newStatus);
    setModalError('');
    setConfirmModalOpen(true);
  };

  const handleExecuteStatusChange = async () => {
    if (!targetAccount) return;
    setSubmitting(true);
    setModalError('');

    try {
      const res = await apiRequest(`/staff/accounts/${targetAccount.account_id}/status`, {
        method: 'PATCH',
        body: { status: actionType }
      });

      if (res.ok) {
        setConfirmModalOpen(false);
        setBanner({
          type: 'success',
          text: `Account ${targetAccount.account_number} status updated to ${actionType}.`
        });
        // Refresh customer detail to update accounts list
        loadCustomerDetail(selectedCustomerId);
      } else {
        setModalError(res.message || 'Status update failed');
      }
    } catch (err) {
      setModalError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare items for SplitView
  const splitItems = customers.map(c => ({
    id: c.customer_id,
    customer_id: c.customer_id,
    full_name: c.full_name,
    email: c.email,
    account_count: c.account_count || 0,
    primary_account: c.primary_account || null
  }));

  return (
    <AppShell title="Customers & Accounts">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {banner && (
          <Banner variant={banner.type} onDismiss={() => setBanner(null)}>
            {banner.text}
          </Banner>
        )}

        <div className="mf-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Search size={18} color="var(--ink-secondary)" />
            <input
              type="text"
              className="mf-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, email or account number..."
              style={{ flex: 1 }}
            />
            {searchQuery && (
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="mf-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <SplitView
            items={splitItems}
            selectedId={selectedCustomerId}
            onSelect={(id) => setSelectedCustomerId(id)}
            emptyDetailMessage="Select a customer to see their accounts."
            renderItem={(item, isSelected) => (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: isSelected ? 'var(--green-950)' : 'var(--ink)' }}>
                    {item.full_name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--green-900)' }}>
                    {item.primary_account ? `A/C ${item.primary_account}` : `ID ${item.customer_id}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                    ID: {item.customer_id} · {item.email}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--green-900)' }}>
                    {item.account_count} account{item.account_count === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            )}
            renderDetail={() => {
              if (loadingDetail) {
                return (
                  <div style={{ padding: '24px' }}>
                    <Skeleton height="120px" style={{ marginBottom: '16px' }} />
                    <Skeleton height="200px" />
                  </div>
                );
              }

              if (!customerDetail) {
                return (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-secondary)' }}>
                    Select a customer to see their accounts.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Identity Panel */}
                  <div
                    style={{
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '20px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <User size={18} color="var(--green-950)" />
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', margin: 0 }}>
                        Customer identity
                      </h2>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '14px'
                      }}
                    >
                      <div>
                        <div className="mf-label">Customer ID</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 600 }}>
                          {customerDetail.customer_id}
                        </div>
                      </div>

                      <div>
                        <div className="mf-label">Full Name</div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>
                          {customerDetail.full_name}
                        </div>
                      </div>

                      <div>
                        <div className="mf-label">Mobile Number</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                          +91 {customerDetail.phone}
                        </div>
                      </div>

                      <div>
                        <div className="mf-label">Email Address</div>
                        <div style={{ fontSize: '14px' }}>
                          {customerDetail.email}
                        </div>
                      </div>

                      <div>
                        <div className="mf-label">PAN on Record</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                          {customerDetail.pan_masked}
                        </div>
                      </div>

                      <div>
                        <div className="mf-label">Date of Birth</div>
                        <div style={{ fontSize: '14px' }}>
                          {customerDetail.dob ? formatDate(customerDetail.dob) : '—'}
                        </div>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <div className="mf-label">Permanent Address</div>
                        <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                          {customerDetail.address || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accounts Table */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <CreditCard size={18} color="var(--green-950)" />
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0 }}>
                        Accounts on ledger
                      </h2>
                    </div>

                    {!customerDetail.accounts || customerDetail.accounts.length === 0 ? (
                      <p className="mf-helper">No active accounts for this customer.</p>
                    ) : (
                      <div className="mf-table-container">
                        <table className="mf-ledger-table mf-ledger-dense">
                          <thead>
                            <tr>
                              <th scope="col">ACCOUNT NUMBER</th>
                              <th scope="col">TYPE</th>
                              <th scope="col">BRANCH</th>
                              <th scope="col" style={{ textAlign: 'right' }}>BALANCE</th>
                              <th scope="col">STATUS</th>
                              <th scope="col" style={{ textAlign: 'right' }}>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerDetail.accounts.map(acc => (
                              <tr key={acc.account_id}>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
                                  {acc.account_number}
                                </td>
                                <td>
                                  <Tag variant="neutral">{acc.account_type}</Tag>
                                </td>
                                <td>
                                  <div>{acc.branch_name || 'Main Branch'}</div>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                                    {acc.ifsc}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                  {formatMoney(acc.balance)}
                                </td>
                                <td>
                                  <Tag variant={acc.status === 'ACTIVE' ? 'success' : 'danger'}>
                                    {acc.status}
                                  </Tag>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {acc.status === 'ACTIVE' ? (
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleOpenStatusModal(acc, 'FROZEN')}
                                    >
                                      Freeze
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleOpenStatusModal(acc, 'ACTIVE')}
                                    >
                                      Unfreeze
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* ─── CONFIRM STATUS MODAL ─────────────────────────────────── */}
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title={actionType === 'FROZEN' ? 'Freeze account' : 'Unfreeze account'}
          actionLabel={actionType === 'FROZEN' ? 'Confirm freeze' : 'Confirm unfreeze'}
          actionVariant={actionType === 'FROZEN' ? 'danger' : 'primary'}
          onAction={handleExecuteStatusChange}
          actionLoading={submitting}
        >
          {modalError && <Banner variant="error" style={{ marginBottom: '12px' }}>{modalError}</Banner>}

          <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: '22px', margin: 0 }}>
            {actionType === 'FROZEN' ? (
              <>
                Freeze account <strong>{targetAccount?.account_number}</strong>? The customer will not be able to send or receive money.
              </>
            ) : (
              <>
                Unfreeze account <strong>{targetAccount?.account_number}</strong>? The customer will regain full transfer and payout access.
              </>
            )}
          </p>
        </Modal>
      </div>
    </AppShell>
  );
}

export default StaffCustomers;
