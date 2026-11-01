# MudraFlow: instructions for the AI builder

MudraFlow is an online banking system built as a **DBMS semester project** (MySQL 8, InnoDB). The database is the star. The backend and UI are thin layers on top of it.

## Read these files in order before writing any code

1. `01-overview.md`: what we're building, money rules, scope
2. `02-flows.md`: customer and staff flows
3. `03-database.md`: tables, procedures, functions, triggers, view, indexes, seed data
4. `04-api.md`: backend endpoints
5. `05-ui.md`: the "Passbook" UI (tokens, components, every screen)
6. `06-tasks.md`: build order with gates
7. `07-testing.md`: test cases that must pass
8. `er-diagram/`: ER diagram (PNG and SVG)
9. `design-reference/`: four screenshots used **only for visual style** (palette, fonts, stamps, ledger tables, slip edge). Do not copy their layouts or content; layouts are defined in `05-ui.md`

## Hard rules

1. **Balances change only inside stored procedures.** Never write `UPDATE account SET balance` in backend code. The app's MySQL user must not have UPDATE permission on `account.balance` (see `03-database.md`, section 9).
2. **Follow `06-tasks.md` in order.** Do not start the next phase until the current phase's tests pass. Show the test output.
3. **Do not add features that are not in the spec.** These were deliberately cut: PIN, OtpRequest table, InterestRate table, FraudAlert table and trigger, Help page, card block/unblock, profile editing, top customers, 7-day chart.
4. **Keep the code simple and commented.** The student must be able to explain every procedure, trigger and query in a viva. Prefer clear SQL over clever SQL.
5. **Seed data goes through the stored procedures**, never through raw `INSERT INTO account ... balance`. This keeps the ledger consistent.
6. If something in the spec is unclear, write your assumption in `ASSUMPTIONS.md` and continue. Do not silently invent features.
7. Passwords are hashed with bcrypt in the backend. The demo OTP is always `123456`.
