# Changelog

All notable changes to **LFG — D&D For Us** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0-beta.1] - 2026-09-16

### Fixed

- **Creating a post failed with "Save failed"** — `validateSessionTimes` was called but never imported in the create/edit endpoints (500 on every save)
- **Edit/delete failed with 403 for the owner** — the one-to-one ownership link returns a singular payload that the link reader ignored, so ownership checks always failed
- **Open and Closed badges looked the same** — both rendered in the red family; now Open is green, Full is amber, Closed is red

## [1.0.0-beta] - 2026-09-16

First public beta of the Looking-For-Group platform for the Thai TTRPG community.
Stack: Vue 3 + Tailwind CSS 4 on Cloudflare Pages, NocoDB as the database, Discord OAuth for identity.

### Added

- **Browse & search** — home page listing all open LFG posts with full-text search
- **Filters** — game system, play style (Online / Offline / Hybrid), status, and day of week; options derived live from the database
- **Post detail page** — description, schedule (day, start & end time), location, seat count, and join flow
- **Create wizard** — 4-step form (basics → schedule → location → review) for publishing a new post
- **Discord sign-in** — OAuth flow with an HttpOnly session cookie; signed-in state, avatar, and logout
- **My Groups dashboard** — posts you own (edit/delete, attach an FB/Discord link) and groups you've joined (leave)
- **Join / leave** — seat count decremented and recorded server-side
- **Report / flag** — report a post with a reason; stored for moderation review
- **Dark / light theme** — toggle in the header, persisted per visitor
- **English & Thai** — full UI localization with a one-tap EN/TH switch
- **Floating create button** — always-visible entry point to the create wizard
- **Branding** — custom logo, favicon, Font Awesome icon set, and color scheme
- **Mobile layout** — responsive header, cards, and forms down to 320px viewports

### Security

- NocoDB API token lives only in Pages Functions (server-side); the browser never sees it
- Session cookie is HttpOnly + SameSite; auth endpoints validate on every request

### Fixed

- Header horizontal overflow on mobile (page-wide horizontal scroll at 390px and 320px)
- Thai locale wording and label consistency across the UI
