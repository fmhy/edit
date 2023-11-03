python .github/add-headers.py
python .github/replace.py

for file in *; do
    [[ -f "$file" ]] && mv "$file" "${file,,}" 2>/dev/null
done
