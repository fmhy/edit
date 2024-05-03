import os
import re

def beginners_guide(text: str):
    # ... (same as before)

def individual(text: str):
    # ... (same as before)

def general(text: str):
    # ... (same as before)

def remove_backtowiki_toc(text):
    # ... (same as before)

def replace_pages(text):
    # ... (same as before)

def replace_underscore(text):
    # ... (same as before)

def reformat_subsections(text):
    # ... (same as before)

def replace_urls(text):
    text = remove_backtowiki_toc(text)
    text = replace_pages(text)
    text = reformat_subsections(text)
    text = re.sub("/#", "#", text)
    text = general(text)
    text = individual(text)
    return text

def process_file(file):
    if not file.endswith(".md"):
        return

    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
        content = replace_urls(content)
        if file == "Beginners-Guide.md":
            content = beginners_guide(content)
        with open(file, "w", encoding="utf-8") as f2:
            f2.write(content)

def main():
    files = os.listdir(".")
    for file in files:
        process_file(file)

    what = """
![meow](https://files.catbox.moe/901c40.gif) 
"""

    with open("meow.md", "w", encoding="utf-8") as file:
        file.write(what)

if __name__ == "__main__":
    main()
