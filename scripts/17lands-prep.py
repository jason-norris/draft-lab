#!/usr/bin/env python3
"""
17lands-prep.py  —  Process 17Lands public game data into a Draft Lab import CSV.

USAGE
  python 17lands-prep.py DSK                      # Premier Draft, auto-download
  python 17lands-prep.py DSK TradDraft            # Traditional Draft
  python 17lands-prep.py DSK PremierDraft file.csv.gz  # use local file

FORMAT OPTIONS
  PremierDraft (default)  QuickDraft  TradDraft  Sealed

OUTPUT
  DSK_PremierDraft_ratings.csv  →  import into Draft Lab via 17L → Import CSV

HOW IT WORKS
  - Downloads game_data_public.{SET}.{FORMAT}.csv.gz from 17Lands S3 bucket
  - Streams the CSV to keep memory reasonable for large sets
  - Calculates GIH Win Rate (Games In Hand — the most signal-rich metric)
  - Normalizes to 0–5 scale using z-score (mean=2.5, ±2 SD spans the full range)
  - Requires at least 200 samples per card to filter early-set noise
"""

import sys, gzip, csv, math, io, os, time
from collections import defaultdict
from urllib.request import urlopen, Request

# ── Args ──────────────────────────────────────────────────────────────────────
def usage():
    print(__doc__)
    sys.exit(1)

SET_CODE   = sys.argv[1].upper() if len(sys.argv) > 1 else None
if not SET_CODE:
    usage()

FORMAT     = sys.argv[2] if len(sys.argv) > 2 else "PremierDraft"
LOCAL_FILE = sys.argv[3] if len(sys.argv) > 3 else None

FORMAT_MAP = {
    "premier":      "PremierDraft",
    "premierdraft": "PremierDraft",
    "trad":         "TradDraft",
    "traditional":  "TradDraft",
    "traddraft":    "TradDraft",
    "quick":        "QuickDraft",
    "quickdraft":   "QuickDraft",
    "sealed":       "Sealed",
}
FORMAT = FORMAT_MAP.get(FORMAT.lower(), FORMAT)

S3_BASE = "https://17lands-public.s3.amazonaws.com/analysis_data/game_data"
S3_URL  = f"{S3_BASE}/game_data_public.{SET_CODE}.{FORMAT}.csv.gz"
OUT_CSV = f"{SET_CODE}_{FORMAT}_ratings.csv"
MIN_SAMPLES = 200

print(f"\n{'='*58}")
print(f"  17Lands Prep  |  {SET_CODE} {FORMAT}")
print(f"{'='*58}")

# ── Load ──────────────────────────────────────────────────────────────────────
if LOCAL_FILE:
    if not os.path.exists(LOCAL_FILE):
        print(f"File not found: {LOCAL_FILE}")
        sys.exit(1)
    print(f"\nReading local file: {LOCAL_FILE}")
    with open(LOCAL_FILE, "rb") as f:
        raw = f.read()
    print(f"  {len(raw)/1024/1024:.1f} MB read")
else:
    print(f"\nDownloading from 17Lands S3...")
    print(f"  {S3_URL}\n")
    try:
        req = Request(S3_URL, headers={"User-Agent": "DraftLab-prep/1.0"})
        with urlopen(req, timeout=180) as resp:
            total      = int(resp.headers.get("Content-Length", 0))
            chunks     = []
            downloaded = 0
            t0         = time.time()
            while True:
                chunk = resp.read(512 * 1024)
                if not chunk:
                    break
                chunks.append(chunk)
                downloaded += len(chunk)
                elapsed = time.time() - t0
                speed   = downloaded / elapsed / 1024 / 1024 if elapsed > 0 else 0
                if total:
                    pct = downloaded / total * 100
                    bar = "#" * int(pct / 4)
                    print(f"  [{bar:<25}] {pct:5.1f}%  {speed:.1f} MB/s", end="\r")
                else:
                    print(f"  {downloaded/1024/1024:.0f} MB  {speed:.1f} MB/s", end="\r")
            raw = b"".join(chunks)
            print(f"\n  Done — {len(raw)/1024/1024:.1f} MB in {time.time()-t0:.0f}s")
    except Exception as e:
        print(f"\n  Download failed: {e}")
        print(f"\n  You can download the file manually from:")
        print(f"    {S3_URL}")
        print(f"  Then run:")
        print(f"    python 17lands-prep.py {SET_CODE} {FORMAT} <downloaded_file.csv.gz>")
        sys.exit(1)

# ── Decompress ────────────────────────────────────────────────────────────────
print("\nDecompressing...")
t0 = time.time()
try:
    text = gzip.decompress(raw).decode("utf-8")
except Exception as e:
    print(f"  Decompression failed: {e}")
    sys.exit(1)
del raw
print(f"  {len(text)/1024/1024:.1f} MB uncompressed in {time.time()-t0:.0f}s")

# ── Identify card columns ─────────────────────────────────────────────────────
print("\nScanning column headers...")
text       = text.replace('\x00', '')  # strip NUL bytes present in some older 17Lands files
reader     = csv.DictReader(io.StringIO(text))
fieldnames = reader.fieldnames or []

print(f"  {len(fieldnames)} total columns found")

# Detect file type by column prefix
oh_cols    = [f for f in fieldnames if f.startswith("opening_hand_")]
drawn_cols = [f for f in fieldnames if f.startswith("drawn_")]
pack_cols  = [f for f in fieldnames if f.startswith("pack_card_")]

if oh_cols or drawn_cols:
    file_type = "game"
    oh_names   = {f[len("opening_hand_"):] for f in oh_cols}
    drw_names  = {f[len("drawn_"):] for f in drawn_cols}
    card_names = oh_names | drw_names
    print(f"  File type: GAME DATA ({len(card_names)} cards)")
elif pack_cols:
    print()
    print("  *** WRONG FILE TYPE ***")
    print("  You downloaded DRAFT data, not GAME data.")
    print("  GIH Win Rate requires the game data file.")
    print()
    print("  Download the correct file from 17Lands:")
    print(f"    https://17lands-public.s3.amazonaws.com/analysis_data/game_data/game_data_public.{SET_CODE}.{FORMAT}.csv.gz")
    print()
    print("  Then re-run:")
    print(f"    python 17lands-prep.py {SET_CODE} {FORMAT} game_data_public.{SET_CODE}.{FORMAT}.csv.gz")
    sys.exit(1)
else:
    print()
    print("  No recognised card columns found.")
    print(f"  First 20 columns in your file:")
    for col in fieldnames[:20]:
        print(f"    {col}")
    print()
    print("  Expected columns starting with 'opening_hand_' or 'drawn_'")
    print("  Make sure you downloaded a GAME data file, not draft or replay data:")
    print(f"    https://17lands-public.s3.amazonaws.com/analysis_data/game_data/game_data_public.{SET_CODE}.{FORMAT}.csv.gz")
    sys.exit(1)

# ── Stream parse ──────────────────────────────────────────────────────────────
print(f"\nCalculating GIH Win Rate across all games...")
print(f"  (min {MIN_SAMPLES} samples required per card)")

gih_count  = defaultdict(int)
gih_wins   = defaultdict(int)
n_games    = 0
parse_errs = 0
t0         = time.time()

for row in reader:
    try:
        won = row.get("won", "").strip().lower() in ("true", "1", "yes")
    except Exception:
        parse_errs += 1
        continue

    n_games += 1
    if n_games % 250_000 == 0:
        elapsed = time.time() - t0
        print(f"  {n_games:,} games  {elapsed:.0f}s", end="\r")

    for name in card_names:
        oh  = row.get(f"opening_hand_{name}", "") or "0"
        drw = row.get(f"drawn_{name}",        "") or "0"
        try:
            in_hand = int(oh) + int(drw)
        except ValueError:
            continue
        if in_hand > 0:
            gih_count[name] += 1
            if won:
                gih_wins[name] += 1

elapsed = time.time() - t0
print(f"  {n_games:,} games processed in {elapsed:.0f}s")
if parse_errs:
    print(f"  {parse_errs} rows skipped due to parse errors")
del text

# ── Compute GIH WR ────────────────────────────────────────────────────────────
results = [
    (name, gih_wins[name] / gih_count[name], gih_count[name])
    for name, count in gih_count.items()
    if count >= MIN_SAMPLES
]
n_dropped = len(gih_count) - len(results)

print(f"\n  {len(results)} cards with >={MIN_SAMPLES} samples")
if n_dropped:
    print(f"  {n_dropped} cards dropped (insufficient data)")

if len(results) < 10:
    print("  Too few cards qualify. Try a more popular set/format, or lower MIN_SAMPLES.")
    sys.exit(1)

# ── Normalize to 0–5 ─────────────────────────────────────────────────────────
rates = [r[1] for r in results]
mean  = sum(rates) / len(rates)
var   = sum((r - mean) ** 2 for r in rates) / len(rates)
std   = math.sqrt(var) if var > 0 else 1.0

print(f"  GIH WR mean={mean*100:.2f}%  std={std*100:.2f}%")

def to_score(gih_wr):
    """z-score → 0–5 scale. z=+2→5.0, z=0→2.5, z=-2→0.0, rounded to 0.5."""
    z   = (gih_wr - mean) / std
    raw = 2.5 + z * 1.25
    return round(max(0.0, min(5.0, raw)) * 2) / 2

# ── Write CSV ─────────────────────────────────────────────────────────────────
results.sort(key=lambda x: -x[1])

with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["Card Name", "Rating", "GIH WR %", "Samples"])
    for name, gih_wr, count in results:
        w.writerow([name, to_score(gih_wr), f"{gih_wr*100:.2f}", count])

# Summary
scores = [to_score(r[1]) for r in results]
dist   = {s: scores.count(s) for s in sorted(set(scores), reverse=True)}
print(f"\n  Score distribution:")
for score, count in dist.items():
    bar = "#" * min(count, 40)
    print(f"    {score:.1f}  {bar} {count}")

print(f"\n{'='*58}")
print(f"  Output: {OUT_CSV}  ({len(results)} cards)")
print(f"{'='*58}")
print(f"\n  Next step:")
print(f"    Open Draft Lab -> Settings (mobile) or Import (desktop)")
print(f"    -> Import CSV -> select  {OUT_CSV}")
print()
