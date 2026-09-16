/**
 * NocoDB v3 client — server-side only. The token lives in `context.env`,
 * never in the browser bundle.
 */

export const TABLES = {
  posts: 'mxt7apjiai6mo6f', // LFG_Posts
  users: 'm0ksx7a3h6okl1r', // LFG_Users
  joins: 'mc7u0uiyy7fz3om', // LFG_Joins
  reports: 'm9o27o851nj8saz', // LFG_Reports
};

/**
 * Relation (link) FIELD IDS, not titles. The v3 links endpoint
 * (`/data/{base}/{table}/links/{field}/{id}`) rejects a field *title* with
 * `422 Field '<title>' not found` — it needs the column id.
 *
 * The LFG_Posts → LFG_Users ownership link (renamed `owner` → `LFG_Users`) is
 * NOT listed here: a rename or recreate changes its field id, so it is resolved
 * from live table metadata at runtime by column title (see resolveLinkFieldId).
 */
export const LINKS = {
  joinListing: 'cc4yhg7auw8pneh', // LFG_Joins.listing  -> LFG_Posts
  joinPlayer: 'ca04pfnpdlqtcic', // LFG_Joins.player    -> LFG_Users
  // back-references on LFG_Users — the reliable way to list "my" rows, since
  // `where` CANNOT filter on a relation column (it returns nothing, silently).
  userJoins: 'chkfv7lvmsq5j96', // LFG_Users.LFG_Join  -> LFG_Joins
  reportListing: 'c02vz9bh77y47bm', // LFG_Reports.listing  -> LFG_Posts
  reportReporter: 'crtyqtld6dztnlz', // LFG_Reports.reporter -> LFG_Users
  userReports: 'czdsgwjvoam19e4', // LFG_Users.LFG_Report -> LFG_Reports
};

/** LFG_Reports.reason SingleSelect choices (kept in step with the DB column). */
export const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Wrong information',
  'Inappropriate content',
  'Other',
];

function cfg(env) {
  const url = env.NDB_URL || 'https://ndb.3xbun.com';
  const base = env.NDB_BASE_ID;
  const token = env.NDB_API;
  if (!base || !token) throw new Error('NocoDB env missing: NDB_BASE_ID / NDB_API');
  return { url: url.replace(/\/$/, ''), base, token };
}

async function nc(env, path, init = {}) {
  const { url, token } = cfg(env);
  const res = await fetch(`${url}/api/v3/${path}`, {
    ...init,
    headers: {
      'xc-token': token,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`NocoDB ${res.status} ${path}: ${body?.message || text}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/** v3 returns { id, fields }; the SPA expects the flat v2 shape { Id, ... }. */
export const flatten = (rec) => (rec ? { Id: rec.id, ...(rec.fields || {}) } : null);

const COLUMN_ALIASES = { Id: 'id' };

function unflatten(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'Id' || k === 'id') continue;
    out[COLUMN_ALIASES[k] || k] = v;
  }
  return out;
}

function query(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function listRecords(env, table, { where, sort, fields, page = 1, pageSize = 25 } = {}) {
  const data = await nc(
    env,
    `data/${cfg(env).base}/${table}/records${query({ where, sort, fields, page, pageSize })}`
  );
  return {
    records: (data?.records || []).map(flatten),
    next: data?.next ?? null,
    pageInfo: data?.pageInfo ?? null,
  };
}

/** Follows `next` to the end — never trust a single page. */
export async function listAll(env, table, opts = {}) {
  const pageSize = opts.pageSize || 100;
  let page = 1;
  const out = [];
  for (;;) {
    const { records, next } = await listRecords(env, table, { ...opts, page, pageSize });
    out.push(...records);
    if (!next || records.length === 0) break;
    page += 1;
    if (page > 200) break; // runaway guard
  }
  return out;
}

export async function getRecord(env, table, id) {
  return flatten(await nc(env, `data/${cfg(env).base}/${table}/records/${id}`));
}

/**
 * Like getRecord but returns null when the row does not exist.
 * `getRecord` THROWS on a NocoDB 404, so a plain existence check built on it
 * turns "not found" into a 502 with a raw upstream error in the response.
 */
export async function getRecordOrNull(env, table, id) {
  try {
    return await getRecord(env, table, id);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function createRecord(env, table, fields) {
  const data = await nc(env, `data/${cfg(env).base}/${table}/records`, {
    method: 'POST',
    body: JSON.stringify({ fields: unflatten(fields) }),
  });
  const rec = Array.isArray(data?.records) ? data.records[0] : data;
  return flatten(rec);
}

export async function createMany(env, table, rows) {
  const data = await nc(env, `data/${cfg(env).base}/${table}/records`, {
    method: 'POST',
    body: JSON.stringify(rows.map((r) => ({ fields: unflatten(r) }))),
  });
  return (data?.records || []).map(flatten);
}

export async function updateRecord(env, table, id, fields) {
  const data = await nc(env, `data/${cfg(env).base}/${table}/records`, {
    method: 'PATCH',
    body: JSON.stringify([{ id: Number(id), fields: unflatten(fields) }]),
  });
  return flatten(data?.records?.[0]);
}

export async function deleteRecord(env, table, id) {
  return nc(env, `data/${cfg(env).base}/${table}/records`, {
    method: 'DELETE',
    body: JSON.stringify([{ id: Number(id) }]),
  });
}

/* ---- link (relation) helpers ---- */

export async function listLinks(env, table, linkField, id, pageSize = 100) {
  const data = await nc(
    env,
    `data/${cfg(env).base}/${table}/links/${linkField}/${id}${query({ page: 1, pageSize })}`
  );
  return (data?.records || data?.list || []).map(flatten);
}

export async function addLink(env, table, linkField, id, targetIds) {
  await nc(env, `data/${cfg(env).base}/${table}/links/${linkField}/${id}`, {
    method: 'POST',
    body: JSON.stringify(targetIds.map((tid) => ({ id: Number(tid) }))),
  });
  return listLinks(env, table, linkField, id);
}

export async function removeLink(env, table, linkField, id, targetIds) {
  return nc(env, `data/${cfg(env).base}/${table}/links/${linkField}/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(targetIds.map((tid) => ({ id: Number(tid) }))),
  });
}

/** Table field metadata (v3 meta API) — source of truth for SingleSelect choices. */
export async function getTableFields(env, table) {
  const data = await nc(env, `meta/bases/${cfg(env).base}/tables/${table}`);
  return (data?.fields || []).map((f) => ({
    title: f.title,
    type: f.type,
    choices: (f.options?.choices || []).map((c) => c.title),
  }));
}

/*
 * The ownership link on LFG_Posts was renamed `owner` → `LFG_Users`. NocoDB
 * keeps a column's field id when it is renamed in place, but a recreated column
 * gets a new id — and the /links endpoint needs the FIELD ID, never a title.
 * Resolve it from live table metadata instead of hardcoding, so ownership works
 * regardless of how the column was (re)created.
 */
const META_CACHE = new Map(); // `${base}|${table}` -> field metadata (promise)

async function tableMeta(env, table) {
  const key = `${cfg(env).base}|${table}`;
  if (!META_CACHE.has(key)) {
    META_CACHE.set(
      key,
      nc(env, `meta/bases/${cfg(env).base}/tables/${table}`).then((d) => d.fields || [])
    );
  }
  return META_CACHE.get(key);
}

/** Find a relation column's field id by title; the first matching title wins. */
export async function resolveLinkFieldId(env, table, titles) {
  const fields = await tableMeta(env, table);
  const hit = fields.find((f) => titles.includes(f.title));
  if (!hit) {
    throw new Error(`Relation column "${titles.join('" / "')}" not found on NocoDB table ${table}`);
  }
  return hit.id;
}

/** LFG_Posts.LFG_Users (legacy name: owner) → LFG_Users. */
export const postOwnerLinkId = (env) =>
  resolveLinkFieldId(env, TABLES.posts, ['LFG_Users', 'owner']);

/** LFG_Users.LFG_Posts (legacy back-ref: LFG_Post / LFG_PostsList) → LFG_Posts. */
export const userPostsLinkId = (env) =>
  resolveLinkFieldId(env, TABLES.users, ['LFG_Posts', 'LFG_Post', 'LFG_PostsList']);

/**
 * Resolve the LFG_Users row for a Discord id.
 * NOTE: the links endpoint returns only a PARTIAL projection of the related
 * record (it came back as just `{id, fields:{user_id}}` for a real user), so
 * ownership checks must compare record IDs — never a field off the link payload.
 */
export async function findUserByDiscordId(env, discordId) {
  const { records } = await listRecords(env, TABLES.users, {
    where: `(discord_id,eq,${discordId})`,
    pageSize: 1,
  });
  return records[0] || null;
}

/** Fetch records by id in parallel, dropping any that vanished. */
export async function getRecordsByIds(env, table, ids) {
  const out = await Promise.all(
    ids.map((id) => getRecord(env, table, id).catch(() => null))
  );
  return out.filter(Boolean);
}

/** True when `discordId` owns the given LFG_Posts row. */
export async function isPostOwner(env, postId, discordId) {
  const user = await findUserByDiscordId(env, discordId);
  if (!user) return false;
  const ownerLink = await postOwnerLinkId(env);
  const owners = await listLinks(env, TABLES.posts, ownerLink, postId);
  return owners.some((o) => Number(o.Id) === Number(user.Id));
}
