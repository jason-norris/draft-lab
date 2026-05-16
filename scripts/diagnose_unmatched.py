import requests, time

url = "https://api.scryfall.com/cards/search"
params = {"q": "set:stx game:paper", "unique": "cards"}
all_names = set()
front_names = {}  # front_face -> full_name

while url:
    r = requests.get(url, params=params)
    data = r.json()
    for c in data["data"]:
        all_names.add(c["name"].lower())
        if " // " in c["name"]:
            front = c["name"].split(" // ")[0].strip().lower()
            front_names[front] = c["name"]
    url = data.get("next_page")
    params = None
    if url:
        time.sleep(0.08)

print(f"Scryfall STX cards: {len(all_names)}\n")

unmatched = [
    "Augmenter Pugilist // Echoing Equation",
    "Blex, Vexing Pest",
    "Codie, Vociferous Codex",
    "Devistating Mastery",
    "Dina, Soul Steeper",
    "Extus, Oriq Overlord // Awaken the Blood Avatar",
    "Flamescroll Celebrant // Revel in Silence",
    "Jadzi, Oracle of Arcavios // Journey to the Oracle",
    "Kasmina, Enigma Sage",
    "Kianne, Dean fo Substance // Imbraham, Dean of Theory",
    "Killian, Ink Duelist",
    "Mavinda, Students' Advocate",
    "Mila, Crafty Companion // Lukka, Wayward Bonder",
    "Pestilent Cauldron // Restorative Burst",
    "Pillardrop Rescue",
    "Plargg, Dean of Chaos // Augusta, Dean of Order",
    "Poet's Quil",
    "Quintorius, Field Historian",
    "Reflective Hulk",
    "Rootha, Mercurial Artist",
    "Rowan, Scholar of Sparks // Will, Scholar of Frost",
    "Search for Blex",
    "Selfless Glyphweaver // Deadly Vanity",
    "Shalie, Dean of Radiance // Embrose, Dean of Shadow",
    "Silverquill AristoCAN'T",
    "Silverquill Bully",
    "Spectre of the Fens",
    "Torrent Sculptor // Flamethrower Sonata",
    "Uvilda, Dean of Perfection // Nassari, Dean of Expression",
    "Valentin, Dean of the Vein // Lisette, Dean of the Root",
    "Wandering Archaic // Explore the Vastlands",
    "Zimone, Quandrix Prodigy",
]

for n in unmatched:
    nl = n.lower()
    front = nl.split(" // ")[0].strip() if " // " in nl else nl
    if nl in all_names:
        print(f"  TYPO/NOT-IN-BACKUP : {n}")
    elif front in front_names:
        print(f"  DFC FRONT MATCHES  : {n}  ->  Scryfall: '{front_names[front]}'")
    elif front in all_names:
        print(f"  FRONT IN SCRYFALL  : {n}")
    else:
        # Fuzzy check
        candidates = [s for s in all_names if any(w in s for w in front.split(",")[0].split()[:2])]
        print(f"  NOT FOUND          : {n}  (candidates: {candidates[:2]})")
