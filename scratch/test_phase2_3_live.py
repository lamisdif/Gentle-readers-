import json
import subprocess
import time
import urllib.request
import websocket

chrome_proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new',
    '--remote-debugging-port=9226',
    '--remote-allow-origins=*',
    '--user-data-dir=C:\\Users\\DELL PRO\\AppData\\Local\\Temp\\chrome_test_profile_3',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
])

time.sleep(2)

try:
    tabs = json.loads(urllib.request.urlopen("http://localhost:9226/json").read().decode())
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

    # Navigate to public/checkout.html
    send_cdp("Page.navigate", {"url": "http://localhost:8080/public/checkout.html"})
    time.sleep(3)

    chk_res = send_cdp("Runtime.evaluate", {
        "expression": "document.getElementById('checkout-submit-button') !== null",
        "returnByValue": True
    })
    print("Checkout submit button present:", chk_res.get("result", {}).get("value"))

    # Also check if any runtime errors occurred on checkout
    err_res = send_cdp("Runtime.evaluate", {
        "expression": "window.errorsLogged || []",
        "returnByValue": True
    })
    print("Runtime errors:", err_res.get("result", {}).get("value"))

finally:
    try: ws.close()
    except: pass
    chrome_proc.terminate()
