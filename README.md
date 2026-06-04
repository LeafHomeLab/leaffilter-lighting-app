# Lighting by LeafFilter™

Premium smart-home lighting control app for permanent roofline LED systems. Built as an interactive design prototype, now being migrated to a native iOS/Android app via Capacitor.

![Platform](https://img.shields.io/badge/platform-mobile--first-black)
![Framework](https://img.shields.io/badge/framework-Vite%20%2B%20Capacitor-646CFF)
![Design](https://img.shields.io/badge/design-dark--mode-000000)

## Overview

This is an interactive **design prototype** for the Lighting by LeafFilter mobile app. It simulates an iPhone viewport (390×844px) with full navigation and screen transitions, built to communicate the design vision to the development team.

The app is being migrated from a browser-only prototype to a **native iOS/Android app** using Capacitor, which wraps the existing web UI in a native shell and enables Bluetooth (BLE) device provisioning and cloud connectivity.

### Screens
- **Onboarding** — Welcome, device scanning (BLE), Wi-Fi setup, zone configuration
- **Home Dashboard** — Power control, brightness slider, active scene, zone map
- **Light Control** — Color wheel, white temperature, effects, animation presets
- **Scenes** — Preset lighting themes library with search
- **Schedule** — Calendar and timeline views for automated lighting
- **Support** — System health, diagnostics, contact, firmware info

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 5 |
| Native Shell | Capacitor 8 (iOS + Android) |
| Language | Vanilla JS (ES Modules) |
| Styling | Vanilla CSS (no frameworks) |
| Typography | Founders Grotesk (brand font) |
| Design System | Custom CSS variables + DESIGN.md spec |
| BLE | @capacitor-community/bluetooth-le |
| Hardware Target | ESP32 running WLED firmware |

## Getting Started

### Prerequisites
- Node.js 18+ (or portable Node.js)

### Install & Run (Browser Prototype)
```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173/`

### Build & Sync to Native Platforms
```bash
npm run cap:sync          # Build web assets + sync to iOS/Android
npm run cap:open:ios      # Open Xcode project (requires Mac)
npm run cap:open:android  # Open Android Studio project
```

## Design System

The complete design specification is in [`DESIGN.md`](./DESIGN.md). This file follows the open-source DESIGN.md standard and can be used with:
- **Google Stitch** — AI-powered design iteration
- **AI coding agents** — Cursor, Claude, Gemini, etc.
- **Developer reference** — all tokens, colors, typography, and component specs

### Key Design Tokens
| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` | Pure black (OLED-optimized) |
| Accent | `#4AAC00` | LeafFilter natural green (brand) |
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
├── capacitor.config.ts     # Capacitor native shell configuration
├── DESIGN.md               # Design system specification
├── package.json
├── ios/                    # Generated Xcode project (gitignored)
├── android/                # Generated Android Studio project (gitignored)
├── public/
│   ├── fonts/              # Founders Grotesk font files (not in repo)
│   ├── logo.png            # LeafFilter leaf icon
│   ├── leaffilter-logo.svg # Wordmark with animated light bar
│   └── lf-logo.svg         # Simplified leaf icon (favicon)
└── src/
    ├── main.js             # Router, state management, initialization
    ├── api.js              # WLED hardware bridge (HTTP → ESP32)
    ├── ble.js              # BLE provisioning module (Capacitor native + demo fallback)
    ├── utils.js            # Shared utilities
    ├── data/               # Static data (scenes, schedules, zones)
    ├── screens/            # Screen renderers (home, scenes, control, etc.)
    └── styles/
        ├── fonts.css       # @font-face declarations
        ├── design-system.css # CSS custom properties + reset
        ├── components.css  # Reusable component styles
        ├── screens.css     # Screen-specific styles
        └── animations.css  # Keyframe animations
```

---

## Development Status

> **Last updated:** June 4, 2026

### What's been built

| Phase | Status | Description |
|-------|--------|-------------|
| **UI Prototype** | ✅ Complete | All 8 screens, design system, animations, WLED API bridge |
| **Phase 1: Capacitor Shell** | ✅ Complete | Native iOS + Android projects generated, config tuned for OLED dark mode |
| **Phase 2: BLE Module** | ✅ Code complete | `src/ble.js` created with scan/pair/provision + demo-mode fallback |
| **Phase 2: Onboarding Refactor** | ✅ Code complete | `src/screens/onboarding.js` wired to BLE module |
| **Phase 3: Cloud Backend** | ❌ Not started | Auth, device registry, remote relay (AWS/Firebase) |
| **Phase 4: Leaf Home Shell** | ❌ Not started | Restructure into umbrella app with product modules |

### Key files changed during Capacitor migration

| File | What changed |
|------|-------------|
| `capacitor.config.ts` | **New** — Native shell config (dark background, status bar, splash screen) |
| `src/ble.js` | **New** — BLE provisioning with demo-mode fallback for browsers |
| `src/screens/onboarding.js` | **Modified** — Now imports `ble.js` for real scan/pair/provision flows |
| `package.json` | **Modified** — Added Capacitor + BLE dependencies and `cap:*` scripts |
| `.gitignore` | **Modified** — Added `ios/` and `android/` directories |

### Known issue (fixed)

The BLE plugin (`@capacitor-community/bluetooth-le`) includes a web compatibility shim that loads successfully in browsers. This caused the onboarding to attempt a real Bluetooth scan instead of using demo mode, resulting in "Nothing Found." **Fix:** `src/ble.js` now checks `Capacitor.isNativePlatform()` and forces demo mode when running in a browser.

### 🐛 Bugs to fix next

> **Priority fixes before continuing with cloud/shell work.**

1. **Patterns tab lands on "Your Patterns" instead of the main Patterns page.**
   When tapping the "Patterns" icon in the bottom navigation bar, the app opens the Scenes screen but defaults to the "Your Patterns" category/tab. It should default to the main patterns view (showing all available patterns, not just user-created ones).
   - Files to investigate: `src/screens/scenes.js` (likely the default category/filter state), `src/main.js` (the `scenesTargetCategory` state field defaults to `'your-patterns'`)

2. **Pattern editor preview doesn't update until a second change is made.**
   When creating a new pattern via the "+" button (pattern editor screen), the roofline LED preview at the top does not immediately reflect the current colors/animation. The user has to toggle another setting (e.g., direction, animation type) before the preview updates. The preview should auto-render as soon as the pattern editor opens and after every change.
   - Files to investigate: `src/screens/patternEditor.js` (the preview render/update logic)

### What's needed next

#### To continue Phase 3 (Cloud Backend) — agent can build:
1. `src/auth.js` — Sign up / sign in / token management (needs AWS Cognito or Firebase project ID)
2. `src/cloud.js` — Device registry + remote relay client
3. Lambda functions + AWS CDK infrastructure-as-code
4. Update `src/api.js` to try local HTTP first, fall back to cloud relay

#### To continue Phase 4 (Leaf Home Shell) — agent can build:
1. Scaffold `src/shell/` and `src/products/lighting/` directory structure
2. Build product switcher home screen
3. Move current lighting code into the product module
4. Create shared design system for future products

#### Blocked on external work (humans needed):
- **Firmware engineer:** ESP32 needs a BLE GATT provisioning service before real device pairing works
- **AWS/Firebase account:** Cloud backend needs a project to deploy to
- **Mac with Xcode:** Required to build and test the iOS `.ipa`
- **App Store accounts:** Apple Developer + Google Play Console for distribution

### How to resume work with an AI agent

Start a new session and say:

> "Read the README.md Development Status section, then continue working on the Lighting by LeafFilter app. Pick up where we left off — Phase 3 (cloud backend) or Phase 4 (Leaf Home shell restructure)."

Or for a specific task:

> "Read README.md and src/ble.js, then verify the onboarding flow works in demo mode at localhost."

The agent will find everything it needs in this README + the `DESIGN.md` + inline code comments.

---

## License

Proprietary — LeafFilter / Leaf Home. All rights reserved.

