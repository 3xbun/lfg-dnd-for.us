import {
  TABLES,
  getRecord,
  updateRecord,
  deleteRecord,
  isPostOwner,
} from '../_lib/noco.js';
import { getSession, json, unauthorized, badRequest, methodNotAllowed } from '../_lib/auth.js';
import { validateLinkFields } from '../_lib/validate.js';

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

export function listingId(request) {
  return new URL(request.url).searchParams.get('id');
}

/** True only when the signed-in user owns the listing's `owner` relation. */
export async function assertOwner(env, id, session) {
  const ok = await isPostOwner(env, id, session.uid);
  return ok ? { ok: true } : { ok: false, reason: 'not owner' };
}

export async function onRequestGet({ request, env }) {
  const id = listingId(request);
  if (!id) return badRequest('id is required');
  try {
    const record = await getRecord(env, TABLES.posts, id);
    if (!record) return json({ ok: false, message: 'Not found' }, { status: 404 });

    // Tell the client whether it may edit — the server still enforces this on
    // PATCH/DELETE, this only drives which controls the UI shows.
    let isOwner = false;
    const session = await getSession(env, request);
    if (session) isOwner = await isPostOwner(env, id, session.uid);

    // A public read must not be cached as owner-specific.
    const headers = session
      ? { 'Cache-Control': 'private, no-store' }
      : { 'Cache-Control': 'public, max-age=15' };

    return json({ ok: true, record, isOwner }, { headers });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export async function onRequestPatch({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized();
  const id = listingId(request);
  if (!id) return badRequest('id is required');

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const fields = {};
  for (const k of WRITABLE) if (body[k] !== undefined) fields[k] = body[k];
  const links = validateLinkFields(body);
  if (links.errors.length) return badRequest(links.errors.join('; '));
  Object.assign(fields, links.fields);
  if (!Object.keys(fields).length) return badRequest('nothing to update');

  try {
    const gate = await assertOwner(env, id, session);
    if (!gate.ok) return json({ ok: false, message: gate.reason }, { status: 403 });
    return json({ ok: true, record: await updateRecord(env, TABLES.posts, id, fields) });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export async function onRequestDelete({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized();
  const id = listingId(request);
  if (!id) return badRequest('id is required');

  try {
    const gate = await assertOwner(env, id, session);
    if (!gate.ok) return json({ ok: false, message: gate.reason }, { status: 403 });
    await deleteRecord(env, TABLES.posts, id);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export const onRequest = ({ request, env }) => {
  const m = request.method;
  if (m === 'GET') return onRequestGet({ request, env });
  if (m === 'PATCH' || m === 'PUT') return onRequestPatch({ request, env });
  if (m === 'DELETE') return onRequestDelete({ request, env });
  return methodNotAllowed();
};
