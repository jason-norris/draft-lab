# Draft Lab — Claude Code Context

This file is auto-loaded by Claude Code at the start of every session. It contains the critical conventions and workflows for this project.

---

## Build Workflow (CRITICAL)

**Never edit `apps/web/index.html` directly.** It is a generated file.

```
1. Edit   apps/web/src/DraftLab.jsx     ← JSX source (the only file you edit)
2. Build  cd apps/web && node compile.js ← regenerates index.html
3. Test   open apps/web/index.html in Chrome (runs in localStorage-only mode, no login)
4. Commit both src/DraftLab.jsx AND index.html
```

CSS and Supabase config live in `apps/web/template.html`. Edit that for styling changes or Supabase config — then recompile.

---

## Design Documents

See `docs/README.md` for the full index of planning and implementation specs.
Read the relevant spec before starting any phase. One phase at a time — do not
proceed past a phase's definition of done without explicit confirmation.

---

## Git Workflow

```
develop → feature branch for new work
feature branch → PR to develop (never commit directly to main)
develop → PR to main for production deploy
```

Use PowerShell (not Bash) for git commands. Here-string syntax for commit messages:
```powershell
git commit -m @'
Your commit message here.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

GitHub Actions runs `npm ci && node compile.js` automatically before each Pages deploy. Supabase secrets are injected at deploy time via `sed` — the source files contain `%%PLACEHOLDER%%` tokens.

---

## Supabase Branching — Revisit at Phase 5

The Supabase GitHub integration is connected and shows a PR check, but it is currently decorative — we have no migration files, so there is nothing for it to validate. Supabase branching (isolated DB per PR) is a paid feature and not worth enabling yet.

**At Phase 5 (draft simulator):** Three new tables (`draft_sessions`, `draft_picks`, `draft_decks`) will be added to Supabase. That is the right moment to:
1. Start tracking schema as migration files in `supabase/migrations/`
2. Commit migration files alongside code changes in the same PR
3. Evaluate whether Supabase branching is worth enabling (Pro plan ~$25/month)

Until then, the PR check can be ignored.

---

## Known Technical Debt

**`DraftLab` is a god component** (~1,300 lines, ~30 useState, ~10 useEffect). It works but will become a problem when Phase 5 (draft simulator) adds its own complex state. Plan a refactor pass between Phase 4 and Phase 5 — split into `GradeTable`, `FilterBar`, `MobileDrawer`, and `AnalyticsView` sub-components. See ROADMAP Polish Queue for the entry.

---

## Key Architecture

- **Single-file web app** — React UMD (no bundler), compiled from JSX via Babel
- **Supabase** — source of truth for grades; localStorage is offline cache only
- **Auth** — Google OAuth, invite-only (signups disabled in Supabase dashboard)
- **Multi-user** — RLS policy `auth.uid() = user_id` isolates each user's data
- **Version** — `const VERSION = "v2.3"` at top of DraftLab.jsx; bump manually on significant releases

## Important Constants in DraftLab.jsx

- `VERSION` — displayed in header and login screen
- `GRADES` — the full grade array including D+; order matters for sorting
- `GRADE_NUMERIC` — letter grade → numeric for delta math and analytics
- `TAGS` / `TAG_GROUPS` — the 11 structured tags in 3 groups
- `store` — thin wrapper around localStorage

---

## Common Patterns

**Click-outside for dropdowns** — use `useRef` + `document.mousedown` listener:
```javascript
const ref = useRef(null);
useEffect(() => {
  if (!open) return;
  const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, [open]);
```

**TDZ rule** — place all `useEffect` hooks AFTER all `useState` declarations. Dependency arrays that reference `const` variables declared later in the component will throw a ReferenceError at render time.

**iOS zoom** — all mobile `<input>` and `<select>` elements must have `font-size: 16px` minimum or iOS Safari will auto-zoom on focus. The mobile media query in `template.html` handles this with `!important`.

**Supabase MCP** — available for querying the project (read-only). Requires Claude Code restart + authentication after `.mcp.json` changes. Use to inspect `auth.users` and `draft_grades` tables for debugging.

---

## Roadmap Summary

| Phase | Status |
|-------|--------|
| 1 — Dual community ratings | ✅ Done |
| 2 — Structured tags | ✅ Done |
| 3 — Visual enhancements (lightbox, mana symbols) | ✅ Done |
| 4 — Analytics | 🔜 Next (waiting on TLA grading + data import) |
| 5 — Draft simulator | Future (design doc: `docs/phase-7-draft-ai.md`) |
| 6 — Additional community sources | Lower priority |
| 7 — Native app (Capacitor) | Final phase, most expensive |

Full details in `ROADMAP.md`. AI architecture for Phase 5 in `docs/phase-7-draft-ai.md`.

---

## Supabase Project

- **URL:** `https://wkzjwucjehztcpdycugc.supabase.co`
- **Table:** `draft_grades` (user_id, set_code, data jsonb) with RLS
- **Users:** Jason (owner) + family members (invited via Supabase dashboard)
- **Signups:** Disabled — add users via Dashboard → Authentication → Invite user

---

## Known Open Issues

See GitHub Issues at `https://github.com/jason-norris/draft-lab/issues` for active bugs.

Key items in the ROADMAP Polish Queue:
- Tags filter dropdown overflows right edge on desktop
- Set selector width inconsistency desktop vs mobile
- Delta cell hover indicator missing
