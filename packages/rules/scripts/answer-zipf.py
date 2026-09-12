"""Rank the curated answer list by real-world frequency.

Writes data/answer-zipf.json: {word: Zipf frequency} for every word in the
answer source, from the wordfreq corpus blend (subtitles, books, web, news).
build-words.mjs reads it and keeps only words above a floor, so the pool is
the common part of the curated list. Rerun when the answer source changes:

    python3 -m venv .venv && .venv/bin/pip install wordfreq
    .venv/bin/python scripts/answer-zipf.py
"""
import json
import re
import subprocess
from pathlib import Path

from wordfreq import zipf_frequency

ANSWER_SRC = 'https://gist.githubusercontent.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b/raw/wordle-answers-alphabetical.txt'

text = subprocess.run(['curl', '-fsSL', ANSWER_SRC], check=True, capture_output=True, text=True).stdout
words = sorted({w.strip().lower() for w in text.splitlines() if re.fullmatch(r'[a-z]{5}', w.strip().lower())})
out = {w: round(zipf_frequency(w, 'en'), 2) for w in words}
path = Path(__file__).resolve().parent.parent / 'data' / 'answer-zipf.json'
path.write_text(json.dumps(out, indent=0, sort_keys=True) + '\n')
print(f'{len(out)} words -> {path}')
