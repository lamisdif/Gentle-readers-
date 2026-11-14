import json

with open('public/cms-books.json', 'r', encoding='utf-8') as f:
    books = json.load(f)

from collections import Counter
counts = Counter(b.get('createdTime') for b in books)
print("Unique createdTimes:", len(counts))
print("Most common createdTimes:", counts.most_common(10))
