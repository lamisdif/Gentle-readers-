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
    '--remote-debugging-port=9226',
    '--window-size=1280,900',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9226/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    # Navigate
    ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/index.html'}}))
    time.sleep(3)
    
    # Check initial scroll and elements
    eval_script = '''
    (async () => {
        const initialScrollY = window.pageYOffset;
        const target = document.querySelector('.latest-books-online');
        const targetRect = target ? target.getBoundingClientRect() : null;
        
        // Scroll to the pagination container
        const pag = document.getElementById('pagination-1');
        if (pag) pag.scrollIntoView();
        
        const scrollBeforeClick = window.pageYOffset;
        
        // Click page 2 button
        const page2Btn = document.querySelector('a[data-page="2"]');
        if (page2Btn) {
            page2Btn.click();
        }
        
        // Wait a short moment for smooth scroll / DOM updates
        await new Promise(r => setTimeout(r, 600));
        
        const scrollAfterClick = window.pageYOffset;
        const targetRectAfter = target ? target.getBoundingClientRect() : null;
        
        return {
            hasTarget: !!target,
            targetTopBefore: targetRect ? targetRect.top + initialScrollY : null,
            scrollBeforeClick,
            scrollAfterClick,
            targetRectAfterTop: targetRectAfter ? targetRectAfter.top : null,
            targetTopAfter: targetRectAfter ? targetRectAfter.top + scrollAfterClick : null,
            urlAfter: window.location.href,
            heroDisplay: document.getElementById('hero-section')?.style?.display
        };
    })()
    '''
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': eval_script, 'awaitPromise': True, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            res = data.get('result', {}).get('result', {}).get('value')
            print("PAGINATION CLICK TEST RESULT:")
            print(json.dumps(res, indent=2))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
