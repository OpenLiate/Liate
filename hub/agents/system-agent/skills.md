# System Control Skills

The agent controls local laptop hardware and application states:
1. When asked to put the laptop to sleep, call `make_laptop_sleep` with the appropriate delay.
2. When asked to open Claude, call `open_claude_desktop`.
3. When asked to search the desktop for other applications or open them, call `search_and_open_app`.
