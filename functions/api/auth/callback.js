import {
  exchangeCode,
  fetchDiscordUser,
  fetchUserGuilds,
  avatarUrl,
  readState,
  setSession,
  json,
} from '../../_lib/auth.js';
import { TABLES, listRecords, createRecord, updateRecord } from '../../_lib/noco.js';

/**
 * Exchange the code SERVER-side, upsert the LFG_Users record keyed by
 * discord_id, then set a signed HttpOnly session cookie and redirect home.
 * NOTE: the session never travels in the URL.
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (url.searchParams.get('error')) {
    return Response.redirect(`${url.origin}/auth/callback?auth=denied`, 302);
  }
  if (!code) return Response.redirect(`${url.origin}/auth/callback?auth=missing_code`, 302);
  if (!state || state !== readState(request)) {
    return Response.redirect(`${url.origin}/auth/callback?auth=bad_state`, 302);
  }

  try {
    const token = await exchangeCode(env, request, code);
    const du = await fetchDiscordUser(token.access_token);
    const guilds = await fetchUserGuilds(token.access_token);

    const avatar = avatarUrl(du);
    const owned = guilds.filter((g) => g.owner).map((g) => g.id);

    const found = await listRecords(env, TABLES.users, {
      where: `(discord_id,eq,${du.id})`,
      pageSize: 1,
    });

    let user = found.records[0];
    if (user) {
      user = await updateRecord(env, TABLES.users, user.Id, {
        display_name: du.global_name || du.username,
        avatar_url: avatar,
      });
    } else {
      user = await createRecord(env, TABLES.users, {
        discord_id: String(du.id),
        user_id: String(du.id),
        display_name: du.global_name || du.username,
        avatar_url: avatar,
      });
    }

    const headers = await setSession(env, {
      discord_id: du.id,
      display_name: user.display_name,
      avatar_url: avatar,
    });
    headers.set('Location', `${url.origin}/auth/callback`);
    headers.append('Set-Cookie', 'lfg_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    return new Response(null, { status: 302, headers });
  } catch (err) {
    return Response.redirect(
      `${url.origin}/auth/callback?auth=${encodeURIComponent('error')}`,
      302
    );
  }
}

export const onRequest = ({ request, env }) =>
  request.method === 'GET'
    ? onRequestGet({ request, env })
    : json({ ok: false, message: 'Method not allowed' }, { status: 405 });
