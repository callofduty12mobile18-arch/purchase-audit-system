# Requirements — Complete Frontend Redesign
# Purchase Audit & Order Intelligence System

## 1. Existing Application Functionality

### Application Domain
Single-user B2B FMCG wholesale procurement auditing platform for an Indian cigarette retailer. Handles GST-compliant purchase invoice entry, product catalog management, supplier directory, order planning, financial analytics, and an immutable audit trail.

### Authentication
- Supabase Auth (email + password) with automatic sign-up on first login
- Local fallback session via `localStorage` key `demo_auth_logged_in`
- Default credentials: `admin@audit.local` / `admin123`
- Protected routes redirect unauthenticated users to `/login`
- Single user role: ADMIN

### Routes Inventory

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Authentication screen |
| `/dashboard` | `DashboardPage` | Executive overview with KPI stats and recent invoices |
| `/purchases` | `PurchasesPage` | Full invoice ledger with search/filter/pagination |
| `/purchases/import` | `PurchaseImportPage → BillUploadWorkflow` | New invoice entry form |
| `/purchases/edit/:id` | `PurchaseImportPage → BillUploadWorkflow` | Edit existing invoice |
| `/purchases/:id` | `PurchaseDetailPage` | Invoice read-only detail view |
| `/suppliers` | `SuppliersPage` | Supplier directory with CRUD |
| `/suppliers/:id` | `SupplierDetailPage` | Supplier profile + invoice history |
| `/products` | `ProductsPage` | Product catalog with CRUD |
| `/products/:id` | `ProductDetailPage` | Product detail + price history + purchase history |
| `/analytics` | `AnalyticsPage` | Recharts spend analytics |
| `/order-planner` | `OrderPlannerPage` | Wholesale order quantity planner |
| `/audit-log` | `AuditLogPage` | Immutable system event log |
| `/settings` | `SettingsPage` | Account info + data management |

### User Workflows

#### Invoice Entry (critical path)
1. Navigate to New Invoice
2. Fill header: invoice number, invoice name (memo), date, payment mode/status
3. Add line items by selecting from product catalog
4. System auto-calculates GST (40% rate), taxable value, CGST/SGST, grand total
5. System detects duplicates before save
6. On save: creates invoice, auto-upserts products, logs audit trail, navigates to success

#### Invoice Management
- View all invoices with filters (search, date range, memo name)
- Paginate at 10/page
- Click row to open detail modal with print/edit/delete actions
- Delete triggers confirmation dialog and audit log entry

#### Product Catalog
- Add/edit products with supplier_item_name → nickname mapping
- Price changes require audit justification text
- View product history via detail page

#### Supplier Directory
- Add/edit suppliers with GSTIN validation
- View supplier's associated invoices

#### Order Planner
- Select distributor/supplier
- Set pack quantities per product (stepper controls, +10/+50 shortcuts)
- Load from last bill shortcut
- Live running total with GST breakdown
- Generate PO proforma view
- WhatsApp copy and print/PDF

#### Analytics
- Monthly spend timeline (Bar/Line/Area chart toggle)
- Product spend share (Pie chart)
- SKU breakdown table
- Date range filter

#### Audit Log
- Append-only system event log
- Category filter (All/Invoices/Products/Suppliers)
- Search
- JSON export
- Detail modal with before/after diff view

#### Settings
- User profile display
- DB connection status
- Danger zone: wipe all data

### Business Logic (must not change)
- GST calculation: `total / 1.4 = taxable`, `(total - taxable) / 2 = CGST = SGST`, `IGST = 0`
- IST date handling: all dates formatted in Asia/Kolkata timezone
- Invoice number format: `INV-DDMMYYYY-XXXX`
- Invoice name options: RAMACHANDRAN, ASHWIN KARTHIK, BERRY QUEQ, SUBIKSHA STORE
- 19 pre-seeded products (cigarette SKUs), all HSN `24022090`
- Local-first storage with Supabase remote sync
- Duplicate invoice detection by supplier + invoice number + date

---

## 2. Functional Requirements

### FR-01: Authentication
- Login form accepts email and password
- Auth state persists across page refresh
- Protected routes enforce authentication
- Session expiry handled gracefully (modal recovery)
- Sign out clears session and redirects to login

### FR-02: Navigation
- All 9 sidebar nav items must remain: Dashboard, Invoices, New Invoice, Suppliers, Products, Analytics, Order Planner, Audit Logs, Settings
- Active state indicates current route
- Mobile: hamburger menu opens sidebar drawer, closes on route change
- Back navigation works correctly on detail pages

### FR-03: Invoice Management
- All CRUD operations on invoices must work
- Table filters (search, date, memo name) must remain functional
- Pagination must work
- Print/PDF from invoice detail must work
- Edit navigates correctly to BillUploadWorkflow in edit mode

### FR-04: Product Catalog
- Add/edit products
- Price change requires reason field
- Product detail shows purchase history and price audit trail

### FR-05: Suppliers
- Add/edit suppliers with GSTIN validation
- Supplier detail shows associated invoices

### FR-06: Analytics
- Charts render with Recharts
- Data matches actual invoice data
- Date filter works

### FR-07: Order Planner
- Quantity steppers work
- Live totals update correctly
- WhatsApp copy produces correct formatted text
- Print/PDF produces clean output

### FR-08: Audit Log
- All events display
- Filter by category works
- JSON export downloads file
- Diff modal shows old/new values correctly

### FR-09: Settings
- Profile info displays current user
- Wipe all data requires confirmation and works

---

## 3. Responsive Requirements

### RR-01: Mobile (320px–639px)
- Single column layout
- Sidebar is an off-canvas drawer (overlay)
- Tables scroll horizontally within a container, content not clipped
- Forms stack vertically
- Modals use full-screen or near-full-screen presentation
- Touch targets minimum 44×44px
- Font sizes minimum 16px for inputs (prevent iOS zoom)
- No horizontal page overflow

### RR-02: Tablet (640px–1023px)
- Sidebar may be collapsed by default or persistent
- Two-column layouts where appropriate
- Cards grid 2 columns

### RR-03: Desktop (1024px+)
- Persistent sidebar, 240px–260px wide
- Content area uses available space
- Tables show all columns
- Analytics page uses side-by-side chart layout

---

## 4. Accessibility Requirements

### AR-01: Keyboard Navigation
- All interactive elements reachable by Tab
- Correct tab order matching visual layout
- Modals trap focus when open
- ESC closes modals and drawers

### AR-02: Screen Reader Support
- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<aside>`, `<table>`, `<form>`
- All images have alt text
- Icon-only buttons have aria-label
- Loading states use aria-busy or aria-live
- Status badges convey meaning beyond color

### AR-03: Visual Accessibility
- Color contrast 4.5:1 minimum for body text
- 3:1 for large text and UI components
- Focus indicators visible (2px solid outline)
- Not relying solely on color for meaning

---

## 5. Non-Functional Requirements

### NFR-01: Performance
- Initial page load: functional within 3 seconds on average connection
- No layout shift (CLS < 0.1) during loading states
- Skeleton loaders prevent blank flash

### NFR-02: Reliability
- Network errors shown to user (not silently swallowed)
- Offline: local data shown with offline indicator
- Form errors shown inline, not just as toasts

### NFR-03: Build
- `npm run build` must succeed with zero TypeScript errors
- No broken imports
- No missing assets

### NFR-04: Maintainability
- Component structure is logical and flat
- No duplicated component implementations
- Tailwind classes only (no raw inline styles for design)
