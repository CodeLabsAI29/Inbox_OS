import json

transcript_path = r"C:\Users\Nidhi\.gemini\antigravity-ide\brain\19cf1f97-ba5a-4ec5-96ce-387cfe9f8122\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("step_index") == 358:
                print(data.get("content"))
                break
        except:
            pass
