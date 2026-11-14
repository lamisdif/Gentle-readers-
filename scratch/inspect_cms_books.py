import json

with open('public/cms-books.json', 'r', encoding='utf-8') as f:
    books = json.load(f)

print(f"Total books: {len(books)}")

# Inspect date fields and ordering
created_times = []
for i, b in enumerate(books):
    ct = b.get('createdTime') or b.get('createdAt') or b.get('created_at') or b.get('date')
    id_val = b.get('id')
    created_times.append((i, b.get('title'), ct, id_val))

print("First 10 books in cms-books.json:")
for row in created_times[:10]:
    print(f"  [{row[0]}] title={row[1]} | createdTime={row[2]} | id={row[3]}")

print("\nLast 10 books in cms-books.json:")
for row in created_times[-10:]:
    print(f"  [{row[0]}] title={row[1]} | createdTime={row[2]} | id={row[3]}")

# Check unique values of createdTime
non_null_ct = [x for x in created_times if x[2] is not None]
print(f"\nBooks with non-null createdTime: {len(non_null_ct)} / {len(books)}")

# Let's inspect other files: how does CMD / admin add books?
