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
    '--remote-debugging-port=9230',
    '--window-size=1280,900',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9230/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    # Navigate
    ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/index.html'}}))
    time.sleep(4)
    
    click_test_js = '''
    (async () => {
        // Wait until pagination is rendered
        for (let i = 0; i < 20; i++) {
            if (document.querySelector('a[data-page="2"]')) break;
            await new Promise(r => setTimeout(r, 200));
        }
        
        const page2 = document.querySelector('a[data-page="2"]');
        if (!page2) return { error: "No page 2 button after waiting" };
        
        // Scroll to the bottom of page 1 where pagination is
        page2.scrollIntoView();
        const yAtBottom = window.pageYOffset;
        const targetBefore = document.querySelector('.latest-books-online');
        const targetTopBefore = targetBefore.getBoundingClientRect().top + window.pageYOffset;
        
        // Click page 2
        page2.click();
        
        // Wait 1.5 seconds for all animations / transitions / scrolls
        await new Promise(r => setTimeout(r, 1500));
        
        const yAfter = window.pageYOffset;
        const targetAfter = document.querySelector('.latest-books-online');
        const targetTopAfter = targetAfter.getBoundingClientRect().top + window.pageYOffset;
        const targetBoundingTopAfter = targetAfter.getBoundingClientRect().top;
        
        const hero = document.getElementById('hero-section');
        const heroDisplay = hero ? window.getComputedStyle(hero).display : null;
        
        return {
            yAtBottom,
            targetTopBefore,
            yAfter,
            targetTopAfter,
            targetBoundingTopAfter,
            heroDisplay,
            urlAfter: window.location.href,
            activePage: document.querySelector('.pagination-button.active')?.textContent,
            visibleItemsCount: Array.from(document.querySelectorAll('.slider .item')).filter(el => !el.classList.contains('hidden')).length,
            visiblePositions: Array.from(document.querySelectorAll('.slider .item:not(.hidden)')).map(el => el.style.getPropertyValue('--position'))
        };
    })()
    '''
    
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': click_test_js, 'awaitPromise': True, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            print("CLICK TEST OUTPUT:")
            print(json.dumps(data.get('result', {}).get('result', {}).get('value'), indent=2))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
