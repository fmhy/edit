#!/bin/sh
# Pre-commit wrapper invoked by simple-git-hooks (see package.json).

# The command that performs the actual checks. Overridable for testing.
# --quiet drops lint-staged's own task-runner chatter (the [STARTED]/[COMPLETED]
# lines that are noise in a captured log like VS Code's); --continue-on-error runs
# every task to completion so a failure in one doesn't SIGKILL the others.
CHECK_CMD="${PRE_COMMIT_CHECK_CMD:-pnpm lint-staged --quiet --continue-on-error}"

# Capture output so that on failure we can lead with a clear summary line.
output=$(sh -c "$CHECK_CMD" 2>&1)
status=$?

if [ "$status" -eq 0 ]; then
  exit 0
fi

echo "⚠️  Pre-commit checks failed - commit blocked (details below)."
echo ""
[ -n "$output" ] && printf '%s\n\n' "$output"
echo "   • Formatting (Prettier)? Auto-fix it and re-stage, then commit again:"
echo "         pnpm format"
echo "   • The markdown linter is heuristic and can occasionally flag false"
echo "     positives."
echo ""

# Check for TTY
if { true < /dev/tty; } 2>/dev/null; then
  printf "   Commit anyway, ignoring these issues? [y/N] " > /dev/tty
  read -r answer < /dev/tty
  case "$answer" in
    [Yy] | [Yy][Ee][Ss])
      echo "   → Continuing with the commit."
      exit 0
      ;;
    *)
      echo "   → Commit aborted. Please fix the issues above (or re-run and"
      echo "     answer 'y' to bypass if they are false positives)."
      exit 1
      ;;
  esac
else
  echo "   This looks like a non-interactive environment."
  echo "   If these are false positives, re-commit bypassing the hook with:"
  echo ""
  echo "       git commit --no-verify"
  echo ""
  exit 1
fi
