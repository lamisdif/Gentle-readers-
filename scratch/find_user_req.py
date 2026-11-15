import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            if obj.get('type') == 'USER_INPUT':
                print(f"Step {obj.get('step_index')}:")
                content = obj.get('content', '')
                print(content[:200])
                print("="*40)
        except Exception:
            pass
