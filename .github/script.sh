set -e

python .github/replace.py
python .github/add-headers.py

exit 0
