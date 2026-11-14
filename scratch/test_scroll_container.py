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
    '--remote-debugging-port=9231',
    '--window-size=1280,900',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9231/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    # Navigate
    ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/index.html'}}))
    time.sleep(3)
    
    check_js = '''
    (() => {
        const mc = document.querySelector('.main-content');
        const target = document.querySelector('.latest-books-online');
        const bodyScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const mcScroll = mc ? mc.scrollTop : null;
        
        return {
            hasMainContent: !!mc,
            mcScrollHeight: mc ? mc.scrollHeight : null,
            mcClientHeight: mc ? mc.clientHeight : null,
            mcScrollable: mc ? mc.scrollHeight > mc.clientHeight : false,
            windowScrollable: document.documentElement.scrollHeight > window.innerHeight,
            windowInnerHeight: window.innerHeight,
            targetTopInMc: target && mc ? target.offsetTop : null
        };
    })()
    '''
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': check_js, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            print("SCROLL CONTAINER ANALYSIS:")
            print(json.dumps(data.get('result', {}).get('result', {}).get('value'), indent=2))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
