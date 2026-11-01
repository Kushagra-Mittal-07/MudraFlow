import React, { useState } from 'react';
import {
  Button,
  Chip,
  Field,
  Segmented,
  RadioTiles,
  Stamp,
  Tag,
  Money,
  MaskedValue,
  LedgerTable,
  Slip,
  Stat,
  StatStrip,
  Drawer,
  Modal,
  Banner,
  EmptyState,
  Skeleton,
  Pagination,
  SplitView
} from '../components';

export function Styleguide() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [amountVal, setAmountVal] = useState('124500.75');
  const [segVal, setSegVal] = useState('IMPS');
  const [radioVal, setRadioVal] = useState('12');
  const [splitSelected, setSplitSelected] = useState(1);
  const [page, setPage] = useState(2);

  // Sample ledger data
  const sampleTransactions = [
    {
      id: 1,
      date: new Date(2026, 9, 20),
      description: 'Transfer to ••••0004 · Property advance',
      debit: 110000,
      credit: null,
      balance: 370000,
      receiptLink: '#receipt-1'
    },
    {
      id: 2,
      date: new Date(2026, 9, 18),
      description: 'Loan credited · LN-0001',
      debit: null,
      credit: 480000,
      balance: 480000,
      receiptLink: '#receipt-2'
    },
    {
      id: 3,
      date: new Date(2026, 9, 15),
      description: 'Transfer from ••••0002 · Salary',
      debit: null,
      credit: 25000,
      balance: 25000,
      receiptLink: '#receipt-3'
    },
    {
      id: 4,
      date: new Date(2026, 9, 1),
      description: 'Opening deposit',
      debit: null,
      credit: 5000,
      balance: 5000,
      receiptLink: '#receipt-4'
    }
  ];

  // Sample SplitView items
  const sampleCustomers = [
    { id: 1, name: 'Riya Sharma', custId: '10000001', accounts: 2, balance: '₹4,75,000.00', email: 'riya.sharma@example.com' },
    { id: 2, name: 'Priya Verma', custId: '10000002', accounts: 1, balance: '₹85,000.00', email: 'priya.verma@example.com' },
    { id: 3, name: 'Amit Patel', custId: '10000003', accounts: 3, balance: '₹12,40,000.00', email: 'amit.patel@example.com' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', backgroundColor: 'var(--page)' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', borderBottom: '1px solid var(--line-strong)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="mf-label">MudraFlow Design System</span>
          <Tag status="ACTIVE">The Passbook</Tag>
          <Tag status="STAFF">Tokens V1</Tag>
        </div>
        <h1 style={{ fontSize: '40px', marginTop: '8px', color: 'var(--ink)' }}>
          Shared Component Styleguide
        </h1>
        <p className="mf-helper" style={{ fontSize: '15px', marginTop: '6px' }}>
          Exact verification of palette, three-voice typography, 0-2px radii, hairline borders, stamps, and slip edges.
        </p>
      </div>

      {/* 1. Color Palette Tokens */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>1. Design Tokens & Palette</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          {[
            { name: '--green-950', val: '#16382A', text: '#FFF' },
            { name: '--green-900', val: '#1F4D3A', text: '#FFF' },
            { name: '--green-700', val: '#2F6B50', text: '#FFF' },
            { name: '--green-100', val: '#DDE9E1', text: '#121512' },
            { name: '--page', val: '#F1F6F2', text: '#121512', border: true },
            { name: '--paper', val: '#FFFFFF', text: '#121512', border: true },
            { name: '--paper-2', val: '#E9EFEA', text: '#121512', border: true },
            { name: '--debit', val: '#B3261E', text: '#FFF' },
            { name: '--credit', val: '#17613F', text: '#FFF' },
            { name: '--amber', val: '#7A5A08', text: '#FFF' },
            { name: '--gold', val: '#C9A227', text: '#121512' }
          ].map((c) => (
            <div
              key={c.name}
              style={{
                backgroundColor: c.val,
                color: c.text,
                padding: '12px 10px',
                border: c.border ? '1px solid var(--line-strong)' : 'none',
                borderRadius: '2px'
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', opacity: 0.85, marginTop: '4px' }}>{c.val}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Typography Scale */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>2. Three-Voice Typography</h2>
        <div className="mf-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="mf-label">Playfair Display 700 · Hero / Title</span>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 700, color: 'var(--ink)' }}>
                A bank that keeps its books where you can see them.
              </div>
            </div>
            <div>
              <span className="mf-label">Playfair Display 600 · Panel Title</span>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 600, color: 'var(--ink)' }}>
                Account Summary · Savings 5001000001
              </div>
            </div>
            <div>
              <span className="mf-label">Playfair + JetBrains Mono · Big Balance</span>
              <div className="mf-money-big">
                <span className="mf-money-big-rupees">₹4,75,000</span>
                <span className="mf-money-big-paise">.00</span>
              </div>
            </div>
            <div>
              <span className="mf-label">Inter 400 · Body & Instructions</span>
              <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: '22px', maxWidth: '680px' }}>
                Every transfer is a single all-or-nothing database transaction. Rows are locked while money moves,
                so two transfers cannot overspend one account.
              </p>
            </div>
            <div>
              <span className="mf-label">JetBrains Mono 500 · Figures & Big IDs</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 600, color: 'var(--green-950)' }}>
                10000001
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Buttons & Chips */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>3. Buttons & Chips</h2>
        <div className="mf-panel">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <Button variant="primary">Primary Action</Button>
            <Button variant="primary" arrow>Transfer Money</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="danger">Danger Outline</Button>
            <Button variant="danger-solid">Freeze Account</Button>
            <Button variant="primary" loading>Loading State</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="link">Print statement →</Button>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <span className="mf-label" style={{ marginBottom: '8px' }}>Chips (Show, Hide, View, Copy)</span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip>SHOW</Chip>
              <Chip active>HIDE</Chip>
              <Chip>VIEW</Chip>
              <Chip>COPY</Chip>
              <Chip disabled>DISABLED</Chip>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Form Fields */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>4. Form Fields & Inputs</h2>
        <div className="mf-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <Field
              label="Customer ID (Mono)"
              mono
              placeholder="10000001"
              helper="8-digit Customer ID"
            />
            <Field
              label="Password (with Show/Hide)"
              type="password"
              placeholder="Enter password"
              helper="At least 8 characters"
            />
            <Field
              label="Amount with live words"
              type="amount"
              value={amountVal}
              onChange={(e) => setAmountVal(e.target.value)}
              placeholder="0.00"
            />
            <Field
              label="Field with Error"
              value="InvalidValue"
              error="Account number must be 10 digits"
            />
            <Field
              label="OTP Verification"
              type="otp"
              placeholder="123456"
            />
            <Field
              label="Branch Select"
              type="select"
              options={[
                { value: '1', label: 'Rohini Sec-9 · MUDF0000482' },
                { value: '2', label: 'Connaught Place · MUDF0000483' },
                { value: '3', label: 'Hauz Khas · MUDF0000484' }
              ]}
            />
          </div>
        </div>
      </section>

      {/* 5. Segmented & Radio Tiles */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>5. Segmented & Radio Tiles</h2>
        <div className="mf-panel">
          <div style={{ marginBottom: '24px' }}>
            <span className="mf-label" style={{ marginBottom: '8px' }}>Segmented Control (Transfer Mode)</span>
            <Segmented
              value={segVal}
              onChange={setSegVal}
              options={[
                { value: 'IMPS', label: 'IMPS (Instant)' },
                { value: 'NEFT', label: 'NEFT (Standard)' },
                { value: 'RTGS', label: 'RTGS (Min ₹2L)' },
                { value: 'UPI', label: 'UPI (Disabled)', disabled: true, caption: 'Not supported' }
              ]}
            />
          </div>

          <div>
            <span className="mf-label" style={{ marginBottom: '8px' }}>Radio Tiles (Tenure with Rate Caption)</span>
            <RadioTiles
              value={radioVal}
              onChange={setRadioVal}
              options={[
                { value: '6', title: '6 months', caption: '6.50% p.a.' },
                { value: '12', title: '1 year', caption: '7.00% p.a.' },
                { value: '24', title: '2 years', caption: '7.25% p.a.' },
                { value: '36', title: '3 years', caption: '7.50% p.a.' },
                { value: '60', title: '5 years', caption: '7.75% p.a. (Special)', disabled: false }
              ]}
            />
          </div>
        </div>
      </section>

      {/* 6. Stamps & Status Tags */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>6. Rubber Stamps & Status Tags</h2>
        <div className="mf-panel">
          <span className="mf-label" style={{ marginBottom: '12px' }}>Rubber Stamps (Rotated -2.5°, Monospace, Bordered)</span>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
            <Stamp variant="green">PAID</Stamp>
            <Stamp variant="green">ACCOUNT OPENED</Stamp>
            <Stamp variant="green">LOCKED</Stamp>
            <Stamp variant="amber">PENDING</Stamp>
            <Stamp variant="debit">REJECTED</Stamp>
            <Stamp variant="debit">FROZEN</Stamp>
            <Stamp variant="ink">MATURED</Stamp>
          </div>

          <span className="mf-label" style={{ marginBottom: '12px' }}>Flat Status Tags (Tables & Lists)</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag status="PENDING" />
            <Tag status="REQUESTED" />
            <Tag status="ACTIVE" />
            <Tag status="APPROVED" />
            <Tag status="PAID" />
            <Tag status="LOCKED" />
            <Tag status="REJECTED" />
            <Tag status="FROZEN" />
            <Tag status="MATURED" />
            <Tag status="STAFF" />
          </div>
        </div>
      </section>

      {/* 7. Money & Masked Value */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>7. Money & Masked Value</h2>
        <div className="mf-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div>
              <span className="mf-label">Masked Account Number</span>
              <MaskedValue
                type="account"
                value="5001000001"
                fullValue="5001000001"
                large
              />
            </div>
            <div>
              <MaskedValue
                type="balance"
                label="AVAILABLE BALANCE"
                value={475000}
                fullValue={475000}
              />
            </div>
            <div>
              <span className="mf-label">Table Money Formats</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <div>Debit: <Money value={110000} type="debit" /></div>
                <div>Credit: <Money value={480000} type="credit" /></div>
                <div>Neutral: <Money value={370000} type="neutral" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Ledger Table */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>8. Signature Ledger Table</h2>
        <div className="mf-panel" style={{ padding: 0 }}>
          <LedgerTable
            entries={sampleTransactions}
            footer={
              <Pagination
                currentPage={page}
                totalPages={7}
                onPageChange={setPage}
              />
            }
          />
        </div>
      </section>

      {/* 9. Paper Slip with Zigzag Edge */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>9. Paper Slip (Torn Zigzag Edge)</h2>
        <Slip
          title="Transaction receipt"
          subtitle="Reference MF20261020000123 · 20 Oct 2026, 14:32 IST"
          stamp={{ text: 'PAID', variant: 'green' }}
          rows={[
            { label: 'Transfer Type', value: 'IMPS' },
            { label: 'From Account', value: 'Savings ••••0001' },
            { label: 'To Beneficiary', value: 'Rahul Sharma (••••0004)', mono: false },
            { label: 'Beneficiary IFSC', value: 'MUDF0000483' },
            { label: 'Amount Paid', value: '₹25,000.00' },
            { label: 'Amount in Words', value: 'Twenty-five thousand rupees only', mono: false },
            { label: 'Remarks', value: 'College project advance', mono: false },
            { label: 'Status', value: 'SUCCESSFUL' }
          ]}
        >
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <Button variant="secondary" style={{ flex: 1 }}>Print Slip</Button>
            <Button variant="primary" style={{ flex: 1 }}>Make Another Transfer</Button>
          </div>
        </Slip>
      </section>

      {/* 10. Stat Strip */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>10. Stat Strip</h2>
        <StatStrip>
          <Stat label="TOTAL CUSTOMERS" value="1,420" caption="+12 this month" />
          <Stat label="ACTIVE ACCOUNTS" value="2,845" caption="Across 4 branches" />
          <Stat label="TOTAL BALANCE" value="₹4.82 Cr" caption="INR in deposit" />
          <Stat label="TRANSACTIONS TODAY" value="184" monoValue caption="100% atomic" />
          <Stat label="PENDING APPROVALS" value="3" caption="2 loans, 1 card" />
        </StatStrip>
      </section>

      {/* 11. Banners, Empty State & Skeleton */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>11. Banners, Empty State & Skeleton</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Banner variant="success">
            <strong>Success:</strong> Transfer of ₹25,000.00 completed successfully. Reference MF20261020000123.
          </Banner>
          <Banner variant="warning">
            <strong>Notice:</strong> This account has a pending debit card application under review.
          </Banner>
          <Banner
            variant="error"
            action={<Button variant="secondary" style={{ height: '32px', padding: '0 12px', fontSize: '13px' }}>Try again</Button>}
          >
            <strong>Error:</strong> Insufficient balance. Available balance is ₹12,450.00.
          </Banner>

          <EmptyState
            title="No fixed deposits yet"
            description="Lock money in a fixed deposit with the exact maturity amount shown up front."
            action={<Button variant="primary">Open New Deposit</Button>}
          />

          <div className="mf-panel">
            <span className="mf-label" style={{ marginBottom: '12px' }}>Table Skeleton (1.2s Pulse)</span>
            <Skeleton type="table" rows={3} />
          </div>
        </div>
      </section>

      {/* 12. SplitView (Master-Detail) */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>12. SplitView (Staff Master-Detail)</h2>
        <SplitView
          items={sampleCustomers}
          selectedId={splitSelected}
          onSelect={setSplitSelected}
          renderItem={(cust, isSelected) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{cust.name}</strong>
                <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{cust.custId}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
                {cust.accounts} account(s) · {cust.balance}
              </div>
            </div>
          )}
          renderDetail={(cust) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', color: 'var(--ink)' }}>{cust.name}</h3>
                  <p className="tabular-nums" style={{ color: 'var(--ink-2)', fontSize: '14px', marginTop: '2px' }}>
                    Customer ID: {cust.custId} · {cust.email}
                  </p>
                </div>
                <Tag status="ACTIVE">Verified</Tag>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <span className="mf-label" style={{ marginBottom: '8px' }}>Associated Accounts</span>
                <table className="mf-ledger-table mf-ledger-dense">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Type</th>
                      <th className="mf-text-right">Balance</th>
                      <th className="mf-text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="tabular-nums">5001000001</td>
                      <td>SAVINGS</td>
                      <td className="mf-text-right tabular-nums">{cust.balance}</td>
                      <td className="mf-text-right">
                        <Button variant="danger" style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}>Freeze</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        />
      </section>

      {/* 13. Drawer and Modal Triggers */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>13. Overlays (Drawer & Modal)</h2>
        <div className="mf-panel">
          <div style={{ display: 'flex', gap: '16px' }}>
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Open Drawer (e.g. Add Payee)
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open Confirmation Modal
            </Button>
          </div>
        </div>
      </section>

      {/* Drawer instance */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add new beneficiary"
        primaryLabel="Save Beneficiary"
        onPrimary={() => setDrawerOpen(false)}
      >
        <Field label="Beneficiary Name" placeholder="e.g. Rahul Sharma" />
        <Field label="Account Number" mono placeholder="5001000004" />
        <Field label="IFSC Code" mono placeholder="MUDF0000483" />
        <Field label="Confirm with Password" type="password" placeholder="Demo@123" />
      </Drawer>

      {/* Modal instance */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Transfer"
        actionLabel="Pay ₹25,000.00"
        onAction={() => setModalOpen(false)}
      >
        <p style={{ marginBottom: '16px' }}>
          Pay ₹25,000.00 to Rahul Sharma (••••0004) by IMPS.
        </p>
        <Field label="Confirm Password" type="password" placeholder="Enter password" />
        <Field label="One-Time Password (OTP)" type="otp" placeholder="123456" />
      </Modal>
    </div>
  );
}

export default Styleguide;

