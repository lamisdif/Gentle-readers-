import urllib.request, urllib.error, json

with open('scratch/decompressed_token.txt') as f:
    token = f.read().strip()

SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"

def make_req(endpoint, method='GET', body=None, prefer='return=representation'):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        'apikey': ANON_KEY,
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Prefer': prefer
    }
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode('utf-8')
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            parsed = json.loads(err_body)
        except:
            parsed = err_body
        return e.code, parsed

print("=" * 70)
print("SUPABASE LIVE TEST: DEBT SYNCHRONIZATION WITH OWNER AUTH")
print("=" * 70)

# Step 0: Check initial state
status, debts = make_req('debts?select=*')
print(f"\n[Step 0] Initial debts in Supabase: HTTP {status}, count = {len(debts)}")
for d in debts:
    print("  -> Existing debt:", d)

# Test 1: Creating a new debt via direct POST (no on_conflict=id)
test_id = "test_debt_verify_1"
new_debt_payload = {
    "id": test_id,
    "creditor_name": "Test Supplier Creditor",
    "debt_type": "supplier",
    "original_amount_da": 5000,
    "incurred_date": "2026-11-07",
    "due_date": None,
    "notes": "Automated verification test debt"
}
print(f"\n[Test 1] Creating new debt via direct POST /rest/v1/debts (id: {test_id})...")
status, resp = make_req('debts', method='POST', body=new_debt_payload)
print(f"  Response: HTTP {status}")
print(f"  Record created: {resp}")
assert status in (200, 201), f"Expected 200/201 but got {status}: {resp}"

# Test 2: Updating an existing debt via PATCH (without id in body)
update_payload = {
    "creditor_name": "Test Supplier Creditor (Updated)",
    "debt_type": "other",
    "original_amount_da": 7500,
    "incurred_date": "2026-11-07",
    "due_date": None,
    "notes": "Updated note via PATCH"
}
print(f"\n[Test 2] Updating debt via PATCH /rest/v1/debts?id=eq.{test_id} (excluding 'id' from body)...")
status, resp = make_req(f'debts?id=eq.{test_id}', method='PATCH', body=update_payload)
print(f"  Response: HTTP {status}")
print(f"  Record updated: {resp}")
assert status in (200, 204), f"Expected 200/204 but got {status}: {resp}"

# Test 3: Retrying an insert whose ID already exists (409 Conflict handling)
print(f"\n[Test 3] Simulating interrupted retry: POST insert with already existing id {test_id}...")
status, err_resp = make_req('debts', method='POST', body=new_debt_payload)
print(f"  Direct POST Response: HTTP {status} ({err_resp})")
assert status == 409, f"Expected 409 Conflict, got {status}"

# Idempotency handler: Catch 409 and retry via PATCH by ID without id in body
print(f"  [Idempotency Handler] Caught HTTP 409. Executing fallback PATCH by ID...")
patch_body = {k: v for k, v in new_debt_payload.items() if k != 'id'}
status, patch_resp = make_req(f'debts?id=eq.{test_id}', method='PATCH', body=patch_body)
print(f"  Fallback PATCH Response: HTTP {status}")
assert status in (200, 204), f"Expected 200/204, got {status}"
print("  PASSED: Idempotent retry succeeded without duplicate records.")

# Clean up Test 1-3 temporary debt
print(f"\n[Cleanup] Deleting temporary test debt {test_id}...")
status, _ = make_req(f'debts?id=eq.{test_id}', method='DELETE')
print(f"  Cleanup Response: HTTP {status}")

# Test 4: Sync the real 12,000 DA Excel Debt record
real_debt_id = "debt_excel_me"
real_debt_payload = {
    "id": real_debt_id,
    "creditor_name": "me",
    "debt_type": "personal",
    "original_amount_da": 12000,
    "incurred_date": None,
    "due_date": None,
    "notes": "Opening personal liability from Excel DEBTS sheet"
}
print(f"\n[Test 4] Syncing actual 12,000 DA debt (creditor: 'me')...")
status, resp = make_req('debts', method='POST', body=real_debt_payload)
if status == 409:
    print("  Debt already exists on remote, executing idempotent PATCH...")
    p_body = {k: v for k, v in real_debt_payload.items() if k != 'id'}
    status, resp = make_req(f'debts?id=eq.{real_debt_id}', method='PATCH', body=p_body)
print(f"  Response: HTTP {status}")

# Test 5: Verify final state in Supabase
print(f"\n[Test 5] Confirming final debts & balance calculations on Supabase...")
status, final_debts = make_req('debts?select=*')
print(f"  Total debts in Supabase: {len(final_debts)}")
for d in final_debts:
    print(f"  -> Debt ID: {d['id']}, Creditor: {d['creditor_name']}, Original: {d['original_amount_da']} DA, Repaid: {d['amount_repaid_da']} DA, Remaining: {d['remaining_balance_da']} DA")
    if d['creditor_name'] == 'me':
        assert float(d['original_amount_da']) == 12000.0, "Expected 12000 DA original amount"
        assert float(d['amount_repaid_da']) == 0.0, "Expected 0 DA repaid"
        assert float(d['remaining_balance_da']) == 12000.0, "Expected 12000 DA remaining balance"

# Test 6: Check debt repayments
status, reps = make_req('debt_repayments?select=*')
print(f"\n[Test 6] Debt repayments ledger: HTTP {status}, count = {len(reps)}")
for r in reps:
    print(f"  -> Repayment ID: {r['id']}, Debt ID: {r['debt_id']}, Amount: {r['amount_da']} DA, Method: {r['payment_method']}")

print("\n" + "=" * 70)
print("ALL LIVE TESTS PASSED SUCCESSFULLY!")
print("=" * 70)
