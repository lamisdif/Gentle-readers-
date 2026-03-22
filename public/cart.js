// cart.js — fully rewritten post-CMS migration
// Books are fetched from cms-books.json and stored in window.cmsBooks map

let cmsBooks = {}; // id -> book object (loaded from cms-books.json)

// ── Cart storage helpers ──────────────────────────────────────────────────────
function getCart() {
  try {
    const raw = localStorage.getItem('cart');
    const parsed = raw ? JSON.parse(raw) : {};
    // Upgrade old array format to { id: qty } object
    if (Array.isArray(parsed)) {
      const obj = {};
      parsed.forEach(id => { obj[id] = (obj[id] || 0) + 1; });
      localStorage.setItem('cart', JSON.stringify(obj));
      return obj;
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// ── Cart actions ──────────────────────────────────────────────────────────────
function updateQty(bookId, delta) {
  const book = cmsBooks[bookId];
  if (delta > 0 && book && book.inStock === false) {
    alert('This book is currently out of stock / هذا الكتاب نفدت الكمية حالياً');
    return;
  }
  const cart = getCart();
  const next = (cart[bookId] || 0) + delta;
  if (next <= 0) {
    delete cart[bookId];
  } else {
    cart[bookId] = next;
  }
  saveCart(cart);
  renderCart();
}

function removeItem(bookId) {
  const cart = getCart();
  delete cart[bookId];
  saveCart(cart);
  renderCart();
}

function clearCart() {
  localStorage.removeItem('cart');
  renderCart();
}

function proceedToCheckout() {
  const cart = getCart();
  if (Object.keys(cart).length === 0) {
    alert('Your cart is empty! / سلة التسوق فارغة!');
    return;
  }
  window.location.href = 'checkout.html';
}

// ── Render ────────────────────────────────────────────────────────────────────
function parsePrice(priceRaw) {
  if (!priceRaw) return NaN;
  // Strip any non-numeric chars except dot, e.g. "3,000 DA" -> 3000
  return parseFloat(String(priceRaw).replace(/[^0-9.]/g, ''));
}

function renderCart() {
  const cart = getCart();
  const list = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!list) return;

  const ids = Object.keys(cart);

  if (ids.length === 0) {
    list.innerHTML = `
      <li style="text-align:center; padding:32px 0; color:#888; font-size:1.1rem;">
        🛒 Your cart is empty / السلة فارغة
      </li>`;
    if (totalEl) totalEl.textContent = '';
    return;
  }

  let grandTotal = 0;
  let allPricesKnown = true;
  list.innerHTML = '';

  ids.forEach(id => {
    const qty = cart[id];
    const book = cmsBooks[id] || {};
    const title  = book.title  || id;
    const author = book.author ? ` — ${book.author}` : '';
    const priceNum = parsePrice(book.price);
    const lineTotal = !isNaN(priceNum) ? priceNum * qty : NaN;
    if (isNaN(lineTotal)) allPricesKnown = false;
    else grandTotal += lineTotal;

    const priceDisplay = !isNaN(priceNum)
      ? `${(priceNum * qty).toLocaleString()} DZD`
      : 'Price unavailable';
    const unitPrice = !isNaN(priceNum)
      ? `${priceNum.toLocaleString()} DZD each`
      : '';
    const inStockBadge = book.inStock === false
      ? `<span style="color:#dc2626;font-size:12px;margin-left:8px;">Out of Stock</span>`
      : '';

    const li = document.createElement('li');
    li.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 0; border-bottom:1px solid #f0e8d0;';
    li.innerHTML = `
      <div style="flex:1; min-width:0;">
        <div style="font-weight:700; color:#5e2217; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${title}${inStockBadge}
        </div>
        <div style="color:#888; font-size:0.85rem;">${author.replace(' — ', '')}</div>
        <div style="color:#c4a484; font-size:0.85rem; margin-top:2px;">${unitPrice}</div>
      </div>
      <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
        <button onclick="updateQty('${id}', -1)"
          style="background:#f0e8d0; border:none; border-radius:6px; width:28px; height:28px; font-size:1.1rem; cursor:pointer; color:#5e2217;">−</button>
        <span style="min-width:20px; text-align:center; font-weight:600;">${qty}</span>
        <button onclick="updateQty('${id}', 1)"
          style="background:#f0e8d0; border:none; border-radius:6px; width:28px; height:28px; font-size:1.1rem; cursor:pointer; color:#5e2217;">+</button>
      </div>
      <div style="min-width:90px; text-align:right; font-weight:700; color:#5e2217;">${priceDisplay}</div>
      <button onclick="removeItem('${id}')"
        style="background:none; border:none; color:#dc2626; font-size:1.2rem; cursor:pointer; flex-shrink:0;" title="Remove">✕</button>
    `;
    list.appendChild(li);
  });

  if (totalEl) {
    if (allPricesKnown) {
      totalEl.innerHTML = `Total: <strong>${grandTotal.toLocaleString()} DZD</strong>`;
    } else {
      totalEl.innerHTML = `Total: <strong>—</strong> <span style="font-size:0.85rem; color:#888;">(some prices unavailable)</span>`;
    }
  }

  // Update any cart counter badges visible on this page
  updateCartCounter();
}

function updateCartCounter() {
  const cart = getCart();
  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0);
  document.querySelectorAll('.btn-cart').forEach(btn => {
    btn.setAttribute('data-quantity', totalQty);
  });
}

// ── Boot: fetch CMS books then render ─────────────────────────────────────────
window.addEventListener('load', function () {
  fetch('cms-books.json')
    .then(res => res.ok ? res.json() : [])
    .then(books => {
      if (Array.isArray(books)) {
        books.forEach(b => {
          const id = 'cms_' + (b.slug || b.title || '');
          cmsBooks[id] = {
            title:   b.title   || '',
            author:  b.author  || '',
            price:   b.price   || '',
            inStock: (b.status || 'available').toLowerCase() !== 'out of stock'
          };
        });
      }
    })
    .catch(() => {})
    .finally(() => renderCart());
});