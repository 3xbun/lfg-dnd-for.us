import {
  TABLES,
  LINKS,
  REPORT_REASONS,
  getRecordOrNull,
  createRecord,
  addLink,
  listLinks,
  findUserByDiscordId,
} from '../_lib/noco.js';
import { getSession, json, unauthorized, badRequest, methodNotAllowed } from '../_lib/auth.js';

const MAX_DETAIL = 1000;

/**
 * Report a listing. Auth required — an anonymous report endpoint is a spam
 * magnet with no accountable party. One report per user per listing: a repeat
 * is acknowledged without creating a duplicate row.
 */
export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return unauthorized('Sign in with Discord to report a listing');

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const listingId = body?.listingId;
  if (!listingId) return badRequest('listingId is required');

  const reason = String(body?.reason || '').trim();
  if (!REPORT_REASONS.includes(reason)) {
    return badRequest(`reason must be one of: ${REPORT_REASONS.join(', ')}`);
  }
  const detail = String(body?.detail || '').slice(0, MAX_DETAIL);

  try {
    const listing = await getRecordOrNull(env, TABLES.posts, listingId);
    if (!listing) return json({ ok: false, message: 'Listing not found' }, { status: 404 });

    const reporter = await findUserByDiscordId(env, session.uid);
    if (!reporter) return json({ ok: false, message: 'No profile for this user' }, { status: 409 });

    // dedupe: one report per reporter per listing
    const existing = await listReportsByReporter(env, reporter.Id, listingId);
    if (existing) return json({ ok: true, duplicate: true });

    const report = await createRecord(env, TABLES.reports, { reason, detail: detail || null });
    await addLink(env, TABLES.reports, LINKS.reportListing, report.Id, [Number(listingId)]);
    await addLink(env, TABLES.reports, LINKS.reportReporter, report.Id, [reporter.Id]);

    // the links are attached after creation, so the pre-link record is stale —
    // report success without echoing it back
    return json({ ok: true, reportId: report.Id }, { status: 201 });
  } catch (err) {
    return json({ ok: false, message: err.message }, { status: 502 });
  }
}

/** Reports this user has already filed, resolved through the links table. */
async function listReportsByReporter(env, reporterId, listingId) {
  const mine = await listLinks(env, TABLES.users, LINKS.userReports, reporterId);
  for (const r of mine) {
    const listings = await listLinks(env, TABLES.reports, LINKS.reportListing, r.Id);
    if (listings.some((l) => Number(l.Id) === Number(listingId))) return r;
  }
  return null;
}

export const onRequest = ({ request, env }) =>
  request.method === 'POST' ? onRequestPost({ request, env }) : methodNotAllowed();
