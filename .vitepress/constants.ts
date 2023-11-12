export const meta = {
  name: "FreeMediaHeckYeah",
  description:
    "The Largest Collection Of Free Stuff On The Internet!The Largest Collection Of Free Stuff On The Internet!",
  hostname: process.env.COMMIT_REF ? "https://fmhy.netlify.app" : "https://fmhy.pages.dev",
  keywords: ["stream", "movies", "gaming", "reading", "anime"],
};

// Netlify to Cloudflare otherwise dev
export const commitRef = process.env.COMMIT_REF
  ? `<a href="https://github.com/fmhy/FMHYEdit/commit/${process.env.COMMIT_REF
  }">${process.env.COMMIT_REF.slice(0, 8)}</a>`
  : process.env.CF_PAGES_COMMIT_SHA
    ? `<a href="https://github.com/fmhy/FMHYEdit/commit/${process.env.CF_PAGES_COMMIT_SHA
    }">${process.env.CF_PAGES_COMMIT_SHA.slice(0, 8)}</a>`
    : "dev";
