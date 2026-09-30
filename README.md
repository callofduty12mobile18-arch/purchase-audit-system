# 📋 Purchase Audit & Order Intelligence System

An executive, high-performance purchase auditing, automated OCR invoice processing, and wholesale order intelligence platform designed for precise financial tracking, GST compliance, supplier price tracking, and landed cost planning.

---

### 🌐 Live Production Deployments

| Component | Platform | Live URL / Status |
| :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://purchase-audit-system.vercel.app](https://purchase-audit-system.vercel.app) |
| **OCR Microservice** | **Render (Docker)** | [https://invoice-ocr-service-9szm.onrender.com](https://invoice-ocr-service-9szm.onrender.com) (`/health`) |
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

### 🔍 1. Multimodal OCR Invoice Extraction
- **Zero Cloud Vision API Dependence**: Document processing powered by **FastAPI**, **OpenCV**, and **PaddleOCR v4** running in an isolated Linux container.
- **Mobile Camera EXIF Auto-Rotation**: Automatically normalizes orientation for camera photos taken on iPhone and Android devices.
- **Image & PDF Preprocessing Pipeline**:
  - Bilateral filtering & adaptive CLAHE contrast enhancement.
  - Automatic perspective quadrilateral deskewing and document boundary crop.
  - Shadow and uneven illumination flattening.
  - Native multi-page PDF ingestion via in-memory PyMuPDF (`fitz`).
- **Spatial Field Parsing & Validation**:
  - Automatically parses item descriptions, HSN codes, quantities, UOMs (`PCS`, `PAC`, `BOX`, `KGS`), rates, discounts, GST rates, and line totals.
  - Detects and validates 15-character Indian GSTINs (`\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b`).
  - Standardizes dates to ISO `YYYY-MM-DD`.
  - Enforces double-entry balance validation: $\text{subtotal} + \text{total\_tax} + \text{round\_off} \approx \text{grand\_total}$.
- **Split-Screen Verification Workflow**: Side-by-side interactive verification editor with zoomable invoice preview, inline line-item editing, and calculation mismatch alerts before committing to PostgreSQL.

### 📦 2. Product Catalog & Smart Aliasing
- **Supplier Item Description Mapping**: Maps messy billing descriptions (e.g., `NC DLX FT 10BE (MD+NPCT)-FF`) to clean, recognizable product nicknames (e.g., `Navy Cut Deluxe 10s`).
- **Real-World Catalog Pre-Seeded**: Includes 17 FMCG products with MRP/RSP, wholesale purchase rates, and pack unit multipliers.
- **Dynamic Reference Rates**: Tracks live purchase rates against established benchmark reference prices.

### 📝 3. Wholesale Order Planner
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
| **Styling & UI** | Tailwind CSS 3 (Skydash Palette), Lucide Icons, Glassmorphism |
| **State & Forms** | React Hook Form, Zod Schema Validation |
| **Visualizations** | Recharts 2 (SVG Responsive Charts) |
| **Routing** | React Router DOM v6 |
| **Database & Backend** | Supabase (PostgreSQL 15, Row Level Security, REST API) |
| **OCR Backend Service** | Python 3.11, FastAPI, Uvicorn, PaddleOCR 2.8.1, OpenCV, PyMuPDF, PIL |
| **Containerization** | Docker (`python:3.11-slim` on Linux) |
| **Cloud Hosting** | Vercel (Frontend SPA) + Render (OCR Microservice) |

---

## 📂 Project Structure

```
├── ocr-service/                   # Python FastAPI + PaddleOCR Microservice
│   ├── main.py                    # FastAPI application, CORS & endpoints (/health, /ocr/invoice)
│   ├── config.py                  # Pydantic Settings & environment loader
│   ├── schemas.py                 # ExtractedOcrInvoice & ExtractedOcrItem Pydantic schemas
│   ├── preprocessing.py           # OpenCV pipeline (deskew, quad crop, CLAHE, shadow removal)
│   ├── ocr_engine.py              # PaddleOCR singleton engine, EXIF rotation & PDF converter
│   ├── parser.py                  # Spatial table parser, GSTIN regex, date normalization
│   ├── Dockerfile                 # Production Linux Docker container for Render
│   ├── requirements.txt           # Pinned dependencies (paddlepaddle, paddleocr, opencv, etc.)
│   ├── .env.example               # Example OCR service environment variables
│   └── tests/                     # Pytest test suite (18 unit tests)
├── src/                           # React + TypeScript Frontend
│   ├── components/
│   │   └── ui/                    # Reusable UI primitives (Button, Card, Table, Modal, Badge)
│   ├── features/
│   │   └── purchases/             # BillUploadWorkflow, split-screen verification editor
│   ├── hooks/                     # Custom React hooks (useAuth, useToast)
│   ├── layouts/                   # AppLayout with Skydash sidebar & responsive navigation
│   ├── pages/                     # Application pages (Dashboard, Purchases, Products, Planner, Analytics)
│   ├── services/
│   │   ├── dbService.ts           # Supabase client & clean database operations
│   │   └── ocrService.ts          # Resilient OCR client with cold-start retry & health polling
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
├── render.yaml                    # Render Blueprint configuration for Docker deployment
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
- **Python**: v3.11.x (recommended on Windows / Linux)
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

   # OCR Service Endpoint (Local or Render)
   VITE_OCR_SERVICE_URL=https://invoice-ocr-service-9szm.onrender.com
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   *Access the web app at:* `http://localhost:3000`

---

### 3. OCR Microservice Setup (Local Development)

1. **Create and activate a Python virtual environment**:
   ```bash
   cd ocr-service
   python -m venv venv
   ```
   - On Windows (PowerShell):
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - On Linux / macOS:
     ```bash
     source venv/bin/activate
     ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI server**:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Health Check URL:* `http://127.0.0.1:8000/health`

---

### 4. Database Setup & Seeding

The database comes with a pre-configured SQL seed containing 17 products, the primary supplier, and a verified invoice totaling **₹319,066.12** (2,640 packs).

#### Option A: Run SQL Migration in Supabase Dashboard (Recommended)
1. Open your Supabase Project Dashboard.
2. Navigate to **SQL Editor** -> **New query**.
3. Copy and paste the contents of [`supabase/seed_17_items.sql`](supabase/seed_17_items.sql).
4. Click **Run**.

#### Option B: Seed via Node.js Script
```bash
node scripts/seed_17_items.mjs
```

#### Verify Database Counts:
```bash
node scripts/verify_db.mjs
```

---

## 📊 Catalog & Invoice Breakdown (17 Seeded Items)

| Item Description | Qty | Packs | MRP / RSP (₹) | Invoice Amount (₹) | Each Pack Rate (₹) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **CI Ice Burst 10M 10BE** | 0.2 | 20 | 240.00 | 4,315.56 | 215.78 |
| **CI Ice Burst 20BE** | 0.2 | 10 | 480.00 | 4,315.56 | 431.56 |
| **NC DLX FT 10BE (MD+NPCT)-FF** | 0.5 | 50 | 125.00 | 5,704.36 | 114.09 |
| **GFK RED NBUNDLE+NPCT1 10R** | 1.0 | 100 | 240.00 | 22,023.81 | 220.24 |
| **GFK RED NBUNDLE+NPCT 120R** | 1.0 | 50 | 480.00 | 21,528.10 | 430.56 |
| **GFK BLUE NBUNDLE+NPCT 10R** | 1.6 | 160 | 240.00 | 35,238.10 | 220.24 |
| **GOLD FL FT-10BE MD+NPCT-FF** | 6.0 | 600 | 127.00 | 69,940.51 | 116.57 |
| **SCISSORS FT 10BE-NB-MD1-NP** | 2.5 | 250 | 109.00 | 24,925.59 | 99.70 |
| **FLAKE GOLD CREST 10HL 70** | 5.0 | 500 | 70.00 | 31,994.05 | 63.99 |
| **GFT MINI 10BE 70** | 4.0 | 400 | 89.00 | 32,539.67 | 81.35 |
| **Indie Mint 10BE 115** | 2.2 | 220 | 125.00 | 25,099.20 | 114.09 |
| **WAVE COOL MINT 10R C 96** | 1.0 | 100 | 96.00 | 8,699.82 | 87.00 |
| **CI Double Burst FS-BDG-ND 20BE** | 0.2 | 10 | 480.00 | 4,315.57 | 431.56 |
| **AM CLUBNY COOL SLEEKSFTK** | 1.0 | 50 | 360.00 | 16,071.49 | 321.43 |
| **WAVE COOL MINT DLX FT 10BE** | 1.0 | 100 | 60.00 | 5,299.98 | 53.00 |
| **WAVEBOSS REFINED TASTE DS** | 0.5 | 50 | 60.00 | 2,649.99 | 53.00 |
| **GFK MIXPOD MD+NPCT FT 10BE** | 0.2 | 20 | 240.00 | 4,404.76 | 220.24 |
| **TOTAL** | — | **2,640** | — | **₹319,066.12** | — |

---

## 🧪 Testing & Quality Assurance

### Run OCR Microservice Test Suite (18 Unit Tests)
```bash
pytest ocr-service/tests -v
```

### Run Frontend Typecheck & Build
```bash
npm run build
```

---

## ☁️ Deployment Configurations

### 1. Vercel (Frontend)
- **Framework Preset**: Vite
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_OCR_SERVICE_URL`
- Includes [`vercel.json`](vercel.json) with single-page application (SPA) rewrite rules.

### 2. Render (OCR Microservice)
- **Environment**: Docker (`ocr-service/Dockerfile`)
- **Base Image**: `python:3.11-slim`
- **Installed Packages**: `libgl1-mesa-glx`, `libgomp1`, `zlib1g-dev`, `libglib2.0-0`
- **Health Check Path**: `/health`
- Configured via [`render.yaml`](render.yaml) blueprint.

---

## 🔒 Security & Compliance

- **Row Level Security (RLS)**: Enforced across all tables in Supabase.
- **Data Integrity**: Double-entry financial check ensures `subtotal + tax + round_off = total_amount`.
- **Private Processing**: Document image OCR runs in memory with zero external logging of confidential bills.

---

## 📄 License
Private and confidential. All rights reserved.
