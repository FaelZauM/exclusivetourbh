---
name: ExclusiveTour BH
description: Transporte executivo premium em Belo Horizonte
colors:
  ember: "#D97706"
  ember-dark: "#B45309"
  ember-glow: "rgba(217, 119, 6, 0.08)"
  ink: "#0A0A0A"
  ink-warm: "#1C1814"
  canvas: "#FFFFFF"
  silver: "#6B7280"
  slate: "#E5E7EB"
  night: "#1F2937"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.2em"
rounded:
  default: "4px"
  full: "9999px"
spacing:
  section-y: "80px"
  section-y-lg: "112px"
  container-x: "16px"
  container-x-sm: "24px"
  container-x-lg: "32px"
  card-padding: "24px"
  grid-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.default}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.ember-dark}"
    textColor: "{colors.canvas}"
  button-primary-large:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.default}"
    padding: "16px 32px"
  card-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.default}"
    padding: "{spacing.card-padding}"
  card-dark:
    backgroundColor: "{colors.ink-warm}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.default}"
    padding: "{spacing.card-padding}"
  input-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.default}"
---

# Design System: ExclusiveTour BH

## 1. Overview

**Creative North Star: "The Arrival Suite"**

Every section is a room in a suite you enter on arrival — reception, lounge, garage. Quiet, spacious, precisely on time. The design borrows from luxury automotive brand language: restrained geometry, high-contrast monochrome, precise typography, and a single warm accent (ember/gold) used sparingly to signal action.

The palette is black or white — never gray, never tinted. Depth is conveyed through tonal contrast and generous whitespace, not shadows or layering. The ember accent covers ≤5% of any screen and is reserved exclusively for action triggers (CTAs, active states, star ratings, decorative gold dividers).

This system rejects the generic transportation-site template: no stock imagery, no busy layouts, no loud badges, no corporate robotic feel. Every pixel communicates confidence through restraint.

**Key Characteristics:**
- Monochrome foundation (pure black on pure white) with a single warm accent
- Single-family typography (Inter, weight-driven hierarchy)
- Lightly layered: cards are outlined by default with a subtle hover lift
- Gold ember separator as a recurring rhythmic element between heading and content
- Responsive: same visual weight on mobile as on desktop
- Motion is restrained: state transitions and scroll reveals, no choreography

## 2. Colors

The palette operates on a black/white polarity with a single precious accent. The canvas is never gray or tinted — always pure white or pure black.

### Primary
- **Ember** (`#D97706`, `oklch(70% 0.15 70)`): Exclusive accent for CTAs, active nav indicator, star ratings, gold dividers, icon containers. Never decorative. Never more than one per viewport.

### Neutral
- **Ink** (`#0A0A0A`, `oklch(0% 0 0)`): Near-black for body text, primary headings, full-bleed dark sections.
- **Ink Warm** (`#1C1814`): Slightly warm near-black for dark section backgrounds. Adds subtle warmth without breaking the monochrome commitment.
- **Canvas** (`#FFFFFF`, `oklch(100% 0 0)`): Pure white for page background, card surfaces, text-on-dark.
- **Silver** (`#6B7280`, `oklch(55% 0 0)`): Secondary text, metadata, placeholders, tag text.
- **Slate** (`#E5E7EB`, `oklch(93% 0 0)`): Subtle borders, dividers, hover backgrounds on nav.
- **Night** (`#1F2937`, `oklch(30% 0.015 250)`): Card borders inside dark sections, footer divider.

### Named Rules
**The One Accent Rule.** Ember is used on ≤5% of any screen. Its rarity is the point. Never apply ember decoratively — if it doesn't invite an action or mark a rating, it doesn't earn ember.

**The No-Tint Rule.** The canvas is pure white (`#FFFFFF`) or pure black (`#0A0A0A`). Gray backgrounds, cream tones, or tinted neutrals are prohibited. Warmth is carried by accent, typography, and service quality, not by the background.

## 3. Typography

**Display Font:** Inter (ExtraBold 800)
**Body Font:** Inter (Regular 400)
**Label Font:** Inter (SemiBold 600, tracked uppercase)

**Character:** A single sans-serif family across all roles. Hierarchy is driven entirely by weight, size, and tracking — not by font switches. The voice is executive without being corporate, confident without being loud.

### Hierarchy
- **Display** (800, `clamp(2.5rem, 6vw, 5rem)`, 1.1): Hero headlines only. `text-wrap: balance`. Appears on pure black backgrounds via `text-canvas`.
- **Headline** (700, `clamp(1.875rem, 4vw, 3rem)`, 1.2): Section titles (Serviços, Frota, etc.). `text-wrap: balance`. Can appear on canvas (`text-ink`) or dark backgrounds (`text-canvas`).
- **Title** (600, `1.125rem`, 1.4): Card titles, service names, feature labels.
- **Body** (400, `1rem`, 1.6): Descriptive text, service descriptions, testimonial quotes. Max line length 70ch. `text-wrap: pretty` for long prose.
- **Label** (600, `0.75rem`, 0.2em): Nav links, button text, section kickers (`DIFERENCIAL EXCLUSIVO`), footer headings. Always uppercase.

## 4. Elevation

Lightly layered. Depth is primarily conveyed through monochrome contrast and generous whitespace, not shadows. Cards and containers are outlined by default (1px `slate` / `night` border) rather than elevated. The only shadows in the system appear as a state response: cards lift slightly on hover (`translateY(-1px)` + `box-shadow: sm`).

### Shadow Vocabulary
- **Card Hover** (`0 1px 3px rgba(0,0,0,0.1)`): Subtle lift on card hover. Not present at rest.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Elevation appears only as a response to state (hover, focus). The contrast between pure black text on pure white already provides unambiguous hierarchy; shadows would add noise.

## 5. Components

### Buttons

- **Shape:** Gently squared (4px radius).
- **Primary (WhatsApp CTA):** Background ember (`#D97706`), white text (SemiBold 600, 0.05em tracking), `16px 32px` padding. Default size is `0.875rem`; large variant (`1rem`, `16px 32px`) used in Hero and CTA sections.
- **Hover:** Background ember-dark (`#B45309`). 200ms ease-out transition.
- **Focus-visible:** `ring-2 ring-ember ring-offset-2`.
- **Icon (mobile header):** Same ember background, icon-only, no text label.
- **Animations:** The large CTA in the Hero section uses a subtle gold-glow pulse (`box-shadow` animation at 2s infinite) to draw attention on first visit.

### Cards / Containers

- **Corner Style:** Gently squared (4px radius).
- **Light theme:** White background (`canvas`), 1px slate (`#E5E7EB`) border.
- **Dark theme:** Translucent dark background (`ink/50` or `ink-warm`), 1px night (`#1F2937`) border.
- **Shadow Strategy:** None at rest. On hover: `translateY(-1px)` + `shadow-sm` + optional `border-ember/30` (Services cards). 200ms ease-out.
- **Internal Padding:** 24px (`p-6`).
- **Icon Container (dark cards):** `h-12 w-12 rounded-full`, `bg-ember/10` background, `ember` icon.

### Section Separator

- **The Ember Line:** A `1px` rounded horizontal bar (`h-1 w-10 rounded-full bg-ember`) centered between every section heading and its content block. This is the system's signature rhythmic element — present in every section.

### Section Heading

- **Typography:** Headline role (Bold 700, `clamp(1.875rem, 4vw, 3rem)`, 1.2).
- **Light variant:** Text ink (`#0A0A0A`), subtitle in `ink/60`.
- **Dark variant:** Text canvas (`#FFFFFF`), subtitle in silver (`#6B7280`).
- **Layout:** Centered by default, capped at `max-w-2xl` for readability.

### Navigation (Header)

- **Style:** Fixed/sticky at top. Backdrop blur (`bg-canvas/80 backdrop-blur-md`). Bottom border: 1px slate.
- **Typography:** Label role (SemiBold 600, `0.875rem`), silver default, ink hover.
- **Mobile:** Hamburger with slide-down drawer. Icon-only WhatsApp button beside hamburger.
- **Logo:** `Ex` mark in ember + stacked "EXCLUSIVE" / "TOUR BH" in ink, `tracking-[0.2em]`.

### Inputs / Fields

- *Not currently used in the static site (all conversion is WhatsApp-direct).*

### Testimonial Card

- White background, 1px slate border, 24px padding.
- 5-star rating row: ember-filled stars (`fill-ember text-ember`), `h-4 w-4`.
- Quote in silver body text with curly quotes.
- Footer: border-top slate, name in semibold ink, role in silver caption.

## 6. Do's and Don'ts

### Do:
- **Do** use black-and-white as the primary design statement — let the content breathe. Pure `#0A0A0A` on pure `#FFFFFF`.
- **Do** reserve ember (`#D97706`) exclusively for CTAs, active states, star ratings, and the signature gold divider lines.
- **Do** lead with trust signals as design elements: Faixa do Move credential, 90+ fleet, 5★ ratings, 24h service.
- **Do** keep motion restrained: 200ms ease-out on hover transitions, subtle scroll fade-in-up at 600ms ease-out. No parallax or choreography.
- **Do** use the Ember Line (h-1 w-10 rounded-full bg-ember) as the consistent rhythmic separator between every heading and content block.
- **Do** maintain the black/white polarity: canvas is either pure white or pure black (`ink-warm`). No gray or tinted backgrounds.
- **Do** use `text-wrap: balance` on h1-h3 and `text-wrap: pretty` on long prose.
- **Do** treat WhatsApp as the single conversion goal — every section leads naturally toward contact.

### Don't:
- **Don't** use gray backgrounds or tinted neutrals — no cream, sand, beige, or gray body backgrounds.
- **Don't** use gradient text, glassmorphism, side-stripe borders, or tiny uppercase eyebrow labels above every section.
- **Don't** create identical card grids with icon + heading + body patterns repeated endlessly.
- **Don't** add decorative ember elements — the accent is for action.
- **Don't** gate content behind scroll-triggered visibility; reveals enhance content that is already visible by default.
- **Don't** use stock transportation imagery — real vehicle photos or typographic placeholders only (gradient dark blocks with vehicle category text).
- **Don't** build generic/corporate template-feeling layouts. Avoid the look of AI-generated or templated transportation sites.
- **Don't** pair Inter with another sans-serif — the single-family weight-driven hierarchy is deliberate.
