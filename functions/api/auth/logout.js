import { clearCookie, json } from '../../_lib/auth.js';

export async function onRequestPost() {
  const res = json({ ok: true });
  res.headers.append('Set-Cookie', clearCookie());
  return res;
}

export const onRequest = ({ request }) =>
  request.method === 'POST'
    ? onRequestPost()
    : json({ ok: false, message: 'Method not allowed' }, { status: 405 });
