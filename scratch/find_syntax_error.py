with open('public/manager/manager.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_template = False
start_line = 0

for idx, line in enumerate(lines):
    line_no = idx + 1
    i = 0
    while i < len(line):
        if line[i] == '`' and (i == 0 or line[i-1] != '\\'):
            if not in_template:
                in_template = True
                start_line = line_no
            else:
                in_template = False
                if start_line >= 2100 and line_no <= 2500:
                    print(f"Template literal from line {start_line} to {line_no}")
                start_line = 0
        i += 1

print(f"Final state: in_template={in_template}, started at {start_line}")
