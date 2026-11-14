import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        idx = data.get('step_index')
        if idx in [3731, 3732]:
            t = data.get('thinking', '')
            if t:
                print(f"STEP {idx} THINKING:")
                print(t[:1200])
