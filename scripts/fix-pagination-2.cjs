const fs = require('fs');
const path = require('path');

let indexPath = path.join(__dirname, '..', 'public', 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const listStart = indexContent.indexOf('<div class="list">');
const paginationText = '<!-- Pagination for first section -->';
const paginationStart = indexContent.indexOf(paginationText);

if (listStart !== -1 && paginationStart !== -1) {
  // We want to replace everything from <div class="list"> to the end of the slider container, which is right before paginationText
  // Wait, let's look at the structure:
  // <div class="slider mx-auto" ...>
  //   <div class="list">
  //     ... items ...
  //   </div>
  // </div>
  // <!-- Pagination for first section -->
  
  // Actually, we can just replace everything between <div class="list"> and the </div> closure of list.
  // The list ends right before the closing </div> of the slider.
  const beforeList = indexContent.substring(0, listStart);
  const afterList = indexContent.substring(paginationStart);
  
  // We need to put back the list container and slider closing tag
  const injectScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const sliderList = document.querySelector('.slider .list');
        if(!sliderList) return;
        
        fetch('cms-books.json')
          .then(res => res.json())
          .then(books => {
            if(!Array.isArray(books)) return;
            sliderList.innerHTML = '';
            
            const slider = document.querySelector('.slider');
            if(slider) slider.style.setProperty('--quantity', books.length);
            
            books.forEach((b, index) => {
              const id = 'cms_' + (b.slug || b.title);
              const isOutOfStock = (b.status || 'available').toLowerCase() === 'out of stock';
              const price = b.price ? String(b.price) : '';
              const cover = b.image || 'https://placehold.co/200x280/ccc/666?text=Cover';
              
              const buttonStyle = isOutOfStock 
                ? "position: absolute; top: 8px; right: 8px; background: rgba(220,38,38,0.9); border: none; border-radius: 50%; width: 25px; height: 25px; cursor: not-allowed; display: flex; align-items: center; justify-content: center; z-index: 200; opacity: 0.7;"
                : "position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 200;";
              const buttonDisabled = isOutOfStock ? 'disabled' : '';
              
              window.books = window.books || {};
              window.books[id] = { title: b.title, author: b.author, inStock: !isOutOfStock, price: price };
              
              const item = document.createElement('div');
              item.className = 'item hidden'; // hidden by default for pagination
              item.style.setProperty('--position', index + 1);
              
              item.innerHTML = \`
                <div class="card" onclick="openBook('\${id}')" style="cursor: pointer; position: relative; z-index: 100;">
                  <button class="add-to-cart-btn" onclick="addToCartFromCard('\${id}', event)" style="\${buttonStyle}" \${buttonDisabled}>
                    <svg class="icon-cart" viewBox="0 0 24.38 30.52" height="15" width="15" xmlns="http://www.w3.org/2000/svg">
                      <path transform="translate(-3.62 -0.85)" d="M28,27.3,26.24,7.51a.75.75,0,0,0-.76-.69h-3.7a6,6,0,0,0-12,0H6.13a.76.76,0,0,0-.76.69L3.62,27.3v.07a4.29,4.29,0,0,0,4.52,4H23.48a4.29,4.29,0,0,0,4.52-4ZM15.81,2.37a4.47,4.47,0,0,1,4.46,4.45H11.35a4.47,4.47,0,0,1,4.46-4.45Zm7.67,27.48H8.13a2.79,2.79,0,0,1-3-2.45L6.83,8.34h3V11a.76.76,0,0,0,1.52,0V8.34h8.92V11a.76.76,0,0,0,1.52,0V8.34h3L26.48,27.4a2.79,2.79,0,0,1-3,2.44Zm0,0"></path>
                    </svg>
                  </button>
                  <div class="flip-book-card-wrapper">
                    <div class="flip-book-card-content">
                      <div class="flip-book-card-front">
                        <div class="book-cover-image">
                          <img src="\${cover}" alt="Book Cover" onerror="this.src='https://placehold.co/200x280/ccc/666?text=Cover+Image+Unavailable'" />
                        </div>
                        <p class="book-title">\${b.title || ''}</p>
                        <p class="book-author">\${b.author || ''}</p>
                        \${isOutOfStock ? '<p class="out-of-stock-notice" style="color: #dc2626; font-weight: bold; font-size: 12px; margin: 5px 0; text-align: center; background: rgba(220, 38, 38, 0.1); padding: 2px 8px; border-radius: 12px; display: inline-block;">Out of Stock / نفدت الكمية</p>' : ''}
                        \${price ? '<p class="book-price">Price: ' + price + ' DZD</p>' : '<p class="book-price"></p>'}
                      </div>
                      <div class="flip-book-card-back">
                        <div class="flip-book-card-back-content">
                          <h4 class="text-lg font-bold mb-2">Book Summary</h4>
                          <p class="summary-text">\${b.description || ''}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              \`;
              sliderList.appendChild(item);
            });
            
            if (typeof initPagination === 'function') {
              setTimeout(function() {
                initPagination(0);
              }, 100);
            }
          })
          .catch(e => console.error('Failed to load CMS books for index slider', e));
      });
    </script>
  `;
  
  let newIndexContent = beforeList + '<div class="list"></div>\n      </div>\n' + injectScript + '      ' + afterList;
  fs.writeFileSync(indexPath, newIndexContent, 'utf8');
  console.log('Successfully replaced hardcoded index.html slider.');
} else {
  console.log('listStart or paginationStart not found!');
  console.log('list: ', listStart);
  console.log('pag: ', paginationStart);
}
