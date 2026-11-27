import os
import time
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path
from croniter import croniter

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = str(BASE_DIR / "scheduler.db")
PID_FILE = str(BASE_DIR / "daemon.pid")
LOGS_DIR = str(BASE_DIR / "logs")
LIATE_CLI = os.environ.get(
    "LIATE_CLI",
    str(BASE_DIR.parents[2] / "src" / "cli" / "index.ts")
)

os.makedirs(LOGS_DIR, exist_ok=True)

# Write PID
with open(PID_FILE, "w") as f:
    f.write(str(os.getpid()))

def run_job(job_id, target_agent, intent):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(LOGS_DIR, f"job_{job_id}_{timestamp}.log")
    
    env = os.environ.copy()
    
    # Run the agent via bun CLI
    try:
        with open(log_file, "w", encoding="utf-8") as f:
            f.write(f"--- Job #{job_id} Started at {timestamp} ---\n")
            f.write(f"Command: bun run {LIATE_CLI} run {target_agent} \"{intent}\"\n\n")
            f.flush()
            
            subprocess.run(
                ["bun", "run", LIATE_CLI, "run", target_agent, intent],
                env=env,
                stdout=f,
                stderr=f,
                cwd=str(BASE_DIR),
                timeout=180
            )
    except Exception as e:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"\nExecution Error: {str(e)}\n")

def tick():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, cron_expr, target_agent, intent, last_run FROM cron_jobs")
    jobs = cursor.fetchall()
    
    now = datetime.now().replace(second=0, microsecond=0)
    now_str = now.strftime("%Y-%m-%d %H:%M")
    
    for job_id, cron_expr, target_agent, intent, last_run in jobs:
        if last_run == now_str:
            continue
            
        try:
            c_check = croniter(cron_expr, now.replace(minute=now.minute + 1))
            scheduled_time = c_check.get_prev(datetime)
            
            if scheduled_time == now:
                cursor.execute(
                    "UPDATE cron_jobs SET last_run = ? WHERE id = ?",
                    (now_str, job_id)
                )
                conn.commit()
                
                subprocess.Popen(
                    [
                        "python", "-c",
                        f"import sys; from pathlib import Path; sys.path.insert(0, r'{str(BASE_DIR)}'); from daemon import run_job; run_job({job_id}, '{target_agent}', '{intent}')"
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
        except Exception:
            pass
            
    conn.close()

if __name__ == "__main__":
    os.makedirs(LOGS_DIR, exist_ok=True)
    while True:
        try:
            tick()
        except Exception:
            pass
        time.sleep(10)
