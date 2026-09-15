/**
 * Shared field validation for listing writes. Used by BOTH /api/listings and
 * /api/link so a link cannot be written through one route that the other
 * rejects (that gap let a `javascript:` URL into the DB once).
 */

export const FB_HOSTS = [
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.com',
  'fb.me',
];

export const DISCORD_INVITE_HOSTS = [
  'discord.gg',
  'discord.com',
  'www.discord.com',
  'discordapp.com',
  'ptb.discord.com',
  'canary.discord.com',
];

/** Only http(s) on an allow-listed host survives. */
export function parseHostedUrl(value, hosts) {
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (!hosts.includes(u.hostname.toLowerCase())) return null;
    return u;
  } catch {
    return null;
  }
}

export const isSnowflake = (v) => /^\d{17,20}$/.test(String(v));

/**
 * Validate + normalise the link-ish columns of a listing payload.
 * Returns { fields, errors } — never throws.
 */
export function validateLinkFields(body = {}) {
  const fields = {};
  const errors = [];

  if (body.facebook_url !== undefined) {
    if (body.facebook_url === null || body.facebook_url === '') {
      fields.facebook_url = null;
    } else if (parseHostedUrl(body.facebook_url, FB_HOSTS)) {
      fields.facebook_url = String(body.facebook_url);
    } else {
      errors.push('facebook_url must be a facebook.com link');
    }
  }

  if (body.discord_invite_url !== undefined) {
    if (body.discord_invite_url === null || body.discord_invite_url === '') {
      fields.discord_invite_url = null;
    } else if (parseHostedUrl(body.discord_invite_url, DISCORD_INVITE_HOSTS)) {
      fields.discord_invite_url = String(body.discord_invite_url);
    } else {
      errors.push('discord_invite_url must be a discord.gg / discord.com link');
    }
  }

  if (body.discord_server_id !== undefined) {
    if (body.discord_server_id === null || body.discord_server_id === '') {
      fields.discord_server_id = null;
    } else if (isSnowflake(body.discord_server_id)) {
      fields.discord_server_id = String(body.discord_server_id);
    } else {
      errors.push('discord_server_id must be a 17-20 digit guild id');
    }
  }

  return { fields, errors };
}
