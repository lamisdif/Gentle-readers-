with open('scratch/edge_parser_test.txt', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

idx = text.find('id="output"')
if idx != -1:
    print('Context around output:', text[idx-20:idx+300])
else:
    print('id="output" not found in file!')
