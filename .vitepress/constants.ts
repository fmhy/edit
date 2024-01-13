import type { DefaultTheme } from "vitepress";

export const meta = {
  name: "FreeMediaHeckYeah",
  description: "The largest collection of free stuff on the internet!",
  hostname: "https://fmhy.net",
  keywords: ["stream", "movies", "gaming", "reading", "anime"],
};

export const commitRef = process.env.CF_PAGES
  ? `<a href="https://github.com/fmhy/FMHYEdit/commit/${
      process.env.CF_PAGES_COMMIT_SHA
    }">${process.env.CF_PAGES_COMMIT_SHA.slice(0, 8)}</a>`
  : "dev";

export const feedback = `<a href="/feedback" class="feedback-footer">Made with ❤️</a>`;

export const search: DefaultTheme.Config["search"] = {
  options: {
    miniSearch: {
      searchOptions: {
        combineWith: "AND",
        fuzzy: false,
        // @ts-ignore
        boostDocument: (_, term, storedFields: Record<string, string | string[]>) => {
          const titles = (storedFields?.titles as string[])
            .filter((t) => Boolean(t))
            .map((t) => t.toLowerCase());
          // Uprate if term appears in titles. Add bonus for higher levels (i.e. lower index)
          const titleIndex =
            titles.map((t, i) => (t?.includes(term) ? i : -1)).find((i) => i >= 0) ?? -1;
          if (titleIndex >= 0) return 10000 - titleIndex;

          return 1;
        },
      },
    },
    detailedView: true,
  },
  provider: "local",
};

export const socialLinks: DefaultTheme.SocialLink[] = [
  { icon: "github", link: "https://github.com/fmhy/FMHYEdit" },
  { icon: "discord", link: "https://discord.gg/Stz6y6NgNg" },
  {
    icon: "reddit",
    link: "https://reddit.com/r/FREEMEDIAHECKYEAH",
  },
];

export const sidebar: DefaultTheme.Sidebar = [
  { text: "📛 Adblocking / Privacy", link: "/adblockvpnguide" },
  { text: "🤖 Artificial Intelligence", link: "/ai" },
  { text: "📺 Movies / TV / Anime", link: "/videopiracyguide" },
  { text: "🎵 Music / Podcasts / Radio", link: "/audiopiracyguide" },
  { text: "🎮 Gaming / Emulation", link: "/gamingpiracyguide" },
  { text: "📗 Books / Comics / Manga", link: "/readingpiracyguide" },
  { text: "💾 Downloading", link: "/downloadpiracyguide" },
  { text: "🌀 Torrenting", link: "/torrentpiracyguide" },
  { text: "🧠 Educational", link: "/edupiracyguide" },
  { text: "📱 Android / iOS", link: "/android-iosguide" },
  { text: "🐧 Linux / MacOS", link: "/linuxguide" },
  { text: "🌍 Non-English", link: "/non-english" },
  { text: "📂 Miscellaneous", link: "/miscguide" },
  {
    text: "🔧 Tools",
    collapsed: false,
    items: [
      { text: "💻 System Tools", link: "/system-tools" },
      { text: "🗃️ File Tools", link: "/file-tools" },
      { text: "🔗 Internet Tools", link: "/internet-tools" },
      { text: "💬 Social Media Tools", link: "/social-media-tools" },
      { text: "📝 Text Tools", link: "/text-tools" },
      { text: "👾 Gaming Tools", link: "/gamingpiracyguide#gaming-tools" },
      { text: "📷 Image Tools", link: "/img-tools" },
      { text: "📼 Video Tools", link: "/video-tools" },
      { text: "🔊 Audio Tools", link: "/audiopiracyguide#audio-tools" },
      { text: "🍎 Educational Tools", link: "/edupiracyguide#educational-tools" },
      { text: "👨‍💻 Developer Tools", link: "/devtools" },
    ],
  },
  {
    text: "➕️ More",
    collapsed: true,
    items: [
      { text: "🔞 NSFW", link: "/nsfwpiracy" },
      { text: "⚠️ Unsafe Sites", link: "/unsafesites" },
      { text: "📦 Storage", link: "/storage" },
    ],
  },
];
