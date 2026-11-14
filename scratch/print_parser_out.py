with open('scratch/edge_parser_test.txt', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
m = re.search(r'<div id="output">(.*?)</div>', text, re.DOTALL)
if m:
    print(m.group(1))
else:
    print("Not found")
