#!/bin/sh
# Pre-commit wrapper invoked by simple-git-hooks (see package.json).

# The command that performs the actual checks. Overridable for testing.
# --quiet drops lint-staged's own task-runner chatter (the [STARTED]/[COMPLETED]
# lines that are noise in a captured log like VS Code's); --continue-on-error runs
# every task to completion so a failure in one doesn't SIGKILL the others.
CHECK_CMD="${PRE_COMMIT_CHECK_CMD:-pnpm lint-staged --quiet --continue-on-error}"

if sh -c "$CHECK_CMD"; then
  exit 0
fi

echo ""
echo "⚠️  Pre-commit checks failed (see the output above)."
echo "   Note: the markdown linter uses heuristics and can occasionally flag"
echo "   false positives."
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
