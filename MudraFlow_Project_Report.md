# NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY, DELHI
### Department of Computer Science and Artificial Intelligence

---

# A Project Report on
# **MUDRAFLOW**
### Online Banking Transaction System

#### *A Database Management Systems Project Report*

**Submitted by:**
- **Kushagra Mittal** — Roll No. 2025UCA1878
- **Yashwani Jain** — Roll No. 2025UCA1804
- **Neil Kumar Singh** — Roll No. 2025UCA1852
- **Abhishek Roy** — Roll No. 2025UCA1862

**Class:** CSAI, Second Year  
**Academic Session:** 2026–27  
**Live Application URL:** [https://mudra-flow.vercel.app/](https://mudra-flow.vercel.app/)  
**GitHub Repository:** [https://github.com/Kushagra-Mittal-07/MudraFlow](https://github.com/Kushagra-Mittal-07/MudraFlow)

---

## ABSTRACT

MudraFlow is a full-featured relational database banking management system designed to enforce core transactional integrity, mathematical normalization, and strict access governance directly within the database tier. Traditional application-centric software architectures frequently suffer from concurrency anomalies, including lost updates, dirty reads, and double spending under high load due to reliance on non-atomic application-level balance updates. MudraFlow eliminates these vulnerabilities by encapsulating all financial modifications within ACID-compliant MySQL 8 stored procedures utilizing pessimistic row-level locking (`SELECT ... FOR UPDATE`) ordered strictly by primary key to prevent deadlocks. 

The underlying schema comprises ten entities mapped into relational tables decomposed into Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF). This report provides the complete formal database engineering lifecycle prescribed for academic evaluation: comprehensive requirements analysis, extended Entity-Relationship (ER) modeling, algorithmic ER-to-relational schema mapping, rigorous functional dependency analysis, step-by-step normalization through BCNF, mathematical proofs of lossless join decomposition, verification of dependency preservation, and canonical minimal cover derivations. Automated audit trails via triggers, column-level security privileges, and performance indexing round out the implementation, demonstrating an enterprise-grade core banking architecture.

---

## INDEX

| S. NO. | TOPIC | PAGE NO. |
| :---: | :--- | :---: |
| — | **Title Page & Candidate Details** | 1 |
| — | **Abstract & Index** | 2 |
| **1.** | **Project Description** | 3 |
| | 1.1 Overview and System Motivation | 3 |
| | 1.2 Objectives | 3 |
| | 1.3 Problem Statement & Banking Invariants | 4 |
| | 1.4 Business Rules & Operational Constraints | 4 |
| | 1.5 System Architecture | 5 |
| **2.** | **Requirement Analysis** | 6 |
| | 2.1 Functional Requirements | 6 |
| | 2.2 Non-Functional Requirements | 7 |
| | 2.3 Hardware and Software Environment | 8 |
| **3.** | **ER Model** | 9 |
| | 3.1 Entity Identification and Attribute Classification | 9 |
| | 3.2 Relationships, Cardinality Ratios, and Participation Constraints | 10 |
| | 3.3 Complete Entity-Relationship Diagram | 11 |
| **4.** | **ER to Relational Schema** | 12 |
| | 4.1 Relational Mapping Methodology | 12 |
| | 4.2 Tabular Relational Schema Definitions | 13 |
| | 4.3 Referential Integrity & Constraint Specifications | 14 |
| **5.** | **Normalization Steps till BCNF** | 15 |
| | 5.1 Theoretical Background & Normal Form Criteria | 15 |
| | 5.2 Step-by-Step Normalization for Core Banking Transaction Schema | 16 |
| | 5.3 Step-by-Step Normalization for Fixed Deposit / Loan Schema | 18 |
| | 5.4 Summary of Final BCNF Status for All Remaining Relations | 19 |
| **6.** | **Lossless Decomposition Proof** | 20 |
| | 6.1 Theorem and Necessary Conditions for Lossless Joins | 20 |
| | 6.2 Formal Algebraic Proofs for Core Decompositions | 20 |
| | 6.3 Matrix / Tableau Verification Method | 21 |
| | 6.4 Verification Summary for Remaining Database Schemas | 22 |
| **7.** | **Dependency Preserving Steps** | 23 |
| | 7.1 Formal Definition of Dependency Preservation | 23 |
| | 7.2 Verification Algorithm and Projection Analysis | 23 |
| | 7.3 Step-by-Step Dependency Preservation for Core Decompositions | 24 |
| | 7.4 Global Dependency Preservation Assessment | 25 |
| **8.** | **Minimal Cover of Each Table** | 26 |
| | 8.1 Algorithm for Canonical / Minimal Cover Derivation | 26 |
| | 8.2 Detailed Minimal Cover Derivation: `customer` Relation | 26 |
| | 8.3 Detailed Minimal Cover Derivation: `account` Relation | 27 |
| | 8.4 Detailed Minimal Cover Derivation: `branch` Relation | 28 |
| | 8.5 Minimal Covers for Remaining Relations | 28 |
| **9.** | **Implementation & Advanced Database Objects** | 30 |
| | 9.1 Stored Procedures for Atomic Transactions | 30 |
| | 9.2 Stored Functions, Triggers, Views & Indexing | 31 |
| | 9.3 Column-Level Access Control & Privileges | 32 |
| **10.** | **Results & System Verification** | 33 |
| | 10.1 UI Verification and Transaction Execution | 33 |
| | 10.2 Concurrency & Stress Verification Tests | 34 |
| **11.** | **Conclusion, Limitations & Future Scope** | 35 |
| | 11.1 Conclusion | 35 |
| | 11.2 Limitations | 35 |
| | 11.3 Future Scope | 35 |

---

# 1. PROJECT DESCRIPTION

### 1.1 Overview and System Motivation
MudraFlow is an online core banking management system engineered with a database-centric philosophy. In contemporary commercial applications, application frameworks and microservices frequently attempt to manage transactional states in volatile memory, treating relational databases as passive storage repositories. This architectural flaw leaves systems vulnerable to lost updates, phantom reads, and balance corruption during high-concurrency race conditions. 

MudraFlow is designed to prove that the relational database engine itself (MySQL 8 InnoDB) should serve as the primary transactional authority. The system incorporates customer self-service facilities (account registration, internal fund transfers across branches via IMPS, NEFT, and RTGS, fixed deposit creation, and loan applications) alongside staff back-office administration (loan approvals, KYC verification, account freezing, and automated fixed deposit maturity settlement).

The operational deployment of MudraFlow is live at **https://mudra-flow.vercel.app/**, with the complete database scripts and source code maintained at **https://github.com/Kushagra-Mittal-07/MudraFlow**.

### 1.2 Objectives
The primary academic and technical objectives of the MudraFlow project comprise:
1. **Relational Data Modeling:** Formulate an enterprise-grade conceptual schema capturing complex banking relationships with explicit cardinality and participation constraints.
2. **Schema Normalization:** Eliminate update, insertion, and deletion anomalies by systematically decomposing relations to Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF).
3. **Formal Mathematical Verification:** Provide formal algebraic proofs validating that all schema decompositions are strictly lossless and preserve all declared functional dependencies.
4. **Minimal Cover Derivation:** Calculate canonical covers for all functional dependency sets to optimize storage layout and indexing structures.
5. **ACID Transactional Guarantees:** Ensure that every debit, credit, opening deposit, and interest disbursement occurs as an indivisible atomic unit inside stored procedures.
6. **Concurrency Control:** Implement deterministic pessimistic row-level locking (`SELECT ... FOR UPDATE`) ordered strictly by primary keys (`account_id`) to completely eliminate race conditions and deadlocks.
7. **Automated Audit Logging:** Deploy database triggers to create an immutable ledger tracking historical balance modifications independently of application code.
8. **Principle of Least Privilege:** Enforce column-level database privileges so that the application service account is structurally barred from executing direct SQL `UPDATE` operations on account balances.

### 1.3 Problem Statement & Banking Invariants
In a naive banking implementation, a transfer from Account $A$ to Account $B$ is typically executed via three separate application commands:
```sql
-- Naive / Unsafe Approach
SELECT balance FROM account WHERE account_id = A;
UPDATE account SET balance = balance - 5000 WHERE account_id = A;
UPDATE account SET balance = balance + 5000 WHERE account_id = B;
```
If two transfer requests execute concurrently, both transactions can read the identical initial balance simultaneously, causing the second commit to overwrite the first (the classic **Lost Update Problem**). Furthermore, a network or server crash between the debit and credit commands destroys financial equilibrium, effectively creating or deleting money out of thin air.

MudraFlow strictly enforces the **Fundamental Banking Ledger Invariant**:
$$\forall a \in \text{account}, \quad \text{balance}(a) = \sum_{t \in \text{credits}(a)} \text{amount}(t) - \sum_{t \in \text{debits}(a)} \text{amount}(t)$$
This invariant must hold unconditionally across every committed state of the database. Balances cannot be updated directly; they may only be modified inside stored procedures alongside corresponding immutable ledger entries.

### 1.4 Business Rules & Operational Constraints
1. **Money Ingress Channels:** Money enters the MudraFlow banking ecosystem exclusively through three strictly monitored channels:
   - Initial opening deposit provided during account creation.
   - Staff-authorized loan disbursements credited to customer accounts.
   - Maturity credit from previously completed Fixed Deposits.
   Customers cannot execute unbacked manual deposits or cash withdrawals. All other transactions represent strictly balanced internal account transfers.
2. **Transfer Mode Thresholds:**
   - **IMPS (Immediate Payment Service):** Instant settlement, capped at a maximum limit of ₹5,00,000 per transaction.
   - **NEFT (National Electronic Funds Transfer):** Batch/settlement simulation, unrestricted transaction amount.
   - **RTGS (Real Time Gross Settlement):** High-value corporate transactions, strictly requiring a minimum threshold of ₹2,00,000.
3. **Security and Access Governance:**
   - Customer accounts are subject to automatic 10-minute lockouts following five consecutive failed password authentication attempts.
   - Dual-factor verification is required for money movement (password hash verification via bcrypt alongside simulated transactional OTP verification).
   - Accounts tagged with `FROZEN` status are programmatically barred from participating as either sender or recipient in any transaction.

### 1.5 System Architecture
MudraFlow implements an enterprise Three-Tier Architecture:
1. **Presentation Tier (Client):** Developed as a Single Page Application (SPA) using React and Vite. It provides responsive interfaces for customer banking operations and staff administrative portals.
2. **Application Logic Tier (Server):** Implemented in Node.js with Express. It acts as an API gateway managing JWT token lifecycle, bcrypt password hashing, and input sanitization. Crucially, the server contains zero business balance calculation logic; it acts solely as a caller of database stored programs.
3. **Data Tier (MySQL 8 InnoDB):** The relational core containing all tables, constraints, foreign key cascades, deterministic stored functions, transactional stored procedures, views, and audit triggers. The backend authenticates using a restricted database account (`mudraflow_app`) that has execution privileges on procedures but lacks direct `UPDATE` privileges on financial balance columns.

```
+-------------------------------------------------------------------------+
|                       PRESENTATION TIER (React SPA)                    |
|  - Customer Portal (Transfers, FDs, Loans, History, Statement Receipts) |
|  - Staff Portal (Loan Approvals, Card Issuance, Account Freeze/Audit)   |
+------------------------------------+------------------------------------+
                                     | HTTPS / JSON REST API
                                     v
+-------------------------------------------------------------------------+
|                  APPLICATION TIER (Node.js & Express REST API)          |
|  - JWT Authentication, Session & Lockout Governance                     |
|  - Bcrypt Password Hashing, Parameter Validation                        |
|  - DB Connection Pool (Connecting as restricted user: mudraflow_app)    |
+------------------------------------+------------------------------------+
                                     | SQL CALL & Queries
                                     v
+-------------------------------------------------------------------------+
|                  DATABASE TIER (MySQL 8 InnoDB Storage Engine)          |
|  - 10 Normalized Relational Tables (3NF / BCNF)                         |
|  - 7 ACID Stored Procedures (Pessimistic Row-Level Locking)             |
|  - 2 Stored Functions (get_fd_rate, get_loan_rate)                      |
|  - 2 Triggers (trg_account_audit, trg_txn_block_frozen)                 |
|  - 1 Unified View (v_applications), Composite B-Tree Indexes            |
|  - Column-Level Security Grants & Foreign Key Invariants                |
+-------------------------------------------------------------------------+
```

---

# 2. REQUIREMENT ANALYSIS

### 2.1 Functional Requirements

#### 2.1.1 Customer Subsystem
- **User Onboarding & Account Registration:** Capture full legal name, date of birth (enforcing minimum age of 18 years via validation), contact email, 10-digit mobile number, unique PAN (format: `[A-Z]{5}[0-9]{4}[A-Z]{1}`), residential address, account type selection (SAVINGS or CURRENT), and mandatory opening deposit (minimum ₹1,000). The process atomically generates a unique 8-digit Customer ID and a 10-digit Account Number.
- **Account Dashboard:** Display masked account identifiers, real-time available balances (with view/hide toggling), monthly aggregate credits/debits, linked branch name, and IFSC code.
- **Fund Transfer Subsystem:** Enable real-time inter-account funds movement using direct input (Account Number + IFSC) or via registered beneficiaries. Provide choice of IMPS, NEFT, or RTGS with automatic client-side and server-side threshold enforcement.
- **Transaction History & Ledger Statements:** Provide search and date-range filtering over transactions, displaying transaction reference identifiers, debit/credit indications, running balance calculations, and generating printable transaction slips.
- **Fixed Deposit (FD) Booking:** Enable customers to lock funds for designated tenures (6, 12, 24, 36, or 60 months) with dynamic interest rate computation, projected maturity amount calculation, and selection of maturity payout instructions (CREDIT or AUTO-RENEW).
- **Loan Applications:** Allow customers to submit loan requests specifying requested principal amount, tenure, explicit purpose, employment status, and annual income.
- **Service Requests:** Facilitate applications for physical debit cards (specifying cardholder name and payment network: Visa, MasterCard, or RuPay) and cheque books (specifying leaf count: 10, 25, or 50).
- **Application Tracking:** Provide an integrated consolidated view displaying the processing status of all pending, approved, or rejected loans and service requests.

#### 2.1.2 Staff / Administrative Subsystem
- **Operational Supervision Dashboard:** Summarize branch-wide metrics including total registered customers, total active accounts, total deposit liabilities across branches, and pending operational queues.
- **Loan Underwriting Workflow:** Allow bank staff to review pending loan applications against stated annual income and purpose, granting approval (triggering automated principal disbursement) or rejection.
- **Service Request Processing:** Enable staff to approve debit card requests (automatically triggering the generation of a 16-digit card number and a 5-year expiration date) and cheque book requests.
- **Account Freeze / Unfreeze Management:** Enable authorized personnel to freeze suspicious accounts, immediately revoking their ability to initiate or receive fund transfers.
- **Automated Maturity Settlement:** Execute bulk processing of all active fixed deposits reaching maturity date, automatically crediting the principal plus interest or creating renewed deposit records.

### 2.2 Non-Functional Requirements
- **ACID Transaction Compliance:** All financial operations involving balance adjustments must satisfy Atomicity, Consistency, Isolation, and Durability. A failure at any intermediate step must trigger an immediate rollback.
- **Concurrency & Deadlock Prevention:** The database must support concurrent financial transfers between shared accounts without suffering lost updates or entering deadlock cycles.
- **Auditability and Traceability:** Every change to an account balance must generate an immutable record in the audit log containing previous balance, new balance, timestamp, and triggering transaction ID.
- **Security & Data Confidentiality:** User passwords must never be stored in plaintext; one-way hashing with bcrypt (salt rounds = 10) is mandatory. API communications must require signed JSON Web Tokens (JWT).
- **Data Integrity Constraints:** Mandatory enforcement of domain constraints (`CHECK (balance >= 0)`, `CHECK (amount > 0)`), referential integrity cascades, and strict relational nullability.
- **Query Performance & Indexing:** Optimized query execution on high-cardinality ledger tables using composite B-Tree indexes on `(from_account_id, created_at)` and `(to_account_id, created_at)`.

### 2.3 Hardware and Software Environment
- **Operating Environment:** Windows 10/11 64-bit / Linux Ubuntu 22.04 LTS.
- **Database Engine:** MySQL Server 8.0.35+ (InnoDB Storage Engine).
- **Database Administration Tools:** MySQL Workbench 8.0 CE, Command Line Client.
- **Backend Runtime:** Node.js v20.x LTS, Express.js Framework.
- **Database Driver:** `mysql2` (Promise-based asynchronous driver).
- **Frontend Framework:** React 18 with Vite, HTML5, Vanilla CSS3.
- **Development & Testing:** Visual Studio Code, Postman API Platform, Git / GitHub.

---

# 3. ER MODEL

### 3.1 Entity Identification and Attribute Classification
The conceptual model of MudraFlow identifies 10 primary entities capturing core banking operations:

1. **`BRANCH`**: Represents the physical bank location holding accounts and housing staff.
   - Attributes: `branch_id` (PK, integer), `branch_name` (simple, string), `ifsc` (candidate key, 11-character alphanumeric code), `city` (simple, string).
2. **`EMPLOYEE`**: Represents bank personnel executing administrative and supervisory actions.
   - Attributes: `emp_id` (PK, string), `full_name` (simple, string), `role` (enumeration: 'MANAGER', 'CLERK'), `branch_id` (FK referencing BRANCH), `password_hash` (simple, string).
3. **`CUSTOMER`**: Represents an individual holding banking relationships.
   - Attributes: `customer_id` (PK, 8-digit bigint), `full_name` (simple, string), `dob` (date), `email` (candidate key, string), `phone` (10-digit string), `pan` (candidate key, 10-character string), `address` (composite: street, city, pin), `password_hash` (string), `failed_attempts` (tinyint), `locked_until` (datetime), `created_at` (timestamp).
4. **`ACCOUNT`**: Represents a deposit account owned by a customer.
   - Attributes: `account_id` (PK, integer), `account_number` (candidate key, 10-character string), `customer_id` (FK), `branch_id` (FK), `account_type` (enumeration: 'SAVINGS', 'CURRENT'), `balance` (numeric, default 0.00), `status` (enumeration: 'ACTIVE', 'FROZEN'), `opened_on` (date).
5. **`TRANSACTION` (`txn`)**: Represents an immutable ledger entry recording a money movement.
   - Attributes: `txn_id` (PK, bigint), `reference_no` (candidate key, string), `from_account_id` (FK, nullable), `to_account_id` (FK, nullable), `receiver_name` (string, nullable), `amount` (numeric), `mode` (enumeration: 'IMPS', 'NEFT', 'RTGS', 'INTERNAL'), `txn_type` (enumeration: 'OPENING_DEPOSIT', 'TRANSFER', 'FD_CREATE', 'FD_MATURITY', 'LOAN_CREDIT'), `remarks` (string), `created_at` (timestamp).
6. **`BENEFICIARY`**: Represents a pre-registered payee saved by a customer.
   - Attributes: `beneficiary_id` (PK, integer), `customer_id` (FK), `name` (string), `account_number` (10-digit string), `ifsc` (11-character string), `added_on` (timestamp).
7. **`FIXED_DEPOSIT`**: Represents term deposits booked against an account.
   - Attributes: `fd_id` (PK, integer), `customer_id` (FK), `account_id` (FK), `amount` (numeric), `rate` (numeric), `tenure_months` (integer), `start_date` (date), `maturity_date` (date), `maturity_amount` (numeric), `maturity_instruction` (enumeration: 'CREDIT', 'RENEW'), `status` (enumeration: 'ACTIVE', 'MATURED').
8. **`LOAN`**: Represents credit applications submitted by customers.
   - Attributes: `loan_id` (PK, integer), `customer_id` (FK), `account_id` (FK), `amount` (numeric), `purpose` (string), `duration_months` (integer), `rate` (numeric), `employment_status` (enumeration), `annual_income` (numeric), `status` (enumeration: 'PENDING', 'APPROVED', 'REJECTED'), `applied_on` (timestamp), `decided_by` (FK referencing EMPLOYEE, nullable), `decided_on` (datetime, nullable).
9. **`SERVICE_REQUEST`**: Represents customer requests for bank instruments.
   - Attributes: `request_id` (PK, integer), `customer_id` (FK), `account_id` (FK), `request_type` (enumeration: 'DEBIT_CARD', 'CHEQUE_BOOK'), `name_on_card` (string, nullable), `network` (enumeration, nullable), `leaves` (integer, nullable), `delivery_address` (string), `card_number` (string, nullable), `card_expiry` (date, nullable), `status` (enumeration: 'REQUESTED', 'APPROVED', 'REJECTED'), `requested_on` (timestamp), `decided_by` (FK referencing EMPLOYEE, nullable), `decided_on` (datetime, nullable).
10. **`AUDIT_LOG`**: Represents an append-only audit trail tracking balance modifications.
    - Attributes: `audit_id` (PK, bigint), `account_id` (FK), `txn_id` (bigint, nullable), `old_balance` (numeric), `new_balance` (numeric), `changed_at` (timestamp).

### 3.2 Relationships, Cardinality Ratios, and Participation Constraints

| Relationship Name | Participating Entities | Cardinality Ratio | Participation Constraint | Structural Meaning |
| :--- | :--- | :---: | :--- | :--- |
| **Employs** | `BRANCH` — `EMPLOYEE` | $1 : N$ | Total on `EMPLOYEE`, Partial on `BRANCH` | Every employee must belong to exactly one branch; a branch may employ multiple staff. |
| **Held At** | `BRANCH` — `ACCOUNT` | $1 : N$ | Total on `ACCOUNT`, Partial on `BRANCH` | Every account belongs to exactly one branch; a branch holds many accounts. |
| **Owns** | `CUSTOMER` — `ACCOUNT` | $1 : N$ | Total on `ACCOUNT`, Partial on `CUSTOMER` | Every account must be owned by one customer; a customer may own multiple accounts. |
| **Saves** | `CUSTOMER` — `BENEFICIARY` | $1 : N$ | Total on `BENEFICIARY`, Partial on `CUSTOMER` | A beneficiary is registered by one customer; customers may save many beneficiaries. |
| **Opens / Funds** | `CUSTOMER`, `ACCOUNT` — `FIXED_DEPOSIT` | $1 : N$ each | Total on `FIXED_DEPOSIT` | An FD is funded by one account and belongs to one customer. |
| **Applies / Paid Into** | `CUSTOMER`, `ACCOUNT` — `LOAN` | $1 : N$ each | Total on `LOAN` | A loan application is linked to one applicant customer and one target credit account. |
| **Requests / Linked To** | `CUSTOMER`, `ACCOUNT` — `SERVICE_REQUEST` | $1 : N$ each | Total on `SERVICE_REQUEST` | Card/cheque requests belong to one customer and are bound to one account. |
| **Decides** | `EMPLOYEE` — `LOAN`, `SERVICE_REQUEST` | $1 : N$ each | Partial on all sides | Staff members decide many requests; requests remain undecided until staff review. |
| **Sends / Receives** | `ACCOUNT` — `TRANSACTION` | $1 : N$ each | Partial on both sides | Accounts send and receive multiple transactions; bank-originated entries have null senders. |
| **Logged In** | `ACCOUNT` — `AUDIT_LOG` | $1 : N$ | Total on `AUDIT_LOG`, Partial on `ACCOUNT` | Every audit entry belongs to one account; an account may have many audit logs. |

### 3.3 Complete Entity-Relationship Diagram
The ER diagram captures all entities, primary/candidate key attributes (underlined), multi-valued attributes, weak relationships, and structural cardinalities ($1:1$, $1:N$, $M:N$).

```
       +-----------------------+                    +------------------------+
       |        BRANCH         | 1                N |        EMPLOYEE        |
       |-----------------------|<-------------------|------------------------|
       | *branch_id (PK)       |   (employs)        | *emp_id (PK)           |
       |  branch_name          |                    |  full_name             |
       |  ifsc (UK)            |                    |  role                  |
       |  city                 |                    |  branch_id (FK)        |
       +-----------+-----------+                    +-----------+------------+
                   | 1                                          | 1
                   |                                            | (decides)
                   | (held at)                                  v
                   |                            +---------------+----------------+
                   |                          N |                                | N
                   v                            v                                v
       +-----------------------+        +---------------+               +----------------+
       |        ACCOUNT        |        |     LOAN      |               | SERVICE_REQUEST|
       |-----------------------|        |---------------|               |----------------|
       | *account_id (PK)      |        | *loan_id (PK) |               | *request_id(PK)|
       |  account_number (UK)  |        |  customer_id  |               |  customer_id   |
       |  customer_id (FK)-----+--+     |  account_id   |               |  account_id    |
       |  branch_id (FK)       |  |     |  amount, rate |               |  request_type  |
       |  balance, status      |  |     |  status       |               |  status        |
       +-----------+-----------+  |     +---------------+               +----------------+
           ^       |              |             ^                               ^
           |       |              |             | (applies /                    | (requests /
           | (logs)|              |             |  linked)                      |  linked)
           |       v (sends/rec.) |             |                               |
       +---+-------+---+          |             |                               |
       |   AUDIT_LOG   |          |             +---------------+---------------+
       |---------------|          |                             |
       | *audit_id (PK)|          |                             |
       |  account_id   |          |                             |
       |  old_balance  |          |                             |
       |  new_balance  |          |                             v
       +---------------+          |             +-------------------------------+
                                  |             |           CUSTOMER            |
                                  | (owns)      |-------------------------------|
                                  +------------>| *customer_id (PK)             |
                                                |  full_name, dob, email (UK)   |
                                                |  phone, pan (UK), address     |
                                                +---------------+---------------+
                                                                | 1
                                                +---------------+---------------+
                                                | (saves)                       | (opens)
                                                v N                             v N
                                  +-----------------------+     +-----------------------+
                                  |      BENEFICIARY      |     |     FIXED_DEPOSIT     |
                                  |-----------------------|     |-----------------------|
                                  | *beneficiary_id (PK)  |     | *fd_id (PK)           |
                                  |  customer_id (FK)     |     |  customer_id (FK)     |
                                  |  name, account_number |     |  account_id (FK)      |
                                  |  ifsc                 |     |  amount, rate, status |
                                  +-----------------------+     +-----------------------+
```

---

# 4. ER TO RELATIONAL SCHEMA

### 4.1 Relational Mapping Methodology
The conceptual ER model is converted to relational tables according to formal algorithmic mapping rules:
1. **Strong Entities:** Each strong entity maps directly to a distinct relation. The primary key of the entity becomes the primary key of the relation.
2. **$1:N$ Binary Relationships:** Mapped by embedding the primary key from the parent (1-side) as a foreign key attribute in the child relation (N-side). For total participation, the foreign key column is defined with `NOT NULL`.
3. **Multiple Relationships Between Identical Entities:** When two relationships exist between identical entities (e.g., `ACCOUNT` sends `TRANSACTION` and `ACCOUNT` receives `TRANSACTION`), distinct foreign keys (`from_account_id` and `to_account_id`) are mapped into the relation.
4. **Weak / Dependent Entities & Attributes:** Transformed by including referencing composite keys or auto-increment surrogate identifiers with foreign key references enforcing referential integrity.

### 4.2 Tabular Relational Schema Definitions

#### 1. Relation: `branch`
$$BRANCH(\underline{branch\_id}, branch\_name, ifsc, city)$$
- **Primary Key:** `branch_id`
- **Candidate Key:** `ifsc`

#### 2. Relation: `employee`
$$EMPLOYEE(\underline{emp\_id}, full\_name, role, branch\_id, password\_hash)$$
- **Primary Key:** `emp_id`
- **Foreign Key:** `branch_id` $\to$ $BRANCH(branch\_id)$

#### 3. Relation: `customer`
$$CUSTOMER(\underline{customer\_id}, full\_name, dob, email, phone, pan, address, password\_hash, failed\_attempts, locked\_until, created\_at)$$
- **Primary Key:** `customer_id`
- **Candidate Keys:** `email`, `pan`

#### 4. Relation: `account`
$$ACCOUNT(\underline{account\_id}, account\_number, customer\_id, branch\_id, account\_type, balance, status, opened\_on)$$
- **Primary Key:** `account_id`
- **Candidate Key:** `account_number`
- **Foreign Keys:** `customer_id` $\to$ $CUSTOMER(customer\_id)$, `branch_id` $\to$ $BRANCH(branch\_id)$

#### 5. Relation: `txn` (Transaction Ledger)
$$TXN(\underline{txn\_id}, reference\_no, from\_account\_id, to\_account\_id, receiver\_name, amount, mode, txn\_type, remarks, created\_at)$$
- **Primary Key:** `txn_id`
- **Candidate Key:** `reference_no`
- **Foreign Keys:** `from_account_id` $\to$ $ACCOUNT(account\_id)$, `to_account_id` $\to$ $ACCOUNT(account\_id)$

#### 6. Relation: `beneficiary`
$$BENEFICIARY(\underline{beneficiary\_id}, customer\_id, name, account\_number, ifsc, added\_on)$$
- **Primary Key:** `beneficiary_id`
- **Candidate Key:** $(customer\_id, account\_number)$
- **Foreign Key:** `customer_id` $\to$ $CUSTOMER(customer\_id)$

#### 7. Relation: `fixed_deposit`
$$FIXED\_DEPOSIT(\underline{fd\_id}, customer\_id, account\_id, amount, rate, tenure\_months, start\_date, maturity\_date, maturity\_amount, maturity\_instruction, status)$$
- **Primary Key:** `fd_id`
- **Foreign Keys:** `customer_id` $\to$ $CUSTOMER(customer\_id)$, `account_id` $\to$ $ACCOUNT(account\_id)$

#### 8. Relation: `loan`
$$LOAN(\underline{loan\_id}, customer\_id, account\_id, amount, purpose, duration\_months, rate, employment\_status, annual\_income, status, applied\_on, decided\_by, decided\_on)$$
- **Primary Key:** `loan_id`
- **Foreign Keys:** `customer_id` $\to$ $CUSTOMER(customer\_id)$, `account_id` $\to$ $ACCOUNT(account\_id)$, `decided_by` $\to$ $EMPLOYEE(emp\_id)$

#### 9. Relation: `service_request`
$$SERVICE\_REQUEST(\underline{request\_id}, customer\_id, account\_id, request\_type, name\_on\_card, network, leaves, delivery\_address, card\_number, card\_expiry, status, requested\_on, decided\_by, decided\_on)$$
- **Primary Key:** `request_id`
- **Foreign Keys:** `customer_id` $\to$ $CUSTOMER(customer\_id)$, `account_id` $\to$ $ACCOUNT(account\_id)$, `decided_by` $\to$ $EMPLOYEE(emp\_id)$

#### 10. Relation: `audit_log`
$$AUDIT\_LOG(\underline{audit\_id}, account\_id, txn\_id, old\_balance, new\_balance, changed\_at)$$
- **Primary Key:** `audit_id`
- **Foreign Key:** `account_id` $\to$ $ACCOUNT(account\_id)$

### 4.3 Referential Integrity & Constraint Specifications
- **Domain Constraints:** 
  - `account.balance >= 0` enforced via SQL `CHECK` constraint.
  - `txn.amount > 0` enforced via SQL `CHECK` constraint.
  - At least one of `from_account_id` or `to_account_id` must be non-null: `CHECK (from_account_id IS NOT NULL OR to_account_id IS NOT NULL)`.
- **Referential Actions:**
  - Foreign keys referencing `branch` and `customer` restrict deletion (`ON DELETE RESTRICT`) to prevent accidental deletion of branches or customers with active accounts.
  - Audit log entries are strictly protected against cascading deletes.

---

# 5. NORMALIZATION STEPS TILL BCNF

### 5.1 Theoretical Background & Normal Form Criteria
Relational database normalization is the formal mathematical technique of organizing relations to minimize data redundancy and eliminate update, insertion, and deletion anomalies.

- **First Normal Form (1NF):** A relation $R$ is in 1NF if and only if all underlying attribute domains contain purely atomic (indivisible) values, and each tuple contains exactly one value for each attribute.
- **Second Normal Form (2NF):** A relation $R$ is in 2NF if and only if it is in 1NF and no non-prime attribute is partially dependent on any candidate key of $R$. Formally: $\forall X \to A \in F$, if $A$ is a non-prime attribute, then $X$ is not a proper subset of any candidate key.
- **Third Normal Form (3NF):** A relation $R$ is in 3NF if and only if it is in 2NF and no non-prime attribute is transitively dependent on a candidate key. Formally: $\forall X \to A \in F$, at least one of the following holds:
  1. $X \to A$ is a trivial functional dependency ($A \subseteq X$).
  2. $X$ is a superkey of $R$.
  3. $A$ is a prime attribute (part of a candidate key).
- **Boyce-Codd Normal Form (BCNF):** A relation $R$ is in BCNF if and only if for every non-trivial functional dependency $X \to A \in F$, $X$ is a superkey of $R$. BCNF eliminates all anomalies arising from functional dependencies.

---

### 5.2 Step-by-Step Normalization for Core Banking Transaction Schema
To demonstrate the full mathematical normalization trajectory, consider an initial unnormalized universal banking relation, $R_{UNF\_TXN}$, capturing transaction executions, customer data, and branch details:

$$R_{UNF\_TXN} = \{ \underline{txn\_ref}, account\_num, acc\_type, balance, cust\_id, cust\_name, pan, email, branch\_id, branch\_name, ifsc, city, amount, mode, txn\_date \}$$

#### Functional Dependencies Observed in $R_{UNF\_TXN}$:
1. $FD_1: txn\_ref \to \{account\_num, amount, mode, txn\_date\}$
2. $FD_2: account\_num \to \{acc\_type, balance, cust\_id, branch\_id\}$
3. $FD_3: cust\_id \to \{cust\_name, pan, email\}$
4. $FD_4: branch\_id \to \{branch\_name, ifsc, city\}$
5. $FD_5: ifsc \to \{branch\_id, branch\_name, city\}$
6. $FD_6: pan \to cust\_id$
7. $FD_7: email \to cust\_id$

#### Step 1: Conversion to First Normal Form (1NF)
- **Condition:** All values must be atomic; multi-valued and composite attributes must be expanded.
- **Action:** Attributes like customer address are split into atomic strings; repeating transaction items are placed into individual tuples.
- **Key Analysis:** The primary key for $R_{UNF\_TXN}$ is $txn\_ref$.
- **Result:** $R_{UNF\_TXN}$ is in 1NF, but exhibits massive anomalies:
  - *Insertion Anomaly:* Cannot add a new customer or branch until they execute their first transaction.
  - *Deletion Anomaly:* Deleting the sole transaction record for a customer erases the customer profile and branch record.
  - *Update Anomaly:* If branch IFSC changes, dozens of transaction rows must be simultaneously modified.

#### Step 2: Conversion from 1NF to Second Normal Form (2NF)
- **Condition:** Eliminate partial dependencies on any composite candidate key.
- **Analysis:** Since the candidate key for $R_{UNF\_TXN}$ is the single attribute $txn\_ref$, no proper subset of the key exists.
- **Conclusion:** By definition, any relation with a single-attribute candidate key is automatically in 2NF. Thus, $R_{UNF\_TXN}$ is already in 2NF.

#### Step 3: Conversion from 2NF to Third Normal Form (3NF)
- **Condition:** Eliminate all transitive dependencies: non-prime attributes depending on other non-prime attributes ($X \to Y$ where $X$ is not a superkey).
- **Violation Analysis:**
  - $txn\_ref \to account\_num$, and $account\_num \to \{acc\_type, balance, cust\_id, branch\_id\}$. Here, $\{acc\_type, balance, cust\_id, branch\_id\}$ depends transitively on $txn\_ref$ through $account\_num$.
  - $account\_num \to cust\_id$, and $cust\_id \to \{cust\_name, pan, email\}$. Here, customer personal details depend transitively on $account\_num$.
  - $account\_num \to branch\_id$, and $branch\_id \to \{branch\_name, ifsc, city\}$. Branch details depend transitively on $account\_num$.
- **Decomposition:** Decompose $R_{UNF\_TXN}$ into four non-transitive relations:
  1. $R_1 (TXN) = \{ \underline{txn\_ref}, account\_num, amount, mode, txn\_date \}$
  2. $R_2 (ACCOUNT) = \{ \underline{account\_num}, acc\_type, balance, cust\_id, branch\_id \}$
  3. $R_3 (CUSTOMER) = \{ \underline{cust\_id}, cust\_name, pan, email \}$
  4. $R_4 (BRANCH) = \{ \underline{branch\_id}, branch\_name, ifsc, city \}$
- **Verification:** In each relation, every non-prime attribute depends directly and solely on a candidate key. No transitive chains remain. Hence, all four sub-relations are in 3NF.

#### Step 4: Verification of Boyce-Codd Normal Form (BCNF)
- **Condition:** In every non-trivial functional dependency $X \to Y$, $X$ must be a superkey.
- **Analysis of Decomposed Relations:**
  - In $TXN$: $txn\_ref \to \{account\_num, amount, mode, txn\_date\}$. Determinant is candidate key. Satisfies BCNF.
  - In $ACCOUNT$: $account\_num \to \{acc\_type, balance, cust\_id, branch\_id\}$. Determinant is candidate key. Satisfies BCNF.
  - In $CUSTOMER$: Candidate keys are $cust\_id$, $pan$, and $email$.
    - $cust\_id \to \{cust\_name, pan, email\}$: $cust\_id$ is superkey.
    - $pan \to \{cust\_id, cust\_name, email\}$: $pan$ is superkey.
    - $email \to \{cust\_id, cust\_name, pan\}$: $email$ is superkey.
    Since every determinant is a superkey, $CUSTOMER$ satisfies BCNF.
  - In $BRANCH$: Candidate keys are $branch\_id$ and $ifsc$.
    - $branch\_id \to \{branch\_name, ifsc, city\}$: $branch\_id$ is superkey.
    - $ifsc \to \{branch\_id, branch\_name, city\}$: $ifsc$ is superkey.
    Every determinant is a superkey. Hence, $BRANCH$ satisfies BCNF.
- **Conclusion:** The core banking transaction schema is strictly in BCNF.

---

### 5.3 Step-by-Step Normalization for Fixed Deposit / Loan Schema
Consider the second major banking workflow: fixed deposit booking and loan underwriting, initially modeled as an unnormalized relation $R_{UNF\_FD\_LOAN}$:

$$R_{UNF\_FD\_LOAN} = \{ \underline{app\_id}, cust\_id, acc\_id, app\_type, principal, tenure, rate, maturity\_amt, emp\_id, emp\_name, emp\_role, decision \}$$

#### Functional Dependencies:
1. $FD_1: app\_id \to \{cust\_id, acc\_id, app\_type, principal, tenure, rate, maturity\_amt, emp\_id, decision\}$
2. $FD_2: \{principal, tenure, rate\} \to maturity\_amt$ (Derived calculation for FDs)
3. $FD_3: emp\_id \to \{emp\_name, emp\_role\}$
4. $FD_4: tenure \to rate$ (Pre-defined bank tenure slab)

#### Step 1: 1NF Evaluation
Atomic single values in each field. Primary key is $app\_id$. Satisfies 1NF.

#### Step 2: 2NF Evaluation
The candidate key is single-attribute ($app\_id$). No partial dependencies can exist. Satisfies 2NF.

#### Step 3: 3NF & BCNF Decomposition
- **Violations:**
  - $emp\_id \to \{emp\_name, emp\_role\}$ violates 3NF because $emp\_id$ is not a superkey in $R_{UNF\_FD\_LOAN}$. An employee's details are repeated every time they review an application.
  - FDs and Loans have distinct lifecycles: FDs have maturity instructions and payout dates, while Loans have employment status, annual income, and duration.
- **Decomposition:**
  1. Extract $EMPLOYEE$:
     $$EMPLOYEE = \{ \underline{emp\_id}, full\_name, role, password\_hash \}$$
     All determinants are candidate keys. $\implies$ Satisfies BCNF.
  2. Separate Term Deposits into $FIXED\_DEPOSIT$:
     $$FIXED\_DEPOSIT = \{ \underline{fd\_id}, cust\_id, acc\_id, amount, rate, tenure\_months, start\_date, maturity\_date, maturity\_amount, status \}$$
     In this relation, $rate$ is captured statically at insertion time from the deterministic stored function `get_fd_rate()`. Hence, the dependency $tenure \to rate$ is severed at runtime, leaving $fd\_id$ as the sole determinant for all tuple attributes. $\implies$ Satisfies BCNF.
  3. Separate Credit Underwriting into $LOAN$:
     $$LOAN = \{ \underline{loan\_id}, cust\_id, acc\_id, amount, purpose, duration\_months, rate, annual\_income, status, decided\_by \}$$
     $decided\_by$ is a foreign key referencing $EMPLOYEE(emp\_id)$. Determinant is $loan\_id$, which is a candidate key. $\implies$ Satisfies BCNF.

---

### 5.4 Summary of Final BCNF Status for All Remaining Relations

Following the identical rigorous decomposition process, the remaining four application relations were evaluated against BCNF criteria:

| Relation Name | Candidate Key(s) | Non-Trivial Functional Dependencies ($X \to Y$) | Determinant Status ($X$) | Highest Normal Form |
| :--- | :--- | :--- | :--- | :---: |
| **`beneficiary`** | `beneficiary_id`, `(customer_id, account_number)` | `beneficiary_id` $\to$ all attributes; `(customer_id, account_number)` $\to$ all attributes | Candidate Key (Superkey) | **BCNF** |
| **`service_request`** | `request_id` | `request_id` $\to$ `{customer_id, account_id, request_type, delivery_address, status, decided_by, ...}` | Candidate Key (Superkey) | **BCNF** |
| **`audit_log`** | `audit_id` | `audit_id` $\to$ `{account_id, txn_id, old_balance, new_balance, changed_at}` | Candidate Key (Superkey) | **BCNF** |
| **`employee`** | `emp_id` | `emp_id` $\to$ `{full_name, role, branch_id, password_hash}` | Candidate Key (Superkey) | **BCNF** |

**Conclusion:** All 10 relational tables in MudraFlow completely satisfy Boyce-Codd Normal Form (BCNF). No insert, update, or delete anomalies can occur under valid relational operations.

---

# 6. LOSSLESS DECOMPOSITION PROOF

### 6.1 Theorem and Necessary Conditions for Lossless Joins
A decomposition of a relation $R$ into two relations $R_1$ and $R_2$ is defined as **lossless (non-additive)** with respect to a set of functional dependencies $F$ if and only if:
$$\Pi_{R_1}(R) \bowtie \Pi_{R_2}(R) = R$$
If joining the decomposed projections produces spurious (extraneous) tuples not present in the original relation, the decomposition is lossy and strictly invalid.

#### Fundamental Lossless Join Theorem:
A binary decomposition of relation $R$ into $R_1$ and $R_2$ is **lossless** with respect to $F$ if and only if the common attributes $(R_1 \cap R_2)$ functionally determine at least one of the decomposed relations in the closure of $F$:
$$(R_1 \cap R_2 \to R_1) \in F^+ \quad \text{OR} \quad (R_1 \cap R_2 \to R_2) \in F^+$$
In relational terms: the intersection of $R_1$ and $R_2$ must contain a candidate key of $R_1$, or a candidate key of $R_2$, or both.

---

### 6.2 Formal Algebraic Proofs for Core Decompositions

#### Proof 1: Decomposition of Customer-Account Entity Relation
Let relation $R_{CUST\_ACC}$ represent account records bound to customer personal information:
$$R_{CUST\_ACC} = \{ account\_id, account\_num, cust\_id, full\_name, email, pan, balance \}$$
Functional dependencies:
- $F = \{ account\_id \to \{account\_num, cust\_id, balance\}, \; cust\_id \to \{full\_name, email, pan\} \}$

Decompose $R_{CUST\_ACC}$ into:
$$R_1 (ACCOUNT) = \{ account\_id, account\_num, cust\_id, balance \}$$
$$R_2 (CUSTOMER) = \{ cust\_id, full\_name, email, pan \}$$

**Step-by-Step Proof:**
1. Determine the intersection:
   $$R_1 \cap R_2 = \{ cust\_id \}$$
2. Compute the attribute closure of the intersection under $F$:
   $$(R_1 \cap R_2)^+ = \{ cust\_id \}^+$$
   Using dependency $cust\_id \to \{full\_name, email, pan\}$:
   $$\{ cust\_id \}^+ = \{ cust\_id, full\_name, email, pan \} = R_2$$
3. Since $(R_1 \cap R_2) \to R_2$, the common attribute $cust\_id$ forms a superkey for relation $R_2$.
4. **Conclusion:** By the fundamental theorem, the decomposition of $R_{CUST\_ACC}$ into $ACCOUNT$ and $CUSTOMER$ is **strictly lossless**. $\blacksquare$

---

#### Proof 2: Decomposition of Account-Branch Relation
Let relation $R_{ACC\_BR}$ represent account records bound to physical branch details:
$$R_{ACC\_BR} = \{ account\_id, account\_num, branch\_id, branch\_name, ifsc, city \}$$
Functional dependencies:
- $F = \{ account\_id \to \{account\_num, branch\_id\}, \; branch\_id \to \{branch\_name, ifsc, city\} \}$

Decompose $R_{ACC\_BR}$ into:
$$R_1 (ACCOUNT) = \{ account\_id, account\_num, branch\_id \}$$
$$R_2 (BRANCH) = \{ branch\_id, branch\_name, ifsc, city \}$$

**Step-by-Step Proof:**
1. Determine the intersection:
   $$R_1 \cap R_2 = \{ branch\_id \}$$
2. Compute the attribute closure under $F$:
   $$(R_1 \cap R_2)^+ = \{ branch\_id \}^+$$
   From $FD: branch\_id \to \{branch\_name, ifsc, city\}$:
   $$\{ branch\_id \}^+ = \{ branch\_id, branch\_name, ifsc, city \} = R_2$$
3. Since $(R_1 \cap R_2) \to R_2$, the shared attribute $branch\_id$ is a candidate key for $BRANCH$.
4. **Conclusion:** The decomposition into $ACCOUNT$ and $BRANCH$ is **strictly lossless**. $\blacksquare$

---

### 6.3 Matrix / Tableau Verification Method (Aho-Beeri-Ullman Algorithm)
To provide an alternative verification acceptable in academic examinations, we apply the formal **Tableau Algorithm** to verify the decomposition of:
$$R = \{ txn\_id, account\_id, cust\_id, amount \}$$
Decomposed into:
- $R_1 = \{ txn\_id, account\_id, amount \}$
- $R_2 = \{ account\_id, cust\_id \}$
Functional dependencies:
- $FD_1: txn\_id \to \{account\_id, amount\}$
- $FD_2: account\_id \to cust\_id$

#### Step 1: Initial Tableau Construction
Construct a table with rows corresponding to relations $R_1, R_2$ and columns corresponding to all attributes in $R$. For each row $i$, place $a_j$ if attribute $j \in R_i$; otherwise place $b_{ij}$:

| Sub-relation | $txn\_id$ | $account\_id$ | $cust\_id$ | $amount$ |
| :---: | :---: | :---: | :---: | :---: |
| **$R_1$** | $a_1$ | $a_2$ | $b_{13}$ | $a_4$ |
| **$R_2$** | $b_{21}$ | $a_2$ | $a_3$ | $b_{24}$ |

#### Step 2: Applying Functional Dependency $FD_2: account\_id \to cust\_id$
- Both rows have the identical symbol $a_2$ for the determinant attribute $account\_id$.
- Therefore, the symbols in the dependent column $cust\_id$ must be equated.
- Since Row 2 already contains the distinguished symbol $a_3$, we replace the non-distinguished symbol $b_{13}$ in Row 1 with $a_3$.

**Updated Tableau:**

| Sub-relation | $txn\_id$ | $account\_id$ | $cust\_id$ | $amount$ |
| :---: | :---: | :---: | :---: | :---: |
| **$R_1$** | $a_1$ | $a_2$ | **$a_3$** | $a_4$ |
| **$R_2$** | $b_{21}$ | $a_2$ | $a_3$ | $b_{24}$ |

#### Step 3: Evaluation
- Row 1 now contains entirely distinguished symbols $(a_1, a_2, a_3, a_4)$ across all columns of $R$.
- **Theorem:** If the tableau algorithm produces at least one row containing all distinguished symbols, the decomposition is provably lossless.
- **Result:** The decomposition is mathematically proven **lossless**. $\blacksquare$

---

### 6.4 Verification Summary for Remaining Database Schemas

The identical intersection-closure criteria were evaluated across all remaining schema decompositions:

| Original Relation | Decomposed Relations ($R_1, R_2$) | Shared Attributes ($R_1 \cap R_2$) | Key Determination Property | Status |
| :--- | :--- | :--- | :--- | :---: |
| $R_{LOAN\_DEC}$ | $LOAN$ and $EMPLOYEE$ | $\{decided\_by\}$ (referencing $emp\_id$) | $decided\_by \to EMPLOYEE$ | **Lossless** |
| $R_{SR\_DEC}$ | $SERVICE\_REQUEST$ and $EMPLOYEE$ | $\{decided\_by\}$ (referencing $emp\_id$) | $decided\_by \to EMPLOYEE$ | **Lossless** |
| $R_{FD\_ACC}$ | $FIXED\_DEPOSIT$ and $ACCOUNT$ | $\{account\_id\}$ | $account\_id \to ACCOUNT$ | **Lossless** |
| $R_{BENEF\_CUST}$ | $BENEFICIARY$ and $CUSTOMER$ | $\{customer\_id\}$ | $customer\_id \to CUSTOMER$ | **Lossless** |
| $R_{AUDIT\_ACC}$ | $AUDIT\_LOG$ and $ACCOUNT$ | $\{account\_id\}$ | $account\_id \to ACCOUNT$ | **Lossless** |

**Conclusion:** Every decomposition executed within the MudraFlow database schema is mathematically lossless. Reconstructing original relationships via relational natural joins produces zero spurious records.

---

# 7. DEPENDENCY PRESERVING STEPS

### 7.1 Formal Definition of Dependency Preservation
Let $R$ be a relational schema with a set of functional dependencies $F$. A decomposition $D = \{R_1, R_2, \dots, R_k\}$ is **dependency-preserving** if the union of the projections of $F$ onto each individual relation $R_i$ logically implies all functional dependencies in $F$:
$$(F_1 \cup F_2 \cup \dots \cup F_k)^+ = F^+$$
Where $F_i = \Pi_{R_i}(F) = \{ X \to Y \mid (X \to Y) \in F^+ \text{ and } (X \cup Y) \subseteq R_i \}$.

If a decomposition is dependency-preserving, any update to a single relation $R_i$ can be checked for validity locally without requiring expensive multi-table relational joins.

---

### 7.2 Verification Algorithm and Projection Analysis
To test whether a dependency $X \to Y \in F$ is preserved across decomposition $D = \{R_1, R_2, \dots, R_k\}$:

```
Algorithm Test_Dependency_Preservation(X, Y, D, F):
  result = X
  repeat
    for each relation Ri in D:
      t = (result ∩ Ri)+ ∩ Ri
      result = result ∪ t
  until result does not change
  if Y ⊆ result:
    return PRESERVED
  else:
    return NOT_PRESERVED
```

---

### 7.3 Step-by-Step Dependency Preservation for Core Decompositions

#### Case 1: Core Banking Transaction Decomposition
Consider $R = \{ txn\_ref, account\_num, cust\_id, amount, balance, pan \}$ with functional dependency set:
$$F = \{ txn\_ref \to \{account\_num, amount\}, \; account\_num \to \{cust\_id, balance\}, \; cust\_id \to pan \}$$

Decomposed into:
- $R_1 (TXN) = \{ txn\_ref, account\_num, amount \}$
- $R_2 (ACCOUNT) = \{ account\_num, cust\_id, balance \}$
- $R_3 (CUSTOMER) = \{ cust\_id, pan \}$

**Step-by-Step Dependency Preservation Verification:**

1. **Test $FD_1: txn\_ref \to \{account\_num, amount\}$:**
   - Both LHS $\{txn\_ref\}$ and RHS $\{account\_num, amount\}$ are entirely contained within $R_1$:
     $$\{txn\_ref, account\_num, amount\} \subseteq R_1$$
   - Thus, $FD_1 \in \Pi_{R_1}(F)$. **Preserved locally within $R_1$.**

2. **Test $FD_2: account\_num \to \{cust\_id, balance\}$:**
   - Both LHS $\{account\_num\}$ and RHS $\{cust\_id, balance\}$ are entirely contained within $R_2$:
     $$\{account\_num, cust\_id, balance\} \subseteq R_2$$
   - Thus, $FD_2 \in \Pi_{R_2}(F)$. **Preserved locally within $R_2$.**

3. **Test $FD_3: cust\_id \to pan$:**
   - Both LHS $\{cust\_id\}$ and RHS $\{pan\}$ are entirely contained within $R_3$:
     $$\{cust\_id, pan\} \subseteq R_3$$
   - Thus, $FD_3 \in \Pi_{R_3}(F)$. **Preserved locally within $R_3$.**

4. **Aggregate Evaluation:**
   $$(F_1 \cup F_2 \cup F_3) = \{ txn\_ref \to \{account\_num, amount\}, \; account\_num \to \{cust\_id, balance\}, \; cust\_id \to pan \} = F$$
   $$(F_1 \cup F_2 \cup F_3)^+ = F^+$$
   **Result:** The decomposition is **strictly dependency-preserving**. $\blacksquare$

---

#### Case 2: Branch & IFSC Decomposition
Consider $R_{BR} = \{ branch\_id, branch\_name, ifsc, city \}$ with:
$$F = \{ branch\_id \to \{branch\_name, ifsc, city\}, \; ifsc \to \{branch\_id, branch\_name, city\} \}$$

- Here, both candidate keys determine the entire relation.
- Since $BRANCH$ is kept as a unified relation without further column separation, all dependencies involving $branch\_id$ and $ifsc$ are preserved locally within the table schema via the `PRIMARY KEY (branch_id)` and `UNIQUE KEY (ifsc)` constraints.
- **Result:** **Strictly dependency-preserving**. $\blacksquare$

---

### 7.4 Global Dependency Preservation Assessment

Across the entire 10-table relational schema of MudraFlow, every declared functional dependency belongs to the projected dependency set of an individual table:

| Functional Dependency | Target Table Housing Dependency | Preservation Mechanism in MySQL | Status |
| :--- | :--- | :--- | :---: |
| $customer\_id \to \{name, dob, email, phone, pan, address\}$ | `customer` | Primary Key constraint | **Preserved** |
| $pan \to customer\_id$, $email \to customer\_id$ | `customer` | Unique Index / Constraint | **Preserved** |
| $account\_id \to \{account\_num, cust\_id, branch\_id, balance\}$ | `account` | Primary Key constraint | **Preserved** |
| $account\_num \to account\_id$ | `account` | Unique Index / Constraint | **Preserved** |
| $branch\_id \to \{name, ifsc, city\}$, $ifsc \to branch\_id$ | `branch` | Primary Key & Unique Key | **Preserved** |
| $txn\_id \to \{ref\_no, from\_acc, to\_acc, amount, mode, date\}$ | `txn` | Primary Key constraint | **Preserved** |
| $reference\_no \to txn\_id$ | `txn` | Unique Index / Constraint | **Preserved** |
| $(customer\_id, account\_number) \to beneficiary\_id$ | `beneficiary` | Composite Unique Index | **Preserved** |
| $fd\_id \to \{cust\_id, acc\_id, amount, rate, tenure, maturity\}$ | `fixed_deposit` | Primary Key constraint | **Preserved** |
| $loan\_id \to \{cust\_id, acc\_id, amount, rate, status, decider\}$ | `loan` | Primary Key constraint | **Preserved** |
| $request\_id \to \{cust\_id, acc\_id, type, card\_num, status\}$ | `service_request` | Primary Key constraint | **Preserved** |
| $audit\_id \to \{acc\_id, txn\_id, old\_bal, new\_bal, timestamp\}$ | `audit_log` | Primary Key constraint | **Preserved** |

**Conclusion:** MudraFlow achieves both a **Lossless Join Decomposition** and complete **Dependency Preservation** across all 10 schema relations. This guarantees both relational correctness and high-performance local constraint validation.

---

# 8. MINIMAL COVER OF EACH TABLE

### 8.1 Algorithm for Canonical / Minimal Cover Derivation
A **minimal cover** (also called a **canonical cover**) $F_c$ for a set of functional dependencies $F$ is an equivalent, non-redundant minimal set of functional dependencies satisfying three strict criteria:
1. **Singleton RHS (Canonical Rule):** Every functional dependency in $F_c$ has exactly one attribute on its right-hand side ($X \to A$).
2. **No Extraneous LHS Attributes:** For every $X \to A \in F_c$, there is no attribute $B \in X$ such that $(F - \{X \to A\}) \cup \{(X - \{B\}) \to A\}$ is logically equivalent to $F$.
3. **No Redundant Dependencies:** No functional dependency $X \to A \in F_c$ can be removed without strictly diminishing the closure $F^+$.

#### Standard Algorithmic Steps:
- **Step 1:** Apply decomposition rule to split all right-hand side attributes into singletons: $X \to \{A_1, A_2, \dots, A_n\} \implies X \to A_1, X \to A_2, \dots, X \to A_n$.
- **Step 2:** For each dependency $X \to A$ with $|X| > 1$, check if any attribute $B \in X$ is extraneous by computing $(X - \{B\})^+_F$; if $A \in (X - \{B\})^+_F$, replace $X \to A$ with $(X - \{B\}) \to A$.
- **Step 3:** For each remaining dependency $X \to A$, check if it is redundant by computing $X^+_{(F - \{X \to A\})}$; if $A \in X^+_{(F - \{X \to A\})}$, eliminate $X \to A$.

---

### 8.2 Detailed Minimal Cover Derivation: `customer` Relation

Let relation $CUSTOMER$ have attributes:
$$CUST = \{ customer\_id, full\_name, dob, email, phone, pan, address \}$$
Abbreviated as: $\{ C, N, D, E, P, A, H \}$ where $C = customer\_id, N = full\_name, D = dob, E = email, P = phone, A = pan, H = address$.

Initial Functional Dependency Set $F$:
1. $C \to \{ N, D, E, P, A, H \}$
2. $A \to \{ C, N, D, E, P, H \}$
3. $E \to \{ C, N, D, P, A, H \}$
4. $\{C, A\} \to N$ (Composite dependency introduced for analysis)
5. $A \to C$

#### Step 1: Decomposition Rule (Split RHS into Singletons)
- $C \to N, \; C \to D, \; C \to E, \; C \to P, \; C \to A, \; C \to H$
- $A \to C, \; A \to N, \; A \to D, \; A \to E, \; A \to P, \; A \to H$
- $E \to C, \; E \to N, \; E \to D, \; E \to P, \; E \to A, \; E \to H$
- $\{C, A\} \to N$

#### Step 2: Elimination of Extraneous Attributes
Consider the dependency $\{C, A\} \to N$:
- Test if $C$ is extraneous: Compute $\{A\}^+_F$.
  Since $A \to C$ and $C \to N$, $\{A\}^+_F$ contains $N$. Hence, $C$ is extraneous on the LHS.
- Replace $\{C, A\} \to N$ with $A \to N$ (which is already present in the set).

#### Step 3: Elimination of Redundant Dependencies
Notice that $A \to C$ and $C \to \{ N, D, E, P, A, H \}$:
- Test redundancy of $A \to N$:
  Compute $A^+_{(F - \{A \to N\})}$. Since $A \to C$ is kept and $C \to N$ is kept, $A^+ = \{A, C, N, \dots\}$, meaning $N$ is still reachable. Thus, $A \to N$ is redundant!
- By the identical logic, all dependencies $A \to D, A \to E, A \to P, A \to H$ are redundant because $A \to C$ transitively reaches all customer attributes via $C$.
- Similarly, for candidate key $E$ (email): $E \to C$ is sufficient; $E \to N, E \to D, E \to P, E \to A, E \to H$ are all redundant through $C$.
- Test redundancy of $C \to A$:
  Compute $C^+_{(F - \{C \to A\})}$. Does $C$ reach $A$ without $C \to A$?
  $C \to E$ and $E \to C$; neither reaches $A$ without an explicit dependency. Hence $C \to A$ is non-redundant.

#### Final Canonical Minimal Cover for `customer`:
$$F_c(CUSTOMER) = \begin{cases}
customer\_id \to full\_name \\
customer\_id \to dob \\
customer\_id \to email \\
customer\_id \to phone \\
customer\_id \to pan \\
customer\_id \to address \\
pan \to customer\_id \\
email \to customer\_id
\end{cases}$$

---

### 8.3 Detailed Minimal Cover Derivation: `account` Relation

Attributes: $\{ account\_id, account\_num, cust\_id, branch\_id, acc\_type, balance, status, opened\_on \}$  
Abbreviated as: $\{ AID, ANUM, CID, BID, TYPE, BAL, STAT, DATE \}$.

Initial Dependency Set:
1. $AID \to \{ ANUM, CID, BID, TYPE, BAL, STAT, DATE \}$
2. $ANUM \to \{ AID, CID, BID, TYPE, BAL, STAT, DATE \}$
3. $\{ AID, ANUM \} \to BAL$ (Test composite)

#### Step 1: Split RHS into Singletons
- $AID \to ANUM, AID \to CID, AID \to BID, AID \to TYPE, AID \to BAL, AID \to STAT, AID \to DATE$
- $ANUM \to AID, ANUM \to CID, ANUM \to BID, ANUM \to TYPE, ANUM \to BAL, ANUM \to STAT, ANUM \to DATE$
- $\{ AID, ANUM \} \to BAL$

#### Step 2: Remove Extraneous Attributes
In $\{ AID, ANUM \} \to BAL$:
- Since $AID \to ANUM$, $\{AID\}^+ = \{AID, ANUM, \dots, BAL\}$. Thus, $ANUM$ is extraneous.
- The dependency reduces to $AID \to BAL$, which is already in the set.

#### Step 3: Remove Redundant Dependencies
- Since $ANUM \to AID$, computing $ANUM^+_{(F - \{ANUM \to BAL\})}$ yields $ANUM \to AID \to BAL$.
- Hence, all RHS attributes for $ANUM$ except $ANUM \to AID$ are redundant.

#### Final Canonical Minimal Cover for `account`:
$$F_c(ACCOUNT) = \begin{cases}
account\_id \to account\_number \\
account\_id \to customer\_id \\
account\_id \to branch\_id \\
account\_id \to account\_type \\
account\_id \to balance \\
account\_id \to status \\
account\_id \to opened\_on \\
account\_number \to account\_id
\end{cases}$$

---

### 8.4 Detailed Minimal Cover Derivation: `branch` Relation

Attributes: $\{ branch\_id, branch\_name, ifsc, city \}$  
Abbreviated as: $\{ BID, NAME, IFSC, CITY \}$.

Initial Dependencies:
1. $BID \to \{ NAME, IFSC, CITY \}$
2. $IFSC \to \{ BID, NAME, CITY \}$

Following the singleton split and transitive redundancy elimination:
- $IFSC \to BID$ alongside $BID \to \{NAME, CITY\}$ renders $IFSC \to NAME$ and $IFSC \to CITY$ redundant.

#### Final Canonical Minimal Cover for `branch`:
$$F_c(BRANCH) = \begin{cases}
branch\_id \to branch\_name \\
branch\_id \to ifsc \\
branch\_id \to city \\
ifsc \to branch\_id
\end{cases}$$

---

### 8.5 Minimal Covers for Remaining Relations

Applying the canonical derivation algorithm to the remaining schema tables yields the following minimal covers:

#### 1. Minimal Cover: `employee`
$$F_c(EMPLOYEE) = \{ emp\_id \to full\_name, \; emp\_id \to role, \; emp\_id \to branch\_id, \; emp\_id \to password\_hash \}$$

#### 2. Minimal Cover: `txn` (Transaction Ledger)
$$F_c(TXN) = \begin{cases}
txn\_id \to reference\_no \\
txn\_id \to from\_account\_id \\
txn\_id \to to\_account\_id \\
txn\_id \to receiver\_name \\
txn\_id \to amount \\
txn\_id \to mode \\
txn\_id \to txn\_type \\
txn\_id \to remarks \\
txn\_id \to created\_at \\
reference\_no \to txn\_id
\end{cases}$$

#### 3. Minimal Cover: `beneficiary`
$$F_c(BENEFICIARY) = \begin{cases}
beneficiary\_id \to customer\_id \\
beneficiary\_id \to name \\
beneficiary\_id \to account\_number \\
beneficiary\_id \to ifsc \\
beneficiary\_id \to added\_on \\
\{ customer\_id, account\_number \} \to beneficiary\_id
\end{cases}$$

#### 4. Minimal Cover: `fixed_deposit`
$$F_c(FIXED\_DEPOSIT) = \begin{cases}
fd\_id \to customer\_id, \quad fd\_id \to account\_id, \quad fd\_id \to amount \\
fd\_id \to rate, \quad fd\_id \to tenure\_months, \quad fd\_id \to start\_date \\
fd\_id \to maturity\_date, \quad fd\_id \to maturity\_amount \\
fd\_id \to maturity\_instruction, \quad fd\_id \to status
\end{cases}$$

#### 5. Minimal Cover: `loan`
$$F_c(LOAN) = \begin{cases}
loan\_id \to customer\_id, \quad loan\_id \to account\_id, \quad loan\_id \to amount \\
loan\_id \to purpose, \quad loan\_id \to duration\_months, \quad loan\_id \to rate \\
loan\_id \to employment\_status, \quad loan\_id \to annual\_income \\
loan\_id \to status, \quad loan\_id \to applied\_on, \quad loan\_id \to decided\_by \\
loan\_id \to decided\_on
\end{cases}$$

#### 6. Minimal Cover: `service_request`
$$F_c(SERVICE\_REQUEST) = \begin{cases}
request\_id \to customer\_id, \quad request\_id \to account\_id \\
request\_id \to request\_type, \quad request\_id \to delivery\_address \\
request\_id \to card\_number, \quad request\_id \to card\_expiry \\
request\_id \to status, \quad request\_id \to requested\_on \\
request\_id \to decided\_by, \quad request\_id \to decided\_on
\end{cases}$$

#### 7. Minimal Cover: `audit_log`
$$F_c(AUDIT\_LOG) = \begin{cases}
audit\_id \to account\_id \\
audit\_id \to txn\_id \\
audit\_id \to old\_balance \\
audit\_id \to new\_balance \\
audit\_id \to changed\_at
\end{cases}$$

---

# 9. IMPLEMENTATION & ADVANCED DATABASE OBJECTS

### 9.1 Stored Procedures for Atomic Transactions
All monetary adjustments execute exclusively inside MySQL 8 stored procedures defined with `SQL SECURITY DEFINER`. 

#### Concurrency and Deadlock Prevention Algorithm in `sp_transfer`:
When two accounts transfer money simultaneously (e.g., Account 1 sends to Account 2 while Account 2 sends to Account 1), acquiring locks in arbitrary order creates a fatal deadlock cycle. MudraFlow eliminates this vulnerability by sorting account IDs and acquiring pessimistic locks in **strictly ascending numeric order**:

```sql
-- Excerpt from sp_transfer illustrating Ordered Pessimistic Locking:
IF p_from_account_id < v_to_account_id THEN
    SELECT balance, status INTO v_from_balance, v_from_status 
    FROM account WHERE account_id = p_from_account_id FOR UPDATE;
    
    SELECT balance, status INTO v_to_balance, v_to_status 
    FROM account WHERE account_id = v_to_account_id FOR UPDATE;
ELSE
    SELECT balance, status INTO v_to_balance, v_to_status 
    FROM account WHERE account_id = v_to_account_id FOR UPDATE;
    
    SELECT balance, status INTO v_from_balance, v_from_status 
    FROM account WHERE account_id = p_from_account_id FOR UPDATE;
END IF;
```

#### Complete Suite of 7 Stored Procedures:
1. `sp_register_customer`: Atomically creates customer, allocates account, logs opening deposit, and credits balance.
2. `sp_open_account`: Opens a secondary account funded via an atomic transfer from an existing account.
3. `sp_transfer`: Executes inter-account transfers with limit checking, dual row locking, ledger insertion, and balance adjustment.
4. `sp_create_fd`: Debits source account, computes maturity value using `get_fd_rate()`, and records term deposit.
5. `sp_approve_loan`: Validates pending status, updates underwriting record, and dispatches principal credit to account.
6. `sp_decide_service_request`: Approves debit cards (generating 16-digit card number and expiry) or cheque books.
7. `sp_process_maturities`: Automated batch cursor settling matured FDs (executing either credit refund or auto-renewal).

### 9.2 Stored Functions, Triggers, Views & Indexing

#### Deterministic Stored Functions:
- `get_fd_rate(p_tenure_months INT) RETURNS DECIMAL(4,2)`:
  Returns 6.50% (<=6m), 7.00% (<=12m), 7.50% (<=24m), and 7.75% (>24m).
- `get_loan_rate(p_duration_months INT) RETURNS DECIMAL(4,2)`:
  Returns 10.00% (<=12m), 11.00% (<=36m), and 12.00% (>36m).

#### Automated Database Triggers:
1. `trg_account_audit`:
   `AFTER UPDATE ON account FOR EACH ROW`
   Detects if `OLD.balance <> NEW.balance`, automatically inserting an audit record into `audit_log` with `old_balance`, `new_balance`, and `@current_txn_id`.
2. `trg_txn_block_frozen`:
   `BEFORE INSERT ON txn FOR EACH ROW`
   Inspects status of both sender and receiver accounts; if either is `FROZEN`, raises SQL error `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is frozen'`.

#### Unified Application View:
`v_applications`: Executes a `UNION ALL` combining pending/approved loans and service requests into a unified stream for customer tracking:
```sql
CREATE VIEW v_applications AS
SELECT 'LOAN' AS app_type, loan_id AS app_id, customer_id, account_id,
       CONCAT('Loan of ₹', amount, ' for ', purpose) AS summary, status, applied_on AS submitted_at
FROM loan
UNION ALL
SELECT request_type AS app_type, request_id AS app_id, customer_id, account_id,
       CONCAT(request_type, ' request') AS summary, status, requested_on AS submitted_at
FROM service_request;
```

#### Performance B-Tree Indexes:
- `CREATE INDEX idx_account_customer ON account(customer_id);`
- `CREATE INDEX idx_txn_from_date ON txn(from_account_id, created_at);`
- `CREATE INDEX idx_txn_to_date ON txn(to_account_id, created_at);`
- `CREATE INDEX idx_txn_created ON txn(created_at);`
- `CREATE INDEX idx_fd_maturity ON fixed_deposit(status, maturity_date);`

### 9.3 Column-Level Access Control & Privileges
To enforce the architectural boundary that staff and application layers cannot tamper with balances directly:
```sql
-- Application role configuration
CREATE USER 'mudraflow_app'@'%' IDENTIFIED BY 'AppPassword123!';
GRANT SELECT ON mudraflow.* TO 'mudraflow_app'@'%';
GRANT INSERT ON mudraflow.beneficiary TO 'mudraflow_app'@'%';
GRANT INSERT ON mudraflow.loan TO 'mudraflow_app'@'%';
GRANT INSERT ON mudraflow.service_request TO 'mudraflow_app'@'%';
GRANT UPDATE (failed_attempts, locked_until) ON mudraflow.customer TO 'mudraflow_app'@'%';
GRANT UPDATE (status) ON mudraflow.account TO 'mudraflow_app'@'%';
GRANT EXECUTE ON PROCEDURE mudraflow.sp_transfer TO 'mudraflow_app'@'%';
GRANT EXECUTE ON PROCEDURE mudraflow.sp_register_customer TO 'mudraflow_app'@'%';
GRANT EXECUTE ON PROCEDURE mudraflow.sp_create_fd TO 'mudraflow_app'@'%';
GRANT EXECUTE ON PROCEDURE mudraflow.sp_approve_loan TO 'mudraflow_app'@'%';
-- Explicitly: NO UPDATE ON account(balance), NO DELETE on any table!
```

---

# 10. RESULTS & SYSTEM VERIFICATION

### 10.1 UI Verification and Transaction Execution
The live application at **https://mudra-flow.vercel.app/** was tested across complete customer and administrative lifecycles:

1. **Customer Registration & Onboarding:** Successfully provisioned demo customer accounts with instant verification, opening balance crediting, and dynamic account number generation.
2. **Direct and Payee Fund Transfers:** Tested IMPS (instant transfer under ₹5 Lakh limit), NEFT, and RTGS (minimum ₹2 Lakh limit). Transfer receipts with transaction reference codes were cleanly generated and verified against the database ledger.
3. **Ledger Statement Display:** The customer transaction history reflects running balance calculations matching every debit and credit.
4. **Staff Dashboard & Workflow Decisions:** Staff successfully reviewed pending loan applications, triggering automated balance credits, and approved debit card requests, generating simulated active cards.

### 10.2 Concurrency & Stress Verification Tests

#### Test 1: The Ledger Invariant Verification
Executed SQL verification ensuring zero discrepancy between recorded balances and ledger sums across all accounts:
```sql
SELECT a.account_id, a.balance,
       COALESCE(c.credits, 0) - COALESCE(d.debits, 0) AS computed_balance
FROM account a
LEFT JOIN (SELECT to_account_id AS id, SUM(amount) AS credits FROM txn 
           WHERE to_account_id IS NOT NULL GROUP BY to_account_id) c ON c.id = a.account_id
LEFT JOIN (SELECT from_account_id AS id, SUM(amount) AS debits FROM txn 
           WHERE from_account_id IS NOT NULL GROUP BY from_account_id) d ON d.id = a.account_id
WHERE a.balance <> (COALESCE(c.credits, 0) - COALESCE(d.debits, 0));
-- Output: 0 rows returned (Invariant Holds 100% across all accounts).
```

#### Test 2: Simultaneous Concurrent Transfers (Double-Spend Test)
- Account $X$ provisioned with ₹10,000 balance.
- Two simultaneous execution threads initiated via Postman calling `sp_transfer` for ₹8,000 each.
- **Result:** Thread 1 acquired the exclusive row lock, debited ₹8,000, and committed. Thread 2 waited on the lock, was granted access following commit, evaluated remaining balance (₹2,000 < ₹8,000), and rolled back cleanly with custom error message: *"Insufficient balance"*. The balance remained strictly ₹2,000; double-spending was completely prevented.

#### Test 3: Deadlock Elimination under Bidirectional Transfers
- 100 concurrent asynchronous transfers simulated where Account $A$ sends to Account $B$ while Account $B$ sends to Account $A$.
- **Result:** Due to ascending primary key locking (`p_from_account_id < v_to_account_id`), zero deadlocks occurred (`Deadlock found when trying to get lock` error count = 0).

---

# 11. CONCLUSION, LIMITATIONS & FUTURE SCOPE

### 11.1 Conclusion
The MudraFlow project demonstrates a rigorous, database-centric implementation of a modern core banking transactional engine. By transitioning critical business logic from external application code into MySQL 8 stored procedures, the architecture guarantees ACID transactional integrity, eliminates concurrency race conditions, and guarantees strict adherence to the fundamental banking ledger invariant.

The conceptual model was translated into ten normalized relational tables satisfying both Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF). All decompositions were mathematically proven to be lossless and dependency-preserving, and canonical minimal covers were derived for each relation. With automated trigger-based audit logging, deterministic rate functions, composite query indexes, and restricted column-level access privileges, MudraFlow models enterprise-grade database design suitable for core financial operations.

### 11.2 Limitations
- **Simulation Environment:** The project is deployed as an educational demonstration; no real-world central clearing house or financial payment network (e.g., NPCI, RBI gateway) is connected.
- **Fixed Demo Verification:** A deterministic demo OTP (`123456`) is utilized in place of real SMS/telephony gateways.
- **Interest Computation:** Fixed deposit interest is calculated via simple interest rather than multi-frequency compounding.
- **Functional Exclusions:** Features such as customer profile editing, self-service debit card blocking, and real-time biometric KYC integration were intentionally omitted to maintain strict focus on core DBMS primitives.

### 11.3 Future Scope
- **Real-Time Payment Integration:** Connecting mock NPCI UPI and ISO 8583 switch protocols for external bank interoperability.
- **Automated Fraud Scoring:** Deploying machine learning classification triggers to flag anomalous high-velocity transaction patterns.
- **Read-Replica Clustering:** Implementing MySQL Master-Slave replication to offload heavy statement reporting queries from the primary transactional read-write cluster.
- **Compound Interest Schedules:** Extending stored procedures to process daily compound interest accreting dynamically into savings accounts.

---

### REFERENCES
1. Silberschatz, A., Korth, H. F., & Sudarshan, S. *Database System Concepts*, 7th Edition, McGraw-Hill.
2. Elmasri, R., & Navathe, S. B. *Fundamentals of Database Systems*, 7th Edition, Pearson.
3. MySQL 8.0 Reference Manual: *InnoDB Locking and Transaction Model*, Oracle Corporation.
4. MudraFlow Project Live Deployment: [https://mudra-flow.vercel.app/](https://mudra-flow.vercel.app/)
5. MudraFlow Project Source Code: [https://github.com/Kushagra-Mittal-07/MudraFlow](https://github.com/Kushagra-Mittal-07/MudraFlow)
