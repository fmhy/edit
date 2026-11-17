#!/usr/bin/env python3
"""FIFO balanced rotation for the "Stream Aggregators" subsection of
docs/video.md (Streaming Sites section).

Two tiers rotate independently:

  * super stars  -> lines marked with the glowing star  (🌟, U+1F31F)
  * stars        -> lines marked with the white star    (⭐, U+2B50)

Each run performs one FIFO step on each tier (the first entry moves to the
end). Entries never cross tiers: super stars only ever occupy super-star
positions, and normal stars only ever occupy normal-star positions. Plain,
unstarred entries and all surrounding markdown are left byte-for-byte
untouched.

A small state file records how many rotations have happened and the last UTC
date a rotation was applied. Repeated runs on the same UTC date are skipped
(unless --force is given) so a manual dispatch followed by the daily cron
cannot double-rotate in one day.

Standard library only.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC_PATH = os.path.join(REPO_ROOT, "docs", "video.md")
STATE_PATH = os.path.join(REPO_ROOT, "scripts", "rotation-state.json")

MAIN_HEADING = "# ► Streaming Sites"
AGG_HEADING = "## ▷ Stream Aggregators"

SUPER_MARKER = "\U0001f31f"  # 🌟 glowing star -> super stars
STAR_MARKER = "\u2b50"       # ⭐ white star   -> normal stars

TIERS = (
    ("super_stars", SUPER_MARKER),
    ("stars", STAR_MARKER),
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def read_lines(path):
    with open(path, "r", encoding="utf-8", newline="") as fh:
        return fh.readlines()


def write_lines(path, lines):
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.writelines(lines)


def read_state(path):
    if not os.path.exists(path):
        raise SystemExit(f"error: state file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def write_state(path, state):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def find_aggregators_bounds(lines):
    """Return (start, end) line indices for the aggregators entry region.

    start = index just after the aggregators heading (and its blank line).
    end   = index of the next level-2 heading (exclusive).
    """
    main = [i for i, line in enumerate(lines) if line.rstrip("\r\n") == MAIN_HEADING]
    if len(main) != 1:
        raise SystemExit(f"error: expected exactly one {MAIN_HEADING!r}, found {len(main)}")

    agg = [i for i, line in enumerate(lines) if line.rstrip("\r\n") == AGG_HEADING]
    if len(agg) != 1:
        raise SystemExit(f"error: expected exactly one {AGG_HEADING!r}, found {len(agg)}")

    agg_i = agg[0]
    if not (main[0] < agg_i):
        raise SystemExit("error: aggregators heading is outside the Streaming Sites section")

    # Next level-2 heading ends this subsection.
    end = None
    for i in range(agg_i + 1, len(lines)):
        if lines[i].startswith("## "):
            end = i
            break
    if end is None:
        raise SystemExit("error: could not find the end of the aggregators subsection")

    return agg_i + 1, end


def tier_positions(region, marker):
    """Indices (relative to region) of list entries carrying `marker`."""
    positions = []
    for i, line in enumerate(region):
        stripped = line.lstrip()
        if not stripped.startswith("* "):
            continue
        if SUPER_MARKER in line and STAR_MARKER in line:
            raise SystemExit("error: an entry carries both star markers; cannot split tiers")
        if marker in line:
            positions.append(i)
    return positions


def rotate(values):
    """One FIFO step: first element moves to the end."""
    if len(values) < 2:
        return list(values)
    return values[1:] + values[:1]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="rotate even if the last rotation was on the same UTC date",
    )
    parser.add_argument(
        "--date",
        default=None,
        help="override the UTC date (YYYY-MM-DD) used for the daily guard (testing only)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="print detected tiers without modifying any files",
    )
    args = parser.parse_args()

    if args.date:
        try:
            datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            raise SystemExit("error: --date must be YYYY-MM-DD")
        today = args.date
    else:
        today = datetime.now(timezone.utc).date().isoformat()

    lines = read_lines(DOC_PATH)
    start, end = find_aggregators_bounds(lines)
    region = lines[start:end]

    detected = {}
    for name, marker in TIERS:
        positions = tier_positions(region, marker)
        detected[name] = {
            "marker": marker,
            "positions": positions,
            "members": [region[i].rstrip("\r\n") for i in positions],
        }
        if not positions:
            raise SystemExit(f"error: no entries found for tier {name!r} ({marker})")

    print(f"Streaming Sites / Stream Aggregators: lines {start + 1}-{end} (1-based)")
    for name, info in detected.items():
        print(f"  {name}: {len(info['members'])} entries")
        for member in info["members"]:
            label = member.split("]", 1)[0].replace("* ", "").strip()
            print(f"      {label}")

    if args.check:
        print("--check: no files modified")
        return 0

    state = read_state(STATE_PATH)

    if not args.force and state.get("last_rotation_date") == today:
        print(f"Already rotated on {today}; skipping (use --force to override).")
        return 0

    # Apply one FIFO step per tier, writing results back into the SAME
    # positions so tier boundaries and every other line are preserved.
    new_region = list(region)
    for name, _marker in TIERS:
        info = detected[name]
        rotated = rotate(info["members"])
        for pos, value in zip(info["positions"], rotated):
            newline = "\n"
            if region[pos].endswith("\r\n"):
                newline = "\r\n"
            elif not region[pos].endswith("\n"):
                newline = ""
            new_region[pos] = value + newline

    new_lines = lines[:start] + new_region + lines[end:]
    write_lines(DOC_PATH, new_lines)

    state["version"] = state.get("version", 1)
    state["rotations"] = int(state.get("rotations", 0)) + 1
    state["last_rotation_date"] = today
    state["last_rotation_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for name, _marker in TIERS:
        state.setdefault("tiers", {}).setdefault(name, {})
        state["tiers"][name]["marker"] = detected[name]["marker"]
        state["tiers"][name]["count"] = len(detected[name]["members"])
        state["tiers"][name]["members"] = detected[name]["members"]
    write_state(STATE_PATH, state)

    print(f"Rotation #{state['rotations']} applied on {today}.")
    print(f"Updated: {DOC_PATH}")
    print(f"Updated: {STATE_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
