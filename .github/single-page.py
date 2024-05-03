import glob  # Import the glob module, which allows for file name pattern matching
import time  # Import the time module, which provides various time-related functions


def output():
    # Read all markdown files in the current directory, excluding README.md, feedback.md, posts.md, and index.md
    read = glob.glob("*.md")
    content = ""  # Initialize an empty string to store the combined content of all markdown files
    nsfw_content = ""  # Initialize an empty string to store the content of the NSFWPiracy.md file
    
    for file in read:
        if (
            file != "README.md"
            or file != "feedback.md"
            or file != "posts.md"
            or file != "index.md"
        ):
            with open(file, "r") as f:  # Open each file in read mode
                if "NSFWPiracy.md" == file:
                    nsfw_content += f.read()  # If the file is NSFWPiracy.md, add its content to nsfw_content
                    continue  # Skip to the next iteration of the loop
                content += f.read()  # Add the content of the current file to content
    
    return content + nsfw_content  # Return the combined content of all markdown files and the NSFWPiracy.md file


def main():
    content = output()  # Call the output function and store its result in the content variable
    with open("single-page", "w") as file:  # Open a new file named "single-page" in write mode
        file.write(content)  # Write the content to the "single-page" file


if __name__ == "__main__":
    s = time.perf_counter()  # Record the start time
    main()  # Call the main function
    elapsed = time.perf_counter() - s  # Calculate the elapsed time
    print(f"{__file__} executed in {elapsed:0.2f} seconds.")  # Print the elapsed time and the name of the executed file
