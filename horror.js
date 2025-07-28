// JavaScript extracted from horror.html
function openBook(id) {
  window.location.href = `book.html?id=${id}`;
}

function addToCartFromCard(bookId, event) {
  event.stopPropagation();
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (!cart.includes(bookId)) {
    cart.push(bookId);
    localStorage.setItem('cart', JSON.stringify(cart));
    // Animate the cart icon in navigation
    const cartIcon = document.querySelector('.btn-cart');
    if (cartIcon) {
      cartIcon.style.transform = 'scale(1.2)';
      setTimeout(() => {
        cartIcon.style.transform = 'scale(1)';
      }, 200);
    }
  }
}

function updateCartCounter() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartButtons = document.querySelectorAll('.btn-cart');
  cartButtons.forEach(button => {
    button.setAttribute('data-quantity', cart.length);
  });
}
updateCartCounter(); 