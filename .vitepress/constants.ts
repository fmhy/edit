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
    icon: {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547l-.8 3.747c1.824.07 3.48.632 4.674 1.488c.308-.309.73-.491 1.207-.491c.968 0 1.754.786 1.754 1.754c0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87c-3.874 0-7.004-2.176-7.004-4.87c0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754c.463 0 .898.196 1.207.49c1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197a.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248c.687 0 1.248-.561 1.248-1.249c0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25c0 .687.561 1.248 1.249 1.248c.688 0 1.249-.561 1.249-1.249c0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094a.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913c.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463a.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73c-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
    },
    ariaLabel: "Reddit",
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
      { text: "🔑 Base64", link: "/base64" },
      { text: "📦 Storage", link: "/storage" },
    ],
  },
];
