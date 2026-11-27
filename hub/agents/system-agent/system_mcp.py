#!/usr/bin/env python3
"""
Portable Local MCP stdio JSON-RPC 2.0 Server for OS & System Control.
Zero external pip dependency — runs on standard Python 3.
"""
import json
import os
import subprocess
import sys

def make_laptop_sleep(delay_seconds: int = 5) -> str:
    cmd_ps = (
        f"powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "
        f"\"Start-Sleep -Seconds {delay_seconds}; Add-Type -AssemblyReference System.Windows.Forms; "
        f"[System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)\""
    )
    try:
        subprocess.Popen(cmd_ps, shell=True)
        return f"System Suspend Scheduled: The laptop will enter Sleep Mode in {delay_seconds} seconds."
    except Exception as e:
        return f"Failed to trigger sleep: {str(e)}"


def open_claude_desktop() -> str:
    user_profile = os.environ.get("USERPROFILE", "C:\\Users\\vinod")
    paths_to_check = [
        os.path.join(user_profile, "AppData", "Local", "Programs", "claude-desktop", "Claude.exe"),
        os.path.join(user_profile, "AppData", "Local", "Programs", "Claude", "Claude.exe"),
        os.path.join(user_profile, "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Claude.lnk"),
    ]
    for path in paths_to_check:
        if os.path.exists(path):
            try:
                os.startfile(path)
                return f"Successfully launched Claude Desktop App from: {path}"
            except Exception as e:
                return f"Found Claude Desktop at {path} but failed to launch: {str(e)}"
    return "Claude Desktop was not found in standard user paths."


def search_and_open_app(app_name: str) -> str:
    try:
        subprocess.Popen(["powershell", "-Command", f"Start-Process '{app_name}'"], shell=True)
        return f"Dispatched launch command for '{app_name}'"
    except Exception as e:
        return f"Failed to launch '{app_name}': {str(e)}"


TOOLS = [
    {
        "name": "make_laptop_sleep",
        "description": "Puts the laptop or PC into Sleep Mode after a specified delay.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "delay_seconds": {"type": "integer", "description": "Delay in seconds before triggering sleep (default 5)"},
            },
        },
    },
    {
        "name": "open_claude_desktop",
        "description": "Locate and launch Claude Desktop application on the system.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "search_and_open_app",
        "description": "Search and open an application on the Windows desktop by name.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "app_name": {"type": "string", "description": "Application name to open (e.g. notepad, calc, chrome)"},
            },
            "required": ["app_name"],
        },
    },
]


def handle_request(req: dict):
    req_id = req.get("id")
    method = req.get("method")
    params = req.get("params") or {}

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "system_controller", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name == "make_laptop_sleep":
            out = make_laptop_sleep(int(args.get("delay_seconds", 5)))
        elif name == "open_claude_desktop":
            out = open_claude_desktop()
        elif name == "search_and_open_app":
            out = search_and_open_app(str(args.get("app_name", "calc")))
        else:
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool: {name}"}}
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": out}]},
        }
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}


def main():
    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue
        try:
            req = json.loads(raw)
            resp = handle_request(req)
            if resp is not None:
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            sys.stderr.write(f"[system-mcp error] {exc}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
