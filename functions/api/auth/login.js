import { authorizeUrl, stateCookie, json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_CLIENT_SECRET || !env.AUTH_SESSION_SECRET) {
    return json({ ok: false, message: 'Auth env not configured' }, { status: 500 });
  }
  const state = crypto.randomUUID();
  // Response.redirect() headers are immutable — build the response directly so
  // the CSRF state cookie can ride along.
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(env, request, state),
      'Set-Cookie': stateCookie(state),
    },
  });
}

export const onRequest = ({ request }) =>
  request.method === 'GET'
    ? onRequestGet({ request })
    : json({ ok: false, message: 'Method not allowed' }, { status: 405 });
