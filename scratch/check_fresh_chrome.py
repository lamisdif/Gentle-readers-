import subprocess
import time
import json
import urllib.request
import websocket
import tempfile
import os

temp_dir = tempfile.mkdtemp()
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
cmd = [
    chrome_path,
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9223/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Log.enable'}))
    ws.send(json.dumps({'id': 3, 'method': 'Page.enable'}))
    ws.send(json.dumps({'id': 4, 'method': 'Network.enable'}))
    ws.send(json.dumps({'id': 5, 'method': 'Network.setCacheDisabled', 'params': {'cacheDisabled': True}}))
    
    # Navigate to manager index.html
    ws.send(json.dumps({'id': 6, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/manager/index.html?t=' + str(time.time())}}))
    
    start = time.time()
    events = []
    exceptions = []
    console_msgs = []
    
    while time.time() - start < 4:
        try:
            ws.settimeout(1.0)
            msg = ws.recv()
            data = json.loads(msg)
            method = data.get('method', '')
            if 'exceptionThrown' in method:
                exceptions.append(data.get('params'))
                print(f"\n>>> EXCEPTION: {json.dumps(data.get('params'), ensure_ascii=False)}")
            elif 'consoleAPICalled' in method:
                console_msgs.append(data.get('params'))
                print(f"[Console] {data.get('params', {}).get('type')}: {[arg.get('value') for arg in data.get('params', {}).get('args', [])]}")
            elif 'entryAdded' in method:
                print(f"[Log] {data.get('params', {}).get('entry', {}).get('text')}")
        except websocket.WebSocketTimeoutException:
            continue
        except Exception as e:
            print("WS error:", e)
            break
            
    print(f"\n--- SUMMARY ---")
    print(f"Exceptions: {len(exceptions)}")
    print(f"Console messages: {len(console_msgs)}")
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
