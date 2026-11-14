import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        tc = data.get('tool_calls', [])
        for t in tc:
            args = t.get('args', {})
            path = args.get('Path', '')
            if 'manager.js' in path and t.get('name') == 'edit_file':
                idx = data.get('step_index')
                print(f"Step {idx}: edit_file target: {repr(args.get('Target')[:80])} -> {repr(args.get('Replacement')[:80])}")
