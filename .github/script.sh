python .github/replace.py
python .github/add-headers.py

for file in *; do
    [[ -f "$file" ]] && mv "$file" "${file,,}" 2>/dev/null
done
exit 0
