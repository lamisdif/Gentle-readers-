import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

const supabaseUrl = "https://fsximdllrhglabxbqvay.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"; // حطي هنا المفتاح العام من Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

let books = {};

// Load CMS books into checkout
async function mergeCmsBooksIntoCheckout() {
  try {
    const response = await fetch('cms-books.json');
    if (!response.ok) throw new Error('Failed to load books');
    const data = await response.json();
    
    if (Array.isArray(data)) {
      data.forEach(b => {
        const id = 'cms_' + (b.slug || b.title || '');
        const hasDiscount = Boolean(b.has_discount || (b.discount_price && b.original_price && Number(b.discount_price) < Number(b.original_price)));
        const effectivePrice = hasDiscount ? (b.discount_price || b.price) : b.price;
        const originalPrice = hasDiscount ? (b.original_price || b.price) : b.price;
        const discountLabel = hasDiscount ? (b.discount_label || (b.discount_percentage ? '-' + b.discount_percentage + '%' : '')) : '';

        books[id] = {
          title:          b.title          || '',
          author:         b.author         || '',
          price:          effectivePrice   ? String(effectivePrice) : '',
          original_price: originalPrice,
          discount_price: effectivePrice,
          has_discount:   hasDiscount,
          discount_label: discountLabel,
          inStock:        (b.status || 'available').toLowerCase() !== 'out of stock'
        };
      });
    }
  } catch (err) {
    console.error('Error loading CMS books for checkout:', err);
  }
}

// Packaging pricing dictionary & labels
const PACKAGING_PRICES = {
  'none': 0,
  'papier_craft': 500,
  'surprise': 500,
  'paper_wildflowers': 600,
  'paper_pine_berries': 600,
  'paper_celestial_crane': 600
};

const PACKAGING_LABELS = {
  'none': 'No packaging / بدون تغليف',
  'papier_craft': 'Papier Craft / ورق كرافت',
  'surprise': 'Surprise / مفاجأة',
  'paper_wildflowers': 'Vintage Wildflowers / ورق زهور برية كلاسيكي',
  'paper_pine_berries': 'Festive Pine & Berries / ورق صنوبر وتوت شتوي',
  'paper_celestial_crane': 'Celestial Crane & Mountain / ورق الرافعات والجبال الذهبي'
};

let bookmarksData = [];
let accessoriesData = [];
const selectedAddons = {}; // addonId -> quantity

function isAccessoryId(id) {
  if (!id) return false;
  if (id.startsWith('bookmark_') || id.startsWith('acc_')) return true;
  if (bookmarksData.some(b => b.slug === id || b.id === id)) return true;
  if (accessoriesData.some(a => a.slug === id || a.id === id)) return true;
  return false;
}

function normalizeAddonId(id) {
  if (!id) return id;
  if (id.startsWith('bookmark_') || id.startsWith('acc_')) return id;
  const bm = bookmarksData.find(b => b.slug === id || b.id === id);
  if (bm) return bm.id || ('bookmark_' + bm.slug);
  const acc = accessoriesData.find(a => a.slug === id || a.id === id);
  if (acc) return acc.id || ('acc_' + acc.slug);
  return id;
}

async function loadCmsAddons() {
  try {
    const [bmRes, accRes] = await Promise.all([
      fetch('cms-bookmarks.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('cms-accessories.json').then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    bookmarksData = Array.isArray(bmRes) ? bmRes : [];
    accessoriesData = Array.isArray(accRes) ? accRes : [];

    // Register active bookmarks into global books dictionary
    bookmarksData.forEach(b => {
      const fullId = b.id || ('bookmark_' + b.slug);
      const data = {
        title: b.name || 'Cute Bookmark',
        author: 'Gentle Readers Collection',
        price: (b.price !== null && b.price !== undefined) ? String(b.price) : '',
        image: (b.images && b.images[0]) || b.image || 'img/new products/bookmarks/cats bookmarks.jpg',
        inStock: b.active !== false
      };
      books[fullId] = data;
      books[b.slug] = data;
    });

    // Register active accessories into global books dictionary
    accessoriesData.forEach(a => {
      const fullId = a.id || ('acc_' + a.slug);
      const data = {
        title: a.name || 'Reading Accessory',
        author: 'Gentle Readers Collection',
        price: (a.price !== null && a.price !== undefined) ? String(a.price) : '',
        image: (a.images && a.images[0]) || a.image || 'img/new products/bookmarks/book tracker.jpg',
        inStock: a.active !== false
      };
      books[fullId] = data;
      books[a.slug] = data;
    });

    // 1. Sync from URL parameters if customer clicked "Buy Now" on bookmark
    const urlParams = new URLSearchParams(window.location.search);
    const addonParam = urlParams.get('addon') || urlParams.get('bookmark') || urlParams.get('accessory');
    if (addonParam) {
      const normId = normalizeAddonId(addonParam);
      selectedAddons[normId] = (selectedAddons[normId] || 0) + 1;
      const cart = getCartObject();
      cart[normId] = selectedAddons[normId];
      localStorage.setItem('cart', JSON.stringify(cart));
    }

    // 2. Sync any bookmarks or accessories already in localStorage cart into selectedAddons
    const cart = getCartObject();
    Object.keys(cart).forEach(id => {
      if (isAccessoryId(id)) {
        const normId = normalizeAddonId(id);
        selectedAddons[normId] = cart[id];
      }
    });

    renderAddonLists();
  } catch (err) {
    console.error('Error loading CMS addons for checkout:', err);
  }
}

function renderAddonLists() {
  const bmListEl = document.getElementById('bookmarkAddonsList');
  const accListEl = document.getElementById('accessoryAddonsList');
  const accSection = document.getElementById('tracker-addon-section');

  // 1. Render Bookmarks
  if (bmListEl) {
    const activeBookmarks = bookmarksData.filter(b => b.active !== false);
    if (activeBookmarks.length === 0) {
      bmListEl.innerHTML = '<div style="color: #888; font-size: 12px; padding: 6px;">No bookmarks currently available.</div>';
    } else {
      bmListEl.innerHTML = '';
      activeBookmarks.forEach(b => {
        const id = b.id || ('bookmark_' + b.slug);
        const hasPrice = b.price !== null && b.price !== undefined && !isNaN(Number(b.price)) && Number(b.price) > 0;
        const priceDisplay = hasPrice ? `${Number(b.price).toLocaleString()} DA` : '<span style="color:#b45309;font-size:11px;">Price set via CMS</span>';
        const imgUrl = (b.images && b.images[0]) || b.image || 'img/new products/bookmarks/cats bookmarks.jpg';
        const isSelected = Boolean(selectedAddons[id]);
        const qty = selectedAddons[id] || 1;

        const card = document.createElement('div');
        card.className = `addon-card ${isSelected ? 'selected' : ''}`;
        card.id = `addon-card-${id}`;

        let galleryThumbs = '';
        if (b.images && b.images.length > 1) {
          galleryThumbs = `
            <div style="display:flex; gap:4px; margin-top:4px;">
              ${b.images.map((im, idx) => `
                <img src="${encodeURI(im)}" alt="thumb" style="width:20px; height:20px; object-fit:cover; border-radius:3px; cursor:pointer; border:${idx===0?'1.5px solid #105652':'1px solid #ccc'};" onclick="event.stopPropagation(); document.getElementById('img-${id}').src='${encodeURI(im)}';" />
              `).join('')}
            </div>
          `;
        }

        card.innerHTML = `
          <div class="addon-img-wrap">
            <img id="img-${id}" src="${encodeURI(imgUrl)}" alt="${b.name}">
          </div>
          <div class="addon-info">
            <div class="addon-name">${b.name}</div>
            <div class="addon-sub">${b.description ? b.description.substring(0, 90) + '...' : ''}</div>
            ${galleryThumbs}
            <div class="addon-price-tag">${priceDisplay}</div>
          </div>
          <div class="addon-controls">
            ${isSelected ? `
              <div class="qty-controls" style="margin-right: 6px;">
                <button type="button" class="qty-btn" onclick="event.stopPropagation(); changeAddonQty('${id}', -1)">−</button>
                <span class="qty">${qty}</span>
                <button type="button" class="qty-btn" onclick="event.stopPropagation(); changeAddonQty('${id}', 1)">+</button>
              </div>
            ` : ''}
            <input type="checkbox" class="addon-checkbox" ${isSelected ? 'checked' : ''} ${!hasPrice ? 'disabled title="Price not yet configured"' : ''} onchange="toggleAddon('${id}', this.checked)" />
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'IMG') return;
          if (!hasPrice) return;
          const chk = card.querySelector('.addon-checkbox');
          if (chk) {
            chk.checked = !chk.checked;
            toggleAddon(id, chk.checked);
          }
        });

        bmListEl.appendChild(card);
      });
    }
  }

  // 2. Render Accessories / Tracker
  if (accListEl) {
    const activeAccessories = accessoriesData.filter(a => a.active !== false);
    if (activeAccessories.length > 0) {
      if (accSection) accSection.style.display = 'block';
      accListEl.innerHTML = '';
      activeAccessories.forEach(a => {
        const id = a.id || ('acc_' + a.slug);
        const hasPrice = a.price !== null && a.price !== undefined && !isNaN(Number(a.price)) && Number(a.price) > 0;
        const priceDisplay = hasPrice ? `${Number(a.price).toLocaleString()} DA` : '<span style="color:#b45309;font-size:11px;">Price set via CMS</span>';
        const imgUrl = (a.images && a.images[0]) || a.image || 'img/new products/bookmarks/book tracker.jpg';
        const isSelected = Boolean(selectedAddons[id]);
        const qty = selectedAddons[id] || 1;

        const card = document.createElement('div');
        card.className = `addon-card ${isSelected ? 'selected' : ''}`;
        card.id = `addon-card-${id}`;

        card.innerHTML = `
          <div class="addon-img-wrap">
            <img id="img-${id}" src="${encodeURI(imgUrl)}" alt="${a.name}">
          </div>
          <div class="addon-info">
            <div class="addon-name">${a.name}</div>
            <div class="addon-sub">${a.description ? a.description.substring(0, 90) + '...' : ''}</div>
            <div class="addon-price-tag">${priceDisplay}</div>
          </div>
          <div class="addon-controls">
            ${isSelected ? `
              <div class="qty-controls" style="margin-right: 6px;">
                <button type="button" class="qty-btn" onclick="event.stopPropagation(); changeAddonQty('${id}', -1)">−</button>
                <span class="qty">${qty}</span>
                <button type="button" class="qty-btn" onclick="event.stopPropagation(); changeAddonQty('${id}', 1)">+</button>
              </div>
            ` : ''}
            <input type="checkbox" class="addon-checkbox" ${isSelected ? 'checked' : ''} ${!hasPrice ? 'disabled title="Price not yet configured"' : ''} onchange="toggleAddon('${id}', this.checked)" />
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'IMG') return;
          if (!hasPrice) return;
          const chk = card.querySelector('.addon-checkbox');
          if (chk) {
            chk.checked = !chk.checked;
            toggleAddon(id, chk.checked);
          }
        });

        accListEl.appendChild(card);
      });
    } else {
      if (accSection) accSection.style.display = 'none';
    }
  }
}

window.toggleAddon = function(id, isChecked) {
  const normId = normalizeAddonId(id);
  if (isChecked) {
    selectedAddons[normId] = selectedAddons[normId] || 1;
  } else {
    delete selectedAddons[normId];
  }
  // Sync into localStorage cart
  const cart = getCartObject();
  if (isChecked) {
    cart[normId] = selectedAddons[normId];
  } else {
    delete cart[normId];
  }
  localStorage.setItem('cart', JSON.stringify(cart));

  renderAddonLists();
  loadOrderSummary();
};

window.changeAddonQty = function(id, delta) {
  const normId = normalizeAddonId(id);
  const current = selectedAddons[normId] || 1;
  const next = current + delta;
  if (next <= 0) {
    delete selectedAddons[normId];
  } else {
    selectedAddons[normId] = next;
  }
  const cart = getCartObject();
  if (next <= 0) {
    delete cart[normId];
  } else {
    cart[normId] = next;
  }
  localStorage.setItem('cart', JSON.stringify(cart));

  renderAddonLists();
  loadOrderSummary();
};

// wilayaDairaData is now handled in js/shipping-data.js

function getCurrentLang() {
  return localStorage.getItem('lang') || 'en';
}

function getBookTitle(book, lang) {
  // If you want to support English/Arabic titles, add both to the books object and select here
  if (!book) return '';
  const base = book.title || '';
  const auth = book.author || '';
  return auth ? `${base} — ${auth}` : base;
}

function getCartObject() {
  const stored = JSON.parse(localStorage.getItem("cart")) || {};
  if (Array.isArray(stored)) {
    const obj = {};
    stored.forEach(id => { obj[id] = (obj[id] || 0) + 1; });
    localStorage.setItem("cart", JSON.stringify(obj));
    return obj;
  }
  return stored;
}
window.getCartObject = getCartObject;

function loadOrderSummary() {
  const cart = getCartObject();
  const cartItemsDiv = document.getElementById("cartItems");
  const orderDetailsDiv = document.getElementById("orderDetails");
  const totalPriceLabel = document.getElementById("totalPrice");

  if (!cartItemsDiv || !orderDetailsDiv || !totalPriceLabel) {
    console.error("Required DOM elements not found");
    return;
  }

  let booksSubtotal = 0;
  cartItemsDiv.innerHTML = "";
  orderDetailsDiv.innerHTML = "";
  const lang = getCurrentLang();

  // Separate book IDs from accessory IDs
  const cartKeys = Object.keys(cart);
  const bookIds = cartKeys.filter(id => !isAccessoryId(id));

  // Build active addons list
  let addonsSubtotal = 0;
  const activeAddonsList = [];

  Object.keys(selectedAddons).forEach(addonId => {
    const qty = selectedAddons[addonId] || 0;
    if (qty <= 0) return;
    const item = bookmarksData.find(b => (b.id || 'bookmark_' + b.slug) === addonId || b.slug === addonId) ||
                 accessoriesData.find(a => (a.id || 'acc_' + a.slug) === addonId || a.slug === addonId);
    if (!item) return;
    const price = Number(item.price) || 0;
    const lineTotal = price * qty;
    addonsSubtotal += lineTotal;
    activeAddonsList.push({
      id: addonId,
      name: item.name,
      price: price,
      qty: qty,
      lineTotal: lineTotal,
      image: (item.images && item.images[0]) || item.image || 'img/new products/bookmarks/cats bookmarks.jpg'
    });
  });

  const hasAnyItems = (bookIds.length > 0) || (activeAddonsList.length > 0);

  if (!hasAnyItems) {
    cartItemsDiv.innerHTML = '<div style="text-align: center; color: #7a524a; font-style: italic; padding: 20px; background: rgba(94,34,23,0.05); border-radius: 8px;">' +
      (lang === 'ar' ? 'سلة الطلب فارغة حالياً. يمكنك اختيار كتب أو فواصل وإكسسوارات من الأسفل لإتمام الشراء!' : 'Your order is currently empty. Add books or select bookmarks & accessories below to purchase!') +
      '</div>';
    orderDetailsDiv.innerHTML = '<span>' + (lang === 'ar' ? 'لا توجد عناصر' : 'No items') + '</span><span>0 DZD</span>';
    totalPriceLabel.textContent = "0 DZD";
    if (typeof validateForm === 'function') validateForm();
    return;
  }

  // If ordering accessories alone without any book, display an encouraging badge
  if (bookIds.length === 0) {
    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = "background: rgba(16, 86, 82, 0.08); border: 1.5px solid rgba(16, 86, 82, 0.22); border-radius: 10px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;";
    infoDiv.innerHTML = `
      <span style="font-size: 20px;">✨</span>
      <div>
        <div style="font-weight: 700; color: #105652; font-size: 13.5px;">
          ${lang === 'ar' ? 'طلب إكسسوارات وفواصل منفردة' : 'Accessories-Only Order'}
        </div>
        <div style="font-size: 11.5px; color: #5a4c4a;">
          ${lang === 'ar' ? 'يمكنك إتمام هذا الطلب للفواصل والإكسسوارات وحدها دون الحاجة لشراء كتاب!' : 'You are purchasing accessories/bookmarks alone without a book. You can add more below!'}
        </div>
      </div>
    `;
    cartItemsDiv.appendChild(infoDiv);
  }

  // 1. Render books
  bookIds.forEach(bookId => {
    const book = books[bookId] || { title: 'Unknown Book', price: '0' };
    const qty = cart[bookId] || 1;
    let price = 0;
    if (book.price) price = parseFloat(String(book.price).replace(/[^\d.]/g, ""));
    const lineTotal = price * qty;
    booksSubtotal += lineTotal;

    const discountTag = (book.has_discount && book.discount_label)
      ? `<span style="background:rgba(220,38,38,0.1); color:#dc2626; font-size:0.75rem; font-weight:700; padding:1px 5px; border-radius:4px; margin-left:4px;">${book.discount_label}</span>`
      : '';

    const itemDiv = document.createElement("div");
    itemDiv.className = "book-item";
    itemDiv.innerHTML = `
      <span>${getBookTitle(book, lang)}${discountTag}</span>
      <div class="qty-controls">
        <button type="button" class="qty-btn qty-dec" data-id="${bookId}">−</button>
        <span class="qty">${qty}</span>
        <button type="button" class="qty-btn qty-inc" data-id="${bookId}">+</button>
      </div>
      <span class="book-price-line">${lineTotal.toLocaleString()} DZD</span>`;
    cartItemsDiv.appendChild(itemDiv);

    const detailTitle = document.createElement("span");
    detailTitle.textContent = `${book.title} × ${qty}`;
    const detailPrice = document.createElement("span");
    detailPrice.textContent = `${lineTotal.toLocaleString()} DZD`;
    orderDetailsDiv.appendChild(detailTitle);
    orderDetailsDiv.appendChild(detailPrice);
  });

  // 2. Render accessories in the item list
  activeAddonsList.forEach(addon => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "book-item";
    itemDiv.style.cssText = "background: #fdfaf2; border-left: 3.5px solid #105652; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;";
    itemDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
        <img src="${encodeURI(addon.image)}" alt="thumb" style="width:34px; height:34px; object-fit:cover; border-radius:6px; flex-shrink:0; border:1px solid rgba(16,86,82,0.2);" />
        <span style="font-weight:600; color:#105652; font-size:13.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${addon.name}
        </span>
      </div>
      <div class="qty-controls" style="margin: 0 10px;">
        <button type="button" class="qty-btn" onclick="changeAddonQty('${addon.id}', -1)">−</button>
        <span class="qty">${addon.qty}</span>
        <button type="button" class="qty-btn" onclick="changeAddonQty('${addon.id}', 1)">+</button>
      </div>
      <span class="book-price-line" style="color:#105652; font-weight:700;">${addon.lineTotal.toLocaleString()} DZD</span>
    `;
    cartItemsDiv.appendChild(itemDiv);

    const detailTitle = document.createElement("span");
    detailTitle.textContent = `${addon.name} × ${addon.qty}`;
    detailTitle.style.color = '#105652';
    detailTitle.style.fontWeight = '600';
    
    const detailPrice = document.createElement("span");
    detailPrice.textContent = `${addon.lineTotal.toLocaleString()} DZD`;
    detailPrice.style.fontWeight = '600';

    orderDetailsDiv.appendChild(detailTitle);
    orderDetailsDiv.appendChild(detailPrice);
  });

  // 3. Calculate Shipping
  let shippingCost = 0;
  const deliveryMethod = document.getElementById("checkout-delivery-select")?.value;
  const wilaya = document.getElementById("checkout-wilaya-select")?.value;

  if (deliveryMethod && wilaya) {
    shippingCost = getShippingPrice(wilaya, deliveryMethod);
  }

  const shippingTitle = document.createElement("span");
  shippingTitle.textContent = lang === 'ar' ? "التوصيل" : "Shipping";
  shippingTitle.style.fontWeight = "bold";
  shippingTitle.style.fontSize = "14px";
  
  const shippingPriceSpan = document.createElement("span");
  shippingPriceSpan.textContent = `${shippingCost.toLocaleString()} DZD`;
  shippingPriceSpan.style.fontWeight = "bold";
  shippingPriceSpan.style.fontSize = "14px";
  
  orderDetailsDiv.appendChild(shippingTitle);
  orderDetailsDiv.appendChild(shippingPriceSpan);

  // Agency desk info if applicable
  if (deliveryMethod === 'desk') {
    const deskSelect = document.getElementById('checkout-desk-select');
    const selectedOption = deskSelect?.options[deskSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const deskName = selectedOption.value;
      const deskAddress = selectedOption.getAttribute('data-address');
      
      const deskTitle = document.createElement("span");
      deskTitle.textContent = lang === 'ar' ? 'المكتب' : 'Agency';
      deskTitle.style.fontSize = '0.9rem';
      deskTitle.style.color = '#5e2217';
      
      const deskNameSpan = document.createElement("span");
      deskNameSpan.textContent = deskName;
      deskNameSpan.style.fontSize = '0.9rem';
      
      const addressTitle = document.createElement("span");
      addressTitle.textContent = lang === 'ar' ? 'العنوان' : 'Address';
      addressTitle.style.fontSize = '0.8rem';
      addressTitle.style.color = '#888';
      
      const addressText = document.createElement("span");
      addressText.textContent = deskAddress;
      addressText.style.fontSize = '0.8rem';
      addressText.style.color = '#888';
      
      orderDetailsDiv.appendChild(deskTitle);
      orderDetailsDiv.appendChild(deskNameSpan);
      orderDetailsDiv.appendChild(addressTitle);
      orderDetailsDiv.appendChild(addressText);
    }
  }

  // 4. Calculate Packaging
  const packagingOption = document.querySelector('input[name="packaging"]:checked');
  const packagingType = packagingOption ? packagingOption.value : 'none';
  const packagingPrice = PACKAGING_PRICES[packagingType] !== undefined ? PACKAGING_PRICES[packagingType] : 0;

  if (packagingType !== 'none' && packagingPrice > 0) {
    const packagingTitle = document.createElement("span");
    const packagingLabel = PACKAGING_LABELS[packagingType] || packagingType;
    packagingTitle.textContent = lang === 'ar' ? `التغليف (${packagingLabel})` : `Packaging (${packagingLabel})`;
    packagingTitle.style.fontSize = '0.9rem';
    
    const packagingPriceSpan = document.createElement("span");
    packagingPriceSpan.textContent = `${packagingPrice.toLocaleString()} DZD`;
    packagingPriceSpan.style.fontSize = '0.9rem';
    
    orderDetailsDiv.appendChild(packagingTitle);
    orderDetailsDiv.appendChild(packagingPriceSpan);
  }
  
  const finalTotal = booksSubtotal + addonsSubtotal + shippingCost + packagingPrice;
  totalPriceLabel.textContent = `${finalTotal.toLocaleString()} DZD`;

  if (typeof validateForm === 'function') validateForm();
}
document.addEventListener("DOMContentLoaded", function () {
  populateWilayas();

  const wilayaSelect = document.getElementById('checkout-wilaya-select');
  const dairaSelect = document.getElementById('checkout-daira-select');
  const deskSelect = document.getElementById('checkout-desk-select');
  const deliverySelect = document.getElementById('checkout-delivery-select');

  if (wilayaSelect) {
    wilayaSelect.addEventListener('change', function () {
      populateDairas(this.value);
      if (dairaSelect) dairaSelect.value = '';
      if (deskSelect) {
        deskSelect.innerHTML = '<option value="">Select agency / اختر المكتب</option>';
        deskSelect.disabled = true;
      }
      loadOrderSummary();
    });
  }

  if (dairaSelect) {
    dairaSelect.addEventListener('change', function () {
      populateDesks(wilayaSelect.value, this.value);
      loadOrderSummary();
    });
  }

  if (deskSelect) {
    deskSelect.addEventListener('change', function () {
      loadOrderSummary();
    });
  }

  if (deliverySelect) {
    deliverySelect.addEventListener('change', function () {
      toggleAddressField(this.value);
      toggleDeskField(this.value);
      loadOrderSummary();
    });
  }

  // Packaging selection change
  document.querySelectorAll('input[name="packaging"]').forEach(radio => {
    radio.addEventListener('change', function() {
      document.querySelectorAll('.packaging-option').forEach(el => el.classList.remove('selected'));
      const parentLabel = this.closest('.packaging-option');
      if (parentLabel) parentLabel.classList.add('selected');
      loadOrderSummary();
    });
  });

  // Merge CMS books & addons, then load order summary
  Promise.all([
    mergeCmsBooksIntoCheckout(),
    loadCmsAddons()
  ]).finally(function () {
    setTimeout(loadOrderSummary, 100);
  });
});

// Quantity controls (event delegation)
document.addEventListener('click', function (e) {
  if (e.target && (e.target.classList.contains('qty-inc') || e.target.classList.contains('qty-dec'))) {
    const id = e.target.getAttribute('data-id');

    // Check if book is out of stock
    if (books[id] && books[id].inStock === false && e.target.classList.contains('qty-inc')) {
      alert('This book is currently out of stock / هذا الكتاب نفدت الكمية حالياً');
      return;
    }

    const cart = getCartObject();
    const delta = e.target.classList.contains('qty-inc') ? 1 : -1;
    const next = (cart[id] || 0) + delta;
    if (next <= 0) {
      delete cart[id];
    } else {
      cart[id] = next;
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    loadOrderSummary();
  }
});
const checkoutForm = document.getElementById("checkoutForm");
if (checkoutForm) {
  checkoutForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Collect form data
    const firstName = document.getElementById("checkout-name-input")?.value?.trim();
    const familyName = document.getElementById("checkout-family-input")?.value?.trim();
    const phoneNumber = document.getElementById("checkout-number-input")?.value?.trim();
    const instagramUsername = document.getElementById("checkout-instagram-input")?.value?.trim();
    const deliveryMethod = document.getElementById("checkout-delivery-select")?.value;
    const wilaya = document.getElementById("checkout-wilaya-select")?.value;
    const daira = document.getElementById("checkout-daira-select")?.value;
    const address = document.getElementById("checkout-address-input")?.value?.trim() || "";
    const desk = document.getElementById("checkout-desk-select")?.value || "";
    const packagingOption = document.querySelector('input[name="packaging"]:checked');
    const packagingType = packagingOption ? packagingOption.value : "none";
    const cartItems = getCartObject();

    // Form validation
    if (!firstName) {
      alert('Please enter your first name');
      return;
    }
    if (!familyName) {
      alert('Please enter your family name');
      return;
    }
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }
    if (!deliveryMethod) {
      alert('Please select a delivery method');
      return;
    }
    if (!wilaya) {
      alert('Please select a wilaya');
      return;
    }
    if (!daira) {
      alert('Please select a daira');
      return;
    }
    let finalAddress = address; // Default to home address

    if (deliveryMethod === 'desk') {
      const deskSelect = document.getElementById('checkout-desk-select');
      const selectedOption = deskSelect?.options[deskSelect.selectedIndex];
      if (selectedOption) {
        finalAddress = selectedOption.getAttribute('data-address');
      }
    }

    if (deliveryMethod === 'home' && !address) {
      alert('Please enter your address for home delivery');
      return;
    }
    if (deliveryMethod === 'desk' && !desk) {
      alert('Please select an agency for desk pickup');
      return;
    }
    const cartKeys = Object.keys(cartItems);
    const bookIds = cartKeys.filter(id => !isAccessoryId(id));
    const activeAddonKeys = Object.keys(selectedAddons).filter(id => (selectedAddons[id] || 0) > 0);

    const hasBooks = bookIds.length > 0;
    const hasAddons = activeAddonKeys.length > 0;

    if (!hasBooks && !hasAddons) {
      alert(getCurrentLang() === 'ar' ? 'سلة الطلب فارغة. يرجى اختيار كتاب أو إكسسوار للطلب.' : 'Your order is empty. Please select books or accessories before placing an order.');
      return;
    }

    // Calculate Subtotal and Shipping Price
    let subtotal = 0;
    const items = [];

    // Add books
    bookIds.forEach(bookId => {
      const book = books[bookId] || { title: `Unknown Book (${bookId})`, price: '0' };
      const qty = cartItems[bookId] || 1;
      let price = 0;
      if (book.price) price = parseFloat(String(book.price).replace(/[^\d.]/g, ""));
      subtotal += price * qty;
      items.push(`${book.title} × ${qty}`);
    });

    // Add selected bookmarks and accessories
    activeAddonKeys.forEach(addonId => {
      const qty = selectedAddons[addonId] || 0;
      if (qty <= 0) return;
      const item = bookmarksData.find(b => (b.id || 'bookmark_' + b.slug) === addonId || b.slug === addonId && b.active !== false) ||
                   accessoriesData.find(a => (a.id || 'acc_' + a.slug) === addonId || a.slug === addonId && a.active !== false);
      if (!item) return;
      const price = Number(item.price) || 0;
      subtotal += price * qty;
      items.push(`${item.name} [Accessory] × ${qty}`);
    });

    const shippingPrice = getShippingPrice(wilaya, deliveryMethod);
    const packagingPrice = PACKAGING_PRICES[packagingType] !== undefined ? PACKAGING_PRICES[packagingType] : 0;
    const finalTotal = subtotal + shippingPrice + packagingPrice;

    // Final safety check before submission
    if (shippingPrice <= 0 && wilaya) {
      alert(getCurrentLang() === 'ar' ? 'لم يتم حساب سعر التوصيل، يرجى اختيار الولاية وطريقة التوصيل' : 'Shipping price not calculated');
      return;
    }

        // Send to backend
    console.log('Submitting order. Subtotal:', subtotal, 'Shipping:', shippingPrice, 'Total:', finalTotal);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{ 
          firstName, 
          familyName, 
          phoneNumber, 
          instagramUsername, 
          deliveryMethod, 
          wilaya, 
          daira, 
          address: finalAddress,
          desk,
          items, 
          shipping_price: shippingPrice,
          packaging_type: packagingType,
          packaging_price: packagingPrice,
          total_price: finalTotal 
        }]);

      if (error) throw error;
      
      alert(getCurrentLang() === 'ar' ? "تم إرسال الطلب بنجاح!" : "Successfully submitted order!");
      localStorage.removeItem("cart");
      window.location.href = "index.html";
    } catch (err) {
      console.error('Checkout error:', err);
      alert(getCurrentLang() === 'ar' ? "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى." : "Error submitting order. Please try again.");
    }
  });
}

function getPlaceholderTexts(lang) {
  return {
    wilaya: lang === 'ar' ? 'اختر الولاية' : 'Select wilaya',
    daira: lang === 'ar' ? 'اختر الدائرة' : 'Select daira',
    delivery: lang === 'ar' ? 'اختر طريقة التوصيل' : 'Select delivery method'
  };
}

function populateWilayas() {
  const wilayaSelect = document.getElementById('checkout-wilaya-select');
  if (!wilayaSelect) return;

  const lang = getCurrentLang();
  const placeholders = getPlaceholderTexts(lang);

  wilayaSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = `${placeholders.wilaya} / ${lang === 'ar' ? 'اختر الولاية' : 'Choose wilaya'}`;
  wilayaSelect.appendChild(defaultOption);

  getAllWilayas().forEach(wilaya => {
    const option = document.createElement('option');
    option.value = wilaya;
    option.textContent = wilaya;
    wilayaSelect.appendChild(option);
  });
}

function populateDairas(selectedWilaya) {
  const dairaSelect = document.getElementById('checkout-daira-select');
  if (!dairaSelect) return;

  const lang = getCurrentLang();
  const placeholders = getPlaceholderTexts(lang);

  dairaSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = `${placeholders.daira} / ${lang === 'ar' ? 'اختر الدائرة' : 'Choose daira'}`;
  dairaSelect.appendChild(placeholder);

  const options = getDairas(selectedWilaya);
  if (options.length === 0) {
    dairaSelect.disabled = true;
    return;
  }

  options.forEach(daira => {
    const option = document.createElement('option');
    option.value = daira;
    option.textContent = daira;
    dairaSelect.appendChild(option);
  });
  dairaSelect.disabled = false;
}

function populateDesks(selectedWilaya, selectedDaira) {
  const deskSelect = document.getElementById('checkout-desk-select');
  if (!deskSelect) return;

  const lang = getCurrentLang();
  deskSelect.innerHTML = '';

  const desks = getDesks(selectedWilaya, selectedDaira);

  // Check if the daira exists in our data at all (to distinguish "no daira selected" vs "no desks")
  const deskField = document.getElementById('desk-field');
  const deliveryMethod = document.getElementById('checkout-delivery-select')?.value;

  if (!selectedDaira) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = lang === 'ar' ? 'اختر المكتب' : 'Select agency';
    deskSelect.appendChild(placeholder);
    deskSelect.disabled = true;
    return;
  }

  if (desks.length === 0) {
    // Daira is selected but has no desks
    const noDesksOption = document.createElement('option');
    noDesksOption.value = '';
    noDesksOption.textContent = lang === 'ar' ? 'لا توجد مكاتب متاحة في هذه الدائرة' : 'No desks available in this daira';
    deskSelect.appendChild(noDesksOption);
    deskSelect.disabled = true;
    return;
  }

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = lang === 'ar' ? 'اختر المكتب' : 'Select agency';
  deskSelect.appendChild(placeholder);

  desks.forEach((desk) => {
    const option = document.createElement('option');
    option.value = desk.name;
    option.setAttribute('data-address', desk.address);
    option.textContent = `${desk.name} (${desk.address})`;
    deskSelect.appendChild(option);
  });
  deskSelect.disabled = false;
}

function toggleAddressField(deliveryMethod) {
  const addressField = document.getElementById('address-field');
  if (!addressField) return;

  const shouldShow = deliveryMethod === 'home';
  addressField.style.display = shouldShow ? 'block' : 'none';
  if (!shouldShow) {
    const addressInput = document.getElementById('checkout-address-input');
    if (addressInput) addressInput.value = '';
  }
}

function toggleDeskField(deliveryMethod) {
  const deskField = document.getElementById('desk-field');
  if (!deskField) return;

  const shouldShow = deliveryMethod === 'desk';
  deskField.style.display = shouldShow ? 'block' : 'none';
  if (!shouldShow) {
    const deskSelect = document.getElementById('checkout-desk-select');
    if (deskSelect) deskSelect.value = '';
  }
}

// Animate sections on scroll
function animateOnScroll() {
  document.querySelectorAll('.animate-fade-in').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 60) {
      el.classList.add('visible');
    }
  });
}
window.addEventListener('scroll', animateOnScroll);
window.addEventListener('DOMContentLoaded', function() {
    animateOnScroll();
    
    // Add real-time validation listeners
    const fields = [
        'checkout-name-input', 'checkout-family-input', 'checkout-number-input', 
        'checkout-instagram-input', 'checkout-delivery-select', 'checkout-wilaya-select', 
        'checkout-daira-select', 'checkout-desk-select', 'checkout-address-input'
    ];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventType, validateForm);
        }
    });

    document.querySelectorAll('input[name="packaging"]').forEach(radio => {
        radio.addEventListener('change', validateForm);
    });

    // Initial validation
    validateForm();
});

function validateForm() {
    const firstName = document.getElementById("checkout-name-input")?.value?.trim();
    const familyName = document.getElementById("checkout-family-input")?.value?.trim();
    const phoneNumber = document.getElementById("checkout-number-input")?.value?.trim();
    const instagramUsername = document.getElementById("checkout-instagram-input")?.value?.trim();
    const deliveryMethod = document.getElementById("checkout-delivery-select")?.value;
    const wilaya = document.getElementById("checkout-wilaya-select")?.value;
    const daira = document.getElementById("checkout-daira-select")?.value;
    const address = document.getElementById("checkout-address-input")?.value?.trim();
    const desk = document.getElementById("checkout-desk-select")?.value;
    
    const submitBtn = document.getElementById("checkout-submit-button");
    const validationMsg = document.getElementById("validation-message");
    
    if (!submitBtn || !validationMsg) return;

    // Check shipping price is calculated
    const shippingPrice = getShippingPrice(wilaya, deliveryMethod);
    
    // Check if order has books OR accessories
    const cart = getCartObject();
    const cartKeys = Object.keys(cart);
    const hasBooks = cartKeys.some(id => !isAccessoryId(id));
    const hasAddons = Object.values(selectedAddons).some(qty => qty > 0);
    const hasItems = hasBooks || hasAddons;

    let isValid = true;

    if (!hasItems) isValid = false;
    if (!firstName) isValid = false;
    if (!familyName) isValid = false;
    if (!phoneNumber) isValid = false;
    if (!instagramUsername) isValid = false;
    if (!deliveryMethod) isValid = false;
    if (!wilaya) isValid = false;
    if (!daira) isValid = false;
    
    if (deliveryMethod === 'home' && !address) isValid = false;
    if (deliveryMethod === 'desk' && !desk) isValid = false;
    
    // Shipping price must be > 0 (all zones have prices now)
    if (wilaya && shippingPrice <= 0) isValid = false;

    // Packaging must be selected (it has a default 'none')
    const packagingOption = document.querySelector('input[name="packaging"]:checked');
    if (!packagingOption) isValid = false;

    if (isValid) {
        submitBtn.disabled = false;
        validationMsg.style.display = 'none';
    } else {
        submitBtn.disabled = true;
        validationMsg.style.display = 'block';
    }
}
window.validateForm = validateForm;
