import os

headersData = {
    "AdblockVPNGuide.md":       [":name_badge:",        "140", "# Adblocking / Privacy", "Adblocking, Privacy, VPN's, Proxies, Antivirus"],
    "AI.md":                    [":robot_face:",        "130", "# Artificial Intelligence", "Chat Bots, Text Generators, Image Generators, ChatGPT Tools"],
    "Android-iOSGuide.md":      [":iphone:",            "45", "# Android / iOS", "Apps, Jailbreaking, Android Emulators"],
    "AudioPiracyGuide.md":      [":musical_note:",      "110", "# Music / Podcasts / Radio", "Stream Audio, Download Audio, Torrent Audio"],
    "Beginners-Guide.md":       [":pirate_flag:",       "150", "# Beginners Guide to Piracy", ""],
    "DEVTools.md":              [":male-technologist:", "50", "# Developer Tools", ""],
    "DownloadPiracyGuide.md":   [":floppy_disk:",       "80", "# Downloading", "Download Sites, Software Sites, Open Directories"],
    "EDUPiracyGuide.md":        [":brain:",             "60", "# Educational", "Courses, Documentaries, Learning Resources"],
    "GamingPiracyGuide.md":     [":video_game:",        "100", "# Gaming / Emulation", "Download Games, ROMs, Gaming Tools"],
    "LinuxGuide.md":            [":penguin:",           "40", "# Linux / MacOS", "Apps, Software Sites, Gaming"],
    "MISCGuide.md":             [":open_file_folder:",  "30", "# Miscellaneous", "Extensions, Indexes, News, Health, Food, Fun"],
    "NSFWPiracy.md":            [":underage:",          "25", "# NSFW", ""],
    "Non-English.md":           [":earth_asia:",        "35", "# Non-English", "International Piracy Sites"],
    "ReadingPiracyGuide.md":    [":green_book:",        "90", "# Books / Comics / Manga", "Books, Comics, Magazines, Newspapers"],
    "STORAGE.md":               [":card_file_box:",     "1", "", ""],
    "TOOLSGuide.md":            [":wrench:",            "58", "# Tools", "General Tools, Internet Tools, System Tools"],
    "TorrentPiracyGuide.md":    [":cyclone:",           "70", "# Torrenting", "Torrent Clients, Torrent Sites, Trackers"],
    "VideoPiracyGuide.md":      [":tv:",                "120", "# Movies / TV / Anime", "Stream Videos, Download Videos, Torrent Videos"],
    "base64.md":                [":key:",               "20", "", ""],
    "img-tools.md":             [":camera:",            "55", "# Image Tools", ""]
}

def getHeaderForPage(pageFilename):
    data = headersData[pageFilename]
    header = '---\n' + 'icon: ' + '"' + data[0] + '"' + '\n' + 'order: ' + data[1] + '\n' + '---\n' + data[2] + '\n'  + data[3] + '\n\n'
    return header

def apply_to_all_md_files_in_current_dir():
    files = os.listdir('.')
    for file in files:
        if file in headersData:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                if not content.startswith('---'):
                    print("adding header to " + file)
                    with open(file, 'w', encoding='utf-8') as f2:
                        header = getHeaderForPage(file)
                        f2.write(header+content)

apply_to_all_md_files_in_current_dir()