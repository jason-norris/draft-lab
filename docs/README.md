# Draft Lab — Docs Index
> Read this file first at the start of any implementation session.
> This index describes what each document is for, its current status, and when Claude Code should read it.

---

## Always Read First

| File | Purpose |
|---|---|
| `CLAUDE.md` | Build workflow, conventions, known gotchas. Read before touching any code. |
| `ROADMAP.md` | Phase structure and feature scope. Read to understand where the current task fits. |

---

## Implementation Specs
> These are active implementation documents. Read the relevant one at the start of each phase. Do not read ahead into later phases — scope your work to the current phase only.

| File | Phase | Status | Description |
|---|---|---|---|
| `docs/refactor-god-component.md` | 4.5 | 🔜 Next | Step-by-step refactor of `DraftLab.jsx` god component into sub-components. Follow the migration order exactly — compile and test after every step. Do not begin Phase 5.1 until all definition-of-done criteria are met. |
| `docs/phase-5-1-data-foundation.md` | 5.1 | 🔜 After 4.5 | Introduces the `context` field (game state ratings), migrates STX legacy Q-notation data, and formalizes tag and notes usage standards. Do not begin Phase 5.2 until all definition-of-done criteria are met. |
| `docs/phase-5-signal-review.md` | 5.2 | 🔜 After 5.1 | Draft simulator, pick-by-pick signal review, Supabase schema, bot architecture, and pick review UI. Read alongside the AI architecture doc below. |

---

## Reference and Architecture Docs
> These docs provide rationale, architecture decisions, and background context. Read them when the implementation spec references them or when you need to understand *why* a decision was made. Do not treat these as implementation checklists.

| File | Description |
|---|---|
| `docs/phase-7-draft-ai.md` | Draft bot AI architecture — four-layer system (card value function, belief state model, mistake injection, optional LLM). Read when implementing bot behavior in Phase 5.2. Note: internally references "Phase 7" — this is now Phase 5. The architecture is unchanged. |
| `docs/draft-ai-planning-addendum.md` | Connects the pick review design to the AI architecture. Explains how ALSA data feeds Layer 2, how the signal problem maps to the mistake taxonomy, and how Layer 4 LLM extends to post-draft feedback. Background reading, not an implementation checklist. |

---

## Document Status Key

| Symbol | Meaning |
|---|---|
| ✅ | Complete |
| 🔜 | Upcoming — do not implement until the preceding phase is done |
| 🚧 | In progress |
| 📋 | Reference only |

---

## Implementation Session Checklist

At the start of every Claude Code session:

1. Read `CLAUDE.md` in full
2. Read `ROADMAP.md` to confirm the current phase
3. Read the implementation spec for the current phase only
4. Confirm the scope with the user before writing any code
5. Do not proceed past the current phase's definition of done without explicit confirmation

**One phase. One spec. Confirm before moving on.**
