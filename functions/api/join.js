import {
  TABLES,
  LINKS,
  createRecord,
  addLink,
  updateRecord,
  getRecordOrNull,
  findUserByDiscordId,
} from '../_lib/noco.js';
import { getSession, json, unauthorized, badRequest, methodNotAllowed } from '../_lib/auth.js';

/**
 * Join a listing: auth required. Creates an LFG_Joins row and links it to the
 * listing and the player. Seat counts are decremented server-side (never trust
 * a client-computed number).
 */
export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized('Sign in with Discord to join');

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
    if (listing.status && listing.status !== 'Open') {
      return json({ ok: false, message: 'Listing is not open' }, { status: 409 });
    }

    const player = await findUserByDiscordId(env, session.uid);
    if (!player) return json({ ok: false, message: 'No profile for this user' }, { status: 409 });

    const join = await createRecord(env, TABLES.joins, {
      joined_at: new Date().toISOString(),
    });
    await addLink(env, TABLES.joins, LINKS.joinListing, join.Id, [Number(listingId)]);
    await addLink(env, TABLES.joins, LINKS.joinPlayer, join.Id, [player.Id]);

    let seatsOpen = listing.seats_open;
    if (typeof seatsOpen === 'number' && seatsOpen > 0) {
      seatsOpen -= 1;
      await updateRecord(env, TABLES.posts, listingId, {
        seats_open: seatsOpen,
        status: seatsOpen === 0 ? 'Full' : listing.status,
      });
    }

    return json({ ok: true, join, seats_open: seatsOpen }, { status: 201 });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export const onRequest = ({ request, env }) =>
  request.method === 'POST'
    ? onRequestPost({ request, env })
    : methodNotAllowed();
