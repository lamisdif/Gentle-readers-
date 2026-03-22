// JavaScript extracted from book.html
let books = {};


function addToCart() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  if (!bookId) return;

  // Check if book is out of stock
  if (books[bookId] && books[bookId].inStock === false) {
    const lang = localStorage.getItem('lang') || 'en';
    alert(lang === 'ar' ? 'هذا الكتاب نفدت الكمية حالياً' : 'This book is currently out of stock');
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (!cart.includes(bookId)) {
    cart.push(bookId);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
  // Animate the cart icon in navigation
  const cartIcon = document.querySelector('.btn-cart');
  if (cartIcon) {
    cartIcon.style.transform = 'scale(1.2)';
    setTimeout(() => {
      cartIcon.style.transform = 'scale(1)';
    }, 200);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  if (!bookId || !books[bookId]) return;
  const book = books[bookId];
  document.getElementById('book-image').src = book.cover;
  document.getElementById('book-title').textContent = book.title;
  document.getElementById('book-author').textContent = book.author;
  const lang = localStorage.getItem('lang') || 'en';
  document.getElementById('book-description').textContent =
    lang === 'ar' && book.description_ar ? book.description_ar : book.description;
}); 