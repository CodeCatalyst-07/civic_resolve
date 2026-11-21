# CivicResolve Accessibility Conformance Report (WCAG 2.2 AA)

CivicResolve is built to be accessible to all citizens and municipal officers, including individuals with visual, motor, auditory, or cognitive disabilities, elderly users, and users accessing municipal portals from low-bandwidth mobile devices or screen readers.

---

## 1. Conformance Status

- **Standard**: Web Content Accessibility Guidelines (WCAG) 2.2 Level AA
- **Automated Audit**: 0 violations reported across all components and pages via `vitest-axe` (axe-core engine)
- **Contrast Ratios**: Verified programmatically with exact W3C sRGB relative luminance formula. All text-on-background pairs achieve $\ge 4.5:1$ and all interactive UI control borders achieve $\ge 3:1$.

---

## 2. Principle 1: Perceivable

### 1.1 Text Alternatives (SC 1.1.1)
- Every visual icon (Lucide icons) has an explicit `aria-hidden="true"` attribute when decorative, or is accompanied by accessible text.
- Badges and status pills feature `aria-label` describing the full state (e.g. `aria-label="Urgency: Immediate Danger"`).
- Dynamic ticket status events use semantic `<time>` elements with machine-readable `dateTime` attributes.
- Interactive Google Map view includes a full accessible text alternative (`<details>` containing an accessible tabular list of all plotted grievances with buttons to open details).

### 1.2 Contrast Ratios (SC 1.4.3 & SC 1.4.11)
- Core body text (`#0F172A`) on surface (`#FFFFFF`) achieves a contrast ratio of **17.85 : 1** (far exceeding the 4.5:1 requirement).
- Body text on page background (`#F6F7F9`) achieves **16.65 : 1**.
- Primary button text (`#FFFFFF` on `#1D4ED8`) achieves **6.70 : 1**.
- Form control borders (`#64748B` slate-500) achieve **4.76 : 1** on white surface and **4.44 : 1** on page (exceeding 3:1 WCAG 1.4.11 UI component threshold).
- Urgency badges use tinted backgrounds (~8% opacity on white) with high-contrast text:
  - Critical: `#B91C1C` on `#FEF2F2` = **5.91 : 1**
  - High: `#C2410C` on `#FFF7ED` = **4.88 : 1**
  - Medium: `#A16207` on `#FEFCE8` = **4.76 : 1**
  - Low: `#475569` on `#F1F5F9` = **6.92 : 1**
- Status pills:
  - Submitted: `#1D4ED8` on `#EFF6FF` = **6.16 : 1**
  - Under Review: `#6D28D9` on `#F5F3FF` = **6.48 : 1**
  - Assigned: `#0369A1` on `#F0F9FF` = **5.57 : 1**
  - In Progress: `#115E59` on `#F0FDFA` = **7.27 : 1**
  - Resolved: `#166534` on `#F0FDF4` = **6.81 : 1**
  - Closed: `#475569` on `#F8FAFC` = **7.24 : 1**
  - Rejected: `#991B1B` on `#FEF2F2` = **7.60 : 1**
  - Reopened: `#C2410C` on `#FFF7ED` = **4.88 : 1**
- Focus rings: `#1D4ED8` on white = **6.70 : 1** (exceeds 3:1 UI component threshold).

---

## 3. Principle 2: Operable

### 2.1 Keyboard Operability (SC 2.1.1)
- **100% Keyboard Accessible**: Every interaction across both Citizen and Authority portals is operable via keyboard alone (`Tab`, `Shift-Tab`, `Enter`, `Space`, `Escape`).
- Work queue table rows are keyboard focusable (`tabIndex={0}`) and activated via `Enter` or `Space` to open the detail panel.
- Slide-over detail drawer (`TicketDetailSheet`) traps keyboard focus while active and restores focus to the invoking row button upon `Escape` or dismissal.
- Verified via automated user-event keyboard journey in `apps/web/src/test/keyboardJourney.test.tsx`.

### 2.2 Skip to Main Content (SC 2.4.1)
- The application provides an accessible `.skip-link` as the first focusable element on every page:
  ```html
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ```
- Focused via the first `Tab` keypress, jumping past the navigation header directly to `<main id="main-content">`.

### 2.3 Focus Visible (SC 2.4.7)
- Interactive elements feature a consistent, high-contrast focus indicator:
  ```css
  :focus-visible {
    outline: 2px solid #1D4ED8;
    outline-offset: 2px;
  }
  ```
- No component uses `outline: none` without an explicit accessible replacement.

### 2.4 Reduced Motion (SC 2.3.3)
- Respects the operating system `prefers-reduced-motion: reduce` preference:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 4. Principle 3: Understandable

### 4.1 Plain Language (~8th-Grade Reading Level)
- Municipal jargon ("triage", "heuristic", "vector similarity", "concurrency version") has been eliminated from citizen-facing views.
- Plain descriptions explain every status and category.
- Target resolution SLA durations are translated into human-readable hours and approximate days (e.g., "48 hours (~2 days)").

### 4.2 Error Identification & Instructions (SC 3.3.1 & SC 3.3.2)
- Form fields provide clear instructions and character limits (10 to 1,000 characters).
- Live character counter updates dynamically with `aria-live="polite"`.
- Form controls use `border-slate-500` ($\ge 3:1$ contrast) to ensure clear structural visibility.
- Errors are announced immediately with `role="alert"` and linked to form controls via `aria-describedby` and `aria-invalid="true"`.
- `ErrorSummary` aggregates multi-field errors at the top of forms with keyboard focus management.

---

## 5. Principle 4: Robust

### 5.1 Semantic Landmarks & ARIA
- Semantic HTML5 landmarks are strictly enforced:
  - `<header role="banner">`
  - `<nav aria-label="Main Navigation">`
  - `<main role="main" id="main-content">`
  - `<footer role="contentinfo">`
  - `<section aria-labelledby="...">`
- Work queue table uses semantic `<table>`, visually hidden `<caption>` ("Authority Grievance Work Queue"), and `<th scope="col">` column headers.
- Cursor pagination and table updates announce count of loaded items via polite live region (`aria-live="polite"`).
- Modal dialogs (`RoleDialog`, `ReopenDialog`, `TicketDetailSheet`) use accessible Radix UI primitives with `Dialog.Title`, `Dialog.Description`, automated focus traps, and backdrop escape.
- Emergency alerts use `role="alert"`.

---

## 6. Automated Accessibility Audit Summary (vitest-axe)

| Component / Page Tested | axe-core Violations | Result |
| :--- | :--- | :--- |
| `UrgencyBadge` (all 4 levels) | **0** | PASS |
| `StatusPill` (all 8 statuses) | **0** | PASS |
| `CategoryChip` (all categories) | **0** | PASS |
| `Callout` (all 4 variants) | **0** | PASS |
| `Stepper` (intake steps) | **0** | PASS |
| `Timeline` (audit trail) | **0** | PASS |
| `EmptyState` & `ErrorState` | **0** | PASS |
| `StepDescribe` (intake step 1) | **0** | PASS |
| `StepLocation` (intake step 2) | **0** | PASS |
| `StepReview` (intake step 3) | **0** | PASS |
| `StepConfirmation` (step 4 receipt) | **0** | PASS |
| `TrackView` (public ticket view) | **0** | PASS |
| `ReopenDialog` (reopen modal) | **0** | PASS |
| `RoleDialog` (demo role switcher) | **0** | PASS |
| `FollowUpCard` (in isolation) | **0** | PASS |
| `RejectedCard` (in isolation) | **0** | PASS |
| `SimilarReportsPanel` (in isolation) | **0** | PASS |
| `AuthorityGate` (citizen mode) | **0** | PASS |
| `KpiTiles` (metrics region) | **0** | PASS |
| `FilterBar` (search region) | **0** | PASS |
| `QueueTable` (loaded, empty, error states) | **0** | PASS |

> Complete test implementation located at `apps/web/src/test/a11y.test.tsx`.
