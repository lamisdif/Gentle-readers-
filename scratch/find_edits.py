import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        idx = data.get('step_index', 0)
        tool_calls = data.get('tool_calls', [])
        for tc in tool_calls:
            fn = tc.get('function', {})
            name = fn.get('name', '')
            args = fn.get('arguments', {})
            if 'manager.js' in str(args):
                print(f"Step {idx}: {name} - Target/Replacement summary: {str(args)[:200]}")
