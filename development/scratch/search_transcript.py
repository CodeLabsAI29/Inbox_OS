import json

transcript_path = r"C:\Users\Nidhi\.gemini\antigravity-ide\brain\19cf1f97-ba5a-4ec5-96ce-387cfe9f8122\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        if "Failed to read email list" in line or "emailsList.filter" in line or "ConsoleLog" in line:
            # Print matching lines containing details
            if len(line) < 3000:
                print(line)
            else:
                print(line[:500] + "... TRUNCATED ...")
