# 📋 Purchase Audit & Order Intelligence System

An executive, high-performance **purchase auditing and wholesale order intelligence platform** built for an Indian wholesale cigarette/FMCG retailer. It delivers GST-compliant invoice entry, supplier price tracking, landed-cost planning, financial analytics, an immutable audit trail, and a fully automated **cheque email reminder system**.

---

### 🌐 Live Production Deployments

| Component | Platform | Live URL / Status |
| :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://purchase-audit-system.vercel.app](https://purchase-audit-system.vercel.app) |
| **Database & Auth** | **Supabase** | PostgreSQL 15 · Auth · RLS · Edge Functions · pg_cron |
| **Transactional Email** | **Resend** | Sandbox sender `onboarding@resend.dev` |

---

## 🎯 What This Project Does

A single-admin back-office SPA that replaces manual bill registers with a digital, auditable system:

1. **Enter purchase invoices** with automatic GST math and duplicate protection.
2. **Track supplier prices** and product reference rates over time.
3. **Plan wholesale orders** using audited historical rates and landed cost.
4. **Analyze spend** with monthly trend, supplier concentration, and per-product metrics.
5. **Schedule cheque reminders** that email the admin automatically before a cheque clears.

---

## 🎨 Design System — Brand Blue

The UI uses a professional **blue "brand" palette** (not the legacy Skydash violet theme). All tokens are defined in [tailwind.config.js](file:///d:/Ramachandaran/tailwind.config.js).

| Token | Value | Usage |
| :--- | :--- | :--- |
| `brand-600` | `#2563EB` | Primary actions, links, focus rings |
| `brand-800` | `#1E40AF` | Headings, brand accents, email header |
| `brand-50` | `#EFF6FF` | Subtle tinted backgrounds |
| `brand-900` / `brand-950` | `#1E3A8A` / `#172554` | Deep contrast text/surfaces |
| Full scale | `brand-50 … brand-950` | Consistent 11-step scale |

- **Fonts**: `Inter` (sans) for UI, `JetBrains Mono` (mono) for invoice numbers/amounts.
- **Elevation**: custom `shadow-card`, `shadow-modal`, `shadow-dropdown`.
- **Motion**: `animate-fade-in`, `animate-slide-in-left`, `animate-slide-in-top`, `animate-skeleton`.
- **Surfaces**: light slate app background (`slate-50`) with white cards and subtle 1px borders.

---

## ✨ Core Features

### 📝 1. Fast Purchase Invoice Entry
- **Rapid bill processing** with automatic GST calculations (CGST, SGST, IGST), subtotal, round-off, and grand total balancing.
- **Optional bill attachment** with split-screen zoom & rotation document viewer.
- **Automated line math**: pack rate (`invoice_amount / pack_qty`), total packs, line tax, and discrepancy alerts.
- **Duplicate protection** against the same supplier + invoice number + invoice date.
- **Cheque reminder capture** inline when Payment Mode = `CHEQUE` (see feature 6).

### 📦 2. Product Catalog & Smart Aliasing
- Maps messy supplier billing descriptions (e.g. `NC DLX FT 10BE (MD+NPCT)-FF`) to clean nicknames (e.g. `Navy Cut Deluxe 10s`).
- Pre-seeded FMCG/cigarette catalog with MRP/RSP, wholesale purchase rates, and pack multipliers (HSN `24022090`).
- Tracks live purchase rates against established reference prices.

### 🛒 3. Wholesale Order Planner & Landed Cost
- Live search with nickname autocomplete to assemble purchase requisitions quickly.
- Real-time pack quantities, tax totals, and estimated order value from audited historical rates.

### 📈 4. Price History & Immutable Audit Trail
- Records every reference-price adjustment over time.
- Requires auditor justification for each rate change.
- Tamper-proof audit log capturing user actions with full JSON state deltas.

### 📊 5. Financial Analytics & Dashboards
- Spend velocity (monthly spend vs. tax) area charts.
- Supplier spend concentration / vendor distribution.
- Per-product volume, unit-rate averages, and purchase frequency tables.

### 🔔 6. Automated Cheque Email Reminder System
Schedules a one-time email reminder for cheque-paid invoices and delivers it automatically via cron.

- **UI**: reminder controls appear **only** when Payment Mode = `CHEQUE` — enable toggle, reminder date/time pickers, and recipient email auto-filled with the authenticated admin's email.
- **Separation of dates**: *Cheque Clearance Date* is stored independently from *Reminder Date & Time*.
- **Timezone**: all scheduling uses **Asia/Kolkata (IST)**.
- **Backend**: `cheque_reminders` table with RLS, unique per invoice, status lifecycle `PENDING → PROCESSING → SENT` (or `FAILED` / `CANCELLED`), attempt counter, and `sent_at`.
- **Automation**: `pg_cron` calls the `process-cheque-reminders` Edge Function every minute; due rows are **atomically claimed** via `FOR UPDATE SKIP LOCKED` to prevent duplicate sends.
- **Safety**: the function re-verifies invoice payment/cancellation before sending, retries with backoff up to 5 attempts, and never exposes service-role or Resend keys.

Full setup and operations guide: [docs/cheque-reminders.md](file:///d:/Ramachandaran/docs/cheque-reminders.md).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18 (TypeScript), Vite 5 |
| **Styling & UI** | Tailwind CSS 3 (blue brand palette), Lucide React icons, `clsx` + `tailwind-merge` |
| **State & Forms** | React Hook Form 7, Zod 3 schema validation |
| **Charts** | Recharts 2 (responsive SVG) |
| **Routing** | React Router DOM v6 |
| **Backend** | Supabase — PostgreSQL 15, Row Level Security, Auth, Edge Functions (Deno), pg_cron + pg_net |
| **Email** | Resend |
| **Hosting** | Vercel (frontend SPA) |

---

## 🏛️ Architecture & Data Strategy

- **Local-first**: `localStorage` caches the working dataset; Supabase is the authoritative remote store with local fallback when offline or unauthenticated.
  - Keys: `ramachandran_products_v1`, `ramachandran_suppliers_v1`, `ramachandran_invoices_v1`, `ramachandran_audit_v1`, `ramachandran_price_history_v1` (see [dbService.ts](file:///d:/Ramachandaran/src/services/dbService.ts#L291-L310)).
- **Auth**: Supabase email/password with auto-signup on first login, plus a localStorage demo fallback. Default credentials: `admin@audit.local` / `admin123`. Single `ADMIN` role.
- **Remote sync**: writes upsert to Supabase and mirror to local cache; remote read failures degrade gracefully to local data.

### Remote Schema (Supabase `public`)
`profiles`, `suppliers`, `categories`, `products`, `purchase_invoices`, `purchase_invoice_documents`, `purchase_items`, `price_history`, `stock_transactions`, `audit_logs`, and (feature) `cheque_reminders`.

---

## 🔄 Core Workflows

### A. Invoice Entry → Audit Workflow
```
Login (admin)
   │
   ▼
Purchases → New / Import invoice
   │
   ├─ Duplicate check (supplier + invoice number + date)
   ├─ Enter line items ──► auto GST math (see Business Rules)
   ├─ Attach bill (optional document viewer)
   ├─ Payment Mode
   │      └─ = CHEQUE  ──► Cheque Clearance Date + Cheque Reminder section
   │
   ▼
validateForm()  ──► Execute Save
   │
   ├─ dbService: persist invoice + items (local + Supabase upsert)
   ├─ Append audit log entry (JSON state delta)
   ├─ Record price history on reference-rate changes
   └─ chequeReminderService.syncForInvoice()  (non-fatal if it fails)
   │
   ▼
Invoice visible in Purchases / Dashboard / Analytics
```

### B. Automated Cheque Reminder Workflow
```
Admin enables reminder (Payment Mode = CHEQUE)
   │  date + time (IST) + recipient email (defaults to admin email)
   ▼
cheque_reminders row  ── status PENDING, unique per invoice_id
   │
   ▼  every minute
pg_cron ──► net.http_post(url from Vault, header x-cron-secret)
   │
   ▼
Edge Function `process-cheque-reminders`
   │  1. Auth: x-cron-secret must match CHEQUE_CRON_SECRET (else 401)
   │  2. claim_due_cheque_reminders(batch)  ── atomic, SKIP LOCKED
   │  3. Re-read invoice: missing or PAID  ──► mark CANCELLED
   │  4. Build responsive HTML email
   │  5. POST to Resend
   │        success ──► status SENT + sent_at
   │        failure ──► retry (backoff) or FAILED after 5 attempts
   ▼
Admin receives email (invoice no., supplier, amount, clearance date, reminder time)
```

### C. Local-First Data Flow
```
UI action ──► Service layer (dbService / chequeReminderService)
                 │
                 ├─► localStorage (immediate, always)
                 └─► Supabase REST/PostgREST upsert (authoritative)
                          └─ failure ──► warn + keep local copy
```

---

## 📐 Business Rules (must not be changed)

- **GST (40% inclusive)**: `taxable = total / 1.4` · `CGST = SGST = (total − taxable) / 2` · `IGST = 0`.
- **Invoice numbering**: `INV-DDMMYYYY-XXXX` (IST date code, e.g. `INV-08102026-0001`), see [dateUtils.ts](file:///d:/Ramachandaran/src/utils/dateUtils.ts#L69-L76).
- **Timezone**: all dates/times use **Asia/Kolkata**.
- **Duplicate detection**: supplier + invoice number + invoice date.
- **Seeded catalog**: cigarette SKUs all use HSN `24022090`.

---

## 📂 Project Structure

```
├── src/                                   # React + TypeScript frontend
│   ├── components/ui/                     # UI primitives (Button, Card, Table, Modal, Input,
│   │                                      #   Select, Badge, Pagination, Spinner, StateViews…)
│   ├── context/ToastContext.tsx           # Global toast notifications
│   ├── features/purchases/
│   │   ├── BillUploadWorkflow.tsx         # Invoice entry + document viewer + reminder wiring
│   │   └── ChequeReminderSection.tsx      # Cheque reminder UI (shown only for CHEQUE mode)
│   ├── hooks/                             # useAuth (Supabase auth), useNetworkStatus
│   ├── integrations/supabase/client.ts    # Supabase client (anon key, session persistence)
│   ├── layouts/AppLayout.tsx              # Sidebar + responsive shell
│   ├── pages/                             # Dashboard, Purchases, PurchaseDetail/Import,
│   │                                      #   Products, ProductDetail, Suppliers, SupplierDetail,
│   │                                      #   Analytics, OrderPlanner, AuditLog, Settings, Login
│   ├── services/
│   │   ├── dbService.ts                   # Local-first persistence + Supabase sync
│   │   ├── invoiceService.ts              # Invoice models & blank-form factories
│   │   └── chequeReminderService.ts       # Reminder schedule/cancel/get (IST ↔ UTC)
│   ├── types/index.ts                     # Data model interfaces
│   ├── utils/dateUtils.ts                 # IST date/number/currency helpers
│   ├── App.tsx                            # Routes + ProtectedRoute guard
│   ├── main.tsx                           # App bootstrap
│   └── index.css                          # Design tokens & utility classes
├── supabase/
│   ├── functions/process-cheque-reminders/
│   │   ├── index.ts                       # Deno Edge Function (claim → verify → send via Resend)
│   │   └── emailTemplate.ts               # Responsive HTML + text email builder
│   ├── migrations/
│   │   ├── 20260808000000_initial_schema.sql
│   │   ├── 20261101000000_cheque_reminders.sql      # Table + RLS + claim function
│   │   └── 20261101000001_cheque_reminders_cron.sql # pg_cron / pg_net schedule
│   ├── config.toml                        # verify_jwt = false for the cron function
│   ├── complete_setup_and_seed.sql        # One-shot schema + seed
│   └── seed_17_items.sql                  # 17-item catalog seed
├── scripts/                               # Node helpers (seed_17_items.mjs, add_products.mjs, verify_db.mjs)
├── docs/cheque-reminders.md               # Cheque reminder setup / testing / ops guide
├── .kiro/                                 # Frontend redesign spec + steering standards
├── tailwind.config.js                     # Brand palette, fonts, shadows, animations
├── vercel.json                            # SPA routing & asset caching
├── tsconfig.json / vite.config.ts         # Build configuration
└── package.json                           # Scripts & dependencies
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18.0.0 or higher
- **Git**
- A **Supabase** project (PostgreSQL + Auth)
- *(For reminders)* **Supabase CLI** and a **Resend** account

### 2. Clone & Install
```bash
git clone https://github.com/callofduty12mobile18-arch/purchase-audit-system.git
cd purchase-audit-system
npm install
```

### 3. Configure Frontend Environment (`.env.local`)
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
> Only `VITE_`-prefixed values reach the browser. Never put service-role or API keys here. See [.env.example](file:///d:/Ramachandaran/.env.example).

### 4. Run the Dev Server
```bash
npm run dev        # start Vite dev server
npm run build      # type-check (tsc) + production build
npm run preview    # preview the production build
npm run lint       # ESLint
```

### 5. Database Setup
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # apply migrations in supabase/migrations
```
(or run `supabase/complete_setup_and_seed.sql` in the Supabase SQL editor for a fresh project).

### 6. Cheque Reminder Setup (summary)
1. Apply both `cheque_reminders` migrations.
2. Store the function URL and shared secret in **Supabase Vault** (`cheque_function_url`, `cheque_cron_secret`).
3. Set Edge Function secrets: `CHEQUE_CRON_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`, `RESEND_TEST_RECIPIENT`.
4. Deploy the function and confirm the cron job is scheduled.

Full steps, security model, and the testing checklist are in [docs/cheque-reminders.md](file:///d:/Ramachandaran/docs/cheque-reminders.md).

---

## 🔐 Security Notes

- **RLS is enabled** on `cheque_reminders`; policies restrict access to authenticated users.
- The due-reminder claim function is `SECURITY DEFINER`, **revoked from `anon`/`authenticated`**, and granted only to `service_role`.
- The Edge Function rejects requests without a valid `x-cron-secret` header (401) and is deployed with `verify_jwt = false` (Cron-only invocation).
- Service-role credentials and the Resend API key exist **only** as server-side Edge Function secrets — never in frontend code.
- `.env.local` and `supabase/.temp/` are git-ignored.

---

## 📄 License

Private / internal use.
