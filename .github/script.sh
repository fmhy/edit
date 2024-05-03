# This script is used to perform a series of file operations in the current directory.

# The first line calls the 'replace.py' script located in the '.github' directory.
# This script is responsible for replacing certain patterns in the codebase.
python .github/replace.py

# The second line calls the 'add-headers.py' script located in the '.github' directory.
# This script is responsible for adding headers to the code files.
python .github/add-headers.py

# The 'for' loop iterates over all files in the current directory.
# The '[[ -f "$file" ]]' condition checks if the current item is a regular file.
# If the condition is true, the file is moved to a new name with all lowercase characters.
# The '2>/dev/null' redirection is used to suppress any error messages that might occur during the file move operation.
for file in *; do
    [[ -f "$file" ]] && mv "$file" "${file,,}" 2>/dev/null
done

# The script ends by exiting with a status code of 0, indicating successful completion.
exit 0
