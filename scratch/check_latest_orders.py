import urllib.request
import json

url = 'https://fsximdllrhglabxbqvay.supabase.co/rest/v1/orders?order=id.desc&limit=5'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'
req = urllib.request.Request(url, headers={'apikey': key, 'Authorization': 'Bearer ' + key})

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print(f"Total fetched: {len(data)}")
    for o in data:
        print("="*50)
        print("Order ID:", o.get("id"))
        print("Created At:", o.get("created_at"))
        print("Customer:", o.get("firstName"), o.get("familyName"))
        print("Phone:", o.get("phoneNumber"))
        print("Total Price:", o.get("total_price"))
        print("Items:", o.get("items"))
        print("Wilaya:", o.get("wilaya"))
