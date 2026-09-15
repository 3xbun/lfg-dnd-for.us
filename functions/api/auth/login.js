import { authorizeUrl, stateCookie, json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_CLIENT_SECRET || !env.AUTH_SESSION_SECRET) {
    return json(
      {
        ok: false,
        message:
          'Auth env not configured. Required: DISCORD_APPLICATION_ID, ' +
          'DISCORD_CLIENT_SECRET, AUTH_SESSION_SECRET.',
      },
      { status: 500 }
    );
  }

  let target;
  try {
    target = authorizeUrl(env, request, crypto.randomUUID());
  } catch (err) {
    // surfaces a stale DISCORD_REDIRECT_URI as a visible error rather than a
    // sign-in that silently redirects to a dead route
    return json({ ok: false, message: err.message }, { status: 500 });
  }

  const state = new URL(target).searchParams.get('state');
  // Response.redirect() headers are immutable — build the response directly so
  // the CSRF state cookie can ride along.
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      'Set-Cookie': stateCookie(state),
    },
  });
}

export const onRequest = ({ request }) =>
  request.method === 'GET'
    ? onRequestGet({ request })
    : json({ ok: false, message: 'Method not allowed' }, { status: 405 });
