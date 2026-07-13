import json

transcript_path = r"C:\Users\Nidhi\.gemini\antigravity-ide\brain\19cf1f97-ba5a-4ec5-96ce-387cfe9f8122\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    lines = list(f)
    # Search backwards for "diagnose_dashboard_console"
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i]
        if "diagnose_dashboard_console" in line and "capture_browser_console_logs" in line:
            try:
                data = json.loads(line)
                content = data.get("content", "")
                parts = content.split("### Step")
                for p in parts:
                    if "capture_browser_console_logs" in p:
                        print("=== CONSOLE LOG ===")
                        print(p[:2000])
            except:
                pass
