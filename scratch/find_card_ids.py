with open('public/manager/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Find all id attributes in metric cards
ids = re.findall(r'id="([^"]*(?:inv|stock|batch|cost|rev|profit|sales)[^"]*)"', text, re.IGNORECASE)
print('Relevant metric element IDs in index.html:')
for i in sorted(set(ids)):
    print(' ', i)
