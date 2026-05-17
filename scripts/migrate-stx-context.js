#!/usr/bin/env node
/**
 * migrate-stx-context.js — ONE-TIME MIGRATION SCRIPT
 *
 * Migrates STX legacy Q-notation notes into structured `context` objects.
 *
 * What it does:
 *   1. Fetches all STX grade rows from Supabase (all users)
 *   2. For each card in each row, checks notes for Q-notation: "Q: A/A-/B/C"
 *   3. Extracts early/ahead/parity/behind into a `context` object
 *   4. Strips the Q-notation from notes, preserving any other text
 *   5. Upserts the updated row back to Supabase
 *   6. Logs a full summary
 *
 * Requirements:
 *   - Node 18+ (uses built-in fetch)
 *   - SUPABASE_SERVICE_KEY environment variable (service role key, bypasses RLS)
 *     Get it from: Supabase Dashboard → Settings → API → service_role key
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=<key> node scripts/migrate-stx-context.js
 *
 * Run once, then delete this file.
 */

const PROJECT_URL = 'https://wkzjwucjehztcpdycugc.supabase.co';
const SET_CODE    = 'stx';

// Order: early / ahead / parity / behind
const Q_PATTERN = /Q:\s*([A-F][+-]?)\/([A-F][+-]?)\/([A-F][+-]?)\/([A-F][+-]?)/i;

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function fetchSTXRows(serviceKey) {
  const res = await fetch(
    `${PROJECT_URL}/rest/v1/draft_grades?set_code=eq.${SET_CODE}&select=user_id,set_code,data`,
    {
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function upsertRow(serviceKey, row) {
  const res = await fetch(
    `${PROJECT_URL}/rest/v1/draft_grades?on_conflict=user_id,set_code`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates',
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify([{
        user_id:  row.user_id,
        set_code: row.set_code,
        data:     row.data,
      }]),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upsert failed (${res.status}): ${text}`);
  }
}

// ── Migration logic ───────────────────────────────────────────────────────────

function migrateCardGrade(grade) {
  if (!grade || !grade.notes) return { grade, changed: false };

  const match = grade.notes.match(Q_PATTERN);
  if (!match) return { grade, changed: false };

  const [, early, ahead, parity, behind] = match;

  // Strip Q-notation, preserve surrounding text, collapse blank lines
  const cleanedNotes = grade.notes
    .replace(Q_PATTERN, '')
    .replace(/\n{2,}/g, '\n')
    .trim() || null;

  return {
    grade: {
      ...grade,
      context: { early, ahead, parity, behind },
      notes:   cleanedNotes,
    },
    changed: true,
  };
}

function migrateRowData(data) {
  let cardsMigrated = 0;
  let cardsSkipped  = 0;
  const errors      = [];
  const updated     = {};

  for (const [cardId, grade] of Object.entries(data)) {
    try {
      const { grade: migratedGrade, changed } = migrateCardGrade(grade);
      updated[cardId] = migratedGrade;
      if (changed) cardsMigrated++;
      else         cardsSkipped++;
    } catch (err) {
      errors.push({ cardId, error: err.message });
      updated[cardId] = grade; // keep original on error
      cardsSkipped++;
    }
  }

  return { updated, cardsMigrated, cardsSkipped, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.error('');
    console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is required.');
    console.error('');
    console.error('  Get it from: Supabase Dashboard → Settings → API → service_role key');
    console.error('  Usage: SUPABASE_SERVICE_KEY=<key> node scripts/migrate-stx-context.js');
    console.error('');
    process.exit(1);
  }

  console.log(`\nSTX Context Migration`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Project:  ${PROJECT_URL}`);
  console.log(`Set:      ${SET_CODE.toUpperCase()}`);
  console.log(`Pattern:  Q: early/ahead/parity/behind\n`);

  // ── Fetch ──
  console.log('Fetching STX rows from Supabase...');
  let rows;
  try {
    rows = await fetchSTXRows(serviceKey);
  } catch (err) {
    console.error(`\nFailed to fetch rows: ${err.message}`);
    process.exit(1);
  }
  console.log(`Found ${rows.length} row(s) for set_code=${SET_CODE}\n`);

  if (rows.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  // ── Process ──
  let totalCards     = 0;
  let totalMigrated  = 0;
  let totalSkipped   = 0;
  let rowsUpdated    = 0;
  const allErrors    = [];

  for (const row of rows) {
    const cardCount = Object.keys(row.data || {}).length;
    totalCards += cardCount;

    const { updated, cardsMigrated, cardsSkipped, errors } = migrateRowData(row.data || {});

    allErrors.push(...errors.map(e => ({ user_id: row.user_id, ...e })));
    totalMigrated += cardsMigrated;
    totalSkipped  += cardsSkipped;

    if (cardsMigrated > 0) {
      process.stdout.write(`  user ${row.user_id.slice(0, 8)}…: ${cardsMigrated} card(s) to migrate — upserting...`);
      try {
        await upsertRow(serviceKey, { ...row, data: updated });
        process.stdout.write(' ✓\n');
        rowsUpdated++;
      } catch (err) {
        process.stdout.write(` ✗ (${err.message})\n`);
        allErrors.push({ user_id: row.user_id, cardId: 'UPSERT', error: err.message });
      }
    } else {
      console.log(`  user ${row.user_id.slice(0, 8)}…: no Q-notation found, skipped`);
    }
  }

  // ── Summary ──
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`SUMMARY`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Rows fetched:      ${rows.length}`);
  console.log(`Rows upserted:     ${rowsUpdated}`);
  console.log(`Total cards:       ${totalCards}`);
  console.log(`Cards migrated:    ${totalMigrated}`);
  console.log(`Cards skipped:     ${totalSkipped}`);
  console.log(`Errors:            ${allErrors.length}`);

  if (allErrors.length > 0) {
    console.log('\nErrors:');
    for (const e of allErrors) {
      console.log(`  user ${e.user_id?.slice(0, 8)}… card ${e.cardId}: ${e.error}`);
    }
  }

  if (totalMigrated > 0) {
    console.log('\n✓ Migration complete. Verify in Supabase, then delete this script.');
  } else {
    console.log('\n✓ No Q-notation found. Nothing was changed.');
  }
}

main().catch(err => {
  console.error(`\nUnhandled error: ${err.message}`);
  process.exit(1);
});
