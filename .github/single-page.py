import glob
import time

def output():
    read = glob.glob("*.md")
    content = ""
    nsfw_content = ""

    for file in read:
        if file in EXCLUDED_FILES:
            continue

        if file == "NSFWPiracy.md":
            with open(file, "r") as f:
                nsfw_content += f.read()
            continue

        with open(file, "r") as f:
            content += f.read()

    return content + nsfw_content

EXCLUDED_FILES = {"README.md", "feedback.md", "posts.md", "index.md"}

def main():
    content = output()

    with open("single-page", "w") as file:
        file.write(content)

if __name__ == "__main__":
    s = time.perf_counter()
    main()
    elapsed = time.perf_counter() - s
    print(f"{__file__} executed in {elapsed:0.2f} seconds.")
