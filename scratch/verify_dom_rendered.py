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
    '--remote-debugging-port=9224',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9224/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    # Navigate
    ws.send(json.dumps({'id': 3, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/manager/index.html'}}))
    time.sleep(3)
    
    # Evaluate JS to inspect DOM elements
    check_js = '''
    ({
        title: document.title,
        mainLayoutDisplay: document.getElementById('app-main-layout')?.style?.display,
        loginOverlayDisplay: document.getElementById('login-overlay')?.style?.display,
        cashBalance: document.getElementById('metric-cash-balance')?.textContent,
        financeStockRows: document.getElementById('finance-stock-summary-tbody')?.children?.length,
        inventoryCount: document.getElementById('inventory-total-count')?.textContent,
        newStockRevenue: document.getElementById('finance-new-retail-val')?.textContent,
        combinedBooksRevenue: document.getElementById('finance-combined-books-revenue')?.textContent,
        combinedBooksCogs: document.getElementById('finance-combined-books-cogs')?.textContent,
        combinedBooksProfit: document.getElementById('finance-combined-books-profit')?.textContent,
        bodyHtmlLength: document.body.innerHTML.length
    })
    '''
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': check_js, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            result = data.get('result', {}).get('result', {}).get('value')
            print("DOM EVALUATION RESULT:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
