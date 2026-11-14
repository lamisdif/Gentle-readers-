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
    '--remote-debugging-port=9232',
    '--window-size=1280,900',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9232/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    # Navigate
    ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/index.html'}}))
    time.sleep(4)
    
    scroll_test_js = '''
    (() => {
        const mc = document.querySelector('.main-content');
        const target = document.querySelector('.latest-books-online') || document.querySelector('.slider');
        
        // Test scroll target
        const beforeTop = target.getBoundingClientRect().top;
        
        // Scroll target into view
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        
        const afterTop = target.getBoundingClientRect().top;
        const mcScrollTop = mc ? mc.scrollTop : null;
        
        return {
            beforeTop,
            afterTop,
            mcScrollTop
        };
    })()
    '''
    
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': scroll_test_js, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            print("SCROLL INTO VIEW RESULT:")
            print(json.dumps(data.get('result', {}).get('result', {}).get('value'), indent=2))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
