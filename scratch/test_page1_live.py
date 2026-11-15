import subprocess
import time
import json
import urllib.request
import websocket
import tempfile

temp_dir = tempfile.mkdtemp()
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
cmd = [
    chrome_path,
    '--headless=new',
    '--remote-debugging-port=9245',
    '--window-size=1280,900',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9245/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/index.html'}}))
    time.sleep(3)
    
    eval_js = '''
    (async () => {
        for (let i = 0; i < 30; i++) {
            if (document.querySelectorAll('.slider .item').length >= 10) break;
            await new Promise(r => setTimeout(r, 100));
        }
        const visibleItems = Array.from(document.querySelectorAll('.slider .item:not(.hidden)'));
        return {
            totalBooks: document.querySelectorAll('.slider .item').length,
            page1Count: visibleItems.length,
            titles: visibleItems.map(el => el.querySelector('.book-title')?.textContent?.trim())
        };
    })()
    '''
    
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': eval_js, 'awaitPromise': True, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            print("STOREFRONT PAGE 1 BOOKS:")
            print(json.dumps(data.get('result', {}).get('result', {}).get('value'), indent=2, ensure_ascii=False))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
