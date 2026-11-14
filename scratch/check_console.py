import subprocess
import time
import json
import urllib.request
import websocket
import sys

# Start Chrome with remote debugging
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
cmd = [
    chrome_path,
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\DELL PRO\\AppData\\Local\\Temp\\chrome_debug_profile',
    'http://localhost:8080/public/manager/index.html'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_url = 'http://127.0.0.1:9222/json'
    tabs_data = urllib.request.urlopen(tabs_url, timeout=5).read()
    tabs = json.loads(tabs_data)
    
    target_tab = None
    for t in tabs:
        if 'public/manager/index.html' in t.get('url', ''):
            target_tab = t
            break
    if not target_tab and tabs:
        target_tab = tabs[0]
        
    print(f"Connected to tab: {target_tab.get('title')} ({target_tab.get('url')})")
    ws_url = target_tab['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Log.enable'}))
    ws.send(json.dumps({'id': 3, 'method': 'Page.enable'}))
    
    # Reload page
    ws.send(json.dumps({'id': 4, 'method': 'Page.reload'}))
    
    start = time.time()
    events = []
    while time.time() - start < 4:
        try:
            ws.settimeout(1.0)
            msg = ws.recv()
            data = json.loads(msg)
            method = data.get('method', '')
            if 'Console' in method or 'exceptionThrown' in method or 'entryAdded' in method:
                events.append((method, data.get('params')))
                print(f"[{method}] {json.dumps(data.get('params'), ensure_ascii=False)}")
        except websocket.WebSocketTimeoutException:
            continue
        except Exception as e:
            print("WS error:", e)
            break
            
    print(f"\nTotal events captured: {len(events)}")
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
