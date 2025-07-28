// JavaScript extracted from book.html
const books = {
  el9adimon: {
    title: "القادمون",
    author: "أحمد خالد مصطفى",
    description: "A timeless tale of love, class, and societal expectations. Elizabeth Bennet navigates the complexities of Regency-era England.",
    description_ar: "قصة خيالية عن الحب والفوارق الطبقية وتوقعات المجتمع في إنجلترا القديمة.",
    cover: "imgs/el9adimon.jpg",
    price: "1,800.00",
    isbn: "9789776543210"
  },
  // ... (rest of the books object as in book.html)
};

function addToCart() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  if (!bookId) return;
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

document.addEventListener('DOMContentLoaded', function() {
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