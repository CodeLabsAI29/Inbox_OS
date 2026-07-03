import json

transcript_path = r"C:\Users\Nidhi\.gemini\antigravity-ide\brain\19cf1f97-ba5a-4ec5-96ce-387cfe9f8122\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        if "capture_browser_console_logs" in line and '"type":"SYSTEM"' in line:
            try:
                data = json.loads(line)
                content = data.get("content", "")
                # If content is a JSON string, let's load it and pretty print it
                parsed = json.loads(content)
                print("=== TOOL RESPONSE FOR CONSOLE LOGS ===")
                print(json.dumps(parsed, indent=2))
            except Exception as e:
                pass
