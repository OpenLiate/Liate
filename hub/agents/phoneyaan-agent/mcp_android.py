#!/usr/bin/env python3
"""
Portable Local MCP stdio JSON-RPC 2.0 Server for Wireless Android Control via ADB.
Zero external pip dependency — runs on standard Python 3.
"""
import base64
import json
import os
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent
TOOLS_DIR = AGENT_DIR / "platform-tools"
ADB_EXE = TOOLS_DIR / "adb.exe"


def ensure_adb():
    if ADB_EXE.exists():
        return str(ADB_EXE)
    url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
    zip_path = AGENT_DIR / "platform-tools.zip"
    try:
        urllib.request.urlretrieve(url, str(zip_path))
        with zipfile.ZipFile(str(zip_path), "r") as z:
            z.extractall(str(AGENT_DIR))
        if zip_path.exists():
            zip_path.unlink()
        return str(ADB_EXE)
    except Exception:
        return "adb"


adb_path = ensure_adb()
redmi_ip = os.environ.get("REDMI_IP", "10.138.60.10")
redmi_port = os.environ.get("REDMI_PORT", "34265")


def get_target_device():
    try:
        proc = subprocess.run([adb_path, "devices"], capture_output=True, text=True, timeout=15)
        lines = proc.stdout.strip().split("\n")[1:]
        for line in lines:
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "device":
                return parts[0]
    except Exception:
        pass
    return None


def run_adb(args):
    cmd = [adb_path]
    dev = get_target_device()
    if dev:
        cmd.extend(["-s", dev])
    cmd.extend(args)
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    if proc.returncode != 0:
        return f"ADB Error: {proc.stderr.strip() or proc.stdout.strip()}"
    return proc.stdout.strip()


def android_take_screenshot() -> str:
    try:
        dev = get_target_device()
        if not dev:
            return "Screenshot status: No authorized ADB device found."
        local_png = AGENT_DIR / "latest_screen.png"
        subprocess.run([adb_path, "-s", dev, "shell", "screencap", "-p", "/sdcard/__liate_screen.png"], capture_output=True, timeout=15)
        proc = subprocess.run([adb_path, "-s", dev, "pull", "/sdcard/__liate_screen.png", str(local_png)], capture_output=True, text=True, timeout=20)
        subprocess.run([adb_path, "-s", dev, "shell", "rm", "-f", "/sdcard/__liate_screen.png"], capture_output=True, timeout=10)
        if proc.returncode == 0 and local_png.exists() and local_png.stat().st_size > 0:
            raw = local_png.read_bytes()
            b64 = base64.b64encode(raw[:512]).decode("utf-8")
            return f"Success: Screenshot saved to {local_png} ({len(raw)} bytes, preview: data:image/png;base64,{b64}...)"
        return f"Screenshot status: Device not connected or screen off. ({proc.stderr.strip() or proc.stdout.strip()})"
    except Exception as e:
        return f"Screenshot error: {e}"


def android_get_hierarchy() -> str:
    try:
        dev = get_target_device()
        if not dev:
            return "Hierarchy error: No authorized ADB device found."
        subprocess.run([adb_path, "-s", dev, "shell", "uiautomator", "dump", "/sdcard/__liate_ui.xml"], capture_output=True, timeout=15)
        proc = subprocess.run([adb_path, "-s", dev, "shell", "cat", "/sdcard/__liate_ui.xml"], capture_output=True, text=True, timeout=15)
        subprocess.run([adb_path, "-s", dev, "shell", "rm", "-f", "/sdcard/__liate_ui.xml"], capture_output=True, timeout=10)
        xml = (proc.stdout or "").strip()
        if xml:
            return xml[:8000] + ("\n...[truncated]" if len(xml) > 8000 else "")
        return f"Hierarchy error: Empty dump ({proc.stderr.strip()})"
    except Exception as e:
        return f"Hierarchy error: {e}"


def android_tap(x: int, y: int) -> str:
    return run_adb(["shell", "input", "tap", str(x), str(y)]) or f"Tapped at ({x}, {y})"


def android_type(text: str) -> str:
    safe = text.replace(" ", "%s")
    return run_adb(["shell", "input", "text", f'"{safe}"']) or f"Typed: {text}"


def android_key(key_name: str) -> str:
    key_map = {"HOME": "3", "BACK": "4", "ENTER": "66", "POWER": "26"}
    code = key_map.get(key_name.upper(), "3")
    return run_adb(["shell", "input", "keyevent", code]) or f"Pressed {key_name}"


def android_open_app(package_name: str) -> str:
    return run_adb(["shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"]) or f"Launched {package_name}"


TOOLS = [
    {
        "name": "android_take_screenshot",
        "description": "Capture screen of connected Android phone via ADB.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "android_get_hierarchy",
        "description": "Dump the current Android UI XML hierarchy with element bounds and text.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "android_tap",
        "description": "Tap at screen coordinates X and Y.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "x": {"type": "integer", "description": "X coordinate"},
                "y": {"type": "integer", "description": "Y coordinate"},
            },
            "required": ["x", "y"],
        },
    },
    {
        "name": "android_type",
        "description": "Type text into focused field on Android phone.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to type"},
            },
            "required": ["text"],
        },
    },
    {
        "name": "android_key",
        "description": "Press system key: HOME, BACK, ENTER, POWER.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "key_name": {"type": "string", "description": "Key name (HOME, BACK, ENTER, POWER)"},
            },
            "required": ["key_name"],
        },
    },
    {
        "name": "android_open_app",
        "description": "Launch app by package name (e.g. com.whatsapp).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "package_name": {"type": "string", "description": "App package name"},
            },
            "required": ["package_name"],
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
                "serverInfo": {"name": "android_controller", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name == "android_take_screenshot":
            out = android_take_screenshot()
        elif name == "android_get_hierarchy":
            out = android_get_hierarchy()
        elif name == "android_tap":
            out = android_tap(int(args.get("x", 500)), int(args.get("y", 1000)))
        elif name == "android_type":
            out = android_type(str(args.get("text", "")))
        elif name == "android_key":
            out = android_key(str(args.get("key_name", "HOME")))
        elif name == "android_open_app":
            out = android_open_app(str(args.get("package_name", "com.whatsapp")))
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
            sys.stderr.write(f"[android-mcp error] {exc}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
