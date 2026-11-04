import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { maskAccountNumber, formatDate } from '../../lib/format';
import AppShell from '../../components/AppShell';
import Button from '../../components/Button';
import Drawer from '../../components/Drawer';
import Field from '../../components/Field';
import Banner from '../../components/Banner';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';

export function Payees() {
  const navigate = useNavigate();

  const [payees, setPayees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Payee Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [password, setPassword] = useState('');

  // Verification state inside drawer
  const [verifying, setVerifying] = useState(false);
  const [verifiedInfo, setVerifiedInfo] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // Submission state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadPayees = () => {
    setLoading(true);
    apiRequest('/beneficiaries')
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          setPayees(res.data);
        } else {
          setError(res.message || 'Failed to load payees');
        }
      })
      .catch(err => setError(err.message || 'Network error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayees();
  }, []);

  const handleOpenDrawer = () => {
    setName('');
    setAccountNumber('');
    setIfsc('');
    setPassword('');
    setVerifiedInfo(null);
    setVerifyError('');
    setSaveError('');
    setDrawerOpen(true);
  };

  const handleVerify = async () => {
    if (!accountNumber || !ifsc) {
      setVerifyError('Account number and IFSC are required to verify');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    setVerifiedInfo(null);

    try {
      const res = await apiRequest('/beneficiaries/verify', {
        method: 'POST',
        body: { account_number: accountNumber.trim(), ifsc: ifsc.trim().toUpperCase() }
      });

      if (res.ok && res.data) {
        setVerifiedInfo(res.data);
        if (!name && res.data.full_name) {
          setName(res.data.full_name);
        }
      } else {
        setVerifyError(res.message || 'Receiver account or IFSC not found.');
      }
    } catch (err) {
      setVerifyError(err.message || 'Receiver account or IFSC not found.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSavePayee = async () => {
    if (!name || !accountNumber || !ifsc) {
      setSaveError('All payee details are required');
      return;
    }
    if (!password) {
      setSaveError('Please enter your password to confirm');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const res = await apiRequest('/beneficiaries', {
        method: 'POST',
        body: {
          name: name.trim(),
          account_number: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          password
        }
      });

      if (res.ok) {
        setDrawerOpen(false);
        loadPayees();
      } else {
        setSaveError(res.message || 'Failed to save payee');
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save payee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Saved Payees">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {error && <Banner variant="error" style={{ marginBottom: '20px' }}>{error}</Banner>}

        <div className="mf-panel">
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--line)'
            }}
          >
            <div>
              <h2 style={{ fontSize: '24px', margin: 0 }}>Saved payees</h2>
              <p className="mf-helper" style={{ margin: '4px 0 0' }}>
                Verified beneficiaries eligible for instant IMPS, NEFT and RTGS transfers.
              </p>
            </div>
            <Button variant="primary" onClick={handleOpenDrawer}>
              <UserPlus size={16} /> Add payee
            </Button>
          </div>

          {/* Payees Table or Empty State */}
          {loading ? (
            <div style={{ padding: '24px 0' }}>
              <Skeleton height="40px" width="100%" count={4} style={{ marginBottom: '12px' }} />
            </div>
          ) : payees.length === 0 ? (
            <EmptyState
              title="No payees yet."
              description="Add one to pay in a tap."
              actionLabel="Add payee"
              onAction={handleOpenDrawer}
            />
          ) : (
            <div className="mf-table-container">
              <table className="mf-ledger-table">
                <thead>
                  <tr>
                    <th scope="col">NAME</th>
                    <th scope="col">ACCOUNT</th>
                    <th scope="col">IFSC</th>
                    <th scope="col">ADDED ON</th>
                    <th scope="col" className="mf-text-right" style={{ width: '100px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {payees.map(p => (
                    <tr key={p.beneficiary_id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="mf-mono">{p.account_number}</td>
                      <td className="mf-mono">{p.ifsc}</td>
                      <td className="mf-mono">{formatDate(p.added_on)}</td>
                      <td className="mf-text-right">
                        <Link
                          to={`/app/transfer?payee=${p.beneficiary_id}`}
                          className="mf-btn-link"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        >
                          Pay <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Payee Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add new payee"
        primaryLabel={verifiedInfo ? 'Save payee' : 'Verify details first'}
        onPrimary={verifiedInfo ? handleSavePayee : handleVerify}
        primaryLoading={saving || verifying}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p className="mf-helper">
            Every payee is verified against MudraFlow branch records before saving.
          </p>

          {verifyError && <Banner variant="error">{verifyError}</Banner>}
          {saveError && <Banner variant="error">{saveError}</Banner>}

          {verifiedInfo && (
            <Banner variant="success">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>
                  Account found at <strong>{verifiedInfo.branch_name}</strong> ({verifiedInfo.ifsc}).
                </span>
              </div>
            </Banner>
          )}

          <Field
            label="Receiver Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Verma"
            required
          />

          <Field
            label="Account Number (10 digits)"
            mono
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value);
              setVerifiedInfo(null);
            }}
            placeholder="e.g. 5001000002"
            required
          />

          <Field
            label="IFSC Code"
            mono
            value={ifsc}
            onChange={(e) => {
              setIfsc(e.target.value.toUpperCase());
              setVerifiedInfo(null);
            }}
            placeholder="e.g. MUDF0000483"
            required
          />

          {!verifiedInfo && (
            <Button
              variant="secondary"
              onClick={handleVerify}
              loading={verifying}
              style={{ marginTop: '8px' }}
            >
              Verify account details
            </Button>
          )}

          {verifiedInfo && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <span className="mf-label" style={{ marginBottom: '8px' }}>AUTHORIZATION</span>
              <Field
                label="Confirm with your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          )}
        </div>
      </Drawer>
    </AppShell>
  );
}

export default Payees;

