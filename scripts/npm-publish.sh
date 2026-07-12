#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

npm login

echo "Publishing @chin0102/mp-adapter to npm..."
(
  cd "$ROOT_DIR/mp-adapter"
  npm publish
)

echo "Publishing @chin0102/mp-core to npm..."
(
  cd "$ROOT_DIR/mp-core"
  npm publish
)

echo "Packages published successfully."
