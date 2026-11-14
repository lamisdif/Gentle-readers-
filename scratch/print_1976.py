import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        obj = json.loads(line)
        if obj.get('step_index') == 1976:
            c = obj.get('content')
            lines = c.split('\n')
            for l in lines:
                if any(k in l for k in ['885:', '900:', '920:', '940:', '960:', '980:', '1000:', '1020:', '1040:', '1060:', '1080:', '1100:', '1120:', '1140:']):
                    idx = lines.index(l)
                    print('\n'.join(lines[max(0, idx-2):min(len(lines), idx+15)]))
                    print('='*50)
            break
