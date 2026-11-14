content = open('scratch/edge_mgr_test2.txt', encoding='utf-8', errors='ignore').read()
idx = content.find('id="test-log"')
print(content[idx:idx+2500])
