import urllib.request, json

SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

# Let's test calling find_inventory_item_id via RPC
url = f'{SUPABASE_URL}/rest/v1/rpc/find_inventory_item_id'
payload = {'p_title': 'مختارات شمس التبريزي'}
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}',
    'Content-Type': 'application/json'
})

try:
    with urllib.request.urlopen(req) as resp:
        print("find_inventory_item_id('مختارات شمس التبريزي') ->", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
