import os

headersData = {
    "AdblockVPNGuide.md":       ["Adblocking / Privacy", "Adblocking, Privacy, VPN's, Proxies, Antivirus"],
    "AI.md":                    ["Artificial Intelligence", "Chat Bots, Text Generators, Image Generators, ChatGPT Tools"],
    "Android-iOSGuide.md":      ["Android / iOS", "Apps, Jailbreaking, Android Emulators"],
    "AudioPiracyGuide.md":      ["Music / Podcasts / Radio", "Stream Audio, Download Audio, Torrent Audio"],
    "Beginners-Guide.md":       ["Beginners Guide", "A Guide for Beginners to Piracy"],
    "DEVTools.md":              ["Developer Tools", "Git, Hosting, App Dev, Software Dev"],
    "DownloadPiracyGuide.md":   ["Downloading", "Download Sites, Software Sites, Open Directories"],
    "EDUPiracyGuide.md":        ["Educational", "Courses, Documentaries, Learning Resources"],
    "GamingPiracyGuide.md":     ["Gaming / Emulation", "Download Games, ROMs, Gaming Tools"],
    "LinuxGuide.md":            ["Linux / MacOS", "Apps, Software Sites, Gaming"],
    "MISCGuide.md":             ["Miscellaneous", "Extensions, Indexes, News, Health, Food, Fun"],
    "NSFWPiracy.md":            ["NSFW", "NSFW Indexes, Streaming, Downloading"],
    "Non-English.md":           ["Non-English", "International Piracy Sites"],
    "ReadingPiracyGuide.md":    ["Books / Comics / Manga", "Books, Comics, Magazines, Newspapers"],
    "STORAGE.md":               ["Storage", "Index for everything in the wiki."],
    "TOOLSGuide.md":            ["Tools", "General Tools, Internet Tools, System Tools"],
    "TorrentPiracyGuide.md":    ["Torrenting", "Torrent Clients, Torrent Sites, Trackers"],
    "VideoPiracyGuide.md":      ["Movies / TV / Anime", "Stream Videos, Download Videos, Torrent Videos"],
    "base64.md":                ["Base64", "Base64 storage"],
    "img-tools.md":             ["Image Tools", "Image Editors, Generators, Compress"],
    "UnsafeSites.md":           ["Unsafe Sites", "Unsafe/harmful sites to avoid."]
}

def getHeaderForPage(pageFilename):
    data = headersData[pageFilename]
    header = '---\n' + 'title: ' + '"' + data[0] + '"' + '\n' + 'description: ' + data[1] + '\n' + '---\n' + '# ' + data[0] + '\n'  + data[1] + '\n\n'
    return header

def apply_to_all_md_files_in_current_dir():
    files = os.listdir('.')
    for file in files:
        if file in headersData:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                if not content.startswith('---'):
                    with open(file, 'w', encoding='utf-8') as f2:
                        header = getHeaderForPage(file)
                        f2.write(header+content)

apply_to_all_md_files_in_current_dir()
