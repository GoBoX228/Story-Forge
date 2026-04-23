#!/bin/sh
set -e

if [ ! -d node_modules ] || [ ! -d node_modules/tailwindcss ]; then
  npm install
fi

# Prevent stale chunk/runtime issues in bind-mounted dev environment.
# Clear both default and custom dev dist dirs.
if [ -d .next ]; then
  find .next -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi

if [ -d .next-dev ]; then
  find .next-dev -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi

exec npm run dev -- --hostname 0.0.0.0 --port 3000
