import json

with open(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        obj = json.loads(line)
        step = obj.get('step_index')
        if step and step > 2400:
            c = str(obj.get('content') or '')
            t = str(obj.get('thinking') or '')
            if 'isProfitReconciled' in c or 'isProfitReconciled' in t:
                print(f"Step {step}:")
                # find where isProfitReconciled appears
                pos = c.find('isProfitReconciled')
                if pos != -1:
                    print("CONTENT:", c[max(0, pos-100):min(len(c), pos+300)])
                pos_t = t.find('isProfitReconciled')
                if pos_t != -1:
                    print("THINKING:", t[max(0, pos_t-100):min(len(t), pos_t+300)])
                print('-'*40)
