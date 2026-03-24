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
        books[id] = {
          title: b.title || '',
          author: b.author || '',
          price: b.price ? String(b.price) : '',
          inStock: (b.status || 'available').toLowerCase() !== 'out of stock'
        };
      });
    }
  } catch (err) {
    console.error('Error loading CMS books for checkout:', err);
  }
}

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

    const itemDiv = document.createElement("div");
    itemDiv.className = "book-item";
    itemDiv.innerHTML = `
      <span>${getBookTitle(book, lang)}</span>
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
  
  const finalTotal = subtotal + shippingCost;
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

  // Merge CMS books, then load order summary
  mergeCmsBooksIntoCheckout()
    .finally(function () {
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

    const shippingPrice = getShippingPrice(wilaya, deliveryMethod);
    const finalTotal = subtotal + shippingPrice;

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
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = lang === 'ar' ? 'اختر المكتب' : 'Select agency';
  deskSelect.appendChild(placeholder);

  const desks = getDesks(selectedWilaya, selectedDaira);
  if (desks.length === 0) {
    deskSelect.disabled = true;
    return;
  }

  desks.forEach((desk, index) => {
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

    if (isValid) {
        submitBtn.disabled = false;
        validationMsg.style.display = 'none';
    } else {
        submitBtn.disabled = true;
        validationMsg.style.display = 'block';
    }
}
