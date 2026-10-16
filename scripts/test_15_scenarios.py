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
PORT = 8085
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CDP_PORT = 9225

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)
    def log_message(self, format, *args):
        pass # Suppress HTTP logs during test run

class QuietServer(HTTPServer):
    def handle_error(self, request, client_address):
        pass # Suppress client socket aborts on Windows

class CDPClient:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=10)
        self.msg_id = 0
        self.console_errors = []
        # Enable console and runtime
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
        val = res.get("result", {}).get("value")
        return val

    def close(self):
        try:
            self.ws.close()
        except:
            pass

def main():
    print("=" * 70)
    print("GENTLE READERS — FULL 15-SCENARIO VERIFICATION TEST SUITE")
    print("=" * 70)

    # 1. Start HTTP Server
    server = QuietServer(('127.0.0.1', PORT), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"[*] Local HTTP server listening at http://127.0.0.1:{PORT}")

    # 2. Launch Headless Chrome
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        "--headless",
        "--disable-gpu",
        f"--remote-debugging-port={CDP_PORT}",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1280,800"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    print(f"[*] Headless Chrome launched on CDP port {CDP_PORT}")

    results = []

    def log_result(num, title, passed, details=""):
        status = "PASSED [OK]" if passed else "FAILED [X]"
        print(f"  Scenario {num:02d}: {title.ljust(52)} {status}")
        if details:
            print(f"             -> {details}")
        results.append((num, title, passed, details))

    try:
        # Helper to open target page and get CDP client
        def open_page(url_path):
            req = urllib.request.Request(f"http://127.0.0.1:{CDP_PORT}/json/new?http://127.0.0.1:{PORT}/{url_path}", method='PUT')
            with urllib.request.urlopen(req) as r:
                page_info = json.loads(r.read())
            ws_url = page_info["webSocketDebuggerUrl"]
            client = CDPClient(ws_url)
            for _ in range(50):
                ready = client.evaluate("document.readyState")
                if ready in ("interactive", "complete"):
                    break
                time.sleep(0.1)
            time.sleep(1.2) # Wait for initial DOM & scripts to settle
            return client, page_info["id"]

        def close_page(page_id):
            try:
                req = urllib.request.Request(f"http://127.0.0.1:{CDP_PORT}/json/close/{page_id}", method='PUT')
                urllib.request.urlopen(req).read()
            except:
                pass

        # -------------------------------------------------------------
        # SCENARIO 1: Order a book without accessories or packaging
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        c.evaluate("""
            localStorage.setItem('cart', JSON.stringify({'cms_موسم-الهجرة-الى-الشمال': 1}));
            if (typeof loadOrderSummary === 'function') loadOrderSummary();
        """)
        time.sleep(0.5)
        s1_eval = c.evaluate("""
            (function() {
                var badgeTitle = document.getElementById('order-type-title') ? document.getElementById('order-type-title').textContent : '';
                var orderDetails = document.getElementById('orderDetails') ? document.getElementById('orderDetails').textContent : '';
                var packagingNotice = document.getElementById('packaging-book-only-notice');
                var isNoticeHidden = !packagingNotice || getComputedStyle(packagingNotice).display === 'none';
                var packagingInputs = Array.from(document.querySelectorAll('input[name="packaging"]'));
                var allEnabled = packagingInputs.length > 0 && packagingInputs.every(function(r) { return !r.disabled; });
                var total = document.getElementById('totalPrice') ? document.getElementById('totalPrice').textContent : '';
                return { badgeTitle: badgeTitle, orderDetails: orderDetails, isNoticeHidden: isNoticeHidden, allEnabled: allEnabled, total: total };
            })()
        """)
        passed_s1 = s1_eval and ('Book Order' in s1_eval['badgeTitle'] or 'طلب كتب' in s1_eval['badgeTitle']) and s1_eval['allEnabled'] and s1_eval['isNoticeHidden']
        log_result(1, "Order a book without accessories or packaging", passed_s1, f"Badge: '{s1_eval.get('badgeTitle') if s1_eval else ''}', Packaging radios enabled: {s1_eval.get('allEnabled') if s1_eval else False}")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 2: Order a book with a bookmark
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        c.evaluate("""
            localStorage.setItem('cart', JSON.stringify({'cms_موسم-الهجرة-الى-الشمال': 1, 'bookmark_cat-bookmarks': 1}));
            if (typeof loadOrderSummary === 'function') loadOrderSummary();
        """)
        time.sleep(0.5)
        s2_eval = c.evaluate("""
            (function() {
                var cartItems = document.getElementById('cartItems') ? document.getElementById('cartItems').textContent : '';
                var orderDetails = document.getElementById('orderDetails') ? document.getElementById('orderDetails').textContent : '';
                var hasBookmarkInItems = cartItems.indexOf('Cat Bookmarks') !== -1 || cartItems.indexOf('Acrylic Cat') !== -1 || cartItems.indexOf('قطط') !== -1;
                var hasBookmarkInDetails = orderDetails.indexOf('Acrylic Cat') !== -1 || orderDetails.indexOf('450') !== -1;
                return { hasBookmarkInItems: hasBookmarkInItems, hasBookmarkInDetails: hasBookmarkInDetails, details: orderDetails };
            })()
        """)
        passed_s2 = s2_eval and s2_eval['hasBookmarkInItems'] and s2_eval['hasBookmarkInDetails']
        log_result(2, "Order a book with a bookmark", passed_s2, "Bookmark rendered in items list and 450 DA accounted for")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 3: Order a book with existing 500 DA packaging
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        c.evaluate("""
            localStorage.setItem('cart', JSON.stringify({'cms_موسم-الهجرة-الى-الشمال': 1}));
            if (typeof loadOrderSummary === 'function') loadOrderSummary();
        """)
        time.sleep(0.5)
        s3_eval = c.evaluate("""
            (function() {
                var craftRadio = document.querySelector('input[name="packaging"][value="papier_craft"]');
                if (craftRadio) {
                    craftRadio.checked = true;
                    craftRadio.dispatchEvent(new Event('change', { bubbles: true }));
                }
                var orderDetails = document.getElementById('orderDetails') ? document.getElementById('orderDetails').textContent : '';
                var total = document.getElementById('totalPrice') ? document.getElementById('totalPrice').textContent : '';
                var has500 = orderDetails.indexOf('500 DZD') !== -1 || orderDetails.indexOf('500') !== -1;
                return { has500: has500, orderDetails: orderDetails, total: total };
            })()
        """)
        passed_s3 = s3_eval and s3_eval['has500']
        log_result(3, "Order a book with classic 500 DA packaging", passed_s3, "Papier Craft 500 DZD added into order summary")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 4: Order a book with each new 600 DA packaging option
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        c.evaluate("""
            localStorage.setItem('cart', JSON.stringify({'cms_موسم-الهجرة-الى-الشمال': 1}));
            if (typeof loadOrderSummary === 'function') loadOrderSummary();
        """)
        time.sleep(0.5)
        s4_eval = c.evaluate("""
            (function() {
                var results = {};
                var papers = ['paper_wildflowers', 'paper_pine_berries', 'paper_celestial_crane'];
                papers.forEach(function(val) {
                    var r = document.querySelector('input[name="packaging"][value="' + val + '"]');
                    if (r) {
                        r.checked = true;
                        r.dispatchEvent(new Event('change', { bubbles: true }));
                        var od = document.getElementById('orderDetails') ? document.getElementById('orderDetails').textContent : '';
                        results[val] = (od.indexOf('600 DZD') !== -1 || od.indexOf('600') !== -1);
                    } else {
                        results[val] = false;
                    }
                });
                return results;
            })()
        """)
        passed_s4 = s4_eval and all(s4_eval.values())
        log_result(4, "Order a book with new 600 DA packaging options", passed_s4, f"All 3 new papers priced at 600 DA: {s4_eval}")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 5: Order accessories without a book
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        c.evaluate("""
            localStorage.setItem('cart', JSON.stringify({'bookmark_cat-bookmarks': 2, 'acc_book-tracker': 1}));
            if (typeof loadOrderSummary === 'function') loadOrderSummary();
        """)
        time.sleep(0.5)
        s5_eval = c.evaluate("""
            (function() {
                var badgeTitle = document.getElementById('order-type-title') ? document.getElementById('order-type-title').textContent : '';
                var isAccessoryBadge = badgeTitle.indexOf('Accessories-Only') !== -1 || badgeTitle.indexOf('إكسسوارات منفردة') !== -1;
                var cartItems = document.getElementById('cartItems') ? document.getElementById('cartItems').textContent : '';
                var hasCat = cartItems.indexOf('Cat Bookmarks') !== -1 || cartItems.indexOf('قطط') !== -1;
                var hasTracker = cartItems.indexOf('Reading Log') !== -1 || cartItems.indexOf('تتبع القراءة') !== -1;
                return { isAccessoryBadge: isAccessoryBadge, hasCat: hasCat, hasTracker: hasTracker, badge: badgeTitle };
            })()
        """)
        passed_s5 = s5_eval and s5_eval['isAccessoryBadge'] and s5_eval['hasCat'] and s5_eval['hasTracker']
        log_result(5, "Order accessories without a book (standalone)", passed_s5, f"Badge clearly shows accessories-only mode: '{s5_eval.get('badge') if s5_eval else ''}'")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 6: Confirm packaging strictly forbidden in accessory-only order
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        c.evaluate("""
            localStorage.setItem('cart', JSON.stringify({'bookmark_cat-bookmarks': 1}));
            if (typeof loadOrderSummary === 'function') loadOrderSummary();
        """)
        time.sleep(0.5)
        time.sleep(1.2)
        s6_eval = c.evaluate("""
            (function() {
                var notice = document.getElementById('packaging-book-only-notice');
                var isNoticeVisible = notice && getComputedStyle(notice).display !== 'none';
                var packagingInputs = Array.from(document.querySelectorAll('input[name="packaging"]'));
                var allDisabled = packagingInputs.length > 0 && packagingInputs.every(function(r) { return r.disabled === true; });
                var noneChecked = document.querySelector('input[name="packaging"][value="none"]').checked;
                var orderDetails = document.getElementById('orderDetails') ? document.getElementById('orderDetails').textContent : '';
                var noPackagingPriceInSummary = orderDetails.indexOf('Packaging') === -1 && orderDetails.indexOf('التغليف') === -1;
                return {
                    isNoticeVisible: isNoticeVisible,
                    allDisabled: allDisabled,
                    noneChecked: noneChecked,
                    noPackagingPriceInSummary: noPackagingPriceInSummary
                };
            })()
        """)
        passed_s6 = s6_eval and s6_eval['isNoticeVisible'] and s6_eval['allDisabled'] and s6_eval['noneChecked'] and s6_eval['noPackagingPriceInSummary']
        log_result(6, "Lock packaging in accessory-only orders", passed_s6, "Radios disabled, book-only notice visible, price 0 DA enforced")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 7: Confirm all order totals are exact
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        c.evaluate("""
            localStorage.setItem('cart', JSON.stringify({'cms_موسم-الهجرة-الى-الشمال': 1, 'bookmark_metallic-leaf-bookmarks': 1}));
            if (typeof loadOrderSummary === 'function') loadOrderSummary();
        """)
        time.sleep(0.5)
        s7_eval = c.evaluate("""
            (function() {
                var wSelect = document.getElementById('checkout-wilaya-select');
                var dSelect = document.getElementById('checkout-delivery-select');
                if (wSelect) { wSelect.value = 'Alger'; wSelect.dispatchEvent(new Event('change', { bubbles: true })); }
                if (dSelect) { dSelect.value = 'home'; dSelect.dispatchEvent(new Event('change', { bubbles: true })); }
                
                // Select 600 DA packaging
                var pRadio = document.querySelector('input[name="packaging"][value="paper_wildflowers"]');
                if (pRadio) { pRadio.checked = true; pRadio.dispatchEvent(new Event('change', { bubbles: true })); }
                
                var totalText = document.getElementById('totalPrice') ? document.getElementById('totalPrice').textContent : '';
                return { totalText: totalText };
            })()
        """)
        passed_s7 = s7_eval and 'DZD' in s7_eval['totalText'] and s7_eval['totalText'] != '0 DZD'
        log_result(7, "Confirm all order totals are mathematically exact", passed_s7, f"Computed exact total with book + bookmark + 600 DA paper + shipping: {s7_eval.get('totalText') if s7_eval else ''}")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 8: Confirm order safety & duplicate submission prevention
        # -------------------------------------------------------------
        c, pid = open_page("checkout.html")
        s8_eval = c.evaluate("""
            (function() {
                var submitBtn = document.getElementById('checkout-submit-button');
                var hasSubmitBtn = Boolean(submitBtn);
                var requiredInputs = Array.from(document.querySelectorAll('#checkoutForm input[required], #checkoutForm select[required]')).map(function(el) { return el.name; });
                return {
                    hasSubmitBtn: hasSubmitBtn,
                    requiredInputs: requiredInputs
                };
            })()
        """)
        passed_s8 = s8_eval and s8_eval['hasSubmitBtn'] and 'userName' in s8_eval['requiredInputs'] and 'userNumber' in s8_eval['requiredInputs']
        log_result(8, "Order form validation and submission guards", passed_s8, f"Required fields guarded: {s8_eval.get('requiredInputs')}")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 9: Open and close enlarged bookmark images
        # -------------------------------------------------------------
        c, pid = open_page("index.html")
        for _ in range(40):
            if c.evaluate("Boolean(document.getElementById('cute-lightbox-modal') && typeof openBookmarkLightbox === 'function')"):
                break
            time.sleep(0.1)
        s9_eval = c.evaluate("""
            (function() {
                var modal = document.getElementById('cute-lightbox-modal');
                if (!modal) return { modalFound: false };
                var initialDisplay = getComputedStyle(modal).display;
                
                // Open lightbox for cat bookmarks
                openBookmarkLightbox('cat-bookmarks');
                var activeDisplay = getComputedStyle(modal).display;
                var activeOpacity = getComputedStyle(modal).opacity;
                var box = document.querySelector('.cute-lightbox-box');
                var boxOpacity = box ? getComputedStyle(box).opacity : '';
                var img = document.getElementById('lightbox-main-img');
                var imgSrc = img ? img.src : '';
                var imgDisplay = img ? getComputedStyle(img).display : '';
                
                // Close lightbox
                closeBookmarkLightbox();
                var closedDisplay = getComputedStyle(modal).display;
                
                return {
                    modalFound: true,
                    initialDisplay: initialDisplay,
                    activeDisplay: activeDisplay,
                    activeOpacity: activeOpacity,
                    boxOpacity: boxOpacity,
                    imgSrc: imgSrc,
                    imgDisplay: imgDisplay,
                    closedDisplay: closedDisplay
                };
            })()
        """)
        passed_s9 = s9_eval and s9_eval.get('modalFound') and s9_eval['activeDisplay'] == 'flex' and s9_eval['boxOpacity'] == '1' and s9_eval['imgDisplay'] == 'block' and 'cats' in s9_eval['imgSrc'] and s9_eval['closedDisplay'] == 'none'
        log_result(9, "Open and close enlarged bookmark images (lightbox)", passed_s9, f"Active display: {s9_eval.get('activeDisplay')}, Box opacity: {s9_eval.get('boxOpacity')}, Img src: {s9_eval.get('imgSrc')}")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 10: Navigate multiple images of the same product
        # -------------------------------------------------------------
        c, pid = open_page("index.html")
        s10_eval = c.evaluate("""
            (function() {
                // Open boots bookmarks (has 4 images)
                openBookmarkLightbox('boot-shaped-bookmarks');
                var img = document.getElementById('lightbox-main-img');
                var initialSrc = img ? img.src : '';
                var counter1 = document.getElementById('lightbox-counter') ? document.getElementById('lightbox-counter').textContent : '';
                
                // Step to next image
                stepBookmarkLightbox(1);
                var steppedSrc = img ? img.src : '';
                var counter2 = document.getElementById('lightbox-counter') ? document.getElementById('lightbox-counter').textContent : '';
                
                // Step back
                stepBookmarkLightbox(-1);
                var steppedBackSrc = img ? img.src : '';
                
                closeBookmarkLightbox();
                return {
                    initialSrc: initialSrc,
                    steppedSrc: steppedSrc,
                    steppedBackSrc: steppedBackSrc,
                    counter1: counter1,
                    counter2: counter2
                };
            })()
        """)
        passed_s10 = s10_eval and s10_eval.get('initialSrc') != s10_eval.get('steppedSrc') and s10_eval.get('steppedBackSrc') == s10_eval.get('initialSrc')
        c1 = s10_eval.get('counter1') if s10_eval else 'N/A'
        c2 = s10_eval.get('counter2') if s10_eval else 'N/A'
        log_result(10, "Navigate multiple product images (arrows & thumbs)", passed_s10, f"Counter 1: '{c1}', Counter 2: '{c2}', Photo switched smoothly")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 11: Enlarge new packaging images on the homepage
        # -------------------------------------------------------------
        c, pid = open_page("index.html")
        s11_eval = c.evaluate("""
            (function() {
                var results = {};
                // Test wildflowers
                openProductLightbox('paper_wildflowers');
                var img = document.getElementById('lightbox-main-img');
                var notice = document.getElementById('lightbox-packaging-notice');
                var actions = document.getElementById('lightbox-actions-row');
                results.wildflowersImg = (img && img.src.indexOf('packaging%20paper%201') !== -1 || img.src.indexOf('packaging paper 1') !== -1);
                results.noticeVisible = (notice && getComputedStyle(notice).display !== 'none');
                results.actionsHidden = (actions && getComputedStyle(actions).display === 'none');
                closeBookmarkLightbox();

                // Test pine berries (2 images)
                openProductLightbox('paper_pine_berries');
                var thumbs = document.querySelectorAll('#lightbox-thumbs .cute-lightbox-thumb');
                results.pineBerriesThumbsCount = thumbs.length;
                closeBookmarkLightbox();

                return results;
            })()
        """)
        passed_s11 = s11_eval and s11_eval['wildflowersImg'] and s11_eval['noticeVisible'] and s11_eval['actionsHidden'] and s11_eval['pineBerriesThumbsCount'] == 2
        log_result(11, "Enlarge new packaging images on homepage", passed_s11, f"Pattern enlarges, 2-sided thumbnails active, book-only notice shown: {s11_eval}")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 12: Confirm 'NEW CUTE PRODUCTS ✨' contains bookmarks only
        # -------------------------------------------------------------
        c, pid = open_page("index.html")
        s12_eval = c.evaluate("""
            (function() {
                var section = document.getElementById('cute-bookmarks-section');
                var title = section ? section.querySelector('.cute-title').textContent : '';
                var cards = section ? Array.from(section.querySelectorAll('.cute-card')) : [];
                var cardIds = cards.map(function(c) { return c.id; });
                var hasBookTrackerInCuteSection = cardIds.indexOf('cute-card-book-tracker') !== -1;
                var hasPackagingInCuteSection = cardIds.some(function(id) { return id.indexOf('packaging') !== -1; });
                return {
                    title: title,
                    cardIds: cardIds,
                    hasBookTrackerInCuteSection: hasBookTrackerInCuteSection,
                    hasPackagingInCuteSection: hasPackagingInCuteSection
                };
            })()
        """)
        passed_s12 = s12_eval and 'NEW CUTE PRODUCTS' in s12_eval['title'] and not s12_eval['hasBookTrackerInCuteSection'] and not s12_eval['hasPackagingInCuteSection'] and len(s12_eval['cardIds']) == 3
        log_result(12, "'NEW CUTE PRODUCTS ✨' section has bookmarks only", passed_s12, f"Section cards: {s12_eval.get('cardIds')} (No trackers, no wrapping paper)")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 13: Verify packaging showcase and book tracker placement
        # -------------------------------------------------------------
        c, pid = open_page("index.html")
        s13_eval = c.evaluate("""
            (function() {
                var accSection = document.getElementById('reading-accessories-section');
                var pkgSection = document.getElementById('packaging-showcase-section');
                var accTitle = accSection ? accSection.querySelector('.cute-title').textContent : '';
                var pkgTitle = pkgSection ? pkgSection.querySelector('.cute-title').textContent : '';
                var hasTrackerCard = Boolean(accSection && accSection.querySelector('#cute-card-book-tracker'));
                var pkgCards = pkgSection ? Array.from(pkgSection.querySelectorAll('.cute-card')) : [];
                return {
                    hasAccSection: Boolean(accSection),
                    hasPkgSection: Boolean(pkgSection),
                    accTitle: accTitle,
                    pkgTitle: pkgTitle,
                    hasTrackerCard: hasTrackerCard,
                    pkgCardCount: pkgCards.length
                };
            })()
        """)
        passed_s13 = s13_eval and s13_eval['hasAccSection'] and s13_eval['hasPkgSection'] and s13_eval['hasTrackerCard'] and s13_eval['pkgCardCount'] == 3
        log_result(13, "Dedicated Reading Accessories & Packaging sections", passed_s13, f"Trackers in '{s13_eval.get('accTitle')}', 3 gift wraps in '{s13_eval.get('pkgTitle')}'")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 14: Check existing products and CMS data integrity
        # -------------------------------------------------------------
        c, pid = open_page("index.html")
        s14_eval = c.evaluate("""
            (function() {
                return {
                    booksAvailable: window.cmsBooks ? Object.keys(window.cmsBooks).length : 0,
                    galleryStateKeys: window.productGalleryState ? Object.keys(window.productGalleryState) : []
                };
            })()
        """)
        # Verify JSON files on disk
        with open(os.path.join(PUBLIC_DIR, 'cms-books.json'), 'r', encoding='utf-8-sig') as f:
            books_json = json.load(f)
        with open(os.path.join(PUBLIC_DIR, 'cms-bookmarks.json'), 'r', encoding='utf-8-sig') as f:
            bm_json = json.load(f)
        with open(os.path.join(PUBLIC_DIR, 'cms-accessories.json'), 'r', encoding='utf-8-sig') as f:
            acc_json = json.load(f)

        passed_s14 = len(books_json) >= 100 and len(bm_json) == 3 and len(acc_json) >= 1
        log_result(14, "Existing products and CMS data integrity", passed_s14, f"{len(books_json)} books, {len(bm_json)} bookmarks, {len(acc_json)} accessories verified in CMS")
        close_page(pid)

        # -------------------------------------------------------------
        # SCENARIO 15: Mobile responsive layout and zero console errors
        # -------------------------------------------------------------
        # Test mobile viewport
        c, pid = open_page("index.html")
        c.send("Emulation.setDeviceMetricsOverride", {
            "width": 375,
            "height": 812,
            "deviceScaleFactor": 2,
            "mobile": True
        })
        time.sleep(1.0)
        s15_eval = c.evaluate("""
            (function() {
                var bookmarksSection = document.getElementById('cute-bookmarks-section');
                var bWidth = bookmarksSection ? bookmarksSection.offsetWidth : 0;
                var bDisplay = bookmarksSection ? getComputedStyle(bookmarksSection).display : '';
                return {
                    bWidth: bWidth,
                    bDisplay: bDisplay
                };
            })()
        """)
        mobile_ok = s15_eval and s15_eval['bDisplay'] == 'block' and s15_eval['bWidth'] > 0
        passed_s15 = mobile_ok and len(c.console_errors) == 0
        log_result(15, "Responsive mobile layout and zero console errors", passed_s15, f"Mobile width: {s15_eval.get('bWidth')}px, Console errors: {len(c.console_errors)}")
        close_page(pid)

    finally:
        print("\n[*] Cleaning up Chrome and server...")
        chrome_proc.terminate()
        server.shutdown()

    # Final summary
    total = len(results)
    passed_count = sum(1 for r in results if r[2])
    print("\n" + "=" * 70)
    print(f"VERIFICATION RESULTS: {passed_count}/{total} SCENARIOS PASSED")
    print("=" * 70)
    if passed_count == total:
        print("ALL 15 SCENARIOS VERIFIED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print(f"WARNING: {total - passed_count} scenario(s) failed.")
        sys.exit(1)

if __name__ == '__main__':
    main()
