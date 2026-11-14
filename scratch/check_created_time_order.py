import json

with open('public/cms-books.json', 'r', encoding='utf-8') as f:
    books = json.load(f)

# Check createdTime values
cts = [b.get('createdTime') for b in books]
# Is it monotonically decreasing or increasing?
is_desc = all(cts[i] >= cts[i+1] for i in range(len(cts)-1))
is_asc = all(cts[i] <= cts[i+1] for i in range(len(cts)-1))

print(f"Is cms-books.json already sorted descending by createdTime? {is_desc}")
print(f"Is cms-books.json already sorted ascending by createdTime? {is_asc}")

# Check any inversions
inversions = []
for i in range(len(cts)-1):
    if cts[i] < cts[i+1]:
        inversions.append((i, books[i]['title'], cts[i], books[i+1]['title'], cts[i+1]))

print(f"Inversions (where b[i] < b[i+1]): {len(inversions)}")
for inv in inversions[:5]:
    print(" ", inv)
