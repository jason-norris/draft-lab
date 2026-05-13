import { useState } from "react";

const GOLD   = "#c8a84b";
const GOLD2  = "#8a6e28";
const BG     = "#06060f";
const S1     = "#0e0e1c";
const S2     = "#131324";
const S3     = "#18182e";
const B1     = "#22223a";
const B2     = "#2e2e4a";
const TXT    = "#e8e6f8";
const DIM    = "#9090b8";
const DIMMER = "#5a5a7a";

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "'Cinzel', serif";

// ── colour helpers ────────────────────────────────────────────────────────────
const tier = (bg, border, color = TXT) => ({
  background: bg, border: `1px solid ${border}`, color,
  borderRadius: 4, padding: "10px 14px", fontSize: 11,
  fontFamily: MONO, lineHeight: 1.6,
});

const pill = (bg, border, color = TXT) => ({
  background: bg, border: `1px solid ${border}`, color,
  borderRadius: 20, padding: "3px 10px",
  fontSize: 9, fontFamily: MONO, letterSpacing: ".08em",
  textTransform: "uppercase", whiteSpace: "nowrap",
  fontWeight: 500,
});

const arrow = { color: DIMMER, fontSize: 18, lineHeight: 1, userSelect: "none" };

// ── sub-components ────────────────────────────────────────────────────────────
function Box({ title, badge, items, accent = B2, textAccent = GOLD, style = {} }) {
  return (
    <div style={{
      background: S2, border: `1px solid ${accent}`,
      borderRadius: 6, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{ fontFamily: SERIF, fontSize: 12, color: textAccent, letterSpacing: ".1em" }}>
          {title}
        </span>
        {badge && <span style={pill(S3, B2, DIM)}>{badge}</span>}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ color: GOLD2, fontSize: 10, marginTop: 1, flexShrink: 0 }}>▸</span>
          <span style={{ fontSize: 11, color: DIM, fontFamily: MONO, lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: SERIF, fontSize: 11, color: DIMMER,
      letterSpacing: ".2em", textTransform: "uppercase",
      borderBottom: `1px solid ${B1}`, paddingBottom: 8, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Phase({ n, title, effort, color, children }) {
  return (
    <div style={{
      background: S1, border: `1px solid ${color}22`,
      borderLeft: `3px solid ${color}`, borderRadius: 4,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: `${color}22`, border: `1px solid ${color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color, fontFamily: MONO, flexShrink: 0,
        }}>{n}</div>
        <span style={{ fontFamily: SERIF, fontSize: 13, color: TXT, letterSpacing: ".08em" }}>{title}</span>
        <span style={{ ...pill(S3, B2, DIM), marginLeft: "auto" }}>{effort}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Task({ done = false, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ color: done ? "#43a047" : DIMMER, fontSize: 12, flexShrink: 0, marginTop: 1 }}>
        {done ? "✓" : "○"}
      </span>
      <span style={{ fontSize: 11, color: done ? DIM : TXT, fontFamily: MONO, lineHeight: 1.5 }}>
        {children}
      </span>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: MONO }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: "6px 12px", textAlign: "left",
                fontSize: 9, color: DIMMER, textTransform: "uppercase",
                letterSpacing: ".12em", borderBottom: `1px solid ${B2}`,
                whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${B1}` }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "7px 12px", color: j === 0 ? GOLD : DIM,
                  verticalAlign: "top", lineHeight: 1.5,
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── tabs ──────────────────────────────────────────────────────────────────────
const TABS = ["Architecture", "Data Model", "Migration", "Phases", "Trade-offs"];

export default function ArchSketch() {
  const [tab, setTab] = useState(0);

  return (
    <div style={{
      background: BG, color: TXT, fontFamily: MONO,
      minHeight: "100vh", padding: "24px 20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${S1}; }
        ::-webkit-scrollbar-thumb { background: ${B2}; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 820, margin: "0 auto 28px" }}>
        <div style={{ fontFamily: SERIF, fontSize: 22, color: GOLD, letterSpacing: ".18em" }}>
          DRAFT LAB
        </div>
        <div style={{ fontSize: 10, color: DIMMER, letterSpacing: ".25em", textTransform: "uppercase", marginTop: 3 }}>
          Architecture Sketch — Capacitor + Supabase
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ maxWidth: 820, margin: "0 auto 24px", display: "flex", gap: 4, flexWrap: "wrap" }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: tab === i ? `${GOLD}18` : "transparent",
            border: `1px solid ${tab === i ? GOLD2 : B2}`,
            color: tab === i ? GOLD : DIM,
            fontFamily: MONO, fontSize: 10, padding: "6px 14px",
            cursor: "pointer", letterSpacing: ".06em", textTransform: "uppercase",
            borderRadius: 3, transition: "all .15s",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* ── TAB 0: Architecture ── */}
        {tab === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle>System Overview</SectionTitle>

            {/* Layer diagram */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>

              {/* UI Layer */}
              <div style={{
                background: `${GOLD}0a`, border: `1px solid ${GOLD2}`,
                borderRadius: 6, padding: "14px 18px",
              }}>
                <div style={{ fontSize: 9, color: GOLD2, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 10 }}>
                  UI Layer — unchanged React app
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["draft-lab.html (current)", "Same components", "Same CSS", "Same grading logic"].map(l => (
                    <span key={l} style={pill(`${GOLD}12`, GOLD2, GOLD)}>{l}</span>
                  ))}
                </div>
              </div>

              <div style={{ ...arrow, textAlign: "center" }}>↕ storage calls swapped</div>

              {/* Storage adapter */}
              <div style={{
                background: "#1a1a2e", border: `1px solid #4040a0`,
                borderRadius: 6, padding: "14px 18px",
              }}>
                <div style={{ fontSize: 9, color: "#8080d0", textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 10 }}>
                  Storage Adapter — thin JS module (~100 lines)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={tier("#0a0a18", "#2a2a60", "#8080d0")}>
                    <div style={{ color: "#a0a0e0", fontSize: 10, marginBottom: 4 }}>Offline (localStorage)</div>
                    Always-on fallback. Full app works with no internet.
                    Syncs up when connection restores.
                  </div>
                  <div style={tier("#0a0a18", "#2a2a60", "#8080d0")}>
                    <div style={{ color: "#a0a0e0", fontSize: 10, marginBottom: 4 }}>Online (Supabase)</div>
                    Authenticated writes go to Postgres.
                    Reads merge remote + local on login.
                  </div>
                </div>
              </div>

              <div style={{ ...arrow, textAlign: "center" }}>↕ HTTPS / REST + Realtime</div>

              {/* Supabase */}
              <div style={{
                background: "#0a1a14", border: `1px solid #1a6040`,
                borderRadius: 6, padding: "14px 18px",
              }}>
                <div style={{ fontSize: 9, color: "#40c090", textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 10 }}>
                  Supabase (free tier — hosted Postgres + Auth + Realtime)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {[
                    ["Auth", "Email/password or Google OAuth. One account, all devices."],
                    ["Postgres DB", "grades, community_ratings, sets tables. Row-level security per user."],
                    ["Realtime", "Optional — live sync if you have the app open on two devices simultaneously."],
                  ].map(([t, d]) => (
                    <div key={t} style={tier("#051008", "#1a6040", "#60c090")}>
                      <div style={{ color: "#40c090", fontSize: 10, marginBottom: 4 }}>{t}</div>
                      {d}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...arrow, textAlign: "center" }}>↕ native bridge</div>

              {/* Capacitor */}
              <div style={{
                background: "#0a0a1a", border: `1px solid #2040a0`,
                borderRadius: 6, padding: "14px 18px",
              }}>
                <div style={{ fontSize: 9, color: "#6080d0", textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 10 }}>
                  Capacitor shell — wraps the web app, adds native APIs
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    "iOS (Swift webview)",
                    "Android (WebView)",
                    "Desktop (Electron optional)",
                    "File system access",
                    "Share sheet",
                    "Push notifications (future)",
                  ].map(l => (
                    <span key={l} style={pill("#08081a", "#3050a0", "#8090d0")}>{l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Key insight */}
            <div style={{
              background: S2, border: `1px solid ${B2}`,
              borderRadius: 4, padding: "12px 16px",
              fontSize: 11, color: DIM, lineHeight: 1.7,
            }}>
              <span style={{ color: GOLD }}>Key insight:</span> The web app code barely changes.
              The storage adapter is the only new layer — it intercepts every{" "}
              <code style={{ color: GOLD, fontSize: 10 }}>localStorage.get/set</code> call
              and mirrors it to Supabase when the user is logged in.
              Capacitor wraps the same HTML file and adds the native shell.
              No rewrite. No new framework.
            </div>
          </div>
        )}

        {/* ── TAB 1: Data Model ── */}
        {tab === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle>Supabase Schema</SectionTitle>

            <Box title="grades" badge="core table" accent="#1a6040" textAccent="#40c090" items={[]} />
            <Table
              headers={["column", "type", "notes"]}
              rows={[
                ["id", "uuid PK", "auto-generated"],
                ["user_id", "uuid FK → auth.users", "row-level security — users see only their own rows"],
                ["set_code", "text", "e.g. 'DSK', 'BLB'"],
                ["card_id", "text", "Scryfall card UUID"],
                ["card_name", "text", "denormalized for query convenience"],
                ["my_grade", "text", "'A+', 'A', 'A-' … 'F', null"],
                ["sunset_grade", "text", "same scale, filled end of season"],
                ["community_rating", "numeric(3,1)", "0.0–5.0, imported from 17L or AetherHub"],
                ["community_source", "text", "'17lands', 'aetherhub', 'manual'"],
                ["community_format", "text", "'PremierDraft', 'AetherHub', etc."],
                ["notes", "text", "free text, nullable"],
                ["updated_at", "timestamptz", "auto-updated trigger"],
              ]}
            />

            <Box title="community_imports" badge="import log" accent="#1a4060" textAccent="#4090c0" items={[]} />
            <Table
              headers={["column", "type", "notes"]}
              rows={[
                ["id", "uuid PK", ""],
                ["user_id", "uuid FK", ""],
                ["set_code", "text", ""],
                ["source", "text", "'17lands' | 'aetherhub' | 'manual'"],
                ["format", "text", "'PremierDraft', 'QuickDraft', etc."],
                ["card_count", "integer", "how many cards were matched"],
                ["imported_at", "timestamptz", ""],
              ]}
            />

            <div style={{
              background: S2, border: `1px solid ${B2}`,
              borderRadius: 4, padding: "12px 16px", fontSize: 11, color: DIM, lineHeight: 1.7,
            }}>
              <span style={{ color: GOLD }}>Row-Level Security:</span> Supabase RLS policies
              ensure <code style={{ color: GOLD, fontSize: 10 }}>user_id = auth.uid()</code> on
              every read and write. Your grades are invisible to other users at the database level,
              not just the application level.
            </div>

            <Box
              title="What stays in localStorage"
              badge="no migration needed"
              accent={B2}
              items={[
                "Theme preference (dark/light) — device-specific, no reason to sync",
                "Pending writes when offline — flushed to Supabase on reconnect",
                "Cached Scryfall card data — already ephemeral, fetched fresh each session",
              ]}
            />
          </div>
        )}

        {/* ── TAB 2: Migration ── */}
        {tab === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle>Migration Path — Current App → Cloud</SectionTitle>

            <div style={{
              background: S2, border: `1px solid ${B2}`,
              borderRadius: 4, padding: "12px 16px", fontSize: 11, color: DIM, lineHeight: 1.7,
            }}>
              The migration is designed to be <span style={{ color: GOLD }}>zero data loss</span> and{" "}
              <span style={{ color: GOLD }}>backward compatible</span>. The app continues to work
              locally while you set up Supabase. Your existing JSON backup is the migration artifact.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  step: "1", color: "#43a047", title: "Export your current backup",
                  detail: "Hit Export Backup in the current app. This JSON file is your migration source. Keep it.",
                  code: null,
                },
                {
                  step: "2", color: "#c6d825", title: "Create a free Supabase project",
                  detail: "supabase.com → New project → free tier. Takes 2 minutes. Note your project URL and anon key.",
                  code: "https://supabase.com/dashboard/new",
                },
                {
                  step: "3", color: "#ffb300", title: "Run the schema SQL",
                  detail: "Paste the CREATE TABLE statements into Supabase SQL editor. Takes 30 seconds.",
                  code: "CREATE TABLE grades (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id uuid REFERENCES auth.users NOT NULL,\n  set_code text NOT NULL,\n  card_id text NOT NULL,\n  card_name text,\n  my_grade text,\n  sunset_grade text,\n  community_rating numeric(3,1),\n  community_source text,\n  notes text,\n  updated_at timestamptz DEFAULT now()\n);\nALTER TABLE grades ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"own rows\" ON grades\n  USING (auth.uid() = user_id);",
                },
                {
                  step: "4", color: "#fb8c00", title: "Add storage adapter to draft-lab.html",
                  detail: "~100 line JS module that wraps localStorage calls. Reads config from two variables at the top of the file.",
                  code: "const SUPABASE_URL = 'https://xxxx.supabase.co';\nconst SUPABASE_ANON_KEY = 'eyJ...';\n// Everything else is automatic",
                },
                {
                  step: "5", color: "#f4511e", title: "Sign in and import backup",
                  detail: "Open the updated app, create an account, use Import Backup to load your JSON. The adapter writes each grade to Supabase. One-time migration, takes seconds.",
                  code: null,
                },
                {
                  step: "6", color: "#e53935", title: "Wrap with Capacitor",
                  detail: "npm init @capacitor/app → copy html file into www/ → cap add ios → cap add android → cap open ios",
                  code: "npm init @capacitor/app draft-lab\ncd draft-lab\ncp /path/to/draft-lab.html www/index.html\nnpx cap add ios\nnpx cap add android\nnpx cap sync",
                },
              ].map(({ step, color, title, detail, code }) => (
                <div key={step} style={{
                  background: S1, border: `1px solid ${color}22`,
                  borderLeft: `3px solid ${color}`, borderRadius: 4, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: `${color}22`, border: `1px solid ${color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color, fontFamily: MONO, flexShrink: 0,
                    }}>{step}</div>
                    <span style={{ fontFamily: SERIF, fontSize: 12, color: TXT, letterSpacing: ".06em" }}>{title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: DIM, lineHeight: 1.6, marginBottom: code ? 10 : 0 }}>{detail}</p>
                  {code && (
                    <pre style={{
                      background: BG, border: `1px solid ${B2}`,
                      borderRadius: 3, padding: "10px 12px",
                      fontSize: 10, color: "#a0c0a0", lineHeight: 1.6,
                      overflowX: "auto", margin: 0,
                      fontFamily: MONO,
                    }}>{code}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: Phases ── */}
        {tab === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionTitle>Build Phases</SectionTitle>

            <Phase n="1" title="Supabase Backend" effort="~4 hours" color="#43a047">
              <Task done>Export current grades as JSON backup</Task>
              <Task>Create Supabase project (free tier)</Task>
              <Task>Run schema SQL — grades + community_imports tables</Task>
              <Task>Enable Row Level Security policies</Task>
              <Task>Enable Google OAuth or email auth in Supabase dashboard</Task>
              <Task>Test with Supabase web client directly</Task>
            </Phase>

            <Phase n="2" title="Storage Adapter" effort="~6 hours" color="#c6d825">
              <Task>Write storage.js — thin wrapper over localStorage + Supabase JS client</Task>
              <Task>Implement offline queue — writes buffer locally, flush on reconnect</Task>
              <Task>Add conflict resolution — last-write-wins with updated_at timestamp</Task>
              <Task>Add login/logout UI to draft-lab.html header</Task>
              <Task>Test: grade on desktop, verify appears on second browser tab</Task>
            </Phase>

            <Phase n="3" title="Capacitor Shell" effort="~4 hours" color="#ffb300">
              <Task>npm init @capacitor/app</Task>
              <Task>Copy draft-lab.html into www/index.html</Task>
              <Task>cap add ios + cap add android</Task>
              <Task>Test on simulator — verify localStorage + Supabase both work in webview</Task>
              <Task>Configure app icon and splash screen</Task>
              <Task>cap sync to push web code to native projects</Task>
            </Phase>

            <Phase n="4" title="Device Testing" effort="~3 hours" color="#fb8c00">
              <Task>Android: build APK → sideload via USB (no Play Store needed)</Task>
              <Task>iOS: requires Apple Developer account ($99/yr) → TestFlight for distribution</Task>
              <Task>Test offline → online sync flow</Task>
              <Task>Test backup export from mobile (uses Capacitor Filesystem plugin)</Task>
              <Task>Test 17L CSV import from mobile Files app</Task>
            </Phase>

            <Phase n="5" title="Polish + Wishlist Items" effort="~weekend" color="#e53935">
              <Task>Mana symbol rendering from Scryfall SVGs</Task>
              <Task>Desktop card lightbox on row click</Task>
              <Task>Named source labels (17L / AetherHub / Manual badges)</Task>
              <Task>Restore from CSV export</Task>
              <Task>Analytics view — scatter plot, calibration charts</Task>
            </Phase>

            <div style={{
              background: S2, border: `1px solid ${B2}`, borderRadius: 4,
              padding: "12px 16px", fontSize: 11, color: DIM, lineHeight: 1.7,
            }}>
              <span style={{ color: GOLD }}>Total realistic estimate:</span> Phases 1–3 in two focused
              weekends. Phase 4 adds a weekend if you're doing iOS. Phase 5 is ongoing as you use it.
              The app is fully functional at end of Phase 2 — Capacitor just adds the native wrapper.
            </div>
          </div>
        )}

        {/* ── TAB 4: Trade-offs ── */}
        {tab === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SectionTitle>Honest Trade-off Analysis</SectionTitle>

            <Table
              headers={["decision", "chosen approach", "trade-off accepted"]}
              rows={[
                [
                  "Backend",
                  "Supabase (hosted)",
                  "Dependency on Supabase's free tier continuity. Mitigated: JSON backup always works offline. Migration to self-hosted Supabase or another Postgres is straightforward.",
                ],
                [
                  "Mobile framework",
                  "Capacitor (webview)",
                  "Not as native-feeling as React Native. Scroll performance slightly worse on very long card lists. Acceptable for a personal tool.",
                ],
                [
                  "Auth",
                  "Email or Google OAuth",
                  "Adds login friction. Mitigated: app works fully offline without logging in — login only needed for sync.",
                ],
                [
                  "Offline support",
                  "localStorage queue",
                  "Conflict resolution is last-write-wins. If you grade the same card on two devices offline, the later sync wins. Acceptable for a solo-use tool.",
                ],
                [
                  "Distribution",
                  "Sideload (Android) / TestFlight (iOS)",
                  "Not on app stores. Can't share publicly. Fine for personal use and a small circle of friends.",
                ],
                [
                  "Desktop",
                  "Browser shortcut (now) / Electron later",
                  "Not a native app yet on desktop. The browser shortcut with Supabase sync covers the real need. Electron adds little value until you need filesystem access.",
                ],
              ]}
            />

            <Box
              title="Why not Firebase?"
              accent={B2}
              items={[
                "Supabase uses standard Postgres SQL — your data is portable and queryable with any tool including pandas for end-of-season analytics.",
                "Firebase uses NoSQL (Firestore) — less natural for the relational structure of grades across sets and cards.",
                "Supabase is open source — self-hostable if the free tier ever changes.",
                "Both have generous free tiers. Either works. Supabase is the better fit given your analytics use case.",
              ]}
            />

            <Box
              title="Why not a PWA instead of Capacitor?"
              accent={B2}
              items={[
                "Progressive Web Apps can be added to home screen and work offline — and for your use case this might be enough.",
                "PWAs on iOS are second-class: limited storage, no push notifications, removed if not used for weeks.",
                "Capacitor gives you a real app binary with reliable storage, share sheet access, and the ability to go to TestFlight/App Store later.",
                "Worth trying the PWA path first — if the app works well from a browser shortcut with Supabase sync, you may not need Capacitor at all.",
              ]}
            />

            <div style={{
              background: `${GOLD}0a`, border: `1px solid ${GOLD2}`,
              borderRadius: 4, padding: "14px 16px",
              fontSize: 11, color: DIM, lineHeight: 1.8,
            }}>
              <div style={{ color: GOLD, fontFamily: SERIF, fontSize: 12, letterSpacing: ".08em", marginBottom: 8 }}>
                Recommended starting point
              </div>
              Before touching Capacitor: add Supabase sync to the existing HTML file and use it
              from the browser on both desktop and mobile. A browser shortcut on your home screen
              with real cloud sync covers 90% of the native app experience. Only add the Capacitor
              wrapper if the browser experience has a specific gap that's actually bothering you —
              most likely file system access for CSV imports on iOS.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
