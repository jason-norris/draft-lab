# Draft Lab — Draft AI Architecture: Planning Addendum
> Companion to `docs/phase-7-draft-ai.md`.
> This document captures how the pick-by-pick signal review design (see `phase5-signal-review.md`) informs and extends the AI architecture. Read both docs together. Where this doc conflicts with the original, this doc reflects the more recent design decisions.

---

## Naming Correction: Phase 5, Not Phase 7

The original AI architecture doc (`docs/phase-7-draft-ai.md`) was written when the draft simulator was planned as Phase 7. The roadmap has since been restructured:

| Phase | Feature | Status |
|---|---|---|
| 4 | Analytics | ✅ Complete |
| 5 | Draft Simulator + Pick Review | 🔜 Next |
| 6 | Additional Community Sources | Lower priority |
| 7 | Native App (Capacitor) | Final phase |

All references in the original doc to "Phase 7", "§7.1", and "§7.11" should be read as Phase 5. The new planning docs (`phase5-signal-review.md`, `refactor-god-component.md`) use Phase 5 naming throughout. The AI architecture itself is unchanged — only the phase number moved.

**Action for Claude Code:** Update the header and internal references in `docs/phase-7-draft-ai.md` to reflect Phase 5. Do not rename the file yet — links in ROADMAP.md and CLAUDE.md reference the current filename.

---

## Connection 1: The `draft_picks` Schema Is the Signal Accuracy Training Loop

The original doc describes the Signal Accuracy Training Loop as the project's key differentiating feature:

> "After each draft session, the system can compute a signal accuracy score... Over many sessions this gives a quantified measure of signal reading accuracy."

This was aspirational when written. The `phase5-signal-review.md` schema makes it concrete. The three Supabase tables — `draft_sessions`, `draft_picks`, `draft_decks` — capture exactly the data the training loop needs:

- **`pack_contents` per pick** — what was available at each decision point
- **`pool_at_pick`** — the drafter's state going into each decision
- **Snapshotted `alsa` and `ata`** on each card object — the community baseline for what should and shouldn't wheel

The per-session signal accuracy metrics (clean picks, risky passes, correct passes, wheel checks) described in the pick review UI are the individual-session output of the training loop. Cross-session aggregation of these scores, which was described as the end goal in the original doc, becomes a natural Phase 5.5 or Phase 4 analytics extension once the per-session data exists.

**Implication:** Get the schema right before anything else. The training loop's validity depends entirely on the completeness of what's captured per pick. See the schema section in `phase5-signal-review.md` for the full card object shape including ALSA and ATA fields.

---

## Connection 2: ALSA/ATA Data Feeds Layer 2 Directly

The original doc describes Layer 2 (Belief State and Commitment Model) as a Bayesian inference system where each bot updates its belief about the table from the cards it sees. The key inference is: "which cards appeared in my pack that statistically shouldn't have wheeled?" — i.e., the table is drafting those colors.

The data that makes this tractable is exactly **ALSA (Average Last Seen At)**. A bot receiving a card with ALSA 4.2 at pick 9 knows that card was unlikely to still be available — something disrupted the table's normal behavior. That's a signal.

The `17lands-prep.py` extension planned in `phase5-signal-review.md` adds ALSA and ATA to the import pipeline and snapshots them into the card object at draft time. This means:

- Layer 2 bots have real ALSA data to reason from, not synthetic approximations
- The user's signal review uses the same ALSA baseline as the bots — the feedback is directly comparable to how the bots reasoned
- As 17Lands data matures each season, bot signal accuracy improves automatically

**Implication:** The 17Lands script extension (Step 2 in the implementation order) is a prerequisite for realistic Layer 2 bots, not just for the pick review UI. Don't skip it or defer it.

---

## Connection 3: The Two Signal Problems Map to the Bot Mistake Taxonomy

The pick review design identified two distinct signal problems the user faces:

- **Table signals** — inferring what neighbors are drafting from what wheels and what doesn't
- **Internal signals** — recognizing when your own pool is telling you to commit to a color pair

The original doc's mistake injection profiles (Layer 3) describe exactly these two failure modes under different names:

| User-facing problem | Bot mistake type | Layer 3 personality trait |
|---|---|---|
| Table signal blindness | Committing to a cut color | `signal_blindness` (high in Timmy, Casual) |
| Internal signal failure | Staying open too long or committing too early | `under_commit` / `over_commit` |
| Bomb-drafting temptation | Taking a bomb outside committed colors | `bomb_draft_rate` (high in Timmy) |

This is the same taxonomy, not a coincidence. The bots are simulating the mistakes the user is trying to avoid making.

**Implication for feedback language:** The pick review UI should use terminology consistent with the bot personality profiles. If the system tells the user "this was an internal signal failure — you had 4 blue cards but took an off-color card at pick 7," and the user has watched a bot make the same mistake labeled as "over-commitment," the connection between their behavior and the bot's modeled behavior becomes legible. Use the same vocabulary in both contexts.

**Implication for the training loop:** Once enough sessions are accumulated, it becomes possible to characterize a user's drafting personality using the same taxonomy. "Your signal accuracy data suggests you have a Timmy-like bomb-draft tendency — you correctly read the table in 78% of sessions but diverged from your colors 4 times on high-rarity picks." That's a genuinely useful insight that no existing tool produces.

---

## Connection 4: Layer 4 LLM Extends Naturally to Post-Draft Feedback

The original doc proposes the LLM layer (Layer 4) for contested picks during the draft — near-ties between cards where synergy, signals, and archetype fit all matter simultaneously.

The same LLM invocation pattern applies to post-draft feedback narratives in `DraftReviewView`. The pick review computes classification labels (✓ Clean, ⚠ Risky pass, 🔍 Review) algorithmically from the stored data. But the *explanation* of why a pick was flagged — the narrative that helps the user understand their mistake — is exactly the kind of nuanced reasoning the LLM excels at.

Consider a two-mode feedback system:

- **Algorithmic layer** — always runs, produces classifications, no API cost. The core of the pick review.
- **LLM narrative layer** — optional, on-demand, invoked per flagged pick. Produces a 2–3 sentence explanation of why the pick was flagged and what a better read of the situation would have looked like.

Example LLM prompt for a flagged pick:

```
You are reviewing a Magic: The Gathering draft pick for a player learning to read signals.

Draft context:
- Set: [set], Format: Premier Draft, Pick: P1P7
- Player's pool at this pick: [pool cards with colors and grades]
- Pack contents: [all cards with grades, ALSA, ATA]
- Player took: [card] (grade: B-, ALSA: 6.2)
- Passed: [card] (grade: B+, ALSA: 4.1) — this card went P1P9, 2 picks later

The player's pool already had 4 blue cards and 2 white cards.
The passed card was blue. The taken card was red.

In 2–3 sentences, explain what signal the player likely missed and what
the better read of the situation was. Be specific and constructive.
```

This is a natural extension of the Layer 4 architecture — same Anthropic API, same cost profile, but triggered post-draft rather than during it. Estimated 5–15 API calls per draft review session (only flagged picks get narratives).

**Implication for implementation:** Don't build the LLM feedback narratives in Phase 5 v1. Get the algorithmic layer working first and producing reliable classifications. Add LLM narratives as a Phase 5.5 enhancement once you trust the classification logic. The same "Layer 4 is optional and added last" principle from the original doc applies here.

---

## Connection 5: Layer 1 Card Value Function Has Better Inputs Than Originally Assumed

The original doc describes Layer 1 (Card Value Function) as using "base rating from grade data" without specifying which grade source. The card object shape in `phase5-signal-review.md` snapshots three rating sources per card at draft time:

```json
{
  "my_grade": "B+",
  "expert_grade": "A-",
  "performance_grade": "B"
}
```

This gives Layer 1 a richer input than a single rating. A reasonable weighting:

- **Early in a format** (no performance data yet): weight `expert_grade` more heavily
- **Mid/late format** (17Lands data mature): weight `performance_grade` more heavily
- **User's personal grades**: use as a comparison signal in pick review, but weight lower in bot card value to avoid bots mirroring the user's own biases

The `importMeta` object in `GradesContext` tracks when each source was imported and from which format — this can inform which weighting to apply automatically.

**Implication:** Layer 1 should accept a `ratingWeights` parameter rather than hard-coding a single source. Default weights can be tuned per format age. This makes the bot stronger without adding complexity to the bot logic itself.

---

## Revised Implementation Order

Combining the original doc's milestone structure with the Phase 5 planning:

### Milestone 0 — Prerequisite (before any bot work)
- Complete the god component refactor (`refactor-god-component.md`)
- `DraftView` and `DraftReviewView` must exist as clean sub-components

### Milestone 1 — Basic Draft Loop (Layer 1 bots only)
- Supabase schema: `draft_sessions`, `draft_picks`, `draft_decks`
- 17Lands script extension: ALSA, ATA, OH WR
- Pack generation from Scryfall card pool
- User pick interface in `PackDisplay`
- Layer 1 card value function (greedy, single rating source)
- Session persistence to Supabase
- Basic `SessionList` in `DraftReviewView`

### Milestone 2 — Signal-Aware Bots (Layer 1 + 2)
- Belief state model per bot (Bayesian color commitment)
- ALSA-informed bot pick decisions
- Wheel check logic in pick review
- ALSA-based pass evaluation in pick review
- Pick classification labels (✓ Clean, ⚠ Risky pass, etc.)
- `PickRow` UI with collapsed/expanded detail

### Milestone 3 — Realistic Table (Layer 1 + 2 + 3)
- Bot personality profiles with mistake injection
- Pivot point detection in pick review
- Summary panel with signal accuracy totals
- Archetype fingerprinting (`SET_ARCHETYPES` constant)
- Deck build feedback

### Milestone 4 — Optional LLM Layer
- Layer 4 during-draft contested pick invocation
- LLM narrative feedback for flagged picks in `DraftReviewView`
- Cross-session signal accuracy aggregation (analytics integration)

---

## What Remains Unresolved

The open questions from `phase5-signal-review.md` still apply. Restating with priority:

**Must resolve before Milestone 1:**
- Bot behavior for Milestone 1: pure greedy (highest card value function score) is fine for v1 — the richer Layer 2/3 behavior comes in Milestone 2/3
- Pack generation: Scryfall bulk data by rarity slot is the recommended approach for v1; exact collation rules can be tightened later
- Session resumability: **abandoned-on-close for v1** — simpler, and an interrupted draft produces corrupt pick data anyway

**Must resolve before Milestone 2:**
- Commitment threshold tuning: the Bayesian model needs calibrated priors. Start with empirical ALSA data as the prior (cards with low ALSA are more contested) and tune from there.

**Can defer:**
- LLM narrative feedback (Milestone 4)
- Cross-session analytics (Phase 5.5 / Phase 4 extension)
- Bot personality selection UI (Milestone 3 can start with fixed personality assignments)
