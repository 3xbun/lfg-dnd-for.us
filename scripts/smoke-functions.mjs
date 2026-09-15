/**
 * Smoke-test that every Pages Function actually LOADS.
 *
 * `npm run build` compiles only the SPA — it does not execute `functions/`. This
 * catches the failures that build cleanly and then explode at runtime:
 *   - wrong relative import depth for a shared `_lib` module
 *   - accidental Node APIs (Buffer) that the edge runtime does not provide
 *
 * Run: node scripts/smoke-functions.mjs
 */
globalThis.Buffer = undefined; // the edge runtime has no Buffer

const files = [
  'functions/_lib/noco.js',
  'functions/_lib/auth.js',
  'functions/_lib/validate.js',
  'functions/api/auth/login.js',
  'functions/api/auth/callback.js',
  'functions/api/auth/me.js',
  'functions/api/auth/logout.js',
  'functions/api/listings.js',
  'functions/api/listing.js',
  'functions/api/options.js',
  'functions/api/join.js',
  'functions/api/link.js',
];

let failed = 0;
for (const f of files) {
  try {
    await import(new URL(`../${f}`, import.meta.url).href);
    console.log('OK   ', f);
  } catch (e) {
    console.log('FAIL ', f, '->', e.message);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} module(s) failed to load`);
  process.exit(1);
}
console.log('\nall function modules load');