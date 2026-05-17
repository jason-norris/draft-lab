# Draft Lab — God Component Refactor
> Design document for Claude Code implementation.
> Context: `DraftLab.jsx` is a single React UMD file (~1300+ lines after Phase 4). No bundler. Everything compiles to `index.html` via `node compile.js`. The refactor must happen entirely within `DraftLab.jsx` — no separate file imports.

---

## Why This Must Happen Before Phase 5

Phase 5 (draft simulator + pick review) introduces a fundamentally different interaction model — a stateful, multi-step flow with its own data (sessions, packs, pools, pick sequences, bot state) that has nothing to do with the grading table. Adding that to the current god component would:

- Push the file past ~2,000 lines with ~50+ useState hooks
- Make it impossible to reason about which state changes affect which UI surfaces
- Create render performance problems as draft state changes trigger re-renders of the entire grading table
- Make future debugging extremely difficult — a bug in draft bot logic would be surrounded by filter and import code

Phase 4 (Analytics) was survivable as a god component addition because it's mostly read-only — it derives from grades and renders charts. Phase 5 is not survivable that way. It has its own write path, its own Supabase tables, and its own complex state machine.

**Do the refactor first. Do not start Phase 5 implementation until it is complete.**

---

## The Core Constraint: React UMD, One File

There are no module imports. You cannot split into separate `.jsx` files. What you *can* do — and what this refactor is entirely about — is:

1. **Define named sub-components** as plain functions within `DraftLab.jsx`, above the main `DraftLab` function
2. **Use `React.createContext`** to share state without prop drilling
3. **Use `useReducer`** to consolidate related state that changes together

This is standard React — it just all lives in one file. The file stays large in line count but becomes dramatically easier to reason about because each function has a clear, bounded responsibility.

---

## Target Component Tree

```
DraftLab                          ← top-level orchestrator only
│   auth, theme, current view,
│   set list, active set code
│
├── GradesContext.Provider        ← shared grades data, no prop drilling
│
├── GradingView                   ← owns all grading-related local state
│   ├── FilterBar                 ← color/rarity/grade/quadrant/tag filters
│   ├── GradeTable                ← the main card rows
│   │   ├── GradeRow              ← single card row (desktop)
│   │   └── CardLightbox          ← full overlay, keyboard nav
│   ├── ImportPanel               ← unified import drawer
│   └── MobileDrawer              ← ⚙ drawer, all mobile controls
│
├── AnalyticsView                 ← owns analytics local state (just built)
│   ├── CalibrationChart
│   ├── ScatterPlot
│   ├── QuadrantSummary
│   └── SunsetRetrospective
│
├── DraftView                     ← Phase 5, owns draft session state
│   ├── PackDisplay
│   ├── PoolDisplay
│   └── BotStatus
│
└── DraftReviewView               ← Phase 5, owns review UI state
    ├── SessionList
    └── PickReview
        ├── PickRow
        └── PickDetail
```

---

## State Ownership Map

This is the most important part of the refactor. Every piece of state gets assigned to exactly one owner. If two components need the same state, it lifts to their common ancestor or goes into context.

### Stays in `DraftLab` (true app-level state)

```js
const [user, setUser] = useState(null);               // auth
const [theme, setTheme] = useState('dark');            // global theme
const [currentView, setCurrentView] = useState('grading'); // 'grading' | 'analytics' | 'draft' | 'review'
const [sets, setSets] = useState([]);                  // Scryfall set list
const [activeSetCode, setActiveSetCode] = useState(''); // which set is loaded
```

### Goes into `GradesContext` (shared between Grading and Analytics)

```js
// Provided via context, consumed by GradingView and AnalyticsView
{
  grades,          // the full grades object for the active set
  updateGrade,     // (cardId, field, value) => void
  cards,           // Scryfall card data for the active set
  importMeta,      // expert/performance import metadata
  setImportMeta,
}
```

Both `GradingView` and `AnalyticsView` read grades. Only `GradingView` writes them (via `updateGrade`). `AnalyticsView` is read-only — this makes it easy to reason about.

### Moves into `GradingView` (local to grading)

```js
const [filterColor, setFilterColor] = useState([]);
const [filterRarity, setFilterRarity] = useState([]);
const [filterGraded, setFilterGraded] = useState('all');
const [filterQuadrant, setFilterQuadrant] = useState('all');
const [filterTags, setFilterTags] = useState([]);
const [sortCol, setSortCol] = useState('name');
const [sortDir, setSortDir] = useState('asc');
const [lightboxCard, setLightboxCard] = useState(null);
const [lightboxIndex, setLightboxIndex] = useState(null);
const [importPanelOpen, setImportPanelOpen] = useState(false);
const [drawerOpen, setDrawerOpen] = useState(false);
const [hoverCard, setHoverCard] = useState(null);
```

None of this is needed outside the grading surface. `AnalyticsView` and `DraftView` don't care what the current filter state is.

### Moves into `AnalyticsView` (local to analytics)

```js
const [activeChart, setActiveChart] = useState('scatter');
const [analyticsColor, setAnalyticsColor] = useState('all');
// ...any other analytics-specific filter/display state
```

### Will live in `DraftView` (Phase 5, not yet built)

```js
const [draftSession, setDraftSession] = useState(null);
const [currentPack, setCurrentPack] = useState([]);
const [pool, setPool] = useState([]);
const [picks, setPicks] = useState([]);
const [draftPhase, setDraftPhase] = useState('idle'); // 'idle' | 'picking' | 'building' | 'complete'
// bot state, etc.
```

This state is completely isolated. It will never need to touch `filterColor` or `lightboxCard`.

---

## The `GradesContext` Pattern

Create context above the `DraftLab` function, near the other top-level constants (`GRADES`, `TAGS`, etc.):

```js
const GradesContext = React.createContext(null);

// Convenience hook for consumers
function useGrades() {
  return React.useContext(GradesContext);
}
```

In `DraftLab`, provide it:

```js
function DraftLab() {
  // ... app-level state only ...
  const [grades, setGrades] = useState({});
  
  const updateGrade = React.useCallback((cardId, field, value) => {
    // existing updateGrade logic
  }, [grades, activeSetCode, user]);

  const gradesContextValue = React.useMemo(() => ({
    grades,
    updateGrade,
    cards,
    importMeta,
    setImportMeta,
  }), [grades, updateGrade, cards, importMeta]);

  return (
    <GradesContext.Provider value={gradesContextValue}>
      {currentView === 'grading' && <GradingView />}
      {currentView === 'analytics' && <AnalyticsView />}
      {currentView === 'draft' && <DraftView />}
      {currentView === 'review' && <DraftReviewView />}
    </GradesContext.Provider>
  );
}
```

`GradingView` and `AnalyticsView` call `useGrades()` internally — no props needed for grades data.

---

## useReducer for Complex Local State

`GradingView` currently has ~8 filter-related `useState` calls that always change together (e.g. clearing all filters resets all of them). Consolidate with `useReducer`:

```js
const filterInitialState = {
  color: [],
  rarity: [],
  graded: 'all',
  quadrant: 'all',
  tags: [],
  sortCol: 'name',
  sortDir: 'asc',
};

function filterReducer(state, action) {
  switch (action.type) {
    case 'SET_COLOR': return { ...state, color: action.value };
    case 'SET_RARITY': return { ...state, rarity: action.value };
    case 'SET_QUADRANT': return { ...state, quadrant: action.value };
    case 'SET_TAGS': return { ...state, tags: action.value };
    case 'SET_SORT': return { ...state, sortCol: action.col, sortDir: action.dir };
    case 'RESET': return filterInitialState;
    default: return state;
  }
}

// Inside GradingView:
const [filters, dispatchFilter] = useReducer(filterReducer, filterInitialState);
```

This also makes session state persistence (saving filters per set to localStorage) much cleaner — serialize and restore the entire `filterInitialState` shape in one operation.

---

## Performance Fixes to Include in the Same Pass

Do these during the refactor, not as a separate PR. They're low-risk and high-value:

**1. `useMemo` for sorted/filtered card list**

```js
// Inside GradingView
const visibleCards = React.useMemo(() => {
  return cards
    .filter(card => applyFilters(card, grades[card.id], filters))
    .sort((a, b) => applySort(a, b, grades, filters.sortCol, filters.sortDir));
}, [cards, grades, filters]);
```

Currently this recomputes on every render. On a 300-card set with complex filters this is a real cost.

**2. Debounce Supabase sync on notes input**

```js
// Inside GradingView or GradeRow
const debouncedPersist = React.useCallback(
  debounce((cardId, field, value) => {
    persistGrades(/* ... */);
  }, 450),
  [user, activeSetCode]
);
```

Define a simple `debounce` utility near the top of the file (no library needed — 8 lines of vanilla JS). Every keystroke in a notes field currently fires a Supabase upsert. This is the most likely source of subtle sync bugs on slow connections.

---

## Migration Order

**Critical rule: the app must compile and run correctly after every step.** Never leave the file in a broken intermediate state. Test in Chrome after each step before moving to the next.

### Step 1 — Extract utilities and pure functions (zero risk)

Move these out of the `DraftLab` function body and place them above it as standalone functions:
- `applyFilters(card, grade, filters)` 
- `applySort(a, b, grades, col, dir)`
- `computeQuadrant(myGrade, expertGrade, perfGrade)`
- `renderMana(costString)`
- `debounce(fn, ms)` — add this utility

Nothing changes in behavior. These are pure functions with no state dependencies.

### Step 2 — Create `GradesContext` and migrate grades state into it

- Add `GradesContext` and `useGrades()` above `DraftLab`
- Wrap the return of `DraftLab` in `GradesContext.Provider`
- Move `grades`, `setGrades`, `updateGrade`, `cards`, `importMeta` into the context value
- Update any direct references in the existing JSX to use `useGrades()` — at this stage everything is still in one function, so this is just a refactor of how values are accessed, not a structural change

**Test:** compile, load a set, grade a card, verify cloud sync works.

### Step 3 — Extract `AnalyticsView`

Analytics is the best first extraction because:
- It was just written so the boundaries are freshest in memory
- It's read-only (no `updateGrade` calls)
- It has its own clearly scoped local state

Create `function AnalyticsView() { ... }` above `DraftLab`. Move all analytics JSX and local state into it. It reads grades via `useGrades()`.

**Test:** compile, switch to analytics view, verify charts render with real data.

### Step 4 — Extract `FilterBar`

Create `function FilterBar({ filters, dispatch, cards, grades }) { ... }`. This is the desktop filter row — color pills, rarity buttons, graded toggle, quadrant picker, tags dropdown.

Simultaneously introduce the `filterReducer` pattern in the parent so `FilterBar` receives `dispatch` instead of individual setters.

**Test:** compile, verify all filter combinations work on desktop and mobile.

### Step 5 — Extract `ImportPanel`

Create `function ImportPanel({ open, onClose }) { ... }`. It reads `importMeta` from context and calls `updateGrade` via context. This is largely self-contained already.

**Test:** compile, run a full AetherHub import and a 17Lands import, verify source badges appear correctly.

### Step 6 — Extract `MobileDrawer`

Create `function MobileDrawer({ open, onClose, filters, dispatch }) { ... }`. It mirrors `FilterBar` controls for mobile. Should be straightforward after Step 4.

**Test:** compile, verify all ⚙ drawer controls work at 390px width in Chrome DevTools.

### Step 7 — Extract `CardLightbox`

Create `function CardLightbox({ card, cards, grades, onClose, onNavigate }) { ... }`. It reads grades via context for the editable fields, calls `updateGrade` via context.

**Test:** compile, verify lightbox opens, DFC flip works, keyboard nav works, editable fields sync to Supabase.

### Step 8 — Extract `GradeTable` and `GradeRow`

These are the highest-risk extractions because `GradeRow` has the most prop surface area. Do these last.

`GradeRow` needs: `card`, `grade`, `filters` (for highlight state), `onOpenLightbox`, and access to `updateGrade` via context.

**Test:** compile, grade several cards, verify delta indicators, quadrant badges, tag pickers, and hover preview all work correctly on desktop and mobile.

### Step 9 — Extract `GradingView`

By this point `GradingView` is mostly assembly — it composes `FilterBar`, `GradeTable`, `CardLightbox`, `ImportPanel`, `MobileDrawer` with the `filterReducer` state and the `visibleCards` memo. Extract it as `function GradingView() { ... }`.

**Test:** full smoke test — load set, filter, grade, import, export backup, restore backup, verify mobile layout.

### Step 10 — Add `useMemo` and debounce

Now that the components are clean, add the two performance fixes from the Polish Queue. These are safe to add at any step but easiest to verify correctness after the structure is clean.

---

## What `DraftLab` Looks Like After the Refactor

The main function should be dramatically slimmer — roughly:

```js
function DraftLab() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [currentView, setCurrentView] = useState('grading');
  const [sets, setSets] = useState([]);
  const [activeSetCode, setActiveSetCode] = useState('');
  const [grades, setGrades] = useState({});
  const [cards, setCards] = useState([]);
  const [importMeta, setImportMeta] = useState({});

  // auth effect
  useEffect(() => { /* supabase auth listener */ }, []);
  
  // set loading effect
  useEffect(() => { /* load cards when activeSetCode changes */ }, [activeSetCode]);

  // grades sync effect
  useEffect(() => { /* load grades from supabase */ }, [user, activeSetCode]);

  const updateGrade = useCallback(/* ... */, [grades, activeSetCode, user]);

  const gradesContextValue = useMemo(() => ({
    grades, updateGrade, cards, importMeta, setImportMeta
  }), [grades, updateGrade, cards, importMeta]);

  return (
    <GradesContext.Provider value={gradesContextValue}>
      <AppShell theme={theme} onToggleTheme={...} onSetChange={...} sets={sets} activeSetCode={activeSetCode} currentView={currentView} onViewChange={setCurrentView} user={user}>
        {currentView === 'grading' && <GradingView />}
        {currentView === 'analytics' && <AnalyticsView />}
        {currentView === 'draft' && <DraftView />}
        {currentView === 'review' && <DraftReviewView />}
      </AppShell>
    </GradesContext.Provider>
  );
}
```

The view routing is explicit. Phase 5 adds `DraftView` and `DraftReviewView` without touching `GradingView` or `AnalyticsView` at all.

---

## How This Sets Up Phase 5

With the refactor complete:

- `DraftView` is a new top-level sub-component with its own `useState` and `useEffect` hooks — no contamination of grading or analytics state
- `DraftView` can read card data and grades from `GradesContext` (it needs grades to display your assessments during the draft)
- `DraftReviewView` can also read from `GradesContext` for the same reason
- Adding 10 new `useState` hooks for draft state doesn't affect the grading table's render cycle at all
- The `currentView` switch in `DraftLab` means only one view is mounted at a time — React unmounts the others, so idle views have zero render cost

---

## Constraints and Conventions

- Follow all patterns in `CLAUDE.md` — TDZ rule is critical here: all `useState` and `useReducer` declarations must come before any `useEffect` in every component
- Every extracted component must handle its own click-outside listeners (use the `useRef + document.mousedown` pattern from `CLAUDE.md`)
- Mobile ⚙ drawer behavior must be verified at 390px after every extraction step
- The `VERSION` constant bump is not needed for this refactor — it's internal restructuring, not a user-facing change
- All existing JSON backups must continue to import correctly — the refactor touches no data logic, only component structure
- Do not introduce any new npm dependencies — this is a React UMD app

---

## Definition of Done

The refactor is complete when:

1. `DraftLab.jsx` compiles cleanly via `node compile.js`
2. All existing features work identically to pre-refactor (grades, imports, exports, filters, lightbox, analytics, mobile layout, cloud sync)
3. `DraftLab` function body contains only: auth state, theme state, view routing state, set/grades/cards state, context provision, and the top-level JSX shell
4. No grading-specific state (`filterColor`, `lightboxCard`, etc.) exists in `DraftLab`
5. `GradesContext` is the only mechanism for sharing grades between views — no prop drilling of grades through the view tree
6. `useMemo` wraps the visible card computation in `GradingView`
7. Supabase sync on notes input is debounced
