import urllib.request, json

SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

req = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/order_meta?order_id=gte.171', headers={
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}'
})

try:
    with urllib.request.urlopen(req) as resp:
        metas = json.loads(resp.read().decode('utf-8'))
        print(f"order_meta records for >= 171: {len(metas)}")
        for m in metas:
            print(m)
except Exception as e:
    print("Error checking order_meta:", e)
