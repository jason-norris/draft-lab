# Draft Lab — MTG Limited Card Evaluation

A personal card evaluation tool for MTG limited formats. Grade cards before and after a format, compare your assessments against expert pre-release opinions and 17Lands performance data, and build long-term insight into your card evaluation instincts.

**Live app:** https://jason-norris.github.io/draft-lab/

> Access is invite-only. Sign in with Google once your account has been set up.

---

## What It Does

- **Grade every card** in a set using a half-grade A+ through F scale
- **Import community ratings** — AetherHub/Nizzahon expert pre-release grades and 17Lands end-of-season GIH Win Rate data
- **See all three comparisons at once** — You vs Expert, You vs Performance, Expert vs Performance
- **Tag cards** with evaluation signals (Sleeper, Overrated, Uncertain) and role tags (Removal, Finisher, Tempo, etc.)
- **Quadrant badges** — FORMAT, MISS, SPOT, VAR — show where you diverged from the data
- **Sync across devices** — grades save to the cloud automatically
- **Click any card** to open a full detail view with the card image, editable grades, notes, and tags

---

## Grading Scale

Half-grades are essential — without them the system loses resolution.

| Grade | Pick Range | What It Means |
|-------|-----------|---------------|
| **A+** | P1P1 always | Wins the game alone. You build around it. |
| **A** | P1P1 usually | Doesn't need support to dominate. |
| **A-** | Pick 1–2 | Powerful with a small catch — narrow color req, needs board state, or slightly slow. |
| **B+** | Pick 1–3 | Clear reason to be in a color. Wins games but not quite by itself. |
| **B** | Pick 2–5 | Reliable, efficient, decides close games. |
| **B-** | Pick 4–7 | Good, but needs the right archetype or board state. |
| **C+** | Pick 5–9 | Slightly above-average filler. Occasionally overperforms. |
| **C** | Pick 7–12 | Baseline playable. Does its job. |
| **C-** | Pick 10–14 | You'll play it if you have to. |
| **D+** | Archetype only | Only maindeck in a specific shell. |
| **D** | Sideboard | Rarely maindeck. |
| **F** | Never | Actively costs you games. |

**Tiebreaker questions:**
- **A- vs B+:** Does this card win me the game by itself, or does it need help to close?
- **B- vs C+:** Am I glad I have this, or am I just fine with it?
- **C vs C-:** Would I actively try to avoid playing this if I had another option?
- **D+ vs D:** Is there a real archetype this belongs in, or am I theorycrafting?

---

## Two-Phase Season Workflow

### Phase 1 — Pre-Format (Release Weekend)

Grade blind before the format is solved, then import expert pre-release ratings as a baseline.

1. Load the set and grade all cards with your own assessment
2. Import AetherHub/Nizzahon pre-release ratings via **Import → AetherHub → Import CSV**
3. The Expert column and Δ indicators show where you diverge from the expert consensus
4. Export a Backup — this is your pre-format snapshot

### Phase 2 — End of Season (4–8 Weeks After Release)

Compare your predictions against actual play data.

1. Run `17lands-prep.py` to generate a GIH Win Rate ratings CSV
2. Import via **Import → 17Lands → Import CSV**
3. Fill in Sunset Grades — your revised assessment after seeing the format play out
4. Export CSV for personal analysis
5. Export a Backup — this is your end-of-season archive

---

## Quadrant Classification

When you have all three values (My Grade, Expert, Performance), each card gets a quadrant badge:

| Badge | Meaning |
|-------|---------|
| **SPOT** | You matched performance but diverged from the expert — you saw something they missed |
| **MISS** | Expert and performance agreed — you were off from the consensus |
| **FORMAT** | You and the expert agreed but performance diverged — the format surprised both of you |
| **VAR** | All three diverge — high-variance or archetype-dependent card |

No badge means consensus correct — you, the expert, and the data all agreed.

---

## Community Data Sources

### Expert Ratings — AetherHub / Nizzahon

Best for pre-format baseline. Published at release weekend on a 0–5 scale.

Run the browser console scraper on `aetherhub.com/Limited/DraftSensei/SET` (see `scripts/aetherhub-scrape.js`) and import the downloaded CSV.

### Performance Ratings — 17Lands GIH Win Rate

Best for post-format accuracy. Measures actual win rate when a card was in hand.

```bash
cd scripts
python 17lands-prep.py TLA            # auto-downloads Premier Draft data
python 17lands-prep.py TLA TradDraft  # Traditional Draft instead
```

Wait at least 2–3 weeks after release. Early data is noisy. Cards with fewer than 200 samples are excluded.

---

## Backup and Restore

Grades, tags, notes, and import metadata sync to the cloud automatically. Use the **Export** menu to:

- **Export Backup (JSON)** — full snapshot of all grades across all sets; use this to restore or share
- **Restore Backup (JSON)** — reimports a previous backup and syncs to the cloud
- **Export Grades (CSV)** — per-set export for analysis in Excel or Python

---

## Legal & Attribution

Draft Lab is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved or endorsed by Wizards of the Coast. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

Card data and images provided by [Scryfall](https://scryfall.com). Game performance data from [17Lands](https://www.17lands.com) public datasets, used for personal non-commercial purposes per their usage guidelines. Pre-release ratings sourced from [AetherHub](https://aetherhub.com) and Nizzahon Magic for personal use.

Source code released under the [MIT License](LICENSE).
