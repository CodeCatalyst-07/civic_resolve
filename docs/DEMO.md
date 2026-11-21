# CivicResolve Evaluator & Demo Guide

CivicResolve is pre-configured with deterministic seed data and automated verification scripts for hackathon evaluators and code reviewers.

---

## 1. Quick Verification Commands

```bash
# 1. Print domain decision engine matrix on real fixture complaints:
npm run demo:samples

# 2. Re-seed local memory repository with 39 deterministic tickets:
npm run seed -- --driver memory

# 3. Scan codebase for credentials or secret leaks:
npm run secrets:check

# 4. Run full test suite across packages (all offline, zero network dependencies):
npm run test
```

---

## 2. Deterministic Seed Tickets Reference

When the API initializes (or via `npm run seed -- --driver memory`), 39 realistic civic grievances are deterministically loaded into the repository.
Use these deterministic Crockford Base32 ticket IDs on the web portal:

| Scenario | Ticket ID | Status | Urgency | Department | Key Verification Points |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Emergency Life-Safety Hazard** | `CR-4MS3YK2S` | `in_progress` | `critical` | Public Health & Safety | Red emergency banner with **Call 112** guidance; SLA 24h countdown. |
| **Duplicate Cluster Primary** | `CR-99BP8WBY` | `assigned` | `high` | Roads & Infrastructure | Indiranagar school pothole; shows **4 duplicate reports** aggregated under one ticket. |
| **Overdue Grievance (Escalated)** | `CR-VVNZG18J` | `assigned` | `high` | Public Street Lighting | Whitefield dark corridor; SLA 72h exceeded, **Overdue badge** & automated escalation logged. |
| **Reopened Grievance** | `CR-9ND6EX41` | `reopened` | `high` | Roads & Infrastructure | Sector 1 road trench; displays citizen dissatisfaction audit note on timeline. |
| **Resolved Grievance (Reopen Ready)**| `CR-QK4XDRZG` | `resolved` | `high` | Roads & Infrastructure | Defense Colony road repair; **"Reopen Issue"** action available for citizen feedback. |
| **Rejected Outlier (Non-Civic)** | `CR-JYJB3FPB` | `rejected` | `low` | Local Ward Nodal Office | Commercial billboard dispute; displays municipal boundary guidance. |

---

## 3. Step-by-Step UI Verification Flows

### Flow A: Citizen Grievance Tracking (`/track`)
1. Open [http://localhost:5173/track](http://localhost:5173/track).
2. Enter `CR-4MS3YK2S` in the search field and submit.
3. **Verify:**
   - Red **Immediate Danger** callout with National Emergency Helpline `112` and warning icon.
   - Status badge shows `Work in Progress`.
   - SLA countdown target displays remaining hours with tabular numerals.
   - Crockford Base32 ID copy button shows accessible copy confirmation toast.

### Flow B: Citizen Reopen Lifecycle (`/track`)
1. Open [http://localhost:5173/track/CR-QK4XDRZG](http://localhost:5173/track/CR-QK4XDRZG).
2. Note that status is `Resolved` and supervisor resolution note is displayed.
3. Click the **"Reopen Issue"** button to open the accessible modal dialog.
4. Enter reason: `"Asphalt sank again after evening rain"` and confirm.
5. **Verify:**
   - Ticket status immediately updates to `Reopened by Citizen`.
   - Timeline audit trail prepends a new event authored by `Citizen` with the entered note.
   - Reopen button is disabled (each ticket permits controlled reopen cycles).

### Flow C: Guided Citizen Intake with Sensitive Site Location Boost (`/report`)
1. Open [http://localhost:5173/report](http://localhost:5173/report).
2. In **Step 1 (Describe Issue)**, enter:
   `"Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck."`
3. Click **"Next: Location"**.
4. In **Step 2 (Location)**, select Ward: `Ward 12 - Indiranagar`.
5. Click **"Review AI Analysis"**.
6. **Verify:**
   - Step 3 loads instantly with triage assessment:
     - Category: `Pothole`
     - Urgency: `High` (boosted from Medium due to proximity to school sensitive site)
     - Applied Rules: `R4_DUPLICATE_BOOST` or location boost rule
     - Dispatched Department: `Roads & Infrastructure`
7. Click **"Confirm and Submit Report"**.
8. **Verify:**
   - Step 4 (Receipt) displays an unguessable 8-character Crockford ID (e.g. `CR-XXXXXXXX`).
   - One-click button navigates directly to live tracking view.

### Flow D: Authority Dashboard & Work Queue (`/authority`)
1. Click the role selector in the top navbar and switch from **Citizen** to **Authority**.
2. Enter your evaluator authority access code (configured via `DEMO_AUTHORITY_CODE` in `.env`, defaults to `change-me-demo-code` in local dev).
3. Navigate to [http://localhost:5173/authority](http://localhost:5173/authority).
4. **Verify:**
   - Top KPI cards display: **Open reports**, **Critical**, **Overdue**, and **Resolved (Last 7 Days)**.
   - Clicking **"Overdue"** or **"Critical"** filter tiles immediately filters the work queue table.
   - Click any table row to open the Radix-powered slide-over detail panel (`TicketDetailSheet`):
     - Displays AI suggestion vs Final decision comparison table.
     - Displays full citizen report and map coordinates.
     - Displays legal status transition dropdown (derived from `/api/meta`).
     - Updating status updates both table row and detail panel with 409 conflict safety.
