---
inclusion: always
---

# Frontend Redesign Engineering Standards

This steering file is active for the duration of the complete frontend redesign of the **Purchase Audit & Order Intelligence System**. It encodes the authority of all four primary design resources:

- **frontend-design** (`.claude/skills/frontend-design/SKILL.md`) — visual design lead
- **ui-ux-pro-max** (`.claude/skills/ui-ux-pro-max/SKILL.md`) — UX strategy
- **ui-design-system** (`.claude/skills/ui-design-system/SKILL.md`) — design tokens and component system
- **frontend-developer** (`.claude/agents/frontend-developer.md`) — implementation engineering

---

## 1. Design Philosophy

This is a **B2B procurement auditing tool** used by a single operator managing FMCG wholesale purchases. The design must feel like a premium commercial SaaS product used by a professional. It is NOT a consumer app — it handles financial data, GST compliance, supplier management, and audit trails.

### Guiding aesthetic

- **Professional and functional** — every element earns its presence
- **High information density** that remains scannable — this is an operations tool, not a marketing page
- **Clean typography hierarchy** — numbers, amounts, and identifiers must be instantly readable
- **Calm authority** — confident but not flashy; precise, not decorative
- **Monospace for data, proportional for prose** — financial figures use mono, headings use sans-serif

### Explicitly avoid

- Generic "AI dashboard" card grids with soft shadows on everything
- Scattered animations on every hover and scroll
- Glassmorphism as decoration rather than function
- Random gradient washes behind content
- ALL-CAPS eyebrow labels above every heading
- Inconsistent border-radius (pick one scale and stick to it)
- Emojis used as UI icons (Lucide React is the icon set — already installed)

---

## 2. Design System Tokens

### Color System

```
Primary:     #1E40AF  (strong professional blue — conveys trust and precision)
Primary-100: #DBEAFE
Primary-200: #BFDBFE
Primary-600: #2563EB
Primary-700: #1D4ED8
Primary-800: #1E40AF
Primary-900: #1E3A8A

Surface:     #FFFFFF
Surface-50:  #F8FAFC
Surface-100: #F1F5F9

Border:      #E2E8F0
Border-200:  #CBD5E1

Text-900:    #0F172A  (headings, primary text)
Text-600:    #475569  (secondary text, labels)
Text-400:    #94A3B8  (placeholders, disabled)

Semantic:
  Success:   #16A34A / bg: #F0FDF4 / border: #BBF7D0
  Warning:   #D97706 / bg: #FFFBEB / border: #FDE68A
  Error:     #DC2626 / bg: #FEF2F2 / border: #FECACA
  Info:      #2563EB / bg: #EFF6FF / border: #BFDBFE

Accent:      #7C3AED  (used sparingly for price history, audit trails — signals immutability)
```

### Typography Scale

```
Font:        Inter (system-ui fallback)
Mono:        'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace

Display:     2rem   / 700 / tracking-tight       (page KPI numbers)
H1:          1.5rem / 700 / tracking-tight       (page titles)
H2:          1.25rem / 600                       (section headings)
H3:          1rem   / 600                        (card headings)
Body-LG:     1rem   / 400 / leading-relaxed
Body:        0.875rem / 400 / leading-relaxed    (default)
Body-SM:     0.75rem / 400 / leading-normal      (table cells, meta)
Caption:     0.6875rem / 500 / tracking-wide     (labels, badges)
Mono-body:   0.875rem / 400                      (invoice numbers, amounts, GST values)
Mono-sm:     0.75rem / 400                       (HSN codes, IDs)
```

### Spacing

```
Base grid: 4px
xs:   4px    (0.25rem)
sm:   8px    (0.5rem)
md:   12px   (0.75rem)
base: 16px   (1rem)
lg:   24px   (1.5rem)
xl:   32px   (2rem)
2xl:  48px   (3rem)
3xl:  64px   (4rem)
```

### Border radius

```
sm:   4px   (inputs, small badges)
md:   8px   (buttons, cards)
lg:   12px  (modals, drawers)
xl:   16px  (large panels)
full: 9999px (pill badges)
```

### Shadows

```
sm:  0 1px 2px 0 rgb(0 0 0 / 0.05)
md:  0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
lg:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
xl:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
```

---

## 3. Component Contracts

### Every page must use these shared layouts

- `AppShell` — sidebar + main content, sticky sidebar on desktop
- `PageHeader` — title + subtitle + actions row
- `SectionCard` — white bg, border, shadow-sm, rounded-lg, p-6

### Required component behaviors

- **Tables**: sticky header, row hover state, loading skeleton (not spinner), empty state with illustration context
- **Modals**: focus trap, scroll lock, ESC to close, accessible role="dialog"
- **Forms**: all inputs labeled, validation messages below field, loading state on submit button
- **Toasts**: bottom-right on desktop, top-center on mobile, 4s success, 6s error
- **Buttons**: loading spinner replaces icon, disabled during async, min 44px touch target

### Responsive breakpoints

```
mobile: < 640px
tablet: 640px–1023px
desktop: ≥ 1024px
wide: ≥ 1280px
```

---

## 4. Zero Functional Regression Rules

**These are absolute and non-negotiable:**

1. All Supabase calls in `dbService.ts` are preserved unchanged
2. All `localStorage` fallback logic is preserved
3. `useAuth` hook contract is unchanged — same `user`, `profile`, `signIn`, `signOut`, `isAdmin`
4. All route paths remain identical — no route changes
5. All form field names, validation rules, and submission handlers are preserved
6. `invoiceService.ts` calculation logic (`recalcFromItems`) is not modified
7. `dateUtils.ts` IST formatting functions are not modified
8. `dbService.ts` audit logging calls remain intact
9. Supabase RLS is not modified
10. The `ToastContext` API shape (`success`, `error`, `warning`, `info`) is unchanged

---

## 5. Accessibility Standards (WCAG 2.2 AA)

- All interactive elements: minimum 44×44px touch target
- Color contrast: 4.5:1 for body text, 3:1 for large text and UI components
- Focus indicators: 2px visible outline, not hidden via `outline: none` without replacement
- All form inputs have associated `<label>` elements
- Icon-only buttons have `aria-label`
- Dialogs use `role="dialog"` with `aria-labelledby`
- Tables use `<th scope>` for headers
- Loading states announced via `aria-live` or `aria-busy`
- No content flashing more than 3 times per second

---

## 6. Performance Standards

- No unnecessary re-renders in list components
- `React.memo` where tables render >20 rows
- Async data fetch errors are caught and displayed — no silent failures
- No `console.error` in production builds from unhandled promises
- All images (if any) have explicit `width`/`height` to prevent CLS
- Code splitting is not required (this is a small SPA), but avoid importing entire libraries for single functions

---

## 7. Implementation Discipline

- TypeScript strict mode: no `any` unless legacy compatibility requires it
- Component files: one component per file, co-located with its types
- Utility functions stay in `src/utils/` — do not duplicate date formatting
- Shared UI components in `src/components/ui/` — the design system layer
- Feature-level components in `src/features/` or `src/pages/`
- No hardcoded colors in JSX — use Tailwind tokens from the design system
- No inline `style=` props for spacing or color — use Tailwind classes
