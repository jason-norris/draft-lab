// Globals provided by template.html: SUPABASE_CONFIGURED, ALLOWED_EMAIL, sb, syncGrades, fetchGrades
const { useState, useEffect, useCallback } = React;

// ── Constants ────────────────────────────────────────────────────────────────
const MTG_LABELS   = { W:"White", U:"Blue", B:"Black", R:"Red", G:"Green", M:"Multicolor", C:"Colorless", L:"Land" };
const RARITY_COLORS = { common:"#888", uncommon:"#5599cc", rare:"#e8c020", mythic:"#e06020" };
const COLOR_ORDER  = { W:0, U:1, B:2, R:3, G:4, M:5, C:6, L:7 };
const RARITIES     = ["common","uncommon","rare","mythic"];
const GRADES       = ["A+","A","A-","B+","B","B-","C+","C","C-","D","F",""];
const GRADE_COLOR  = {
  "A+":"#00c853","A":"#43a047","A-":"#7cb342",
  "B+":"#c6d825","B":"#e6c800","B-":"#ffb300",
  "C+":"#fb8c00","C":"#f4511e","C-":"#e53935",
  "D":"#b71c1c","F":"#6a0000","":""
};
const GRADE_TIERS = [
  { tier:"A Range — The Bombs", rows:[
    ["A+","#00c853","#000","P1P1 always",    "Wins the game alone. Changes match outcomes regardless of your other cards. You build around it."],
    ["A", "#43a047","#000","P1P1 usually",   "Generates so much value or ends games that passing feels wrong. Doesn't need support to dominate."],
    ["A-","#7cb342","#000","Pick 1–2",        "Powerful and almost always impactful, but has a small catch — narrow color requirement, needs a board state, or slightly slow. Still first-pick most of the time."],
  ]},
  { tier:"B Range — The Backbone", rows:[
    ["B+","#c6d825","#000","Pick 1–3",  "A clear reason to be in a color. Wins games but not quite by itself. You're excited to get it."],
    ["B", "#e6c800","#000","Pick 2–5",  "Reliable, efficient, does what it says. Your deck is better for having it. Decides close games."],
    ["B-","#ffb300","#000","Pick 4–7",  "Good but needs something — the right archetype, a reasonable curve, or a board state where its mode matters."],
  ]},
  { tier:"C Range — The Filler", rows:[
    ["C+","#fb8c00","#fff","Pick 5–9",   "Slightly above-average filler. Pleased to have it, occasionally overperforms, fits most decks."],
    ["C", "#f4511e","#fff","Pick 7–12",  "Baseline playable. Does its job, won't embarrass you. Key question: would I be unhappy playing this? No."],
    ["C-","#e53935","#fff","Pick 10–14", "You'll play it if you have to. Too slow, too narrow, or slightly overcosted for what it does."],
  ]},
  { tier:"D Range — The Desperate Plays", rows:[
    ["D+","#b71c1c","#fff","Archetype only", "Only maindeck in a specific shell. Actively bad outside that context."],
    ["D", "#8b0000","#fff","Sideboard",       "Rarely maindeck. Maybe sideboard. You know when you put it in that you're in trouble."],
  ]},
  { tier:"F — Don't", rows:[
    ["F","#3a0000","#888","Never","Actively costs you games. So slow, narrow, or overcosted you'd rather run a land. Should be a rare call."],
  ]},
];

// ── localStorage store ───────────────────────────────────────────────────────
const store = {
  get: k => { try { const v = localStorage.getItem(k); return v ? { value: v } : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

// ── Utility functions ────────────────────────────────────────────────────────
function getColorKey(card) {
  const c = card.colors ?? card.card_faces?.[0]?.colors ?? [];
  if (!c.length) return card.type_line?.toLowerCase().includes("land") ? "L" : "C";
  return c.length > 1 ? "M" : c[0];
}

function getImageUrl(card) {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

function lsvColor(v) {
  if (v >= 4.5) return "#00c853";
  if (v >= 4.0) return "#43a047";
  if (v >= 3.5) return "#7cb342";
  if (v >= 3.0) return "#c6d825";
  if (v >= 2.5) return "#e6c800";
  if (v >= 2.0) return "#ffb300";
  if (v >= 1.5) return "#fb8c00";
  if (v >= 1.0) return "#f4511e";
  return "#e53935";
}

function calcDelta(myGrade, lsv) {
  if (!myGrade || lsv == null || lsv === "") return null;
  const delta = GRADES.indexOf(myGrade) - (1 - lsv / 5) * 10;
  return {
    label: delta < -0.5 ? "▲ Higher" : delta > 0.5 ? "▼ Lower" : "≈ Agree",
    color: delta < -0.5 ? "#32a050" : delta > 0.5 ? "#e05030" : "var(--dim)",
  };
}

function renderMana(cost) {
  if (!cost) return null;
  const tokens = cost.match(/\{[^}]+\}/g);
  if (!tokens) return <span>{cost}</span>;
  return (
    <span className="mana-syms">
      {tokens.map((token, i) => {
        const sym = token.slice(1, -1).replace(/\//g, "");
        return (
          <img key={i} src={`https://svgs.scryfall.io/card-symbols/${sym}.svg`}
            alt={token} title={token} className="mana-sym"
            onError={e => { e.target.style.display = "none"; }} />
        );
      })}
    </span>
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function timeAgo(ts) {
  if (!ts) return "";
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ── GradeSelect ──────────────────────────────────────────────────────────────
function GradeSelect({ cls, value, onChange }) {
  return (
    <select className={cls} value={value} onChange={onChange}
      style={{ color: GRADE_COLOR[value] || "var(--dimmer)" }}>
      {GRADES.map(g => (
        <option key={g} value={g} style={{ color: GRADE_COLOR[g] || "var(--txt)" }}>
          {g || "—"}
        </option>
      ))}
    </select>
  );
}

// ── MobileCardItem ───────────────────────────────────────────────────────────
function MobileCardItem({ card, grade, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [bigImg, setBigImg]     = useState(false);
  const ck  = getColorKey(card);
  const img = getImageUrl(card);
  const d   = calcDelta(grade.myGrade, grade.lsv);

  return (
    <div className={`mc mobile-only c${ck}`}>
      <div style={{ display:"flex" }}>
        <div className="mc-stripe" />
        <div className="mc-body">
          <div className="mc-top" onClick={() => { setExpanded(v => !v); setBigImg(false); }}>
            <div className="mc-info">
              <div className="mc-name">{card.name}</div>
              <div className="mc-meta">
                {card.type_line?.split("—")[0]?.trim()}
                {" · "}
                <span style={{ color: RARITY_COLORS[card.rarity], fontWeight:600 }}>
                  {card.rarity.charAt(0).toUpperCase()}
                </span>
                {card.mana_cost && <span> · {renderMana(card.mana_cost)}</span>}
              </div>
            </div>
            <div className="mc-right">
              <GradeSelect cls="mc-gsel" value={grade.myGrade || ""}
                onChange={e => { e.stopPropagation(); onUpdate("myGrade", e.target.value); }} />
              <span className="mc-chevron">{expanded ? "▴" : "▾"}</span>
            </div>
          </div>

          {expanded && (
            <div className="mc-expanded">
              {bigImg && img
                ? <img src={img} alt={card.name} className="mc-img-full" onClick={() => setBigImg(false)} />
                : (
                  <div className="mc-exp-inner">
                    {img && (
                      <div className="mc-img-wrap">
                        <img src={img} alt={card.name} className="mc-img" onClick={() => setBigImg(true)} />
                      </div>
                    )}
                    <div className="mc-controls">
                      <div className="mc-field">
                        <label>Sunset Grade</label>
                        <GradeSelect cls="mc-sel" value={grade.sunsetGrade || ""}
                          onChange={e => onUpdate("sunsetGrade", e.target.value)} />
                      </div>
                      <div className="mc-field">
                        <label>Community</label>
                        <input type="number" className="mc-num" min="0" max="5" step="0.5"
                          value={grade.lsv ?? ""}
                          onChange={e => onUpdate("lsv", e.target.value === "" ? "" : parseFloat(e.target.value))} />
                      </div>
                      {d && <div className="mc-delta" style={{ color: d.color }}>{d.label}</div>}
                      <div className="mc-field">
                        <label>Notes</label>
                        <textarea className="mc-note" placeholder="Notes…"
                          value={grade.notes || ""}
                          onChange={e => onUpdate("notes", e.target.value)} />
                      </div>
                    </div>
                  </div>
                )
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DraftLab ─────────────────────────────────────────────────────────────────
function DraftLab({ user }) {
  const isMobile = useIsMobile();

  // ── State ──
  const [theme, setTheme]           = useState(() => localStorage.getItem("draft-lab-theme") || "auto");
  const [show17l, setShow17l]       = useState(false);
  const [fmt17l, setFmt17l]         = useState("PremierDraft");
  const [msg17l, setMsg17l]         = useState("");
  const [meta17l, setMeta17l]       = useState(null);
  const [sets, setSets]             = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [cards, setCards]           = useState([]);
  const [grades, setGrades]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [loadMsg, setLoadMsg]       = useState("");
  const [error, setError]           = useState(null);
  const [sortCol, setSortCol]       = useState("color");
  const [sortDir, setSortDir]       = useState("asc");
  const [mobileSort, setMobileSort] = useState("color");
  const [filterColor, setFilterColor]   = useState("all");
  const [filterRarity, setFilterRarity] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterGraded, setFilterGraded] = useState("all");
  const [showMobF, setShowMobF]     = useState(false);
  const [showGuide, setShowGuide]   = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [showLegal, setShowLegal]   = useState(false);
  const [hovered, setHovered]       = useState(null);
  const [hoverPos, setHoverPos]     = useState({ x:0, y:0 });
  const [editingNote, setEditingNote] = useState(null);
  const [setSearch, setSetSearch]   = useState("");
  const [showSetDD, setShowSetDD]   = useState(false);

  // ── Effects ──
  useEffect(() => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetch("https://api.scryfall.com/sets")
      .then(r => r.json())
      .then(d => {
        const valid = d.data
          .filter(s => ["expansion","core","draft_innovation","masters","commander","duel_deck"].includes(s.set_type) && s.card_count > 0)
          .sort((a, b) => b.released_at?.localeCompare(a.released_at));
        setSets(valid);
      })
      .catch(() => setError("Could not reach Scryfall. Check your internet connection."));
  }, []);

  // Pull from Supabase when a set loads — must be after all state declarations
  useEffect(() => {
    if (!selectedSet || !user) return;
    fetchGrades(selectedSet.code).then(remote => {
      if (!remote) return;
      setGrades(prev => {
        const merged = { ...prev, ...remote };
        store.set(`draft-grades-${selectedSet.code}`, JSON.stringify(merged));
        return merged;
      });
    });
  }, [selectedSet?.code, user?.id]);

  // ── Helpers ──
  const toggleTheme = () => {
    setTheme(prev => {
      const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const currentlyDark = prev === "dark" || (prev === "auto" && sysDark);
      const next = currentlyDark ? "light" : "dark";
      localStorage.setItem("draft-lab-theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  };

  const loadGrades = code => {
    const r = store.get(`draft-grades-${code}`);
    setGrades(r ? JSON.parse(r.value) : {});
  };

  const persistGrades = useCallback((g, code) => {
    store.set(`draft-grades-${code}`, JSON.stringify(g));
    if (user) {
      setSyncStatus("syncing");
      syncGrades(code, g, user.id)
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus(""));
    }
  }, [user]);

  const load17lMeta = useCallback(code => {
    const r = store.get(`draft-17l-meta-${code}`);
    setMeta17l(r ? JSON.parse(r.value) : null);
  }, []);

  const import17LFromCSV = text => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) { setMsg17l("✗ File appears empty"); return; }
    const firstCols = lines[0].split(",").map(s => s.replace(/^"|"$/g, "").trim().toLowerCase());
    const startRow  = firstCols[0] === "card name" || firstCols[0] === "name" ? 1 : 0;
    const nameIdx   = firstCols.indexOf("card name") !== -1 ? firstCols.indexOf("card name") : firstCols.indexOf("name") !== -1 ? firstCols.indexOf("name") : 0;
    const ratingIdx = firstCols.indexOf("rating") !== -1 ? firstCols.indexOf("rating") : 1;
    const next = { ...grades };
    let matched = 0, skipped = 0;
    for (let i = startRow; i < lines.length; i++) {
      const cols   = lines[i].split(",").map(s => s.replace(/^"|"$/g, "").trim());
      const name   = cols[nameIdx];
      const rating = parseFloat(cols[ratingIdx]);
      if (!name || isNaN(rating) || rating < 0 || rating > 5) { skipped++; continue; }
      const card = cards.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!card) { skipped++; continue; }
      next[card.id] = { ...(next[card.id] ?? {}), lsv: Math.round(Math.max(0, Math.min(5, rating)) * 2) / 2, lsvSource: "17lands" };
      matched++;
    }
    if (matched === 0) { setMsg17l("✗ No cards matched — check the set is loaded"); return; }
    setGrades(next);
    persistGrades(next, selectedSet.code);
    const meta = { format: fmt17l, count: matched, importedAt: new Date().toISOString() };
    setMeta17l(meta);
    store.set(`draft-17l-meta-${selectedSet.code}`, JSON.stringify(meta));
    setMsg17l(`✓ ${matched} cards imported${skipped ? ` · ${skipped} unmatched` : ""}`);
  };

  const handle17LFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setMsg17l("Reading file…");
    const reader = new FileReader();
    reader.onload  = ev => import17LFromCSV(ev.target.result);
    reader.onerror = ()  => setMsg17l("✗ Could not read file");
    reader.readAsText(file);
    e.target.value = "";
  };

  const flush17L = () => {
    const next = {};
    for (const [id, g] of Object.entries(grades)) {
      if (g.lsvSource === "17lands") {
        const { lsv, lsvSource, lsvFormat, lsvSamples, lsvGIHWR, ...rest } = g;
        next[id] = rest;
      } else {
        next[id] = g;
      }
    }
    setGrades(next);
    persistGrades(next, selectedSet.code);
    try { localStorage.removeItem(`draft-17l-meta-${selectedSet.code}`); } catch {}
    setMeta17l(null);
    setMsg17l("");
  };

  const loadSet = async set => {
    setSelectedSet(set);
    setCards([]);
    setLoading(true);
    setError(null);
    setFilterColor("all"); setFilterRarity("all"); setFilterSearch(""); setFilterGraded("all");
    loadGrades(set.code);
    load17lMeta(set.code);
    let url = `https://api.scryfall.com/cards/search?q=set:${set.code}+game:paper&order=color&unique=cards`, all = [];
    try {
      while (url) {
        setLoadMsg(`Fetching cards… (${all.length})`);
        const res  = await fetch(url);
        const data = await res.json();
        if (data.object === "error") throw new Error(data.details);
        all = [...all, ...data.data];
        url = data.has_more ? data.next_page : null;
        if (url) await sleep(80);
      }
      setCards(all);
    } catch (e) {
      setError(`Failed: ${e.message}`);
    } finally {
      setLoading(false); setLoadMsg("");
    }
  };

  const updateGrade = (cardId, field, value) => {
    setGrades(prev => {
      const next = { ...prev, [cardId]: { ...(prev[cardId] ?? {}), [field]: value } };
      if (selectedSet) persistGrades(next, selectedSet.code);
      return next;
    });
  };

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const exportCSV = () => {
    const hdr  = ["Name","Color","Mana Cost","Type","Rarity","My Grade","LSV","Sunset","Notes"];
    const rows = sorted.map(c => {
      const g = grades[c.id] ?? {};
      return [`"${c.name}"`, getColorKey(c), `"${c.mana_cost ?? ""}"`, `"${c.type_line ?? ""}"`,
        c.rarity, g.myGrade ?? "", g.lsv ?? "", g.sunsetGrade ?? "",
        `"${(g.notes ?? "").replace(/"/g, '""')}"`].join(",");
    });
    const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type:"text/csv" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${selectedSet?.code ?? "mtg"}-grades.csv` }).click();
  };

  const exportBackup = () => {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("draft-grades-") || key.startsWith("draft-17l-meta-") || key === "draft-lab-theme")
        backup[key] = localStorage.getItem(key);
    }
    const meta = { exportedAt: new Date().toISOString(), version: 1, keys: Object.keys(backup).length };
    const blob = new Blob([JSON.stringify({ meta, data: backup }, null, 2)], { type:"application/json" });
    const d    = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `draft-lab-backup-${stamp}.json` }).click();
  };

  const importBackup = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const data   = parsed.data ?? parsed;
        let count = 0;
        for (const [key, value] of Object.entries(data)) {
          if ((key.startsWith("draft-grades-") || key.startsWith("draft-17l-meta-") || key === "draft-lab-theme") && typeof value === "string") {
            localStorage.setItem(key, value); count++;
          }
        }
        if (count === 0) { alert("No Draft Lab data found in that file."); return; }
        if (selectedSet) { loadGrades(selectedSet.code); load17lMeta(selectedSet.code); }
        const savedTheme = localStorage.getItem("draft-lab-theme");
        if (savedTheme) { setTheme(savedTheme); document.documentElement.setAttribute("data-theme", savedTheme); }
        alert(`Restored ${count} item${count !== 1 ? "s" : ""} from backup.`);
      } catch (e) { alert(`Could not read backup file: ${e.message}`); }
    };
    reader.readAsText(file);
  };

  // ── Derived ──
  const activeSort     = isMobile ? mobileSort : sortCol;
  const filteredSets   = sets.filter(s => s.name.toLowerCase().includes(setSearch.toLowerCase()) || s.code.toLowerCase().includes(setSearch.toLowerCase()));
  const clearFilters   = () => { setFilterColor("all"); setFilterRarity("all"); setFilterSearch(""); setFilterGraded("all"); };
  const hasFilters     = filterColor !== "all" || filterRarity !== "all" || filterSearch || filterGraded !== "all";
  const gradedCount    = cards.filter(c => grades[c.id]?.myGrade).length;
  const gradeCounts    = {};
  for (const g of Object.values(grades)) { if (g.myGrade) gradeCounts[g.myGrade] = (gradeCounts[g.myGrade] ?? 0) + 1; }
  const pct = cards.length ? Math.round(gradedCount / cards.length * 100) : 0;

  const filtered = cards.filter(c => {
    const ck = getColorKey(c);
    if (filterColor  !== "all" && ck !== filterColor) return false;
    if (filterRarity !== "all" && c.rarity !== filterRarity) return false;
    if (filterSearch && !c.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterGraded === "graded"   && !grades[c.id]?.myGrade) return false;
    if (filterGraded === "ungraded" &&  grades[c.id]?.myGrade) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ga = grades[a.id] ?? {}, gb = grades[b.id] ?? {};
    let av, bv;
    switch (activeSort) {
      case "color":   av = COLOR_ORDER[getColorKey(a)] * 100 + (a.cmc ?? 0); bv = COLOR_ORDER[getColorKey(b)] * 100 + (b.cmc ?? 0); break;
      case "name":    av = a.name;                   bv = b.name;                   break;
      case "cmc":     av = a.cmc ?? 0;               bv = b.cmc ?? 0;               break;
      case "rarity":  av = RARITIES.indexOf(a.rarity); bv = RARITIES.indexOf(b.rarity); break;
      case "myGrade": av = GRADES.indexOf(ga.myGrade || ""); bv = GRADES.indexOf(gb.myGrade || ""); break;
      case "lsv":     av = ga.lsv ?? 99;             bv = gb.lsv ?? 99;             break;
      default: return 0;
    }
    const dir = isMobile ? "asc" : sortDir;
    if (av < bv) return dir === "asc" ? -1 :  1;
    if (av > bv) return dir === "asc" ?  1 : -1;
    return 0;
  });

  // ── Render ──
  return (
    <div className="app" onClick={() => { setShowSetDD(false); setShow17l(false); }}>

      {/* ── Header ── */}
      <header className="hdr" onClick={e => e.stopPropagation()}>
        <div className="hdr-left">
          <div>
            <div className="logo">DRAFT LAB</div>
            <div className="logo-sub">MTG</div>
          </div>
          <div className="set-wrap">
            <button className="set-btn" onClick={() => setShowSetDD(v => !v)}>
              <span className="set-btn-label">
                {selectedSet
                  ? <>{selectedSet.name} <span style={{ color:"var(--dimmer)", fontSize:9 }}>· {selectedSet.code.toUpperCase()}</span></>
                  : "Select a Set"}
              </span>
              <span style={{ color:"var(--dim)", fontSize:10, flexShrink:0 }}>▾</span>
            </button>
            {showSetDD && (
              <div className="set-dropdown">
                <input autoFocus className="set-search" placeholder="Search sets…"
                  value={setSearch} onChange={e => setSetSearch(e.target.value)} />
                <div className="set-list">
                  {filteredSets.slice(0, 80).map(s => (
                    <div key={s.code}
                      className={`set-item${selectedSet?.code === s.code ? " current" : ""}`}
                      onClick={() => { loadSet(s); setShowSetDD(false); setSetSearch(""); }}>
                      <span className="si-name">{s.name}</span>
                      <span className="si-code">{s.code}</span>
                      <span className="si-date">{s.released_at?.slice(0, 7)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hdr-right">
          {selectedSet && isMobile && (
            <button className={`icon-btn${showMobF ? " active" : ""}`} onClick={() => setShowMobF(v => !v)}>⚙</button>
          )}
          {selectedSet && !isMobile && (
            <div className="l17-wrap" onClick={e => e.stopPropagation()}>
              <button className={`btn${show17l ? " active" : ""}`}
                onClick={() => { setShow17l(v => !v); setMsg17l(""); }}>17L ▾</button>
              {show17l && (
                <div className="l17-panel">
                  <div className="l17-title">17Lands · GIH Win Rate → 0–5</div>
                  <div className="l17-fmt">
                    {[["PremierDraft","Premier"],["QuickDraft","Quick"],["TradDraft","Trad"]].map(([val, lbl]) => (
                      <button key={val} className={fmt17l === val ? "active" : ""} onClick={() => setFmt17l(val)}>{lbl}</button>
                    ))}
                  </div>
                  <label className="l17-fetch" style={{ textAlign:"center", cursor:"pointer" }}>
                    Import CSV
                    <input type="file" accept=".csv,.txt" style={{ display:"none" }} onChange={handle17LFile} />
                  </label>
                  {msg17l && <div className="l17-msg">{msg17l}</div>}
                  {meta17l && (
                    <div className="l17-meta">
                      Last import: <strong>{meta17l.format === "PremierDraft" ? "Premier" : meta17l.format === "QuickDraft" ? "Quick" : "Trad"}</strong>
                      {" · "}{meta17l.count} cards{" · "}{timeAgo(meta17l.importedAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {selectedSet && meta17l && !isMobile && (
            <button className="btn" style={{ color:"var(--dimmer)", fontSize:9 }}
              onClick={() => { if (window.confirm(`Clear all 17Lands ratings for ${selectedSet.name}?`)) flush17L(); }}>
              Flush 17L
            </button>
          )}
          {user && syncStatus && <span className="sync-dot">{syncStatus === "syncing" ? "↑ Syncing…" : "✓ Synced"}</span>}
          {user && (
            <button className="btn" style={{ fontSize:9, color:"var(--dimmer)" }} title={user.email}
              onClick={() => sb.auth.signOut()}>Sign Out</button>
          )}
          <button className="icon-btn" onClick={() => setShowGuide(true)} title="Grade guide" style={{ fontSize:13, fontWeight:700 }}>?</button>
          <button className="icon-btn" onClick={() => setShowLegal(true)} title="Legal & Attribution" style={{ fontSize:11 }}>©</button>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle light/dark mode" style={{ fontSize:16, padding:"6px 10px" }}>
            {theme === "dark" ? "☀" : "🌙"}
          </button>
          <button className="btn" onClick={exportBackup} title="Export all grades to JSON">Backup</button>
          <label className="btn" style={{ cursor:"pointer" }} title="Restore grades from JSON backup">
            Restore
            <input type="file" accept=".json" style={{ display:"none" }}
              onChange={e => { importBackup(e.target.files[0]); e.target.value = ""; }} />
          </label>
          {selectedSet && <button className="btn" onClick={exportCSV}>CSV</button>}
        </div>
      </header>

      {/* ── Mobile filter drawer ── */}
      <div className="filters-mobile mobile-only" style={{ maxHeight: showMobF ? "380px" : "0" }}>
        {showMobF && (
          <div className="fm-inner">
            <div className="fm-row">
              <input className="fm-srch" placeholder="Search cards…"
                value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
              <select className="fm-sort" value={mobileSort} onChange={e => setMobileSort(e.target.value)}>
                <option value="color">Color → CMC</option>
                <option value="name">Name A–Z</option>
                <option value="cmc">Mana Cost</option>
                <option value="rarity">Rarity</option>
                <option value="myGrade">My Grade</option>
                <option value="lsv">LSV Score</option>
              </select>
            </div>
            <div className="fm-row">
              <span className="fl">Color:</span>
              {["all","W","U","B","R","G","M","C","L"].map(c => (
                <button key={c} className={`fb${filterColor === c ? " active" : ""}`} onClick={() => setFilterColor(c)}>
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
            <div className="fm-row">
              <span className="fl">Rarity:</span>
              {[["all","All"],["common","C"],["uncommon","U"],["rare","R"],["mythic","M"]].map(([full, abbr]) => (
                <button key={full}
                  className={`fb${filterRarity === full ? " active" : ""}`}
                  style={filterRarity === full && full !== "all" ? { color: RARITY_COLORS[full], borderColor: RARITY_COLORS[full]+"88" } : {}}
                  onClick={() => setFilterRarity(full)}>{abbr}</button>
              ))}
            </div>
            <div className="fm-row">
              <span className="fl">Show:</span>
              {["all","graded","ungraded"].map(g => (
                <button key={g} className={`fb${filterGraded === g ? " active" : ""}`} onClick={() => setFilterGraded(g)}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
              {hasFilters && <button className="btn" style={{ padding:"3px 10px" }} onClick={clearFilters}>Clear</button>}
            </div>
            {selectedSet && (
              <div style={{ borderTop:"1px solid var(--b1)", paddingTop:10, display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span className="fl">17Lands GIH → 0–5</span>
                  {meta17l && (
                    <span style={{ fontSize:10, color:"var(--gold2)" }}>
                      {meta17l.format === "PremierDraft" ? "Premier" : meta17l.format === "QuickDraft" ? "Quick" : "Trad"}
                      {" · "}{meta17l.count} cards{" · "}{timeAgo(meta17l.importedAt)}
                    </span>
                  )}
                </div>
                <div className="l17-fmt">
                  {[["PremierDraft","Premier"],["QuickDraft","Quick"],["TradDraft","Trad"]].map(([val, lbl]) => (
                    <button key={val} className={fmt17l === val ? "active" : ""} onClick={() => setFmt17l(val)}>{lbl}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <label className="l17-fetch" style={{ flex:1, textAlign:"center", cursor:"pointer" }}>
                    Import CSV
                    <input type="file" accept=".csv,.txt" style={{ display:"none" }} onChange={handle17LFile} />
                  </label>
                  {meta17l && (
                    <button className="btn" style={{ color:"var(--dimmer)", fontSize:9 }}
                      onClick={() => { if (window.confirm("Clear 17Lands ratings for this set?")) flush17L(); }}>Flush</button>
                  )}
                </div>
                {msg17l && <div className="l17-msg">{msg17l}</div>}
              </div>
            )}
            <div style={{ borderTop:"1px solid var(--b1)", paddingTop:10, display:"flex", gap:8 }}>
              <button className="l17-fetch" style={{ flex:1 }} onClick={exportBackup}>Export Backup</button>
              <label className="l17-fetch" style={{ flex:1, textAlign:"center", cursor:"pointer" }}>
                Import Backup
                <input type="file" accept=".json" style={{ display:"none" }}
                  onChange={e => { importBackup(e.target.files[0]); e.target.value = ""; setShowMobF(false); }} />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      {cards.length > 0 && (
        <>
          <div className="stats">
            <span className="stat"><span className="stat-v">{cards.length}</span> cards</span>
            <span className="stat"><span className="stat-v">{gradedCount}</span> graded</span>
            <span className="stat"><span className="stat-v">{pct}%</span></span>
            <span className="stat" style={{ color:"var(--b2)" }}>|</span>
            {GRADES.filter(g => g).map(g => gradeCounts[g]
              ? <span key={g} className="gp" style={{ background: GRADE_COLOR[g]+"22", color: GRADE_COLOR[g], border:`1px solid ${GRADE_COLOR[g]}55` }}>
                  {g} <span style={{ opacity:.75 }}>{gradeCounts[g]}</span>
                </span>
              : null
            )}
          </div>
          <div className="prog-bar"><div className="prog-fill" style={{ width:`${pct}%` }} /></div>
        </>
      )}

      {/* ── Desktop filters ── */}
      {cards.length > 0 && (
        <div className="filters-desktop desktop-only">
          <span className="fl">Color</span>
          {["all","W","U","B","R","G","M","C","L"].map(c => (
            <button key={c} className={`fb${filterColor === c ? " active" : ""}`} onClick={() => setFilterColor(c)}>
              {c === "all" ? "All" : MTG_LABELS[c]}
            </button>
          ))}
          <div className="divv" />
          <span className="fl">Rarity</span>
          {["all", ...RARITIES].map(r => (
            <button key={r}
              className={`fb${filterRarity === r ? " active" : ""}`}
              style={filterRarity === r && r !== "all" ? { color: RARITY_COLORS[r], borderColor: RARITY_COLORS[r]+"88" } : {}}
              onClick={() => setFilterRarity(r)}>
              {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          <div className="divv" />
          <span className="fl">Show</span>
          {["all","graded","ungraded"].map(g => (
            <button key={g} className={`fb${filterGraded === g ? " active" : ""}`} onClick={() => setFilterGraded(g)}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
          <div className="divv" />
          <input className="srch" placeholder="Search cards…"
            value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
          {hasFilters && <button className="btn" onClick={clearFilters}>Clear</button>}
          <span className="fl" style={{ marginLeft:"auto" }}>{sorted.length} shown</span>
        </div>
      )}

      {/* ── Empty / loading / error ── */}
      {(loading || error || cards.length === 0) && (
        <div className="center">
          {loading
            ? <><div className="spin" /><span>{loadMsg}</span></>
            : error
              ? <span style={{ color:"#e05030" }}>{error}</span>
              : <><div className="empty-title">Draft Lab</div><div className="empty-sub">Choose a set above to start evaluating cards</div></>
          }
        </div>
      )}

      {/* ── Desktop table ── */}
      {!loading && !error && cards.length > 0 && (
        <div className="tbl-wrap desktop-only">
          <table>
            <thead>
              <tr>
                {[["name","Card Name"],["cmc","Cost"],[null,"Type"],["rarity","Rarity"],["color","Color"],["myGrade","My Grade"],["lsv","Community"],[null,"Sunset"],[null,"Δ"],[null,"Notes"]].map(([col, lbl]) => (
                  <th key={lbl} className={col && sortCol === col ? "sorted" : ""}
                    onClick={() => col && handleSort(col)} style={!col ? { cursor:"default" } : {}}>
                    {lbl}{col && sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(card => {
                const g  = grades[card.id] ?? {};
                const ck = getColorKey(card);
                const d  = calcDelta(g.myGrade, g.lsv);
                return (
                  <tr key={card.id} className={`c${ck}`}
                    onMouseEnter={e => { setHovered(card); setHoverPos({ x: e.clientX, y: e.clientY }); }}
                    onMouseMove={e  =>   setHoverPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={()  =>  setHovered(null)}>
                    <td><div className="card-name">{card.name}</div></td>
                    <td><span className="mana">{card.mana_cost ? renderMana(card.mana_cost) : "—"}</span></td>
                    <td><span className="typ">{card.type_line?.split("—")[0]?.trim()}</span></td>
                    <td>
                      <span className="rar-dot" style={{ background: RARITY_COLORS[card.rarity], marginRight:5 }} />
                      <span style={{ fontSize:10, color:"var(--dim)" }}>{card.rarity.charAt(0).toUpperCase()}</span>
                    </td>
                    <td><span className="ctag" data-c={ck}>{MTG_LABELS[ck]}</span></td>
                    <td>
                      <GradeSelect cls="gsel" value={g.myGrade || ""}
                        onChange={e => updateGrade(card.id, "myGrade", e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="lsv-in" min="0" max="5" step="0.5"
                        value={g.lsv ?? ""}
                        style={g.lsv != null ? { color: lsvColor(g.lsv) } : {}}
                        onChange={e => updateGrade(card.id, "lsv", e.target.value === "" ? "" : parseFloat(e.target.value))} />
                      {g.lsvSource && <span className="src-badge">{g.lsvSource === "17lands" ? "17L" : "AH"}</span>}
                    </td>
                    <td>
                      <GradeSelect cls="gsel" value={g.sunsetGrade || ""}
                        onChange={e => updateGrade(card.id, "sunsetGrade", e.target.value)} />
                    </td>
                    <td>{d && <span className="delta" style={{ color: d.color }}>{d.label}</span>}</td>
                    <td>
                      <input type="text" className="note-in" placeholder="Notes…"
                        value={g.notes ?? ""}
                        onFocus={() => setEditingNote(card.id)}
                        onBlur={() => setEditingNote(null)}
                        onChange={e => updateGrade(card.id, "notes", e.target.value)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Mobile card list ── */}
      {!loading && !error && cards.length > 0 && (
        <div className="card-list mobile-only">
          {sorted.map(card => (
            <MobileCardItem key={card.id} card={card} grade={grades[card.id] ?? {}}
              onUpdate={(field, value) => updateGrade(card.id, field, value)} />
          ))}
        </div>
      )}

      {/* ── Hover preview (desktop only) ── */}
      {hovered && getImageUrl(hovered) && !isMobile && (
        <div className="preview" style={{ left: hoverPos.x + 16, top: Math.min(hoverPos.y - 60, window.innerHeight - 300) }}>
          <img src={getImageUrl(hovered)} alt={hovered.name} />
        </div>
      )}

      {/* ── Grade guide modal ── */}
      {showGuide && (
        <div className="guide-overlay" onClick={e => e.target === e.currentTarget && setShowGuide(false)}>
          <div className="guide-modal">
            <button className="guide-close" onClick={() => setShowGuide(false)}>Close</button>
            <div className="guide-h1">Grade Reference</div>
            <div className="guide-sub">Half-grade anchors for Limited evaluation</div>
            {GRADE_TIERS.map(({ tier, rows }) => (
              <div key={tier} className="guide-tier">
                <div className="guide-tier-hdr">{tier}</div>
                {rows.map(([grade, bg, fg, pick, desc]) => (
                  <div key={grade} className="guide-row">
                    <div className="guide-badge" style={{ background:bg, color:fg }}>{grade}</div>
                    <div className="guide-text">
                      <div className="guide-pick">{pick}</div>
                      <div className="guide-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div className="guide-anchors">
              <div className="guide-anchors-hdr">Tiebreaker Questions</div>
              <div className="guide-q"><strong>A- vs B+:</strong> Does this card win me the game by itself, or does it need help to close?</div>
              <div className="guide-q"><strong>B- vs C+:</strong> Am I glad I have this, or am I just fine with it?</div>
              <div className="guide-q"><strong>C vs C-:</strong> Would I actively try to avoid playing this if I had another option?</div>
              <div className="guide-q" style={{ marginBottom:0 }}><strong>D+ vs D:</strong> Is there a real archetype this belongs in, or am I theorycrafting?</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Legal modal ── */}
      {showLegal && (
        <div className="guide-overlay" onClick={e => e.target === e.currentTarget && setShowLegal(false)}>
          <div className="guide-modal">
            <button className="guide-close" onClick={() => setShowLegal(false)}>Close</button>
            <div className="guide-h1">Legal & Attribution</div>
            <div className="guide-desc" style={{ marginBottom:16 }}>
              Draft Lab is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy.
              Not approved or endorsed by Wizards of the Coast. Portions of the materials used are property
              of Wizards of the Coast. ©Wizards of the Coast LLC.
            </div>
            <div className="guide-desc" style={{ marginBottom:16 }}>
              Card data and images provided by Scryfall (scryfall.com). Game performance data from 17Lands
              public datasets (17lands.com), used for personal non-commercial purposes per their usage
              guidelines. Pre-release ratings sourced from AetherHub and Nizzahon Magic for personal use.
            </div>
            <div className="guide-desc">This project is not affiliated with or endorsed by any of the above.</div>
            <div className="guide-desc" style={{ marginTop:16, color:"var(--dimmer)", fontSize:10 }}>
              Draft Lab source code is released under the MIT License.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LoginScreen ───────────────────────────────────────────────────────────────
function LoginScreen({ email, setEmail, sent, sending, onSend }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="logo">DRAFT LAB</div>
        <div className="logo-sub">MTG</div>
        {sent
          ? <div className="auth-sent">✓ Check your email for a login link.</div>
          : <>
              <div className="auth-label">Email</div>
              <input className="auth-input" type="email" placeholder="you@example.com"
                value={email} autoFocus
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && email && !sending) onSend(); }} />
              <button className="auth-btn" disabled={!email || sending} onClick={onSend}>
                {sending ? "Sending…" : "Send Magic Link"}
              </button>
            </>
        }
      </div>
    </div>
  );
}

// ── AuthGate ──────────────────────────────────────────────────────────────────
function AuthGate() {
  const [user, setUser]           = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail]         = useState("");
  const [sent, setSent]           = useState(false);
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) { setAuthLoading(false); return; }
    sb.auth.getSession()
      .then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthLoading(false); })
      .catch(() => setAuthLoading(false));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u && ALLOWED_EMAIL !== "%%ALLOWED_EMAIL%%" && u.email !== ALLOWED_EMAIL) {
        sb.auth.signOut(); return;
      }
      setUser(u);
    });
    return () => subscription.unsubscribe();
  }, []);

  const sendMagicLink = async () => {
    setSending(true);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setSending(false);
    if (!error) setSent(true);
  };

  if (authLoading) return <div className="center"><div className="spin" /></div>;
  if (!SUPABASE_CONFIGURED) return <DraftLab user={null} />;
  if (!user) return <LoginScreen email={email} setEmail={setEmail} sent={sent} sending={sending} onSend={sendMagicLink} />;
  return <DraftLab user={user} />;
}

// ── Mount ─────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(<AuthGate />);
