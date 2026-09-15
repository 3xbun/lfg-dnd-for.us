import {
  TABLES,
  LINKS,
  listRecords,
  createRecord,
  updateRecord,
  addLink,
  getRecord,
  findUserByDiscordId,
} from '../_lib/noco.js';
import { getSession, json, unauthorized, badRequest, methodNotAllowed } from '../_lib/auth.js';
import { validateLinkFields } from '../_lib/validate.js';

/** Columns a client is allowed to write. Never trust arbitrary keys.
 *  The link columns are handled separately by validateLinkFields(). */
const WRITABLE = [
  'title',
  'game_system',
  'description',
  'play_style',
  'location',
  'status',
  'seats_total',
  'seats_open',
  'day_of_week',
  'start_time',
  'timezone',
];

function pickWritable(body = {}) {
  const out = {};
  for (const k of WRITABLE) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

/**
 * Escapes a value for a NocoDB `where` tuple.
 *
 * NocoDB's parser splits a tuple on commas, so a value that legitimately
 * contains one — `Dungeons & Dragons 5e, 5.5e` is a real option in this DB —
 * silently fails to parse or matches nothing. Wrapping the value in DOUBLE
 * quotes is the fix; it was verified to work for plain values, `like`
 * wildcards, and `~and`/`~or` joins alike. Never strip commas.
 *
 * Quotes and newlines are removed from user input so it cannot break out of
 * the tuple.
 */
function esc(v) {
  const clean = String(v)
    .replace(/[\r\n\t]/g, ' ')
    .replace(/"/g, '')
    .trim();
  return `"${clean}"`;
}

function buildWhere(url) {
  const parts = [];
  const q = url.searchParams;
  for (const field of ['game_system', 'play_style', 'status', 'location', 'day_of_week']) {
    const v = q.get(field);
    if (v) parts.push(`(${field},eq,${esc(v)})`);
  }
  const search = q.get('search');
  // The % wildcards must sit INSIDE the quotes — `(title,like,%"x"%)` is a
  // syntax error, `(title,like,"%x%")` is what NocoDB accepts.
  if (search) parts.push(`(title,like,${esc(`%${search}%`)})`);
  return parts.join('~and');
}

/** v3 wants a JSON sort: [{"field":"<name>","direction":"asc|desc"}]. */
function buildSort(url) {
  const raw = url.searchParams.get('sort');
  const allowed = ['CreatedAt', 'UpdatedAt', 'title', 'start_time', 'seats_open'];
  const direction = raw && raw.startsWith('-') ? 'desc' : 'asc';
  const field = (raw || '-CreatedAt').replace(/^-/, '');
  const safe = allowed.includes(field) ? field : 'CreatedAt';
  return JSON.stringify([{ field: safe, direction }]);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Math.min(Number(url.searchParams.get('pageSize') || 24), 100);

  try {
    const { records, next } = await listRecords(env, TABLES.posts, {
      where: buildWhere(url),
      sort: buildSort(url),
      page: page > 0 ? page : 1,
      pageSize: pageSize > 0 ? pageSize : 24,
    });
    return json(
      { ok: true, records, next, page },
      {
        headers: {
          // public read: let Cloudflare absorb repeat traffic so one visitor
          // cannot hammer the function (and NocoDB's quota).
          'Cache-Control': 'public, max-age=30, s-maxage=120',
        },
      }
    );
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const fields = pickWritable(body);
  const links = validateLinkFields(body);
  if (links.errors.length) return badRequest(links.errors.join('; '));
  Object.assign(fields, links.fields);
  if (!fields.title || !String(fields.title).trim()) return badRequest('title is required');
  if (!fields.description || !String(fields.description).trim())
    return badRequest('description is required');
  if (!fields.timezone) fields.timezone = 'Asia/Bangkok';

  try {
    const created = await createRecord(env, TABLES.posts, fields);

    // ownership is stored as a relation, not a column the client can spoof
    const owners = await findUserByDiscordId(env, session.uid);
    if (owners) {
      await addLink(env, TABLES.posts, LINKS.postOwner, created.Id, [owners.Id]);
    }

    return json({ ok: true, record: await getRecord(env, TABLES.posts, created.Id) }, { status: 201 });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export const onRequest = ({ request, env }) => {
  if (request.method === 'GET') return onRequestGet({ request, env });
  if (request.method === 'POST') return onRequestPost({ request, env });
  return methodNotAllowed();
};
