import {
  TABLES,
  LINKS,
  listLinks,
  getRecordsByIds,
  findUserByDiscordId,
  userPostsLinkId,
} from '../_lib/noco.js';
import { getSession, json, unauthorized, methodNotAllowed } from '../_lib/auth.js';

/**
 * The signed-in user's dashboard: listings they own and listings they joined.
 *
 * Relations are traversed from the LFG_Users side (the auto-created
 * back-reference fields), NOT with a `where` clause on the relation column —
 * NocoDB's where filter silently returns nothing for a Links field.
 */
export async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized();

  try {
    const user = await findUserByDiscordId(env, session.uid);
    if (!user) return json({ ok: true, mine: [], joined: [] });

    const [userPostsLink, joinLinks] = await Promise.all([
      userPostsLinkId(env),
      listLinks(env, TABLES.users, LINKS.userJoins, user.Id),
    ]);
    const postLinks = await listLinks(env, TABLES.users, userPostsLink, user.Id);

    const mine = await getRecordsByIds(env, TABLES.posts, postLinks.map((p) => p.Id));

    // each LFG_Joins row points at one listing
    const listingIdPerJoin = await Promise.all(
      joinLinks.map(async (j) => {
        const listings = await listLinks(env, TABLES.joins, LINKS.joinListing, j.Id);
        return listings[0]?.Id ?? null;
      })
    );
    const joined = await getRecordsByIds(
      env,
      TABLES.posts,
      listingIdPerJoin.filter((id) => id != null)
    );

    return json({ ok: true, mine, joined }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

export const onRequest = ({ request, env }) =>
  request.method === 'GET' ? onRequestGet({ request, env }) : methodNotAllowed();
