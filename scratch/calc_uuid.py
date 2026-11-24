import re, ctypes

def normalize_title_key(s):
    s = str(s).lower()
    s = re.sub(r'[\u064B-\u065F\u0670]', '', s)
    s = re.sub(r'[،,.\-_:;!?\'"()\[\]]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def deterministic_uuid(s):
    h1 = ctypes.c_int32(0xdeadbeef).value
    h2 = ctypes.c_int32(0x41c64e6d).value
    for ch in s:
        c = ord(ch)
        h1 = ctypes.c_int32(int((h1 ^ c) * 2654435761)).value
        h2 = ctypes.c_int32(int((h2 ^ c) * 1597334677)).value
    h1 = (h1 + 0x100000000) % 0x100000000
    h2 = (h2 + 0x100000000) % 0x100000000
    p1 = f'{h1:08x}'
    p2 = f'{h2:08x}'
    return f'{p1[:8]}-{p2[:4]}-4{p2[4:7]}-a{p1[:3]}-{p2[4:]}{p1[3:7]}'

for t in ['مختارات من ديوان شمس التبريزي', 'مختارات شمس التبريزي']:
    for grp in ['NEW_STOCK', 'OLD_STOCK']:
        k = f'{grp}::{normalize_title_key(t)}'
        print(f'{k} -> {deterministic_uuid(k)}')
