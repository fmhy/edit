import os


headers = {
    "adblockvpnguide.md": [
        "Adblocking / Privacy",
        "Adblocking, Privacy, VPN's, Proxies, Antivirus",
    ],
    "ai.md": [
        "Artificial Intelligence",
        "Chat Bots, Text Generators, Image Generators, ChatGPT Tools",
    ],
    "android-iosguide.md": ["Android / iOS", "Apps, Jailbreaking, Android Emulators"],
    "audiopiracyguide.md": [
        "Music / Podcasts / Radio",
        "Stream Audio, Download Audio, Torrent Audio",
    ],
    "beginners-guide.md": ["Beginners Guide", "A Guide for Beginners to Piracy"],
    "downloadpiracyguide.md": [
        "Downloading",
        "Download Sites, Software Sites, Open Directories",
    ],
    "edupiracyguide.md": ["Educational", "Courses, Documentaries, Learning Resources"],
    "gamingpiracyguide.md": [
        "Gaming / Emulation",
        "Download Games, ROMs, Gaming Tools",
    ],
    "linuxguide.md": ["Linux / MacOS", "Apps, Software Sites, Gaming"],
    "miscguide.md": ["Miscellaneous", "Extensions, Indexes, News, Health, Food, Fun"],
    "nsfwpiracy.md": ["NSFW", "NSFW Indexes, Streaming, Downloading"],
    "non-english.md": ["Non-English", "International Piracy Sites"],
    "readingpiracyguide.md": [
        "Books / Comics / Manga",
        "Books, Comics, Magazines, Newspapers",
    ],
    "gaming-tools.md": [
        "Gaming Tools",
        "Gaming Optimization, Game Launchers, Multiplayer",
    ],
    "devtools.md": ["Developer Tools", "Git, Hosting, App Dev, Software Dev"],
    "img-tools.md": ["Image Tools", "Image Editors, Generators, Compress"],
    "audio-tools.md": [
        "Audio Tools",
        "Audio Players, Audio Editors, Audio Downloaders",
    ],
    "system-tools.md": [
        "System Tools",
        "System Tools, Hardware Tools, Windows ISOs, Customization",
    ],
    "file-tools.md": ["File Tools", "Download Managers, File Hosting, File Archivers"],
    "video-tools.md": [
        "Video Tools",
        "Video Players, Video Editors, Live Streaming, Animation",
    ],
    "text-tools.md": ["Text Tools", "Text Editors, Pastebins, Fonts, Translators"],
    # "internet-tools.md": ["Internet Tools", "Browsers, Extensions, Search Engines"],
    "social-media-tools.md": [
        "Social Media Tools",
        "Discord Tools, Reddit Tools, YouTube Tools",
    ],
    "storage.md": ["Storage", "Sections too big to fit on main pages"],
    "torrentpiracyguide.md": ["Torrenting", "Torrent Clients, Torrent Sites, Trackers"],
    "videopiracyguide.md": [
        "Movies / TV / Anime",
        "Stream Videos, Download Videos, Torrent Videos",
    ],
    "base64.md": ["Base64", "Base64 storage"],
    "unsafesites.md": ["Unsafe Sites", "Unsafe/harmful sites to avoid."],
}

title = '<div class="space-y-2 not-prose"><h1 class="text-4xl font-extrabold tracking-tight text-primary underline lg:text-5xl lg:leading-[3.5rem]">'

description = '<p class="text-black dark:text-text-2">'


def getHeader(page: str):
    data = headers[page]
    header = "---\n"
    header += f'title: "{data[0]}"\n'
    header += f"description: {data[1]}\n"
    header += "---\n"
    header += f"{title}{data[0]}</h1>\n"
    header += f"{description}{data[1]}</p></div>\n\n"
    return header


def main():
    files = os.listdir("docs/")
    for file in files:
        if file in headers:
            with open(f"docs/{file}", "r", encoding="utf-8") as f:
                content = f.read()
                if not content.startswith("---"):
                    with open(f"docs/{file}", "w", encoding="utf-8") as f2:
                        header = getHeader(file)
                        f2.write(header + content)


main()
