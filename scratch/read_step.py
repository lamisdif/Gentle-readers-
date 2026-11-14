import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            if obj.get('step_index') in (1976, 1982):
                print(f"=== STEP {obj.get('step_index')} ===")
                # if there are tool_calls
                for tc in obj.get('tool_calls', []):
                    print("Tool call:", tc.get('name'))
                    args = tc.get('arguments', {})
                    if 'Target' in args:
                        print("Target:\n", args['Target'][:300])
                    if 'Replacement' in args:
                        print("Replacement:\n", args['Replacement'][:500])
        except Exception as e:
            pass
