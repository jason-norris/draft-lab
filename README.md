# Draft Lab — MTG Limited Card Evaluation Tool

A personal MTG limited grading and analysis system for evaluating cards before and after a format, comparing your assessments against community data, and building long-term insight into your card evaluation instincts.

---

## Files in This Package

| File | Purpose |
|------|---------|
| `draft-lab.html` | The main app — open in any browser, desktop or mobile |
| `17lands-prep.py` | Processes 17Lands public game data into a ratings CSV |
| `aetherhub-scrape.js` | Browser console script to extract AetherHub pre-release ratings |
| `aetherhub-playwright.py` | Automated version of the AetherHub scraper (requires Playwright) |

The `.jsx` source file is not needed to run the app — it's included for reference only.

---

## Quick Start

### Running the App

Just open `draft-lab.html` in Chrome or Firefox. No server, no install, no npm.

On **mobile**: transfer the file to your device (Google Drive, AirDrop, email) and open it in Chrome. It adapts automatically to a mobile-friendly card list layout.

On **desktop**: double-click the file. The full table view with sortable columns, hover card previews, and filter bar loads immediately.

### First Session Workflow

1. Open the app and select a set from the dropdown (pulls live data from Scryfall)
2. Grade each card using the **My Grade** column (A+ through F)
3. Use the **Notes** field for reasoning, archetype flags, anything you want to remember
4. Hit **Backup** regularly to save a JSON snapshot — store it in Google Drive or wherever

---

## Grading Scale

Half-grades are essential — without them the system loses meaningful resolution.

| Grade | Pick Range | What It Means |
|-------|-----------|---------------|
| **A+** | P1P1 always | Wins the game alone. You build around it. |
| **A** | P1P1 usually | Doesn't need support to dominate. |
| **A-** | Pick 1–2 | Powerful with a small catch — narrow color req, needs board state, or slightly slow. |
| **B+** | Pick 1–3 | Clear reason to be in a color. Wins games but not quite by itself. |
| **B** | Pick 2–5 | Reliable, efficient, decides close games. |
| **B-** | Pick 4–7 | Good, but needs the right archetype or board state. |
| **C+** | Pick 5–9 | Slightly above-average filler. Occasionally overperforms. |
| **C** | Pick 7–12 | Baseline playable. Does its job, won't embarrass you. |
| **C-** | Pick 10–14 | You'll play it if you have to. Hoping for better. |
| **D+** | Archetype only | Only maindeck in a specific shell. Actively bad elsewhere. |
| **D** | Sideboard | Rarely maindeck. You know when you put it in that you're in trouble. |
| **F** | Never | Actively costs you games. Rarer than most reviewers use it. |

**Tiebreaker questions:**
- **A- vs B+:** Does this card win me the game by itself, or does it need help to close?
- **B- vs C+:** Am I glad I have this, or am I just fine with it?
- **C vs C-:** Would I actively try to avoid playing this if I had another option?
- **D+ vs D:** Is there a real archetype this belongs in, or am I theorycrafting?

The grade guide is also accessible in-app via the **?** button in the header.

---

## Two-Phase Season Workflow

### Phase 1 — Pre-Format (Release Weekend)

**Goal:** Grade blind before the format is solved, import a community pre-release baseline.

1. Load the set in Draft Lab
2. Grade all cards with your own assessment
3. Run the AetherHub scraper to get Nizzahon's pre-release expert grades
4. Import the AetherHub CSV via **17L → Import CSV**
5. The **Δ column** shows where you diverge from the expert baseline
6. Export a **Backup** — this is your pre-format snapshot

### Phase 2 — End of Season (4–8 Weeks After Release)

**Goal:** Compare your predictions against actual play data and assign sunset grades.

1. **Flush 17L** to clear the AetherHub pre-release data
2. Run `17lands-prep.py` to generate a GIH Win Rate ratings CSV
3. Import the 17Lands CSV via **17L → Import CSV**
4. Fill in the **Sunset Grade** column — your revised assessment after seeing the format play out
5. Export CSV for analytics
6. Export a **Backup** — this is your end-of-season archive

---

## Community Ratings Import

### Source 1 — AetherHub Pre-Release Ratings (Nizzahon)

Best for pre-format baseline. Published before or at release weekend on a 0–5 scale.

**Browser console method (recommended):**
1. Open `https://aetherhub.com/Limited/DraftSensei/DSK` (replace `DSK` with your set code)
2. Wait for the page to fully load
3. F12 → Console tab
4. Paste the entire contents of `aetherhub-scrape.js` and hit Enter
5. `DSK_aetherhub_ratings.csv` downloads automatically

**Automated method:**
```bash
pip install playwright
playwright install chromium
python aetherhub-playwright.py DSK
```

### Source 2 — 17Lands GIH Win Rate (End of Season)

Best for post-format performance data. Measures actual win rate when a card was in hand.

**Setup:** Requires Python 3.7+ with no additional packages (uses stdlib only).

**Download the correct file type:** You need the **game data** file, not the draft data file.

Direct S3 URL pattern:
```
https://17lands-public.s3.amazonaws.com/analysis_data/game_data/game_data_public.DSK.PremierDraft.csv.gz
```

**Run the script:**
```bash
# Auto-download and process
python 17lands-prep.py DSK

# Specify format
python 17lands-prep.py DSK TradDraft

# Use a locally downloaded file
python 17lands-prep.py DSK PremierDraft game_data_public.DSK.PremierDraft.csv.gz
```

**Format options:** `PremierDraft` (default), `QuickDraft`, `TradDraft`, `Sealed`

**Timing:** Wait at least 2–3 weeks after release. Early data is noisy and the mean/standard deviation can shift significantly in the first week. Premier Draft is the right format for most evaluation purposes.

**How it normalizes:** GIH Win Rate is converted to 0–5 using z-score normalization (z=+2 → 5.0, z=0 → 2.5, z=−2 → 0.0), rounded to the nearest 0.5. Cards with fewer than 200 samples are excluded.

**GIH WR known blind spots:** Undersells cards that are good in multiples or that enable synergy engines, since those effects don't show up cleanly in individual card win rate. These are often the most interesting divergences to reflect on.

---

## Backup and Restore

Grades, notes, 17Lands import metadata, and theme preference are all stored in your browser's `localStorage`.

- **Export Backup** — downloads `draft-lab-backup-YYYYMMDD.json` covering all sets you've worked on
- **Import Backup** — restores from any previous backup; merges rather than overwrites, so newer grades survive
- **CSV Export** — per-set export of the current view including all grades and notes; useful for analytics

Store backups in Google Drive or cloud storage. Export at natural stopping points — after finishing a color, wrapping a session, or completing a phase.

Backups are also shareable: send someone your JSON and they can import your grades to compare evaluations.

---

## App Features

### Desktop
- Sortable table with columns: Card Name, Cost, Type, Rarity, Color, My Grade, Community Rating, Sunset Grade, Δ Agreement, Notes
- Hover any row to see the card image
- Color-coded left border by MTG color identity
- Click column headers to sort; click again to reverse
- Filter bar: by color, rarity, graded/ungraded status, and text search

### Mobile
- Expandable card list — tap a row to reveal the full detail panel
- Tap the card thumbnail to enlarge to full width
- Filters and 17L import in the ⚙ drawer
- All grading controls sized for touch

### Both
- **?** button opens the grade reference guide with the full half-grade ladder
- **17L ▾** (desktop) / ⚙ drawer (mobile) for community rating import
- **Flush 17L** clears imported community data while preserving your grades and notes
- **☀ / 🌙** theme toggle — also follows system dark/light mode automatically
- Manually editing a community-imported cell overrides the import for that card (badge disappears, flush won't touch it)

---

## Planned Enhancements

These are confirmed wishlist items for a future update:

### Visual
- **Mana symbols** rendered from Scryfall JSON instead of text cost strings (e.g. {W}{U}{2} rendered as actual symbols)
- **Card click to enlarge** on desktop — click a row to open a dark-overlay lightbox with the full card image

### Data
- **Named source labels** — distinguish between 17Lands, AetherHub/Nizzahon, and manual entry rather than a generic "Community Rating" label
- **Generic community import** with source tagging: import any CSV and label it (17Lands, AetherHub, Manual, etc.)
- **Restore from CSV export** — ability to reimport a previously exported grades CSV back into the app, not just the JSON backup

---

## End-of-Season Analytics Plan

After completing a two-phase season evaluation, export your grades CSV and run the following analyses. These can be done in a Python notebook (pandas + matplotlib) or built into a future Draft Lab analytics view.

### 1. Calibration — Bias Detection

Plot a histogram of your grades vs community scores. Are you systematically higher or lower? Does the bias vary by rarity or color? Consistent overrating of a color or card type is a meaningful instinct to know about.

```python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("DSK-grades.csv")
# Your grade vs Community rating scatter
plt.scatter(df["Community Rating"], df["My Grade (numeric)"], alpha=0.5, c=df["color_code"])
```

### 2. Divergence Pattern Analysis

Sort by the gap between your grade and community score. Look at what the largest outliers have in common — card type, mechanic, color, mana cost. Cards where you were significantly higher than 17Lands are often synergy pieces that GIH WR undersells. Cards where you were lower are often late-game bombs that take time to show up in win rates.

### 3. Sunset Grade Retrospective

The delta between your initial grade and sunset grade is the richest signal. Cards with large divergence are where the format surprised you. Cross-reference with notes: did you flag uncertainty that turned out to be warranted? Did you write confidently about cards you were wrong about?

### 4. Notes Sentiment Mining

Run your notes through a language model or simple keyword classifier:
- **Confidence signals:** "obvious", "clear", "always", "never"
- **Uncertainty signals:** "depends", "might", "if", "archetype only", "risky"
- **Format read signals:** "slow format", "aggressive", "synergy"

Correlate these with your accuracy. Well-calibrated uncertainty is a skill — if your hedged picks were more often wrong, your uncertainty flags are working. If your confident picks were more often wrong, that's a different problem.

### 5. Color and Archetype Arc

Track grade accuracy by color across multiple sets. Many players systematically underrate green commons and overrate blue rares. Visible across two or three sets.

### 6. The Core Scatter Plot

One chart that captures everything:
- X-axis: Community Rating (17Lands normalized score)
- Y-axis: Your Grade (converted to numeric)
- Color: MTG color identity
- Size: Rarity (mythic largest)

**Upper-left quadrant** (you high, community low) = your overconfident picks
**Lower-right quadrant** (you low, community high) = your blind spots

These two quadrants, reviewed at end of season, are your primary learning targets for the next format.

---

## Technical Notes

- **Storage:** `localStorage` keyed by set code (`draft-grades-DSK`, etc.). Clears if browser data is cleared — back up regularly.
- **Scryfall API:** Set list and card data fetched live from `api.scryfall.com`. Requires internet on first load of each set; data is not cached locally.
- **No server required:** The entire app is a single self-contained HTML file with pre-compiled React. No Node, no npm, no build step.
- **Compatibility:** Chrome and Firefox on desktop; Chrome on Android; Safari on iOS (file:// opening works post-compilation).
- **17Lands data:** Uses the public S3 dataset per 17Lands usage guidelines. Personal/non-commercial use only.
- **AetherHub data:** Scraped for personal use. Ratings are Nizzahon's expert pre-release assessments.

---

## Set Code Reference

| Code | Set |
|------|-----|
| DSK | Duskmourn: House of Horror |
| BLB | Bloomburrow |
| MH3 | Modern Horizons 3 |
| OTJ | Outlaws of Thunder Junction |
| MKM | Murders at Karlov Manor |
| LCI | Lost Caverns of Ixalan |
| WOE | Wilds of Eldraine |
| LTR | Lord of the Rings |
| MOM | March of the Machine |
| ONE | Phyrexia: All Will Be One |
| BRO | The Brothers' War |
| DMU | Dominaria United |

For a full set list, open the app and use the set picker dropdown — it pulls directly from Scryfall.

---

*Built with React (UMD), Scryfall API, 17Lands public datasets, and AetherHub/Nizzahon ratings.*
