# MudraFlow: standing rules for every agent

MudraFlow is an online banking system built as a **DBMS semester project**. Stack: MySQL 8 (InnoDB), Node.js with Express, React with Vite. The database is the star; the backend and UI are thin layers on top.

Folders: `/spec` (all specifications), `/db` (SQL, seed, tests), `/backend`, `/frontend`, `/docs`.

## Always do this first
Read `spec/README.md`, then read the spec file(s) named in the prompt for the current task. The specs are the source of truth. Do not rely on memory of earlier conversations.

## Rules
1. **Balances change only inside stored procedures.** Never write `UPDATE account SET balance` in backend code. The app connects as `mudraflow_app`, never as root.
2. **Do only the task in the prompt.** Follow `spec/06-tasks.md` order. Do not start the next phase. When finished, stop and report.
3. **Do not add features that are not in the spec.** Deliberately cut: PIN, OtpRequest table, InterestRate table, fraud alerts, Help page, card block/unblock, profile editing, top customers, 7-day chart.
4. **Run the tests and show the real output.** Never say something passes unless you ran it. If a test fails, fix it and rerun.
5. **Keep code simple and commented.** The student must explain every procedure, trigger and query in a viva. Prefer clear code over clever code. Comment WHY, not just what.
6. **Passwords are hashed with bcrypt in the backend. The demo OTP is always `123456`.** No secrets in code; use `.env` and keep `.env.example` current.
7. **UI:** `spec/05-ui.md` defines layouts. The images in `spec/design-reference` are for visual style only (palette, fonts, stamps, ledger tables, slip edge). Do not copy their layouts or content.
8. If the spec is unclear or contradicts itself, write your assumption in `ASSUMPTIONS.md` and continue. Do not silently invent behaviour.
9. Commit after each finished phase with a clear message, only when the gate tests pass.
