#!/bin/bash

# Double-click from Finder, or run: bash Start-Editor.command
cd -- "$(dirname -- "$0")" || exit 1
printf '\033]0;OSLC HTML Studio\007'

fail() {
  printf '\n%s\n' "$1"
  read -r -p "Press Return to close... "
  exit 1
}

# Finder does not always inherit the PATH configured by an interactive shell.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi
command -v node >/dev/null 2>&1 || fail "Node.js is missing. Install Node.js, then run this launcher again."
command -v npm >/dev/null 2>&1 || fail "npm is missing. Reinstall Node.js, then run this launcher again."

printf 'Starting OSLC HTML Studio...\nEditor: http://127.0.0.1:5173/editor\n\n'

if curl --fail --silent --max-time 2 "http://127.0.0.1:5173/editor-preview.html" 2>/dev/null | grep -q 'html-studio-load'; then
  printf 'The editor is already running. Opening your browser...\n'
  open "http://127.0.0.1:5173/editor" || fail "Could not open the browser. Visit http://127.0.0.1:5173/editor manually."
  exit 0
fi

if [ ! -f "node_modules/vite/bin/vite.js" ]; then
  printf 'Installing project dependencies...\n'
  npm install || fail "Dependency installation failed. Review the message above."
fi

printf 'Keep this window open while editing. Press Control+C to stop the server.\n\n'
npm run editor
status=$?
if [ "$status" -ne 0 ] && [ "$status" -ne 130 ]; then
  fail "The editor could not start. Review the message above."
fi
exit "$status"
