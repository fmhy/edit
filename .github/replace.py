import re
import os
import sys

def replaces_for_beginners_guide(text):
    text = re.sub('\[TOC\]\n', '', text, flags=re.MULTILINE)
    text = re.sub('\*\*Table of Contents\*\*\n\[TOC2\]\n', '', text, flags=re.MULTILINE)
    text = re.sub('# -> \*\*\*Beginners Guide to Piracy\*\*\* <-\n', '', text, flags=re.MULTILINE)
    text = re.sub(r"!!!note\s(.+?)\n", r":::info\n\1\n:::\n", text, flags=re.MULTILINE)
    text = re.sub(r"!!!info\s(.+?)\n", r":::info\n\1\n:::\n", text, flags=re.MULTILINE)
    text = re.sub(r"!!!warning\s(.+?)\n", r":::warning\n\1\n:::\n", text, flags=re.MULTILINE)
    text = re.sub(r">\s(.+?)\n", r"> \1\n\n", text, flags=re.MULTILINE)
    text = re.sub('\*\*\[\^ Back to Top\]\(#beginners-guide-to-piracy\)\*\*', '', text, flags=re.MULTILINE)
    text = re.sub(r"!!!\s(.+?)\n", r":::info\n\1\n:::\n", text, flags=re.MULTILINE)
    text = re.sub("\n\*\*\[", "\n* **[", text, flags=re.MULTILINE)
    text = re.sub(r'>(.*)\n\n(.*)', r':::details \1\n\2\n:::', text, flags=re.MULTILINE)
    return text

def do_some_individual_replaces(text):
    #special cases of link not replaced correctly
    text = re.sub('/storage/#encode--decode_urls', '/storage/#encode--decode-urls', text)
    text = re.sub('/base64/#do-k-ument', '/base64/#do_k_ument', text)
    text = re.sub('/devtools/#machine-learning2', '/devtools/#machine-learning-1', text)

    #Base64-decoder script link
    text = re.sub('(.+?) site or extension\.\n', 'Click on the texts to copy them decoded.\n', text, flags=re.MULTILINE)

    return text

def change_some_general_formatting(text):
    text = re.sub('\*\*\*\n\n', '', text, flags=re.MULTILINE)
    text = re.sub('\*\*\*\n', '', text, flags=re.MULTILINE)

    text = re.sub('# ►', '##', text)
    text = re.sub('## ▷', '###', text)
    text = re.sub('####', '###', text)

    text = re.sub(r'^\*\*Note\*\* - (.+)$', r':::tip\n\1\n:::', text, flags=re.MULTILINE)
    text = re.sub(r'^\* \*\*Note\*\* - (.+)$', r':::tip\n\1\n:::', text, flags=re.MULTILINE)
    text = re.sub(r'^Note - (.+)$', r':::tip\n\1\n:::', text, flags=re.MULTILINE)
    text = re.sub(r'^\*\*Warning\*\* - (.+)$', r':::warning\n\1\n:::', text, flags=re.MULTILINE)
    
    text = re.sub(r'^\*\s([^*])', "- \\1", text, 0, re.MULTILINE)
    return text

def remove_backtowiki_and_toc(text):
    text = re.sub('\*\*\[◄◄ Back to Wiki Index\]\(https://www\.reddit\.com/r/FREEMEDIAHECKYEAH/wiki/index\)\*\*\n', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*\*\[Table of Contents\]\(https?:\/\/.*?ibb\.co.*\)\*\* - For mobile users\n', '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\* \n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    text = re.sub("\*\*\*\n\*\*\*\n\n\n\*\*\*\n\n", '', text, flags=re.MULTILINE)
    return text

def replace_domain_and_page(text):
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/ai',                  '/ai', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/adblock-vpn-privacy', '/adblockvpnguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/android',             '/android-iosguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/video',               '/videopiracyguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/audio',               '/audiopiracyguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/games',               '/gamingpiracyguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/reading',             '/readingpiracyguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/download',            '/downloadpiracyguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/torrent',             '/torrentpiracyguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/edu',                 '/edupiracyguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/tools-misc',          '/toolsguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/linux',               '/linuxguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/non-eng',             '/non-english', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/misc',                '/miscguide', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/storage',             '/storage', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/dev-tools',           '/devtools', text)
    text = re.sub('https://www.reddit.com/r/FREEMEDIAHECKYEAH/wiki/img-tools',           '/img-tools', text)  

    text = re.sub('https://github.com/nbats/FMHYedit/blob/main/base64.md#',              '/base64/#', text)

    return text

def replace_underscore_in_subsections(text):
    pattern =  r'(/#[\w\-]+(?:_[\w]+)*)'
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
                if file == "Beginners-Guide.md":
                    content = replaces_for_beginners_guide(content)
                with open(file, 'w', encoding='utf-8') as f2:
                    f2.write(content)

apply_replace_to_all_md_files_in_current_dir()
