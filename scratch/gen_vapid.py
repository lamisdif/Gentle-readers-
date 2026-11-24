import json
import subprocess
import time
import urllib.request
import websocket

chrome_proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new',
    '--remote-debugging-port=9227',
    '--remote-allow-origins=*',
    '--user-data-dir=C:\\Users\\DELL PRO\\AppData\\Local\\Temp\\chrome_vapid_gen',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
])

time.sleep(2)

try:
    tabs = json.loads(urllib.request.urlopen("http://localhost:9227/json").read().decode())
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
    send_cdp("Page.navigate", {"url": "http://localhost:8080/public/manager/index.html"})
    time.sleep(2)

    gen_script = """
    (async () => {
      const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
      );

      const pubRaw = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
      const privJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

      // Base64URL encode pubRaw
      function bufferToBase64Url(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
      }

      return JSON.stringify({
        publicKey: bufferToBase64Url(pubRaw),
        privateKey: privJwk.d
      });
    })()
    """

    res = send_cdp("Runtime.evaluate", {
        "expression": gen_script,
        "awaitPromise": True,
        "returnByValue": True
    })
    print("RAW RES:", res)

finally:
    try: ws.close()
    except: pass
    chrome_proc.terminate()
