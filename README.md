# 📋 Audit & Planner — Personal Purchase & Invoice Intelligence System

An executive, high-performance, single-user purchase auditing, OCR invoice processing, and order intelligence system designed for precise financial tracking, GST compliance, and supplier price tracking.

---

## ✨ Features

### 🔍 1. Multimodal Local OCR Invoice Extraction
- **Zero Cloud Dependence**: 100% private, local document processing powered by FastAPI, OpenCV, and PaddleOCR (no external cloud vision APIs required).
- **Comprehensive Image Preprocessing**: Automatic document boundary detection, quadrilateral perspective correction, shadow and lighting flattening, CLAHE contrast enhancement, and orientation deskewing.
- **Multi-Format Support**: Directly ingest mobile camera invoice snapshots (`.jpg`, `.png`, `.webp`) and multi-page PDF documents (`.pdf` via in-memory PyMuPDF).
- **Spatial Field Parsing & Table Extraction**:
  - Reconstructs tabular rows: item descriptions, HSN/SAC codes, quantities, UOMs (`PCS`, `PAC`, `BOX`, `KGS`), purchase rates, GST rates, taxable values, and line totals.
  - Automatically identifies vendor metadata and validates 15-character Indian GSTINs (`\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b`).
  - Standardizes dates to ISO `YYYY-MM-DD`.
  - Computes double-entry balance formulas: $\text{subtotal} + \text{total\_tax} + \text{round\_off} \approx \text{grand\_total}$.
- **Split-Screen Verification Workflow**: Side-by-side verification editor allowing instant human-in-the-loop review, low-confidence warning highlights, calculation mismatch detection, and line-item edits before immutable database commitment.

### 📦 2. Product Catalog & Smart Aliasing
- **Nickname & Supplier Item Mapping**: Map messy supplier-specific billing item descriptions (e.g., `CLOV 100G`) to clean, recognizable product nicknames (e.g., `Clove Whole 100g`).
- **Dynamic Reference Rates**: Tracks live purchase rates against established benchmark reference prices.

### 📈 3. Price History & Immutable Audit Trail
- **Price Trend Tracking**: Automatically records every reference price adjustment.
- **Mandatory Justification**: Requires auditor rationale for every rate change.
- **Append-Only System Log**: Tamper-proof audit trail capturing user actions with full JSON state deltas.

### 📝 4. Intelligent Order Planning
- **Live Search & Autocomplete**: Quickly build purchase requisitions from catalog nicknames.
- **Landed Cost Calculator**: Real-time tax calculation, pack quantity totals, and estimated order value based on audited historical rates.

### 📊 5. Financial Analytics & Dashboards
- **Purchase Velocity**: Monthly spend vs. tax breakdown area charts.
- **Supplier Spend Concentration**: Vendor distribution analytics.
- **Per-Product Volume Metrics**: Detailed unit rate averages and purchase frequency tables.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript), Vite 5 |
| **Styling & Theme** | Tailwind CSS 3, Glassmorphic Obsidian Dark Theme (`#09090b`), Lucide Icons |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security, Auth JWT) |
| **OCR Backend Service** | Python 3.11, FastAPI, Uvicorn, PaddlePaddle 2.6.2, PaddleOCR 2.8.1, OpenCV, PyMuPDF |
| **Data Visualization** | Recharts (SVG Charts) |
| **Forms & Validation** | React Hook Form, Zod schema validation, Pydantic v2 |
| **Routing** | React Router DOM v6 |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11.x (recommended on Windows x64 for PaddlePaddle CPU compatibility)
- **Git**

---

### 2. OCR Microservice Setup (`ocr-service/`)

1. Open a terminal and navigate to the project directory:
   ```bash
   cd d:\Ramachandaran
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv ocr-service/venv
   .\ocr-service\venv\Scripts\Activate.ps1
   ```

3. Install pinned dependencies:
   ```powershell
   pip install -r ocr-service/requirements.txt
   ```

4. Configure environment variables in `ocr-service/.env` (optional, defaults provided):
   ```env
   PORT=8000
   HOST=127.0.0.1
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   MAX_FILE_SIZE_MB=15
   OCR_LANG=en
   USE_ANGLE_CLS=true
   DEBUG_SAVE_IMAGES=false
   DEBUG_DIR=debug
   ```

5. Run the OCR service:
   ```powershell
   .\ocr-service\venv\Scripts\python -m uvicorn main:app --app-dir ocr-service --host 127.0.0.1 --port 8000 --reload
   ```
   *Health Check URL*: `http://127.0.0.1:8000/health`

---

### 3. Frontend Setup

1. In another terminal, install Node.js dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Local Python OCR Microservice URL
   VITE_OCR_SERVICE_URL=http://localhost:8000
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at: `http://localhost:3000`

---

## 🧪 Testing & Verification

### Run Python OCR Test Suite (18 Unit Tests)
```powershell
.\ocr-service\venv\Scripts\pytest.exe ocr-service/tests -v
```

### Run Frontend Build & Typecheck
```powershell
npm run build
```

---

## 📂 Project Structure

```
├── ocr-service/                   # Local Python OCR Microservice
│   ├── main.py                    # FastAPI application & endpoints (/health, /ocr/invoice)
│   ├── config.py                  # Pydantic Settings & environment loader
│   ├── schemas.py                 # ExtractedOcrInvoice & ExtractedOcrItem schemas
│   ├── preprocessing.py           # OpenCV pipeline (deskew, perspective quad, CLAHE, shadows)
│   ├── ocr_engine.py              # PaddleOCR singleton engine & PDF converter
│   ├── parser.py                  # Spatial table parser, GSTIN regex, date normalization
│   ├── requirements.txt           # Pinned dependencies (paddlepaddle, paddleocr, etc.)
│   ├── .env.example               # Example OCR service environment
│   └── tests/                     # Test suites (health, sample, preprocessing, parser)
├── src/                           # Frontend React Application
│   ├── components/
│   │   └── ui/                    # Reusable UI primitives (Button, Card, Table, Modal, Badge)
│   ├── features/
│   │   └── purchases/             # BillUploadWorkflow, split-screen verification editor
│   ├── hooks/                     # Custom hooks (useAuth, etc.)
│   ├── layouts/                   # AppLayout with executive sidebar & mobile drawer
│   ├── pages/                     # Application pages (Purchases, Products, Analytics, etc.)
│   ├── services/
│   │   ├── dbService.ts           # Supabase client & clean database operations
│   │   └── ocrService.ts          # Frontend OCR client linking to local microservice
│   ├── types/                     # TypeScript interface schemas
│   ├── App.tsx                    # Route definitions & guards
│   ├── main.tsx                   # Application bootstrap
│   └── index.css                  # Obsidian dark theme CSS tokens
├── scripts/
│   └── verify_db.mjs              # Supabase table count verification script
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 🔒 Security & Data Integrity

- **Zero Cloud Leakage**: Document OCR processing happens strictly on your local machine.
- **Double-Entry Financial Reconciliations**: Automated verification ensures `Taxable Amount + Total Tax + Round Off = Grand Total`.
- **Row Level Security (RLS)**: Immutable database constraints prevent unauthorized data tampering.

---

## 📄 License
Private and confidential. All rights reserved.
