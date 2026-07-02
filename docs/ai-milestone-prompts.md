# AI Milestone Prompts — AI LeafFilter Lighting App

A curated set of **large, milestone-level prompts** to feed—one at a time—into your AI coding model (Claude) to take this hardware-verified prototype toward a launchable product with a real backend and connectivity layer, suitable for an IT architecture review.

## How to use this document

- Feed **one milestone prompt at a time**. Each is a self-contained copy-paste block written to the AI. Let the AI investigate, propose, and implement before moving on.
- Each prompt is **guided but open**: it states the goal, the real files/functions to look at, and constraints — but leaves the "how" to the AI. Expect (and encourage) the AI to ask clarifying questions, especially on Milestone 3.
- After each milestone, review the diff and test on-device where relevant before starting the next.
- The prompts reference real code as of branch `feature/capacitor-migration`. If line numbers drift, the AI should locate by function/screen name.

## Recommended order & blocking dependencies

| # | Milestone | Blocks / depends on |
|---|-----------|---------------------|
| 1 | Run on a real device (native permissions + BLE UUIDs + on-device verification) | **Foundational.** Nothing else can be validated on hardware until this lands. |
| 2 | Strip prototype seams / make behavior production-honest | Independent of 1, but honest behavior is easier to verify once 1 works. Do early. |
| 3 | **Design** the backend & connectivity architecture (OPEN — AI proposes) | **Gate.** Blocks 4 (scheduling) and informs 5. Produce the review doc before writing backend code. |
| 4 | Build scheduling for real | **Depends on 3.** Do not start until the architecture from 3 is approved. |
| 5 | Multi-controller / whole-home scaling | Depends on 1 (device paths) and the routing decisions in 3. |
| 6 | App-store / deployment readiness | Depends on 1 (native config) being stable. Do near the end. |
| 7 | (Optional) QA / hardening pass | Last. Depends on real telemetry/backend from 1–4. |

Suggested sequence: **1 → 2 → 3 → 4 → 5 → 6 → 7**. Milestones 1 and 2 can overlap; 3 should be a deliberate stop-and-review checkpoint.

---

## Milestone 1 — Make it run on a real device

**When to use this:** first, before any on-hardware validation. The app currently cannot scan BLE or reach WLED on a physical phone.

> **Goal.** Make this Capacitor 8 app build, install, and function on a real iOS and Android device — specifically so it can (a) perform BLE onboarding of the ESP32/WLED controller and (b) reach WLED over the local network for steady-state control. Today the app crashes on BLE scan and cannot reach the controller on a real device because native permissions are missing and the BLE service UUIDs are placeholders.
>
> **Context / files to open first.**
> - `android/app/src/main/AndroidManifest.xml` — currently declares **only** `INTERNET`. Missing: `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` (Android 12+, with `usesPermissionFlags="neverForLocation"` where appropriate), legacy `BLUETOOTH` / `BLUETOOTH_ADMIN` (maxSdkVersion 30), `ACCESS_FINE_LOCATION` (needed by older BLE), `ACCESS_NETWORK_STATE`, and the `<uses-feature android:name="android.hardware.bluetooth_le">` declaration.
> - `ios/App/App/Info.plist` — has **no** usage-description strings. Missing: `NSBluetoothAlwaysUsageDescription`, `NSLocalNetworkUsageDescription`, and `NSBonjourServices` (WLED is discovered / reached on the LAN). Without the local-network entries iOS will silently block HTTP calls to the controller.
> - `src/ble.js` — `loadBlePlugin()` initializes `@capacitor-community/bluetooth-le` with `androidNeverForLocation: true`; the GATT UUIDs at lines ~49–52 (`SERVICE_UUID`, `DEVICE_INFO_CHAR_UUID`, `WIFI_CREDS_CHAR_UUID`, `CONN_STATUS_CHAR_UUID`) are explicitly flagged as **placeholders** that must match real ESP32 firmware. Note the browser-fallback ("demo mode") path so you don't break it.
> - `src/api.js` — `connect()` (line ~251), `getStatus()` (~306), and the WLED JSON calls; on-device these hit the controller over LAN. `capacitor.config.ts` already sets `allowMixedContent: true` (Android) and a solid `appId` (`com.leafhome.lighting`).
>
> **Constraints.**
> - Write the runtime permission-request flow (Android 12+ needs explicit runtime grants for BLUETOOTH_SCAN/CONNECT) — don't just declare manifest entries. Handle graceful denial (user-facing message, no crash).
> - Keep the existing browser "demo mode" fallback working (`Capacitor.isNativePlatform()` gate).
> - The real BLE UUIDs are owned by the firmware engineer. **Do not invent final UUIDs.** Instead: centralize them, document the exact contract the firmware must expose (service + the three characteristics and their READ/WRITE/NOTIFY roles and payload shapes — see the JSON encode/decode helpers in `src/ble.js`), and make it a one-line change to swap them in. Surface a clear TODO/marker and, if useful, ask me for the firmware values.
> - iOS local-network permission is subtle: explain in the plist comments why each key is required and what breaks without it.
>
> **What "done" looks like.** Fresh `npx cap sync` + native build installs on both platforms; launching triggers the correct permission prompts; BLE scan runs without crashing; and once the firmware UUIDs are filled in, onboarding can pair and WLED control works over LAN. Provide a short on-device test checklist (permission prompts to expect, how to verify a BLE scan finds a device, how to verify a WLED HTTP call succeeds) and note anything I must do outside code (e.g., Xcode signing team, firmware UUID handoff).

**Why this matters / dependencies:** This is the foundation — every other milestone's hardware behavior is unverifiable until the app runs on a phone. The BLE UUID coordination has an external dependency (firmware engineer); the prompt is written to unblock everything else while parking that one handoff cleanly.

---

## Milestone 2 — Strip the prototype seams (make behavior production-honest)

**When to use this:** early, alongside or right after Milestone 1. Removes demo hacks that would embarrass a real user or a reviewer.

> **Goal.** Remove the prototype/demo shortcuts so the app behaves honestly: what the UI shows should reflect real state and real hardware, or be clearly labeled as unavailable — never faked. This is about trustworthiness, not new features.
>
> **Context / files — each is a known seam to fix:**
> - **Onboarding start hack.** `src/main.js` line ~282 unconditionally calls `navigate('onboarding')` on every launch. It should honor the persisted `lf_onboarded` flag and route returning users to `home`. Preserve the auto-connect logic that follows (`connect(savedIp)` + `reconcileZonesWithHardware`).
> - **"Add Controller" is simulated.** `src/screens/zones.js` `showAddControllerSheet()` (lines ~99–134) pushes a hardcoded fake "Back Patio" controller with `hw:false` zones and even says so in its own copy. It must instead launch the **real BLE pairing flow** (reuse the onboarding BLE path in `src/ble.js`). If real pairing isn't wired yet, gate the button honestly (disabled + "coming soon") rather than faking a device.
> - **Faked telemetry on Support screen.** `src/screens/support.js` hardcodes `-55 dBm`, `Virtual cloud relay active`, `38°C · Normal range`, power, and firmware card values (lines ~57–90, ~247–253). Replace with real data pulled from the controller (WLED `/json/info` exposes signal, uptime, firmware version, LED count/power estimate) via `getStatus()` in `src/api.js`. Where a datum genuinely isn't available (e.g., no cloud relay exists yet), show an honest "—" / "Not available" state, not an invented number.
> - **Cosmetic onboarding animations.** In `src/screens/onboarding.js` the "test lights" / "flash zones" steps (~lines 356–363, `sleep()` at ~457) are `setTimeout`-driven emoji animations with no hardware call, and the BLE pairing checklist is timer-driven rather than tied to real BLE events. Wire these to actual hardware/BLE events so a successful checkmark means something really happened.
> - **User-created patterns aren't persisted.** `savePattern()` in `src/screens/patternEditor.js` (~line 309/326), plus the `scenes.push(...)` calls in `src/screens/home.js` (~456) and `src/screens/control.js` (~327), push into the in-memory `scenes` array exported from `src/data/scenes.js`. These are **not** part of the `lf_state_v2` localStorage snapshot (`PERSIST_FIELDS` in `src/main.js` ~line 25) and are lost on reload. Persist user-created patterns as part of state (or a sibling key) and rehydrate on load, keeping built-in scenes separate from user ones.
>
> **Constraints.** Don't regress the browser demo-mode fallback. Keep built-in seed scenes intact while making user creations durable. Prefer honest empty/unavailable states over placeholder data anywhere real data can't yet be sourced.
>
> **What "done" looks like.** Returning users land on home; adding a controller either really pairs or is honestly gated; the Support screen reflects the actual controller; onboarding checkmarks correspond to real events; and a pattern I create survives a reload. Give me a short list of any seams you intentionally left (with reasons) so nothing hidden remains.

**Why this matters / dependencies:** Independent of the backend work, so it can run in parallel. Doing it early means later milestones build on honest state rather than layering features over demo hacks. The onboarding-event wiring benefits from Milestone 1 being done (real BLE), so if 1 isn't finished, let the AI stub those specific parts behind honest gating.

---

## Milestone 3 — Design the backend & connectivity architecture (OPEN)

**When to use this:** as a deliberate stop-and-review checkpoint, before writing any backend code or building scheduling. This produces the artifact your IT team reviews.

> **Goal.** Propose, justify, and document a backend + connectivity architecture for this product. There is **no backend today** — all state is local (`lf_state_v2` in localStorage), scheduling is a no-op stub, and the phone talks directly to the controller over BLE (onboarding) and local HTTP (WLED JSON). I need an architecture-review-ready design I can hand to the company's IT team **before** implementing it.
>
> **This is intentionally open. Do NOT jump to code.** First investigate, then **ask me clarifying questions**, then **propose and justify** an architecture, and only implement scaffolding after we align.
>
> **Investigate the current reality first.**
> - `src/api.js` — the entire WLED bridge (`connect`, `getStatus`, `detectOutputs`, `syncZonesWithHardware`, `reconcileZonesWithHardware`, `setPattern`, `applyToHardware`, `applyScene`, `setBrightness`, `setLightsOn`, `setZoneActive`) is direct local HTTP to the controller; `syncSchedules()` (~line 605) is an explicit no-op stub noting "cloud relay endpoint not yet defined."
> - `src/main.js` — state model: single `state` object persisted to `lf_state_v2`, v1→v2 migration, zones under `state.controllers[].zones` with computed getters (~lines 184–197). Other keys: `leaflight_hub_ip`, `lf_onboarded`.
> - `src/ble.js` — its own header comment claims post-provisioning comms happen "over local HTTP (Wi-Fi) or the cloud MQTT relay," and references WWi-Fi-credential provisioning over BLE — treat these as aspirational, not built.
> - `capacitor.config.ts` — `appId: com.leafhome.lighting`; note the `/wled-proxy` dev-only Vite proxy used for phone-over-tunnel testing (not a production path).
>
> **Clarifying questions to ask me (at minimum).** Do we need remote (away-from-home) control, or is local-only acceptable for v1? Is there existing corporate IAM / SSO / customer-account infrastructure to integrate with, or greenfield? Expected scale (households, controllers per home)? Data-residency / privacy constraints (this is a home-security-adjacent brand)? Preferred cloud vendor or on-prem constraints? Firmware roadmap — can the controller run an MQTT client / outbound agent, or must the cloud reach it? Budget/ops appetite for running always-on infrastructure?
>
> **Then propose & justify** an architecture covering: authentication & account model; device registry / claiming / ownership; how schedules are stored and **executed** (WLED has no native time scheduling — options include cloud cron hitting devices, a local companion/hub agent, or firmware-side timers) with trade-offs; the **cloud-vs-local control path** (direct-LAN, cloud relay/MQTT, or hybrid) and how the phone, controller, and cloud interact in each; security (transport, secrets, controller identity, firmware updates); hosting/ops footprint; and a migration path from today's local-only state to the chosen model. Present **at least two viable options** with an explicit recommendation and rationale, including what you'd defer to v2.
>
> **Constraints.** Be architecture-agnostic — recommend, don't assume. Respect that customers' home Wi-Fi and a security-brand reputation are in play. Keep a viable **local-only fallback** so the product degrades gracefully when the cloud is unreachable (the current direct-LAN path is an asset — don't throw it away). Design so today's `state.controllers[]` model and `api.js` call surface can evolve into this without a rewrite.
>
> **What "done" looks like.** A single review-ready architecture document (Markdown in `docs/`) an IT architect can read cold: context, options with trade-offs, recommended design with component & data-flow descriptions (diagrams welcome), auth model, device registry, schedule-execution mechanism, security posture, hosting/ops, and a phased implementation plan. Optionally, thin interface stubs (e.g., a client abstraction that `api.js`/`syncSchedules` could call) — but the **document is the deliverable**, not a half-built backend.

**Why this matters / dependencies:** This is the gate. Scheduling (Milestone 4) and multi-controller routing (Milestone 5) both depend on decisions made here. Treat the AI's questions as a real design conversation — answer them before letting it proceed. Do not let it silently pick a stack and start coding.

---

## Milestone 4 — Build scheduling for real

**When to use this:** only after Milestone 3's architecture is approved. Turns the fake schedule UI into a working feature.

> **Goal.** Make scheduling actually execute lights on/off (and scene) at the configured times, per the backend architecture approved in Milestone 3. Today schedules are pure UI state with no execution path.
>
> **Context / files.**
> - `src/api.js` `syncSchedules()` (~line 605) is a no-op stub — the intended integration point.
> - `src/screens/schedule.js` — the schedule UI and its data shape (`{ id, time, action, active }`).
> - `src/main.js` — `schedules`, plus the vacation fields (`vacationActive`, `vacationScene`, `vacationBehavior`, `vacationOnTime`, `vacationOffTime`) are already in `PERSIST_FIELDS` (~line 25) and persisted to `lf_state_v2`. WLED has **no** native time-based scheduling, so something off-device (or a companion agent) must trigger actions — exactly the mechanism chosen in Milestone 3.
> - Reuse the hardware-apply path: `applyScene` / `applyToHardware` / `setLightsOn` in `src/api.js`.
>
> **Constraints.** Implement whatever schedule-execution mechanism was chosen in Milestone 3 (cloud cron, hub agent, firmware timers, etc.) — do not silently reintroduce a client-only fake. Handle the phone being **offline/asleep** at trigger time (the whole point of not doing this in the app). Cover the vacation mode fields too. Time zones and DST must be correct. Keep the existing schedule UI working; wire it to the real backend.
>
> **What "done" looks like.** A schedule created in the app actually turns lights on/off at the right local time with the phone closed, survives reload, respects enable/disable, and the vacation behavior works. Document how execution is triggered and how to test it end-to-end.

**Why this matters / dependencies:** **Hard-depends on Milestone 3** — the execution mechanism is an architecture decision, not a UI one. Building it before 3 guarantees rework.

---

## Milestone 5 — Multi-controller / whole-home scaling

**When to use this:** after device paths (1) and the routing model (3) are settled, when the product needs to control more than one controller/home.

> **Goal.** Support multiple controllers (whole-home: multiple WLED hubs) end-to-end. Today the data model is multi-controller-aware but the hardware layer only ever targets the first controller.
>
> **Context / files.**
> - State already supports it: `state.controllers[]` each with `.zones`, and computed `allZones` / `activeZones` getters flatten across controllers (`src/main.js` ~lines 184–197).
> - But the hardware layer is single-hub: in `src/api.js`, `applyToHardware()` (~line 489) reads `state.controllers[0]?.zones` (~line 497), and `reconcileZonesWithHardware()` (~line 421) replaces `state.controllers[0]` only (see the "Single-hub model: HUB_IP belongs to controllers[0]" comment ~line 413). `applyScene` similarly assumes one target. `leaflight_hub_ip` is a single global IP.
> - `src/screens/zones.js` already renders/toggles zones across controllers and has the (currently simulated) add-controller flow from Milestone 2.
>
> **Constraints.** Each controller has its own address/identity — replace the single `leaflight_hub_ip` global with per-controller connection info, and route each zone's commands to its owning controller. Fan-out should be resilient: one controller offline must not break commands to the others (fire-and-forget per the existing offline-tolerant pattern). Respect the connectivity model from Milestone 3 (local vs cloud routing). Don't regress single-controller homes.
>
> **What "done" looks like.** With two real (or realistically mocked) controllers, zone toggles, scene applies, brightness, and reconcile all target the correct hub; adding a second controller via pairing works; and one hub going offline degrades gracefully. Note any state-shape/migration changes.

**Why this matters / dependencies:** Depends on Milestone 1 (real device paths) and Milestone 3 (how commands are routed — direct LAN per hub vs via cloud). Milestone 2's real add-controller flow feeds this.

---

## Milestone 6 — App-store / deployment readiness

**When to use this:** near the end, once native config (Milestone 1) is stable and behavior is honest (Milestone 2).

> **Goal.** Get the app ready to submit to the Apple App Store and Google Play: branding, signing, store metadata, and privacy disclosures — with minimal review-rejection risk.
>
> **Context / files.**
> - `capacitor.config.ts` — `appId: com.leafhome.lighting`, `appName: 'Lighting by LeafFilter'`, black splash/status-bar theme already configured.
> - `android/app/src/main/AndroidManifest.xml` and `ios/App/App/Info.plist` — by Milestone 1 these carry BLE + local-network permissions; **Play and Apple both require justification for Bluetooth and local-network access**, so the store listings and privacy forms must match what the manifest/plist declare.
> - Current icons/splash are default Capacitor placeholders (black canvas); branded assets are needed.
>
> **Constraints.** Produce branded app icons and splash for both platforms (all required sizes). Set up release signing (Android keystore/Play App Signing; iOS provisioning/certs) — document the steps I must do in the Apple/Google consoles since those can't be scripted. Draft store listing copy, screenshots guidance, and the **privacy disclosures**: Apple Privacy Nutrition Labels + Google Play Data Safety, plus a note on the App Store's local-network and Bluetooth usage justifications. Flag anything likely to trigger review scrutiny for a home-control app (background BLE, local network, account requirements).
>
> **What "done" looks like.** Signed release builds for both stores, branded icons/splash in place, a filled-out store-listing + privacy-disclosure package, and a checklist of console-side actions only I can perform. Call out the top review-rejection risks and how each is mitigated.

**Why this matters / dependencies:** Depends on Milestone 1 (the permissions you declare must be justified in the listing) and Milestone 2 (reviewers dislike obviously-fake data). Do it once the app is genuinely functional.

---

## Milestone 7 — (Optional) QA / hardening pass

**When to use this:** last, once real hardware, telemetry, and backend paths exist to test against.

> **Goal.** Harden the app for real-world conditions: offline behavior, error states, flaky networks, and genuinely real telemetry. Prototype code assumes the happy path.
>
> **Context / files.**
> - `src/api.js` — connection/error handling across `connect`, `getStatus`, and the apply functions; the offline-tolerant fire-and-forget pattern is documented at the bottom of the file but not uniformly enforced with user-visible error states.
> - `src/screens/support.js` — after Milestone 2 this should already pull real `/json/info` data; verify and extend (signal, uptime, firmware, LED power estimate) and confirm no faked values remain.
> - Onboarding, add-controller, and schedule flows — verify each surfaces honest failure states (controller unreachable, BLE denied, pairing timeout, backend unreachable).
>
> **Constraints.** No silent failures and no invented data. Every network/BLE/backend call should have a defined failure UX. Verify graceful degradation to local-only when the cloud (Milestone 3/4) is down. Keep the browser demo-mode path intact.
>
> **What "done" looks like.** A pass documenting each failure mode and its handling, real telemetry confirmed on the Support screen, and reproducible tests (or a manual test script) for the key offline/error scenarios.

**Why this matters / dependencies:** Best done last — it validates the real behavior introduced by Milestones 1–4. Running it earlier means re-testing after each subsequent change.

---

*Generated for branch `feature/capacitor-migration`. Line numbers reference code at the time of writing; locate by function/screen name if they drift.*
