#!/usr/bin/env bash
# OpenLiate macOS / Linux 1-Click Installer
# AgentYaan Mission · India's Sovereign AI Agent Layer 🇮🇳

set -e

echo "=========================================="
echo "  Installing OpenLiate (BaaA Engine)...   "
echo "=========================================="

if command -v bun >/dev/null 2>&1; then
    echo "[+] Found Bun runtime. Installing openliate globally..."
    bun add -g openliate
elif command -v npm >/dev/null 2>&1; then
    echo "[+] Found Node.js runtime. Installing openliate globally..."
    npm install -g openliate
else
    echo "[!] Neither Bun nor Node.js detected. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    bun add -g openliate
fi

echo ""
echo "[✓] OpenLiate successfully installed!"
echo "    Run 'liate hub' or 'liate run agent.json' to start."
