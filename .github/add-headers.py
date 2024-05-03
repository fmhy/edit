import os  # Import the os module to interact with the operating system.

# Define a dictionary that maps file names to their respective titles and descriptions.
headers = {
    # ...
}

# Create the title and description string variables that will be used to format the header.
title = '<div class="space-y-2 not-prose"><h1 class="text-4xl font-extrabold tracking-tight text-primary underline lg:text-5xl lg:leading-[3.5rem]">'
description = '<p class="text-black dark:text-text-2">'

# Define the getHeader function that takes a file name as an argument, retrieves its corresponding title and description from the headers dictionary, and generates the header as a string.
def getHeader(page: str):
    # ...
    return header

# Define the main function that lists the files in the current directory, checks if each file is in the headers dictionary, and if so, reads the file's content. If the content does not start with "---" (indicating a header is missing), the function writes the generated header to the file.
def main():
    # ...

# Call the main function to execute the script.
main()
