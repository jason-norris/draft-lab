# Draft Lab — Phase 5: Pick-by-Pick Signal Review
> Design document for Claude Code implementation.
> Context: Draft Lab is a single-file React UMD app. Edit `apps/web/src/DraftLab.jsx` → `node compile.js` → commit both files. Never edit `index.html` directly.
>
> **Prerequisites:** The god component refactor described in `refactor-god-component.md` must be complete before starting Phase 5. `DraftView` and `DraftReviewView` are top-level sub-components in the refactored tree — they cannot be safely added to the pre-refactor god component.

---

## Goal

Build a draft simulator with a post-draft pick review system focused on signal reading feedback. The primary user problem is not knowing whether they correctly read what was open at the table — this feature gives structured, data-driven feedback on each pick decision.

Signal reading breaks into two sub-problems:
- **Table signals** — what neighboring drafters are taking, inferred from what wheels and what doesn't
- **Internal signals** — recognizing when your own pool is telling you to commit to an archetype

The pick review should help the user identify which of these is their specific weakness.

---

## Component Architecture

Phase 5 adds two new top-level sub-components to the refactored `DraftLab.jsx`. These slot directly into the view router in `DraftLab` alongside the existing `GradingView` and `AnalyticsView`:

```js
// In DraftLab's return:
{currentView === 'grading'  && <GradingView />}
{currentView === 'analytics' && <AnalyticsView />}
{currentView === 'draft'    && <DraftView />}      // ← Phase 5
{currentView === 'review'   && <DraftReviewView />} // ← Phase 5
```

### `DraftView`

Owns the active draft session state. Mounts when the user starts a new draft, unmounts when they leave. All draft state is local to this component — it does not touch grading or analytics state.

```
DraftView
├── PackDisplay       ← current pack cards, pick interface
├── PoolDisplay       ← cards drafted so far, organized by color
└── BotStatus         ← (optional) visual indicator of bot picks
```

**State owned by `DraftView`:**
```js
const [draftSession, setDraftSession] = useState(null);   // session metadata
const [currentPack, setCurrentPack] = useState([]);        // cards in current pack
const [pool, setPool] = useState([]);                      // user's drafted cards
const [picks, setPicks] = useState([]);                    // pick sequence so far
const [draftPhase, setDraftPhase] = useState('idle');      // 'idle' | 'picking' | 'building' | 'complete'
const [packNumber, setPackNumber] = useState(1);
const [pickNumber, setPickNumber] = useState(1);
```

**Reads from `GradesContext`:** card data (`cards`) and grades (`grades`) — used to display your grade and community grades on each card in the pack during the draft.

**Writes to Supabase:** `draft_sessions` and `draft_picks` tables (see schema below).

### `DraftReviewView`

Owns review UI state only. All feedback logic is derived at render time from the stored pick data — no additional state needed beyond what picks it loads from Supabase and which row is expanded.

```
DraftReviewView
├── SessionList       ← past drafts, summary badges
└── PickReview        ← per-draft pick-by-pick breakdown
    ├── SummaryPanel  ← signal accuracy totals, archetype, colors
    └── PickRow       ← one row per pick, expandable detail
```

**State owned by `DraftReviewView`:**
```js
const [sessions, setSessions] = useState([]);          // list of past draft sessions
const [activePicks, setActivePicks] = useState([]);    // picks for selected session
const [expandedPick, setExpandedPick] = useState(null);
```

**Reads from `GradesContext`:** not required — pick data is self-contained (grades were snapshotted at draft time). May optionally read current grades for a "your grade then vs. now" comparison feature in the future.

### Navigation

Add `draft` and `review` as valid `currentView` values in `DraftLab`. The top-level nav (header or mobile drawer) should expose:
- **Grade** → `grading`
- **Analytics** → `analytics`
- **Draft** → `draft`
- **History** → `review`

Both `DraftView` and `DraftReviewView` must be reachable from the mobile ⚙ drawer before being added to the desktop header, per the mobile-first convention in `CLAUDE.md`.

---

## Supabase Schema

Three new tables. Add these to Supabase via the dashboard or migration files in `supabase/migrations/`.

### `draft_sessions`

Stores one row per completed draft.

```sql
create table draft_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  set_code text not null,                        -- e.g. "TLA"
  format text not null default 'PremierDraft',   -- PremierDraft | TradDraft
  started_at timestamptz not null default now(),
  completed_at timestamptz,                       -- null = draft in progress
  pool jsonb not null default '[]',              -- final 45-card pool (card objects)
  deck jsonb not null default '[]',              -- final 40-card deck after build
  created_at timestamptz not null default now()
);

alter table draft_sessions enable row level security;
create policy "Users see own sessions" on draft_sessions
  for all using (auth.uid() = user_id);
```

### `draft_picks`

Stores one row per pick (45 rows per draft session).

```sql
create table draft_picks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references draft_sessions(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  pack_number int not null,          -- 1, 2, or 3
  pick_number int not null,          -- 1–15 within the pack
  pick_global int not null,          -- 1–45 across the full draft
  pack_contents jsonb not null,      -- array of card objects available in the pack
  picked_card jsonb not null,        -- the card object the user chose
  pool_at_pick jsonb not null,       -- user's pool state at moment of pick (before this pick)
  created_at timestamptz not null default now()
);

alter table draft_picks enable row level security;
create policy "Users see own picks" on draft_picks
  for all using (auth.uid() = user_id);
```

**Card object shape** (used in `pack_contents`, `picked_card`, `pool_at_pick`):

```json
{
  "id": "scryfall-uuid",
  "name": "Card Name",
  "color_identity": ["W", "U"],
  "rarity": "rare",
  "mana_cost": "{2}{W}",
  "my_grade": "B+",
  "expert_grade": "A-",
  "performance_grade": "B",
  "alsa": 4.2,
  "ata": 5.1,
  "gih_wr": 57.3,
  "tags": ["Removal", "Tempo"]
}
```

> **Note:** Snapshot grades and 17L metrics at the time of the draft. Don't rely on live lookups during review — the user's grades or imported data may change after the draft is saved.

### `draft_decks`

Stores the final deck build separately from the pool for easier querying.

```sql
create table draft_decks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references draft_sessions(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  cards jsonb not null,              -- array of card objects in the maindeck
  sideboard jsonb not null,         -- remaining pool cards not in maindeck
  colors text[] not null,           -- e.g. ["W", "U"]
  archetype text,                   -- e.g. "WU Tempo" — user-assigned or derived
  created_at timestamptz not null default now()
);

alter table draft_decks enable row level security;
create policy "Users see own decks" on draft_decks
  for all using (auth.uid() = user_id);
```

---

## 17Lands Data Extension

The existing `17lands-prep.py` script currently pulls GIH Win Rate. Extend it to also capture:

| Column | Use in Pick Review |
|---|---|
| `ALSA` | Average Last Seen At — where the card typically tables; used to evaluate whether a pass was correct |
| `ATA` | Average Taken At — community pick position; compare to the user's pick position |
| `OH WR` | Opening Hand Win Rate — evaluates curve and card quality in context |

These columns should be added to the existing CSV format and mapped into the card object shape above when importing 17Lands data. All existing import logic (ImportPanel, source badges, flush controls) should continue to work unchanged.

---

## Pick Review Logic

The review is computed post-draft from the `draft_picks` rows for a session. No additional data storage needed — everything is derived at render time.

### For each pick, compute:

**1. Pool fit score**
Compare `picked_card.color_identity` against the colors most represented in `pool_at_pick`. A pick that pulls away from the established pool colors is a potential signal error — flag it for review if it occurs after pick 6 of pack 1.

**2. Pass evaluation**
For each card in `pack_contents` that was NOT picked:
- Was it a card in the user's eventual deck colors?
- What is its `alsa`? If `alsa < pick_number`, passing was likely correct (expected to come back). If `alsa >= pick_number + 2`, the user may have expected it to wheel when it statistically wouldn't.
- Did it actually come back (appear in a later pick's `pack_contents`)? This requires scanning subsequent picks in the same pack.

**3. Wheel check** (start of packs 2 and 3)
At pick 16 (P2P1) and pick 31 (P3P1), identify which cards from the user's primary colors came back from the previous pack. A high-grade card in the user's colors that wheeled means that color was open.

**4. Pivot point detection**
Scan picks 3–8 of pack 1 for the first pick where the user's pool has a clear color lean (≥3 cards in one color) but the picked card is off-color. Flag this as the signal moment if it contributed to a multicolor or unfocused pool.

### Classification labels per pick:

| Label | Condition |
|---|---|
| `✓ Clean` | Pick matches pool colors, no high-grade cards left behind |
| `⚠ Off-color` | Pick diverges from established pool after pick 6 |
| `⚠ Risky pass` | Passed card has `alsa` suggesting it wouldn't wheel; verify against actual wheel data |
| `✓ Correct pass` | Passed card wheeled as expected given its `alsa` |
| `🔍 Review` | Passed card went within 2 picks; may have been more valuable than assessed |

---

## Pick Review UI

### Entry point

Add a **Draft History** section to the app (alongside the existing set picker). List completed draft sessions by set, date, and a summary badge (e.g. "14 clean · 3 review").

### Review view layout

Each pick rendered as a compact row:

```
P1P4  ✓  Took: Skywatcher Adept (B+)
          Passed: Drag to the Bottom (A-) · Reef Watcher (C+)
          Drag to the Bottom went P1P6 — 2 picks later  ⚠

P1P7  ✓  Took: Mistral Charger (B)
          Passed: Thornback Reef (B-) · Silt Strider (C)
          Thornback Reef wheeled (P1P13) — ALSA 8.4, correctly read as open  ✓

P2P1  🔄 Wheel check: Skywatcher Adept came back — UW was open  ✓
```

**Interaction:**
- Click any pick row to expand a full detail view: card images (via Scryfall), all pack contents with grades, pool at that moment, and the feedback narrative
- Rows default to collapsed; only `⚠` and `🔍` rows auto-expand on first load
- Keyboard navigation (arrow keys) through picks, consistent with existing lightbox pattern

### Summary panel (top of review)

```
Draft Summary — TLA Premier Draft — May 14
Colors: WU  |  Archetype: WU Tempo
Pool: 45 cards  |  Deck: 23 cards

Signal Accuracy
  Clean picks      31 / 45
  Review picks      8 / 45   ← expand to list
  Off-color picks   4 / 45
  Correct passes   28 / 37 non-taken cards with ALSA data
```

---

## Archetype Fingerprinting

After deck build, derive the archetype from the final deck:

1. **Colors** — the two most represented colors in `cards[].color_identity`
2. **Role distribution** — count cards by tag group (Aggro / Control / Tempo / Removal / Finisher etc.) using the existing `TAGS` constant
3. **Known archetype norms** — hardcode a `SET_ARCHETYPES` constant per set (can be seeded from 17Lands archetype win rate data) with expected role counts and win rates

```js
const SET_ARCHETYPES = {
  TLA: {
    "WU": { name: "WU Tempo", win_rate: 55.2, norms: { Removal: [3,5], Finisher: [2,4], Tempo: [4,7] } },
    "WB": { name: "WB Midrange", win_rate: 53.1, norms: { Removal: [4,6], Finisher: [3,5] } },
    // ...
  }
};
```

Post-build feedback example:
> "Your deck looks like **WU Tempo** (55.2% win rate this season). You have 2 Removal spells — this archetype typically wants 4–5. You passed [card name] in P1P8 that is a top-10 WU Tempo card."

---

## Implementation Order

Recommended sequence to avoid getting blocked:

0. **Refactor** — complete `refactor-god-component.md` in full. `DraftView` and `DraftReviewView` must have clean homes in the component tree before any Phase 5 code is written.
1. **Schema** — create the three Supabase tables.
2. **17Lands script extension** — add ALSA, ATA, OH WR columns to `17lands-prep.py` and update the card import pipeline.
3. **Draft simulator** — pack generation, bot picks, user pick flow, session persistence. `DraftView` is the home for all of this.
4. **Pick review logic** — pass evaluation, wheel check, pivot detection (computed at render time from stored picks). Lives in `DraftReviewView`.
5. **Pick review UI** — history list, per-pick rows, expand detail, summary panel. All within `DraftReviewView` and its sub-components.
6. **Archetype fingerprinting** — `SET_ARCHETYPES` constant, deck build feedback.

Do not start step 4 or 5 until step 3 is storing complete pick data correctly. The review is only as good as the data captured during the draft.

---

## Constraints and Conventions to Follow

- **The god component refactor must be complete first.** `DraftView` and `DraftReviewView` are designed as peer sub-components to `GradingView` and `AnalyticsView` in the refactored tree. Do not attempt to add them to the pre-refactor god component.
- `DraftView` and `DraftReviewView` must follow the same sub-component pattern established during the refactor — named functions defined above `DraftLab`, local state via `useState`/`useReducer`, shared data via `useGrades()` context hook.
- Follow all patterns in `CLAUDE.md` — build workflow, TDZ rule, click-outside pattern, iOS font-size minimum.
- All new state goes through `useState` declared before any `useEffect` in every component.
- Mobile ⚙ drawer must expose `draft` and `review` navigation before they appear in the desktop header.
- New Supabase queries follow the existing `supabase.from(...).upsert(...)` pattern with RLS via `auth.uid()`.
- Card objects in the new tables must snapshot grades and 17L metrics at draft time — do not re-fetch live from context; copy values at the moment the pick is recorded.
- `SET_ARCHETYPES` should be a top-level constant in `DraftLab.jsx`, same pattern as `TAGS` and `GRADE_NUMERIC`.
- Backward compatibility: existing JSON backups must not be affected by any schema additions.

---

## Open Questions to Resolve Before Implementation

1. **Bot behavior** — how should bot picks work? Options: (a) pure ALSA/ATA-based picks, (b) color-committed bots that simulate a realistic table, (c) random within a grade threshold. The signal reading feedback is most useful with option (b) since it creates realistic wheel patterns.

2. **Pack generation** — use Scryfall bulk data to generate packs by rarity slot, or use a fixed card list per set? Scryfall is simpler but won't match exact set collation rules.

3. **Session in progress** — should an incomplete draft be resumable, or abandoned on close? Resumable requires more state management; abandoned-on-close is simpler for v1.

4. **Review surface** — the refactored component tree resolves this: `DraftReviewView` is a full top-level view (same level as `GradingView` and `AnalyticsView`), not a modal. This gives it the full viewport for the summary panel and pick list, and keeps the view routing pattern consistent. Individual pick detail expands inline within the pick list rather than opening a sub-modal.
