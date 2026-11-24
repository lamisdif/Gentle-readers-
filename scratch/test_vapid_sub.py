import json
import subprocess
import time
import urllib.request
import websocket

chrome_proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new',
    '--remote-debugging-port=9228',
    '--remote-allow-origins=*',
    '--user-data-dir=C:\\Users\\DELL PRO\\AppData\\Local\\Temp\\chrome_vapid_test',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
])

time.sleep(2)

try:
    tabs = json.loads(urllib.request.urlopen("http://localhost:9228/json").read().decode())
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

    send_cdp("Runtime.enable")
    send_cdp("Page.navigate", {"url": "http://localhost:8080/public/manager/index.html"})
    time.sleep(2)

    test_script = """
    (() => {
      const pubKey = 'BNikz7cow1jn_DxcfgXgE2l9mwYiHrIH6MdPbe-8lQ074jsVyGgL4zyUJRtJCCK71wUJgC1J7utgG_fq8sjbh-Q';
      function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }

      const arr = urlBase64ToUint8Array(pubKey);
      return { length: arr.length, byte0: arr[0] };
    })()
    """

    res = send_cdp("Runtime.evaluate", {
        "expression": test_script,
        "returnByValue": True
    })
    print("Test result:", res)

finally:
    try: ws.close()
    except: pass
    chrome_proc.terminate()
