# OpenLiate Windows 1-Click Installer
# AgentYaan Mission · India's Sovereign AI Agent Layer

Write-Host "==========================================" -ForegroundColor DarkGray
Write-Host "  Installing OpenLiate (BaaA Engine)...   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor DarkGray

if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Host "[+] Found Bun runtime. Installing openliate globally..." -ForegroundColor Green
    bun add -g openliate
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "[+] Found Node.js runtime. Installing openliate globally..." -ForegroundColor Green
    npm install -g openliate
} else {
    Write-Host "[!] Neither Bun nor Node.js detected. Installing Bun..." -ForegroundColor Yellow
    irm bun.sh/install.ps1 | iex
    bun add -g openliate
}

Write-Host "`n[✓] OpenLiate successfully installed!" -ForegroundColor Green
Write-Host "    Run 'liate hub' or 'liate run agent.json' to start." -ForegroundColor White
