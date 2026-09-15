# LFG — D&D: For Us

TTRPG group finder. **Browse any group for free; sign in with Discord to post.**
Vue 3 SPA on Cloudflare Pages, NocoDB as the database, Discord OAuth for identity.

See the MVP spec in the Obsidian vault: `SaaS/LFG/0. Home.md`.

## Architecture

```
Browser (Vue 3 SPA, static)
        │  no secrets in the bundle
        ▼
Cloudflare Pages Functions   ← all secrets live here (context.env)
        │
        ├─► NocoDB v3 REST (xc-token)
        ─► Discord OAuth2 API
```

**The NocoDB token never reaches the browser.** Every read and write goes
through `functions/api/*`. Do not reintroduce a `VITE_*`-prefixed secret —
`VITE_*` values are inlined into the public bundle.

## Setup

```bash
npm install
cp .env.example .dev.vars     # then fill in real values (gitignored)
npm run build
npm run preview               # wrangler pages dev — serves dist/ + functions/
```

`.dev.vars` (local) / Cloudflare Pages environment variables (production):

| Variable | Notes |
|---|---|
| `NDB_URL` | `https://ndb.3xbun.com` |
| `NDB_BASE_ID` | `p0w0egc69gysun8` |
| `NDB_API` | NocoDB API token |
| `AUTH_SESSION_SECRET` | `openssl rand -hex 32` — signs the session cookie |
| `DISCORD_APPLICATION_ID` | Discord app client id |
| `DISCORD_CLIENT_SECRET` | OAuth code exchange (server-side only) |
| `DISCORD_REDIRECT_URI` | must match the Discord portal exactly |

Discord portal → OAuth2 → Redirects must contain the exact
`DISCORD_REDIRECT_URI`, e.g. `https://lfg.dnd-for.us/api/auth/discord/callback`.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/listings` | public | browse/search (cached) |
| `POST /api/listings` | session | create a listing |
| `GET /api/listing?id=` | public | one listing |
| `PATCH /api/listing?id=` | owner | edit |
| `DELETE /api/listing?id=` | owner | remove |
| `POST /api/join` | session | join a listing |
| `POST /api/link` | owner | attach Facebook / Discord links |
| `GET /api/auth/login` | — | redirect to Discord |
| `GET /api/auth/discord/callback` | — | exchange code, set session cookie |
| `GET /api/auth/me` | — | current session or 401 |
| `POST /api/auth/logout` | — | clear cookie |

Sessions are a **stateless signed HttpOnly cookie** (HMAC-SHA256, Web Crypto) —
no KV/D1 binding. The session never travels in a URL.

## Security model

- A Vue Router guard is **UX only**; the page shell is public. The real gate is
  on the data functions. Verify by curling `/api` without a session, never by
  curling the page.
- Ownership is a NocoDB **relation**, not a client-supplied column: `POST /api/listings`
  links `owner` server-side, and `PATCH`/`DELETE` compare the signed-in Discord id
  against that relation.
- Link columns are validated in one shared module (`functions/_lib/validate.js`)
  by both `/api/listings` and `/api/link` — host allow-lists, no `javascript:` URLs.
- Seat counts are decremented server-side.

## Verifying a change

```bash
npm run build
# the secret must not be in the bundle:
grep -rl "xc-token\|ndb.3xbun.com" dist/ src/     # expect: no output
# functions must actually load (catches bad import depth, Buffer usage):
node scripts/smoke-functions.mjs
```

## Known gaps (M1)

- `end_time` is not a column yet — listings have a start time only.
- Discord **guild ownership** is not verified when a server is linked; proving it
  needs a live `/users/@me/guilds` call, which needs an OAuth access token the
  stateless session deliberately does not keep.
- No report/flag table yet.