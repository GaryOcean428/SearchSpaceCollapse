---
id: ISMS-TECH-004
title: Design Guidelines - UI/UX
filename: 20251208-design-guidelines-ui-ux-1.00F.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Frozen
function: "UI/UX design guidelines and standards"
created: 2025-12-08
last_reviewed: 2025-12-08
next_review: 2026-06-08
category: Technical
supersedes: null
---

# Design Guidelines: QIG Brain Wallet Recovery Tool

## Design Approach
**Approach:** Design System with Custom Technical Elements  
**System Foundation:** Fluent Design (data-heavy, enterprise patterns) + custom crypto-specific components  
**Rationale:** This is a high-stakes technical utility tool handling $52.6M recovery - it must prioritize trust, clarity, and efficient data processing over aesthetic flourishes.

## Core Design Principles

1. **Trust Through Precision** - Every element reinforces reliability and technical competence
2. **Information Hierarchy First** - Critical data (target address, stats, candidates) must be immediately scannable
3. **Progressive Disclosure** - Complex technical details revealed as needed, not overwhelming upfront
4. **Real-time Feedback** - System status always visible, no black boxes

## Typography

**Font Stack:**
- **Primary Interface:** Inter or SF Pro (system font for Mac users) via Google Fonts
- **Monospace Data:** JetBrains Mono or Fira Code for addresses, passphrases, technical values
- **Size Scale:** Base 16px, headings 24/32/40px, data 14px, logs 12px

**Hierarchy:**
- H1 (40px, 700): Page title only
- H2 (32px, 600): Section headers
- H3 (24px, 600): Subsection headers
- Body (16px, 400): Instructions, descriptions
- Data (14px, 500): Stats, candidate phrases
- Logs (12px, 400): Console output

## Layout System

**Spacing Primitives:** Tailwind units of 4, 6, 8, 12, 16, 20
- Component padding: p-6 or p-8
- Section spacing: mb-8 or mb-12
- Tight groupings: gap-4
- Generous sections: gap-8 or gap-12

**Container Strategy:**
- Max width: max-w-7xl
- Main content: Single column, full focus
- Stats grid: 2×2 on tablet, 4×1 on desktop
- Candidate list: Single column for scannability

## Component Library

### Core Components

**1. Warning Banner (Target Info)**
- High-contrast border (3px solid)
- Icon prefix (⚠️ or shield icon)
- Monospace address display
- Balance in large, bold text
- Subtle background (not alarming, just prominent)

**2. Stats Dashboard**
- Grid layout: grid-cols-2 md:grid-cols-4
- Each stat card contains: large value (32px), label below (14px)
- Use subtle borders, not heavy shadows
- Update animations: gentle number counting, no distracting effects
- Runtime with monospace clock format

**3. Search Configuration Panel**
- Clear radio/select controls
- Input fields with monospace font for phrase entry
- Inline validation (word count indicator)
- Button group with primary/secondary/danger states
- Help text in muted 14px below inputs

**4. Candidate List**
- Full-width list items
- Each candidate: phrase (monospace 14px) + score badge (right-aligned)
- Score badges: Gradient background for high-Φ (>75%), solid for others
- Hover state: Subtle background shift, pointer cursor
- Click action: Instant visual feedback before testing

**5. Log Console**
- Dark background with light text (terminal aesthetic)
- Auto-scroll to latest entry
- Timestamp prefix on each line
- Success (green), error (red), info (white) message types
- Max height with scroll, fixed position at bottom

**6. Result Display (Success State)**
- Large, centered card on success
- Celebration icon/emoji
- Recovered phrase in large monospace with copy button
- Clear instructions for next steps
- Export/backup options prominent

### Button Specifications
- Primary: Solid fill, 600 weight, 15px padding vertical, 30px horizontal
- Disabled: 50% opacity, no-pointer-events
- Icon buttons: Include heroicons via CDN, 20px size
- Button groups: gap-3 spacing

### Form Elements
- All inputs: 2px border, 12px padding, 8px radius
- Focus state: Border change only (no glow/shadow)
- Monospace for all phrase/address inputs
- Character/word counter for phrase inputs
- Validation inline, not modal

## Special Considerations

### Data Display Patterns
- **Addresses:** Always monospace, truncate middle with ellipsis on mobile, copy button adjacent
- **Phrases:** Word-wrapped monospace, preserve spacing, highlight on hover
- **Scores:** Percentage with 1 decimal (75.3%), color-coded thresholds
- **Timestamps:** Relative ("2 seconds ago") + absolute on hover

### Information Architecture
1. Target info (sticky at top on scroll)
2. Configuration panel (collapsible after search starts)
3. Stats dashboard (always visible)
4. Candidate list (primary focus during search)
5. Log console (bottom, expandable)

### Trust Elements
- SHA-256/secp256k1 badges (subtle technical credibility)
- "Libraries loaded" confirmation
- Test connection button with immediate feedback
- Open-source library links in footer
- No black boxes - show what's happening

### Performance Indicators
- Live update rate (tests/second)
- Progress if bounded search
- Memory usage if available
- Temperature/throttling warnings if applicable

## Images
**No images required for this application.** This is a pure utility interface where images would distract from the data-focused mission. Any visual interest comes from:
- Gradients on stat cards (very subtle)
- Icons from Heroicons (20px, inline with text)
- Score badges with gradient fills
- Syntax highlighting in log console

## Accessibility Notes
- All interactive elements keyboard accessible
- Clear focus indicators (2px offset outline)
- ARIA labels on all data displays
- Screen reader announcements for stat updates
- High contrast mode support (respect prefers-contrast)