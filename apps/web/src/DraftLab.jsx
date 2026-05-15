// Globals provided by template.html: SUPABASE_CONFIGURED, ALLOWED_EMAIL, sb, syncGrades, fetchGrades
const { useState, useEffect, useCallback, useRef } = React;
const VERSION = "v2.2";

// ── Constants ────────────────────────────────────────────────────────────────
const MTG_LABELS   = { W:"White", U:"Blue", B:"Black", R:"Red", G:"Green", M:"Multicolor", C:"Colorless", L:"Land" };
const RARITY_COLORS = { common:"#888", uncommon:"#5599cc", rare:"#e8c020", mythic:"#e06020" };
const COLOR_ORDER  = { W:0, U:1, B:2, R:3, G:4, M:5, C:6, L:7 };
const RARITIES     = ["common","uncommon","rare","mythic"];
const GRADES       = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","F",""];
const GRADE_COLOR  = {
  "A+":"#00c853","A":"#43a047","A-":"#7cb342",
  "B+":"#c6d825","B":"#e6c800","B-":"#ffb300",
  "C+":"#fb8c00","C":"#f4511e","C-":"#e53935",
  "D+":"#c62828","D":"#b71c1c","F":"#6a0000","":""
};
// Numeric value for a letter grade (A+=5.0 … F=0.0), used for delta math
const GRADE_NUMERIC = {
  "A+":5.0,"A":4.67,"A-":4.33,
  "B+":4.0,"B":3.67,"B-":3.33,
  "C+":3.0,"C":2.67,"C-":2.33,
  "D+":2.0,"D":1.67,"F":0.0
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

// ── Tag vocabulary ───────────────────────────────────────────────────────────
const TAGS = [
  { id:"sleeper",        label:"Sleeper",       group:"eval" },
  { id:"overrated",      label:"Overrated",     group:"eval" },
  { id:"uncertain",      label:"Uncertain",     group:"eval" },
  { id:"removal",        label:"Removal",       group:"role" },
  { id:"finisher",       label:"Finisher",      group:"role" },
  { id:"tempo",          label:"Tempo",         group:"role" },
  { id:"card-draw",      label:"Card Draw",     group:"role" },
  { id:"enabler",        label:"Enabler",       group:"role" },
  { id:"build-around",   label:"Build-Around",  group:"role" },
  { id:"archetype-only", label:"Arch Only",     group:"context" },
  { id:"filler",         label:"Filler",        group:"context" },
];
const TAG_GROUPS = [
  { label:"Evaluation", ids:["sleeper","overrated","uncertain"] },
  { label:"Card Role",  ids:["removal","finisher","tempo","card-draw","enabler","build-around"] },
  { label:"Context",    ids:["archetype-only","filler"] },
];

// Source labels and colors for badges
const SOURCE_LABEL = { "17lands":"17L", "aetherhub":"AH", "manual":"MAN" };
const SOURCE_COLOR = { "17lands":"var(--gold2)", "aetherhub":"#5599cc", "manual":"var(--dimmer)" };

// ── localStorage store ───────────────────────────────────────────────────────
const store = {
  get: k => { try { const v = localStorage.getItem(k); return v ? { value: v } : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

// ── Data migration ────────────────────────────────────────────────────────────
// Migrates old lsv/lsvSource fields → expert_rating / performance_rating
function migrateGrade(g) {
  if (!g || (g.expert_rating != null || g.performance_rating != null)) return g;
  if (g.lsv == null) return g;
  const migrated = { ...g };
  if (g.lsvSource === "17lands") {
    migrated.performance_rating = g.lsv;
    migrated.performance_source = "17lands";
  } else {
    migrated.expert_rating = g.lsv;
    migrated.expert_source = g.lsvSource || "manual";
  }
  // Keep lsv for backward compat but don't use it for display
  return migrated;
}
function migrateGrades(grades) {
  const out = {};
  for (const [id, g] of Object.entries(grades)) out[id] = migrateGrade(g);
  return out;
}

// ── Utility functions ────────────────────────────────────────────────────────
function getColorKey(card) {
  const c = card.colors ?? card.card_faces?.[0]?.colors ?? [];
  if (!c.length) return card.type_line?.toLowerCase().includes("land") ? "L" : "C";
  return c.length > 1 ? "M" : c[0];
}

function getImageUrl(card) {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

function ratingColor(v) {
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

// Convert a letter grade to numeric for delta math
function gradeToNum(grade) { return GRADE_NUMERIC[grade] ?? null; }

// Compare two 0–5 rating values; returns indicator object or null
function compareRatings(a, b) {
  if (a == null || b == null) return null;
  const diff = Math.abs(a - b);
  const sym  = diff === 0 ? "≈" : a > b ? "▲" : "▼";
  const detail = `${sym === "≈" ? "Agree" : sym === "▲" ? "Higher" : "Lower"} (Δ ${diff.toFixed(1)})`;
  if (diff <= 0.5) return { symbol:"≈", color:"#32a050", detail };
  if (diff <= 1.0) return { symbol: sym, color:"#e6c800", detail };
  return             { symbol: sym, color:"#e05030", detail };
}

// Three-way delta for a grade object
function calcThreeWayDelta(g) {
  const me   = gradeToNum(g.myGrade);
  const exp  = g.expert_rating ?? null;
  const perf = g.performance_rating ?? null;
  return {
    meVsExp:  compareRatings(me, exp),
    meVsPerf: compareRatings(me, perf),
    expVsPerf:compareRatings(exp, perf),
  };
}

// Quadrant classification — requires all three values populated
function calcQuadrant(g) {
  const me   = gradeToNum(g.myGrade);
  const exp  = g.expert_rating ?? null;
  const perf = g.performance_rating ?? null;
  if (me == null || exp == null || perf == null) return null;
  const THRESH = 0.75;
  const meExpAgree  = Math.abs(me - exp)   <= THRESH;
  const mePerfAgree = Math.abs(me - perf)  <= THRESH;
  const expPerfAgree= Math.abs(exp - perf) <= THRESH;
  if (meExpAgree && mePerfAgree)   return null;           // consensus correct, no badge
  if (meExpAgree && !expPerfAgree) return { label:"FORMAT", color:"#9c5ef5", title:"You and expert agreed, but performance data diverged — the format surprised both of you" };
  if (!meExpAgree && expPerfAgree) return { label:"MISS",   color:"#e05030", title:"Expert and performance agreed — you were off from the consensus" };
  if (mePerfAgree && !meExpAgree)  return { label:"SPOT",   color:"#32a050", title:"You matched performance data but diverged from the expert pre-release read" };
  return                                  { label:"VAR",    color:"#e6c800", title:"All three values diverge — high-variance or archetype-dependent card" };
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

// ── SourceBadge ───────────────────────────────────────────────────────────────
function SourceBadge({ source, meta }) {
  if (!source) return null;
  const sourceName = { "17lands":"17Lands", "aetherhub":"AetherHub", "manual":"Manual" }[source] ?? source;
  const fmt  = meta?.format ? ` · ${meta.format === "PremierDraft" ? "Premier" : meta.format === "QuickDraft" ? "Quick" : meta.format}` : "";
  const date = meta?.importedAt ? ` · ${timeAgo(meta.importedAt)}` : "";
  const tip  = `${sourceName}${fmt}${date}`;
  return (
    <span className="src-badge" title={tip}
      style={{ color: SOURCE_COLOR[source], borderColor: SOURCE_COLOR[source]+"55", cursor:"help" }}>
      {SOURCE_LABEL[source] || source}
    </span>
  );
}

// ── ThreeWayDelta (desktop table cell) ────────────────────────────────────────
function ThreeWayDelta({ g }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const { meVsExp, meVsPerf, expVsPerf } = calcThreeWayDelta(g);
  const rows = [
    meVsExp   && { key:"ME", title:"Me vs Expert",      ...meVsExp },
    meVsPerf  && { key:"MP", title:"Me vs Performance", ...meVsPerf },
    expVsPerf && { key:"EP", title:"Expert vs Perf",    ...expVsPerf },
  ].filter(Boolean);
  if (!rows.length) return null;

  const me   = gradeToNum(g.myGrade);
  const exp  = g.expert_rating ?? null;
  const perf = g.performance_rating ?? null;

  return (
    <div ref={ref} style={{ position:"relative", cursor:"pointer" }} onClick={() => setOpen(v => !v)}>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {rows.map(r => (
          <div key={r.key} title={`${r.title}: ${r.detail}`}
            style={{ display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
            <span style={{ fontSize:8, color:"var(--dimmer)", minWidth:16, letterSpacing:".02em" }}>{r.key}</span>
            <span style={{ fontSize:11, fontWeight:700, color: r.color }}>{r.symbol}</span>
          </div>
        ))}
      </div>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:200,
          background:"var(--s1)", border:"1px solid var(--b2)",
          padding:"10px 12px", boxShadow:"0 8px 24px rgba(0,0,0,.3)", minWidth:180
        }}>
          <div style={{ fontSize:9, color:"var(--dimmer)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:8 }}>Comparison</div>
          {[
            { label:"My Grade",    val: me,   grade: g.myGrade },
            { label:"Expert",      val: exp,  grade: null },
            { label:"Performance", val: perf, grade: null },
          ].map(({ label, val, grade }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", gap:16, fontSize:10, marginBottom:4, whiteSpace:"nowrap" }}>
              <span style={{ color:"var(--dim)", flexShrink:0 }}>{label}</span>
              <span style={{ color:"var(--txt)", fontWeight:600, flexShrink:0 }}>
                {grade ? `${grade} (${val?.toFixed(2) ?? "—"})` : val != null ? val.toFixed(1) : "—"}
              </span>
            </div>
          ))}
          <div style={{ borderTop:"1px solid var(--b1)", marginTop:8, paddingTop:8, display:"flex", flexDirection:"column", gap:4 }}>
            {rows.map(r => (
              <div key={r.key} style={{ display:"flex", justifyContent:"space-between", gap:12, fontSize:10, whiteSpace:"nowrap" }}>
                <span style={{ color:"var(--dim)", flexShrink:0 }}>{r.title}</span>
                <span style={{ color: r.color, fontWeight:700, flexShrink:0 }}>{r.symbol} {r.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── QuadrantBadge ─────────────────────────────────────────────────────────────
function QuadrantBadge({ g, style }) {
  const q = calcQuadrant(g);
  if (!q) return null;
  return (
    <span title={q.title} style={{
      fontSize:8, fontWeight:700, letterSpacing:".06em",
      padding:"1px 4px", borderRadius:2, marginLeft:4,
      background: q.color+"22", color: q.color, border:`1px solid ${q.color}55`,
      cursor:"help", ...style
    }}>{q.label}</span>
  );
}

// ── RatingInput (desktop table) ───────────────────────────────────────────────
function RatingInput({ value, source, sourceMeta, onChange }) {
  return (
    <span style={{ whiteSpace:"nowrap" }}>
      <input type="number" className="lsv-in" min="0" max="5" step="0.5"
        value={value ?? ""}
        style={value != null ? { color: ratingColor(value) } : {}}
        onChange={e => onChange(e.target.value === "" ? null : parseFloat(e.target.value))} />
      <SourceBadge source={source} meta={sourceMeta} />
    </span>
  );
}

// ── TagCell (desktop table — compact chips + floating picker) ────────────────
function TagCell({ tags = [], onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const MAX_VISIBLE = 2;
  const visible  = tags.slice(0, MAX_VISIBLE);
  const overflow = tags.length - MAX_VISIBLE;
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div style={{ display:"flex", flexWrap:"nowrap", gap:3, alignItems:"center" }}>
        {visible.map(id => {
          const tag = TAGS.find(t => t.id === id);
          return tag
            ? <span key={id} className="tag-chip active" style={{ fontSize:8, padding:"1px 6px" }}
                onClick={() => onToggle(id)}>{tag.label} ✕</span>
            : null;
        })}
        {overflow > 0 && (
          <span style={{ fontSize:8, color:"var(--dimmer)", whiteSpace:"nowrap" }}>+{overflow}</span>
        )}
        <button className="tag-add-btn" onClick={() => setOpen(v => !v)}>
          {open ? "✕" : tags.length ? "edit" : "+ tag"}
        </button>
      </div>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:200,
          background:"var(--s1)", border:"1px solid var(--b2)",
          padding:"10px 12px", boxShadow:"0 8px 24px rgba(0,0,0,.3)",
          minWidth:220
        }}>
          {TAG_GROUPS.map(({ label, ids }) => (
            <div key={label} style={{ marginBottom:8 }}>
              <div style={{ fontSize:8, color:"var(--dimmer)", marginBottom:4, textTransform:"uppercase", letterSpacing:".1em" }}>{label}</div>
              <div className="tag-chips">
                {ids.map(id => {
                  const tag = TAGS.find(t => t.id === id);
                  return tag
                    ? <button key={id} className={`tag-chip${tags.includes(id) ? " active" : ""}`}
                        style={{ fontSize:8, padding:"1px 6px" }} onClick={() => onToggle(id)}>
                        {tag.label}
                      </button>
                    : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TagFilterPanel (desktop filter bar dropdown) ──────────────────────────────
function TagFilterPanel({ filterTags, onToggle, onClear }) {
  return (
    <div className="tag-filter-panel">
      <div className="tag-filter-hdr">Filter by tag — any of</div>
      {TAG_GROUPS.map(({ label, ids }) => (
        <div key={label}>
          <div style={{ fontSize:8, color:"var(--dimmer)", marginBottom:4, textTransform:"uppercase", letterSpacing:".1em" }}>{label}</div>
          <div className="tag-chips">
            {ids.map(id => {
              const tag = TAGS.find(t => t.id === id);
              return tag
                ? <button key={id} className={`tag-chip${filterTags.includes(id) ? " active" : ""}`}
                    onClick={() => onToggle(id)}>{tag.label}</button>
                : null;
            })}
          </div>
        </div>
      ))}
      {filterTags.length > 0 && (
        <button className="btn" style={{ fontSize:9, alignSelf:"flex-start" }} onClick={onClear}>Clear</button>
      )}
    </div>
  );
}

// ── GradeSelect ───────────────────────────────────────────────────────────────
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

// ── MobileCardItem ────────────────────────────────────────────────────────────
function MobileCardItem({ card, grade, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [bigImg, setBigImg]     = useState(false);
  const ck  = getColorKey(card);
  const img = getImageUrl(card);
  const q   = calcQuadrant(grade);

  return (
    <div className={`mc mobile-only c${ck}`}>
      <div style={{ display:"flex" }}>
        <div className="mc-stripe" />
        <div className="mc-body">
          <div className="mc-top" onClick={() => { setExpanded(v => !v); setBigImg(false); }}>
            <div className="mc-info">
              <div className="mc-name">
                {card.name}
                {q && <QuadrantBadge g={grade} style={{ marginLeft:6 }} />}
              </div>
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
                        <label>Expert <SourceBadge source={grade.expert_source} /></label>
                        <input type="number" className="mc-num" min="0" max="5" step="0.5"
                          value={grade.expert_rating ?? ""}
                          onChange={e => onUpdate("expert_rating", e.target.value === "" ? null : parseFloat(e.target.value))} />
                      </div>
                      <div className="mc-field">
                        <label>Performance <SourceBadge source={grade.performance_source} /></label>
                        <input type="number" className="mc-num" min="0" max="5" step="0.5"
                          value={grade.performance_rating ?? ""}
                          onChange={e => onUpdate("performance_rating", e.target.value === "" ? null : parseFloat(e.target.value))} />
                      </div>
                      {(() => {
                        const { meVsExp, meVsPerf, expVsPerf } = calcThreeWayDelta(grade);
                        const rows = [
                          meVsExp   && { key:"Me vs Expert",      ...meVsExp },
                          meVsPerf  && { key:"Me vs Performance", ...meVsPerf },
                          expVsPerf && { key:"Expert vs Perf",    ...expVsPerf },
                        ].filter(Boolean);
                        return rows.length ? (
                          <div className="mc-field">
                            <label>Comparison</label>
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              {rows.map(r => (
                                <div key={r.key} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                                  <span style={{ color:"var(--dim)" }}>{r.key}</span>
                                  <span style={{ color: r.color, fontWeight:700 }}>{r.symbol} {r.detail}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      <div className="mc-field">
                        <label>Notes</label>
                        <textarea className="mc-note" placeholder="Notes…"
                          value={grade.notes || ""}
                          onChange={e => onUpdate("notes", e.target.value)} />
                      </div>
                      <div className="mc-field">
                        <label>Tags</label>
                        <div className="tag-chips">
                          {TAGS.map(tag => (
                            <button key={tag.id}
                              className={`tag-chip${(grade.tags ?? []).includes(tag.id) ? " active" : ""}`}
                              onClick={() => {
                                const cur = grade.tags ?? [];
                                onUpdate("tags", cur.includes(tag.id) ? cur.filter(t => t !== tag.id) : [...cur, tag.id]);
                              }}>{tag.label}</button>
                          ))}
                        </div>
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

// ── ImportPanel ───────────────────────────────────────────────────────────────
function ImportPanel({ cards, grades, selectedSet, fmt17l, setFmt17l, meta, setMeta, onGradesUpdate, mobile }) {
  const [msg, setMsg]         = useState("");
  const [source, setSource]   = useState("17lands");
  const [target, setTarget]   = useState("auto"); // auto | expert | performance

  const resolvedTarget = target === "auto"
    ? (source === "17lands" ? "performance" : "expert")
    : target;

  const importCSV = text => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) { setMsg("✗ File appears empty"); return; }
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
      const val = Math.round(Math.max(0, Math.min(5, rating)) * 2) / 2;
      if (resolvedTarget === "performance") {
        next[card.id] = { ...(next[card.id] ?? {}), performance_rating: val, performance_source: source };
      } else {
        next[card.id] = { ...(next[card.id] ?? {}), expert_rating: val, expert_source: source };
      }
      matched++;
    }
    if (matched === 0) { setMsg("✗ No cards matched — check the set is loaded"); return; }
    onGradesUpdate(next);
    const newMeta = {
      expert:      resolvedTarget === "expert"      ? { source, count: matched, importedAt: new Date().toISOString(), format: fmt17l } : meta?.expert,
      performance: resolvedTarget === "performance" ? { source, count: matched, importedAt: new Date().toISOString(), format: fmt17l } : meta?.performance,
    };
    setMeta(newMeta);
    store.set(`draft-import-meta-${selectedSet.code}`, JSON.stringify(newMeta));
    setMsg(`✓ ${matched} imported to ${resolvedTarget}${skipped ? ` · ${skipped} unmatched` : ""}`);
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setMsg("Reading…");
    const reader = new FileReader();
    reader.onload  = ev => importCSV(ev.target.result);
    reader.onerror = ()  => setMsg("✗ Could not read file");
    reader.readAsText(file);
    e.target.value = "";
  };

  const flush = which => {
    const next = {};
    for (const [id, g] of Object.entries(grades)) {
      const updated = { ...g };
      if (which === "expert"      && g.expert_source      && g.expert_source !== "manual")      { delete updated.expert_rating;      delete updated.expert_source; }
      if (which === "performance" && g.performance_source && g.performance_source !== "manual") { delete updated.performance_rating; delete updated.performance_source; }
      next[id] = updated;
    }
    onGradesUpdate(next);
    const newMeta = { ...meta, [which]: null };
    setMeta(newMeta);
    store.set(`draft-import-meta-${selectedSet.code}`, JSON.stringify(newMeta));
    setMsg("");
  };

  const srcButtons = (
    <div className="l17-fmt">
      {[["17lands","17Lands"],["aetherhub","AetherHub"],["manual","Manual"]].map(([val, lbl]) => (
        <button key={val} className={source === val ? "active" : ""} onClick={() => setSource(val)}>{lbl}</button>
      ))}
    </div>
  );

  const fmt17lButtons = source === "17lands" && (
    <div className="l17-fmt">
      {[["PremierDraft","Premier"],["QuickDraft","Quick"],["TradDraft","Trad"]].map(([val, lbl]) => (
        <button key={val} className={fmt17l === val ? "active" : ""} onClick={() => setFmt17l(val)}>{lbl}</button>
      ))}
    </div>
  );

  const targetButtons = (
    <div className="l17-fmt">
      {[["auto","Auto"],["expert","Expert"],["performance","Perf"]].map(([val, lbl]) => (
        <button key={val} className={target === val ? "active" : ""} onClick={() => setTarget(val)}
          title={val === "auto" ? `Auto: ${source === "17lands" ? "Performance" : "Expert"}` : val}>
          {lbl}{val === "auto" ? ` → ${resolvedTarget === "performance" ? "Perf" : "Exp"}` : ""}
        </button>
      ))}
    </div>
  );

  const metaRow = (which, label) => {
    const m = meta?.[which];
    if (!m) return null;
    return (
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:9, color:"var(--dim)" }}>
        <span><strong style={{ color:"var(--gold2)" }}>{label}</strong> · {SOURCE_LABEL[m.source] || m.source} · {m.count} cards · {timeAgo(m.importedAt)}</span>
        <button className="btn" style={{ fontSize:8, padding:"1px 6px" }} onClick={() => flush(which)}>Flush</button>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {!mobile && <div className="l17-title">Import Community Ratings</div>}
      {srcButtons}
      {fmt17lButtons}
      {targetButtons}
      <label className="l17-fetch" style={{ textAlign:"center", cursor:"pointer" }}>
        Import CSV
        <input type="file" accept=".csv,.txt" style={{ display:"none" }} onChange={handleFile} />
      </label>
      {msg && <div className="l17-msg">{msg}</div>}
      {(meta?.expert || meta?.performance) && (
        <div style={{ display:"flex", flexDirection:"column", gap:4, borderTop:"1px solid var(--b1)", paddingTop:6 }}>
          {metaRow("expert", "Expert")}
          {metaRow("performance", "Perf")}
        </div>
      )}
    </div>
  );
}

// ── DraftLab ──────────────────────────────────────────────────────────────────
function DraftLab({ user }) {
  const isMobile = useIsMobile();
  const didFirstSync = useRef(false);

  // ── State ──
  const [theme, setTheme]           = useState(() => localStorage.getItem("draft-lab-theme") || "auto");
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [fmt17l, setFmt17l]         = useState("PremierDraft");
  const [importMeta, setImportMeta] = useState(null); // { expert: {...}, performance: {...} }
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
  const [filterColor, setFilterColor]     = useState("all");
  const [filterRarity, setFilterRarity]   = useState("all");
  const [filterSearch, setFilterSearch]   = useState("");
  const [filterGraded, setFilterGraded]   = useState("all");
  const [filterQuadrant, setFilterQuadrant] = useState("all");
  const [filterTags, setFilterTags]         = useState([]);
  const [showTagFilter, setShowTagFilter]   = useState(false);
  const [showMobF, setShowMobF]     = useState(false);
  const [showGuide, setShowGuide]   = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [showLegal, setShowLegal]   = useState(false);
  const [hovered, setHovered]       = useState(null);
  const [hoverPos, setHoverPos]     = useState({ x:0, y:0 });
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

  useEffect(() => {
    if (!selectedSet || !user) return;
    fetchGrades(selectedSet.code).then(remote => {
      if (!remote) return;
      setGrades(prev => {
        const merged = migrateGrades({ ...prev, ...remote });
        store.set(`draft-grades-${selectedSet.code}`, JSON.stringify(merged));
        return merged;
      });
    });
  }, [selectedSet?.code, user?.id]);

  // On first login in a session: push any local sets to Supabase that Supabase doesn't have yet
  useEffect(() => {
    if (!user || didFirstSync.current) return;
    didFirstSync.current = true;
    const localSetCodes = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft-grades-')) {
        localSetCodes.push(key.replace('draft-grades-', ''));
      }
    }
    if (!localSetCodes.length) return;
    Promise.all(localSetCodes.map(async code => {
      const remote = await fetchGrades(code);
      if (!remote) {
        const raw = localStorage.getItem(`draft-grades-${code}`);
        if (raw) await syncGrades(code, JSON.parse(raw), user.id);
      }
    })).catch(() => {});
  }, [user?.id]);

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
    setGrades(r ? migrateGrades(JSON.parse(r.value)) : {});
    const m = store.get(`draft-import-meta-${code}`);
    setImportMeta(m ? JSON.parse(m.value) : null);
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

  const handleGradesUpdate = useCallback((next) => {
    setGrades(next);
    if (selectedSet) persistGrades(next, selectedSet.code);
  }, [selectedSet, persistGrades]);

  const loadSet = async set => {
    setSelectedSet(set);
    setCards([]);
    setLoading(true);
    setError(null);
    setFilterColor("all"); setFilterRarity("all"); setFilterSearch(""); setFilterGraded("all"); setFilterQuadrant("all"); setFilterTags([]);
    loadGrades(set.code);
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
    const hdr  = ["Name","Color","Mana Cost","Type","Rarity","My Grade","Expert","Expert Source","Performance","Perf Source","Sunset","Quadrant","Tags","Notes"];
    const rows = sorted.map(c => {
      const g = grades[c.id] ?? {};
      const q = calcQuadrant(g);
      return [
        `"${c.name}"`, getColorKey(c), `"${c.mana_cost ?? ""}"`, `"${c.type_line ?? ""}"`, c.rarity,
        g.myGrade ?? "", g.expert_rating ?? "", g.expert_source ?? "",
        g.performance_rating ?? "", g.performance_source ?? "",
        g.sunsetGrade ?? "", q?.label ?? "",
        `"${(g.tags ?? []).join("|")}"`,
        `"${(g.notes ?? "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type:"text/csv" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${selectedSet?.code ?? "mtg"}-grades.csv` }).click();
  };

  const exportBackup = () => {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("draft-grades-") || key.startsWith("draft-import-meta-") || key === "draft-lab-theme")
        backup[key] = localStorage.getItem(key);
    }
    const meta = { exportedAt: new Date().toISOString(), version: 2, keys: Object.keys(backup).length };
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
        const restoredGrades = {};
        for (const [key, value] of Object.entries(data)) {
          if ((key.startsWith("draft-grades-") || key.startsWith("draft-import-meta-") || key === "draft-lab-theme") && typeof value === "string") {
            localStorage.setItem(key, value); count++;
            if (key.startsWith("draft-grades-")) {
              restoredGrades[key.replace("draft-grades-", "")] = JSON.parse(value);
            }
          }
        }
        if (count === 0) { alert("No Draft Lab data found in that file."); return; }
        if (selectedSet) loadGrades(selectedSet.code);
        const savedTheme = localStorage.getItem("draft-lab-theme");
        if (savedTheme) { setTheme(savedTheme); document.documentElement.setAttribute("data-theme", savedTheme); }
        // Push all restored sets to Supabase (backup restore = authoritative source of truth)
        if (user) {
          const setCodes = Object.keys(restoredGrades);
          Promise.all(setCodes.map(code => syncGrades(code, restoredGrades[code], user.id)))
            .then(() => alert(`Restored ${count} item${count !== 1 ? "s" : ""} from backup and synced ${setCodes.length} set${setCodes.length !== 1 ? "s" : ""} to cloud.`))
            .catch(() => alert(`Restored ${count} item${count !== 1 ? "s" : ""} from backup. Cloud sync failed — grades saved locally.`));
        } else {
          alert(`Restored ${count} item${count !== 1 ? "s" : ""} from backup.`);
        }
      } catch (e) { alert(`Could not read backup file: ${e.message}`); }
    };
    reader.readAsText(file);
  };

  // ── Derived ──
  const activeSort   = isMobile ? mobileSort : sortCol;
  const filteredSets = sets.filter(s => s.name.toLowerCase().includes(setSearch.toLowerCase()) || s.code.toLowerCase().includes(setSearch.toLowerCase()));
  const clearFilters = () => { setFilterColor("all"); setFilterRarity("all"); setFilterSearch(""); setFilterGraded("all"); setFilterQuadrant("all"); setFilterTags([]); };
  const toggleFilterTag = id => setFilterTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const hasFilters   = filterColor !== "all" || filterRarity !== "all" || filterSearch || filterGraded !== "all" || filterQuadrant !== "all" || filterTags.length > 0;
  const gradedCount  = cards.filter(c => grades[c.id]?.myGrade).length;
  const gradeCounts  = {};
  for (const g of Object.values(grades)) { if (g.myGrade) gradeCounts[g.myGrade] = (gradeCounts[g.myGrade] ?? 0) + 1; }
  const pct = cards.length ? Math.round(gradedCount / cards.length * 100) : 0;

  const filtered = cards.filter(c => {
    const ck = getColorKey(c);
    const g  = grades[c.id] ?? {};
    if (filterColor    !== "all" && ck !== filterColor) return false;
    if (filterRarity   !== "all" && c.rarity !== filterRarity) return false;
    if (filterSearch && !c.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterGraded   === "graded"   && !g.myGrade) return false;
    if (filterGraded   === "ungraded" &&  g.myGrade) return false;
    if (filterQuadrant !== "all") {
      const q = calcQuadrant(g);
      const label = q?.label ?? "none";
      if (filterQuadrant === "none" ? label !== "none" : label !== filterQuadrant) return false;
    }
    if (filterTags.length > 0) {
      const cardTags = g.tags ?? [];
      if (!filterTags.some(t => cardTags.includes(t))) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ga = grades[a.id] ?? {}, gb = grades[b.id] ?? {};
    let av, bv;
    switch (activeSort) {
      case "color":       av = COLOR_ORDER[getColorKey(a)] * 100 + (a.cmc ?? 0); bv = COLOR_ORDER[getColorKey(b)] * 100 + (b.cmc ?? 0); break;
      case "name":        av = a.name; bv = b.name; break;
      case "cmc":         av = a.cmc ?? 0; bv = b.cmc ?? 0; break;
      case "rarity":      av = RARITIES.indexOf(a.rarity); bv = RARITIES.indexOf(b.rarity); break;
      case "myGrade":     av = GRADES.indexOf(ga.myGrade || ""); bv = GRADES.indexOf(gb.myGrade || ""); break;
      case "expert":      av = ga.expert_rating ?? 99; bv = gb.expert_rating ?? 99; break;
      case "performance": av = ga.performance_rating ?? 99; bv = gb.performance_rating ?? 99; break;
      default: return 0;
    }
    const dir = isMobile ? "asc" : sortDir;
    if (av < bv) return dir === "asc" ? -1 :  1;
    if (av > bv) return dir === "asc" ?  1 : -1;
    return 0;
  });

  const hasExpertData      = cards.some(c => grades[c.id]?.expert_rating != null);
  const hasPerformanceData = cards.some(c => grades[c.id]?.performance_rating != null);

  // ── Render ──
  return (
    <div className="app" onClick={() => { setShowSetDD(false); setShowImport(false); setShowExport(false); setShowTagFilter(false); }}>

      {/* ── Header ── */}
      <header className="hdr" onClick={e => e.stopPropagation()}>
        <div className="hdr-left">
          <div>
            <a href="https://github.com/jason-norris/draft-lab" target="_blank" rel="noopener noreferrer"
              style={{ textDecoration:"none" }}>
              <div className="logo">DRAFT LAB</div>
            </a>
            <div className="logo-sub">MTG · {VERSION}</div>
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
              <button className={`btn${showImport ? " active" : ""}`}
                onClick={() => { setShowExport(false); setShowImport(v => !v); }}>Import ▾</button>
              {showImport && (
                <div className="l17-panel" style={{ width:300 }}>
                  <ImportPanel
                    cards={cards} grades={grades} selectedSet={selectedSet}
                    fmt17l={fmt17l} setFmt17l={setFmt17l}
                    meta={importMeta} setMeta={setImportMeta}
                    onGradesUpdate={handleGradesUpdate} mobile={false} />
                </div>
              )}
            </div>
          )}
          <div className="l17-wrap desktop-only" onClick={e => e.stopPropagation()}>
            <button className={`btn${showExport ? " active" : ""}`}
              onClick={() => { setShowImport(false); setShowExport(v => !v); }}>Export ▾</button>
            {showExport && (
              <div className="l17-panel" style={{ width:220 }}>
                <div className="l17-title">Export / Restore</div>
                <button className="l17-fetch" onClick={() => { exportBackup(); setShowExport(false); }}>
                  Export Backup (JSON)
                </button>
                <label className="l17-fetch" style={{ textAlign:"center", cursor:"pointer" }}>
                  Restore Backup (JSON)
                  <input type="file" accept=".json" style={{ display:"none" }}
                    onChange={e => { importBackup(e.target.files[0]); e.target.value = ""; setShowExport(false); }} />
                </label>
                {selectedSet && (
                  <button className="l17-fetch" onClick={() => { exportCSV(); setShowExport(false); }}>
                    Export Grades (CSV)
                  </button>
                )}
              </div>
            )}
          </div>
          {user && syncStatus && <span className="sync-dot desktop-only">{syncStatus === "syncing" ? "↑ Syncing…" : "✓ Synced"}</span>}
          {user && (
            <button className="btn desktop-only" style={{ fontSize:9, color:"var(--dimmer)" }} title={user.email}
              onClick={() => sb.auth.signOut()}>Sign Out</button>
          )}
          <button className="icon-btn" onClick={() => setShowGuide(true)} title="Grade guide" style={{ fontSize:13, fontWeight:700 }}>?</button>
          <button className="icon-btn" onClick={() => setShowLegal(true)} title="Legal & Attribution" style={{ fontSize:11 }}>©</button>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle light/dark mode" style={{ fontSize:16, padding:"6px 10px" }}>
            {theme === "dark" ? "☀" : "🌙"}
          </button>
        </div>
      </header>

      {/* ── Mobile filter drawer ── */}
      <div className="filters-mobile mobile-only" style={{ maxHeight: showMobF ? "500px" : "0" }}>
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
                <option value="expert">Expert</option>
                <option value="performance">Performance</option>
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
            </div>
            <div className="fm-row">
              <span className="fl">Quad:</span>
              {["all","FORMAT","MISS","SPOT","VAR","none"].map(q => (
                <button key={q} className={`fb${filterQuadrant === q ? " active" : ""}`} onClick={() => setFilterQuadrant(q)}>
                  {q === "all" ? "All" : q}
                </button>
              ))}
            </div>
            <div className="fm-row" style={{ flexDirection:"column", alignItems:"flex-start", gap:6 }}>
              <span className="fl">Tags:</span>
              <div className="tag-chips">
                {TAGS.map(tag => (
                  <button key={tag.id} className={`tag-chip${filterTags.includes(tag.id) ? " active" : ""}`}
                    onClick={() => toggleFilterTag(tag.id)}>{tag.label}</button>
                ))}
              </div>
            </div>
            {hasFilters && <div className="fm-row"><button className="btn" style={{ padding:"3px 10px" }} onClick={clearFilters}>Clear Filters</button></div>}
            {selectedSet && (
              <div style={{ borderTop:"1px solid var(--b1)", paddingTop:10 }}>
                <ImportPanel
                  cards={cards} grades={grades} selectedSet={selectedSet}
                  fmt17l={fmt17l} setFmt17l={setFmt17l}
                  meta={importMeta} setMeta={setImportMeta}
                  onGradesUpdate={handleGradesUpdate} mobile={true} />
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
            {selectedSet && <button className="btn" style={{ alignSelf:"flex-start" }} onClick={exportCSV}>Export CSV</button>}
            {user && syncStatus && <span className="sync-dot">{syncStatus === "syncing" ? "↑ Syncing…" : "✓ Synced"}</span>}
            {user && (
              <button className="btn" style={{ color:"var(--dimmer)", fontSize:9, alignSelf:"flex-start" }}
                onClick={() => { sb.auth.signOut(); setShowMobF(false); }}>Sign Out</button>
            )}
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
          {(hasExpertData || hasPerformanceData) && <>
            <div className="divv" />
            <span className="fl">Quad</span>
            {["all","FORMAT","MISS","SPOT","VAR"].map(q => (
              <button key={q} className={`fb${filterQuadrant === q ? " active" : ""}`} onClick={() => setFilterQuadrant(q)}>
                {q === "all" ? "All" : q}
              </button>
            ))}
          </>}
          <div className="divv" />
          <div className="tag-filter-wrap" onClick={e => e.stopPropagation()}>
            <button className={`fb${filterTags.length > 0 ? " active" : ""}`}
              onClick={() => setShowTagFilter(v => !v)}>
              Tags{filterTags.length > 0 ? ` (${filterTags.length})` : ""}
            </button>
            {showTagFilter && (
              <TagFilterPanel filterTags={filterTags} onToggle={toggleFilterTag} onClear={() => setFilterTags([])} />
            )}
          </div>
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
                {[
                  ["name","Card"],["cmc","Cost"],[null,"Type"],["rarity","Rar"],["color","Color"],
                  ["myGrade","My Grade"],["expert","Expert"],["performance","Perf"],
                  [null,"Δ"],[null,"Sunset"],[null,"Notes"]
                ].map(([col, lbl]) => (
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
                const q  = calcQuadrant(g);
                return (
                  <tr key={card.id} className={`c${ck}`}>
                    <td
                      onMouseEnter={e => { setHovered(card); setHoverPos({ x: e.clientX, y: e.clientY }); }}
                      onMouseMove={e  =>   setHoverPos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={()  =>  setHovered(null)}>
                      <div className="card-name">
                        {card.name}
                        {q && <QuadrantBadge g={g} />}
                      </div>
                    </td>
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
                      <RatingInput value={g.expert_rating} source={g.expert_source}
                        sourceMeta={importMeta?.expert}
                        onChange={v => updateGrade(card.id, "expert_rating", v)} />
                    </td>
                    <td>
                      <RatingInput value={g.performance_rating} source={g.performance_source}
                        sourceMeta={importMeta?.performance}
                        onChange={v => updateGrade(card.id, "performance_rating", v)} />
                    </td>
                    <td><ThreeWayDelta g={g} /></td>
                    <td>
                      <GradeSelect cls="gsel" value={g.sunsetGrade || ""}
                        onChange={e => updateGrade(card.id, "sunsetGrade", e.target.value)} />
                    </td>
                    <td>
                      <input type="text" className="note-in" placeholder="Notes…"
                        value={g.notes ?? ""}
                        onChange={e => updateGrade(card.id, "notes", e.target.value)} />
                      <TagCell tags={g.tags ?? []} onToggle={id => {
                        const cur = g.tags ?? [];
                        updateGrade(card.id, "tags", cur.includes(id) ? cur.filter(t => t !== id) : [...cur, id]);
                      }} />
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

      {/* ── Hover preview ── */}
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
function LoginScreen({ onSignIn, loading }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("draft-lab-theme");
    if (saved && saved !== "auto") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("draft-lab-theme", theme);
  }, [theme]);
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ position:"relative" }}>
        <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
          style={{ position:"absolute", top:12, right:12, background:"transparent", border:"none",
            color:"var(--dim)", fontSize:16, cursor:"pointer", padding:4 }}>
          {theme === "dark" ? "☀" : "🌙"}
        </button>
        <div className="logo">DRAFT LAB</div>
        <div className="logo-sub">MTG · {VERSION}</div>
        <button className="auth-btn" disabled={loading} onClick={onSignIn}
          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          {loading
            ? "Signing in…"
            : <>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </>
          }
        </button>
      </div>
    </div>
  );
}

// ── AuthGate ──────────────────────────────────────────────────────────────────
function AuthGate() {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signing, setSigning]         = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) { setAuthLoading(false); return; }
    sb.auth.getSession()
      .then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthLoading(false); })
      .catch(() => setAuthLoading(false));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setSigning(true);
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    // Page redirects to Google — no need to reset state
  };

  if (authLoading) return <div className="center"><div className="spin" /></div>;
  if (!SUPABASE_CONFIGURED) return <DraftLab user={null} />;
  if (!user) return <LoginScreen onSignIn={signInWithGoogle} loading={signing} />;
  return <DraftLab user={user} />;
}

// ── Mount ─────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(<AuthGate />);
