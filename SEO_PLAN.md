# FMHY SEO plan

This plan covers the SEO work implemented in this repository and the checks to keep it healthy after deployment.

## 1. Crawl and indexation

- Keep one clean, indexable URL for each page.
- Output an absolute self-referencing canonical on every indexable page.
- Keep the sandbox out of search results and out of the XML sitemap.
- Keep CSS, JavaScript and images crawlable. Search engines need page assets to render pages correctly.
- Publish the sitemap location in `robots.txt`.
- Keep legacy server redirects such as `/miscguide` and `/readingpiracyguide` pointing to their current pages.
- Redirect `/audio-tools` permanently to the merged Audio Tools section at `/audio#audio-tools`.
- Avoid linking internally to legacy routes. Internal links should go straight to the final URL.

## 2. Titles and descriptions

- Use `FMHY` as the homepage title.
- Use `Page title | FMHY` for internal pages.
- Keep titles descriptive and based on the actual page topic.
- Use the page frontmatter description where one exists.
- Use the site description only as a fallback.
- Do not use `meta keywords`. Modern search engines do not use it for ranking.

## 3. Canonical URLs

- Canonicals use `https://fmhy.net` and clean URLs without `.html`.
- Query strings and URL fragments are excluded from canonical URLs.
- The homepage canonical is `https://fmhy.net/`.
- Redirected and obsolete routes must not appear in the sitemap.

## 4. Open Graph and social cards

Every indexable page now outputs:

- `og:type`
- `og:locale`
- `og:site_name`
- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `og:image:alt`
- Twitter large image card metadata

The existing per-page OG image generator is still used. Generated images remain 1200 by 630 and are shared by Open Graph and Twitter cards.

## 5. Structured data

Every indexable page includes JSON-LD for:

- `Organization`
- `WebSite`
- `WebPage`
- `BreadcrumbList` where a breadcrumb is useful

Posts also include `BlogPosting` with the real frontmatter publication date when available. No ratings, reviews, FAQ markup, authors, or dates are invented.

## 6. Internal linking

Legacy links in old posts have been changed to their current destinations. The old Reddit audio tools route is also transformed directly to the current Audio Tools section instead of creating a link to `/audio-tools`.

When adding content, link to the current canonical page directly. Do not rely on a redirect for internal navigation.

## 7. Content work

Technical SEO is only the base. The next content passes should focus on pages that already receive impressions or backlinks.

For important category pages:

1. Keep the page title specific to the category.
2. Keep the short description useful and readable.
3. Add a brief introduction only when it helps a visitor understand the page.
4. Keep important sections reachable through descriptive internal links.
5. Avoid adding repetitive keyword-heavy text above resource lists.

For posts:

1. Keep the date accurate.
2. Use a specific title instead of a generic update label when the post has a single subject.
3. Keep the description specific enough to stand on its own in search results and social cards.
4. Link older posts to current category URLs when a route changes.

## 8. Deployment checks

Run:

```bash
pnpm docs:build
pnpm seo:check
```

The SEO check verifies canonical tags, descriptions, robots directives, Open Graph tags, Twitter cards, JSON-LD, sitemap cleanup, and the sitemap declaration in `robots.txt`.

After deployment, spot-check the homepage, a category page, a post, and the 404 page in the rendered HTML.

## 9. Search Console and webmaster tools

After deployment:

- Submit `https://fmhy.net/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Inspect the homepage and the highest-value category pages to confirm the selected canonical matches the declared canonical.
- Review indexed pages for stale legacy URLs.
- Check crawl errors for new 404s caused by internal links.
- Watch title and description rewrites before making broad copy changes.
- Compare clicks and impressions by page every month, not just total site traffic.

## 10. Ongoing maintenance

For each route change:

1. Add or keep a permanent server redirect from the old URL.
2. Update all internal links to the new URL.
3. Remove the old URL from the sitemap.
4. Keep the new page self-canonical.
5. Check important external backlinks and update them where practical.

For each new page, make sure it has a useful title, description, one H1, internal links, a generated social image, a canonical URL, and valid structured data.
