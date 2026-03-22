const fs = require('fs');
const path = require('path');

// 1. Fix cart.js
let cartPath = path.join(__dirname, '..', 'public', 'cart.js');
let cartContent = fs.readFileSync(cartPath, 'utf8');
cartContent = cartContent.replace(
  /price: b\.price \? String\(b\.price\) : ''/g,
  "price: b.price ? String(b.price) : '',\n          inStock: (b.status || 'available').toLowerCase() !== 'out of stock'"
);
fs.writeFileSync(cartPath, cartContent, 'utf8');

// 2. Fix checkout.js
let checkoutPath = path.join(__dirname, '..', 'public', 'checkout.js');
let checkoutContent = fs.readFileSync(checkoutPath, 'utf8');
checkoutContent = checkoutContent.replace(
  /price: b\.price \? String\(b\.price\) : ''/g,
  "price: b.price ? String(b.price) : '',\n          inStock: (b.status || 'available').toLowerCase() !== 'out of stock'"
);

checkoutContent = checkoutContent.replace(
  /const outOfStockBooks = \['la_yumkinuka_iidhaayi', 'the_hunger_games'\];\n\s*if \(outOfStockBooks\.includes\(id\) && e\.target\.classList\.contains\('qty-inc'\)\)/g,
  "if (books[id] && books[id].inStock === false && e.target.classList.contains('qty-inc'))"
);
fs.writeFileSync(checkoutPath, checkoutContent, 'utf8');


// 3. Fix search.html mapping
let searchPath = path.join(__dirname, '..', 'public', 'search.html');
let searchContent = fs.readFileSync(searchPath, 'utf8');

searchContent = searchContent.replace(
  /price: b\.price \? String\(b\.price\) : ''/g,
  "price: b.price ? String(b.price) : '',\n                inStock: (b.status || 'available').toLowerCase() !== 'out of stock'"
);

searchContent = searchContent.replace(
  /const outOfStockBooks = \['la_yumkinuka_iidhaayi', 'the_hunger_games'\];\n\s*const isOutOfStock = outOfStockBooks\.includes\(book\.id\);/g,
  "const isOutOfStock = book.inStock === false;"
);

searchContent = searchContent.replace(
  /const outOfStockBooks = \['la_yumkinuka_iidhaayi', 'the_hunger_games'\];\n\s*if \(outOfStockBooks\.includes\(bookId\)\)/g,
  "if (books[bookId] && books[bookId].inStock === false)"
);

searchContent = searchContent.replace(
  /price: book\.price \|\| '',\n\s*summary: book\.description \|\| book\.description_ar \|\| ''/g,
  "price: book.price || '',\n        summary: book.description || book.description_ar || '',\n        inStock: book.inStock !== false"
);

fs.writeFileSync(searchPath, searchContent, 'utf8');

// 4. Fix index.html
let indexPath = path.join(__dirname, '..', 'public', 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const sliderStart = '<div class="list">';
const sliderEnd = '</div>\n      </div>\n    </section>';

let parts = indexContent.split(sliderStart);
if (parts.length > 1) {
  let afterList = parts[1].split(sliderEnd);
  
  if (afterList.length > 1) {
    let injectScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const sliderList = document.querySelector('.slider .list');
        if(!sliderList) return;
        
        fetch('cms-books.json')
          .then(res => res.json())
          .then(books => {
            if(!Array.isArray(books)) return;
            sliderList.innerHTML = '';
            
            // Update quantity for CSS
            const slider = document.querySelector('.slider');
            if(slider) slider.style.setProperty('--quantity', Math.min(books.length, 30));
            
            books.slice(0, 30).forEach((b, index) => {
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
              item.className = 'item';
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
                        <p class="book-price">Price: \${price} DZD</p>
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
          })
          .catch(e => console.error('Failed to load CMS books for index slider', e));
      });
    </script>
    `;
    
    // In indexContent, we replace addToCartFromCard hardcoded checking
    let replacedScriptContent = afterList[1].replace(
      /const outOfStockBooks = \['la_yumkinuka_iidhaayi', 'the_hunger_games'\];\n\s*if \(outOfStockBooks\.includes\(bookId\)\)/g,
      "if (window.books && window.books[bookId] && window.books[bookId].inStock === false)"
    );

    let newIndexContent = parts[0] + '<div class="list">\n        </div>\n      </div>\n    </section>\n' + injectScript + replacedScriptContent;
    
    fs.writeFileSync(indexPath, newIndexContent, 'utf8');
  }
}
console.log('Fixed scripts');
