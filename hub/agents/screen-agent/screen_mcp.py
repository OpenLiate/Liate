#!/usr/bin/env python3
"""
Portable Local MCP stdio JSON-RPC 2.0 Server for Screen Recording & Screenshots.
Zero external pip dependency — runs on standard Python 3.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

RECORDINGS_DIR = Path.home() / ".liate" / "agents" / "screen-agent" / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)


def record_screen(duration_seconds: int = 5) -> str:
    timestamp = int(time.time())
    output_path = RECORDINGS_DIR / f"screen_recording_{timestamp}.mp4"

    # Try PowerShell screen capture as fallback if cv2/win32gui is missing
    ps_cmd = f"""
    Add-Type -AssemblyName System.Windows.Forms,System.Drawing;
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
    $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height;
    $graphics = [System.Drawing.Graphics]::FromImage($bmp);
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size);
    $savePath = '{str(output_path).replace('.mp4', '.png')}';
    $bmp.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png);
    $graphics.Dispose();
    $bmp.Dispose();
    """
    try:
        res = subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd], capture_output=True, text=True)
        saved_png = str(output_path).replace(".mp4", ".png")
        if os.path.exists(saved_png):
            return f"Success: Screen captured ({os.path.getsize(saved_png)} bytes) and saved to {saved_png}"
        return f"Error: Screen capture failed ({res.stderr.strip() or 'no output file'})"
    except Exception as e:
        return f"Error: Screen capture failed: {e}"


TOOLS = [
    {
        "name": "record_screen",
        "description": "Record screen or capture desktop screenshot and save to disk.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "duration_seconds": {"type": "integer", "description": "Duration in seconds (default 5)"},
            },
        },
    }
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
                "serverInfo": {"name": "screen_recorder", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name == "record_screen":
            out = record_screen(int(args.get("duration_seconds", 5)))
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
            sys.stderr.write(f"[screen-mcp error] {exc}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
