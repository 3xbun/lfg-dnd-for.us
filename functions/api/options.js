import { TABLES, getTableFields, listAll } from '../_lib/noco.js';
import { json, methodNotAllowed } from '../_lib/auth.js';

/** Columns of LFG_Posts the UI needs choice-lists for. */
const LISTING_COLUMNS = ['game_system', 'play_style', 'location', 'status', 'day_of_week'];

/**
 * `location` is a SingleLineText column (free-form), so the column carries no
 * choices. This curated list — the same On-/Off- prefixed values the column
 * held before the conversion — is served as the dropdown's suggestion list so
 * the platform/shop picker keeps working while custom locations stay allowed.
 * The "Others" free-text path in the create wizard adds anything not listed.
 */
const LOCATION_CHOICES = [
  'On-FoundryVTT',
  'On-Owlbear Rodeo',
  'On-Roll20',
  'On-Theatre of the Mind',
  'Off-Pavern',
  'Off-Shiro Yotsuba',
  'Off-Kinoko Card Game Shop',
  'Off-Nostramo Bangkok',
];

/**
 * Public option lists, read from the live table metadata so the UI can never
 * drift from the DB's SingleSelect choices (a hardcoded list previously offered
 * game systems that don't exist in the column, filtering every search to zero).
 */
export async function onRequestGet({ env }) {
  try {
    const [listingFields, reportFields, listingRecords] = await Promise.all([
      getTableFields(env, TABLES.posts),
      getTableFields(env, TABLES.reports),
      // Read normal listing records because NocoDB v3 may reject a bare
      // `fields=tags` projection on this table.
      listAll(env, TABLES.posts),
    ]);

    const options = {};
    for (const f of listingFields) {
      if (!LISTING_COLUMNS.includes(f.title)) continue;
      // location is free-text now — fall back to the curated suggestion list.
      options[f.title] = f.title === 'location' ? LOCATION_CHOICES : f.choices;
    }
    options.tags = [...new Set(
      listingRecords
        .flatMap((record) => Array.isArray(record.tags) ? record.tags : String(record.tags || '').split(','))
        .map((tag) => tag.trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
    const reason = reportFields.find((f) => f.title === 'reason');
    if (reason) options.report_reason = reason.choices;

    return json(
      { ok: true, options },
      { headers: { 'Cache-Control': 'public, max-age=600, s-maxage=3600' } }
    );
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export const onRequest = ({ request, env }) =>
  request.method === 'GET' ? onRequestGet({ env }) : methodNotAllowed();