import re
import os
import sys

def replaces_for_beginners_guide(text):
    text = re.sub('\[TOC\]\n', '', text, flags=re.MULTILINE)
    text = re.sub('## -> Beginners Guide to Piracy<-\n', '', text, flags=re.MULTILINE)
    text = re.sub(r"!!!note\s(.+?)\n", r"!!!\n\1\n!!!\n", text, flags=re.MULTILINE)
    text = re.sub(r"!!!warning\s(.+?)\n", r"!!!warning\n\1\n!!!\n", text, flags=re.MULTILINE)
    text = re.sub('\*\*\[\^ Back to Top\]\(https://rentry.org/Piracy-BG\)\*\*', '', text, flags=re.MULTILINE)
    text = re.sub("!!!\n!!!\n", "!!!\n", text, flags=re.MULTILINE)
    text = re.sub("\n\*\*\[", "\n* **[", text, flags=re.MULTILINE)
    return text

def do_some_individual_replaces(text):
    #special cases of link not replaced correctly
    text = re.sub('.pages.dev/storage/#encode--decode_urls', '.pages.dev/storage/#encode--decode-urls', text)
    text = re.sub('.pages.dev/base64/#do-k-ument', '.pages.dev/base64/#do_k_ument', text)

    #Base64-decoder script link
    text = re.sub('\*\* site or extension\.\n', '** site or extension\.\nAlternatively, install this [userscript](https://rentry.co/wc7s2/raw)\n', text, flags=re.MULTILINE)

    #For beginners piracy guide page
    text = replaces_for_beginners_guide(text)

    return text

def change_some_general_formatting(text):
    text = re.sub('\*\*\*\n\n', '', text, flags=re.MULTILINE)
    text = re.sub('\*\*\*\n', '', text, flags=re.MULTILINE)

    text = re.sub('# ►', '##', text)
    text = re.sub('## ▷', '###', text)
    text = re.sub('####', '###', text)

    text = re.sub(r'^\*\*Note\*\* - (.+)$', r'!!!\n\1\n!!!', text, flags=re.MULTILINE)
    text = re.sub(r'^\* \*\*Note\*\* - (.+)$', r'!!!\n\1\n!!!', text, flags=re.MULTILINE)
    text = re.sub(r'^Note - (.+)$', r'!!!\n\1\n!!!', text, flags=re.MULTILINE)
    text = re.sub(r'^\*\*Warning\*\* - (.+)$', r'!!!warning\n\1\n!!!', text, flags=re.MULTILINE)

    return text

def remove_backtowiki_and_toc(text):
    text = re.sub('\*\*\[◄◄ Back to Wiki Index\]\(https://www\.reddit\.com/r/FREEMEDIAHECKYEAH/wiki/index\)\*\*\n', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*\*\[Table of Contents\]\(https://i\.imgur\.com/[^()\[\]]*\.png\)\*\* - For mobile users\n', '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\* \n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    return text

def replace_domain_and_page(text):
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/ai',                  'fmhy.pages.dev/ai', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/adblock-vpn-privacy', 'fmhy.pages.dev/adblockvpnguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/android',             'fmhy.pages.dev/android-iosguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/video',               'fmhy.pages.dev/videopiracyguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/audio',               'fmhy.pages.dev/audiopiracyguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/games',               'fmhy.pages.dev/gamingpiracyguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/reading',             'fmhy.pages.dev/readingpiracyguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/download',            'fmhy.pages.dev/downloadpiracyguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/torrent',             'fmhy.pages.dev/torrentpiracyguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/edu',                 'fmhy.pages.dev/edupiracyguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/tools-misc',          'fmhy.pages.dev/toolsguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/linux',               'fmhy.pages.dev/linuxguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/non-eng',             'fmhy.pages.dev/non-english', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/misc',                'fmhy.pages.dev/miscguide', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage',             'fmhy.pages.dev/storage', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/dev-tools',           'fmhy.pages.dev/devtools', text)
    text = re.sub('www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/img-tools',           'fmhy.pages.dev/img-tools', text)

    text = re.sub('github.com/nbats/FMHYedit/blob/main/base64.md#',              'fmhy.pages.dev/base64/#', text)

    return text

def replace_underscore_in_subsections(text):
    pattern =  r'(/#[\w]+(?:_[\w]+)*)'
    matches = re.findall(pattern, text)
    for match in matches:
        replacement = match.replace('_', '-')
        text = text.replace(match, replacement)
    return text

def reformat_subsections(text):
    text = re.sub('/#wiki_', '/#', text)
    text = re.sub('#wiki_', '/#', text)
    text = re.sub('.25BA_', '', text)
    text = re.sub('.25B7_', '', text)
    text = re.sub('_.2F_', '--', text)
    text = replace_underscore_in_subsections(text)
    return text

def replace_urls_in_links_to_FMHY_wiki(text):
    text = remove_backtowiki_and_toc(text)
    text = replace_domain_and_page(text)
    text = reformat_subsections(text)
    text = change_some_general_formatting(text)
    text = do_some_individual_replaces(text)
    return text

def apply_replace_to_all_md_files_in_current_dir():
    files = os.listdir('.')
    for file in files:
        if file.endswith('.md'):
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                content = replace_urls_in_links_to_FMHY_wiki(content)
                with open(file, 'w', encoding='utf-8') as f2:
                    f2.write(content)

def print_info_for_confirmation():
    print("This script is about to replace URLs in all .md files in the current directory: " + os.getcwd())
    print("The affected files will be the following:")
    files = os.listdir('.')
    for file in files:
        if file.endswith('.md'):
            print(file)




# TESTER
testText = """
aaaaaaaa (https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage#wiki_telegram_audio_download) aaaaaaa
**[◄◄ Back to Wiki Index](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/index)**
* ⭐ **[YouTube Music Clients](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage#wiki_youtube_music_players)**
Soundtracks](https://github.com/nbats/FMHYedit/blob/main/base64.md#damons-game-soundtracks)**, [Squ
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage#wiki_game_libraries_.2F_launcher)
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/games#wiki_.25BA_tracking_.2F_discovery)
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/linux#wiki_.25BA_linux_adblock_.2F_privacy)
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/video#wiki_.25BA_download_sites)
[sdfasdf](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/android#wiki_.25B7_android_podcasts_.2F_radio)gwrgewrgew
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/android#wiki_.25B7_android_relaxation)
adfads awerfaw (https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage#wiki_music_libraries_.2F_players)
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/edu/#wiki_.25BA_downloading) aaaaaaaaa
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/adblock-vpn-privacy#wiki_.25B7_adblocking_extensions)
* [link](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/torrent) - ...sdvs
https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/img-tools#wiki_.25B7_painting_.2F_drawing
* ⭐ **[AI Indexes](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/ai#wiki_.25BA_ai_indexes)** - Artificial Intelligence Indexes
(https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/adblock-vpn-privacy#wiki_.25BA_vpn)
https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage/#wiki_open_directory_search_string_builder
https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/tools-misc#wiki_.25B7_file_tools

~~~~~~
***
***
**[◄◄ Back to Wiki Index](https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/index)**
***
***

**[Table of Contents](https://i.imgur.com/whYmImm.png)** - For mobile users

***
***

~~~~~~

argaseg ae this is legit test between stuff to remove1

***

# ► with ##
## ▷ with ###
#### with ###

* **Note** - Some aggregators still include TPB, so it's best to avoid using them for software and games.

**Warning** - Misuse of Chat Archivers, Deleters, Mods & 3rd Party Clients is against Discords TOS, so use them at your own risk.

**[movie-web](https://movie-web.app/) / [FMovies](https://fmovies.name/) / [Soap2Day](https://soapgate.org/)** - Fast streaming
**[Zoro](https://zoro.to/) / [9Anime](https://www.9anime.to/)** - Fast  anime streaming


"""
def just_test_the_replacer_function():
    print("---TEST---")
    print("This is how the resulting edited links would look like:")
    print( replace_urls_in_links_to_FMHY_wiki(testText) )
    print("---END OF TEST---\n\n\n")

just_test_the_replacer_function()




# MAIN EXECUTION
print("---MAIN SCRIPT---")
print_info_for_confirmation()
apply_replace_to_all_md_files_in_current_dir()
print("---END OF MAIN SCRIPT---")
