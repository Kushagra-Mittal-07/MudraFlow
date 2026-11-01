// =============================================================================
// MudraFlow: Database Seed Script
// File: db/seed/seed.js
//
// Seeds the initial demo data per spec/03-database.md §8:
// - 3 Branches (Rohini, Dwarka, Noida)
// - 2 Employees (EMP001 Manager, EMP002 Clerk) with bcrypt password Demo@123
// - 5 Customers seeded strictly via sp_register_customer (balances via procedure)
// - 1 Second account for Riya via sp_open_account
// - 9 Transfers between accounts via sp_transfer (IMPS, NEFT, RTGS)
// - 1 Fixed Deposit for Rahul via sp_create_fd
// - 1 Pending Loan application for Priya
// - 1 Pending Debit Card request for Neha
// - Saved Beneficiaries for quick transfer demo
// =============================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Kush07',
  database: process.env.DB_NAME || 'mudraflow',
  multipleStatements: true
};

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@123';

async function seed() {
  console.log('Connecting to MySQL database:', DB_CONFIG.database);
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    console.log('Clearing existing data (in dependency order)...');
    await conn.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE audit_log;
      TRUNCATE TABLE service_request;
      TRUNCATE TABLE loan;
      TRUNCATE TABLE fixed_deposit;
      TRUNCATE TABLE beneficiary;
      TRUNCATE TABLE txn;
      TRUNCATE TABLE account;
      TRUNCATE TABLE customer;
      TRUNCATE TABLE employee;
      TRUNCATE TABLE branch;
      SET FOREIGN_KEY_CHECKS = 1;
    `);

    // Reset customer auto-increment start to 10000001
    await conn.query('ALTER TABLE customer AUTO_INCREMENT = 10000001;');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    console.log(`Hashed password generated for demo user: "${DEMO_PASSWORD}"`);

    // -------------------------------------------------------------------------
    // 1. Seed Branches
    // -------------------------------------------------------------------------
    console.log('\n--- Seeding 3 Branches ---');
    await conn.query(`
      INSERT INTO branch (branch_id, branch_name, ifsc, city) VALUES
      (1, 'Rohini Sec-9',  'MUDF0000482', 'Delhi'),
      (2, 'Dwarka Sec-12', 'MUDF0000483', 'Delhi'),
      (3, 'Noida Sec-18',  'MUDF0000484', 'Noida');
    `);
    console.log('Branches seeded: Rohini (MUDF0000482), Dwarka (MUDF0000483), Noida (MUDF0000484)');

    // -------------------------------------------------------------------------
    // 2. Seed Employees
    // -------------------------------------------------------------------------
    console.log('\n--- Seeding 2 Employees ---');
    await conn.query(`
      INSERT INTO employee (emp_id, full_name, role, branch_id, password_hash) VALUES
      ('EMP001', 'Aakash Mehta', 'MANAGER', 1, ?),
      ('EMP002', 'Sunita Rao',   'CLERK',   2, ?);
    `, [passwordHash, passwordHash]);
    console.log('Employees seeded: EMP001 (Manager, Rohini), EMP002 (Clerk, Dwarka)');

    // -------------------------------------------------------------------------
    // 3. Seed Customers via sp_register_customer
    // -------------------------------------------------------------------------
    console.log('\n--- Registering 5 Customers via sp_register_customer ---');
    const customersData = [
      {
        name: 'Riya Sharma',
        dob: '1995-04-12',
        email: 'riya.sharma@example.com',
        phone: '9876543210',
        pan: 'ABCPS1234A',
        address: 'Flat 402, Royal Palms, Rohini Sec-9, Delhi',
        type: 'SAVINGS',
        branchId: 1,
        deposit: 125000.00
      },
      {
        name: 'Priya Verma',
        dob: '1992-08-23',
        email: 'priya.verma@example.com',
        phone: '9876543211',
        pan: 'ABCPS1234B',
        address: 'B-14, Pocket 2, Dwarka Sec-12, Delhi',
        type: 'SAVINGS',
        branchId: 2,
        deposit: 60000.00
      },
      {
        name: 'Rahul Sharma',
        dob: '1988-11-05',
        email: 'rahul.sharma@example.com',
        phone: '9876543212',
        pan: 'ABCPS1234C',
        address: 'C-78, Sector 18, Noida, Uttar Pradesh',
        type: 'CURRENT',
        branchId: 3,
        deposit: 975000.00
      },
      {
        name: 'Neha Singh',
        dob: '2000-01-15',
        email: 'neha.singh@example.com',
        phone: '9876543213',
        pan: 'ABCPS1234D',
        address: 'D-90, Sector 9, Rohini, Delhi',
        type: 'SAVINGS',
        branchId: 1,
        deposit: 15000.00
      },
      {
        name: 'Amit Kumar',
        dob: '1990-06-30',
        email: 'amit.kumar@example.com',
        phone: '9876543214',
        pan: 'ABCPS1234E',
        address: 'E-34, Sector 12, Dwarka, Delhi',
        type: 'CURRENT',
        branchId: 2,
        deposit: 340000.00
      }
    ];

    const customerMap = {};

    for (const c of customersData) {
      await conn.query(`
        CALL sp_register_customer(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @out_cid, @out_acc);
      `, [
        c.name, c.dob, c.email, c.phone, c.pan, c.address,
        passwordHash, c.type, c.branchId, c.deposit
      ]);

      const [rows] = await conn.query('SELECT @out_cid AS customer_id, @out_acc AS account_number;');
      const cid = rows[0].customer_id;
      const accNum = rows[0].account_number;

      // Lookup internal account_id
      const [accRows] = await conn.query('SELECT account_id FROM account WHERE account_number = ?', [accNum]);
      const accId = accRows[0].account_id;

      customerMap[c.name] = {
        customerId: cid,
        accountNumber: accNum,
        accountId: accId,
        branchId: c.branchId
      };

      console.log(`Registered ${c.name}: Cust ID ${cid}, Acc No ${accNum} (ID: ${accId}), Initial ₹${c.deposit.toLocaleString('en-IN')}`);
    }

    // -------------------------------------------------------------------------
    // 4. Second Account for Riya Sharma via sp_open_account
    // -------------------------------------------------------------------------
    console.log('\n--- Opening Second Account for Riya Sharma via sp_open_account ---');
    const riya = customerMap['Riya Sharma'];
    const riyaSecondDeposit = 25000.00;

    await conn.query(`
      CALL sp_open_account(?, 'CURRENT', ?, ?, ?, @out_new_acc_id, @out_new_acc_num);
    `, [riya.customerId, riya.branchId, riya.accountId, riyaSecondDeposit]);

    const [riyaNewRows] = await conn.query('SELECT @out_new_acc_id AS account_id, @out_new_acc_num AS account_number;');
    const riyaSecondAccId = riyaNewRows[0].account_id;
    const riyaSecondAccNum = riyaNewRows[0].account_number;
    customerMap['Riya Sharma (2nd)'] = {
      customerId: riya.customerId,
      accountNumber: riyaSecondAccNum,
      accountId: riyaSecondAccId,
      branchId: riya.branchId
    };
    console.log(`Second Account created for Riya Sharma: Acc No ${riyaSecondAccNum} (ID: ${riyaSecondAccId}), Funded with ₹${riyaSecondDeposit.toLocaleString('en-IN')}`);

    // Lookup IFSC codes for branches
    const [branches] = await conn.query('SELECT branch_id, ifsc FROM branch;');
    const branchIfsc = {};
    for (const b of branches) {
      branchIfsc[b.branch_id] = b.ifsc;
    }

    // -------------------------------------------------------------------------
    // 5. Sample Transfers via sp_transfer (8-10 transfers, IMPS, NEFT, RTGS)
    // -------------------------------------------------------------------------
    console.log('\n--- Executing 9 Transfers via sp_transfer ---');
    const transfers = [
      {
        from: 'Riya Sharma',
        to: 'Priya Verma',
        amount: 5000.00,
        mode: 'IMPS',
        remarks: 'Dinner split'
      },
      {
        from: 'Rahul Sharma',
        to: 'Amit Kumar',
        amount: 250000.00,
        mode: 'RTGS',
        remarks: 'Consulting invoice payment'
      },
      {
        from: 'Amit Kumar',
        to: 'Neha Singh',
        amount: 12000.00,
        mode: 'NEFT',
        remarks: 'Freelance graphic design'
      },
      {
        from: 'Priya Verma',
        to: 'Riya Sharma',
        amount: 2000.00,
        mode: 'IMPS',
        remarks: 'Book repayment'
      },
      {
        from: 'Rahul Sharma',
        to: 'Riya Sharma (2nd)',
        amount: 210000.00,
        mode: 'RTGS',
        remarks: 'Equipment advance payment'
      },
      {
        from: 'Riya Sharma (2nd)',
        to: 'Priya Verma',
        amount: 15000.00,
        mode: 'NEFT',
        remarks: 'Vendor settlement'
      },
      {
        from: 'Amit Kumar',
        to: 'Rahul Sharma',
        amount: 20000.00,
        mode: 'NEFT',
        remarks: 'Office supplies'
      },
      {
        from: 'Neha Singh',
        to: 'Amit Kumar',
        amount: 3000.00,
        mode: 'IMPS',
        remarks: 'Travel reimbursement'
      },
      {
        from: 'Priya Verma',
        to: 'Amit Kumar',
        amount: 4000.00,
        mode: 'IMPS',
        remarks: 'Gift contribution'
      }
    ];

    for (let i = 0; i < transfers.length; i++) {
      const t = transfers[i];
      const sender = customerMap[t.from];
      const receiver = customerMap[t.to];
      const receiverIfsc = branchIfsc[receiver.branchId];

      await conn.query(`
        CALL sp_transfer(?, ?, ?, ?, ?, ?, ?, ?, @out_ref);
      `, [
        sender.customerId,
        sender.accountId,
        receiver.accountNumber,
        receiverIfsc,
        t.to.replace(' (2nd)', ''),
        t.amount,
        t.mode,
        t.remarks
      ]);

      const [refRows] = await conn.query('SELECT @out_ref AS ref_no;');
      console.log(`[${t.mode}] Transfer #${i+1}: ${t.from} -> ${t.to} ₹${t.amount.toLocaleString('en-IN')} (Ref: ${refRows[0].ref_no})`);
    }

    // -------------------------------------------------------------------------
    // 6. Fixed Deposit for Rahul Sharma via sp_create_fd
    // -------------------------------------------------------------------------
    console.log('\n--- Creating Fixed Deposit for Rahul Sharma via sp_create_fd ---');
    const rahul = customerMap['Rahul Sharma'];
    const fdAmount = 100000.00;
    const fdTenure = 12;

    await conn.query(`
      CALL sp_create_fd(?, ?, ?, ?, 'CREDIT', @out_fd_id);
    `, [rahul.customerId, rahul.accountId, fdAmount, fdTenure]);

    const [fdRows] = await conn.query('SELECT @out_fd_id AS fd_id;');
    const [fdDetail] = await conn.query('SELECT * FROM fixed_deposit WHERE fd_id = ?', [fdRows[0].fd_id]);
    console.log(`FD #${fdRows[0].fd_id} created for Rahul Sharma: Principal ₹${fdAmount.toLocaleString('en-IN')}, Tenure ${fdTenure}m, Rate ${fdDetail[0].rate}%, Maturity ₹${fdDetail[0].maturity_amount.toLocaleString('en-IN')}`);

    // -------------------------------------------------------------------------
    // 7. Pending Loan for Priya Verma
    // -------------------------------------------------------------------------
    console.log('\n--- Creating Pending Loan for Priya Verma ---');
    const priya = customerMap['Priya Verma'];
    await conn.query(`
      INSERT INTO loan (customer_id, account_id, amount, purpose, duration_months, rate, employment_status, annual_income, status)
      VALUES (?, ?, 150000.00, 'Home renovation', 24, get_loan_rate(24), 'SALARIED', 900000.00, 'PENDING');
    `, [priya.customerId, priya.accountId]);
    console.log('Pending loan created: Priya Verma, ₹1,50,000 for 24 months @ 11.00%');

    // -------------------------------------------------------------------------
    // 8. Pending Debit Card Request for Neha Singh
    // -------------------------------------------------------------------------
    console.log('\n--- Creating Pending Debit Card Request for Neha Singh ---');
    const neha = customerMap['Neha Singh'];
    await conn.query(`
      INSERT INTO service_request (customer_id, account_id, request_type, name_on_card, network, delivery_address, status)
      VALUES (?, ?, 'DEBIT_CARD', 'NEHA SINGH', 'VISA', 'D-90, Sector 9, Rohini, Delhi', 'REQUESTED');
    `, [neha.customerId, neha.accountId]);
    console.log('Pending debit card request created: Neha Singh (VISA)');

    // -------------------------------------------------------------------------
    // 9. Saved Beneficiaries (Payees)
    // -------------------------------------------------------------------------
    console.log('\n--- Adding Saved Beneficiaries ---');
    await conn.query(`
      INSERT INTO beneficiary (customer_id, name, account_number, ifsc) VALUES
      (?, 'Priya Verma', ?, ?),
      (?, 'Rahul Sharma', ?, ?),
      (?, 'Riya Sharma', ?, ?);
    `, [
      riya.customerId, priya.accountNumber, branchIfsc[priya.branchId],
      priya.customerId, rahul.accountNumber, branchIfsc[rahul.branchId],
      neha.customerId, riya.accountNumber, branchIfsc[riya.branchId]
    ]);
    console.log('Sample beneficiaries added for Riya, Priya, Neha');

    // -------------------------------------------------------------------------
    // 10. Ledger Invariant Check
    // -------------------------------------------------------------------------
    console.log('\n--- Verifying Ledger Invariant (D1) on Seeded Data ---');
    const [discrepancies] = await conn.query(`
      SELECT a.account_id, a.account_number, a.balance,
             COALESCE(c.credits,0) - COALESCE(d.debits,0) AS computed
      FROM account a
      LEFT JOIN (SELECT to_account_id id, SUM(amount) credits FROM txn
                 WHERE to_account_id IS NOT NULL GROUP BY to_account_id) c ON c.id = a.account_id
      LEFT JOIN (SELECT from_account_id id, SUM(amount) debits FROM txn
                 WHERE from_account_id IS NOT NULL GROUP BY from_account_id) d ON d.id = a.account_id
      WHERE a.balance <> COALESCE(c.credits,0) - COALESCE(d.debits,0);
    `);

    if (discrepancies.length === 0) {
      console.log('SUCCESS: Ledger invariant holds across all accounts! 0 discrepancies found.');
    } else {
      console.error('ERROR: Ledger discrepancy detected:', discrepancies);
      process.exit(1);
    }

    // Display summary of accounts
    console.log('\n--- Final Accounts Summary ---');
    const [summary] = await conn.query(`
      SELECT a.account_id, a.account_number, c.full_name, a.account_type, a.balance, a.status, b.branch_name
      FROM account a
      JOIN customer c ON a.customer_id = c.customer_id
      JOIN branch b ON a.branch_id = b.branch_id
      ORDER BY a.account_id;
    `);
    console.table(summary);

    console.log('\nDatabase seeding completed successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();

