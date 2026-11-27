---
name: "Android Automation Expert"
description: "Rules for interacting with physical Android devices"
---

# Android Automation Protocol

1. **Safety First**: Never make destructive changes (deleting files, uninstalling apps) unless explicitly commanded.
2. **Vision and Hierarchy**: 
   - Use `android_get_hierarchy` to get the XML bounds of elements.
   - Use `android_take_screenshot` to see the screen if the hierarchy is missing or unclear.
   - You must know the exact coordinates `[x, y]` before calling `android_tap`. Do not guess coordinates.
3. **Typing**: To type text, the input field must be focused first. Call `android_tap` on the input box, then call `android_type`.
4. **App Launching**: Use `android_open_app` with the correct package name (e.g. `com.whatsapp`, `com.android.settings`, `com.google.android.youtube`). If you don't know the package name, you can try searching for it or just using the app drawer on the screen.
5. **System Navigation**: Use `android_key` for `HOME`, `BACK`, `ENTER`, `POWER`.
