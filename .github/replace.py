import re
import os


def beginners_guide(text: str):
    text = re.sub("\[TOC\]\n", "", text, flags=re.MULTILINE)
    text = re.sub("\*\*Table of Contents\*\*\n\[TOC2\]\n", "", text, flags=re.MULTILINE)
    text = re.sub(
        "# -> \*\*\*Beginners Guide to Piracy\*\*\* <-\n", "", text, flags=re.MULTILINE
    )
    text = re.sub(r"!!!note\s(.+?)\n", r":::info\n\1\n:::\n", text, flags=re.MULTILINE)
    text = re.sub(r"!!!info\s(.+?)\n", r":::info\n\1\n:::\n", text, flags=re.MULTILINE)
    text = re.sub(
        r"!!!warning\s(.+?)\n", r":::warning\n\1\n:::\n", text, flags=re.MULTILINE
    )
    text = re.sub(r">\s(.+?)\n", r"> \1\n\n", text, flags=re.MULTILINE)
    text = re.sub(
        "\*\*\[\^ Back to Top\]\(#beginners-guide-to-piracy\)\*\*",
        "",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(r"!!!\s(.+?)\n", r":::info\n\1\n:::\n", text, flags=re.MULTILINE)
    text = re.sub("\n\*\*\[", "\n* **[", text, flags=re.MULTILINE)
    text = re.sub(r">(.*)\n\n(.*)", r":::details \1\n\2\n:::", text, flags=re.MULTILINE)
    return text


def individual(text: str):
    # special cases of link not replaced correctly
    text = re.sub(
        "/storage/#encode--decode_urls", "/storage/#encode--decode-urls", text
    )
    text = re.sub("/base64/#do-k-ument", "/base64/#do_k_ument", text)
    text = re.sub("/devtools/#machine-learning2", "/devtools/#machine-learning-1", text)
    text = re.sub("/linuxguide#software-sites2", "/linuxguide#software-sites-1", text)
    text = re.sub("/linuxguide#software_sites", "/linuxguide#software-sites", text)
    text = re.sub("/non-english#reading10", "/non-english#reading-9", text)
    text = re.sub("/storage#satellite-.26amp.3B_street_view_maps", "/storage#satellite-street-view-maps", text)

    # Base64-decoder script link
    text = re.sub(
        "(.+?) site or extension\.\n",
        "Click on the texts to copy them decoded.\n",
        text,
        flags=re.MULTILINE,
    )

    return text


def general(text: str):
    text = re.sub("\*\*\*\n\n", "", text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n", "", text, flags=re.MULTILINE)

    text = re.sub("# ►", "##", text)
    text = re.sub("## ▷", "###", text)
    text = re.sub("####", "###", text)

    text = re.sub("⭐", ":star:", text)
    text = re.sub("🌐", ":globe-with-meridians: ", text)
    text = re.sub("↪️ ", ":repeat-button: ", text)

    text = re.sub(
        r"^\*\*Note\*\* - (.+)$", r":::tip\n\1\n:::", text, flags=re.MULTILINE
    )
    text = re.sub(
        r"^\* \*\*Note\*\* - (.+)$", r":::tip\n\1\n:::", text, flags=re.MULTILINE
    )
    text = re.sub(r"^Note - (.+)$", r":::tip\n\1\n:::", text, flags=re.MULTILINE)
    text = re.sub(
        r"^\*\*Warning\*\* - (.+)$", r":::warning\n\1\n:::", text, flags=re.MULTILINE
    )

    text = re.sub(r"^\*\s([^*])", "- \\1", text, 0, re.MULTILINE)
    return text


def remove_backtowiki_toc(text):
    text = re.sub(
        "\*\*\[◄◄ Back to Wiki Index\]\(https://www\.reddit\.com/r/FREEMEDIAHECKYEAH/wiki/index\)\*\*\n",
        "",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        "\*\*\[◄◄ Back to Wiki Index\]\(https://www\.reddit\.com/r/FREEMEDIAHECKYEAH/wiki/tools-index\)\*\*\n",
        "",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        r"\*\*\[Table of Contents\]\(https?:\/\/.*?ibb\.co.*\)\*\* - For mobile users\n",
        "",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        "\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n",
        "",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        "\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\* \n\n",
        "",
        text,
        flags=re.MULTILINE,
    )
    text = re.sub(
        "\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n", "", text, flags=re.MULTILINE
    )
    text = re.sub(
        "\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n", "", text, flags=re.MULTILINE
    )
    text = re.sub("\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n", "", text, flags=re.MULTILINE)
    return text


def replace_pages(text):
    text = re.sub("https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/ai", "/ai", text)
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/adblock-vpn-privacy",
        "/adblockvpnguide",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/android",
        "/android-iosguide",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/games",
        "/gamingpiracyguide",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/reading",
        "/readingpiracyguide",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/download",
        "/downloadpiracyguide",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/torrent",
        "/torrentpiracyguide",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/edu", "/edupiracyguide", text
    )

    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/system-tools",
        "/system-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/file-tools",
        "/file-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/internet-tools",
        "/internet-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/social-media",
        "/social-media-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/text-tools",
        "/text-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/video-tools",
        "/video-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/audio-tools",
        "/audio-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/game-tools",
        "/gaming-tools",
        text,
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/video",
        "/videopiracyguide",
        text,
    )  # This replace has to go after the /video-tools replace
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/audio",
        "/audiopiracyguide",
        text,
    )  # This replace has to go after the /audio-tools replace
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/linux", "/linuxguide", text
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/non-eng", "/non-english", text
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/misc", "/miscguide", text
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage", "/storage", text
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/dev-tools", "/devtools", text
    )
    text = re.sub(
        "https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/img-tools", "/img-tools", text
    )

    text = re.sub(
        "https://github.com/nbats/FMHYedit/blob/main/base64.md#", "/base64/#", text
    )

    return text


def replace_underscore(text):
    pattern = r"(/#[\w\-]+(?:_[\w]+)*)"
    matches = re.findall(pattern, text)
    for match in matches:
        replacement = match.replace("_", "-")
        text = text.replace(match, replacement)
    return text


def reformat_subsections(text):
    text = re.sub("/#wiki_", "/#", text)
    text = re.sub("#wiki_", "/#", text)
    text = re.sub(".25BA_", "", text)
    text = re.sub(".25B7_", "", text)
    text = re.sub("_.2F_", "-", text)
    text = replace_underscore(text)
    return text


def replace_urls(text):
    text = remove_backtowiki_toc(text)
    text = replace_pages(text)
    text = reformat_subsections(text)
    text = re.sub("/#", "#", text)
    text = general(text)
    text = individual(text)
    return text


def main():
    files = os.listdir(".")
    for file in files:
        if file.endswith(".md"):
            with open(file, "r", encoding="utf-8") as f:
                content = f.read()
                content = replace_urls(content)
                if file == "Beginners-Guide.md":
                    content = beginners_guide(content)
                with open(file, "w", encoding="utf-8") as f2:
                    f2.write(content)


main()

what = """
![meow](https://files.catbox.moe/901c40.gif) 
"""

with open("meow.md", "w", encoding="utf-8") as file:
    file.write(what)
