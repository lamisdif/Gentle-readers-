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
    '--remote-debugging-port=9225',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9225/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    # Navigate
    ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/manager/index.html'}}))
    time.sleep(2)
    
    # Simulate owner session in localStorage and call setupAuthUI(true)
    auth_test_js = '''
    (async () => {
        // Set dummy session for lamisdif@gmail.com
        localStorage.setItem('gr_manager_auth_user', JSON.stringify({ email: 'lamisdif@gmail.com' }));
        auth.session = { user: { email: 'lamisdif@gmail.com' } };
        setupAuthUI(true);
        renderAppViews();
        return {
            mainLayoutDisplay: document.getElementById('app-main-layout')?.style?.display,
            loginOverlayDisplay: document.getElementById('login-overlay')?.style?.display,
            activeTab: document.querySelector('.nav-item.active')?.textContent?.trim(),
            cashBalance: document.getElementById('metric-cash-balance')?.textContent,
            financeStockRows: document.getElementById('finance-stock-summary-tbody')?.children?.length,
            combinedBooksRevenue: document.getElementById('finance-combined-books-revenue')?.textContent,
            combinedBooksCogs: document.getElementById('finance-combined-books-cogs')?.textContent,
            combinedBooksProfit: document.getElementById('finance-combined-books-profit')?.textContent,
            newStockProfit: document.getElementById('finance-new-profit')?.textContent,
            oldStockProfit: document.getElementById('finance-old-profit')?.textContent
        };
    })()
    '''
    ws.send(json.dumps({'id': 20, 'method': 'Runtime.evaluate', 'params': {'expression': auth_test_js, 'awaitPromise': True, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 20:
            result = data.get('result', {}).get('result', {}).get('value')
            print("AUTHENTICATED DOM EVALUATION RESULT:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
