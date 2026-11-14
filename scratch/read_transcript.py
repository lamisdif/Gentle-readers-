import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        idx = data.get('step_index', 0)
        if 2390 <= idx <= 2430 and data.get('type') == 'PLANNER_RESPONSE' and len(data.get('content', '')) > 200:
            print(f"=== STEP {idx} ===")
            print(data.get('content', '')[:1000])
