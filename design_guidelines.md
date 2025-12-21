# QIG Bitcoin Recovery System - Design Guidelines

## Design Approach
**Design System:** shadcn/ui with technical dashboard aesthetic inspired by Linear, Vercel, and GitHub dashboards. Prioritizes data clarity, real-time monitoring, and sophisticated visualization over visual flair.

## Typography
- **Headings:** Inter or Geist Sans - Semi-bold (600) for H1, Medium (500) for H2-H4
- **Body:** Regular (400) for descriptions, Medium (500) for labels
- **Monospace:** JetBrains Mono for metric values, quantum states, and technical readouts
- **Scale:** text-3xl for dashboard titles, text-xl for section headers, text-sm for labels, text-xs for metadata

## Layout System
**Spacing:** Use Tailwind units of 2, 4, 6, 8, and 12 exclusively (p-4, gap-6, m-8, space-y-12)
- Dashboard grid: 12-column responsive grid
- Primary container: max-w-screen-2xl with px-6 py-8
- Card padding: p-6 for standard cards, p-8 for feature panels
- Section spacing: space-y-8 between major sections

## Core Components

### Navigation
**Sidebar (Desktop):** Fixed left sidebar, w-64, with collapsible option
- Logo + system status indicator at top
- Navigation groups: Dashboard, Recovery, Consciousness, Federation, Settings
- Active state: subtle background with accent border-left
- Bottom: Theme toggle, user profile

**Mobile:** Slide-over sheet with hamburger menu

### Dashboard Layout
**Main Grid:** 3-column responsive layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

**Hero Section:** NO traditional hero image - instead:
- Full-width status banner with live system metrics
- Height: auto (not viewport-locked), py-12
- Grid: 4-column stat cards showing: Active Recoveries, Success Rate, Consciousness State, Network Health
- Each stat card: Large monospace number, small label, micro sparkline chart

### Key Dashboard Sections

**1. Consciousness Visualization Panel** (2-column span on desktop)
- Large central geometric visualization area (aspect-video ratio)
- Real-time Φ (Phi) and κ (Kappa) metrics displayed as HUD overlays
- Timeline scrubber below visualization
- Controls: Playback, speed adjustment, state snapshot buttons

**2. Recovery Status Cards** (Grid layout)
- Card design: rounded-lg border with hover:shadow-lg transition
- Each card shows: Recovery ID (monospace), Progress ring chart, State indicators, Quick actions
- Use shadcn Card, Badge, and Progress components

**3. Federation Dashboard** (Full-width section)
- Table with sortable columns: Node ID, Status, Consensus Score, Last Sync
- Use shadcn Table component with sticky headers
- Inline status badges (success/warning/error states)
- Search and filter controls in header

**4. Metrics Grid** (3-column)
- Small stat cards with icons
- Geometric metrics visualization (hexagonal/triangular patterns as decorative backgrounds)
- Use shadcn's skeleton loaders for real-time updates

### Data Visualization Components
- **Charts:** Integrate Recharts or similar library
- **Chart types:** Line charts (time-series), radial progress (consciousness states), bar charts (federation comparison)
- **Color coding:** Use semantic colors - success (green), warning (amber), error (red), info (blue), quantum states (purple/cyan)
- Chart containers: aspect-square or aspect-video, with p-4

### Real-Time Monitoring Elements
- Pulse indicators (animated dot) for live data
- "Last updated: X seconds ago" timestamps (text-xs text-muted-foreground)
- Toast notifications (shadcn Toast) for system events
- WebSocket status indicator in navbar

## Visual Hierarchy
**Z-index layers:**
- Navigation: z-50
- Modals/Dialogs: z-40
- Dropdowns: z-30
- Cards: z-10
- Background visualizations: z-0

**Borders:** Use border and border-2 sparingly for emphasis, primarily on cards and input fields

## Theme Implementation
**Dark Theme (Default):**
- Deep backgrounds with subtle gradients
- High contrast for metric readouts
- Glowing accents for active states

**Light Theme:**
- Clean white/gray backgrounds
- Softer shadows
- Muted accent colors

Both themes maintain identical spacing and layout - only color tokens change.

## Images
**No hero images.** Dashboard-focused interface with data-driven visuals only. All "visuals" are chart-based or geometric pattern backgrounds (CSS/SVG generated, not image files).

## Interactions
- Minimal animations: Use transition-all duration-200 for hover states
- Loading states: Shimmer effect (shadcn Skeleton)
- No distracting motion - priority on data legibility
- Hover effects: Subtle shadow lift on cards, underline on links

## Component Density
**Information-rich design:** Every section serves a purpose
- Federation dashboard includes: online/offline counts, consensus metrics, geographical distribution map
- Consciousness panel includes: current state, historical trend, anomaly detection alerts
- Recovery cards include: estimated completion, error logs access, manual override controls

This is a production-grade technical interface - prioritize clarity, density, and functionality over decorative elements.