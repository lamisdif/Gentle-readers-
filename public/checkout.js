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

async function loadCmsAddons() {
  try {
    const [bmRes, accRes] = await Promise.all([
      fetch('cms-bookmarks.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('cms-accessories.json').then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    bookmarksData = Array.isArray(bmRes) ? bmRes : [];
    accessoriesData = Array.isArray(accRes) ? accRes : [];

    // Register active bookmarks into global books dictionary for cart compatibility
    bookmarksData.forEach(b => {
      const id = b.id || ('bookmark_' + b.slug);
      books[id] = {
        title: b.name || 'Cute Bookmark',
        author: 'Gentle Readers Collection',
        price: (b.price !== null && b.price !== undefined) ? String(b.price) : '',
        inStock: b.active !== false
      };
    });

    // Register active accessories into global books dictionary
    accessoriesData.forEach(a => {
      const id = a.id || ('acc_' + a.slug);
      books[id] = {
        title: a.name || 'Reading Accessory',
        author: 'Gentle Readers Collection',
        price: (a.price !== null && a.price !== undefined) ? String(a.price) : '',
        inStock: a.active !== false
      };
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
  if (isChecked) {
    selectedAddons[id] = selectedAddons[id] || 1;
  } else {
    delete selectedAddons[id];
  }
  renderAddonLists();
  loadOrderSummary();
};

window.changeAddonQty = function(id, delta) {
  const current = selectedAddons[id] || 1;
  const next = current + delta;
  if (next <= 0) {
    delete selectedAddons[id];
  } else {
    selectedAddons[id] = next;
  }
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

function loadOrderSummary() {
  const cart = getCartObject();
  const cartItemsDiv = document.getElementById("cartItems");
  const orderDetailsDiv = document.getElementById("orderDetails");
  const totalPriceLabel = document.getElementById("totalPrice");

  if (!cartItemsDiv || !orderDetailsDiv || !totalPriceLabel) {
    console.error("Required DOM elements not found");
    return;
  }

  let subtotal = 0;
  cartItemsDiv.innerHTML = "";
  orderDetailsDiv.innerHTML = "";
  const lang = getCurrentLang();

  const ids = Object.keys(cart);
  if (ids.length === 0) {
    cartItemsDiv.innerHTML = '<div style="text-align: center; color: #666; font-style: italic; padding: 20px;">Your cart is empty / السلة فارغة</div>';
    orderDetailsDiv.innerHTML = '<span>No items</span><span>0 DZD</span>';
    totalPriceLabel.textContent = "0 DZD";
    return;
  }

  ids.forEach(bookId => {
    const book = books[bookId] || { title: 'Unknown Book', price: '0' };
    const qty = cart[bookId] || 1;
    let price = 0;
    
    if (book.price) {
      price = parseFloat(String(book.price).replace(/[^\d.]/g, ""));
    }
    const lineTotal = price * qty;
    subtotal += lineTotal;

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

    // Sidebar summary details
    const detailTitle = document.createElement("span");
    detailTitle.textContent = `${book.title} × ${qty}`;
    const detailPrice = document.createElement("span");
    detailPrice.textContent = `${lineTotal.toLocaleString()} DZD`;
    orderDetailsDiv.appendChild(detailTitle);
    orderDetailsDiv.appendChild(detailPrice);
  });

  // Calculate Shipping
  let shippingCost = 0;
  const deliveryMethod = document.getElementById("checkout-delivery-select")?.value;
  const wilaya = document.getElementById("checkout-wilaya-select")?.value;

  if (deliveryMethod && wilaya) {
    shippingCost = getShippingPrice(wilaya, deliveryMethod);
  }

  // Add shipping to summary
  const shippingTitle = document.createElement("span");
  shippingTitle.textContent = "Shipping / التوصيل";
  shippingTitle.style.fontWeight = "bold";
  shippingTitle.style.fontSize = "14px";
  
  const shippingPriceSpan = document.createElement("span");
  shippingPriceSpan.textContent = `${shippingCost.toLocaleString()} DZD`;
  shippingPriceSpan.style.fontWeight = "bold";
  shippingPriceSpan.style.fontSize = "14px";
  
  orderDetailsDiv.appendChild(shippingTitle);
  orderDetailsDiv.appendChild(shippingPriceSpan);

  // Add desk info if applicable
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

  // Calculate Add-ons Subtotal
  let addonsSubtotal = 0;
  Object.keys(selectedAddons).forEach(addonId => {
    const qty = selectedAddons[addonId] || 0;
    if (qty <= 0) return;
    const item = bookmarksData.find(b => (b.id || 'bookmark_' + b.slug) === addonId) ||
                 accessoriesData.find(a => (a.id || 'acc_' + a.slug) === addonId);
    if (!item) return;
    const price = Number(item.price) || 0;
    const lineTotal = price * qty;
    addonsSubtotal += lineTotal;

    const detailTitle = document.createElement("span");
    detailTitle.textContent = `${item.name} × ${qty}`;
    detailTitle.style.color = '#105652';
    detailTitle.style.fontWeight = '600';
    
    const detailPrice = document.createElement("span");
    detailPrice.textContent = `${lineTotal.toLocaleString()} DZD`;
    detailPrice.style.fontWeight = '600';

    orderDetailsDiv.appendChild(detailTitle);
    orderDetailsDiv.appendChild(detailPrice);
  });

  // Calculate Packaging
  const packagingOption = document.querySelector('input[name="packaging"]:checked');
  const packagingType = packagingOption ? packagingOption.value : 'none';
  const packagingPrice = PACKAGING_PRICES[packagingType] !== undefined ? PACKAGING_PRICES[packagingType] : 0;

  // Add packaging to summary
  if (packagingType !== 'none' && packagingPrice > 0) {
    const packagingTitle = document.createElement("span");
    const packagingLabel = PACKAGING_LABELS[packagingType] || packagingType;
    packagingTitle.textContent = `Packaging / التغليف (${packagingLabel})`;
    packagingTitle.style.fontSize = '0.9rem';
    
    const packagingPriceSpan = document.createElement("span");
    packagingPriceSpan.textContent = `${packagingPrice.toLocaleString()} DZD`;
    packagingPriceSpan.style.fontSize = '0.9rem';
    
    orderDetailsDiv.appendChild(packagingTitle);
    orderDetailsDiv.appendChild(packagingPriceSpan);
  }
  
  const finalTotal = subtotal + addonsSubtotal + shippingCost + packagingPrice;
  totalPriceLabel.textContent = `${finalTotal.toLocaleString()} DZD`;

  // Trigger validation after summary (and shipping price) is updated
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
    if (!cartItems || Object.keys(cartItems).length === 0) {
      alert('Your cart is empty. Please add some books before placing an order.');
      return;
    }

    // Calculate Subtotal and Shipping Price
    let subtotal = 0;
    const items = Object.keys(cartItems).map(bookId => {
      const book = books[bookId] || { title: `Unknown Book (${bookId})`, price: '0' };
      const qty = cartItems[bookId] || 1;
      
      let price = 0;
      if (book.price) {
        price = parseFloat(String(book.price).replace(/[^\d.]/g, ""));
      }
      subtotal += price * qty;
      return `${book.title} × ${qty}`;
    });

    // Add selected bookmarks and accessories to items & subtotal
    Object.keys(selectedAddons).forEach(addonId => {
      const qty = selectedAddons[addonId] || 0;
      if (qty <= 0) return;
      // Validate against CMS data as source of truth
      const item = bookmarksData.find(b => (b.id || 'bookmark_' + b.slug) === addonId && b.active !== false) ||
                   accessoriesData.find(a => (a.id || 'acc_' + a.slug) === addonId && a.active !== false);
      if (!item) return;
      const price = Number(item.price) || 0;
      subtotal += price * qty;
      items.push(`${item.name} [Add-on] × ${qty}`);
    });

    const shippingPrice = getShippingPrice(wilaya, deliveryMethod);
    const packagingPrice = PACKAGING_PRICES[packagingType] !== undefined ? PACKAGING_PRICES[packagingType] : 0;
    const finalTotal = subtotal + shippingPrice + packagingPrice;

    // Final safety check before submission
    if (shippingPrice <= 0 && wilaya) {
        alert('Shipping price not calculated / لم يتم حساب سعر التوصيل');
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
    
    let isValid = true;
    let missingFields = [];

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

    // Packaging must be selected (it has a default 'none', but being safe)
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
