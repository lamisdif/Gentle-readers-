import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        obj = json.loads(line)
        idx = obj.get('step_index')
        if idx in range(1740, 1755):
            print(f"=== STEP {idx} ===")
            c = obj.get('content')
            if isinstance(c, list):
                for item in c:
                    print(str(item.get('text', ''))[:500])
            else:
                print(str(c)[:500])
