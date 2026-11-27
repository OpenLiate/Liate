#!/usr/bin/env python3
"""
Portable Local MCP stdio JSON-RPC 2.0 Server for Cron Scheduler Agent.
Zero external pip dependency — runs on standard Python 3.
"""
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = str(BASE_DIR / "scheduler.db")
DAEMON_PATH = str(BASE_DIR / "daemon.py")
LOGS_DIR = str(BASE_DIR / "logs")

os.makedirs(LOGS_DIR, exist_ok=True)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cron_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cron_expr TEXT,
            target_agent TEXT,
            intent TEXT,
            last_run TEXT
        )
    """)
    conn.commit()
    conn.close()


def ensure_daemon_running():
    pid_file = str(BASE_DIR / "daemon.pid")
    running = False
    if os.path.exists(pid_file):
        try:
            with open(pid_file, "r") as f:
                pid = int(f.read().strip())
            res = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True)
            if str(pid) in res.stdout:
                running = True
        except Exception:
            pass

    if not running and os.path.exists(DAEMON_PATH):
        try:
            subprocess.Popen(
                [sys.executable, DAEMON_PATH],
                creationflags=0x00000008,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                close_fds=True,
            )
        except Exception:
            pass


def add_cron_job(cron_expr: str, target_agent: str, intent: str) -> str:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO cron_jobs (cron_expr, target_agent, intent, last_run) VALUES (?, ?, ?, NULL)",
        (cron_expr, target_agent, intent),
    )
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()

    ensure_daemon_running()
    return f"Success: Scheduled job #{job_id} to run '{target_agent}' with intent '{intent}' on schedule '{cron_expr}'."


def list_cron_jobs() -> str:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, cron_expr, target_agent, intent, last_run FROM cron_jobs")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return "No scheduled cron jobs found. You can add one using add_cron_job."

    res = "Active Cron Jobs:\n"
    for r in rows:
        res += f"- ID: {r[0]} | Schedule: {r[1]} | Agent: {r[2]} | Intent: '{r[3]}' | Last run: {r[4] or 'Never'}\n"
    return res


def remove_cron_job(job_id: int) -> str:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cron_jobs WHERE id = ?", (job_id,))
    changes = conn.total_changes
    conn.commit()
    conn.close()

    if changes > 0:
        return f"Success: Removed cron job #{job_id}."
    return f"Error: Cron job #{job_id} not found."


TOOLS = [
    {
        "name": "add_cron_job",
        "description": "Schedule a periodic task to run an agent with an intent.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "cron_expr": {"type": "string", "description": "Standard 5-field cron expression (e.g. '*/5 * * * *')"},
                "target_agent": {"type": "string", "description": "The name of the agent to run"},
                "intent": {"type": "string", "description": "The prompt or goal for the agent"},
            },
            "required": ["cron_expr", "target_agent", "intent"],
        },
    },
    {
        "name": "list_cron_jobs",
        "description": "List all scheduled active cron jobs.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "remove_cron_job",
        "description": "Remove or cancel a scheduled cron job by its ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "job_id": {"type": "integer", "description": "The ID of the cron job to remove"},
            },
            "required": ["job_id"],
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
                "serverInfo": {"name": "cron_scheduler", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name == "add_cron_job":
            out = add_cron_job(str(args.get("cron_expr", "* * * * *")), str(args.get("target_agent", "")), str(args.get("intent", "")))
        elif name == "list_cron_jobs":
            out = list_cron_jobs()
        elif name == "remove_cron_job":
            out = remove_cron_job(int(args.get("job_id", 0)))
        else:
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool: {name}"}}
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": out}]},
        }
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}


def main():
    init_db()
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
            sys.stderr.write(f"[scheduler-mcp error] {exc}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
