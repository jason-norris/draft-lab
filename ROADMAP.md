# Draft Lab — Feature Roadmap

> Living document. Updated May 2026.  
> Development target: local HTML → GitHub Pages + Supabase stack.  
> Use Claude Code to work through phases sequentially. Test locally via `python -m http.server 8080`.

---

## Current State

The app is a single self-contained `draft-lab.html` file with:
- Live Scryfall set + card data fetch
- A–F half-grade grading per card (My Grade + Sunset Grade)
- One community rating slot (imported via CSV — 17Lands or AetherHub)
- Single Δ agreement indicator (Higher / Lower / Agree)
- Freeform notes field
- Color/rarity/graded filters, sortable columns
- Responsive layout (table on desktop, expandable card list on mobile)
- Dark/light theme following system preference with manual toggle
- JSON backup/restore (all sets, all grades)
- Per-set CSV export
- Grade reference guide (? button)
- GitHub Pages hosted, Supabase auth + sync

---

## Architecture Principles

- **No build toolchain required for the HTML file.** JSX must be pre-compiled via the existing Babel Node script before committing. The output file must open directly in Chrome with no server.
- **Supabase is the source of truth.** localStorage is the offline cache and write buffer only.
- **All imports use the same CSV format:** `Card Name, Rating` (columns 1 & 2, header row optional). The import layer handles source tagging.
- **Mobile-first for new UI.** Every new control must be reachable from the ⚙ filter drawer on mobile before being added to the desktop header.
- **Backward compatible.** Existing JSON backups must continue to import correctly through all schema changes.

---

## Phase 1 — Dual Community Rating (High Priority)

**Problem:** The current single community rating slot forces a choice between pre-release expert opinion and end-of-season performance data. Flushing one to import the other discards the comparison that's most analytically valuable.

**Goal:** Store both simultaneously and show all three comparisons (You vs Expert, You vs Performance, Expert vs Performance) at once.

### 1.1 Data Layer

- [ ] Add `expert_rating` field to the grade object (pre-format, AetherHub/Nizzahon source)
- [ ] Add `performance_rating` field to the grade object (end of season, 17Lands GIH WR source)
- [ ] Add `expert_source` and `performance_source` fields for attribution tracking (`"aetherhub"`, `"17lands"`, `"manual"`)
- [ ] Rename existing `lsv` field to `community_rating` with a migration shim that reads old `lsv` keys from localStorage/Supabase and maps them forward
- [ ] Update Supabase schema: add `expert_rating`, `expert_source`, `performance_rating`, `performance_source` columns
- [ ] Update `persistGrades` and `loadGrades` to handle both fields
- [ ] Update JSON backup/restore to preserve both fields
- [ ] Update CSV export to include both columns

### 1.2 Import Layer

- [ ] Update the 17L import panel to write to `performance_rating` / `performance_source` rather than `lsv`
- [ ] Add an **Expert** import option alongside the existing **17L** panel (or merge into a unified import modal with source selector)
- [ ] Source selector options: `17Lands` | `AetherHub` | `Manual`
- [ ] 17Lands CSV → writes `performance_rating` + `performance_source: "17lands"`
- [ ] AetherHub CSV → writes `expert_rating` + `expert_source: "aetherhub"`
- [ ] Manual CSV → writes to whichever field user selects
- [ ] Remove the **Flush 17L** button; replace with **Flush Expert** and **Flush Performance** independently
- [ ] Update import metadata (format label, card count, timestamp) per source separately

### 1.3 Display Layer — Desktop Table

- [ ] Rename "Community" column to "Expert"
- [ ] Add "Performance" column to the right of Expert
- [ ] Replace single Δ column with three comparison indicators (see §1.4)
- [ ] Both columns show the `src-badge` (17L / AH / manual) when populated
- [ ] Hover tooltip on Performance column shows raw GIH WR % and sample count when source is 17Lands

### 1.4 Three-Way Δ Indicators

Replace the current single "▲ Higher / ▼ Lower / ≈ Agree" cell with three compact indicators in one column. Each indicator compares two values and shows a colored dot + directional symbol.

| Indicator | Compares | Label |
|-----------|----------|-------|
| **Me vs Expert** | `my_grade` vs `expert_rating` | Did I agree with the pre-release consensus? |
| **Me vs Performance** | `my_grade` vs `performance_rating` | How accurate was I vs actual outcomes? |
| **Expert vs Performance** | `expert_rating` vs `performance_rating` | Did the expert get it right? |

- [ ] Each indicator: green dot (agree within 0.5), yellow (diverge 1.0), red (diverge 1.5+)
- [ ] Show only indicators where both values are populated
- [ ] Clicking the Δ cell opens a small popover with the three values spelled out numerically
- [ ] On mobile expanded view: show the three indicators as labeled rows in the detail panel

### 1.5 Four-Quadrant Classification

Derive a quadrant label per card when all three of My Grade, Expert, and Performance are populated. Display as a subtle badge on the card row.

| Quadrant | Condition | Label | Meaning |
|----------|-----------|-------|---------|
| **Consensus correct** | Me ≈ Expert ≈ Performance | — | No badge, expected |
| **Format misread** | Me ≈ Expert ≠ Performance | `FORMAT` | Both humans wrong the same way |
| **You were off** | Me ≠ Expert ≈ Performance | `MISS` | Consensus was right, you weren't |
| **You saw it** | Me ≈ Performance ≠ Expert | `SPOT` | You outperformed expert pre-release |
| **All diverge** | Me ≠ Expert ≠ Performance | `VAR` | High-variance or archetype-dependent card |

- [ ] Quadrant badge shown on desktop table row (subtle, right-aligned in card name cell)
- [ ] Quadrant badge shown on mobile collapsed row
- [ ] Add quadrant as a filter option in the filter bar / mobile ⚙ drawer

---

## Phase 2 — Notes Structure (Medium Priority)

**Problem:** Freeform notes are unanalyzable in aggregate. After multiple sets, hundreds of text blobs can't be queried meaningfully.

**Goal:** Lightweight tagging alongside freeform text, stored separately so tags are queryable.

### 2.1 Tag System

Predefined tag vocabulary (can be extended):

**Evaluation signals:**
`overrated` `underrated` `sleeper` `obvious` `uncertain` `archetype-only`

**Card characteristics:**
`removal` `tempo` `card-advantage` `finisher` `enabler` `synergy` `filler` `build-around`

**Format reads:**
`format-dependent` `sideboard` `slow-format` `aggressive-format`

- [ ] Add `tags` array field to grade object (string array)
- [ ] Update Supabase schema: `tags text[]` column on grades table
- [ ] Update backup/restore and CSV export to include tags

### 2.2 Tag UI — Mobile

- [ ] In mobile expanded card view, add a tag chip row below the notes input
- [ ] Chips are scrollable horizontally; tapped chips toggle on/off (filled vs outline)
- [ ] Active tags shown as filled gold chips; inactive as dimmer outlines
- [ ] 44px min touch target per chip

### 2.3 Tag UI — Desktop

- [ ] Add a tag cell to the desktop table (right of Notes, or combined)
- [ ] Clicking the tag cell opens an inline chip picker
- [ ] Active tags shown as small colored badges in the cell when collapsed

### 2.4 Tag Filtering

- [ ] Add tag filter to desktop filter bar: multi-select dropdown "Tags: any of..."
- [ ] Add tag filter to mobile ⚙ drawer: same chip UI as entry
- [ ] "Any of" semantics: show cards with at least one of the selected tags

---

## Phase 3 — Visual Enhancements (Medium Priority)

### 3.1 Mana Symbol Rendering

**Problem:** Mana costs display as raw text strings (`{2}{W}{U}`) instead of the actual symbols.

- [ ] Fetch mana symbol SVGs from Scryfall: `https://api.scryfall.com/symbology`
- [ ] Cache the symbol map in memory on app load (one fetch per session)
- [ ] Write a `renderMana(costString)` helper that parses `{X}` tokens and outputs `<img>` tags referencing Scryfall SVG URLs
- [ ] Apply to the Cost column on desktop
- [ ] Apply to the mana cost in the mobile card meta row
- [ ] Fallback to text string if symbol not found in map

### 3.2 Desktop Card Lightbox

**Problem:** Hovering shows a small card preview but there's no way to read card text clearly on desktop.

- [ ] Clicking any table row opens a lightbox overlay (not the hover preview — a deliberate click)
- [ ] Lightbox: dark semi-transparent backdrop, card image centered at ~400px width
- [ ] Card name, mana cost, type line, and oracle text displayed alongside the image
- [ ] Current grades for that card (My Grade, Expert, Performance, Sunset, notes, tags) shown in a panel to the right of the image
- [ ] Grades editable inline from the lightbox — changes persist immediately
- [ ] Close via Escape key, clicking backdrop, or an explicit close button
- [ ] Lightbox is keyboard navigable: left/right arrow moves to adjacent card in current sort order

### 3.3 Source Badge Refinement

- [ ] Replace generic `17L` badge with source-specific labels: `17L` | `AH` (AetherHub) | `MAN` (manual)
- [ ] Badge color varies by source: gold (17L), blue (AH), dimmer (manual)
- [ ] Tooltip on badge shows full source name, format, import date

---

## Phase 4 — Analytics View (High Value, Later)

**Goal:** End-of-season insight built into the app rather than requiring a separate Python notebook.

The Analytics tab activates automatically when a set has My Grade populated for ≥ 50% of cards and at least one community rating source imported.

### 4.1 Calibration Chart

- [ ] Histogram: distribution of My Grade vs Performance rating across the set
- [ ] Shows systematic bias — are you consistently grading higher or lower than outcomes?
- [ ] Breakdown by color and rarity

### 4.2 Core Scatter Plot

- [ ] X-axis: Performance rating (17Lands normalized)
- [ ] Y-axis: My Grade (converted to numeric: A+=5.0, A=4.67, A-=4.33 ... F=0)
- [ ] One dot per card, colored by MTG color identity
- [ ] Dot size by rarity (mythic largest)
- [ ] Quadrant lines drawn at the mean of each axis
- [ ] Hovering a dot shows card name and both values
- [ ] Clicking a dot opens the card lightbox

### 4.3 Quadrant Summary

- [ ] Count and list cards in each quadrant (FORMAT / MISS / SPOT / VAR)
- [ ] Expandable per-quadrant card list
- [ ] Tag correlation per quadrant: "Cards tagged [sleeper] appeared in SPOT quadrant 60% of the time"

### 4.4 Sunset Grade Retrospective

- [ ] Delta between My Grade and Sunset Grade per card
- [ ] List cards with largest initial-to-sunset swing, sorted by magnitude
- [ ] Correlation with notes/tags: did uncertainty tags predict larger swings?

### 4.5 Tag Accuracy

- [ ] For each tag, show average accuracy (My Grade vs Performance delta) across tagged cards
- [ ] Reveals whether your evaluation signals are well-calibrated
- [ ] E.g. "Cards tagged [sleeper]: average 0.8 grade above performance" → you're finding real sleepers

### 4.6 Cross-Set Tracking (Multi-Set)

- [ ] Aggregate the above metrics across all sets with sufficient data
- [ ] Color bias: are you consistently more/less accurate in specific colors?
- [ ] Rarity bias: systematic over/underrating at a rarity tier?
- [ ] Trend line: is your calibration improving set over set?

### 4.7 Implementation Notes

- [ ] Use a lightweight charting library already available via CDN (Recharts preferred, already listed in artifact dependencies)
- [ ] Charts render client-side from the grade data already in memory
- [ ] Analytics tab is a new top-level view, toggled from the header alongside the set picker
- [ ] No additional API calls required — all data is local

---

## Phase 5 — Additional Community Sources (Lower Priority)

### 5.1 MTGA Personal Data

If the user plays on Arena with the 17Lands tracker installed:

- [ ] 17Lands personal card stats endpoint (requires user token from 17Lands account)
- [ ] Imports personal GIH WR rather than aggregate community data
- [ ] Stored separately from community performance rating as `personal_performance_rating`
- [ ] Most actionable signal: cards you consistently drafted but underperformed in your hands

### 5.2 Draftsim Integration

- [ ] Investigate Draftsim internal JSON endpoint via DevTools network tab
- [ ] If accessible: add to Python script suite as `draftsim-prep.py`
- [ ] Dan's ratings update dynamically through the format — a useful mid-season check

### 5.3 Additional AetherHub Scraper Robustness

- [ ] The browser console script (`aetherhub-scrape.js`) uses heuristic DOM walking that may break if AetherHub changes layout
- [ ] Add a fallback strategy: if DOM walk yields < 10 results, try parsing JSON-LD structured data embedded in the page
- [ ] Add a version check: log the number of cards found and warn if significantly below the set size

### 5.4 Restore from CSV Export

**Currently:** only JSON backup can be restored into the app.  
**Goal:** a previously exported grades CSV can also be reimported to restore grades (without community ratings or metadata).

- [ ] Parse the CSV export format on import
- [ ] Map card names back to Scryfall card IDs using the currently loaded set
- [ ] Restore: My Grade, Sunset Grade, Notes (community ratings not in CSV — use JSON backup for those)
- [ ] Warn user if set is not loaded before attempting CSV restore

---

## Phase 6 — Native App (Future)

This phase converts the GitHub Pages web app into a native mobile app using Capacitor.

### Prerequisites
- Phases 1–4 complete and stable
- Supabase sync working reliably across devices via GitHub Pages
- Apple Developer account ($99/yr) for iOS distribution

### 6.1 Capacitor Setup

```bash
npm init @capacitor/app draft-lab-native
cd draft-lab-native
# Copy built draft-lab.html into www/index.html
npx cap add ios
npx cap add android
npx cap sync
```

### 6.2 Platform-Specific Work

- [ ] Replace FileReader CSV import with Capacitor Filesystem plugin (required for iOS)
- [ ] Configure app icon and splash screen (use existing Draft Lab gold/dark aesthetic)
- [ ] Configure deep linking for Supabase OAuth redirect
- [ ] Test offline → online sync flow on device
- [ ] Android: generate signed APK for sideloading
- [ ] iOS: configure TestFlight for distribution to up to 100 devices

### 6.3 Distribution

- **Android:** signed APK distributed via Google Drive or direct download. No Play Store required.
- **iOS:** TestFlight (requires Apple Developer account). Reviewer-free for up to 100 testers.
- **Desktop:** browser shortcut to GitHub Pages URL remains the primary desktop experience. Electron wrapper only if a specific gap requires it.

---

## Polish Queue

Small items confirmed during testing, to be addressed before or alongside the next phase:

- [x] **D+ missing from grade dropdown** — `GRADES` array only has `D`, missing the `D+` half-grade. Fixed in polish round 1.
- [x] **Δ column label verbosity** — replaced verbose text labels with compact 2-char row IDs (ME/MP/EP) and a single colored directional symbol (≈/▲/▼). Hover tooltip shows full label + delta value. Fixed in polish round 1.
- [ ] **Double-faced card (DFC) image flip** — DFCs (e.g. transform cards, modal DFCs) have two faces in Scryfall's `card_faces` array. Currently only the front face image is shown. Need a flip control to view the back face. Complexity: the mobile "tap to enlarge" and desktop hover preview both need separate flip affordances without conflicting with existing tap/click behavior. Suggested approach: a small ↻ button overlaid on the card image in both the mobile expanded view and the desktop lightbox (Phase 3.2). Low priority until lightbox is built since desktop hover is passive.

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| `localStorage` cleared on browser restart when opening via `file://` | Workaround: serve via `python -m http.server 8080` or use GitHub Pages URL | Resolved permanently by Supabase sync |
| AetherHub scraper uses heuristic DOM walk — may break on layout changes | Open | See Phase 5.3 |
| 17Lands game data files are 300–600MB — slow on poor connections | By design | Script supports pre-downloaded local files |
| Mobile Safari has inconsistent PWA localStorage persistence | Open | Resolved by Supabase sync |

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

- The compiled `draft-lab.html` contains pre-compiled JavaScript — **do not edit the JS directly**. Edit the JSX source and recompile via the Babel Node script.
- After any change to JSX source: `node compile.js` (or equivalent) → verify output opens cleanly in Chrome before committing.
- Run `python -m http.server 8080` in the project directory for local testing — opens at `http://localhost:8080/draft-lab.html`.
- Supabase schema changes require a migration SQL file committed to the repo alongside the app change.
- All new grade object fields must be handled in: `updateGrade`, `persistGrades`, `loadGrades`, `exportBackup`, `importBackup`, `exportCSV`, and the Supabase sync adapter.
- The mobile ⚙ drawer and desktop header must both expose any new import/action controls.
- Test the responsive breakpoint at exactly 767px — controls must not overlap or clip at that width.

---

*Draft Lab is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved or endorsed by Wizards of the Coast. ©Wizards of the Coast LLC. Card data via Scryfall. Performance data via 17Lands public datasets.*
