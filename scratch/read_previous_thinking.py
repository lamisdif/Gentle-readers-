import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        obj = json.loads(line)
        idx = obj.get('step_index')
        if idx in [6133, 6135, 6153, 6187]:
            print(f"=== STEP {idx} ===")
            print(obj.get('thinking', '')[:1000])
            print("---")
