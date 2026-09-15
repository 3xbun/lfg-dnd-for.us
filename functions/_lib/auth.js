/**
 * Stateless session helpers — signed HttpOnly cookie, no KV/D1 binding.
 * Edge runtime: NO Buffer. Use atob/btoa + TextEncoder/TextDecoder.
 */

const COOKIE = 'lfg_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str) {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signSession(payload, secret) {
  const key = await hmacKey(secret);
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, unb64url(sig), enc.encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(dec.decode(unb64url(body)));
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function getSession(env, request) {
  if (!env.AUTH_SESSION_SECRET) return null;
  return verifySession(readCookie(request, COOKIE), env.AUTH_SESSION_SECRET);
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function setSession(env, user, extraHeaders = {}) {
  const token = await signSession(
    {
      uid: String(user.discord_id),
      name: user.display_name,
      avatar: user.avatar_url || null,
      exp: Math.floor(Date.now() / 1000) + MAX_AGE,
    },
    env.AUTH_SESSION_SECRET
  );
  const headers = new Headers(extraHeaders);
  headers.append('Set-Cookie', sessionCookie(token));
  return headers;
}

/* ---- CSRF state for the OAuth dance ---- */

export function stateCookie(state) {
  return `lfg_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

export function readState(request) {
  return readCookie(request, 'lfg_state');
}

/* ---- Discord ---- */

export function redirectUri(env, request) {
  if (env.DISCORD_REDIRECT_URI) return env.DISCORD_REDIRECT_URI;
  return `${new URL(request.url).origin}/api/auth/discord/callback`;
}

export function authorizeUrl(env, request, state) {
  const params = new URLSearchParams({
    client_id: env.DISCORD_APPLICATION_ID,
    redirect_uri: redirectUri(env, request),
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export async function exchangeCode(env, request, code) {
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_APPLICATION_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(env, request),
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed (${res.status})`);
  return res.json();
}

export async function fetchDiscordUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord /users/@me failed (${res.status})`);
  return res.json();
}

export async function fetchUserGuilds(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export function avatarUrl(user) {
  if (!user?.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

export const unauthorized = (message = 'Unauthorized') => json({ ok: false, message }, { status: 401 });
export const badRequest = (message = 'Bad request') => json({ ok: false, message }, { status: 400 });
export const methodNotAllowed = () => json({ ok: false, message: 'Method not allowed' }, { status: 405 });
