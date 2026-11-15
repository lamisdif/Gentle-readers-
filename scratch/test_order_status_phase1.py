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
    '--remote-debugging-port=9246',
    '--window-size=1280,900',
    '--disable-gpu',
    f'--user-data-dir={temp_dir}',
    'about:blank'
]

proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    tabs_data = urllib.request.urlopen('http://127.0.0.1:9246/json', timeout=5).read()
    tabs = json.loads(tabs_data)
    ws_url = tabs[0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=5)
    
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
    ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))
    
    # Auto accept dialogs / confirms
    ws.send(json.dumps({'id': 3, 'method': 'Page.setInterceptFileChooserDialog', 'params': {'enabled': False}}))
    
    ws.send(json.dumps({'id': 4, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:8080/public/manager/index.html'}}))
    time.sleep(4)
    
    test_eval_js = '''
    (async () => {
        // Mock confirm and alert so dialogs do not block headless execution
        window.confirm = () => true;
        let lastAlert = null;
        window.alert = (msg) => { lastAlert = msg; };
        
        // Wait for manager state to initialize both orders and inventory
        for (let i = 0; i < 40; i++) {
            if (window.state && window.state.inventory && window.state.inventory.length > 0) break;
            await new Promise(r => setTimeout(r, 100));
        }
        
        const results = {
            parseTest: {},
            deliveredTest: {},
            cancelledTest: {},
            underflowTest: {}
        };
        
        // 1. Test parseOrderItem with various formats
        results.parseTest.strBook = parseOrderItem("قواعد العشق الاربعون  دار اداب × 2");
        results.parseTest.strAcc = parseOrderItem("Cute Bookmark [Accessory] × 3");
        results.parseTest.objBook = parseOrderItem({ title: "1984", quantity: 5 });
        results.parseTest.simpleStr = parseOrderItem("مدن الملح");
        
        // 2. Test findInventoryItem with sample inventory item
        state.inventory = [
            { id: "inv_123", title: "قواعد العشق الاربعون  دار اداب", quantity_sold: 5, quantity_reserved: 2 }
        ];
        const foundInv = findInventoryItem("قواعد العشق الاربعون  دار اداب");
        results.findInvTest = {
            found: !!foundInv,
            id: foundInv ? foundInv.id : null,
            title: foundInv ? foundInv.title : null
        };
        
        // 3. Create a synthetic test order to safely test lifecycle without touching existing 139 orders
        const testOrderId = 999999;
        const testOrder = {
            id: testOrderId,
            firstName: "Test",
            familyName: "Customer",
            phoneNumber: "0555000000",
            items: ["قواعد العشق الاربعون  دار اداب × 2", "Cute Bookmark [Accessory] × 1"],
            total_price: 3500,
            status: "pending",
            is_historical: false
        };
        state.orders.push(testOrder);
        
        // 4. Test delivery status update
        await updateOrderStatus(testOrderId, 'delivered');
        const metaAfterDelivered = state.orderMeta ? state.orderMeta.find(m => m.order_id === testOrderId) : null;
        results.deliveredTest = {
            fulfillment_status: metaAfterDelivered ? metaAfterDelivered.fulfillment_status : null,
            alertFired: lastAlert
        };
        
        // 5. Test cancel on a newly created unreserved order (should NOT trigger underflow alert)
        lastAlert = null;
        const testCancelId = 999998;
        const testCancelOrder = {
            id: testCancelId,
            firstName: "CancelTest",
            familyName: "Customer",
            phoneNumber: "0555000001",
            items: ["مدن الملح × 1"],
            total_price: 1800,
            status: "pending",
            is_historical: false
        };
        state.orders.push(testCancelOrder);
        await updateOrderStatus(testCancelId, 'cancelled');
        const metaAfterCancel = state.orderMeta ? state.orderMeta.find(m => m.order_id === testCancelId) : null;
        results.cancelledTest = {
            fulfillment_status: metaAfterCancel ? metaAfterCancel.fulfillment_status : null,
            alertFired: lastAlert
        };
        
        // Clean up test orders from memory
        state.orders = state.orders.filter(o => o.id !== testOrderId && o.id !== testCancelId);
        if (state.orderMeta) {
            state.orderMeta = state.orderMeta.filter(m => m.order_id !== testOrderId && m.order_id !== testCancelId);
        }
        
        return results;
    })()
    '''
    
    ws.send(json.dumps({'id': 10, 'method': 'Runtime.evaluate', 'params': {'expression': test_eval_js, 'awaitPromise': True, 'returnByValue': True}}))
    
    while True:
        msg = ws.recv()
        data = json.loads(msg)
        if data.get('id') == 10:
            print("ORDER STATUS & PARSING TEST RESULTS:")
            print(json.dumps(data.get('result', {}).get('result', {}).get('value'), indent=2, ensure_ascii=False))
            break
finally:
    subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
