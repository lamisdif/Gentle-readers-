// JavaScript extracted from cart.html
let books = {};
      });
    })
    .catch(function (err) {
      console.error('Error loading CMS books for cart:', err);
    });
}
function getCartObject() {
  const stored = JSON.parse(localStorage.getItem('cart')) || {};
  // Backward compatibility: if it's an array, convert to counts
  if (Array.isArray(stored)) {
    const obj = {};
    stored.forEach(id => { obj[id] = (obj[id] || 0) + 1; });
    localStorage.setItem('cart', JSON.stringify(obj));
    return obj;
  }
  return stored;
}

function setCartObject(obj) {
  localStorage.setItem('cart', JSON.stringify(obj));
}

function updateQty(bookId, delta) {
  // Check if book is out of stock
  if (books[bookId] && books[bookId].inStock === false && delta > 0) {
    alert('This book is currently out of stock / هذا الكتاب نفدت الكمية حالياً');
    return;
  }
  
  const cart = getCartObject();
  const next = (cart[bookId] || 0) + delta;
  if (next <= 0) {
    delete cart[bookId];
  } else {
    cart[bookId] = next;
  }
  setCartObject(cart);
  loadCart();
}

function loadCart() {
  const cart = getCartObject();
  const list = document.getElementById('cart-items');
  list.innerHTML = '';
  const ids = Object.keys(cart);
  if (ids.length === 0) {
    list.innerHTML = '<li>Your cart is empty.</li>';
    return;
  }
  ids.forEach(id => {
    const quantity = cart[id];
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    const book = books[id];
    const title = book ? book.title : id;
    const author = book && book.author ? ' — ' + book.author : '';
    li.innerHTML = `
      <span>${title}${author}</span>
      <div style="display:flex; gap:8px; align-items:center;">
        <button aria-label="Decrease" onclick="updateQty('${id}', -1)" class="bg-gray-200 px-2 rounded">-</button>
        <span>${quantity}</span>
        <button aria-label="Increase" onclick="updateQty('${id}', 1)" class="bg-gray-200 px-2 rounded">+</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function clearCart() {
  localStorage.removeItem('cart');
  loadCart();
}

function proceedToCheckout() {
  const cart = getCartObject();
  if (Object.keys(cart).length === 0) {
    alert('Your cart is empty!');
    return;
  }
  window.location.href = 'checkout.html';
}

window.onload = function () {
  mergeCmsBooksIntoCart().finally(loadCart);
}; 