import os
import sys
import time
import json
import threading
import subprocess
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
import websocket

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')
PORT = 8089
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CDP_PORT = 9229

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

class QuietServer(HTTPServer):
    def handle_error(self, request, client_address):
        pass

class CDPClient:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=10)
        self.msg_id = 0
        self.console_errors = []
        self.send("Console.enable")
        self.send("Runtime.enable")

    def send(self, method, params=None):
        self.msg_id += 1
        payload = {"id": self.msg_id, "method": method}
        if params:
            payload["params"] = params
        self.ws.send(json.dumps(payload))
        while True:
            resp_raw = self.ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("method") == "Console.messageAdded":
                msg = resp.get("params", {}).get("message", {})
                if msg.get("level") == "error":
                    self.console_errors.append(msg.get("text", ""))
            if resp.get("id") == self.msg_id:
                return resp.get("result", {})

    def evaluate(self, expr):
        res = self.send("Runtime.evaluate", {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": True
        })
        return res.get("result", {}).get("value")

    def set_viewport(self, width, height):
        self.send("Emulation.setDeviceMetricsOverride", {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": width <= 640
        })
        time.sleep(0.3)

    def navigate(self, url):
        self.send("Page.navigate", {"url": url})
        time.sleep(1.8)

    def close(self):
        try:
            self.ws.close()
        except:
            pass

def run_tests():
    # 1. Start HTTP server
    server = QuietServer(('127.0.0.1', PORT), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"HTTP Server started at http://127.0.0.1:{PORT}")

    # 2. Launch Chrome with remote debugging
    chrome_cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={os.path.join(ROOT_DIR, '.tmp_chrome_checkout_suite')}",
        f"http://127.0.0.1:{PORT}/checkout.html"
    ]
    proc = subprocess.Popen(chrome_cmd)
    time.sleep(2)

    # 3. Connect CDP
    try:
        targets_url = f"http://127.0.0.1:{CDP_PORT}/json"
        req = urllib.request.urlopen(targets_url)
        targets = json.loads(req.read().decode('utf-8'))
        page_target = next(t for t in targets if t.get('type') == 'page')
        ws_url = page_target['webSocketDebuggerUrl']
        cdp = CDPClient(ws_url)
    except Exception as e:
        print("Failed to connect to Chrome CDP:", e)
        proc.kill()
        sys.exit(1)

    all_passed = True
    test_results = []

    def check(name, condition, extra=""):
        nonlocal all_passed
        status = "PASS" if condition else "FAIL"
        if not condition:
            all_passed = False
        res = f"[{status}] {name} {extra}".strip()
        print(res)
        test_results.append(res)

    print("\n=======================================================")
    print("=== MULTI-VIEWPORT RESPONSIVENESS & OVERFLOW TESTS ===")
    print("=======================================================")

    viewports = [
        (320, 568, "320px - Narrow phone (iPhone SE 1st gen / Fold)"),
        (360, 800, "360px - Standard Android phone"),
        (375, 667, "375px - iPhone SE 2/3 / iPhone 12 mini"),
        (390, 844, "390px - iPhone 12/13/14 Pro"),
        (430, 932, "430px - iPhone 14/15/16 Pro Max"),
        (1280, 800, "1280px - Desktop")
    ]

    for width, height, label in viewports:
        print(f"\n--- Testing Viewport: {label} ---")
        cdp.set_viewport(width, height)
        time.sleep(0.3)

        overflow_info = cdp.evaluate("""
            (() => {
                const docWidth = document.documentElement.offsetWidth;
                const scrollWidth = document.documentElement.scrollWidth;
                const winWidth = window.innerWidth;
                const card = document.querySelector('.card.cart');
                const cardWidth = card ? card.offsetWidth : 0;
                const nameInput = document.getElementById('checkout-name-input');
                const nameInputWidth = nameInput ? nameInput.offsetWidth : 0;
                const submitBtn = document.getElementById('checkout-submit-button');
                const submitBtnWidth = submitBtn ? submitBtn.offsetWidth : 0;

                return {
                    docWidth,
                    scrollWidth,
                    winWidth,
                    cardWidth,
                    nameInputWidth,
                    submitBtnWidth,
                    hasHorizontalOverflow: scrollWidth > winWidth
                };
            })()
        """)

        check(f"{width}px: Zero horizontal overflow",
              not overflow_info['hasHorizontalOverflow'],
              f"(scrollWidth={overflow_info['scrollWidth']}, innerWidth={overflow_info['winWidth']})")

        check(f"{width}px: Card fits comfortably",
              overflow_info['cardWidth'] <= overflow_info['winWidth'],
              f"(cardWidth={overflow_info['cardWidth']}px)")

        # Verify inputs are full-width on mobile and properly sized on desktop
        min_expected_input_width = 120 if width == 320 else (200 if width <= 500 else 180)
        check(f"{width}px: Name input adequately sized",
              overflow_info['nameInputWidth'] >= min_expected_input_width,
              f"(inputWidth={overflow_info['nameInputWidth']}px)")

        # Verify submit button is adequately wide (card width on desktop, screen width on mobile)
        expected_btn_width = min(width - 60, 500)
        check(f"{width}px: Submit button full/prominent width",
              overflow_info['submitBtnWidth'] >= expected_btn_width,
              f"(btnWidth={overflow_info['submitBtnWidth']}px)")

    print("\n=======================================================")
    print("=== FUNCTIONAL CHECKOUT & VALIDATION TESTS ===")
    print("=======================================================")

    # Test 1: Empty cart state
    print("\n--- Test: Empty Cart ---")
    cdp.evaluate("localStorage.setItem('cart', JSON.stringify({}));")
    cdp.navigate(f"http://127.0.0.1:{PORT}/checkout.html")

    is_empty_detected = cdp.evaluate("""
        (() => {
            const submitBtn = document.getElementById('checkout-submit-button');
            const cartItems = document.getElementById('cartItems');
            return {
                disabled: submitBtn.disabled,
                emptyTextShown: cartItems.textContent.includes('empty') || cartItems.textContent.includes('فارغة')
            };
        })()
    """)
    check("Empty cart: Submit button disabled", is_empty_detected['disabled'])
    check("Empty cart: Empty cart message displayed", is_empty_detected['emptyTextShown'])

    # Test 2: Book order + Optional Instagram blank -> Form enables!
    print("\n--- Test: Book Order with Optional Instagram Left Blank ---")
    cdp.evaluate("localStorage.setItem('cart', JSON.stringify({'cms_موسم-الهجرة-الى-الشمال': 1}));")
    cdp.navigate(f"http://127.0.0.1:{PORT}/checkout.html")

    form_fill_result = cdp.evaluate("""
        (() => {
            document.getElementById('checkout-name-input').value = 'Amina';
            document.getElementById('checkout-family-input').value = 'Benali';
            document.getElementById('checkout-number-input').value = '0555123456';
            document.getElementById('checkout-instagram-input').value = ''; // BLANK INSTAGRAM!

            const delivery = document.getElementById('checkout-delivery-select');
            delivery.value = 'home';
            delivery.dispatchEvent(new Event('change'));

            const wilaya = document.getElementById('checkout-wilaya-select');
            wilaya.value = 'Alger';
            wilaya.dispatchEvent(new Event('change'));

            const daira = document.getElementById('checkout-daira-select');
            daira.value = daira.options[1].value;
            daira.dispatchEvent(new Event('change'));

            const address = document.getElementById('checkout-address-input');
            address.value = '14 Rue Didouche Mourad';
            address.dispatchEvent(new Event('input'));

            // Run validation
            if (typeof validateForm === 'function') validateForm();

            const submitBtn = document.getElementById('checkout-submit-button');
            const validationMsg = document.getElementById('validation-message');
            const totalPrice = document.getElementById('totalPrice').textContent;
            const badge = document.getElementById('checkout-order-type-badge');

            return {
                badgeText: badge ? badge.textContent : '',
                submitDisabled: submitBtn.disabled,
                validationMsgVisible: validationMsg.style.display !== 'none' && validationMsg.style.display !== '',
                totalPrice: totalPrice
            };
        })()
    """)

    check("Book order: Badge shows book order mode", 'Book Order' in form_fill_result['badgeText'] or 'طلب كتب' in form_fill_result['badgeText'])
    check("Book order: Submit button ENABLED with blank Instagram",
          not form_fill_result['submitDisabled'],
          f"(submitDisabled={form_fill_result['submitDisabled']})")
    check("Book order: Validation error message hidden when valid",
          not form_fill_result['validationMsgVisible'])
    check("Book order: Total price calculated properly",
          'DZD' in form_fill_result['totalPrice'] and form_fill_result['totalPrice'] != '0 DZD',
          f"({form_fill_result['totalPrice']})")

    # Test 3: Packaging selection (600 DA Wildflowers)
    print("\n--- Test: Select 600 DA Packaging on Book Order ---")
    packaging_result = cdp.evaluate("""
        (() => {
            const radio600 = document.querySelector('input[name="packaging"][value="paper_wildflowers"]');
            if (radio600) {
                radio600.checked = true;
                radio600.dispatchEvent(new Event('change'));
            }
            if (typeof loadOrderSummary === 'function') loadOrderSummary();

            const totalPrice = document.getElementById('totalPrice').textContent;
            const detailsText = document.getElementById('orderDetails').textContent;

            return {
                packagingChecked: radio600 ? radio600.checked : false,
                detailsIncludes600: detailsText.includes('600'),
                totalPrice: totalPrice
            };
        })()
    """)
    check("600 DA Packaging: Selected and applied to order details",
          packaging_result['packagingChecked'] and packaging_result['detailsIncludes600'],
          f"(total={packaging_result['totalPrice']})")

    # Test 4: Accessory-Only Order (No books)
    print("\n--- Test: Accessory-Only Order (No books in cart) ---")
    cdp.evaluate("localStorage.setItem('cart', JSON.stringify({'bookmark_cat-bookmarks': 2}));")
    cdp.navigate(f"http://127.0.0.1:{PORT}/checkout.html")

    acc_only_result = cdp.evaluate("""
        (() => {
            const badge = document.getElementById('checkout-order-type-badge');
            const badgeText = badge ? badge.textContent : '';
            const packagingNotice = document.getElementById('packaging-book-only-notice');
            const noticeVisible = packagingNotice ? packagingNotice.style.display !== 'none' : false;
            const packagingSection = document.getElementById('checkout-packaging-section');
            const isPackagingDisabled = packagingSection ? packagingSection.classList.contains('packaging-disabled') : false;

            // Fill details
            document.getElementById('checkout-name-input').value = 'Karim';
            document.getElementById('checkout-family-input').value = 'Zitouni';
            document.getElementById('checkout-number-input').value = '0661987654';
            document.getElementById('checkout-instagram-input').value = ''; // BLANK!

            const delivery = document.getElementById('checkout-delivery-select');
            delivery.value = 'home';
            delivery.dispatchEvent(new Event('change'));

            const wilaya = document.getElementById('checkout-wilaya-select');
            wilaya.value = 'Oran';
            wilaya.dispatchEvent(new Event('change'));

            const daira = document.getElementById('checkout-daira-select');
            daira.value = daira.options[1].value;
            daira.dispatchEvent(new Event('change'));

            const address = document.getElementById('checkout-address-input');
            address.value = 'Hai Es-Salem, Oran';
            address.dispatchEvent(new Event('input'));

            if (typeof validateForm === 'function') validateForm();

            const submitBtn = document.getElementById('checkout-submit-button');
            const totalPrice = document.getElementById('totalPrice').textContent;

            return {
                badgeHasAccessoryText: badgeText.includes('Accessories') || badgeText.includes('إكسسوارات'),
                noticeVisible,
                isPackagingDisabled,
                submitDisabled: submitBtn.disabled,
                totalPrice
            };
        })()
    """)
    check("Accessory-only: Badge shows accessory order mode", acc_only_result['badgeHasAccessoryText'])
    check("Accessory-only: Packaging notice is visible", acc_only_result['noticeVisible'])
    check("Accessory-only: Packaging section is disabled", acc_only_result['isPackagingDisabled'])
    check("Accessory-only: Submit button ENABLED for purchase", not acc_only_result['submitDisabled'])
    check("Accessory-only: Total calculated properly", '1,800 DZD' in acc_only_result['totalPrice'], f"({acc_only_result['totalPrice']})")

    # Clean up
    cdp.close()
    proc.kill()
    server.shutdown()

    print("\n=======================================================")
    print("=== SUMMARY OF ALL CHECKOUT TESTS ===")
    print("=======================================================")
    for res in test_results:
        print(res)

    if all_passed:
        print("\n>>> ALL TESTS PASSED! MOBILE CHECKOUT IS FULLY VERIFIED. <<<")
        return 0
    else:
        print("\n>>> SOME TESTS FAILED! PLEASE REVIEW OUTPUT ABOVE. <<<")
        return 1

if __name__ == '__main__':
    sys.exit(run_tests())
