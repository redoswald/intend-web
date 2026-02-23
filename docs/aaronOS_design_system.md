# aaronOS Design System

> The shared design language for All Friends, Opus, and future aaronOS apps.

---

## 1. Philosophy

### System-Level Principles

These apply to every app in the ecosystem:

- **Warm over cold.** Rounded corners, soft shadows, warm neutrals. Nothing should feel like enterprise software.
- **Competent over cute.** This is playful but not childish. Users trust these tools with real data — friendships, projects, deadlines. The UI should feel warm *and* capable.
- **Dense when working, spacious when browsing.** Landing pages and onboarding breathe. Dashboards and lists prioritize information density.
- **Consistent chrome, independent personality.** The shell (sidebar, app switcher, account menu) is identical everywhere. The content area is where each app expresses itself.
- **Keyboard-first, touch-ready.** Power users get shortcuts. Mobile users get generous tap targets. Both are first-class.

### Per-App Personality

Each app owns a **one-liner** and an **accent color**. Everything else is shared.

| App | One-liner | Accent Color |
|-----|-----------|-------------|
| All Friends | "Be the friend you wish you had" | Coral `#FF6B6B` |
| Opus | "Get things done, beautifully" | Warm Orange `#F97316` |
| *(Future app)* | *(TBD)* | *(Pick from approved palette)* |

The accent color is the *only* thing that meaningfully changes between apps. Typography, spacing, neutrals, layout, component shapes, and interaction patterns are identical.

---

## 2. Color System

### Architecture

Colors are defined as CSS custom properties with three layers:

1. **Shared palette** — neutrals, semantics, and the secondary teal. Identical everywhere.
2. **Accent layer** — `--color-accent-*` variables that each app sets to its own brand color.
3. **Surface layer** — background/foreground pairs for theming (light/dark mode).

### Shared Palette

#### Neutrals

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--gray-950` | `#111118` | `#F5F5F7` | Headings in high-contrast contexts |
| `--gray-900` | `#1A1A2E` | `#EDEDF0` | Primary headings |
| `--gray-700` | `#4A4A5A` | `#B0B0BC` | Body text |
| `--gray-500` | `#7A7A8A` | `#8A8A9A` | Secondary text, placeholders |
| `--gray-300` | `#C5C5D0` | `#4A4A5A` | Disabled states |
| `--gray-200` | `#E5E5EA` | `#2A2A3A` | Borders, dividers |
| `--gray-100` | `#F5F5F7` | `#1E1E2E` | Subtle backgrounds |
| `--gray-50` | `#FAFAFE` | `#161622` | Page backgrounds |
| `--white` | `#FFFFFF` | `#1A1A2E` | Card backgrounds, surfaces |

Note: Dark mode values are indicative. Final dark mode palette should be tested for contrast compliance (WCAG AA minimum, AAA preferred for body text).

#### Secondary (Teal) — Shared across all apps

| Token | Value | Usage |
|-------|-------|-------|
| `--teal-50` | `#E0F7F5` | Subtle backgrounds |
| `--teal-100` | `#B3EBE6` | Light accents |
| `--teal-200` | `#80DED5` | — |
| `--teal-300` | `#4ECDC4` | Primary teal — icons, success, secondary actions |
| `--teal-400` | `#3DB9B1` | Hover states |
| `--teal-500` | `#2CA59D` | Active/pressed states |

Teal is the shared "friendly" color. Use it for success states, secondary highlights, and visual variety. It should *complement* the accent, never compete with it.

#### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `var(--teal-300)` | Confirmations, positive states |
| `--color-warning` | `#FFB86C` | Caution, approaching deadlines |
| `--color-error` | `#EF4444` | Errors, destructive actions |
| `--color-info` | `var(--teal-300)` | Informational highlights |

Note: `--color-error` is intentionally *not* the accent coral, even in All Friends. Error red should be universally recognizable and distinct from brand color. Using `#EF4444` (a cooler, standard red) prevents confusion between "this is the brand" and "something went wrong."

### Accent Layer (Per-App)

Each app sets these variables. Components reference `--accent-*` and automatically adopt the app's personality.

```css
/* All Friends */
:root[data-app="friends"] {
  --accent-50:  #FFE5E5;
  --accent-100: #FFCCCC;
  --accent-200: #FF9999;
  --accent-300: #FF6B6B;  /* Primary accent */
  --accent-400: #E85555;  /* Hover */
  --accent-500: #D14545;  /* Active/pressed */
  --accent-shadow: rgba(255, 107, 107, 0.3);
}

/* Opus */
:root[data-app="opus"] {
  --accent-50:  #FFF7ED;
  --accent-100: #FFEDD5;
  --accent-200: #FED7AA;
  --accent-300: #F97316;  /* Primary accent */
  --accent-400: #EA580C;  /* Hover */
  --accent-500: #C2410C;  /* Active/pressed */
  --accent-shadow: rgba(249, 115, 22, 0.3);
}
```

### How to Use Accent Colors

- **Primary buttons:** `background: var(--accent-300)`
- **Primary button hover:** `background: var(--accent-400)`
- **Links:** `color: var(--accent-300)`
- **Active nav items:** `color: var(--accent-300)` or `border-left: 3px solid var(--accent-300)`
- **Focus rings:** `box-shadow: 0 0 0 3px var(--accent-50)`
- **Accent backgrounds:** `background: var(--accent-50)` (for tags, badges, icon wrappers)
- **Accent shadows:** `box-shadow: 0 4px 12px var(--accent-shadow)`

Do NOT use accent for errors, warnings, or destructive actions. Use semantic colors instead.

---

## 3. Typography

### Font Stack

```css
--font-sans: 'DM Sans', 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
```

**DM Sans** is the system-wide typeface. It's warm, geometric, and readable at all sizes. Load weights 400, 500, 600, and 700 via Google Fonts or `next/font`.

**Geist Mono** is for code snippets, timestamps, and data-dense elements (event counts, cadence numbers).

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-hero` | 48px / 3rem | 700 | 1.1 | Landing page hero only |
| `--text-h1` | 32px / 2rem | 600 | 1.2 | Page titles ("Dashboard," "Contacts") |
| `--text-h2` | 24px / 1.5rem | 600 | 1.25 | Section headers |
| `--text-h3` | 20px / 1.25rem | 600 | 1.3 | Card titles, modal headers |
| `--text-body` | 16px / 1rem | 400 | 1.6 | Default body text |
| `--text-sm` | 14px / 0.875rem | 400 | 1.5 | Secondary text, descriptions, table cells |
| `--text-xs` | 12px / 0.75rem | 500 | 1.4 | Captions, badges, timestamps, metadata |

### Text Colors

- Primary text: `var(--gray-900)`
- Body text: `var(--gray-700)`
- Muted / secondary: `var(--gray-500)`
- Disabled: `var(--gray-300)`
- Links: `var(--accent-300)`
- Link hover: `var(--accent-400)`

Never use pure `#000000` for text. Darkest allowed is `var(--gray-950)`.

---

## 4. Spacing & Sizing

### Spacing Scale

Base unit: **4px**. All spacing uses this scale:

| Token | Value | Common Usage |
|-------|-------|-------------|
| `--space-1` | 4px | Icon-to-label gap, tight padding |
| `--space-2` | 8px | Inline element spacing |
| `--space-3` | 12px | Input padding, compact card padding |
| `--space-4` | 16px | Standard element spacing |
| `--space-6` | 24px | Card padding, section gaps |
| `--space-8` | 32px | Section spacing |
| `--space-12` | 48px | Large section spacing |
| `--space-16` | 64px | Page-level spacing, hero padding |
| `--space-24` | 96px | Landing page section gaps |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Badges, small tags |
| `--radius-md` | 10px | Inputs, small buttons |
| `--radius-lg` | 12px | Buttons, icon wrappers |
| `--radius-xl` | 16px | Cards |
| `--radius-2xl` | 20px | Modals, large containers |
| `--radius-full` | 9999px | Avatars, pills |

**Rule of thumb:** When in doubt, round it more. Sharp corners are reserved for inner data elements (table cells, code blocks), never for containers or interactive elements.

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle depth for flat elements |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.04)` | Cards at rest |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Elevated cards, dropdowns |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | Modals, popovers |
| `--shadow-accent` | `0 4px 12px var(--accent-shadow)` | Hovered primary buttons |

---

## 5. Layout Shell

### The aaronOS App Frame

Every app shares this structure:

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (240px)       │  Content Area                │
│                       │                              │
│ ┌───────────────────┐ │  ┌──────────────────────────┐│
│ │ App Switcher      │ │  │  Page Header             ││
│ │ [Logo] All Friends│ │  │  "Dashboard"             ││
│ └───────────────────┘ │  └──────────────────────────┘│
│                       │                              │
│  Navigation           │  ┌──────────────────────────┐│
│  ● Dashboard          │  │                          ││
│  ● Contacts           │  │  Page Content            ││
│  ● Events             │  │                          ││
│  ● Calendar           │  │                          ││
│                       │  │                          ││
│                       │  │                          ││
│                       │  │                          ││
│                       │  │                          ││
│                       │  └──────────────────────────┘│
│                       │                              │
│ ┌───────────────────┐ │                              │
│ │ Account menu      │ │                              │
│ │ [Avatar] Aaron    │ │                              │
│ └───────────────────┘ │                              │
└──────────────────────────────────────────────────────┘
```

### Sidebar Spec

| Property | Value |
|----------|-------|
| Default width | 240px |
| Min width | 180px |
| Max width | 360px |
| Collapsed width | 0px (mobile — hidden behind hamburger) |
| Resize | Draggable right edge (4px hit area, `cursor: col-resize`) |
| Persist width | Save to `localStorage` per app, per user |
| Background | `var(--white)` with right border `1px solid var(--gray-200)` |
| Padding | `var(--space-4)` (16px) |
| Font size | `var(--text-sm)` (14px) for nav items |
| Active item | `color: var(--accent-300)`, `background: var(--accent-50)`, left border or pill |
| Hover item | `background: var(--gray-100)` |
| Section labels | `var(--text-xs)`, `var(--gray-500)`, uppercase, `font-weight: 600`, `letter-spacing: 0.05em` |

#### Resize Behavior

The sidebar's right edge is draggable. Implementation notes:

- **Drag handle:** Invisible 4px-wide strip on the sidebar's right border. On hover, border brightens to `var(--gray-300)` and cursor becomes `col-resize`.
- **While dragging:** Sidebar resizes live. Content area adjusts. No animation during drag (use `transition: none` on width while dragging, restore `transition: width 200ms ease` after).
- **Snap points:** If dragged below min-width (180px), snap to collapsed (0px + hamburger toggle appears). If dragged above max-width (360px), clamp at 360px.
- **Persistence:** Save width to `localStorage` keyed by app name. On load, restore last width. Default: 240px.
- **Double-click:** Double-clicking the drag handle resets to default width (240px).
- **Keyboard:** No keyboard resize needed — this is a mouse/trackpad affordance.

### Sidebar Zones

The sidebar has three zones, top to bottom:

**Zone 1 — App Identity (top)**
- App icon/logo + app name
- Clicking the logo goes to that app's home/dashboard
- Dropdown arrow or chevron opens the app switcher (see §8)

**Zone 2 — Navigation (middle, scrollable)**
- Primary nav items (Dashboard, Contacts, etc.)
- Grouped sections with labels (e.g., "PROJECTS" in Opus)
- Nested items indented with `padding-left: var(--space-8)`
- Counts/badges right-aligned (e.g., "Today 12")

**Zone 3 — Account (bottom, pinned)**
- User avatar (32px circle) + display name
- Clicking opens account dropdown (Settings, Sign out)
- ⌘K search shortcut hint (if supported)

### Content Area

| Property | Value |
|----------|-------|
| Background | `var(--gray-50)` or `var(--white)` depending on page density |
| Max width | `960px` for content-heavy pages, `1200px` for dashboards, full-width for tables |
| Padding | `var(--space-8)` (32px) on desktop, `var(--space-4)` (16px) on mobile |

### Page Header Pattern

Every content page starts with a consistent header:

```
Page Title                                    [Primary Action Button]
Optional subtitle or breadcrumb
─────────────────────────────────────────────
```

- Title: `var(--text-h1)` (32px, weight 600)
- Subtitle: `var(--text-sm)`, `var(--gray-500)`
- Primary action: accent-colored button, right-aligned
- Divider: `1px solid var(--gray-200)` or just `var(--space-6)` gap

### Mobile Layout (< 768px)

- Sidebar collapses fully (0px) with a hamburger toggle in the top-left of the content area
- If user drags sidebar below min-width on desktop, it also collapses to hamburger mode
- Content area goes full-width
- Page header stacks (title above action button)
- Bottom bar optional for most-used nav (Dashboard, Contacts/Inbox)
- App switcher moves into hamburger menu

### Tablet Layout (768px – 1024px)

- Sidebar defaults to 200px but respects user's persisted width (clamped to min/max)
- User can still drag to resize
- Content area stretches to fill

---

## 6. Components

All components use the accent variable system. These specs define the *shared* component library.

### Buttons

#### Primary

```css
.btn-primary {
  background: var(--accent-300);
  color: white;
  padding: var(--space-3) var(--space-6);   /* 12px 24px */
  border-radius: var(--radius-lg);          /* 12px */
  font-size: var(--text-sm);                /* 14px */
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-primary:hover {
  background: var(--accent-400);
  transform: translateY(-1px);
  box-shadow: var(--shadow-accent);
}
.btn-primary:active {
  background: var(--accent-500);
  transform: translateY(0);
}
.btn-primary:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

#### Secondary (Outline)

```css
.btn-secondary {
  background: transparent;
  color: var(--gray-900);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 600;
  border: 1.5px solid var(--gray-200);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-secondary:hover {
  border-color: var(--accent-300);
  color: var(--accent-300);
  background: var(--accent-50);
}
```

#### Ghost

```css
.btn-ghost {
  background: transparent;
  color: var(--gray-500);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-ghost:hover {
  color: var(--accent-300);
  background: var(--accent-50);
}
```

#### Destructive

```css
.btn-destructive {
  background: transparent;
  color: var(--color-error);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 600;
  border: 1.5px solid var(--color-error);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-destructive:hover {
  background: var(--color-error);
  color: white;
}
```

### Size Variants

| Size | Padding | Font Size | Radius |
|------|---------|-----------|--------|
| `sm` | `8px 16px` | `var(--text-xs)` | `var(--radius-md)` |
| `md` (default) | `12px 24px` | `var(--text-sm)` | `var(--radius-lg)` |
| `lg` | `16px 32px` | `var(--text-body)` | `var(--radius-lg)` |
| `icon` | `10px` | — | `var(--radius-lg)` |

### Cards

#### Standard Card

```css
.card {
  background: var(--white);
  border-radius: var(--radius-xl);     /* 16px */
  padding: var(--space-6);             /* 24px */
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-xs);
  transition: all 0.15s ease;
}
```

#### Interactive Card (clickable)

```css
.card-interactive:hover {
  border-color: var(--accent-200);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
  cursor: pointer;
}
.card-interactive:active {
  transform: translateY(0);
  box-shadow: var(--shadow-xs);
}
```

#### Stat Card (dashboard)

```css
.card-stat {
  /* extends .card */
  padding: var(--space-4) var(--space-6);
}
.card-stat .stat-label {
  font-size: var(--text-xs);
  color: var(--gray-500);
  font-weight: 500;
  margin-bottom: var(--space-1);
}
.card-stat .stat-value {
  font-size: var(--text-h2);    /* 24px */
  font-weight: 700;
  color: var(--gray-900);
}
/* Colored stat values */
.card-stat .stat-value.accent  { color: var(--accent-300); }
.card-stat .stat-value.success { color: var(--color-success); }
.card-stat .stat-value.warning { color: var(--color-warning); }
.card-stat .stat-value.error   { color: var(--color-error); }
```

### Inputs

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);   /* 12px 16px */
  border: 1.5px solid var(--gray-200);
  border-radius: var(--radius-md);          /* 10px */
  font-size: var(--text-body);              /* 16px — prevents iOS zoom */
  font-family: var(--font-sans);
  color: var(--gray-900);
  background: var(--white);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input::placeholder {
  color: var(--gray-500);
}
.input:focus {
  outline: none;
  border-color: var(--accent-300);
  box-shadow: 0 0 0 3px var(--accent-50);
}
.input:disabled {
  background: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
}
.input.error {
  border-color: var(--color-error);
}
.input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

### Tags / Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

/* Color variants — used for contact tags */
.badge-accent  { background: var(--accent-50);  color: var(--accent-400); }
.badge-teal    { background: var(--teal-50);     color: var(--teal-500); }
.badge-warning { background: #FFF3E0;            color: #E65100; }
.badge-error   { background: #FFEBEE;            color: #C62828; }
.badge-neutral { background: var(--gray-100);     color: var(--gray-700); }

/* User-assigned tag colors — these should be configurable per tag */
.badge-custom {
  /* Set --tag-bg and --tag-text per tag instance */
  background: var(--tag-bg);
  color: var(--tag-text);
}
```

### Icon Wrappers

For feature cards and list items:

```css
.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);    /* 12px */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-wrapper svg {
  width: 20px;
  height: 20px;
}

/* Variants */
.icon-wrapper.accent { background: var(--accent-50); color: var(--accent-300); }
.icon-wrapper.teal   { background: var(--teal-50);   color: var(--teal-300); }
.icon-wrapper.warning { background: #FFF3E0;          color: #F57C00; }
.icon-wrapper.error   { background: #FFEBEE;          color: var(--color-error); }
.icon-wrapper.neutral { background: var(--gray-100);   color: var(--gray-500); }
```

### Toasts / Notifications

```css
.toast {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  animation: toast-in 0.2s ease;
}

.toast-success { background: var(--teal-50);    color: var(--teal-500);   border: 1px solid var(--teal-100); }
.toast-error   { background: #FFEBEE;           color: #C62828;           border: 1px solid #FFCDD2; }
.toast-info    { background: var(--accent-50);   color: var(--accent-400); border: 1px solid var(--accent-100); }
.toast-neutral { background: var(--white);       color: var(--gray-700);   border: 1px solid var(--gray-200); }

/* Undo variant — for destructive actions */
.toast-undo {
  background: var(--gray-900);
  color: white;
  border: none;
}
.toast-undo .undo-btn {
  color: var(--accent-300);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Modals / Dialogs

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 46, 0.5);
  backdrop-filter: blur(4px);
  z-index: 900;
  animation: overlay-in 0.15s ease;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--white);
  border-radius: var(--radius-2xl);      /* 20px */
  padding: var(--space-8);               /* 32px */
  box-shadow: var(--shadow-lg);
  z-index: 901;
  width: min(90vw, 480px);
  animation: modal-in 0.15s ease;
}

.modal-header {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: var(--space-4);
}

.modal-body {
  font-size: var(--text-body);
  color: var(--gray-700);
  margin-bottom: var(--space-6);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

/* Destructive confirmation modal */
.modal.destructive .modal-header {
  color: var(--color-error);
}

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes modal-in {
  from { opacity: 0; transform: translate(-50%, -48%); }
  to   { opacity: 1; transform: translate(-50%, -50%); }
}
```

### Empty States

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-16) var(--space-8);
  color: var(--gray-500);
}

.empty-state .empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-4);
  color: var(--gray-300);
}

.empty-state .empty-title {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: var(--space-2);
}

.empty-state .empty-description {
  font-size: var(--text-body);
  color: var(--gray-500);
  max-width: 400px;
  margin-bottom: var(--space-6);
}

/* The empty state always has a CTA */
.empty-state .btn-primary {
  /* standard primary button */
}
```

### Loading Skeletons

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-100) 25%,
    var(--gray-200) 50%,
    var(--gray-100) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease infinite;
  border-radius: var(--radius-md);
}

.skeleton-text     { height: 16px; width: 80%; }
.skeleton-text-sm  { height: 12px; width: 60%; }
.skeleton-heading  { height: 28px; width: 50%; }
.skeleton-avatar   { height: 40px; width: 40px; border-radius: var(--radius-full); }
.skeleton-card     { height: 100px; width: 100%; border-radius: var(--radius-xl); }

@keyframes skeleton-pulse {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 7. Iconography

### Library

Use **Lucide** icons system-wide. Both apps should use the same icon set for consistency.

### Sizing

| Context | Size | Stroke Width |
|---------|------|-------------|
| Navigation items | 18px | 1.75 |
| In-line with body text | 16px | 1.75 |
| Icon buttons | 18px | 2 |
| Feature cards / empty states | 24px | 1.5 |
| Large decorative | 48–64px | 1.25 |

### Style Rules

- Always use `currentColor` for stroke so icons inherit text color
- Never fill icons unless they represent a selected/active state
- Pair with icon wrappers (see §6) when used in lists or cards

---

## 8. Shared Chrome Components

### App Switcher

Lives at the top of the sidebar (Zone 1). Minimal — just the current app's identity with a way to switch.

**Collapsed state:**
```
┌─────────────────────────┐
│ [Icon]  All Friends  ▾  │
└─────────────────────────┘
```

**Expanded dropdown:**
```
┌─────────────────────────┐
│ ✓ All Friends           │
│   Opus                  │
│ ──────────────────────  │
│   Account settings      │
└─────────────────────────┘
```

- Current app gets a checkmark
- Other apps are plain links — clicking navigates to that app's domain
- "Account settings" lives here as a natural place for cross-app settings
- Dropdown uses `.card` styling with `var(--shadow-md)`
- Each app row shows the app icon + name
- Chevron rotates on open

**Behavior:**
- If the user has only signed up for one app, the switcher just shows the current app name (no dropdown)
- The switcher should not "beg" — it's a subtle affordance, not a promotion
- On mobile, the app switcher moves inside the hamburger menu

### Account Menu

Lives at the bottom of the sidebar (Zone 3).

```
┌─────────────────────────┐
│ [Avatar]  Aaron      ⚙  │
└─────────────────────────┘
```

- Avatar: 32px circle, initials fallback if no photo
- Display name: `var(--text-sm)`, `var(--gray-700)`, truncate with ellipsis
- Settings gear: ghost icon button, opens account settings
- Clicking the row (not the gear) opens a dropdown:

```
┌─────────────────────────┐
│  aaron@email.com        │
│ ──────────────────────  │
│  Account settings       │
│  Keyboard shortcuts     │
│  Theme: Light       ▸   │
│ ──────────────────────  │
│  Sign out               │
└─────────────────────────┘
```

### Account Settings Page

A shared page accessible from any app. Route: `/settings` (or `/account`).

**Sections:**
1. **Profile** — Display name, email (read-only if OAuth), avatar upload
2. **Security** — Change password (if email auth), connected accounts
3. **Appearance** — Theme (light/dark/system), density (comfortable/compact)
4. **Apps** — List of aaronOS apps the user has access to, with links
5. **Data** — Export all data (JSON/CSV), delete account
6. **About** — "Built by Aaron" + links

This page uses the same sidebar layout as the rest of the app, but the sidebar shows settings sections instead of app navigation.

---

## 9. Interaction Patterns

### Transitions

| Action | Duration | Easing | Property |
|--------|----------|--------|----------|
| Button hover | 150ms | ease | background, transform, box-shadow |
| Card hover | 150ms | ease | border-color, box-shadow, transform |
| Modal open | 150ms | ease | opacity, transform |
| Toast enter | 200ms | ease | opacity, transform |
| Toast exit | 150ms | ease | opacity |
| Sidebar collapse | 200ms | ease-in-out | width |
| Nav item active | 150ms | ease | background, color |
| Dropdown open | 100ms | ease-out | opacity, transform |
| Skeleton pulse | 1500ms | ease | background-position (infinite) |

**Rule:** Nothing should animate longer than 200ms for interactive elements. Decorative/ambient animations (skeletons, landing page) can be longer.

### Focus States

All interactive elements must have visible focus indicators for keyboard navigation:

```css
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-50), 0 0 0 4px var(--accent-300);
  border-radius: inherit;
}
```

### Destructive Action Pattern

Any action that deletes or permanently modifies data follows this flow:

1. User clicks delete/remove
2. Confirmation modal appears with:
   - Clear description of what will happen
   - The item name in bold
   - Cancel button (secondary) + Confirm button (destructive)
3. On confirm: action executes, toast appears with "Undo" option (5-second window)
4. After 5 seconds: action is permanent

For bulk operations (3+ items), add a count and require typing "DELETE" for 10+ items.

---

## 10. Responsive Breakpoints

| Name | Range | Layout |
|------|-------|--------|
| Mobile | < 640px | Full-width content, hamburger nav, stacked layouts |
| Tablet | 640px – 1024px | Narrow or icon-only sidebar, adapted grid |
| Desktop | > 1024px | Full sidebar (240px) + content area |
| Wide | > 1440px | Content area max-width kicks in, centered |

### Grid Patterns

- **Dashboard stat cards:** 4-col on desktop → 2-col on tablet → 1-col on mobile
- **Feature cards (landing page):** 3-col on desktop → 2-col on tablet → 1-col on mobile
- **Contact/task lists:** Full-width at all sizes, with responsive columns hiding on mobile

---

## 11. Priority & Phasing

### v1 — Ship with the design system migration

These are required before either app goes live with the new design system:

1. **Sidebar layout** (both apps) — including resize-by-drag and mobile hamburger
2. **Toast/undo system** — every mutation gets feedback; destructive actions get a 5-second undo window
3. **Loading skeletons** — for dashboard stats, contact/task lists, and any data-fetching view
4. **App switcher** — minimal dropdown in sidebar Zone 1
5. **Account menu** — bottom of sidebar with dropdown
6. **Empty states** — for all primary views (zero contacts, zero tasks, empty search)
7. **Destructive action modals** — confirmation pattern for delete/archive

### v2 — Polish pass

- Dark mode (the CSS variable architecture supports it, but it's not v1)
- Account settings page (shared cross-app route)
- Keyboard shortcut help overlay
- Compact/comfortable density toggle
- PWA support

### Deferred

- Shared component library as a published npm package (overkill for 2 apps — just keep patterns consistent via the spec)
- Design tokens as a separate repo

---

## 12. Migration Guide

### All Friends (closer to target)

**Do first — layout migration:**
- [ ] Migrate from top nav to sidebar layout with resize-by-drag
- [ ] Add mobile responsive sidebar (hamburger collapse)
- [ ] Add app switcher component to sidebar Zone 1
- [ ] Add account menu component to sidebar Zone 3

**Then — color abstraction:**
- [ ] Extract app-specific colors into `--accent-*` variables
- [ ] Replace hardcoded coral references in components with `var(--accent-*)`
- [ ] Ensure error color is `#EF4444`, not coral

**Then — interaction patterns (v1):**
- [ ] Add toast/undo system
- [ ] Add modal confirmation pattern for destructive actions
- [ ] Add empty state components
- [ ] Add loading skeleton components

**Deferred:**
- [ ] Dark mode (CSS variable architecture already supports it, but not v1)

### Opus (further from target)

**Do first — foundation:**
- [ ] Upgrade Tailwind v3.4 → v4 (CSS-first config, `@theme` directive replaces `tailwind.config.js`)
- [ ] Install shadcn/ui (new-york style, to match All Friends) and migrate hand-rolled components
- [ ] Switch from system fonts to DM Sans + Geist Mono (add via Google Fonts or next/font if migrating to Next.js)
- [ ] Switch from hex colors to CSS custom properties using `--accent-*` and shared palette tokens
- [ ] Replace clsx with cn() (clsx + twMerge)

**Then — layout and chrome:**
- [ ] Adopt sidebar spec with resize-by-drag (structure is already correct, needs styling + resize handle)
- [ ] Add app switcher component to sidebar Zone 1
- [ ] Add account menu component to sidebar Zone 3
- [ ] Add mobile responsive sidebar (hamburger collapse)

**Then — interaction patterns (v1):**
- [ ] Add toast/undo system
- [ ] Add modal confirmation pattern for destructive actions
- [ ] Add empty state components
- [ ] Add loading skeleton components

**Deferred:**
- [ ] Dark mode support (CSS variable architecture will support it, but not v1)

### Shared Infrastructure (new)

- [ ] Create shared account settings page
- [ ] Implement cross-app auth session (already exists via shared Supabase)
- [ ] Deploy account settings as a shared route or micro-frontend
- [ ] Define shared user profile table (display_name, avatar_url) in Supabase

---

## 13. What NOT to Do

- **No pure black.** Darkest text is `var(--gray-950)`. Darkest background (dark mode) is `#111118`.
- **No sharp corners** on containers, buttons, or cards. Inner data elements (table cells, code) can be rectangular.
- **No accent color for errors.** Coral ≠ error red in All Friends. Orange ≠ warning amber in Opus. Semantic colors are separate.
- **No competing fonts.** DM Sans only. No mixing in other sans-serif fonts.
- **No unshadowed modals.** Every elevated surface has a shadow. Flat overlapping elements create visual confusion.
- **No silent actions.** Every user-initiated mutation (create, update, delete) gets a toast or inline confirmation.
- **No mystery navigation.** Icons without labels are only acceptable in the collapsed sidebar. Everywhere else, pair icons with text.
- **No orphan layout breaks.** If a row has 5 cards and only 4 fit, it wraps to 3+2 or 2+2+1, never 4+1 with a lonely card.