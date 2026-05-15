# Draft Lab — Feature Roadmap

> Living document. Updated May 2026.  
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
- Grade reference guide (? button), legal attribution (© button)
- GitHub Pages hosted with JSX build pipeline (Babel)
- Supabase auth (Google OAuth), cloud sync, multi-user via invite-only access
- First-login local→Supabase push; backup restore pushes to cloud
- Card hover preview confined to name cell

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
- [ ] Clicking Δ cell opens popover with all three values spelled out numerically — not yet built
- [ ] Mobile expanded view: three-way delta indicators alongside Expert/Performance fields — not yet built

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

### 3.2 Desktop Card Lightbox
- [ ] Clicking a card name opens a lightbox overlay with full card image (~400px)
- [ ] Card name, mana cost, type line, oracle text alongside image
- [ ] Current grades (My Grade, Expert, Performance, Sunset, notes, tags) in right panel
- [ ] Grades editable inline from lightbox
- [ ] Close via Escape, clicking backdrop, or close button
- [ ] Keyboard navigable: left/right arrow moves to adjacent card in sort order
- [ ] DFC flip button (↻) shown when card has two faces — replaces separate DFC polish item

### 3.3 Source Badge Refinement ✅ COMPLETE
- [x] Source-specific labels: `17L` | `AH` | `MAN`
- [x] Badge color varies by source: gold (17Lands), blue (AetherHub), dimmer (manual)
- [ ] Tooltip on badge shows full source name, format, and import date — not yet built

---

## Phase 4 — Analytics View (High Value, Later)

**Goal:** End-of-season insight built into the app. Activates when a set has ≥50% of cards graded and at least one community rating source imported.

### 4.1 Calibration Chart
- [ ] Histogram: My Grade distribution vs Performance rating
- [ ] Breakdown by color and rarity

### 4.2 Core Scatter Plot
- [ ] X: Performance rating · Y: My Grade (numeric) · color: MTG color · size: rarity
- [ ] Quadrant lines at mean of each axis
- [ ] Hover shows card name + values; click opens lightbox (Phase 3.2)

### 4.3 Quadrant Summary
- [ ] COUNT and list of cards per quadrant
- [ ] Tag correlation: "Cards tagged [sleeper] appeared in SPOT 60% of the time"

### 4.4 Sunset Grade Retrospective
- [ ] Cards with largest My Grade → Sunset Grade swing

### 4.5 Tag Accuracy
- [ ] Per-tag average accuracy vs Performance rating

### 4.6 Cross-Set Tracking
- [ ] Aggregate calibration metrics across sets — color bias, rarity bias, improvement trend

### 4.7 Implementation Notes
- [ ] Lightweight CDN charting library (Chart.js or similar)
- [ ] Analytics tab as top-level view alongside set picker
- [ ] No additional API calls — all data already in memory

---

## Phase 5 — Additional Community Sources (Lower Priority)

### 5.1 MTGA Personal Data
- [ ] 17Lands personal card stats (requires user token)
- [ ] Stored as `personal_performance_rating` separate from community data

### 5.2 Draftsim Integration
- [ ] Investigate Draftsim JSON endpoint via DevTools; add `draftsim-prep.py` if accessible

### 5.3 AetherHub Scraper Robustness
- [ ] Fallback: if DOM walk yields <10 results, try JSON-LD structured data
- [ ] Version check: warn if card count significantly below set size

### 5.4 Restore from CSV Export
**Decision: won't implement.** JSON backup is the canonical restore path. CSV is for external analysis only.

---

## Phase 6 — Native App (Future)

Converts GitHub Pages app to native mobile via Capacitor. Prerequisites: Phases 1–4 stable, Apple Developer account ($99/yr) for iOS.

- [ ] Capacitor scaffold, iOS + Android targets
- [ ] Replace FileReader CSV import with Capacitor Filesystem plugin (iOS requirement)
- [ ] App icon + splash screen
- [ ] Deep linking for Google OAuth redirect
- [ ] Android: signed APK for sideloading · iOS: TestFlight (up to 100 testers)

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
- [x] Version display (v2.2) in header subtitle and login screen
- [x] Login screen theme toggle (☀/🌙)
- [ ] Delta cell hover indicator — no visual feedback that the cell is clickable; consider subtle underline or background on hover
- [ ] DFC image flip — defer to Phase 3.2 lightbox (↻ button on card image)
- [ ] Remember last open set — on refresh or login, auto-load the previously selected set; save set code to localStorage on `loadSet()`, restore after sets list populates

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| AetherHub scraper uses heuristic DOM walk — may break on layout changes | Open | See Phase 5.3 |
| 17Lands game data files are 300–600MB — slow on poor connections | By design | Script supports pre-downloaded local files |

---

## Community Data Sources Reference

| Source | Type | Timing | Format | Access |
|--------|------|---------|--------|--------|
| AetherHub / Nizzahon | Expert pre-release grades | Release weekend | 0–5 scale | `aetherhub-scrape.js` browser console |
| 17Lands GIH WR | Empirical play data | 2–3 weeks post-release | Win rate → normalized 0–5 | `17lands-prep.py` + CSV import |
| Draftsim | AI-adjusted ratings | Updated through format | Tier list | TBD — see Phase 5.2 |
| MTGA Personal | Your own Arena play data | Ongoing | Win rate | TBD — see Phase 5.1 |

---

## Development Notes for Claude Code

- Edit `apps/web/src/DraftLab.jsx` → `cd apps/web && node compile.js` → commit both files
- CSS / Supabase config changes go in `apps/web/template.html`
- Tag CSS goes in `template.html` style block
- All new grade fields must be handled in: `updateGrade`, `persistGrades`, `loadGrades`, `exportBackup`, `importBackup`, `exportCSV`, and the first-login sync effect
- Mobile ⚙ drawer and desktop header must both expose any new import/action controls
- Test mobile layout using Chrome DevTools device toolbar at 390px width

---

*Draft Lab is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved or endorsed by Wizards of the Coast. ©Wizards of the Coast LLC. Card data via Scryfall. Performance data via 17Lands public datasets.*
