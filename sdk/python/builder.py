#!/usr/bin/env python3
"""
OpenLiate Python Multi-Target Builder
Builds 'liate' or 'openliate' PyPI packages from a single source directory.

Usage:
    python build.py liate      # Builds liate wheel & sdist
    python build.py openliate  # Builds openliate wheel & sdist
    python build.py all        # Builds both
"""

import sys
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.resolve()

def build_package(target: str) -> None:
    config_file = ROOT / f"pyproject.{target}.toml"
    dest_file = ROOT / "pyproject.toml"

    if not config_file.exists():
        print(f"[Error] Config file not found: {config_file}")
        sys.exit(1)

    print(f"\n{'='*50}")
    print(f"  Building PyPI package: '{target}' (v0.1.6)")
    print(f"{'='*50}")

    # Copy target configuration to active pyproject.toml
    shutil.copyfile(config_file, dest_file)
    print(f"[+] Loaded config from: pyproject.{target}.toml")

    # Run standard python -m build with --no-isolation for instant speed
    cmd = [sys.executable, "-m", "build", "--no-isolation"]
    result = subprocess.run(cmd, cwd=str(ROOT))

    if result.returncode != 0:
        print(f"[!] Build failed for '{target}' with exit code {result.returncode}")
        sys.exit(result.returncode)

    print(f"[✓] Successfully built '{target}'!")

def main() -> None:
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"

    if target in ("liate", "all"):
        build_package("liate")

    if target in ("openliate", "all"):
        build_package("openliate")

    # Reset active pyproject.toml to liate by default
    shutil.copyfile(ROOT / "pyproject.liate.toml", ROOT / "pyproject.toml")

    print(f"\n{'='*50}")
    print("  All requested packages built successfully in dist/")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    main()
