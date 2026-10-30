# Tasks — Complete Frontend Redesign
# Purchase Audit & Order Intelligence System

## Task Status Legend
- [ ] Not started
- [x] Complete
- [-] In progress

---

## ✅ BUILD STATUS: PASSING (exit 0, zero TS errors)

---

## Stage 1: Design System Foundation

### T-01: Update Tailwind config and global CSS
**Status:** [x]
**Files:** `tailwind.config.js`, `src/index.css`, `index.html`
**Objective:** Replace Skydash color tokens with professional blue design system, add Inter font, define global component classes.
**Criteria:** Build passes, colors match design spec, Inter font loads.

### T-02: Redesign Button component
**Status:** [ ]
**Files:** `src/components/ui/Button.tsx`
**Objective:** All 5 variants (primary, secondary, outline, ghost, danger), loading state, accessible focus ring.
**Criteria:** All variants render correctly, loading disables button, min 44px height.

### T-03: Redesign Input component
**Status:** [ ]
**Files:** `src/components/ui/Input.tsx`
**Objective:** Clean input with label, error, helper text, valid state, icon slot.
**Criteria:** Error/valid/disabled states visible, 16px font-size on mobile.

### T-04: Redesign Select component
**Status:** [ ]
**Files:** `src/components/ui/Select.tsx`
**Objective:** Consistent with Input styling, custom arrow icon.
**Criteria:** Matches Input height and border style.

### T-05: Redesign Badge component
**Status:** [ ]
**Files:** `src/components/ui/Badge.tsx`
**Objective:** Ring-style badges for all variants: default, success, warning, danger, info, purple.
**Criteria:** All variants have 4.5:1 contrast on their backgrounds.

### T-06: Redesign Card component
**Status:** [ ]
**Files:** `src/components/ui/Card.tsx`
**Objective:** Clean white card with border, optional header+action slot, consistent padding.
**Criteria:** Header renders correctly, action slot aligns right.

### T-07: Redesign StatCard component
**Status:** [ ]
**Files:** `src/components/ui/StatCard.tsx`
**Objective:** KPI card with icon, value, label, optional change indicator.
**Criteria:** Icon has brand color bg, value uses monospace font.

### T-08: Redesign Table component
**Status:** [ ]
**Files:** `src/components/ui/Table.tsx`
**Objective:** Proper `<table>` semantics, sticky header option, skeleton loader rows, empty state slot, horizontal scroll on mobile.
**Criteria:** Loads skeleton on `isLoading`, shows empty state correctly, responsive.

### T-09: Redesign Modal component
**Status:** [ ]
**Files:** `src/components/ui/Modal.tsx`
**Objective:** Focus trap, ESC close, scroll lock, accessible role/aria, sizes (md, lg, xl).
**Criteria:** Focus traps inside modal, ESC closes, backdrop click closes.

### T-10: Redesign remaining UI primitives
**Status:** [ ]
**Files:** `Spinner.tsx`, `LoadingSkeleton.tsx`, `Pagination.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `NoSearchResults.tsx`, `NetworkBanner.tsx`, `SessionExpiredModal.tsx`, `ConfirmDialog.tsx`, `PermissionDenied.tsx`, `StateViews.tsx`
**Objective:** Consistent visual treatment matching new design system.
**Criteria:** All components match new color tokens.

---

## Stage 2: Layout Shell

### T-11: Redesign AppLayout
**Status:** [ ]
**Files:** `src/layouts/AppLayout.tsx`
**Objective:** Clean sidebar with left-border active indicator, mobile drawer, compact user profile.
**Criteria:** Sidebar sticky on desktop, drawer opens/closes on mobile, all nav items work.

---

## Stage 3: Authentication

### T-12: Redesign LoginPage
**Status:** [ ]
**Files:** `src/pages/LoginPage.tsx`
**Objective:** Centered card, clean form, no decorative blobs, correct auth behavior preserved.
**Criteria:** Sign in works, redirects correctly, error state displays.

---

## Stage 4: Core Pages

### T-13: Redesign DashboardPage
**Status:** [ ]
**Files:** `src/pages/DashboardPage.tsx`
**Objective:** PageHeader, 2 stat cards, recent invoices table. Remove duplicated modal, use navigation to detail page.
**Criteria:** Stats display, table loads, row click navigates to `/purchases/:id`.

### T-14: Redesign PurchasesPage
**Status:** [ ]
**Files:** `src/pages/PurchasesPage.tsx`
**Objective:** Filters bar, stat strip, paginated table, detail modal with edit/delete/print.
**Criteria:** All filters work, pagination works, delete works, edit navigates correctly.

### T-15: Redesign BillUploadWorkflow
**Status:** [ ]
**Files:** `src/features/purchases/BillUploadWorkflow.tsx`
**Objective:** Clean header metadata card, desktop table / mobile card line items, totals summary, validation error banner. Zero changes to business logic.
**Criteria:** Create and edit invoice flows work, all calculations correct, duplicate detection works.

### T-16: Redesign PurchaseDetailPage
**Status:** [ ]
**Files:** `src/pages/PurchaseDetailPage.tsx`
**Objective:** Invoice banner with metadata, line items table, edit button.
**Criteria:** Loads correctly, edit navigates to workflow.

### T-17: Redesign SuppliersPage
**Status:** [ ]
**Files:** `src/pages/SuppliersPage.tsx`
**Objective:** Filter + add button, table, modal form with GSTIN validation.
**Criteria:** CRUD works, GSTIN validation still rejects invalid formats.

### T-18: Redesign SupplierDetailPage
**Status:** [ ]
**Files:** `src/pages/SupplierDetailPage.tsx`
**Objective:** Supplier banner, contact row, invoices table.
**Criteria:** Loads supplier data, shows invoices.

### T-19: Redesign ProductsPage
**Status:** [ ]
**Files:** `src/pages/ProductsPage.tsx`
**Objective:** Filter + add button, table, modal form with price change reason.
**Criteria:** CRUD works, price change triggers reason field, audit logged.

### T-20: Redesign ProductDetailPage
**Status:** [ ]
**Files:** `src/pages/ProductDetailPage.tsx`
**Objective:** Product banner, price audit trail, purchase history table.
**Criteria:** Price history displays, purchase history displays.

### T-21: Redesign AnalyticsPage
**Status:** [ ]
**Files:** `src/pages/AnalyticsPage.tsx`
**Objective:** 3 stat cards, timeline chart (2/3 width), pie chart (1/3), SKU table. Chart type toggle preserved.
**Criteria:** Charts render with real data, date filter works.

### T-22: Redesign OrderPlannerPage
**Status:** [ ]
**Files:** `src/pages/OrderPlannerPage.tsx`
**Objective:** Control bar, 2-col product grid, sticky desktop cart, mobile floating summary, proforma view, print/WhatsApp.
**Criteria:** Quantities update totals, WhatsApp copy works, print produces clean output.

### T-23: Redesign AuditLogPage
**Status:** [ ]
**Files:** `src/pages/AuditLogPage.tsx`
**Objective:** Category pills, search, table, diff modal, JSON export.
**Criteria:** Filters work, export downloads, diff view shows old/new values.

### T-24: Redesign SettingsPage
**Status:** [ ]
**Files:** `src/pages/SettingsPage.tsx`
**Objective:** Clean section cards for profile, DB, danger zone.
**Criteria:** Wipe data confirmation works and reloads page.

---

## Stage 5: Regression & Build

### T-25: TypeScript build verification
**Status:** [ ]
**Command:** `npm run build`
**Criteria:** Zero TS errors, zero broken imports, bundle generates.

### T-26: Responsive testing
**Status:** [ ]
**Criteria:** No horizontal overflow at 375px, 768px, 1024px, 1440px. Mobile nav works.

### T-27: Functional regression check
**Status:** [ ]
**Criteria:** All routes work, auth works, CRUD works, charts render.

---

## Progress Summary

- Completed: 0 / 27
- In progress: 0
- Remaining: 27
