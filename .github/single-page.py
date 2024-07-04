import glob
import time


def output():
    read = glob.glob("*.md")
    content = ""
    nsfw_content = ""
    ignore_files = {"README.md", "feedback.md", "posts.md", "index.md"}
    for file in read:
        if file not in ignore_files:
            with open(file, "r") as f:
                if "NSFWPiracy.md" == file:
                    nsfw_content += f.read()
                    continue
                content += f.read()
    return content + nsfw_content


def main():
    content = output()
    with open("single-page", "w") as file:
        file.write(content)


if __name__ == "__main__":
    s = time.perf_counter()
    main()
    elapsed = time.perf_counter() - s
    print(f"{__file__} executed in {elapsed:0.2f} seconds.")
