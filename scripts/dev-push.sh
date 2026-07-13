#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

if ! command -v yalc >/dev/null 2>&1; then
  echo "Error: yalc is not installed. Run: npm install --global yalc" >&2
  exit 1
fi

echo "Building and pushing @chin0102/mp-adapter..."
(
  cd "$ROOT_DIR/mp-adapter"
  npm run build
  yalc push
)

echo "Building and pushing @chin0102/mp-core..."
(
  cd "$ROOT_DIR/mp-core"
  npm run build
  yalc push
)

echo "Building and pushing @chin0102/mp-components..."
(
  cd "$ROOT_DIR/mp-components"
  npm run build
  yalc push
)

echo "Local packages pushed successfully. Rebuild npm in WeChat DevTools."
