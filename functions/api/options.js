import { TABLES, getTableFields, listAll } from '../_lib/noco.js';
import { json, methodNotAllowed } from '../_lib/auth.js';

/** Columns of LFG_Posts the UI needs choice-lists for. */
const LISTING_COLUMNS = ['game_system', 'play_style', 'location', 'status', 'day_of_week'];

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
      listAll(env, TABLES.posts, { fields: 'tags' }),
    ]);

    const options = {};
    for (const f of listingFields) {
      if (LISTING_COLUMNS.includes(f.title)) options[f.title] = f.choices;
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