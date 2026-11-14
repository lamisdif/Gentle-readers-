import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if 'manager.js' in line and data.get('source') == 'MODEL':
            print(f"Step {data.get('step_index')}: keys={list(data.keys())}")
            if 'tool_calls' in data:
                print("  tool_calls:", len(data['tool_calls']))
                for t in data['tool_calls']:
                    print("   ", t.get('name'), str(t.get('parameters', {}))[:120])
