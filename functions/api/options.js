import { TABLES, getTableFields } from '../_lib/noco.js';
import { json, methodNotAllowed } from '../_lib/auth.js';

/** Columns the UI needs choice-lists for. */
const SELECT_COLUMNS = ['game_system', 'play_style', 'location', 'status', 'day_of_week'];

/**
 * Public option lists, read from the live table metadata so the UI can never
 * drift from the DB's SingleSelect choices (a hardcoded list previously offered
 * systems that don't exist in the column, filtering every search to zero).
 */
export async function onRequestGet({ env }) {
  try {
    const fields = await getTableFields(env, TABLES.posts);
    const out = {};
    for (const f of fields) {
      if (SELECT_COLUMNS.includes(f.title)) out[f.title] = f.choices;
    }
    return json(
      { ok: true, options: out },
      { headers: { 'Cache-Control': 'public, max-age=600, s-maxage=3600' } }
    );
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export const onRequest = ({ request, env }) =>
  request.method === 'GET' ? onRequestGet({ env }) : methodNotAllowed();
