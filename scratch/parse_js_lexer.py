# Tokenize JS string literals and template literals accurately

with open('public/manager/manager.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's write a proper state-machine lexer for JS strings, regex, comments, and template literals
i = 0
n = len(code)
line = 1
col = 1
stack = [] # tracks template brace depth: [ ('template', line, col), ('expr', line, col), ... ]

errors = []

while i < n:
    c = code[i]
    if c == '\n':
        line += 1
        col = 1
        i += 1
        continue
        
    # Check single-line comment
    if c == '/' and i + 1 < n and code[i+1] == '/':
        while i < n and code[i] != '\n':
            i += 1
        continue
        
    # Check multi-line comment
    if c == '/' and i + 1 < n and code[i+1] == '*':
        start_c_line = line
        i += 2
        while i + 1 < n and not (code[i] == '*' and code[i+1] == '/'):
            if code[i] == '\n':
                line += 1
            i += 1
        i += 2
        continue
        
    # Check regular string single quote
    if c == "'":
        i += 1
        while i < n:
            if code[i] == '\\':
                i += 2
                continue
            if code[i] == "'":
                i += 1
                break
            if code[i] == '\n':
                line += 1
            i += 1
        continue

    # Check regular string double quote
    if c == '"':
        i += 1
        while i < n:
            if code[i] == '\\':
                i += 2
                continue
            if code[i] == '"':
                i += 1
                break
            if code[i] == '\n':
                line += 1
            i += 1
        continue
        
    # Check template literal
    if c == '`':
        if len(stack) > 0 and stack[-1][0] == 'template':
            # closing template literal
            top = stack.pop()
            if line >= 2100 and line <= 2420:
                print(f"Closed template literal at line {line}:{col} (started at line {top[1]}:{top[2]})")
        else:
            stack.append(('template', line, col))
            if line >= 2100 and line <= 2420:
                print(f"Opened template literal at line {line}:{col}")
        i += 1
        col += 1
        continue
        
    # Inside template literal, check for ${
    if len(stack) > 0 and stack[-1][0] == 'template':
        if c == '$' and i + 1 < n and code[i+1] == '{':
            stack.append(('expr', line, col))
            if line >= 2100 and line <= 2420:
                print(f"Opened template expr ${{ at line {line}:{col}")
            i += 2
            col += 2
            continue
        # Otherwise regular char inside template
        i += 1
        col += 1
        continue

    # Inside expr or normal code, check braces
    if c == '{':
        if len(stack) > 0 and stack[-1][0] == 'expr':
            stack.append(('brace', line, col))
        i += 1
        col += 1
        continue
        
    if c == '}':
        if len(stack) > 0:
            if stack[-1][0] == 'brace':
                stack.pop()
            elif stack[-1][0] == 'expr':
                stack.pop()
                if line >= 2100 and line <= 2420:
                    print(f"Closed template expr }} at line {line}:{col}")
        i += 1
        col += 1
        continue
        
    i += 1
    col += 1

print(f"\nFinal stack (length {len(stack)}):")
for s in stack:
    print(f"  {s[0]} started at line {s[1]}:{s[2]}")
