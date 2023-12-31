import path from "path";
import { writeFileSync } from "fs";
import { Feed } from "feed";
import { createContentLoader, type SiteConfig } from "vitepress";
import { meta } from "./constants";

export async function genFeed(config: SiteConfig) {
  const feed = new Feed({
    title: "FMHY • Monthy Posts",
    description: meta.description,
    id: meta.hostname,
    link: meta.hostname,
    language: "en",
    image: "https://github.com/fmhy.png",
    copyright: "",
  });

  const posts = await createContentLoader("posts/**/*.md", {
    excerpt: true,
    render: true,
  }).load();

  posts.sort(
    (a, b) => +new Date(b.frontmatter.date as string) - +new Date(a.frontmatter.date as string),
  );

  for (const { url, excerpt, frontmatter, html } of posts) {
    feed.addItem({
      title: frontmatter.title,
      id: `${meta.hostname}${url}`,
      link: `${meta.hostname}${url.split("/posts")[1]}`,
      description: excerpt,
      content: html,
      date: frontmatter.date,
    });
  }

  writeFileSync(path.join(config.outDir, "feed.rss"), feed.rss2());
}
