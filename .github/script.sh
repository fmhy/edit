python .github/add-headers.py

for file in *; do
    [[ -f "$file" ]] && mv "$file" "${file,,}" 2>/dev/null
done
python .github/replace.py
