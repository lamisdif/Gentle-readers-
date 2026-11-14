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
    '--remote-debugging-port=9228',
    '--window-size=1280,900',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9228/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    ws.send(json.dumps({'id': 3, 'method': 'Network.enable'}))
    
    # Track any navigation or document requests
    ws.send(json.dumps({'id': 4, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/index.html'}}))
    time.sleep(3)
    
    test_click_js = '''
    (async () => {
        // Scroll down to the pagination button
        const page2 = document.querySelector('a[data-page="2"]');
        if (!page2) return { error: "No page 2 button found" };
        
        page2.scrollIntoView();
        const yBefore = window.pageYOffset;
        
        // Track whether default was prevented
        let defaultPrevented = false;
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        page2.dispatchEvent(clickEvent);
        defaultPrevented = clickEvent.defaultPrevented;
        
        // Wait 1 second to see where scroll ends up
        await new Promise(r => setTimeout(r, 1000));
        
        const yAfter = window.pageYOffset;
        const target = document.querySelector('.latest-books-online');
        const targetTop = target ? target.getBoundingClientRect().top + window.pageYOffset : 0;
        const targetBoundingTop = target ? target.getBoundingClientRect().top : 0;
        
        return {
            defaultPrevented,
            yBefore,
            yAfter,
            targetTop,
            targetBoundingTop,
            url: window.location.href,
            visibleItems: Array.from(document.querySelectorAll('.slider .item')).filter(i => !i.classList.contains('hidden')).length,
            firstVisibleTitle: document.querySelector('.slider .item:not(.hidden) .book-title')?.textContent
        };
    })()
    '''
    
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': test_click_js, 'awaitPromise': True, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            print("CLICK TEST OUTPUT:")
            print(json.dumps(data.get('result', {}).get('result', {}).get('value'), indent=2))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
