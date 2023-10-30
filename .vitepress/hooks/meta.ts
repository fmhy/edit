import type { HeadConfig, TransformContext } from "vitepress";

export function generateMeta(context: TransformContext, hostname: string) {
  const head: HeadConfig[] = [];
  const { pageData } = context;

  const url = `${hostname}/${pageData.relativePath.replace(/((^|\/)index)?\.md$/, "$2")}`;

  head.push(["link", { rel: "canonical", href: url }]);
  head.push(["meta", { property: "og:url", content: url }]);
  head.push(["meta", { name: "twitter:url", content: url }]);
  head.push(["meta", { name: "twitter:card", content: "summary_large_image" }]);

  if (pageData.frontmatter.theme) {
    head.push(["meta", { name: "theme-color", content: pageData.frontmatter.theme }]);
  }
  if (pageData.frontmatter.type) {
    head.push(["meta", { property: "og:type", content: pageData.frontmatter.type }]);
  }
  if (pageData.frontmatter.description) {
    head.push([
      "meta",
      {
        property: "og:description",
        content: pageData.frontmatter.description,
      },
    ]);
    head.push([
      "meta",
      {
        name: "twitter:description",
        content: pageData.frontmatter.description,
      },
    ]);
  }
  head.push(["meta", { property: "og:title", content: pageData.frontmatter.title }]);
  head.push(["meta", { name: "twitter:title", content: pageData.frontmatter.title }]);

  if (pageData.frontmatter.image) {
    head.push([
      "meta",
      {
        property: "og:image",
        content: `${hostname}/${pageData.frontmatter.image.replace(/^\//, "")}`,
      },
    ]);
    head.push([
      "meta",
      {
        name: "twitter:image",
        content: `${hostname}/${pageData.frontmatter.image.replace(/^\//, "")}`,
      },
    ]);
  }
  if (pageData.frontmatter.tag) {
    head.push(["meta", { property: "article:tag", content: pageData.frontmatter.tag }]);
  }
  if (pageData.frontmatter.date) {
    head.push([
      "meta",
      {
        property: "article:published_time",
        content: pageData.frontmatter.date,
      },
    ]);
  }
  if (pageData.lastUpdated && pageData.frontmatter.lastUpdated !== false) {
    head.push([
      "meta",
      {
        property: "article:modified_time",
        content: new Date(pageData.lastUpdated).toISOString(),
      },
    ]);
  }

  return head;
}
