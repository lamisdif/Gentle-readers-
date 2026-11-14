with open('scratch/edge_parser_test.txt', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re, json
m = re.search(r'<div id="output">(\{.*?\})</div>', text, re.DOTALL)
if m:
    parsed = json.loads(m.group(1))
    print(json.dumps(parsed, indent=2, ensure_ascii=False))
else:
    print('Pattern not matched')
