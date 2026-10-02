#!/bin/bash
# Sessions distantes : l'image fournit Node 22.22.0, que la CLI d'Angular 22
# refuse (« requires a minimum Node.js version of v22.22.3 or v24.15.0 »).
# On installe Node 24 par nvm et on le place en tête du PATH de la session.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

export NVM_DIR="${NVM_DIR:-/opt/nvm}"
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm install 24 >/dev/null
nvm alias default 24 >/dev/null
BIN="$(dirname "$(nvm which 24)")"
echo "export PATH=\"$BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
export PATH="$BIN:$PATH"

# Le Chromium de l'image (/opt/pw-browsers) n'a pas la révision qu'attend la
# version de Playwright du projet ; playwright.config.ts et les icônes lisent
# PW_CHROMIUM.
if [ -x /opt/pw-browsers/chromium ]; then
  echo 'export PW_CHROMIUM=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
