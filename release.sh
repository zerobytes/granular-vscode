#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${VSCE_PAT:-}" ]; then
  echo "Error: VSCE_PAT is not set."
  echo "Copy .env.example to .env, add your token, or export VSCE_PAT in the shell."
  exit 1
fi

VERSION_TYPE=${1:-patch}

if [[ "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
  echo "Usage: ./release.sh [patch|minor|major]"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working directory not clean. Commit or stash changes first."
  exit 1
fi

echo "Releasing $(node -p "require('./package.json').name") ($VERSION_TYPE)..."

npm ci
npm run compile

npm version "$VERSION_TYPE" -m "release: v%s"

npx -y @vscode/vsce publish -p "$VSCE_PAT"

echo "Published $(node -p "require('./package.json').name")@$(node -p "require('./package.json').version")"
