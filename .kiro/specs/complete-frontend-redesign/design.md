# Design — Complete Frontend Redesign
# Purchase Audit & Order Intelligence System

## 1. Existing Architecture Analysis

### Current Tech Stack
- React 18 + TypeScript, Vite 5
- Tailwind CSS 3 (custom Skydash theme: `#4B49AC` indigo)
- Lucide React icons
- Recharts 2 for charts
- React Router DOM v6
- Supabase JS SDK
- React Hook Form + Zod

### Current Design Problems
1. **Color system too playful for a financial tool** — `#4B49AC` violet-indigo reads as consumer SaaS, not financial/operations software
2. **Multiple shadow layering** — `shadow-skydash` with custom multi-layer shadows creates inconsistency
3. **Excessive decorative text styles** — `font-black`, `tracking-wider`, `uppercase` applied too broadly makes everything shout
4. **Component duplication** — Invoice detail modal duplicated verbatim between DashboardPage and PurchasesPage
5. **Mobile layout gaps** — Order planner mobile layout has density issues; tables don't have proper horizontal scroll containers
6. **Over-styled sidebar** — Active nav uses heavy `shadow-md shadow-[#4B49AC]/25` which is excessive
7. **Hardcoded hex colors** — Hundreds of `#4B49AC`, `#7DA0FA`, `#ECEEF5` etc. scattered in JSX instead of tokens
8. **Mixed typography** — `text-[11px]`, `text-xs`, `text-[10px]` all used for similar caption content
9. **Emoji in UI** — 🏷️ used as a UI element for memo name label
10. **Z-index inconsistency** — No defined z-index scale

### Preserved Architecture
- `src/App.tsx` — route structure (routes unchanged)
- `src/services/dbService.ts` — untouched
- `src/services/invoiceService.ts` — untouched
- `src/hooks/useAuth.tsx` — untouched
- `src/hooks/useNetworkStatus.ts` — untouched
- `src/context/ToastContext.tsx` — untouched
- `src/integrations/supabase/client.ts` — untouched
- `src/types/index.ts` — untouched
- `src/utils/dateUtils.ts` — untouched
- `src/features/purchases/BillUploadWorkflow.tsx` — business logic untouched, visual shell redesigned

---

## 2. Design Direction

### Visual Identity

**Theme:** Precision accounting tool. Clean, structured, professional. Think financial software from a modern cloud-first company — the visual grammar of tools like Linear, Plane, or Fathom Analytics, adapted for a single-user operations context.

**One memorable element:** The sidebar left-border active indicator — a vivid `#2563EB` left accent bar on the active nav item. Everything else is restrained. The numbers and invoice data are the stars.

**Color choice rationale:** Moving from `#4B49AC` violet-indigo to `#1E40AF` blue-900 shifts from "playful SaaS" to "financial software." Blue conveys trust, authority, and precision — appropriate for an auditing tool handling currency values and GST compliance.

### Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (240px, fixed)  │  Main Content Area (flex-1)  │
│                          │                               │
│  [Logo]                  │  [Page Header]                │
│  [Nav items]             │  [Page Content]               │
│  ...                     │                               │
│  [User profile]          │                               │
└─────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────┐
│  [Top Bar: logo + ≡]     │
│  [Page Content]          │
│                          │
└──────────────────────────┘
[Sidebar drawer slides over from left when ≡ pressed]
```

### Typography Approach

Single typeface: **Inter** (already system-available, no new font loading needed — Inter is bundled with modern OS or available via system-ui). For financial data: monospace stack.

This avoids font loading latency for a tools app. The distinction between proportional (prose, headings) and monospace (numbers, IDs, codes) creates the necessary visual rhythm.

### Information Density

- **Tables:** Tight row height (40px), dense but readable. Financial tables should look like tables, not cards.
- **Cards:** Used for KPI metrics only. Not for every section.
- **Whitespace:** Applied within sections, not between every element. Operations tools are dense.

---

## 3. Design System Architecture

### File Structure

```
src/
  index.css                  ← Tailwind directives + CSS custom properties + global styles
  components/
    ui/
      Badge.tsx              ← redesigned
      Button.tsx             ← redesigned
      Card.tsx               ← redesigned (renamed SectionCard internally)
      ConfirmDialog.tsx      ← redesigned
      EmptyState.tsx         ← redesigned
      ErrorBoundary.tsx      ← kept (logic only)
      ErrorState.tsx         ← redesigned
      Input.tsx              ← redesigned
      LoadingSkeleton.tsx    ← redesigned
      Modal.tsx              ← redesigned
      NetworkBanner.tsx      ← redesigned
      NoSearchResults.tsx    ← redesigned
      Pagination.tsx         ← redesigned
      PermissionDenied.tsx   ← redesigned
      Select.tsx             ← redesigned
      SessionExpiredModal.tsx ← redesigned
      Spinner.tsx            ← kept
      StatCard.tsx           ← redesigned
      StateViews.tsx         ← redesigned
      Table.tsx              ← redesigned
```

### Tailwind Config Changes

Replace the `skydash` theme extension with a new `brand` extension:

```js
brand: {
  50:  '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
}
```

---

## 4. Component Redesign Specifications

### AppLayout / AppShell
**Current issues:** Shadow on sidebar, animated mobile menu causes layout jank, profile card overly styled.

**Redesign:**
- Sidebar: `w-60` on desktop, `border-r border-slate-200 bg-white`
- Nav items: `px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900`
- Active nav: `bg-blue-50 text-blue-700 font-medium` + `border-l-2 border-blue-600` via left padding offset
- No shadows on sidebar
- Mobile: slide-over drawer, overlay backdrop
- User profile: compact row at bottom — avatar initial + email + sign out icon

### Button
**Variants:** `primary`, `secondary`, `outline`, `ghost`, `danger`
- Primary: `bg-blue-700 hover:bg-blue-800 text-white`
- Secondary: `bg-slate-100 hover:bg-slate-200 text-slate-700`
- Outline: `border border-slate-200 bg-white hover:bg-slate-50 text-slate-700`
- Ghost: `hover:bg-slate-100 text-slate-600`
- Danger: `bg-red-600 hover:bg-red-700 text-white`
- All: `h-9 px-4 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600`
- Loading: spinner inline left, button disabled

### Input
- `h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600`
- Error state: `border-red-400 focus:ring-red-600/20`
- Valid state: `border-green-400`
- Label: `text-sm font-medium text-slate-700 mb-1`
- Helper text: `text-xs text-slate-500 mt-1`
- Error text: `text-xs text-red-600 mt-1`

### Badge
**Variants:** `default`, `success`, `warning`, `danger`, `info`, `purple`
- Base: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`
- Success: `bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20`
- Warning: `bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20`
- Danger: `bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20`
- Default: `bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20`
- Info/Primary: `bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20`
- Purple: `bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20`

### Table
- Container: `overflow-hidden rounded-lg border border-slate-200`
- `<table>`: `w-full text-sm`
- `<thead>`: `bg-slate-50 border-b border-slate-200`
- `<th>`: `px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider`
- `<tbody>`: `divide-y divide-slate-100`
- `<tr>`: `hover:bg-slate-50 transition-colors cursor-pointer`
- `<td>`: `px-4 py-3 text-sm text-slate-700`
- Loading: skeleton rows (no spinner)

### Modal
- Overlay: `fixed inset-0 bg-black/40 backdrop-blur-sm z-50`
- Container: `relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4`
- Header: `px-6 py-4 border-b border-slate-200`
- Body: `px-6 py-4 overflow-y-auto max-h-[70vh]`
- Footer: `px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2`
- xl size: `max-w-3xl`

### StatCard
- Container: `bg-white rounded-lg border border-slate-200 p-5`
- Icon: `w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600`
- Value: `text-2xl font-bold text-slate-900 font-mono mt-2`
- Label: `text-sm text-slate-500`
- Change badge: small green/red inline indicator

### Card (SectionCard)
- `bg-white rounded-lg border border-slate-200`
- Header: `px-5 py-4 border-b border-slate-100 flex items-center justify-between`
- Body: `p-5`

---

## 5. Page-Level Redesign Specifications

### LoginPage
- Full-height centered layout, `bg-slate-50`
- White card `max-w-sm`, `rounded-xl`, `shadow-lg`, `border border-slate-200`
- App icon: blue square with white icon
- Clean email/password fields, no decorative background blobs

### DashboardPage
- PageHeader with date filter and "New Invoice" CTA
- 2-column stat cards (Total Value, Cataloged SKUs)
- Full-width recent invoices table (last 10)
- No duplicate invoice modal — navigate to `/purchases/:id` on row click

### PurchasesPage
- Filters row: search + memo filter + date filter + date picker + reset
- Stat strip: count + total spend
- Paginated table
- Row click opens detail modal (kept)

### BillUploadWorkflow (New/Edit Invoice)
- Header metadata card: clean grid layout for invoice fields
- Line items: desktop table, mobile card-per-item
- Totals: right-aligned summary block
- Validation errors: top banner with list

### SuppliersPage / ProductsPage
- Filter bar + add button
- Table with click-to-edit
- Modal form

### AnalyticsPage
- 3 stat cards at top
- 2-column chart area (timeline 2/3, pie chart 1/3)
- Table breakdown below

### OrderPlannerPage
- Control bar (supplier picker, search, quick actions)
- Product grid (2 col on tablet+)
- Desktop sticky cart sidebar
- Mobile floating summary bar at bottom

### AuditLogPage
- Category filter pills + search
- Table
- Detail modal with diff view

### SettingsPage
- Clean section cards

---

## 6. Business Logic Preservation Strategy

All functional code is isolated in:
- `src/services/` — zero changes
- `src/hooks/` — zero changes
- `src/context/ToastContext.tsx` — zero changes
- `src/utils/` — zero changes
- `src/types/index.ts` — zero changes
- `src/integrations/` — zero changes

The redesign only touches:
- `src/components/ui/` — visual shell of primitives
- `src/layouts/AppLayout.tsx` — visual shell
- `src/pages/*.tsx` — visual layout, JSX structure (props/handlers preserved)
- `src/features/purchases/BillUploadWorkflow.tsx` — JSX layout only
- `src/index.css` — global styles and tokens
- `tailwind.config.js` — color tokens only

---

## 7. Technical Constraints

- No new npm dependencies beyond what is already installed
- Recharts stays as-is (chart logic untouched, only container styling)
- Inter font: already available via system-ui, add Google Fonts import in index.html as enhancement
- No Jest/Vitest tests added (not requested, would extend scope)
- TypeScript strict mode: all redesigned components must have proper types
