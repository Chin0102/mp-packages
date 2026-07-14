#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

echo "Verifying workspace before publishing..."
(
  cd "$ROOT_DIR"
  npm run verify
)

npm login

echo "Publishing changed packages to npm..."
(
  cd "$ROOT_DIR"
  npx changeset publish
)

echo "Changed packages published successfully."
