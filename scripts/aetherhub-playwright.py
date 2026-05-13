#!/usr/bin/env python3
"""
aetherhub-playwright.py  —  Automated AetherHub DraftSensei scraper

USE THIS when you want to automate the download without opening a browser manually.
Requires Playwright (one-time setup):

  pip install playwright
  playwright install chromium

USAGE
  python aetherhub-playwright.py DSK
  python aetherhub-playwright.py BLB
  python aetherhub-playwright.py TDM

OUTPUT
  DSK_aetherhub_ratings.csv  →  import into Draft Lab via 17L → Import CSV
"""

import sys, csv, re
from pathlib import Path

SET_CODE = sys.argv[1].upper() if len(sys.argv) > 1 else None
if not SET_CODE:
    print(__doc__)
    sys.exit(1)

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Playwright not installed. Run:")
    print("  pip install playwright")
    print("  playwright install chromium")
    sys.exit(1)

URL     = f"https://aetherhub.com/Limited/DraftSensei/{SET_CODE}"
OUT_CSV = f"{SET_CODE}_aetherhub_ratings.csv"

print(f"\n{'='*54}")
print(f"  AetherHub DraftSensei  |  {SET_CODE}")
print(f"{'='*54}")
print(f"\nLoading {URL}")

results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page    = browser.new_page(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )

    page.goto(URL, wait_until="networkidle", timeout=60_000)

    # Wait for rating content to appear
    try:
        page.wait_for_selector("text=Pro Rating", timeout=15_000)
    except Exception:
        print("  Timed out waiting for ratings — page may have changed structure")

    # Run the same extraction logic as the JS console script
    results = page.evaluate("""
    () => {
      const results = [];
      const seen    = new Set();
      const allEls  = Array.from(document.querySelectorAll('*'));

      for (const el of allEls) {
        if (el.children.length > 5) continue;
        const txt   = el.innerText || el.textContent || "";
        const match = txt.match(/Pro\\s+Rating\\s*[:\\s]\\s*(\\d+\\.?\\d*)/i);
        if (!match) continue;
        const rating = parseFloat(match[1]);
        if (isNaN(rating) || rating < 0 || rating > 5) continue;

        let name = null;
        let node = el;
        for (let i = 0; i < 8 && !name; i++) {
          node = node.parentElement;
          if (!node) break;
          const anchor  = node.querySelector('a[href*="/Card/"], a[href*="/card/"]');
          if (anchor) { name = anchor.innerText.trim(); break; }
          const heading = node.querySelector('h2,h3,h4,h5,.card-name,.cardname');
          if (heading)  { name = heading.innerText.trim(); break; }
        }
        if (!name) {
          const parent = el.parentElement;
          if (parent) {
            for (const sib of parent.children) {
              const s = (sib.innerText || "").trim();
              if (s && !s.match(/rating|comment|pro|score/i) && s.length < 80 && s.length > 1) {
                name = s; break;
              }
            }
          }
        }
        if (!name || seen.has(name)) continue;
        seen.add(name);
        results.push({ name, rating });
      }
      return results;
    }
    """)

    browser.close()

if not results:
    print("\n  No ratings found. The page structure may have changed.")
    print(f"  Try the browser console script instead: aetherhub-scrape.js")
    sys.exit(1)

results.sort(key=lambda x: -x["rating"])

with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Card Name", "Rating"])
    for r in results:
        w.writerow([r["name"], r["rating"]])

print(f"\n  {len(results)} cards extracted")
print(f"\n  Score distribution:")
from collections import Counter
dist = Counter(r["rating"] for r in results)
for score in sorted(dist, reverse=True):
    bar = "\u2588" * min(dist[score], 40)
    print(f"    {score:.1f}  {bar} {dist[score]}")

print(f"\n{'='*54}")
print(f"  Output: {OUT_CSV}")
print(f"{'='*54}")
print(f"\n  Import into Draft Lab via 17L \u2192 Import CSV")
print()
