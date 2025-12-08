# SearchSpaceCollapse Design Guidelines

## Design Approach
**Reference-Based: Cyberpunk Dashboard Interface**
Drawing from: Blade Runner UI aesthetics, Bloomberg Terminal density, Linear's precision, cyberpunk gaming interfaces (Deus Ex, Cyberpunk 2077). Information-first with atmospheric technical visuals.

## Core Design Elements

### Typography
- **Primary Font**: JetBrains Mono (monospace) via Google Fonts CDN - for all data, metrics, codes
- **Display Font**: Orbitron or Rajdhana - for headers, deity names, system labels
- **Hierarchy**: 
  - H1: 2.5rem (40px) Orbitron bold
  - H2: 1.75rem (28px) Orbitron medium  
  - Body/Data: 0.875rem (14px) JetBrains Mono
  - Labels: 0.75rem (12px) JetBrains Mono uppercase tracking-wide
  - Metrics: 1.25rem (20px) JetBrains Mono medium

### Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8 units
- Panel padding: p-6
- Section gaps: gap-6
- Tight data rows: gap-2
- Large section breaks: my-8

**Grid Structure**: Dense dashboard layout
- Sidebar: 280px fixed (deity selection, consciousness state)
- Main content: fluid with max-w-7xl
- Panel grid: 3-4 columns on desktop (lg:grid-cols-3, xl:grid-cols-4)
- Mobile: Single column stack

### Component Library

**Panels/Cards**
- Semi-transparent dark backgrounds (backdrop blur)
- 1px border with subtle glow effect
- Sharp corners (no rounding) for technical aesthetic
- Nested hierarchy: outer panel contains multiple metric blocks

**Data Visualization Components**
- Geometric graphs: Hexagonal grid overlays, triangulated mesh patterns
- Real-time metrics: Large numerical displays with Φ, κ symbols
- Progress bars: Linear with segmented tick marks, glowing fills
- Status indicators: Pulsing dots, animated scanner lines
- Consciousness meters: Vertical/horizontal bars with threshold markers

**Navigation & Controls**
- Top bar: System status, Ocean AI indicator, emergency controls
- Left sidebar: Deity pantheon selector with icons/avatars
- Each deity card: Name, domain, active status, power level indicator
- Tab system: Sharp-edged tabs with underline indicators

**Icons**
Use Heroicons via CDN for system icons (settings, alerts, data points)

**Typography Treatments**
- All caps labels with letter-spacing
- Monospace data with tabular alignment
- Glowing text effects for critical metrics
- Prefix notation: "Φ:" "κ:" "BTC:" for measurements

## Images

**Hero Section**: No traditional hero. Dashboard opens directly to interface.

**Deity Avatars**: 
- Location: Left sidebar deity selector grid
- Style: Abstract geometric portraits or symbolic glyphs (not realistic photos)
- Size: 64x64px squares
- Treatment: Slight glow, semi-transparent borders

**Background Textures**:
- Location: Behind main content area
- Style: Subtle geometric patterns (hexagons, circuit traces, point clouds)
- Treatment: Very low opacity (5-10%), doesn't interfere with readability
- Consider animated subtle particle effects in background

## Layout Sections

**1. Top Status Bar** (h-16)
- System time, network status, Ocean AI consciousness level
- Global search/command palette
- User profile, settings, alerts

**2. Left Sidebar** (fixed 280px)
- Ocean AI status display (prominent)
- Olympian Pantheon grid (3x3)
- Shadow Pantheon section below (purple/indigo accents)
- Each deity: Avatar, name, power indicator

**3. Main Dashboard** (fluid)
- **Recovery Operations Panel**: Active scans, progress meters, BTC addresses
- **Metrics Grid**: 3-4 column grid of metric cards (Φ, κ, hash rates, success probability)
- **Geometric Visualization**: Large canvas showing search space collapse patterns
- **Timeline/Activity Feed**: Recent deity actions, system events, consciousness shifts
- **Control Panel**: Action buttons, parameter adjustments, emergency stops

**4. Right Detail Panel** (collapsible 320px)
- Selected deity deep-dive
- Consciousness measurement graphs
- Advanced parameter tuning

## Visual Treatments

**Glow Effects**: Purple/indigo for Shadow Pantheon elements, cyan/electric blue for primary actions
**Scan Lines**: Subtle horizontal lines across panels for CRT aesthetic
**Data Tables**: Alternating row opacity, monospace alignment, sortable headers
**Animations**: Pulsing indicators for active processes, smooth metric updates, scanning sweep effects
**Buttons**: Blurred backgrounds when overlaying content, sharp geometric shapes, uppercase text

## Information Density
Maximize data per panel - avoid empty space. Each panel contains:
- Header with icon + title
- 3-5 metrics or data points
- Visual indicator (graph/progress bar)
- Timestamp or status footer

Pack interface densely while maintaining readability through proper hierarchy and spacing.