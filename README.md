# 📋 Purchase Audit & Order Intelligence System

An executive, high-performance purchase auditing and wholesale order intelligence platform designed for precise financial tracking, GST compliance, supplier price tracking, landed cost calculation, and purchase planning.

---

### 🌐 Live Production Deployments

| Component | Platform | Live URL / Status |
| :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://purchase-audit-system.vercel.app](https://purchase-audit-system.vercel.app) |
| **Database & Auth** | **Supabase** | PostgreSQL Database with Row Level Security (RLS) |

---

## 🎨 Design System — Skydash Palette

The application is styled with an executive theme inspired by the **Skydash** design system:
- **Primary Indigo**: `#4B49AC`
- **Soft Sky Blue**: `#98BDFF`
- **Periwinkle Blue**: `#7DA0FA`
- **Lavender Violet**: `#7978E9`
- **Soft Coral / Accent**: `#F3797E`
- **Light Slate Background**: `#F5F7FF`
- **Card Surface**: `#FFFFFF` with custom subtle multi-layered elevation shadows

---

## ✨ Core Features

### 📝 1. Fast Purchase Invoice Entry
- **Rapid Bill Processing**: Direct manual invoice entry with automatic GST calculations (CGST, SGST, IGST), subtotal, round off, and grand total balancing.
- **Optional Bill Attachment Preview**: Drag-and-drop or select an invoice document/image with split-screen side-by-side zoom & rotation controls.
- **Automated Calculations**: Calculates each pack rate (`invoice_amount / pack_qty`), total packs, line tax, and mathematical discrepancy alerts.
- **Duplicate Protection**: Real-time detection against duplicate supplier invoices and bill dates.

### 📦 2. Product Catalog & Smart Aliasing
- **Supplier Item Description Mapping**: Maps messy billing descriptions (e.g., `NC DLX FT 10BE (MD+NPCT)-FF`) to clean, recognizable product nicknames (e.g., `Navy Cut Deluxe 10s`).
- **Real-World Catalog Pre-Seeded**: Includes FMCG products with MRP/RSP, wholesale purchase rates, and pack unit multipliers.
- **Dynamic Reference Rates**: Tracks live purchase rates against established benchmark reference prices.

### 🛒 3. Wholesale Order Planner
- **Live Search & Nickname Autocomplete**: Quickly assemble purchase requisitions using catalog nicknames.
- **Landed Cost Calculator**: Real-time computation of pack quantities, tax totals, and estimated order value based on audited historical rates.

### 📈 4. Price History & Immutable Audit Trail
- **Price Trend Tracking**: Automatically records every reference price adjustment over time.
- **Mandatory Justification**: Requires auditor rationale for every rate change.
- **Tamper-Proof Audit Trail**: Immutable system log capturing user actions with full JSON state deltas.

### 📊 5. Financial Analytics & Dashboards
- **Spend Velocity**: Monthly spend vs. tax breakdown area charts.
- **Supplier Spend Concentration**: Vendor distribution analytics.
- **Per-Product Volume Metrics**: Detailed unit rate averages and purchase frequency tables.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript), Vite 5 |
| **Styling & UI** | Tailwind CSS 3 (Skydash Palette), Lucide Icons |
| **State & Forms** | React Hook Form, Zod Schema Validation |
| **Visualizations** | Recharts 2 (SVG Responsive Charts) |
| **Routing** | React Router DOM v6 |
| **Database & Backend** | Supabase (PostgreSQL 15, Row Level Security, REST API) |
| **Cloud Hosting** | Vercel (Frontend SPA) |

---

## 📂 Project Structure

```
├── src/                           # React + TypeScript Frontend
│   ├── components/
│   │   └── ui/                    # Reusable UI primitives (Button, Card, Table, Modal, Badge)
│   ├── features/
│   │   └── purchases/             # BillUploadWorkflow (Manual bill entry & document viewer)
│   ├── hooks/                     # Custom React hooks (useAuth, useToast)
│   ├── layouts/                   # AppLayout with Skydash sidebar & responsive navigation
│   ├── pages/                     # Application pages (Dashboard, Purchases, Products, Planner, Analytics)
│   ├── services/
│   │   ├── dbService.ts           # Supabase client & database operations
│   │   └── invoiceService.ts      # Invoice data models & calculation helpers
│   ├── types/                     # TypeScript data model interfaces
│   ├── App.tsx                    # Route definitions & guards
│   ├── main.tsx                   # Application bootstrap
│   └── index.css                  # Skydash design tokens & custom utility classes
├── supabase/
│   ├── migrations/                # Schema definitions with RLS policies
│   └── seed_17_items.sql          # Seed script for 17 catalog products & verified invoice
├── scripts/
│   ├── seed_17_items.mjs          # JavaScript database seeder (via Supabase REST)
│   └── verify_db.mjs              # Table row verification script
├── vercel.json                    # Vercel SPA routing & asset caching configuration
├── tailwind.config.js             # Skydash color theme definitions
├── tsconfig.json                  # TypeScript compiler settings
├── vite.config.ts                 # Vite bundler configuration
└── package.json                   # Project metadata & NPM dependencies
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Git**

---

### 2. Frontend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/callofduty12mobile18-arch/purchase-audit-system.git
   cd purchase-audit-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables** in `.env.local`:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```
