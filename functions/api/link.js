import { TABLES, getRecordOrNull, updateRecord } from '../_lib/noco.js';
import { assertOwner } from './listing.js';
import { getSession, json, unauthorized, badRequest, methodNotAllowed } from '../_lib/auth.js';
import { validateLinkFields } from '../_lib/validate.js';

/**
 * Attach a Facebook post URL and/or a Discord server to a listing. Owner only.
 * Validation is shared with /api/listings (see _lib/validate.js) so a link
 * cannot be smuggled in through the create/update route.
 *
 * NOTE: Discord *ownership* is not verified here. Proving the caller owns a
 * guild needs a live /users/@me/guilds call, which needs an OAuth access token
 * we deliberately do not keep (stateless sessions). See the MVP spec.
 */
export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const listingId = body?.listingId;
  if (!listingId) return badRequest('listingId is required');

  try {
    const listing = await getRecordOrNull(env, TABLES.posts, listingId);
    if (!listing) return json({ ok: false, message: 'Listing not found' }, { status: 404 });

    const gate = await assertOwner(env, listingId, session);
    if (!gate.ok) return json({ ok: false, message: gate.reason }, { status: 403 });

    const { fields, errors } = validateLinkFields(body);
    if (errors.length) return badRequest(errors.join('; '));
    if (!Object.keys(fields).length) return badRequest('nothing to link');

    return json({ ok: true, record: await updateRecord(env, TABLES.posts, listingId, fields) });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export const onRequest = ({ request, env }) =>
  request.method === 'POST' ? onRequestPost({ request, env }) : methodNotAllowed();