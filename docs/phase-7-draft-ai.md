# Phase 7 — Draft AI Architecture

> Technical design document for the bot drafting system. Intended as a reference for implementation, not a step-by-step spec. Read alongside ROADMAP.md §Phase 7.

---

## Why Greedy Bots Feel Fake

The fundamental problem with a greedy archetype bot is that it has perfect information about its own preferences and zero uncertainty about anything else. Real human drafters operate under deep uncertainty — they don't know what colors are open, they don't know what the player to their right is drafting, and they're making probabilistic inferences from incomplete signals.

A bot that always picks the highest-rated card in its color pair feels mechanical because it:
- Never hesitates
- Never misreads signals
- Never commits too early and gets punished for it
- Plays optimally within its own frame

The authenticity gap is about **decision-making under uncertainty**, not card evaluation.

---

## The Signal Reading Problem

The information available to a drafter at pick N:

- Cards in the current pack (direct observation)
- Cards already picked (own history)
- Quality and color distribution of cards that have passed through the seat (indirect table signal)
- Prior knowledge of the set's card pool and print frequency

The inference goal: what are the 7 other drafters doing, and which colors are therefore available?

This is a **Bayesian inference problem**. Each other drafter's archetype is a hidden variable. The drafter observes noisy evidence (the packs) and updates a posterior estimate of table composition after every pack. Optimal strategy is a function of posterior beliefs about the table, not just card quality.

At pick 1: essentially no information, prior is uniform across colors.
By pack 2 pick 1: 15 packs worth of signal — cards that passed through the seat and what was absent from those packs.

---

## The Three Sub-Problems

### Sub-problem 1: Card Evaluation

Assigning value to a card given the current pick pool. Raw ratings don't capture:

- **Synergy multipliers** — a C+ card in isolation might be A- in a deck already running three of a particular mechanic. Vehicles need pilots. Auras need targets. Value is pool-composition-dependent.
- **Curve considerations** — the fifth 4-drop is worth less than the first even if the card is identical. Marginal value decays with curve overlap.
- **Fixing value** — dual lands and mana fixers scale non-linearly with how many colors the deck is already running.
- **Enablers vs payoffs** — the first copy of a mechanic enabler is worth more than the fifth payoff card. Value is positional within archetype structure.

### Sub-problem 2: Commitment and Pivoting

When should a drafter commit to a color pair vs stay open? A threshold decision with inputs:

- Pick number (depth in draft — pick 14 requires more commitment than pick 4)
- Quality gap between on-color and off-color cards accumulated so far
- What signals say about which colors are available
- Opportunity cost of staying open (worse individual picks, weaker synergies)

**Reasonable model:** maintain a commitment score per color pair. Score increases when cards in that pair are picked, decreases when good cards in that pair pass through the seat (they're being drafted by someone else). Commit when one pair's score exceeds a threshold. The threshold decreases as the draft progresses — more committed in pack 2, very committed by pack 3.

### Sub-problem 3: Simulating Realistic Mistakes

Authentic human drafters make predictable mistakes that create the texture of real tables:

- **Bomb drafting** — taking a bomb outside their colors because it's too good to pass, fragmenting their strategy
- **Signal blindness** — committing to a cut color because they opened a strong card there early
- **Archetype over-commitment** — taking the eighth synergy piece when the archetype is already overdrafted
- **Late pivot failure** — correctly reading that their color is cut but failing to identify the open lane, ending in a bad three-color pile
- **Pet card bias** — consistently overvaluing a card type based on experience in other formats

Without mistake injection, the draft environment is too clean: colors open predictably, signals are unambiguous, you never get cut by someone who made a bad decision three packs ago.

---

## Recommended Architecture: Four-Layer System

### Layer 1: Card Value Function (deterministic, client-side)

A scoring function per card taking as input:
- Base rating from grade data (My Grade, Expert Rating, Performance Rating)
- Current pool composition (synergy multipliers, curve position counting)
- Pick number (late-pick devaluation for narrow cards)
- Color commitment state (bonus for committed colors, penalty for off-color)

Runs client-side, no API calls. Handles sub-problem 1.

### Layer 2: Belief State and Commitment Model (Bayesian, client-side)

Each bot maintains a probability distribution over possible archetypes, updated after each pack it receives. The math is tractable — Bayesian update with a simple likelihood function.

- Distribution starts uniform (all color pairs equally likely)
- After each pack: update based on which cards were present/absent and their color distribution
- Commitment threshold is a function of pick number (decreasing)
- Pivot probability = f(gap between current-best archetype and committed archetype, pick number)

Runs client-side, no API calls. Handles sub-problem 2.

### Layer 3: Mistake Injection (probabilistic, client-side)

Each bot personality profile includes a mistake probability vector:

| Personality | Bomb-draft rate | Signal blindness | Over-commit | Under-commit |
|-------------|-----------------|------------------|-------------|--------------|
| Spike       | Low             | Very low         | Low         | Very low     |
| Grinder     | Very low        | Low              | Low         | Low          |
| Timmy       | High            | Medium           | Low         | High         |
| Johnny      | Medium          | Low              | High        | Low          |
| Casual      | Medium          | High             | Medium      | High         |

At each pick: small probability the bot ignores Layer 1 and acts on its mistake type instead. Seeded per session — reproducible if the same session is replayed.

Runs client-side, no API calls. Handles sub-problem 3.

### Layer 4: LLM for Contested Picks (optional, 30–60 API calls per draft)

When Layer 1 scoring produces a near-tie (top two cards within a configurable threshold), invoke Claude with full context. Handles exactly the cases where human judgment is most differentiated from mechanical scoring — close calls where synergy, signals, and archetype fit all matter simultaneously.

**Prompt structure:**
```
You are drafting as a [personality] in a [set] draft. Your current picks: [pool]. 
The current pack contains: [cards with ratings]. Signal data: [color signals].
It is pick [N] of 42. Your committed color pair is [pair] (confidence: [score]).

The top two cards by grade are [card A] ([grade]) and [card B] ([grade]).
Make a pick and give a one-sentence reason.
```

Estimated cost: $0.03–0.08 per draft at current API pricing. Entirely optional — Layer 1–3 alone produce a playable and realistic draft table.

---

## Approaches from the Literature

**MCTS (Monte Carlo Tree Search)** — simulates many possible draft outcomes and selects picks maximizing expected deck quality across the distribution of table behaviors. Enormous search space, requires a good reward function. Produces strong individual picks but doesn't model human-like behavior.

**Contextual bandits** — each pick as a bandit problem; choose an action, observe delayed reward (how good your deck was). Challenge: reward is delayed and sparse. This is what 17Lands implicitly does with GIH WR.

**Behavioral cloning from human data** — train on 17Lands draft data directly. Captures human heuristics implicitly including biases and mistakes. Expensive to train, requires significant data preprocessing, black-box result. Approximately what Draftsim's AI does.

**LLM as reasoner** — uses existing knowledge of card evaluation and draft theory as the reasoning layer. Handles synergy evaluation naturally, produces personality-differentiated behavior, deliberates on close calls. Weaknesses: latency, cost, inconsistency.

The **four-layer hybrid** described above is the recommended approach: deterministic for the bulk of picks, Bayesian for signal reasoning, probabilistic for mistake realism, LLM only for close calls.

---

## The Data Advantage

Draft Lab has better card evaluation data than most draft simulators:

- **Draftsim** uses its own proprietary ratings
- **MTGA Arena** uses win rate data from Arena play
- **Draft Lab** has both expert pre-release opinion (AetherHub) and empirical performance data (17Lands GIH WR), normalized to the same 0–5 scale, tied to Scryfall card IDs

Layer 1 of the bot system has unusually good inputs from day one. Bot quality improves naturally as more seasons of data are collected and personal grades become better calibrated.

---

## The Signal Accuracy Training Loop

**This is a genuinely novel training tool that no existing draft simulator offers.**

After each draft session, the system can compute a **signal accuracy score**:

- At pack 2 pick 1, what did the signal dashboard indicate as the open colors?
- What did the drafter actually end up in?
- How correlated were these over multiple sessions?

Over many sessions this gives a quantified measure of signal reading accuracy — improving independently of card evaluation accuracy. Most players don't separate these two skills. They think they're bad at evaluating cards when actually their card evaluation is fine and their signal reading is the gap, or vice versa.

**The simulator can tell you which one it is.**

---

## Implementation Notes for Claude Code

When starting Phase 7:

1. Read ROADMAP.md §Phase 7 first for the feature spec and table schema
2. This document provides the AI architecture rationale
3. Start with §7.11's ten-step build order — don't skip to the AI layers before the pick loop is working
4. Layer 1 (card value function) is the critical foundation; all other layers consume its output
5. Layer 4 (LLM) is optional and should be added last — the system is fully functional without it
6. The Supabase schema in §7.1 is fixed once deployed — design it carefully before step 1

The four-layer system maps to the ROADMAP milestones as follows:
- **Milestone 1 bots** = Layer 1 only (greedy archetype)
- **Milestone 2 bots** = Layer 1 + Layer 2 (signal-aware)
- **Milestone 3 bots** = Layer 1 + Layer 2 + Layer 3 (personality profiles)
- **Full system** = all four layers including optional LLM
