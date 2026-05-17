# Draft Lab — Phase 5.1: Data Foundation
> Design document for Claude Code implementation.
> Context: Draft Lab is a single-file React UMD app. Edit `apps/web/src/DraftLab.jsx` → `node compile.js` → commit both files. Never edit `index.html` directly.
>
> **Position in roadmap:** Phase 5.1 is the first subphase of Phase 5 (Draft Simulator + Pick Review). It must be complete before Phase 5.2 (Simulator and Pick Review) begins. The simulator and pick review features are only meaningful if the underlying card data is trustworthy and consistently structured.

---

## Goal

Establish a clean, structured data foundation for the draft simulator and pick review features, using **KHM (Kaldheim) as the proving ground set**. This phase has three workstreams:

1. **Promote game state context from freeform notes to a structured field** — the `context` object on each grade
2. **Migrate STX legacy data** from freeform Q-notation notes into the new structure
3. **Formalize tag and notes usage standards** so KHM grading (in progress) and all future sets are consistent

Nothing in this phase changes the UI in ways the user will notice except the addition of the context rating fields in the grade drawer. All other changes are data model, migration, and standards documentation.

---

## The Problem With the Current Notes Field

Notes are currently freeform catch-all text. STX data imported from a legacy system contains structured game state ratings encoded as raw text:

```
Q: A/A-/B/C
```

This format represents early/ahead/parity/behind game state grades. It is:
- **Not queryable** — the app cannot reason about it programmatically
- **Not displayable** cleanly in the UI
- **Not usable** by the pick review logic to evaluate whether a pick fit the draft's game state context
- **Inconsistently applied** — some cards have it, some don't, and the format was ad hoc

The fix is to promote this into a proper structured field and give notes a clear, distinct purpose going forward.

---

## The `context` Field

### Data model

Add an optional `context` object to the grade record for each card. It sits alongside existing grade fields:

```json
{
  "my_grade": "B+",
  "expert_grade": "A-",
  "performance_grade": "B",
  "context": {
    "early": "A",
    "ahead": "A-",
    "parity": "B",
    "behind": "C"
  },
  "tags": ["Tempo", "Removal"],
  "notes": "Particularly strong against token strategies."
}
```

### Key design decisions

**Context is optional per card.** Not every card needs it. It is most useful for cards where the grade alone doesn't tell the full story — cards that are excellent in one game state and weak in another. Straightforward cards (a removal spell that's good in any game state) don't require it. Claude Code should not prompt or require the user to fill it in.

**Context values use the same grade scale as `my_grade`** (A+/A/A-/B+/B/B-/C+/C/C-/D+/D/D-/F). This is intentional — it keeps the mental model consistent and leverages the grade scale the user already understands.

**Context is never averaged or composited.** The value is in the profile shape — how the four values relate to each other — not in any aggregate. No code should compute a mean or weighted sum of context values. Display them individually or as a profile; never roll them up.

**Context is null when not set**, not an empty object. Check `grade.context != null` before attempting to read context values.

### What the profile shape communicates

| Profile shape | Pattern | Meaning |
|---|---|---|
| Flat | A/A/A/A or B/B/B/B | Reliable role player, fits any archetype |
| Front-loaded | A/A/C/D | Proactive card — belongs in aggressive/tempo strategies |
| Back-loaded | D/C/B/A | Reactive card — belongs in control, stabilizer or finisher |
| Parity specialist | C/C/A/C | Board stall breaker — valuable in grindy formats |
| Ahead-only | C/A/D/D | Win-more card — signals high variance, risky in close games |

The pick review logic uses profile shape, not individual values, when evaluating whether a pick fit the draft's developing archetype.

---

## Notes Field: Clarified Purpose

With game state context promoted to a structured field, notes have a specific and narrow purpose going forward:

**Notes capture reasoning that doesn't fit any structure.** Specifically:

- *Why* a grade or context rating is what it is, when it's non-obvious
- Format-specific observations ("better in sealed than draft")
- Specific card interactions worth remembering
- Uncertainty flags ("revisit after more 17Lands data")
- Observations about how a card performed in actual play

**Notes are not for:**
- Game state ratings (those go in `context`)
- Tags (use the tag system)
- Raw grade values (those are structured fields)
- General impressions already captured by the grade

**Notes should be written as if you'll read them during a draft 6 months from now** and need to quickly remember why you graded a card a certain way. Keep them concise and specific.

---

## Tag Usage Standards

Tags in Draft Lab serve a specific purpose: they classify a card's **primary role** in a draft archetype. They are the signal layer that the archetype fingerprinting system uses to characterize a deck's composition.

### Governing principles

**A card should have only the tags that represent its primary function.** A removal spell that also happens to be a 2/2 body is tagged Removal, not Removal + Creature. The primary function is what matters for archetype analysis.

**Tags are about draft role, not card type.** "Creature" is not a useful tag. "Finisher" is. Tags answer the question: what does this card *do* for the archetype?

**When in doubt, fewer tags are better.** Over-tagging dilutes the signal. A card tagged with five roles is effectively untagged — it contributes noise to archetype fingerprinting rather than signal.

### Tag definitions

| Tag | Definition | Examples of what qualifies |
|---|---|---|
| **Removal** | Kills, exiles, or permanently neutralizes an opposing permanent. Conditional removal qualifies if the condition is commonly met. | Destroy, exile, -X/-X that kills, fight spells |
| **Tempo** | Temporarily disrupts the opponent's development without permanently answering a threat. Bounce, tap effects, counterspells, flash threats. | Bounce spells, tapping effects, flash creatures that trade up |
| **Finisher** | Wins the game if unanswered over several turns. Typically a large or evasive threat. | 5+ power fliers, haste threats, bomb rares that close games |
| **Aggro** | Applies early pressure. Efficient stats for cost, ideally 1–3 mana. | 2/1 for 1, 2/2 haste for 2, aggressive 2-drops |
| **Stabilizer** | Stops the bleeding when you're behind. Gains life, trades with multiple attackers, or resets a board. | Fogs, high-toughness blockers, mass life gain |
| **Enabler** | Makes other cards in the archetype significantly better. Provides mana, draws cards, tutors, or sets up synergies. | Ramp, card draw, looters, setup cards for synergy archetypes |
| **Payoff** | The card that benefits from Enablers. Only powerful in the context of the archetype it belongs to. | Synergy pieces that are weak in isolation |
| **Fixer** | Produces mana of multiple colors. Valued primarily for enabling multicolor decks. | Dual lands, mana artifacts, land fetchers |

### Tags and context interaction

Tags and context are complementary signals that answer different questions:

- **Tags** answer: what role does this card play in an archetype?
- **Context** answers: when in a game is this card at its best?

A Finisher tagged card with a back-loaded context profile (D/C/B/A) is a catch-up finisher — it's at its best when you're behind and need to stabilize and win. A Finisher with a front-loaded profile (A/A/C/D) is a threat you deploy when already ahead. The tag is the same; the context tells you which kind. Both are useful signals for pick review and archetype fingerprinting.

---

## STX Migration

### What exists

STX grade records imported from legacy data contain notes fields with Q-notation:

```
Q: A/A-/B/C
```

Order is consistently: `early / ahead / parity / behind`. The grade values use the standard scale.

### Migration script

Write a one-time migration script (`scripts/migrate-stx-context.js` or equivalent) that:

1. Fetches all STX grade records for the authenticated user from Supabase
2. For each record, checks if `notes` matches the pattern `/Q:\s*([A-F][+-]?)\/([A-F][+-]?)\/([A-F][+-]?)\/([A-F][+-]?)/i`
3. If matched: extracts the four values, writes them to a new `context` object `{ early, ahead, parity, behind }`, strips the Q notation from `notes` (preserve any remaining note text after the Q entry)
4. Upserts the updated record back to Supabase
5. Logs a summary: records processed, records updated, records skipped (no Q notation), any parse errors

**Run once, then delete the script.** This is not a recurring operation.

### Supabase schema change

The `grades` JSONB column already stores the full grade object. Since `context` is a new optional key inside that object, no schema migration is required — JSONB is schemaless. The migration script writes the new key into the existing JSONB structure.

However, update any TypeScript types or JSDoc type comments in `DraftLab.jsx` that describe the grade object shape to include the optional `context` field.

---

## UI Changes

### Grade drawer / lightbox

Add a **Context** section to the grade editing UI, below the existing grade fields and above notes. It should only appear for cards where the user chooses to add it — do not show empty fields by default.

**Display when context is null:** A subtle "Add context ratings" affordance (text link or small button). Tapping it expands the four fields.

**Display when context is set:** Four labeled grade selectors using the same grade picker component as `my_grade`:

```
Game State Context
Early     [A  ▾]
Ahead     [A- ▾]
Parity    [B  ▾]
Behind    [C  ▾]
```

Include a small "Remove context" option to null out the entire context object if the user decides it's not useful for a card.

**No composite score is displayed anywhere.** Do not compute or show an average, weighted score, or any rollup of the four values.

### GradeTable

No changes required to the main table view for Phase 5.1. Context data will be used by the pick review logic in Phase 5.2 but does not need a column or indicator in the card list at this stage.

### Filter system

No new filters for context in Phase 5.1. This can be revisited in Phase 7 when tag and data quality tuning is the focus.

---

## KHM Grading Standards

KHM is the proving ground set for the draft simulator. As grading continues, apply the following standards so the data is clean when Phase 5.2 begins:

1. **Tags first** — before writing notes, ask whether the card's role is fully captured by tags. If it is, notes may not be needed.
2. **Context for non-obvious cards** — if you find yourself hesitating on a grade because "it depends," that's the signal to add a context rating instead of averaging your uncertainty into a single grade.
3. **Notes for reasoning** — if a grade or context rating needs explanation, put it in notes. Keep it to one or two sentences.
4. **No Q-notation** — KHM grading should use the new context field directly. The Q-notation format is STX legacy only.

---

## Proving Ground Set Selection

**Primary proving ground: KHM.** Currently being graded with full deliberateness. Will have the most consistent tag and context discipline going forward.

**STX status:** Legacy set. Will be migrated via the script above. After migration, STX is available for comparison and cross-set analytics but should not be assumed to have the same data quality as KHM until audited.

**Other sets:** Not in scope for Phase 5.1. The simulator and pick review are validated against KHM first. Expanding to additional sets is Phase 7 work.

---

## Definition of Done

Phase 5.1 is complete when:

1. The `context` object shape is documented in code (JSDoc or equivalent) alongside the existing grade object type
2. The grade drawer UI supports adding, editing, and removing context ratings per card
3. Context values persist to Supabase correctly via the existing grade sync path
4. The STX migration script has been run, verified, and deleted
5. All STX records with Q-notation have `context` objects and cleaned `notes` fields
6. Tag definitions are documented in a comment block near the `TAGS` constant in `DraftLab.jsx`
7. Notes field placeholder text in the UI reflects the clarified purpose ("Capture reasoning behind grades, format-specific observations, or anything that doesn't fit the structured fields")
8. KHM grading is ongoing with the new standards applied from this point forward

Phase 5.2 (Simulator and Pick Review) begins after all eight criteria are met.
