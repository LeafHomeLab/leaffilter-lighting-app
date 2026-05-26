# Lighting by LeafFilter™

Premium smart-home lighting control app for permanent roofline LED systems. Built as an interactive design prototype for developer handoff.

![Platform](https://img.shields.io/badge/platform-mobile--first-black)
![Framework](https://img.shields.io/badge/framework-Vite-646CFF)
![Design](https://img.shields.io/badge/design-dark--mode-000000)

## Overview

This is an interactive **design prototype** for the Lighting by LeafFilter mobile app. It simulates an iPhone viewport (390×844px) with full navigation and screen transitions, built to communicate the design vision to the development team.

### Screens
- **Onboarding** — Welcome, device scanning, Wi-Fi setup, zone configuration
- **Home Dashboard** — Power control, brightness slider, active scene, zone map
- **Light Control** — Color wheel, white temperature, effects, animation presets
- **Scenes** — Preset lighting themes library with search
- **Schedule** — Calendar and timeline views for automated lighting
- **Support** — System health, diagnostics, contact, firmware info

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 5 |
| Language | Vanilla JS (ES Modules) |
| Styling | Vanilla CSS (no frameworks) |
| Typography | Founders Grotesk (brand font) |
| Design System | Custom CSS variables + DESIGN.md spec |

## Getting Started

### Prerequisites
- Node.js 18+ (or portable Node.js)

### Install & Run
```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173/`

## Design System

The complete design specification is in [`DESIGN.md`](./DESIGN.md). This file follows the open-source DESIGN.md standard and can be used with:
- **Google Stitch** — AI-powered design iteration
- **AI coding agents** — Cursor, Claude, Gemini, etc.
- **Developer reference** — all tokens, colors, typography, and component specs

### Key Design Tokens
| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | Pure black (OLED-optimized) |
| Accent | `#00E676` | Emerald green (brand) |
| Font | Founders Grotesk | LeafFilter brand typeface |
| Radius | 10–40px | Apple-style squircle corners |

## Fonts

Place Founders Grotesk `.woff2` files in `public/fonts/`:
- `founders-grotesk-light.woff2`
- `founders-grotesk-regular.woff2`
- `founders-grotesk-semibold.woff2`
- `founders-grotesk-mono-regular.woff2`

> **Note:** These are licensed commercial fonts and are NOT included in this repository. Contact the design team for access.

## Project Structure

```
├── index.html              # App shell with status bar + navigation
├── DESIGN.md               # Design system specification
├── package.json
├── public/
│   ├── fonts/              # Founders Grotesk font files (not in repo)
│   ├── logo.png            # LeafFilter leaf icon
│   ├── leaffilter-logo.svg # Wordmark with animated light bar
│   └── lf-logo.svg         # Simplified leaf icon (favicon)
└── src/
    ├── main.js             # Router, state management, initialization
    ├── data/               # Static data (scenes, schedules, zones)
    ├── screens/            # Screen renderers (home, scenes, control, etc.)
    └── styles/
        ├── fonts.css       # @font-face declarations
        ├── design-system.css # CSS custom properties + reset
        ├── components.css  # Reusable component styles
        ├── screens.css     # Screen-specific styles
        └── animations.css  # Keyframe animations
```

## License

Proprietary — LeafFilter / Leaf Home. All rights reserved.
