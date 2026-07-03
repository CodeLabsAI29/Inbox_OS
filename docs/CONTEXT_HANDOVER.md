# InboxOS B5 Section Handover Context & Execution Plan

This document serves as a handover context and execution plan for the remaining subtasks of the **B5 — Beginner Security/QA** section of InboxOS.

---

## 📅 Handover Date & Time
* **Current Local Time:** Friday, July 3, 2026, 12:12 AM (local time)

---

## 🚦 Current Progress Summary

All tasks completed so far have been verified and committed to the `refine` branch:

- [x] **Subtask 1.1 & 1.2: Setup ESLint & Prettier** (ESLint and Prettier configured for backend/frontend with lint/format scripts).
- [x] **Subtask 2.1 & 2.2: Setup backend Jest Unit Tests** (Jest, Supertest, transpileOnly, in-band execution, and mock database context configured).
  - *All Backend unit tests pass (10/10 passing specs) including Health, Profile, and Email Search APIs.*
- [x] **Subtask 3.1 & 3.2: E2E Testing with Cypress** (Cypress E2E testing framework installed, configured via `cypress.config.cjs`, and isolated login E2E test `login.cy.js` verified with 100% passing rate).

---

## 📋 Remaining Execution Plan

### 1️⃣ Prompt 5: Check Vulnerabilities [Easy]
* **Stack:** npm, GitHub Actions
* **Task:** Enforce dependency security in the CI pipeline.
* **Step-by-Step Instructions:**
  1. Open the existing CI workflow file: [ci.yml](file:///c:/project/inboxos/InboxOS/infrastructure/github/workflows/ci.yml).
  2. Add steps for backend dependency audit:
     ```yaml
     - name: Audit Backend Dependencies
       working-directory: ./backend
       run: npm audit --audit-level=high
     ```
  3. Add steps for frontend dependency audit:
     ```yaml
     - name: Audit Frontend Dependencies
       working-directory: ./frontend
       run: npm audit --audit-level=high
     ```
* **Constraints:**
  - Do not fail the build for `low` or `moderate` vulnerabilities. Using `--audit-level=high` ensures the audit tool only exits with error code 1 (failing the action) if high or critical vulnerabilities are detected.

---

### 2️⃣ Prompt 6: Password Strength Utility [Easy]
* **Stack:** TypeScript, Jest (Backend)
* **Task:** Implement a synchronous password strength checker with corresponding unit tests.
* **Step-by-Step Instructions:**
  1. Create a pure utility file `backend/src/utils/password-strength.ts`:
     - Implement `checkPasswordStrength(password: string): number` returning a score between `0` and `5`.
     - Score points for satisfying the following criteria (1 point each):
       - Length > 8 characters
       - Contains at least one uppercase letter
       - Contains at least one lowercase letter
       - Contains at least one number
       - Contains at least one special character (e.g. `!@#$%^&*(),.?":{}|<>`)
  2. Create a test file `backend/src/__tests__/password-strength.test.ts`:
     - Write Jest unit tests testing different boundary cases (e.g., all lowercase, empty password, fully strong password, etc.).
  3. Run `npm test` inside the `backend` folder to verify that the tests execute and pass successfully.

---

## 📌 Branch & Status Info
* **Active Branch:** `refine`
* **Working Tree:** Clean (all changes to date committed)
* **Next Commit Triggers:**
  - Commit after completing Prompt 5 CI changes: `feat(ci): integrate npm audit for high vulnerabilities`
  - Commit after completing Prompt 6 Password Strength: `feat(backend): implement password strength utility and tests`
