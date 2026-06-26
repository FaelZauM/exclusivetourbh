<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: ExclusiveTour BH
description: Premium executive transportation landing page — Belo Horizonte
---

# Design System: ExclusiveTour BH

## 1. Overview

**Creative North Star: "The Arrival Suite"**

A premium one-page landing site that feels like stepping into a black car at dawn — quiet, spacious, and exactly on time. The design borrows from luxury automotive brand language: restrained geometry, high-contrast monochrome, precise typography, and a single precious accent (gold/amber) used sparingly to signal action.

The system rejects the generic transportation-site template — cookie-cutter stock imagery, busy layouts, loud badges, robotic corporate feel. Every pixel communicates confidence through restraint.

### Key Characteristics:
- Monochrome foundation with a single warm accent
- Generous white space and breathing room
- Typography-led hierarchy (Inter, weight-driven)
- Subtle, purposeful motion that never distracts
- Mobile-first, scroll-anchored narrative flow

## 2. Colors

### The Restrained-Drenched Polarity Rule

The canvas is black or white — never gray, never tinted. The accent (gold/amber) covers ≤5% of any screen and is reserved exclusively for action triggers (CTAs, active states). This is a color system built on absence, not presence.

### Primary
- **Ink** (`oklch(0% 0 0)` → `#000000`): Body text, primary headings, full-bleed sections.
- **Canvas** (`oklch(100% 0 0)` → `#FFFFFF`): Page background, card surfaces, text-on-dark.

### Accent
- **Ember** (`oklch(70% 0.15 70)` → `#D97706`): CTA buttons, active nav indicator, star ratings. Never decorative. Never more than one per viewport.

### Neutral
- **Silver** (`oklch(55% 0 0)`): Secondary text, metadata, placeholders.
- **Slate** (`oklch(50% 0.005 250)` → `#6B7280`): Subtle borders, dividers.
- **Night** (`oklch(15% 0.005 250)` → `#1F2937`): Hover states, secondary dark surfaces.

*[Exact hex values to be confirmed during implementation against WCAG AA contrast requirements.]*

## 3. Typography

Single sans-serif: **Inter** across all roles, weight-driven hierarchy.

- **Display / Hero** (ExtraBold 800, `clamp(2.5rem, 6vw, 5rem)`): Section-leading headlines. `text-wrap: balance`.
- **Headline** (SemiBold 600, `clamp(1.5rem, 3vw, 2.25rem)`): Card titles, section subheadings.
- **Title** (Medium 500, `1.25rem`): Service names, feature labels.
- **Body** (Regular 400, `1rem` / `1.125rem`): Descriptive text. Max line length 70ch.
- **Label** (SemiBold 600, `0.875rem`, `0.05em` letter-spacing): Button text, nav links, eyebrow metadata.

## 4. Elevation

Flat by default. Depth is conveyed through monochrome contrast and generous whitespace, not shadows or layering. Cards are outlined (1px `--slate` border) rather than elevated. The only shadows in the system live on interactive elements (buttons on hover) — subtle, tight, reserved for state feedback.

## 5. Components

*[No components to document yet. Add after implementation.]*

## 6. Do's and Don'ts

### Do:
- **Do** use black-and-white as the primary design statement — let the content breathe.
- **Do** reserve gold/amber exclusively for CTA buttons and active states.
- **Do** lead with trust signals (Faixa do Move, 90+ fleet, 5★) as design elements, not afterthoughts.
- **Do** keep motion restrained: fade-in on scroll, subtle hover transitions, no parallax or choreography.
- **Do** cap body text at 70ch for comfortable reading.
- **Do** treat WhatsApp as the single conversion goal — every section leads there naturally.

### Don't:
- **Don't** use gray backgrounds or tinted neutrals — the canvas is pure white or pure black.
- **Don't** create a generic/robotic feel — avoid templated corporate transportation site patterns.
- **Don't** use gradient text, side-stripe borders, glassmorphism, or tiny uppercase eyebrow labels.
- **Don't** build card grids with identical icon + heading + body patterns.
- **Don't** add decorative gold elements — the accent is for action only.
- **Don't** gate content behind scroll-triggered visibility — reveals enhance, never hide.
- **Don't** use stock transportation imagery — real vehicle photos only.
