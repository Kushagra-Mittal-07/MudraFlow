import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import Segmented from '../../components/Segmented';
import Chip from '../../components/Chip';
import Tag from '../../components/Tag';
import Button from '../../components/Button';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import Banner from '../../components/Banner';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { apiRequest } from '../../lib/api';
import { formatMoney, formatDate, formatAppRef } from '../../lib/format';
import { amountInWords } from '../../lib/amountInWords';
import { CheckCircle2, XCircle, FileCheck, CreditCard, BookOpen } from 'lucide-react';

export function StaffApprovals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'services' ? 'services' : 'loans';

  const [activeTab, setActiveTab] = useState(initialTab); // 'loans' | 'services'
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'ALL'

  const [loans, setLoans] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', text: '' }

  // Review Drawer state
  const [reviewItem, setReviewItem] = useState(null); // item object being reviewed
  const [reviewType, setReviewType] = useState('loan'); // 'loan' | 'service'
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Confirm Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [decision, setDecision] = useState('APPROVED'); // 'APPROVED' | 'REJECTED'
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [loansRes, servRes] = await Promise.all([
        apiRequest(`/staff/loans?status=${statusFilter}`),
        apiRequest(`/staff/services?status=${statusFilter === 'PENDING' ? 'REQUESTED' : 'ALL'}`)
      ]);

      if (loansRes.ok && Array.isArray(loansRes.data)) {
        setLoans(loansRes.data);
      }
      if (servRes.ok && Array.isArray(servRes.data)) {
        setServices(servRes.data);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleTabChange = (val) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  const handleOpenReview = (item, type) => {
    setReviewItem(item);
    setReviewType(type);
    setDrawerOpen(true);
  };

  const handleInitiateDecision = (dec) => {
    setDecision(dec);
    setModalError('');
    setConfirmModalOpen(true);
  };

  const handleExecuteDecision = async () => {
    if (!reviewItem) return;
    setSubmitting(true);
    setModalError('');

    try {
      if (reviewType === 'loan') {
        const res = await apiRequest(`/staff/loans/${reviewItem.loan_id}/decision`, {
          method: 'POST',
          body: { decision }
        });

        if (res.ok) {
          setConfirmModalOpen(false);
          setDrawerOpen(false);
          setBanner({
            type: 'success',
            text: decision === 'APPROVED'
              ? `Loan LN-${String(reviewItem.loan_id).padStart(4, '0')} approved. ${formatMoney(reviewItem.amount)} credited to account ${reviewItem.account_number}.`
              : `Loan LN-${String(reviewItem.loan_id).padStart(4, '0')} rejected.`
          });
          loadData();
        } else {
          setModalError(res.message || 'Decision failed');
        }
      } else {
        const res = await apiRequest(`/staff/services/${reviewItem.request_id}/decision`, {
          method: 'POST',
          body: { decision }
        });

        if (res.ok) {
          setConfirmModalOpen(false);
          setDrawerOpen(false);
          let extraMsg = '';
          if (decision === 'APPROVED' && reviewItem.request_type === 'DEBIT_CARD' && res.data?.card_number) {
            extraMsg = ` Demo card number generated: ${res.data.card_number.replace(/(\d{4})/g, '$1 ').trim()}.`;
          }
          setBanner({
            type: 'success',
            text: `Service request SR-${String(reviewItem.request_id).padStart(4, '0')} ${decision.toLowerCase()}.${extraMsg}`
          });
          loadData();
        } else {
          setModalError(res.message || 'Decision failed');
        }
      }
    } catch (err) {
      setModalError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingLoansCount = loans.filter(l => l.status === 'PENDING').length;
  const pendingServicesCount = services.filter(s => s.status === 'REQUESTED').length;

  return (
    <AppShell title="Approvals">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {banner && (
          <Banner variant={banner.type} onDismiss={() => setBanner(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {banner.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span>{banner.text}</span>
            </div>
          </Banner>
        )}

        {/* ─── TAB NAVIGATION & STATUS FILTERS ───────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <Segmented
            value={activeTab}
            onChange={handleTabChange}
            options={[
              { value: 'loans', label: `Loans (${pendingLoansCount})` },
              { value: 'services', label: `Cards and cheque books (${pendingServicesCount})` }
            ]}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mf-label" style={{ marginBottom: 0 }}>STATUS:</span>
            <Chip
              selected={statusFilter === 'PENDING'}
              onClick={() => setStatusFilter('PENDING')}
            >
              Pending
            </Chip>
            <Chip
              selected={statusFilter === 'ALL'}
              onClick={() => setStatusFilter('ALL')}
            >
              All
            </Chip>
          </div>
        </div>

        {/* ─── TAB 1: LOANS TABLE ────────────────────────────────────── */}
        {activeTab === 'loans' && (
          <div className="mf-panel" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height="36px" width="100%" count={5} style={{ marginBottom: '8px' }} />
              </div>
            ) : loans.length === 0 ? (
              <div style={{ padding: '48px 24px' }}>
                <EmptyState
                  title="Nothing waiting for approval."
                  description="All loan applications have been evaluated."
                />
              </div>
            ) : (
              <div className="mf-table-container">
                <table className="mf-ledger-table mf-ledger-dense">
                  <thead>
                    <tr>
                      <th scope="col">REF</th>
                      <th scope="col">CUSTOMER</th>
                      <th scope="col">ACCOUNT</th>
                      <th scope="col" style={{ textAlign: 'right' }}>AMOUNT</th>
                      <th scope="col">PURPOSE</th>
                      <th scope="col">DURATION</th>
                      <th scope="col">APPLIED ON</th>
                      <th scope="col">STATUS</th>
                      <th scope="col" style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map(l => (
                      <tr key={l.loan_id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          LN-{String(l.loan_id).padStart(4, '0')}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.customer_name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                            ID: {l.customer_id}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {l.account_number}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {formatMoney(l.amount)}
                        </td>
                        <td>{l.purpose}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{l.duration_months} mo</td>
                        <td style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                          {formatDate(l.applied_on)}
                        </td>
                        <td>
                          <Tag variant={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}>
                            {l.status}
                          </Tag>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant={l.status === 'PENDING' ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handleOpenReview(l, 'loan')}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: CARDS & CHEQUE BOOKS TABLE ─────────────────────── */}
        {activeTab === 'services' && (
          <div className="mf-panel" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height="36px" width="100%" count={5} style={{ marginBottom: '8px' }} />
              </div>
            ) : services.length === 0 ? (
              <div style={{ padding: '48px 24px' }}>
                <EmptyState
                  title="Nothing waiting for approval."
                  description="No cards or cheque books pending review."
                />
              </div>
            ) : (
              <div className="mf-table-container">
                <table className="mf-ledger-table mf-ledger-dense">
                  <thead>
                    <tr>
                      <th scope="col">REF</th>
                      <th scope="col">TYPE</th>
                      <th scope="col">CUSTOMER</th>
                      <th scope="col">ACCOUNT</th>
                      <th scope="col">DETAILS</th>
                      <th scope="col">REQUESTED ON</th>
                      <th scope="col">STATUS</th>
                      <th scope="col" style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(s => {
                      const details = s.request_type === 'DEBIT_CARD'
                        ? `${s.network || 'Card'} · Name: ${s.name_on_card || '—'}`
                        : `${s.leaves || 25} leaves booklet`;

                      return (
                        <tr key={s.request_id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            SR-{String(s.request_id).padStart(4, '0')}
                          </td>
                          <td>
                            <Tag variant="neutral">
                              {s.request_type === 'DEBIT_CARD' ? 'DEBIT CARD' : 'CHEQUE BOOK'}
                            </Tag>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{s.customer_name}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                              ID: {s.customer_id}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            {s.account_number}
                          </td>
                          <td style={{ fontSize: '13px' }}>
                            <div>{details}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-secondary)' }}>
                              {s.delivery_address}
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                            {formatDate(s.requested_on)}
                          </td>
                          <td>
                            <Tag variant={s.status === 'APPROVED' ? 'success' : s.status === 'REJECTED' ? 'danger' : 'warning'}>
                              {s.status}
                            </Tag>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant={s.status === 'REQUESTED' ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => handleOpenReview(s, 'service')}
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── REVIEW DRAWER ─────────────────────────────────────────── */}
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={reviewType === 'loan' ? 'Review Loan Application' : 'Review Service Request'}
        >
          {reviewItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
                  {reviewType === 'loan' ? `LN-${String(reviewItem.loan_id).padStart(4, '0')}` : `SR-${String(reviewItem.request_id).padStart(4, '0')}`}
                </span>
                <Tag variant={reviewItem.status === 'APPROVED' ? 'success' : reviewItem.status === 'REJECTED' ? 'danger' : 'warning'}>
                  {reviewItem.status}
                </Tag>
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div className="mf-label">Customer</div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{reviewItem.customer_name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                    Customer ID: {reviewItem.customer_id}
                  </div>
                </div>

                <div>
                  <div className="mf-label">Linked Account</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600 }}>
                    {reviewItem.account_number}
                  </div>
                </div>

                {reviewType === 'loan' ? (
                  <>
                    <div style={{ padding: '14px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="mf-label">Requested Principal Amount</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: 'var(--green-950)' }}>
                        {formatMoney(reviewItem.amount)}
                      </div>
                      <div className="mf-helper" style={{ fontStyle: 'italic', marginTop: '2px' }}>
                        {amountInWords(parseFloat(reviewItem.amount))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div className="mf-label">Purpose</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{reviewItem.purpose}</div>
                      </div>
                      <div>
                        <div className="mf-label">Duration & Rate</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                          {reviewItem.duration_months} mo @ {reviewItem.rate}% p.a.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div className="mf-label">Employment Status</div>
                        <div style={{ fontSize: '14px' }}>{reviewItem.employment_status}</div>
                      </div>
                      <div>
                        <div className="mf-label">Annual Income</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                          {formatMoney(reviewItem.annual_income)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mf-label">Applied On</div>
                      <div style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                        {formatDate(reviewItem.applied_on, true)}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="mf-label">Request Type</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        {reviewItem.request_type === 'DEBIT_CARD' ? 'Debit Card' : 'Cheque Book'}
                      </div>
                    </div>

                    {reviewItem.request_type === 'DEBIT_CARD' ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div className="mf-label">Card Network</div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{reviewItem.network || 'Visa'}</div>
                          </div>
                          <div>
                            <div className="mf-label">Name on Card</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', textTransform: 'uppercase' }}>
                              {reviewItem.name_on_card || '—'}
                            </div>
                          </div>
                        </div>

                        {reviewItem.card_number && (
                          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <div className="mf-label">Issued Card Number</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', letterSpacing: '0.1em', fontWeight: 600 }}>
                              {reviewItem.card_number.replace(/(\d{4})/g, '$1 ').trim()}
                            </div>
                            <div className="mf-helper">Expires: {formatDate(reviewItem.card_expiry)}</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <div className="mf-label">Cheque Leaves</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{reviewItem.leaves} leaves</div>
                      </div>
                    )}

                    <div>
                      <div className="mf-label">Delivery Address</div>
                      <div style={{ fontSize: '14px', lineHeight: 1.4, color: 'var(--ink-secondary)' }}>
                        {reviewItem.delivery_address}
                      </div>
                    </div>

                    <div>
                      <div className="mf-label">Requested On</div>
                      <div style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                        {formatDate(reviewItem.requested_on, true)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {(reviewItem.status === 'PENDING' || reviewItem.status === 'REQUESTED') && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <Button
                    variant="danger"
                    full
                    onClick={() => handleInitiateDecision('REJECTED')}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    full
                    onClick={() => handleInitiateDecision('APPROVED')}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </Drawer>

        {/* ─── CONFIRM DECISION MODAL ────────────────────────────────── */}
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title={decision === 'APPROVED' ? 'Approve request' : 'Reject request'}
          actionLabel={decision === 'APPROVED' ? 'Confirm approval' : 'Confirm rejection'}
          actionVariant={decision === 'APPROVED' ? 'primary' : 'danger'}
          onAction={handleExecuteDecision}
          actionLoading={submitting}
        >
          {modalError && <Banner variant="error" style={{ marginBottom: '12px' }}>{modalError}</Banner>}

          <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: '22px', margin: 0 }}>
            {reviewType === 'loan' ? (
              decision === 'APPROVED' ? (
                <>
                  Approve loan <strong>LN-{String(reviewItem?.loan_id).padStart(4, '0')}</strong>?{' '}
                  <strong>{formatMoney(reviewItem?.amount)}</strong> will be credited directly to account{' '}
                  <strong>{reviewItem?.account_number}</strong>.
                </>
              ) : (
                <>
                  Reject loan <strong>LN-{String(reviewItem?.loan_id).padStart(4, '0')}</strong>?{' '}
                  The customer will be notified that the application was declined.
                </>
              )
            ) : (
              decision === 'APPROVED' ? (
                <>
                  Approve service request <strong>SR-{String(reviewItem?.request_id).padStart(4, '0')}</strong>?{' '}
                  {reviewItem?.request_type === 'DEBIT_CARD'
                    ? 'A 16-digit demo card number will be generated and issued.'
                    : 'The cheque book will be dispatched to the delivery address.'}
                </>
              ) : (
                <>
                  Reject service request <strong>SR-{String(reviewItem?.request_id).padStart(4, '0')}</strong>?
                </>
              )
            )}
          </p>
        </Modal>
      </div>
    </AppShell>
  );
}

export default StaffApprovals;

