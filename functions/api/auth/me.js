import { getSession, json, unauthorized } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized();
  return json({
    ok: true,
    authenticated: true,
    user: { id: session.uid, username: session.name, avatar_url: session.avatar },
  });
}

export const onRequest = ({ request, env }) =>
  request.method === 'GET'
    ? onRequestGet({ request, env })
    : json({ ok: false, message: 'Method not allowed' }, { status: 405 });
