import json
import subprocess
import time
import urllib.request
import websocket

# Clean up any lingering chrome on 9224
chrome_proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new',
    '--remote-debugging-port=9224',
    '--remote-allow-origins=*',
    '--user-data-dir=C:\\Users\\DELL PRO\\AppData\\Local\\Temp\\chrome_test_profile',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
])

time.sleep(2)

try:
    tabs = json.loads(urllib.request.urlopen("http://localhost:9224/json").read().decode())
    target_tab = [t for t in tabs if t.get('type') == 'page'][0]
    ws_url = target_tab['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url)

    msg_id = 0
    def send_cdp(method, params=None):
        global msg_id
        msg_id += 1
        curr_id = msg_id
        req = {"id": curr_id, "method": method}
        if params: req["params"] = params
        ws.send(json.dumps(req))
        while True:
            resp = json.loads(ws.recv())
            if resp.get("id") == curr_id:
                return resp.get("result", {})

    send_cdp("Page.enable")
    send_cdp("Runtime.enable")

    # Navigate to public/manager/index.html
    send_cdp("Page.navigate", {"url": "http://localhost:8080/public/manager/index.html"})
    time.sleep(2.5)

    eval_script = """
    (async () => {
      window.alertsLogged = [];
      window.confirmsLogged = [];
      window.alert = (msg) => { window.alertsLogged.push(msg); };
      window.confirm = (msg) => { window.confirmsLogged.push(msg); return true; };

      // Ensure mock state
      if (!window.state) window.state = {};
      state.orders = [
        { id: 10, items: ['قواعد العشق الأربعون × 1'], is_historical: true },
        { id: 140, items: ['قواعد العشق الأربعون × 2'], is_historical: false },
        { id: 141, items: ['كتاب غير محجوز × 1'], is_historical: false }
      ];
      state.inventory = [
        { id: 1, title: 'قواعد العشق الأربعون', quantity_received: 10, quantity_reserved: 2, quantity_sold: 0 },
        { id: 2, title: 'كتاب غير محجوز', quantity_received: 5, quantity_reserved: 0, quantity_sold: 0 }
      ];
      state.orderMeta = [
        { order_id: 140, fulfillment_status: 'pending' },
        { order_id: 141, fulfillment_status: 'pending' }
      ];
      state.orderAllocations = [
        { order_id: 140, inventory_item_id: 1, quantity: 2, allocation_status: 'reserved' }
      ];

      const results = {};

      // Test 1: Historical order protection
      await window.updateOrderStatus(10, 'delivered');
      results.test1_historical_blocked = (window.alertsLogged.length > 0 && window.alertsLogged[0].includes('Historical orders'));
      results.test1_inventory_untouched = (state.inventory[0].quantity_sold === 0 && state.inventory[0].quantity_reserved === 2);

      // Test 2: Normal order delivery with reserved items
      await window.updateOrderStatus(140, 'delivered');
      results.test2_reserved_decremented = (state.inventory[0].quantity_reserved === 0);
      results.test2_sold_incremented = (state.inventory[0].quantity_sold === 2);
      const meta140 = state.orderMeta.find(m => m.order_id === 140);
      results.test2_status_delivered = (meta140 && meta140.fulfillment_status === 'delivered');

      // Test 3: Idempotent call to delivered again
      window.alertsLogged = [];
      await window.updateOrderStatus(140, 'delivered');
      results.test3_idempotent_alert = (window.alertsLogged.length > 0 && window.alertsLogged[0].includes('already marked as delivered'));
      results.test3_no_double_sold = (state.inventory[0].quantity_sold === 2);

      // Test 4: Unreserved order delivered (convertQty is 0, sold must NOT increment)
      await window.updateOrderStatus(141, 'delivered');
      results.test4_unreserved_sold_untouched = (state.inventory[1].quantity_sold === 0);

      return JSON.stringify(results);
    })()
    """

    res = send_cdp("Runtime.evaluate", {
        "expression": eval_script,
        "awaitPromise": True,
        "returnByValue": True
    })
    print("Test Results:", res.get("result", {}).get("value"))

finally:
    try: ws.close()
    except: pass
    chrome_proc.terminate()
