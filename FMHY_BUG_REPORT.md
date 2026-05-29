# FMHY Codebase — Bug Report & Production Audit

**Date:** 2026-05-29
**Branch:** `search-scroll-to-match`
**Stack:** VitePress + Vue 3 + Nitro (Cloudflare Workers) + UnoCSS
**Scope:** Full codebase scan — API, frontend theme, build scripts, configs, CI/CD

---

## Table of Contents

1. [Summary](#summary)
2. [Critical Issues](#critical-issues)
3. [High Severity Issues](#high-severity-issues)
4. [Medium Severity Issues](#medium-severity-issues)
5. [Low Severity Issues](#low-severity-issues)
6. [Production & Heavy Traffic Concerns](#production--heavy-traffic-concerns)
7. [CI/CD Pipeline Issues](#cicd-pipeline-issues)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 8 |
| High | 12 |
| Medium | 15 |
| Low | 7 |
| **Total** | **42** |

| Category | Count |
|----------|-------|
| Security (XSS/SSRF/Injection) | 8 |
| Memory Leaks | 5 |
| Missing Error Handling | 7 |
| Performance / Scalability | 6 |
| Rate Limiting / Auth | 4 |
| Configuration / Build | 6 |
| Reactivity / Race Conditions | 4 |
| Accessibility | 2 |

---

## Critical Issues

### C1. XSS via Base64 Decoder Plugin (Inline onclick)

**File:** `docs/.vitepress/markdown/base64.ts:20-43`

```typescript
return `<button class='base64' onclick="(function(btn){
  const codeEl = btn.querySelector('code');
  navigator.clipboard.writeText('${decode(content)}').then(() => { ... })
})(this)"><code>${content}</code></button>`
```

**Bug:** `decode(content)` is interpolated directly into an `onclick` attribute string. If the decoded base64 content contains a single quote (`'`), double quote (`"`), or closing parenthesis, it breaks out of the JavaScript context and enables arbitrary script execution.

**How to fix:**
- Replace inline `onclick` with a Vue component that binds the click handler properly.
- If string concatenation must be used, escape all special characters:
  ```typescript
  const escaped = decode(content)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
  ```
- Better: use a `<Base64Button>` Vue component with `@click` handler and pass data as a prop.

---

### C2. XSS via Markdown Headers Plugin

**File:** `docs/.vitepress/markdown/headers.ts:73-82`

```typescript
return `<Feedback heading="${heading}" />${result}`
```

**Bug:** The `heading` variable (extracted from markdown token content) is embedded directly into an HTML template string without escaping. If a heading contains `"`, it breaks the attribute and allows injection of arbitrary Vue template directives or HTML.

**How to fix:**
- Escape the heading before interpolation:
  ```typescript
  const safeHeading = heading
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<Feedback heading="${safeHeading}" />${result}`
  ```

---

### C3. XSS via `v-html` in Search Results

**File:** `docs/.vitepress/theme/components/VPLocalSearchBox.vue:1768,1777,1783`

```html
<span class="text" v-html="t" />
<span class="text" v-html="p.title" />
<div class="vp-doc" v-html="p.text" />
```

**Bug:** Search result text is rendered with `v-html`. If the search index contains user-contributed markdown that wasn't properly sanitized during indexing, an attacker can inject `<script>` tags or event handlers.

**How to fix:**
- Sanitize HTML before rendering using DOMPurify:
  ```typescript
  import DOMPurify from 'dompurify'
  const sanitize = (html: string) => DOMPurify.sanitize(html, { ALLOWED_TAGS: ['mark', 'span', 'em', 'strong'] })
  ```
- Apply to all `v-html` bindings: `v-html="sanitize(p.text)"`

---

### C4. XSS via Custom SVG in Bookmarks

**File:** `docs/.vitepress/theme/components/startpage/Bookmarks.vue:524`

```html
<div v-if="bookmark.customSvg" class="shrink-0 w-4 h-4" v-html="bookmark.customSvg" />
```

**Bug:** User-provided custom SVG from localStorage is rendered without any sanitization. SVGs can contain `<script>`, `<foreignObject>`, and event handler attributes (`onload`, `onerror`) that execute JavaScript.

**How to fix:**
- Sanitize SVGs before saving to localStorage:
  ```typescript
  import DOMPurify from 'dompurify'
  bookmark.customSvg = DOMPurify.sanitize(bookmark.customSvg, { USE_PROFILES: { svg: true } })
  ```

---

### C5. SSRF / No Timeout on External Fetch (single-page endpoint)

**File:** `api/routes/single-page.ts:54-58`

```typescript
const contents = await Promise.all(
  files.map(async (file) => {
    const content = await $fetch<string>(file.url)
    return content
  })
)
```

**Bug:** The endpoint fetches raw content from GitHub with no timeout, no response size limit, and no error handling. If GitHub is slow or an attacker can influence the URL list, the server hangs indefinitely. `Promise.all` also means a single failure crashes the entire request.

**How to fix:**
```typescript
const FETCH_TIMEOUT = 10_000 // 10 seconds

const contents = await Promise.allSettled(
  files.map(async (file) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const content = await $fetch<string>(file.url, { signal: controller.signal })
      return content
    } finally {
      clearTimeout(timeout)
    }
  })
)

// Filter out failed fetches gracefully
const successfulContents = contents
  .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
  .map(r => r.value)
```

---

### C6. Unescaped User Input Sent to Discord Webhook

**File:** `api/routes/feedback.post.ts:38,46`

```typescript
{ name: 'Message', value: message, inline: false },
{ name: 'Section', value: heading, inline: true }
```

**Bug:** User-supplied `message` and `heading` fields are sent directly to the Discord webhook embed without sanitization. The Zod schema only validates length (min 5 / max 1000), not content. An attacker can inject Discord markdown, mentions (`@everyone`), or malformed Unicode.

**How to fix:**
```typescript
function sanitizeForDiscord(input: string): string {
  return input
    .replace(/@(everyone|here)/gi, '[at]$1')
    .replace(/```/g, "'''")
    .replace(/\\/g, '\\\\')
    .slice(0, 1000)
}

// Before sending to webhook:
{ name: 'Message', value: sanitizeForDiscord(message), inline: false },
{ name: 'Section', value: sanitizeForDiscord(heading ?? ''), inline: true }
```

---

### C7. Missing Imports in PostLayout.vue

**File:** `docs/.vitepress/theme/PostLayout.vue:16-17`

```typescript
const { frontmatter } = useData()     // useData not imported
const authors = computed(() => ...)    // computed not imported
```

**Bug:** `useData` and `computed` are used but never imported. This will throw a `ReferenceError` at runtime, making all blog post pages crash.

**How to fix:**
```typescript
import { computed } from 'vue'
import { useData } from 'vitepress'
```

---

### C8. Build Succeeds but Logs "Success!" Even on Failure

**File:** `docs/.vitepress/config.mts:145-151`

```typescript
buildEnd: async (context) => {
  try {
    await generateImages(context)
    await generateFeed(context)
  } finally {
    consola.success('Success!')
  }
},
```

**Bug:** The `finally` block always runs, so even when `generateImages` or `generateFeed` throws, the build logs "Success!". The error is also swallowed — not re-thrown — so the build process may complete with broken OG images or RSS feeds and nobody will know.

**How to fix:**
```typescript
buildEnd: async (context) => {
  try {
    await generateImages(context)
    await generateFeed(context)
    consola.success('Build hooks completed successfully.')
  } catch (error) {
    consola.error('Build hook failed:', error)
    throw error  // Propagate to fail the build
  }
},
```

---

## High Severity Issues

### H1. Rate Limiting is Optional (Bypass by Environment)

**File:** `api/routes/feedback.post.ts:51-66`

```typescript
const clientIP =
  getHeader(event, 'cf-connecting-ip') ||
  getHeader(event, 'x-forwarded-for') ||
  event.node.req.socket.remoteAddress

const cf = event.context.cloudflare
if (clientIP && cf?.env?.RATE_LIMITER) {  // <-- conditional!
  const { success } = await cf.env.RATE_LIMITER.limit({ key: `feedback:${clientIP}` })
  if (!success) throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
}
```

**Bug:** Rate limiting only applies when Cloudflare env is present AND `RATE_LIMITER` binding exists. In dev mode, local testing, or if the binding is misconfigured — there is zero rate limiting. The `x-forwarded-for` header is also spoofable.

**How to fix:**
- Make rate limiting mandatory — if the limiter is unavailable, reject all requests or use an in-memory fallback.
- Only trust `cf-connecting-ip` (set by Cloudflare itself), never `x-forwarded-for` alone.
```typescript
const clientIP = getHeader(event, 'cf-connecting-ip')
if (!clientIP) {
  throw createError({ statusCode: 400, statusMessage: 'Missing client IP' })
}
```

---

### H2. Wildcard CORS Allows All Origins and Methods

**File:** `api/middleware/cors.ts:19-26`

```typescript
export default corsEventHandler((_event) => { /** no-op */ }, {
  origin: '*',
  methods: '*'
})
```

**Bug:** `origin: '*'` with `methods: '*'` allows any website to make any HTTP request (GET, POST, PUT, DELETE) to the API. This enables CSRF attacks and data exfiltration from any domain.

**How to fix:**
```typescript
export default corsEventHandler((_event) => {}, {
  origin: ['https://fmhy.net', 'https://www.fmhy.net'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
})
```

---

### H3. Memory Leak — Clock Interval Not Properly Cleaned

**File:** `docs/.vitepress/theme/components/startpage/Clock.vue:16-19`

```typescript
onMounted(() => {
  updateTime()
  const interval = setInterval(updateTime, 1000)
  onUnmounted(() => clearInterval(interval))  // nested inside onMounted
})
```

**Bug:** `onUnmounted` is registered inside `onMounted`. While Vue 3 does support this pattern (lifecycle hooks can be registered anywhere during setup), the closure captures the `interval` variable from `onMounted`. If the component is mounted/unmounted rapidly (e.g., page transitions), there's a risk of timing issues where the interval starts before the cleanup hook is registered.

**How to fix:**
```typescript
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateTime()
  interval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
```

---

### H4. Memory Leak — SearchBar Keyboard Listeners

**File:** `docs/.vitepress/theme/components/startpage/SearchBar.vue:127-133`

```typescript
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => { ... }
  const handleKeyUp = (e: KeyboardEvent) => { ... }
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })
})
```

**Bug:** Same nested-cleanup pattern as Clock.vue. The handler functions are defined inside `onMounted`, so if the cleanup doesn't execute (e.g., HMR during dev), the old listeners persist and new ones are added on re-mount — doubling event processing.

**How to fix:** Define handler references at the module/setup scope and separate `onMounted`/`onUnmounted` hooks.

---

### H5. Memory Leak — ThemeDropdown Accumulating Listeners

**File:** `docs/.vitepress/theme/components/ThemeDropdown.vue:77,87-92`

```typescript
button.addEventListener('click', toggleFlyout)
document.addEventListener('click', closeFlyout)
cleanupFlyout = () => {
  button.removeEventListener('click', toggleFlyout)
  document.removeEventListener('click', closeFlyout)
}
```

**Bug:** If `setupParentFlyoutOverride` is called multiple times without calling `cleanupFlyout` first, old listeners accumulate on the document because new ones are added before old ones are removed.

**How to fix:**
```typescript
const setupParentFlyoutOverride = () => {
  if (cleanupFlyout) cleanupFlyout()  // Remove previous listeners first
  // ... then add new ones
}
```

---

### H6. Memory Leak — MediaQueryList Listener Never Removed

**File:** `docs/.vitepress/theme/themes/themeHandler.ts:70-79`

```typescript
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY_MODE)) {
      this.state.value.currentMode = e.matches ? 'dark' : 'light'
      this.applyTheme()
    }
  })
```

**Bug:** An anonymous function is added as a listener with no way to remove it. If the ThemeHandler is instantiated multiple times (e.g., during HMR or SPA navigation), duplicate listeners pile up.

**How to fix:** Store the listener reference and provide a `destroy()` method.

---

### H7. Unsafe 100MB Buffer in Build Script

**File:** `scripts/generate-removed.js:95-106`

```javascript
const allCurrentDocs = execSync(`${findCommand} | xargs cat`, {
  maxBuffer: 100 * 1024 * 1024  // 100MB!
}).toString()
```

**Bug:** Allocates up to 100MB for a synchronous child process. If the docs directory grows, this will cause memory exhaustion during build. The `git log -p` call also allocates 10MB. Both have no timeout.

**How to fix:**
- Use streaming reads (`child_process.spawn` with pipe) instead of buffering everything.
- Set a reasonable timeout: `{ timeout: 30_000 }`.
- Read files individually rather than piping everything through `xargs cat`.

---

### H8. IP Address Not Validated Before Use as Rate Limit Key

**File:** `api/routes/feedback.post.ts:51-54` and `api/middleware/ratelimit.ts:19-22`

```typescript
const clientIP =
  getHeader(event, 'cf-connecting-ip') ||
  getHeader(event, 'x-forwarded-for') ||
  event.node.req.socket.remoteAddress
```

**Bug:** `x-forwarded-for` can contain multiple comma-separated IPs and is user-controllable. No IP format validation is performed. An attacker can set `x-forwarded-for: fake-ip-1` to bypass per-IP rate limits.

**How to fix:**
- Only trust `cf-connecting-ip` in Cloudflare environments.
- If `x-forwarded-for` must be used, take only the last IP (closest to the server).
- Validate IP format with a regex or `net.isIP()`.

---

### H9. Unhandled Promise.all Rejection Crashes Endpoint

**File:** `api/routes/single-page.ts:53-60`

```typescript
const contents = await Promise.all(
  files.map(async (file) => {
    const content = await $fetch<string>(file.url)
    return content
  })
)
```

**Bug:** `Promise.all` rejects immediately if any single fetch fails. If one of 30+ GitHub raw URLs is temporarily unavailable, the entire single-page endpoint returns a 500 error — no partial results, no fallback.

**How to fix:** Use `Promise.allSettled` and filter for successful results (see fix in C5).

---

### H10. Feedback Error Handler Stores Error Object as String

**File:** `docs/.vitepress/theme/components/Feedback.vue:100-122`

```typescript
} catch (err) {
  error.value = err  // err is an Error object, not a string
}
```

**Bug:** `error.value` is likely a `Ref<string>`, but an `Error` object is assigned. When rendered in the template, it will show `[object Error]` instead of a human-readable message.

**How to fix:**
```typescript
} catch (err) {
  error.value = err instanceof Error ? err.message : 'An unexpected error occurred'
}
```

---

### H11. RSS Feed Generation Has No Validation or Error Handling

**File:** `docs/.vitepress/hooks/rss.ts:25-62`

```typescript
for (const { url, frontmatter, html } of posts) {
  feed.addItem({
    title: frontmatter.title as string,  // unsafe cast — could be undefined
    ...
  })
}
```

**Bug:** `frontmatter.title` is cast as `string` without validation. If any post is missing a title, the RSS feed will contain `undefined` as a title string. No try-catch wraps the feed generation either, so a single bad post breaks the entire feed.

**How to fix:**
```typescript
for (const { url, frontmatter, html } of posts) {
  if (!frontmatter?.title) {
    consola.warn(`Skipping RSS entry: missing title for ${url}`)
    continue
  }
  feed.addItem({ title: frontmatter.title, ... })
}
```

---

### H12. Shallow Git Clone Breaks "Recently Removed" Feature in CI

**File:** `.github/workflows/deploy-gh-pages.yml:21-22`

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 1
```

**Bug:** `generate-removed.js` runs `git log --since="X days ago" -p` to find recently deleted links. With `fetch-depth: 1`, only the latest commit is available — the script gets no history and the "recently removed" page will always be empty in production.

**How to fix:**
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history for generate-removed.js
```

---

## Medium Severity Issues

### M1. Node Version Mismatch Between package.json and CI Workflows

**Files:**
- `package.json` requires `"node": ">=25.2.1"`
- `.github/workflows/deploy-gh-pages.yml` uses `node-version: 20`
- `.github/workflows/deploy-api.yml` uses `node-version: 24`

**Bug:** Both CI workflows use Node versions lower than the minimum specified in `package.json`. This can cause runtime incompatibilities if the code relies on Node 25+ APIs (e.g., new `URLPattern`, `structuredClone` improvements, etc.).

**How to fix:** Update both workflows to use Node 25+, or lower the engine requirement if Node 25 features aren't actually needed.

---

### M2. OpenGraph Hook Crashes on Missing `hero` Frontmatter

**File:** `docs/.vitepress/hooks/opengraph.ts:154-159`

```typescript
const title = frontmatter.layout === 'home'
  ? (frontmatter.hero.name ?? frontmatter.title)  // crashes if hero is undefined
  : frontmatter.title
```

**Bug:** If a page has `layout: home` but no `hero` object in frontmatter, accessing `frontmatter.hero.name` throws a TypeError.

**How to fix:**
```typescript
const title = frontmatter.layout === 'home'
  ? (frontmatter.hero?.name ?? frontmatter.title)
  : frontmatter.title
```

---

### M3. Hardcoded `/test.png` Favicon — Likely Debug Leftover

**File:** `docs/.vitepress/config.mts:46`

```typescript
['link', { rel: 'icon', href: '/test.png' }],
```

**Bug:** The favicon points to `/test.png` which is almost certainly a debug/test artifact. The actual icon is `fmhy.ico`. Browsers will log 404 errors trying to load this.

**How to fix:**
```typescript
['link', { rel: 'icon', href: '/fmhy.ico' }],
```

---

### M4. Weak Input Validation on Feedback Schema

**File:** `docs/.vitepress/types/Feedback.ts:19-25`

```typescript
export const FeedbackSchema = z.object({
  message: z.string().min(5).max(1000),
  type: z.enum(['suggestion', 'appreciation', 'other']),
  page: z.string().min(3).max(25),
  heading: z.string().min(3).max(99).optional()
})
```

**Bug:** Only length is validated. No regex patterns to reject:
- Control characters and null bytes
- HTML/script tags
- URLs or phishing links in message
- Path traversal patterns in `page`

**How to fix:** Add content validation:
```typescript
page: z.string().min(3).max(25).regex(/^[a-zA-Z0-9\-\/]+$/),
message: z.string().min(5).max(1000).refine(
  (s) => !/<script|javascript:|on\w+=/i.test(s),
  'Message contains prohibited content'
)
```

---

### M5. Missing Webhook Response Logging

**File:** `api/routes/feedback.post.ts:87-92`

```typescript
if (!response.ok) {
  throw createError({
    statusCode: response.status,
    statusMessage: 'Failed to send feedback to Discord'
  })
}
```

**Bug:** When the Discord webhook fails, no details are logged (response body, headers, etc.). In production, debugging webhook failures will be nearly impossible.

**How to fix:**
```typescript
if (!response.ok) {
  const body = await response.text().catch(() => 'Could not read body')
  console.error(`Discord webhook failed: ${response.status} - ${body}`)
  throw createError({ statusCode: 502, statusMessage: 'Failed to send feedback' })
}
```

---

### M6. Environment Variable Exposure Risk

**File:** `nitro.config.ts:22-23`

```typescript
runtimeConfig: {
  WEBHOOK_URL: process.env.WEBHOOK_URL
}
```

**Bug:** `WEBHOOK_URL` is in `runtimeConfig` (not `runtimeConfig.private`), which means it could potentially be exposed via API introspection or error stack traces. Should use Cloudflare Secrets binding instead.

**How to fix:** Use `runtimeConfig` with explicit private scope or Cloudflare Secrets.

---

### M7. Stale Closures in searchScroll.ts (Concurrent Scroll Attempts)

**File:** `docs/.vitepress/theme/composables/searchScroll.ts:197-232`

```typescript
export function scheduleScrollToMatch(hash: string, query: string, initialDelay = 150): void {
  let attempts = 0
  function tryScroll() {
    attempts++
    // ... DOM operations
    if (attempts < maxAttempts) setTimeout(tryScroll, 100)
  }
  requestAnimationFrame(() => setTimeout(tryScroll, initialDelay))
}
```

**Bug:** If the user navigates rapidly between search results, multiple `scheduleScrollToMatch` calls run concurrently with overlapping timeouts. There is no cancellation mechanism, so DOM scroll operations from previous calls can interfere with newer ones.

**How to fix:** Track and cancel previous scroll operations:
```typescript
let activeScrollTimeout: ReturnType<typeof setTimeout> | null = null

export function scheduleScrollToMatch(...) {
  if (activeScrollTimeout) clearTimeout(activeScrollTimeout)
  // ... rest of implementation using activeScrollTimeout
}
```

---

### M8. Unsafe `as any` Type Cast in Transformer

**File:** `docs/.vitepress/transformer/core.ts:41`

```typescript
target.text = target.text.replace(find, replace as any)
```

**Bug:** Bypasses TypeScript's type checking. If `replace` is a function but `find` is a string (not a regex), the function won't receive capture groups as expected.

**How to fix:** Handle both cases explicitly:
```typescript
target.text = typeof replace === 'function'
  ? target.text.replace(find, replace)
  : target.text.replace(find, replace)
```

---

### M9. Unsafe Environment Variable Comparison

**File:** `docs/.vitepress/shared.ts:42-63`

```typescript
if (safeEnv('FMHY_BUILD_NSFW') === 'false') {
  meta.build.nsfw = false
}
```

**Bug:** Only the exact string `'false'` disables NSFW build. Common values like `'0'`, `'False'`, `'FALSE'`, `'no'` are all ignored and default to enabled. Inconsistent with common env var conventions.

**How to fix:**
```typescript
const isFalsy = (val?: string) => ['false', '0', 'no', ''].includes(val?.toLowerCase() ?? '')
if (isFalsy(safeEnv('FMHY_BUILD_NSFW'))) {
  meta.build.nsfw = false
}
```

---

### M10. MiniSearch Prototype Monkey-Patching

**File:** `docs/.vitepress/constants.ts:29-45`

```typescript
const originalToJSON = MiniSearch.prototype.toJSON
MiniSearch.prototype.toJSON = function () {
  const json = originalToJSON.call(this)
  ;(json as Record<string, unknown>).customMetadata = globalLinkMetadata
  return json
}
```

**Bug:** Monkey-patching library prototypes is fragile. If MiniSearch updates its `toJSON` behavior or changes its prototype chain, this patch will break silently. It also affects all MiniSearch instances globally, not just the search instance.

**How to fix:** Extend MiniSearch with a subclass or wrap the instance instead of patching the prototype.

---

### M11. `as any` in Constants Search Config

**File:** `docs/.vitepress/constants.ts:311`

```typescript
} as any,
```

**Bug:** Entire search configuration loses type safety. Misconfigurations won't be caught at compile time.

**How to fix:** Properly type the search configuration object.

---

### M12. Hardcoded GitHub URL in single-page.ts

**File:** `api/routes/single-page.ts:46`

```typescript
url: `https://raw.githubusercontent.com/fmhy/edit/main/docs/${file}`
```

**Bug:** Branch (`main`) and repository are hardcoded. Cannot be changed without code modification. Testing against feature branches or mirrors is impossible.

**How to fix:** Use environment variables:
```typescript
const GITHUB_RAW_BASE = process.env.GITHUB_RAW_BASE ?? 'https://raw.githubusercontent.com/fmhy/edit/main/docs'
url: `${GITHUB_RAW_BASE}/${file}`
```

---

### M13. Cache-Control Allows Stale Content for 2 Hours

**File:** `api/routes/single-page.ts:62-65`

```typescript
appendResponseHeaders(event, {
  'cache-control': 'public, max-age=7200'
})
```

**Bug:** 2-hour cache means content updates are invisible to users for up to 2 hours. With `public`, CDN edge nodes will also cache this. For a site that updates frequently, this is too aggressive.

**How to fix:** Use `stale-while-revalidate` for better UX:
```typescript
'cache-control': 'public, max-age=300, stale-while-revalidate=3600'
```

---

### M14. Missing Abort Controller for Search Fetch Operations

**File:** `docs/.vitepress/theme/components/VPLocalSearchBox.vue:683-714`

```typescript
const mods = await Promise.all(
  candidatesToFetch.map((r) => fetchExcerpt(r.id))
)
```

**Bug:** Rapid search input changes trigger multiple concurrent fetch batches. Old fetches are never cancelled — they complete and write stale results, wasting bandwidth and potentially showing wrong results briefly.

**How to fix:** Use `AbortController` to cancel previous fetch batches when new search input arrives.

---

### M15. Hardcoded Discord Avatar URL

**File:** `api/routes/feedback.post.ts:75-76`

```typescript
avatar_url: 'https://i.kym-cdn.com/entries/icons/facebook/000/043/403/cover3.jpg'
```

**Bug:** External meme image URL. If KnowYourMeme removes or changes this URL, the webhook avatar breaks silently.

**How to fix:** Host the avatar image on your own domain or CDN.

---

## Low Severity Issues

### L1. Inconsistent Error Format in Rate Limiter

**File:** `api/middleware/ratelimit.ts:32`

```typescript
throw createError('Failure – rate limit exceeded')
```

**Bug:** Uses an em dash (`–`) that could cause encoding issues. Also doesn't include `statusCode: 429`, making the response format inconsistent with `feedback.post.ts`.

**How to fix:**
```typescript
throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded' })
```

---

### L2. Unsafe Type Cast in Rate Limiter

**File:** `api/middleware/ratelimit.ts:26`

```typescript
cloudflare.env as unknown as Env
```

**Bug:** Double cast (`as unknown as Env`) completely bypasses TypeScript safety. Any missing properties on the actual env object will only surface at runtime.

**How to fix:** Use a type guard or Zod validation at the boundary.

---

### L3. Missing ARIA Labels on Theme Dropdown

**File:** `docs/.vitepress/theme/components/ThemeDropdown.vue:119-122`

```html
<button type="button" class="theme-dropdown-toggle" :title="currentChoice.label">
```

**Bug:** Icon-only button uses `title` for labeling, which is not accessible to all screen readers. `aria-label` should be used.

**How to fix:**
```html
<button type="button" class="theme-dropdown-toggle" :aria-label="`Theme: ${currentChoice.label}`">
```

---

### L4. Redundant Alt Text on WallpaperCard

**File:** `docs/.vitepress/theme/components/WallpaperCard.vue:23-29`

```html
<img :src="desktop" :alt="title" />
```

**Bug:** `alt` text is the same as the visible heading, providing redundant information to screen readers.

**How to fix:**
```html
<img :src="desktop" :alt="`${title} wallpaper preview`" />
```

---

### L5. Silenced Git Config Error in Build Script

**File:** `scripts/generate-removed.js:88-91`

```javascript
try {
  execSync(`git ${gitDir} config --global --add safe.directory /app`)
} catch (e) {
  // Ignore error if it fails
}
```

**Bug:** Silently swallowing errors makes CI/CD debugging harder. At minimum, log a warning.

---

### L6. Fragile Temp Directory Cleanup

**File:** `scripts/generate-removed.js:256-263`

```javascript
if (gitDir.includes('.git-temp')) {
  const tempDir = gitDir.split('=')[1]
  fs.rmSync(tempDir, { recursive: true, force: true })
}
```

**Bug:** Uses string splitting to extract path — fragile if the format changes. No validation that the path is actually a temp directory before recursive deletion.

**How to fix:** Use `path.resolve()` and validate the path starts with an expected prefix.

---

### L7. Deprecated `biome-ignore` Comment with No Rationale

**File:** `docs/.vitepress/constants.ts:247`

```typescript
// biome-ignore lint/style/noParameterAssign: h
```

**Bug:** Lint suppression with meaningless rationale "h". If the project doesn't use Biome (it uses ESLint), this is dead comment noise.

---

## Production & Heavy Traffic Concerns

### P1. Unbounded Global Cache in Search Component

**File:** `docs/.vitepress/theme/components/VPLocalSearchBox.vue:15-29`

```typescript
const globalExcerptCache = new Map<string, Map<string, string>>()
```

**Risk:** This cache is never cleared or size-limited. On a long-running SPA session with many searches, memory usage grows unboundedly.

**Recommendation:** Add LRU eviction with a max size of ~500 entries.

---

### P2. O(n log n) Sort on Every Keystroke

**File:** `docs/.vitepress/theme/components/VPLocalSearchBox.vue:610-617`

```typescript
boostedResults.sort((a, b) => { ... })
```

**Risk:** With hundreds of search results, sorting runs on every filter change. Combined with debounced search, this creates noticeable lag on mobile devices.

**Recommendation:** Only re-sort when the result set actually changes, not on every keystroke.

---

### P3. Layout Thrashing in mergeNearbyMarks

**File:** `docs/.vitepress/theme/components/VPLocalSearchBox.vue:842-894`

**Risk:** DOM reads and writes are interleaved in a loop. Each `appendChild` call inside the `while` loop forces the browser to recalculate layout, causing visible jank with 100+ results.

**Recommendation:** Batch DOM mutations using `DocumentFragment` or `requestAnimationFrame`.

---

### P4. No Request Body Size Limit on Feedback Endpoint

**File:** `api/routes/feedback.post.ts`

**Risk:** While Zod validates field lengths, there's no limit on the raw HTTP request body size. An attacker could send a multi-megabyte JSON payload with extra fields that Zod strips but still consumes parsing time and memory.

**Recommendation:** Add `readBody` size limits or use Cloudflare's request size configuration.

---

### P5. Single-Page Endpoint Fetches All Docs Sequentially Through Promise.all

**File:** `api/routes/single-page.ts:53-60`

**Risk:** Fetches 30+ files from GitHub simultaneously. Under heavy traffic, this multiplies outbound connections. 100 concurrent users = 3,000+ simultaneous GitHub API calls, likely triggering GitHub rate limits.

**Recommendation:**
- Cache the assembled page with a TTL.
- Use `p-limit` to cap concurrent fetches to 5-10.
- Pre-build the single page at deploy time instead of fetching at runtime.

---

### P6. No CDN Caching Strategy for Static Assets

**Risk:** The API serves markdown content with only a 2-hour cache. Static assets in the docs site don't have documented cache-busting (content hashes in filenames). Under heavy traffic, origin servers handle more requests than necessary.

**Recommendation:** Implement content-hash-based filenames for static assets and longer cache TTLs with proper `stale-while-revalidate`.

---

## CI/CD Pipeline Issues

| Issue | File | Description |
|-------|------|-------------|
| Node version mismatch | Both workflow files | Workflows use Node 20/24, package.json requires >=25.2.1 |
| Shallow clone | `deploy-gh-pages.yml` | `fetch-depth: 1` breaks `generate-removed.js` git history |
| No build caching | `deploy-gh-pages.yml` | No caching for `node_modules` or VitePress build cache |
| Missing test step | Both workflows | No test or lint step before deployment |
| No staging environment | N/A | Deploys directly to production with no preview |

---

## Prioritized Fix Order

| Priority | Issues | Effort |
|----------|--------|--------|
| 1 — Fix Now | C1, C2, C3, C6 (XSS vulnerabilities) | Add DOMPurify, escape strings |
| 2 — Fix Now | C5, H9 (SSRF, unhandled rejections) | Add timeouts, use Promise.allSettled |
| 3 — Fix Now | C7 (missing imports — page crash) | Add 2 import lines |
| 4 — This Week | H1, H2, H8 (rate limiting, CORS, IP spoofing) | Restrict CORS, validate IPs |
| 5 — This Week | H3-H6 (memory leaks) | Refactor lifecycle hooks |
| 6 — This Sprint | M1, H12 (CI node version, shallow clone) | Update workflow YAML |
| 7 — This Sprint | M2-M5 (error handling, validation) | Add guards and logging |
| 8 — Backlog | L1-L7, P1-P6 (low severity, perf) | Incremental improvements |
