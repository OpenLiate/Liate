#!/usr/bin/env python3
"""
Portable Local MCP (stdio JSON-RPC 2.0) Server for Cold-Chain Logistics FDE.
Implements:
  - query_telemetry_db
  - fetch_corridor_conditions
  - search_compliance_sop
"""
import json
import sqlite3
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "cold_chain.db"
SOP_PATH = BASE_DIR / "sop.md"


def ensure_db() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS active_fleet (
            vehicle_id TEXT PRIMARY KEY,
            timestamp TEXT,
            corridor TEXT,
            vehicle_gps_latitude REAL,
            vehicle_gps_longitude REAL,
            iot_temperature REAL,
            risk_classification TEXT,
            delay_probability REAL
        )
        """
    )
    count = cur.execute("SELECT COUNT(*) FROM active_fleet").fetchone()[0]
    if count == 0:
        rows = [
            ("TRK-LA-402", "2026-11-27T12:15:00Z", "I-710 Port of Long Beach -> San Bernardino", 33.7701, -118.1937, 6.8, "High Risk", 0.78),
            ("TRK-LA-118", "2026-11-27T12:18:00Z", "I-10 Inland Empire Corridor", 34.0522, -117.6500, 5.1, "High Risk", 0.69),
            ("TRK-SD-009", "2026-11-27T12:20:00Z", "I-5 San Diego North", 32.8328, -117.2713, 2.3, "Low Risk", 0.12),
            ("TRK-LA-205", "2026-11-27T12:22:00Z", "I-405 LAX Freight Spur", 33.9416, -118.4085, 3.4, "Moderate Risk", 0.34),
        ]
        cur.executemany(
            "INSERT INTO active_fleet VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rows,
        )
        conn.commit()
    conn.close()


def query_telemetry_db(threshold: float = 4.0, limit: int = 2):
    ensure_db()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT vehicle_id, timestamp, corridor, vehicle_gps_latitude, vehicle_gps_longitude,
               iot_temperature, risk_classification, delay_probability
        FROM active_fleet
        WHERE iot_temperature > ?
        ORDER BY iot_temperature DESC
        LIMIT ?
        """,
        (threshold, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def fetch_corridor_conditions(vehicle_id: str = "TRK-LA-402"):
    return {
        "vehicle_id": vehicle_id,
        "port_congestion_index": 7.8,
        "ambient_temp_c": 29.4,
        "estimated_eta_delay_minutes": 85,
        "recommended_overflow_depot": "Inland Empire Overflow Depot (San Bernardino)",
    }


def search_compliance_sop(query: str = "breach"):
    if not SOP_PATH.exists():
        return {"error": "sop.md not found"}
    text = SOP_PATH.read_text(encoding="utf-8")
    return {"source": str(SOP_PATH.name), "query": query, "sop_content": text}


TOOLS = [
    {
        "name": "query_telemetry_db",
        "description": "Query local SQLite fleet telemetry for vehicles exceeding iot_temperature threshold (default 4.0C).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "threshold": {"type": "number", "description": "Temperature threshold in Celsius (default 4.0)"},
                "limit": {"type": "integer", "description": "Max vehicles to return (default 2)"},
            },
        },
    },
    {
        "name": "fetch_corridor_conditions",
        "description": "Fetch live port congestion index, ambient weather, and ETA delay for a cold-chain vehicle.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "vehicle_id": {"type": "string", "description": "Vehicle ID such as TRK-LA-402"},
            },
        },
    },
    {
        "name": "search_compliance_sop",
        "description": "Search cold-chain compliance SOP (sop.md) for breach mitigation, congestion, and escalation rules.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Topic or keyword to search"},
            },
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
                "serverInfo": {"name": "coldchain-mcp", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name == "query_telemetry_db":
            res = query_telemetry_db(float(args.get("threshold", 4.0)), int(args.get("limit", 2)))
        elif name == "fetch_corridor_conditions":
            res = fetch_corridor_conditions(str(args.get("vehicle_id", "TRK-LA-402")))
        elif name == "search_compliance_sop":
            res = search_compliance_sop(str(args.get("query", "breach")))
        else:
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool: {name}"}}
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": json.dumps(res)}]},
        }
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}


def main():
    ensure_db()
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
            sys.stderr.write(f"[coldchain-mcp error] {exc}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
