# Draft Lab — Feature Roadmap

> Living document. Updated May 2026. Current version: **v3.0** (Phase 4.5 complete)  
> Development target: local HTML → GitHub Pages + Supabase stack.  
> Edit `apps/web/src/DraftLab.jsx`, run `node compile.js` from `apps/web/`, commit both files.

---

## Current State

- Live Scryfall set + card data fetch
- A+–F half-grade scale including D+ (My Grade + Sunset Grade)
- Expert column (AetherHub/Nizzahon pre-release) + Performance column (17Lands GIH WR)
- Unified Import panel: source selector (17Lands / AetherHub / Manual), target (Auto / Expert / Perf)
- Export dropdown: Export Backup (JSON), Restore Backup (JSON), Export Grades (CSV)
- Three-way Δ indicators: ME / MP / EP compact rows with colored ≈/▲/▼ symbol
- Four-quadrant classification badges: FORMAT / MISS / SPOT / VAR with filter
- Structured tags: 11 tags in 3 groups, floating picker, 2-chip cap + overflow count
- Tag filter in desktop bar and mobile ⚙ drawer
- Mana symbols rendered as Scryfall SVGs
- Color/rarity/graded/quadrant/tag filters, sortable columns
- Responsive layout: desktop table + mobile expandable card list
- Dark/light theme with manual toggle
- Grade reference guide (⚖ button), legal attribution (© button)
- GitHub Pages hosted with JSX build pipeline (Babel)
- Supabase auth (Google OAuth), cloud sync, multi-user via invite-only access
- First-login local→Supabase push; backup restore pushes to cloud
- Card hover preview confined to name cell
- Desktop card lightbox: click card name → full overlay with image, editable grades, DFC flip, keyboard nav
- **Analytics view** (💡 button) — unlocks at ≥50% graded + community ratings imported
  - Distribution tab: grade histogram vs performance GIH WR line, calibration stats
  - Scatter tab: quadrant-colored dots (MISS/SPOT/CONSENSUS/FORMAT/VAR), rarity sizing, mean crosshairs + diagonal, mobile card preview overlay
  - Quadrants tab: card lists per quadrant sorted by gap size, count badges, clickable rows
- Set symbol in header (Scryfall SVG, gold-tinted, next to set dropdown)
- v3.0 version display in header and login screen
- Login screen theme toggle (☀/🌙)
- Auto-restore last open set on refresh/login
- GitHub link in © modal

---

## Architecture Principles

- **JSX source is canonical.** Edit `apps/web/src/DraftLab.jsx`, compile via `node compile.js`. Never edit `index.html` directly.
- **Supabase is the source of truth.** localStorage is the offline cache and write buffer only.
- **All community rating imports use the same CSV format:** `Card Name, Rating` (columns 1 & 2, header row optional).
- **Mobile-first for new UI.** Every new control must be reachable from the ⚙ drawer on mobile before being added to the desktop header.
- **Backward compatible.** Existing JSON backups must continue to import correctly through all schema changes.

---

## Phase 1 — Dual Community Rating ✅ COMPLETE

### 1.1 Data Layer
- [x] Add `expert_rating` field (pre-format, AetherHub/Nizzahon source)
- [x] Add `performance_rating` field (end of season, 17Lands GIH WR source)
- [x] Add `expert_source` and `performance_source` fields for attribution
- [x] Migration shim: old `lsv` / `lsvSource` keys map forward to new fields on load
- [x] Update `persistGrades` and `loadGrades` to handle both fields
- [x] Update JSON backup/restore to preserve both fields
- [x] Update CSV export to include both columns + sources + quadrant + tags

### 1.2 Import Layer
- [x] Unified ImportPanel replaces 17L-only panel
- [x] Source selector: 17Lands | AetherHub | Manual
- [x] Target selector: Auto (17L→Perf, AH→Expert) | Expert | Performance
- [x] 17Lands CSV → writes `performance_rating` + `performance_source`
- [x] AetherHub CSV → writes `expert_rating` + `expert_source`
- [x] Independent Flush Expert / Flush Performance per source
- [x] Import metadata tracked per source separately

### 1.3 Display Layer — Desktop Table
- [x] Expert column + Performance column replace single Community column
- [x] Both columns show colored source badges: 17L (gold) / AH (blue) / MAN (dimmer)
- [ ] Hover tooltip on Performance column shows raw GIH WR % and sample count — not yet built

### 1.4 Three-Way Δ Indicators
- [x] Compact ME / MP / EP rows with colored ≈/▲/▼ symbol (green/yellow/red by magnitude)
- [x] Only shown where both values are populated
- [x] Hover tooltip shows comparison name and delta value
- [x] Clicking Δ cell opens popover with My Grade / Expert / Performance values + full comparison rows
- [x] Mobile expanded view: Comparison section with ME/MP/EP rows below Expert/Performance fields

### 1.5 Four-Quadrant Classification
- [x] FORMAT / MISS / SPOT / VAR badges in card name cell (desktop + mobile collapsed row)
- [x] Quadrant filter in desktop bar and mobile ⚙ drawer

---

## Phase 2 — Notes Structure ✅ COMPLETE

### 2.1 Tag System
- [x] `tags` array field in grade object (stored in Supabase `data` jsonb column)
- [x] Backup/restore and CSV export include tags

### 2.2 Tag UI — Mobile
- [x] Full chip row in mobile expanded card view below notes
- [x] Active tags filled gold, inactive dimmer outlines
- [x] Touch-friendly sizing

### 2.3 Tag UI — Desktop
- [x] Floating picker panel in Notes cell (doesn't expand row height)
- [x] 2 visible active chips + overflow count (e.g. +3); click to edit opens full picker
- [x] Click-outside closes picker

### 2.4 Tag Filtering
- [x] Tags dropdown filter in desktop filter bar (any-of semantics)
- [x] Tag chip filter row in mobile ⚙ drawer

---

## Phase 3 — Visual Enhancements

### 3.1 Mana Symbol Rendering ✅ COMPLETE
- [x] `renderMana(costString)` parses `{X}` tokens into `<img>` tags from `svgs.scryfall.io`
- [x] Applied to Cost column (desktop) and card meta row (mobile)
- [x] Graceful fallback: unknown symbols hide via `onError`

### 3.2 Desktop Card Lightbox ✅ COMPLETE
- [x] Click card name → lightbox with 300px image + all grades editable inline
- [x] DFC flip button (↻) toggles between card faces
- [x] Close via Escape, clicking backdrop, or Close button
- [x] Keyboard: left/right arrows navigate cards, counter shows position
- [x] Hover preview suppressed while lightbox is open

### 3.3 Source Badge Refinement ✅ COMPLETE
- [x] Source-specific labels: `17L` | `AH` | `MAN`
- [x] Badge color varies by source: gold (17Lands), blue (AetherHub), dimmer (manual)
- [x] Tooltip on badge shows full source name, format, and time since import

---

## Phase 4 — Analytics View ✅ COMPLETE (v3.0)

**Goal:** End-of-season insight built into the app. Activates when a set has ≥50% of cards graded and at least one community rating source imported.

### 4.1 Calibration Chart
- [x] Histogram: My Grade distribution vs Performance rating
- [ ] Breakdown by color and rarity — deferred to Phase 7

### 4.2 Core Scatter Plot
- [x] X: Performance rating · Y: My Grade (numeric) · color: quadrant · size: rarity
- [x] Quadrant lines at mean of each axis + diagonal reference line
- [x] Hover shows card name + values (nearest-point mode); click opens card preview
- [x] Mobile: tap opens simple image+stats overlay instead of full lightbox
- [x] Deterministic jitter prevents overplotting

### 4.3 Quadrant Summary
- [x] COUNT and list of cards per quadrant, sorted by gap size
- [ ] Tag correlation: "Cards tagged [sleeper] appeared in SPOT 60% of the time" — deferred to Phase 7

### 4.4 Sunset Grade Retrospective
- [ ] Cards with largest My Grade → Sunset Grade swing — deferred to Phase 7 (no sunset grades filled in yet)

### 4.5 Tag Accuracy
- [ ] Per-tag average accuracy vs Performance rating — deferred to Phase 7

### 4.6 Cross-Set Tracking
- [ ] Aggregate calibration metrics across sets — color bias, rarity bias, improvement trend — deferred to Phase 7 (needs multiple graded sets)

### 4.7 Implementation Notes
- [x] Chart.js 4 via CDN
- [x] Analytics tab as top-level view (💡 icon in header)
- [x] No additional API calls — all data already in memory

---

## Phase 4.5 — God Component Refactor ✅ COMPLETE

**Goal:** Structural refactor of `DraftLab.jsx` before Phase 5 adds draft simulator state. No user-facing changes.

- [x] Extract pure utility functions above `DraftLab` (`applyFilters`, `applySort`, `renderMana`, `debounce`)
- [x] Introduce `GradesContext` + `useGrades()` hook for shared grade state without prop drilling
- [x] Extract `AnalyticsView` sub-component (reads context, no write path, local state only)
- [x] Extract `FilterBar` sub-component + introduce `filterReducer` for consolidated filter state
- [x] Extract `ImportPanel` sub-component
- [x] Extract `MobileDrawer` sub-component
- [x] Extract `CardLightbox` sub-component
- [x] Extract `GradeTable` and `GradeRow` sub-components
- [x] Extract `GradingView` as top-level assembly component
- [x] `useMemo` for sorted/filtered card list in `GradingView`
- [x] Notes: blur-to-save pattern (onChange → local state, onBlur → updateGrade + persist)
- [x] Mobile card list: accordion — one card open at a time

**Notes vs spec:** `DraftView`/`DraftReviewView` stubs deferred to Phase 5.2. Filter state (`filters`/`dispatchFilter`) remains in `DraftLab` due to `loadSet` coupling; full migration deferred.

---

## Phase 5 — Draft Simulator + Pick Review 🔜 NEXT

**Goal:** A full 8-player draft simulator with bot opponents, pick-by-pick signal review, and deck construction feedback. Built on top of the existing grading infrastructure — My Grade, Expert, and Performance ratings are visible on every card during the draft. Proving ground set: **KHM**.

**Prerequisites:** Phase 4.5 complete ✅

> **AI Architecture:** See [`docs/phase-7-draft-ai.md`](docs/phase-7-draft-ai.md) for the four-layer bot system (card value function, Bayesian belief state, mistake injection, optional LLM) and the signal accuracy training loop. Note: that document references "Phase 7" — this is now Phase 5. Architecture is unchanged.
>
> **Planning docs:** [`docs/phase-5-1-data-foundation.md`](docs/phase-5-1-data-foundation.md) · [`docs/phase-5-signal-review.md`](docs/phase-5-signal-review.md) · [`docs/draft-ai-planning-addendum.md`](docs/draft-ai-planning-addendum.md)

### Phase 5.1 — Data Foundation

**Goal:** Clean, structured card data before the simulator is built. Proving ground set: KHM.

- [ ] Introduce `context` field on grade objects: `{ early, ahead, parity, behind }` — optional per card, never composited or averaged
- [ ] Grade drawer UI: collapsible context rating section with per-game-state grade selectors
- [ ] Migrate STX legacy Q-notation notes (`Q: A/A-/B/C`) into `context` objects via one-time script; clean notes field after migration
- [ ] Formalize tag definitions — document in code near `TAGS` constant
- [ ] Clarify notes field purpose — update placeholder text to reflect notes as reasoning/nuance only, not structured data
- [ ] KHM grading continues with new tag and context standards applied going forward

**Must complete before Phase 5.2. All definition-of-done criteria in the spec must be met.**

### Phase 5.2 — Draft Simulator + Pick Review

**Milestone 1 — Basic draft loop (Layer 1 bots)**
- [ ] Supabase schema: `draft_sessions`, `draft_picks`, `draft_decks`
- [ ] 17Lands script extension: add ALSA, ATA, OH WR columns to `17lands-prep.py`
- [ ] Pack generation from Scryfall card pool by rarity slot
- [ ] `DraftView`: user pick interface, pool display, session persistence
- [ ] Layer 1 card value function (greedy, weighted across grade sources)
- [ ] Basic `SessionList` in `DraftReviewView`

**Milestone 2 — Signal-aware bots (Layer 1 + 2)**
- [ ] Bayesian belief state model per bot (color commitment, updated per pack)
- [ ] ALSA-informed bot pick decisions
- [ ] Pick review: wheel check logic, ALSA-based pass evaluation
- [ ] Pick classification labels (✓ Clean, ⚠ Risky pass, ⚠ Off-color, 🔍 Review)
- [ ] `PickRow` UI with collapsed/expanded detail

**Milestone 3 — Realistic table (Layer 1 + 2 + 3)**
- [ ] Bot personality profiles with mistake injection (Spike, Timmy, Grinder, Johnny, Casual)
- [ ] Pivot point detection in pick review
- [ ] Summary panel: signal accuracy totals, archetype, colors
- [ ] Archetype fingerprinting (`SET_ARCHETYPES` constant)
- [ ] Deck build feedback vs archetype norms

**Milestone 4 — Optional LLM layer**
- [ ] Layer 4: LLM invocation for contested picks during draft (near-tie cards)
- [ ] LLM narrative feedback for flagged picks in pick review (on-demand, ~5–15 API calls per review session)

---

## Phase 6 — Cross-Draft Analytics 🔜

**Goal:** Longitudinal analysis across multiple draft sessions once Phase 5 data has accumulated. Answers "how am I improving?" rather than "how did this draft go?"

- [ ] Signal accuracy trends over time — table signal reading improvement across sessions
- [ ] Internal signal accuracy — how consistently does pool color lean lead to correct commitment?
- [ ] Correlation between draft pick decisions and grading calibration (stated grade vs. in-draft behavior)
- [ ] Cards consistently diverged from during drafts vs. grades — behavioral vs. stated evaluation gap
- [ ] Cross-session archetype tendency profiling
- [ ] History view surface: aggregated session data, trend charts

---

## Phase 7 — Data Quality + Analytical Accuracy 🔜

**Goal:** Systematic tightening of the data foundation across all sets. Informed by what Phases 5 and 6 reveal about data quality gaps.

- [ ] Tag audit across all graded sets against formalized Phase 5.1 definitions
- [ ] Context rating audit — identify cards that would benefit from game state ratings
- [ ] Grade consistency review — identify systematic calibration drift across sets
- [ ] ALSA sample size thresholds — flag 17Lands data imported from low-sample periods
- [ ] Notes quality pass — convert remaining freeform reasoning into structured fields where appropriate
- [ ] Tune `SET_ARCHETYPES` norms from real draft session data
- [ ] Deferred from Phase 4: tag accuracy per-tag vs Performance rating
- [ ] Deferred from Phase 4: cross-set calibration metrics (color bias, rarity bias, improvement trend)
- [ ] Deferred from Phase 4: quadrant tag correlation
- [ ] Deferred from Phase 4: Sunset Grade retrospective (once sunset grades are filled in)

---

## Phase 8 — Community Ratings Expansion 🔜

**Goal:** Add additional community rating sources to increase confidence in expert grade consensus through corroboration, not volume.

- [ ] Research and evaluate additional pre-release rating sources alongside AetherHub
- [ ] Weighted consensus grade: convergence = higher confidence, divergence = surfaced signal
- [ ] Import pipeline extensions for new sources (consistent with existing ImportPanel pattern)
- [ ] Source badge system extended for new sources
- [ ] AetherHub scraper robustness: fallback to JSON-LD if DOM walk yields <10 results; warn if card count below set size
- [ ] Draftsim: investigate JSON endpoint via DevTools; add `draftsim-prep.py` if accessible
- [ ] MTGA Personal: 17Lands personal card stats (requires user token); stored as `personal_performance_rating`

---

## Phase 9 — Native App (Final Phase) 🔜

Converts GitHub Pages app to native mobile via Capacitor. The most expensive phase — requires an Apple Developer account ($99/yr) for iOS distribution. Tackle only after Phases 1–8 are stable and the app has proven long-term value.

- [ ] Capacitor scaffold, iOS + Android targets
- [ ] Replace FileReader CSV import with Capacitor Filesystem plugin (iOS requirement)
- [ ] App icon + splash screen
- [ ] Deep linking for Google OAuth redirect
- [ ] Android: signed APK for sideloading · iOS: TestFlight (up to 100 testers)

---

## Won't Implement

- Restore from CSV export — JSON backup is the canonical restore path; CSV is for external analysis only
- Multiplayer or shared draft sessions
- Real-time MTGA integration
- Social features or public grade sharing

---

## Polish Queue

- [x] D+ missing from grade dropdown — fixed
- [x] Δ column verbosity — replaced with compact ME/MP/EP + colored symbol
- [x] Mobile header overflow — trimmed to 4 icon buttons; all actions in ⚙ drawer
- [x] Tag picker inline expansion — converted to floating popover
- [x] Card hover on full row — confined to name cell only
- [x] Δ cell click popover — shows My Grade / Expert / Performance values + full comparison rows
- [x] Source badge tooltip — shows source name, format, and time since import
- [x] Mobile comparison row — three-way delta displayed in expanded card view
- [x] Clickable Draft Lab logo → GitHub repo
- [x] Version display in header subtitle and login screen — now v3.0
- [x] Login screen theme toggle (☀/🌙)
- [x] Remember last open set — saves set code on `loadSet()`, auto-restores after sets list populates
- [x] Grade guide icon — replaced ? with ⚖ (scales)
- [x] DFC image flip — ↻ button in lightbox toggles between card faces
- [x] iOS input zoom — fixed with `font-size: 16px` minimum on all mobile inputs and selects
- [x] GitHub project link inside the app — added as "View on GitHub →" in the © modal
- [x] Sign Out unreachable on mobile — moved to mobile header as a small button to the left of ⚙
- [x] Analytics mobile landscape — header collapses to icon bar only, chart fills viewport height
- [x] Scatter chart scroll interference on mobile — `touch-action:none` on canvas prevents page scroll while hovering
- [x] SPOT and CONSENSUS quadrant colors identical — SPOT changed to cyan (#00acc1)
- [x] Set symbol in header — Scryfall SVG, gold CSS filter, displayed next to set dropdown
- [ ] Delta cell hover indicator — no visual feedback that the cell is clickable; consider subtle underline or background on hover
- [ ] Tags filter dropdown overflows screen on right side on desktop — reposition to open left-aligned or use viewport boundary detection
- [ ] Set selector width inconsistency — desktop set name can feel truncated compared to mobile full-width version; consider consistent max-width treatment
- [ ] Source badge visual weight inconsistency — AH (blue) border reads lighter than 17L (gold) border against the parchment background; same CSS but different perceived weight due to color. Consider normalizing border opacity or using a neutral border color for all badges
- [ ] Grade dropdown alignment — native `<select>` can't be styled on mobile (OS renders natively); fix requires replacing GradeSelect with a custom picker component (button + styled overlay); deferred to polish pass
- [ ] Mobile card whitespace — image column has dead space below the card when controls column is taller; consider full-width layout (image on top, controls stacked below) as a future option
- [ ] Session state persistence per set — save sort column/direction and active filter buttons (color, rarity, graded, quadrant) to localStorage per set; restore on set load; extend the existing `draft-lab-last-set` pattern

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| AetherHub scraper uses heuristic DOM walk — may break on layout changes | Open | Robustness improvements planned for Phase 8 |
| 17Lands game data files are 300–600MB — slow on poor connections | By design | Script supports pre-downloaded local files |

---

## Community Data Sources Reference

| Source | Type | Timing | Format | Access |
|--------|------|---------|--------|--------|
| AetherHub / Nizzahon | Expert pre-release grades | Release weekend | 0–5 scale | `aetherhub-scrape.js` browser console |
| 17Lands GIH WR | Empirical play data | 2–3 weeks post-release | Win rate → normalized 0–5 | `17lands-prep.py` + CSV import |
| Draftsim | AI-adjusted ratings | Updated through format | Tier list | TBD — see Phase 8 |
| MTGA Personal | Your own Arena play data | Ongoing | Win rate | TBD — see Phase 8 |

---

## Development Notes for Claude Code

- Edit `apps/web/src/DraftLab.jsx` → `cd apps/web && node compile.js` → commit both files
- CSS / Supabase config changes go in `apps/web/template.html`
- Tag CSS goes in `template.html` style block
- All new grade fields must be handled in: `updateGrade`, `persistGrades`, `loadGrades`, `exportBackup`, `importBackup`, `exportCSV`, and the first-login sync effect
- Mobile ⚙ drawer and desktop header must both expose any new import/action controls
- Test mobile layout using Chrome DevTools device toolbar at 390px width
- See `docs/README.md` for the full index of design documents and implementation specs

---

*Draft Lab is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved or endorsed by Wizards of the Coast. ©Wizards of the Coast LLC. Card data via Scryfall. Performance data via 17Lands public datasets.*
