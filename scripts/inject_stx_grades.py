"""
inject_stx_grades.py
Reads the backup JSON and MyTierList.xlsx, matches STX Sunrise grades by card name,
and produces a modified backup JSON with myGrade injected.
Run from apps/web/data/ directory.
"""
import json, time, csv, io, requests, os
import openpyxl

# ── Step 1: Fetch STX card list from Scryfall (cached) ───────────────────────
CACHE = "_stx_scryfall_cache.json"
if os.path.exists(CACHE):
    print("Loading STX cards from cache...")
    with open(CACHE) as f:
        id_to_name = json.load(f)
    print(f"  {len(id_to_name)} STX cards (cached)")
else:
    print("Fetching STX cards from Scryfall...")
    url = "https://api.scryfall.com/cards/search"
    params = {"q": "set:stx game:paper", "unique": "cards"}
    id_to_name = {}
    while url:
        r = requests.get(url, params=params)
        data = r.json()
        for c in data["data"]:
            id_to_name[c["id"]] = c["name"]
        url = data.get("next_page")
        params = None
        if url:
            time.sleep(0.15)
    with open(CACHE, "w") as f:
        json.dump(id_to_name, f)
    print(f"  {len(id_to_name)} STX cards from Scryfall (saved to cache)")

name_to_id = {v.lower(): k for k, v in id_to_name.items()}
# Also index front face of DFCs
for name, cid in list(name_to_id.items()):
    if " // " in name:
        front = name.split(" // ")[0].strip().lower()
        if front not in name_to_id:
            name_to_id[front] = cid

# Manual corrections: spreadsheet typos → correct Scryfall names (confirmed by user)
CORRECTIONS = {
    "devistating mastery":                                          "Devastating Mastery",
    "kianne, dean fo substance // imbraham, dean of theory":        "Kianne, Dean of Substance // Imbraham, Dean of Theory",
    "shalie, dean of radiance // embrose, dean of shadow":          "Shaile, Dean of Radiance // Embrose, Dean of Shadow",
    "poet's quil":                                                  "Poet's Quill",
    "pillardrop rescue":                                            "Pillardrop Rescuer",
    "reflective hulk":                                              "Reflective Golem",
    "silverquill aristocan't":                                      "Silverquill Aristocrat",
    "silverquill bully":                                            "Silverquill Silencer",
    "spectre of the fens":                                          "Specter of the Fens",
    "search for blex":                                              "Blex, Vexing Pest // Search for Blex",
}

print(f"  {len(id_to_name)} STX cards from Scryfall")

# ── Step 2: Load backup JSON ─────────────────────────────────────────────────
print("Loading backup JSON...")
with open("draft-lab-backup-20260516.json") as f:
    backup = json.load(f)
stx_grades = json.loads(backup["data"]["draft-grades-stx"])

# Build name -> card_id from backup (using Scryfall names)
backup_name_to_id = {}
for cid in stx_grades:
    if cid in id_to_name:
        full_name = id_to_name[cid].lower()
        backup_name_to_id[full_name] = cid
        # Also index DFC front face
        if " // " in full_name:
            front = full_name.split(" // ")[0].strip()
            backup_name_to_id[front] = cid
print(f"  {len(stx_grades)} STX card entries in backup, {len(backup_name_to_id)} with known names")

# ── Step 3: Read STX Sunrise grades from spreadsheet ────────────────────────
print("Reading STX Sunrise grades from MyTierList.xlsx...")
wb = openpyxl.load_workbook("MyTierList.xlsx", data_only=True)
ws = wb["STX"]

# Header row is row 7 (index 6): #, Color, A, CMC, Mana, Card Name, Card Type,
# Early, _, Ahead, _, Parity, _, Behind, _, _, _, Avg, Sunrise, Sunset, ...
# Col indices (0-based): 5=Card Name, 18=Sunrise, 7=Early, 9=Ahead, 11=Parity, 13=Behind

spreadsheet_grades = {}
for row in ws.iter_rows(min_row=8, values_only=True):
    name = row[5]
    sunrise = row[18]
    early   = row[7]
    ahead   = row[9]
    parity  = row[11]
    behind  = row[13]
    if not name or not sunrise:
        continue
    spreadsheet_grades[str(name).strip()] = {
        "sunrise": str(sunrise).strip(),
        "quadrants": f"Q: {early}/{ahead}/{parity}/{behind}"
    }

print(f"  {len(spreadsheet_grades)} cards with Sunrise grades in spreadsheet")

# ── Step 4: Match and report ─────────────────────────────────────────────────
print("\nMatching...")
matched = {}
unmatched = []

for sp_name, grades in spreadsheet_grades.items():
    sp_lower = sp_name.lower()

    # Apply manual correction if available
    corrected_name  = CORRECTIONS.get(sp_lower, sp_name)
    corrected_lower = corrected_name.lower()

    # Try backup first
    cid = backup_name_to_id.get(corrected_lower)
    if not cid:
        # Try front face
        front = corrected_lower.split(" // ")[0].strip() if " // " in corrected_lower else corrected_lower
        cid = backup_name_to_id.get(front)

    if cid:
        matched[cid] = {"name": corrected_name, "original": sp_name, "new_entry": False, **grades}
    else:
        # Card not in backup — look up in Scryfall and mark for adding
        scryfall_cid = name_to_id.get(corrected_lower)
        if not scryfall_cid:
            front = corrected_lower.split(" // ")[0].strip() if " // " in corrected_lower else corrected_lower
            scryfall_cid = name_to_id.get(front)
        if scryfall_cid:
            matched[scryfall_cid] = {"name": corrected_name, "original": sp_name, "new_entry": True, **grades}
        else:
            unmatched.append(f"{sp_name}  (corrected: {corrected_name})" if corrected_name != sp_name else sp_name)

print(f"  Matched:   {len(matched)}")
print(f"  Unmatched: {len(unmatched)}")
if unmatched:
    print("\nUnmatched card names (review before proceeding):")
    for n in sorted(unmatched):
        print(f"    {n}")

# ── Step 5: Show sample of matches for verification ──────────────────────────
print("\nSample matches (verify these look correct):")
count = 0
for cid, info in list(matched.items())[:10]:
    scryfall_name = id_to_name.get(cid, "?")
    existing = stx_grades.get(cid, {})
    print(f"  Spreadsheet: '{info['name']}'")
    print(f"  Scryfall:    '{scryfall_name}'  (ID: {cid[:8]}...)")
    print(f"  Sunrise:     {info['sunrise']}  {info['quadrants']}")
    print(f"  Existing myGrade: {existing.get('myGrade', '(none)')}")
    print()
    count += 1
    if count >= 5:
        break

print("="*60)
print("Review the above. If correct, run with --apply to write the modified backup.")
print("="*60)

# ── Step 6: Apply if --apply flag given ──────────────────────────────────────
import sys
if "--apply" in sys.argv:
    print("\nApplying grades...")
    preserved = 0
    injected = 0
    added_new = 0
    for cid, info in matched.items():
        existing = stx_grades.get(cid, {})
        if existing.get("myGrade"):
            # Already has a live grade — preserve it, append quadrant context to notes
            if info["quadrants"] and info["quadrants"] not in (existing.get("notes") or ""):
                existing["notes"] = (f"{info['quadrants']} | " + (existing.get("notes") or "")).strip(" | ")
            preserved += 1
        else:
            existing["myGrade"] = info["sunrise"]
            existing["notes"] = info["quadrants"]
            injected += 1
        stx_grades[cid] = existing
        if info.get("new_entry"):
            added_new += 1

    backup["data"]["draft-grades-stx"] = json.dumps(stx_grades)
    out_file = "draft-lab-backup-20260516-stx-grades.json"
    with open(out_file, "w") as f:
        json.dump(backup, f, indent=2)

    print(f"  Injected {injected} Sunrise grades into existing cards")
    print(f"  Added {added_new} new card entries (DFCs not previously in backup)")
    print(f"  Preserved {preserved} existing myGrade entries (quadrant notes appended)")
    print(f"\nSaved to: {out_file}")
    print("Restore this file in Draft Lab via Export → Restore Backup (JSON)")
