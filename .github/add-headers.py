import os


headers = {
    "AdblockVPNGuide.md": [
        "Adblocking / Privacy",
        "Adblocking, Privacy, VPN's, Proxies, Antivirus",
    ],
    "AI.md": [
        "Artificial Intelligence",
        "Chat Bots, Text Generators, Image Generators, ChatGPT Tools",
    ],
    "Android-iOSGuide.md": ["Android / iOS", "Apps, Jailbreaking, Android Emulators"],
    "AudioPiracyGuide.md": [
        "Music / Podcasts / Radio",
        "Stream Audio, Download Audio, Torrent Audio",
    ],
    "Beginners-Guide.md": ["Beginners Guide", "A Guide for Beginners to Piracy"],
    "DownloadPiracyGuide.md": [
        "Downloading",
        "Download Sites, Software Sites, Open Directories",
    ],
    "EDUPiracyGuide.md": ["Educational", "Courses, Documentaries, Learning Resources"],
    "GamingPiracyGuide.md": [
        "Gaming / Emulation",
        "Download Games, ROMs, Gaming Tools",
    ],
    "LinuxGuide.md": ["Linux / MacOS", "Apps, Software Sites, Gaming"],
    "MISCGuide.md": ["Miscellaneous", "Extensions, Indexes, News, Health, Food, Fun"],
    "NSFWPiracy.md": ["NSFW", "NSFW Indexes, Streaming, Downloading"],
    "Non-English.md": ["Non-English", "International Piracy Sites"],
    "ReadingPiracyGuide.md": [
        "Books / Comics / Manga",
        "Books, Comics, Magazines, Newspapers",
    ],
    "gaming-tools.md": ["Gaming Tools", "Gaming Optimization, Game Launchers, Multiplayer"],
    "DEVTools.md": ["Developer Tools", "Git, Hosting, App Dev, Software Dev"],
    "img-tools.md": ["Image Tools", "Image Editors, Generators, Compress"],
    "Audio-Tools.md": [
        "Audio Tools",
        "Audio Players, Audio Editors, Audio Downloaders",
    ],
    "System-Tools.md": [
        "System Tools",
        "System Tools, Hardware Tools, Windows ISOs, Customization",
    ],
    "File-Tools.md": ["File Tools", "Download Managers, File Hosting, File Archivers"],
    "Video-Tools.md": [
        "Video Tools",
        "Video Players, Video Editors, Live Streaming, Animation",
    ],
    "Text-Tools.md": ["Text Tools", "Text Editors, Pastebins, Fonts, Translators"],
    # "Internet-Tools.md": ["Internet Tools", "Browsers, Extensions, Search Engines"],
    "Social-Media-Tools.md": [
        "Social Media Tools",
        "Discord Tools, Reddit Tools, YouTube Tools",
    ],
    "STORAGE.md": ["Storage", "Sections too big to fit on main pages"],
    "TorrentPiracyGuide.md": ["Torrenting", "Torrent Clients, Torrent Sites, Trackers"],
    "VideoPiracyGuide.md": [
        "Movies / TV / Anime",
        "Stream Videos, Download Videos, Torrent Videos",
    ],
    "base64.md": ["Base64", "Base64 storage"],
    "UnsafeSites.md": ["Unsafe Sites", "Unsafe/harmful sites to avoid."],
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
    files = os.listdir(".")
    for file in files:
        if file in headers:
            with open(file, "r", encoding="utf-8") as f:
                content = f.read()
                if not content.startswith("---"):
                    with open(file, "w", encoding="utf-8") as f2:
                        header = getHeader(file)
                        f2.write(header + content)


main()
