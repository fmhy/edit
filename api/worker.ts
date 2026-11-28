/**
 * Worker entry.
 *
 * Nitro's built-in `cloudflare_module` entry only exports the default fetch
 * handler, so it cannot carry a Durable Object class. This file is set as
 * `entry` in nitro.config.ts and does two things:
 *
 *   1. re-exports that same fetch handler (one source of truth, no copy of the
 *      preset's internals), and
 *   2. adds the `FeedbackLimiter` class as a named export so wrangler can bind
 *      it via `[[durable_objects.bindings]]` / `new_sqlite_classes`.
 *
 * Rollup emits both the default and the named export into .output/server/index.mjs.
 */
export { default } from 'nitropack/presets/cloudflare/runtime/cloudflare-module'
export { FeedbackLimiter } from './durable/feedback-limiter'
