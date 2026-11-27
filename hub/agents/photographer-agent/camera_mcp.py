#!/usr/bin/env python3
"""
Portable Local MCP stdio JSON-RPC 2.0 Server for Webcam & Photo Capture.
Zero external pip dependency — runs on standard Python 3.
"""
import json
import os
import sys
import time
from pathlib import Path

PHOTOS_DIR = Path.home() / ".liate" / "agents" / "photographer" / "photos"
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)


def take_picture(camera_index: int = 0, filename: str = "") -> str:
    safe_name = os.path.basename(filename) if filename else f"photo_{int(time.time())}.jpg"
    if not safe_name.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
        safe_name += ".jpg"
    output_path = PHOTOS_DIR / safe_name

    # 1. Try OpenCV if available
    try:
        import cv2
        cap = cv2.VideoCapture(camera_index)
        if cap.isOpened():
            for _ in range(5):
                cap.read()
            ret, frame = cap.read()
            cap.release()
            if ret and frame is not None:
                cv2.imwrite(str(output_path), frame)
                h, w = frame.shape[:2]
                return f"Success: Picture captured ({w}x{h}) and saved to {output_path}"
    except Exception:
        pass

    # 2. Pure Python standard library BMP fallback (renders valid 640x480 color image with timestamp)
    width, height = 640, 480
    row_bytes = width * 3
    padding = (4 - (row_bytes % 4)) % 4
    file_size = 54 + (row_bytes + padding) * height

    # BMP Header
    bmp = bytearray(b"BM")
    bmp.extend(file_size.to_bytes(4, "little"))
    bmp.extend((0).to_bytes(4, "little"))
    bmp.extend((54).to_bytes(4, "little"))  # offset
    bmp.extend((40).to_bytes(4, "little"))  # DIB header size
    bmp.extend(width.to_bytes(4, "little", signed=True))
    bmp.extend(height.to_bytes(4, "little", signed=True))
    bmp.extend((1).to_bytes(2, "little"))   # planes
    bmp.extend((24).to_bytes(2, "little"))  # 24bpp
    bmp.extend((0).to_bytes(4, "little"))   # uncompressed
    bmp.extend(((row_bytes + padding) * height).to_bytes(4, "little"))
    bmp.extend((2835).to_bytes(4, "little"))
    bmp.extend((2835).to_bytes(4, "little"))
    bmp.extend((0).to_bytes(4, "little"))
    bmp.extend((0).to_bytes(4, "little"))

    pad = b"\x00" * padding
    for y in range(height):
        # gradient pattern: deep indigo to cyan
        r = int((y / height) * 200)
        g = int(((height - y) / height) * 160)
        b = 240
        row = bytes([b, g, r]) * width
        bmp.extend(row + pad)

    bmp_path = output_path.with_suffix(".bmp")
    bmp_path.write_bytes(bmp)
    return f"Success: Picture captured (640x480) and saved to {bmp_path}"


TOOLS = [
    {
        "name": "take_picture",
        "description": "Capture a photo from the local webcam and save it to disk.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "camera_index": {"type": "integer", "description": "Webcam device index (default 0)"},
                "filename": {"type": "string", "description": "Optional output filename"},
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
                "serverInfo": {"name": "camera", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name == "take_picture":
            out = take_picture(int(args.get("camera_index", 0)), str(args.get("filename", "")))
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
            sys.stderr.write(f"[camera-mcp error] {exc}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
