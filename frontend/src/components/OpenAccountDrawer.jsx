import React, { useState, useEffect } from 'react';
import { useActiveAccount } from '../context/ActiveAccountContext';
import { apiRequest } from '../lib/api';
import { formatMoney, formatDate } from '../lib/format';
import { amountInWords } from '../lib/amountInWords';
import Drawer from './Drawer';
import RadioTiles from './RadioTiles';
import Field from './Field';
import Button from './Button';
import Slip from './Slip';
import Banner from './Banner';

export function OpenAccountDrawer({ isOpen, onClose, onSuccess }) {
  const { accounts, activeAccount, switchAccount, refreshAccounts } = useActiveAccount();

  const [accountType, setAccountType] = useState('CURRENT');
  const [branchId, setBranchId] = useState('1');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [amount, setAmount] = useState('2000');
  const [password, setPassword] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Fetch branches
  useEffect(() => {
    apiRequest('/branches')
      .then(res => {
        if (res.ok && Array.isArray(res.data)) {
          setBranches(res.data);
          if (res.data.length > 0) setBranchId(String(res.data[0].branch_id));
        }
      })
      .catch(console.error);
  }, []);

  // Set default funding account
  useEffect(() => {
    if (activeAccount?.account_id) {
      setFundingAccountId(String(activeAccount.account_id));
    } else if (accounts.length > 0) {
      setFundingAccountId(String(accounts[0].account_id));
    }
  }, [activeAccount, accounts]);

  const prevOpenRef = React.useRef(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setError('');
      setPassword('');
      setSuccessReceipt(null);
      if (activeAccount?.account_id) {
        setFundingAccountId(String(activeAccount.account_id));
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, activeAccount]);

  const selectedFundingAcc = accounts.find(a => String(a.account_id) === String(fundingAccountId)) || activeAccount;
  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (!fundingAccountId) {
      setError('Please choose a funding account');
      return;
    }
    if (numAmount < 1000) {
      setError('Minimum opening deposit is ₹1,000.00');
      return;
    }
    if (selectedFundingAcc && numAmount > parseFloat(selectedFundingAcc.balance)) {
      setError('Insufficient balance in selected funding account');
      return;
    }
    if (!password) {
      setError('Please enter your password to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/accounts', {
        method: 'POST',
        body: {
          account_type: accountType,
          branch_id: parseInt(branchId),
          from_account_id: parseInt(fundingAccountId),
          amount: numAmount,
          password
        }
      });

      if (res.ok && res.data) {
        const branchObj = branches.find(b => String(b.branch_id) === String(branchId));
        setSuccessReceipt({
          ...res.data,
          branch_name: branchObj?.branch_name || 'Main Branch',
          ifsc: branchObj?.ifsc || 'MUDR0000001'
        });
      } else {
        setError(res.message || 'Failed to open account');
      }
    } catch (err) {
      setError(err.message || 'Failed to open account');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = async () => {
    const receipt = successReceipt;
    setSuccessReceipt(null);
    onClose();
    if (receipt?.account_id) {
      await refreshAccounts();
      switchAccount(receipt.account_id);
    }
    if (onSuccess) onSuccess(receipt);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Open another account"
      primaryLabel={successReceipt ? null : 'Open Account'}
      onPrimary={handleSubmit}
      primaryLoading={loading}
    >
      {error && <Banner variant="error" style={{ marginBottom: '16px' }}>{error}</Banner>}

      {successReceipt ? (
        <div>
          <Slip
            title="Account Opened"
            subtitle="Your new account is active and funded."
            stamp={{ text: 'ACCOUNT OPENED', variant: 'green' }}
            rows={[
              { label: 'New account number', value: successReceipt.account_number },
              { label: 'Classification', value: successReceipt.account_type },
              { label: 'Branch', value: successReceipt.branch_name },
              { label: 'IFSC', value: successReceipt.ifsc },
              { label: 'Opening balance', value: formatMoney(successReceipt.balance) },
              { label: 'Date', value: formatDate(new Date()) }
            ]}
          >
            <div style={{ marginTop: '24px' }}>
              <Button variant="primary" full onClick={handleDone}>
                Done →
              </Button>
            </div>
          </Slip>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span className="mf-label" style={{ marginBottom: '6px' }}>Account Classification</span>
            <RadioTiles
              value={accountType}
              onChange={setAccountType}
              options={[
                { value: 'SAVINGS', title: 'Savings', caption: 'Everyday personal ledger' },
                { value: 'CURRENT', title: 'Current', caption: 'Business commercial use' }
              ]}
            />
          </div>

          <Field
            label="Branch"
            type="select"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={branches.map(b => ({
              value: String(b.branch_id),
              label: `${b.branch_name} · ${b.ifsc}`
            }))}
          />

          <Field
            label="Funding Account"
            type="select"
            value={fundingAccountId}
            onChange={(e) => setFundingAccountId(e.target.value)}
            options={accounts.map(a => ({
              value: String(a.account_id),
              label: `${a.account_type} (${a.account_number_masked}) — Bal: ${formatMoney(a.balance)}`
            }))}
          />

          <div>
            <Field
              label="Opening Deposit"
              type="number"
              mono
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              helper="Minimum ₹1,000.00"
              placeholder="2000"
              required
            />
            {numAmount > 0 && (
              <div className="mf-helper" style={{ fontStyle: 'italic', marginTop: '4px', color: 'var(--green-900)' }}>
                {amountInWords(numAmount)}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: '13px',
              color: 'var(--ink-2)',
              padding: '12px',
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              lineHeight: '1.4'
            }}
          >
            ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} will move from{' '}
            <strong>{selectedFundingAcc?.account_number_masked || 'funding account'}</strong> to the new account in one atomic transaction.
          </div>

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
    </Drawer>
  );
}

export default OpenAccountDrawer;
