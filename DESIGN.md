---
name: Lighting by LeafFilter
version: 1.0.0
platform: mobile-first
theme: dark
colors:
  background:
    primary: "#000000"
    secondary: "rgba(255, 255, 255, 0.04)"
    tertiary: "rgba(255, 255, 255, 0.08)"
    elevated: "#121212"
  accent:
    primary: "#00E676"
    light: "#69F0AE"
    dark: "#00C853"
    glow: "rgba(0, 230, 118, 0.25)"
    glow-strong: "rgba(0, 230, 118, 0.45)"
    subtle: "rgba(0, 230, 118, 0.12)"
  warm:
    primary: "#FF9800"
    glow: "rgba(255, 152, 0, 0.25)"
  text:
    primary: "#FFFFFF"
    secondary: "#8E8E93"
    tertiary: "#636366"
    inverse: "#000000"
  status:
    online: "#00E676"
    warning: "#FF9800"
    error: "#FF3B30"
    info: "#0A84FF"
  border:
    default: "rgba(255, 255, 255, 0.08)"
    light: "rgba(255, 255, 255, 0.15)"
  glass: "rgba(20, 20, 20, 0.65)"
  overlay: "rgba(0, 0, 0, 0.75)"
typography:
  display:
    fontFamily: "'Founders Grotesk', 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
    weights: [300, 400, 500, 600]
  body:
    fontFamily: "'Founders Grotesk', 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
    weights: [300, 400, 500, 600]
  mono:
    fontFamily: "'Founders Grotesk Mono', 'Space Mono', monospace"
  scale:
    hero: "34px"
    title: "28px"
    heading: "20px"
    body: "16px"
    small: "14px"
    caption: "12px"
    micro: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "40px"
  full: "9999px"
elevation:
  sm: "0 2px 8px rgba(0,0,0,0.5)"
  md: "0 8px 24px rgba(0,0,0,0.6)"
  lg: "0 16px 40px rgba(0,0,0,0.8)"
  glow: "0 0 24px rgba(0, 230, 118, 0.25)"
  card: "0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)"
---

## Overview

**Lighting by LeafFilter** is a premium smart-home lighting control app for permanent roofline LED systems installed by LeafFilter. The design language is **Tesla/Apple-inspired** — ultra-dark, minimal, with confident use of negative space and a single vibrant accent green.

The app targets homeowners who have invested in premium home improvement. The UI must feel **high-end, confident, and effortless** — like controlling a luxury system, not a commodity product.

### Design Philosophy
- **Deep black canvas** — pure `#000000` background, never dark gray
- **Single accent color** — emerald green `#00E676` used sparingly for active states, CTAs, and data highlights
- **Glassmorphism** — frosted glass surfaces with subtle blur for layered UI elements
- **Micro-animations** — smooth, spring-based transitions that feel native to iOS
- **Information density** — show the right amount of info without clutter. Favor progressive disclosure

### Brand Identity
- **Full name:** "Lighting by LeafFilter"
- **Parent brand:** LeafFilter (gutter protection, home improvement)
- **Logo:** LeafFilter leaf icon (white on green) + "Lighting by LeafFilter" wordmark with illuminated roofline light bar beneath
- **Registered trademark:** Always include ® after LeafFilter in formal usage

## Colors

The palette is built for OLED screens — deep blacks make the accent green pop dramatically.

### Backgrounds
- **Primary:** `#000000` — the foundation. Pure black, not dark gray. This is non-negotiable.
- **Secondary:** `rgba(255, 255, 255, 0.04)` — for card surfaces and subtle containers
- **Tertiary:** `rgba(255, 255, 255, 0.08)` — for interactive elements (buttons, chips)
- **Elevated:** `#121212` — for modal backgrounds and elevated surfaces

### Accent Green
- **Primary accent:** `#00E676` — the signature LeafFilter green. Used for CTAs, active states, power indicators, and interactive highlights
- **Light accent:** `#69F0AE` — for active text on dark backgrounds
- **Glow:** `rgba(0, 230, 118, 0.25)` — for box-shadow glows and ambient light effects
- **Subtle:** `rgba(0, 230, 118, 0.12)` — for tinted backgrounds (active chips, selected states)

### Text Hierarchy
- **Primary:** `#FFFFFF` — headlines and key content
- **Secondary:** `#8E8E93` — supporting text, labels, metadata (Apple-style gray)
- **Tertiary:** `#636366` — placeholder text, disabled states
- **Inverse:** `#000000` — text on green accent backgrounds

### Status Colors
Follow Apple HIG status conventions:
- **Online/Success:** `#00E676` (matches accent)
- **Warning:** `#FF9800` (warm amber)
- **Error:** `#FF3B30` (Apple red)
- **Info:** `#0A84FF` (Apple blue)

## Typography

The primary typeface is **Founders Grotesk** by Klim Type Foundry — the same font used across LeafFilter's product line. This creates brand consistency from marketing to in-app experience.

### Font Stack
```
'Founders Grotesk', 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif
```

### Available Weights
| Weight | CSS Value | Usage |
|--------|-----------|-------|
| Light | 300 | Subtle body text, metadata |
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Labels, navigation items |
| Semibold | 600 | Headlines, buttons, emphasis |

### Type Scale
| Role | Size | Weight | Letter-Spacing | Usage |
|------|------|--------|-----------------|-------|
| Hero | 34px | 600–800 | -0.5px | Onboarding titles, major headlines |
| Title | 28px | 700 | -0.5px | Screen titles |
| Heading | 20px | 700 | -0.4px | Section headers |
| Body | 16px | 400 | 0 | Primary content |
| Small | 14px | 500 | 0 | Supporting text, chip labels |
| Caption | 12px | 600 | 0.8px | Section labels (uppercase) |
| Micro | 10px | 600 | 0.4px | Navigation labels (uppercase) |

### Rules
- Headlines use negative letter-spacing (-0.3px to -0.5px) for tightness
- Section labels (caption/micro) use uppercase + wide letter-spacing for distinction
- Always use `-webkit-font-smoothing: antialiased` for crisp rendering

## Layout & Spacing

### Grid System
- **Base unit:** 4px
- **Scale:** 4, 8, 16, 24, 32, 48px (xs → 2xl)
- **Content padding:** 16px horizontal (matches `--space-md`)
- **Card padding:** 16px internal

### Mobile Frame
The prototype simulates an iPhone 14 Pro viewport:
- **Width:** 390px
- **Height:** 844px
- **Frame radius:** 50px (squircle)
- On mobile (<430px), the frame expands to full viewport

### Screen Structure
Every screen follows this vertical stack:
1. **Status bar** — 16px top, 28px horizontal padding
2. **Screen content** — scrollable, 16px horizontal padding
3. **Bottom navigation** — fixed, 75px tall with blur backdrop

## Elevation & Depth

### Glass Surfaces
Use `backdrop-filter: blur(20px)` with semi-transparent backgrounds to create depth:
- **Standard glass:** `rgba(20, 20, 20, 0.65)` + 20px blur
- **Navigation glass:** `rgba(10, 10, 10, 0.75)` + 30px blur (heavier blur for nav)
- **Green glass:** `rgba(0, 230, 118, 0.08)` — for accent-tinted surfaces

### Shadows
- Cards use composite shadows: `0 8px 24px rgba(0,0,0,0.6)` + inset top highlight
- Accent elements get glow shadows: `0 0 24px rgba(0, 230, 118, 0.25)`
- The app frame itself has a multi-layer ring + drop shadow for premium feel

### Grain Texture
A subtle SVG noise texture at `opacity: 0.025` with `mix-blend-mode: overlay` adds a tactile quality. This is applied via `::after` on the app frame.

## Shapes

### Border Radius
We use Apple-style squircle-like radii:
| Token | Value | Usage |
|-------|-------|-------|
| sm | 10px | Small elements (chips, toggles) |
| md | 16px | Buttons, icon containers |
| lg | 24px | Cards, modals, containers |
| xl | 32px | Large panels |
| full | 9999px | Pills, full-round buttons |

### Borders
- Default: `1px solid rgba(255, 255, 255, 0.08)` — barely visible structure
- Light: `1px solid rgba(255, 255, 255, 0.15)` — for interactive or highlighted containers
- Accent: `1px solid #00E676` — for selected/active states only

## Components

### Buttons
- **Primary:** Green fill (`#00E676`), black text, full-round radius, glow shadow. Used for main CTAs
- **Secondary:** Dark glass fill, white text, border. Used for alternative actions
- **Ghost:** Transparent, green text. Used for tertiary actions and links
- **Icon button:** 44×44px touch target, 16px radius, dark glass fill
- All buttons scale to `0.96` on press with spring easing

### Cards
- Glass background with 20px blur backdrop
- 24px border radius
- 1px border in `rgba(255, 255, 255, 0.08)`
- Composite shadow with inset top highlight
- Scale to `0.985` on press

### Chips / Pills
- Small pill-shaped containers with full-round radius
- Active state: green tinted background + green border + green text
- Include colored dot indicators for status

### Toggle Switch
- 51×31px track, full-round radius
- Off: dark glass track, white knob
- On: green track, white knob shifted right, glow shadow on knob
- Smooth 300ms transition

### Sliders
- Custom range input with 4px track height
- Accent-colored fill from left to thumb
- 20×20px round thumb with glow
- Real-time value display

### Power Button
- 72×72px circular button
- Inactive: dark glass background
- Active: green glow ring animation, green icon color
- Concentric pulse ring animation when active

### Navigation
- 5 items: Home, Scenes, Control (FAB), Schedule, Support
- Center FAB is elevated (56×56px green circle, -20px margin-top)
- Active state: accent color + subtle icon glow
- Labels in micro size, uppercase

## Animations & Transitions

### Easing Curves
| Name | Value | Usage |
|------|-------|-------|
| Default | `cubic-bezier(0.25, 1, 0.5, 1)` | Most transitions |
| Spring | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Scale/bounce effects |
| Out | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Exit animations |

### Duration Scale
- Fast: 200ms (hover, micro-interactions)
- Default: 300ms (most transitions)
- Slow: 500ms (screen transitions, reveals)

### Key Animations
- **fadeInUp:** Elements enter from 16px below with opacity fade
- **pulseRing:** Concentric ring expansion for active/scanning states
- **float:** Gentle 6px vertical bob for logo/icons
- **shimmer:** Horizontal gradient sweep for loading states
- **scaleIn:** Element appears from 90% scale with opacity

### Stagger Pattern
Child elements animate in sequence with 40ms delay between each (up to 8 children).

## App Screens

### 1. Onboarding (Welcome)
- Full-screen dark with radial green glow behind logo
- LeafFilter leaf icon in rounded-square container with green tint
- "Lighting by LeafFilter" wordmark SVG with animated light bar
- "Get Started" primary CTA + "Already have an account? Sign In" ghost link
- Navigation dots at top (active = elongated green pill)

### 2. Home Dashboard
- Logo bar: leaf icon + "Lighting by LeafFilter" + Online status chip
- Power button hero with active scene name
- Brightness slider
- Control banner (tap to open full controls)
- Quick actions row (All On, Scenes, Timer, Zones)
- House silhouette map with zone indicators
- Now playing scene card with color preview

### 3. Control Screen
- Zone chip selector (horizontal scroll)
- Color wheel (260px, full conic gradient + radial white center)
- White temperature bar (warm to cool gradient)
- Brightness and speed sliders
- Animation options grid (Solid, Breathe, Chase, Rainbow, etc.)
- Scene preview strip

### 4. Scenes
- Search bar with pill shape
- 2-column grid of scene cards
- Each card: gradient preview strip, scene name, zone count, favorite toggle

### 5. Schedule
- Calendar/timeline toggle
- Calendar grid with event dot indicators
- Schedule cards with time, scene, and zone info
- Vacation mode card

### 6. Support
- System health overview card
- 2×2 action grid (Contact, FAQ, Diagnostics, Firmware)
- Device info section

## Do's and Don'ts

### Do
- Use pure black `#000000` as the primary background — never dark gray
- Use the accent green sparingly — one primary CTA per viewport section
- Maintain generous negative space between sections
- Use glassmorphism (blur + semi-transparent) for layered surfaces
- Include subtle micro-animations for interactive feedback
- Use the Founders Grotesk font family exclusively
- Design for OLED — leverage true blacks for contrast and power efficiency
- Include touch feedback (scale animations) on all interactive elements

### Don't
- Use gray or charcoal as a primary background
- Use multiple accent colors — green is the only accent
- Use Material Design-style elevation (gray card stacking) — use glass instead
- Use generic system fonts when Founders Grotesk is loaded
- Place text smaller than 10px (micro)
- Skip the 1px border on glass surfaces — they need the subtle edge
- Use full-uppercase for body text — only for labels/micro text
- Create buttons without press/active states

## Assets

### Logo Files
- `/public/logo.png` — LeafFilter leaf icon (green background, white leaf)
- `/public/leaffilter-logo.svg` — Full wordmark with animated light bar
- `/public/lf-logo.svg` — Simplified leaf icon (white, transparent bg)

### Font Files
Located in `/public/fonts/`:
- `founders-grotesk-light.woff2` (weight: 300)
- `founders-grotesk-regular.woff2` (weight: 400)
- `founders-grotesk-semibold.woff2` (weight: 600)
- `founders-grotesk-mono-regular.woff2` (monospace variant)

### Brand Colors Reference
- LeafFilter corporate green: `#00E676` (app accent)
- LeafFilter background: `#000000` (app canvas)
- Warm accent: `#FF9800` (schedules, active states)
