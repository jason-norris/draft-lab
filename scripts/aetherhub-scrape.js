/**
 * aetherhub-scrape.js — Browser console scraper for AetherHub DraftSensei
 *
 * HOW TO USE
 * 1. Open https://aetherhub.com/Limited/DraftSensei/DSK
 *    (replace DSK with your set code)
 * 2. Wait for the page to fully load
 * 3. Open browser DevTools  →  F12  →  Console tab
 * 4. Paste this entire script and hit Enter
 * 5. A CSV file downloads automatically — import it into Draft Lab via 17L → Import CSV
 *
 * SET CODE LIST (examples)
 *   DSK  Duskmourn      BLB  Bloomburrow     MH3  Modern Horizons 3
 *   OTJ  Thunder Jct    MKM  Karlov Manor    LCI  Lost Caverns
 *   WOE  Wilds Eldraine LTR  Lord of Rings   MOM  March Machine
 *   ONE  Phyrexia       BRO  Brothers War    DMU  Dominaria United
 */

(function () {
  // ── Locate card rows ────────────────────────────────────────────────────────
  // AetherHub DraftSensei renders each card as a block with:
  //   - A card name element
  //   - A "Pro Rating: X.X" label
  // We try multiple selector strategies to be resilient to layout changes.

  const results = [];
  const seen    = new Set();

  // Strategy 1: find all elements containing "Pro Rating"
  const allEls = Array.from(document.querySelectorAll('*'));
  for (const el of allEls) {
    // Only look at leaf/near-leaf nodes to avoid duplicates
    if (el.children.length > 5) continue;
    const txt = el.innerText || el.textContent || "";
    const match = txt.match(/Pro\s+Rating\s*[:\s]\s*(\d+\.?\d*)/i);
    if (!match) continue;

    const rating = parseFloat(match[1]);
    if (isNaN(rating) || rating < 0 || rating > 5) continue;

    // Walk up to find the card name — look for a sibling or ancestor with card text
    let name = null;
    let node = el;
    for (let i = 0; i < 8 && !name; i++) {
      node = node.parentElement;
      if (!node) break;
      // Card name is usually in an <a> tag or a heading inside the card block
      const anchor = node.querySelector('a[href*="/Card/"], a[href*="/card/"]');
      if (anchor) { name = anchor.innerText.trim(); break; }
      const heading = node.querySelector('h2,h3,h4,h5,.card-name,.cardname');
      if (heading) { name = heading.innerText.trim(); break; }
    }

    // Fallback: scan siblings for text that looks like a card name (no "Rating" keyword)
    if (!name) {
      const parent = el.parentElement;
      if (parent) {
        for (const sibling of parent.children) {
          const s = (sibling.innerText || "").trim();
          if (s && !s.match(/rating|comment|pro|score/i) && s.length < 80 && s.length > 1) {
            name = s;
            break;
          }
        }
      }
    }

    if (!name || seen.has(name)) continue;
    seen.add(name);
    results.push({ name, rating });
  }

  if (results.length === 0) {
    // Strategy 2: look for data attributes or JSON in page scripts
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    for (const s of scripts) {
      const m = s.textContent.matchAll(/"name"\s*:\s*"([^"]+)"[^}]*?"proRating"\s*:\s*(\d+\.?\d*)/g);
      for (const match of m) {
        const name = match[1].trim();
        const rating = parseFloat(match[2]);
        if (!seen.has(name) && rating >= 0 && rating <= 5) {
          seen.add(name);
          results.push({ name, rating });
        }
      }
    }
  }

  if (results.length === 0) {
    alert(
      "Could not find any ratings on this page.\n\n" +
      "Make sure you are on the DraftSensei page:\n" +
      "  https://aetherhub.com/Limited/DraftSensei/DSK\n\n" +
      "Wait for the page to fully load before running the script."
    );
    return;
  }

  // ── Sort and build CSV ──────────────────────────────────────────────────────
  results.sort((a, b) => b.rating - a.rating);

  const set  = (location.pathname.match(/\/([A-Z0-9]+)\/?$/) || [])[1] || "SET";
  const rows = ["Card Name,Rating", ...results.map(r => `"${r.name}",${r.rating}`)];
  const csv  = rows.join("\n");

  // ── Download ────────────────────────────────────────────────────────────────
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = Object.assign(document.createElement("a"), {
    href:     URL.createObjectURL(blob),
    download: `${set}_aetherhub_ratings.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log(`✓ Downloaded ${results.length} card ratings as ${set}_aetherhub_ratings.csv`);
  console.table(results.slice(0, 10));
})();
