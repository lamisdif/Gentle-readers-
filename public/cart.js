// JavaScript extracted from cart.html
const books = {
  // New books from the latest images
  ayyam_al_hijran: { title: "أيام الهجران", price: "1,450.00" },
  al_3adat_al_dharia: { title: "العادات الذرية", price: "1,600.00" },
  eva_luna: { title: "إيفا لونا", price: "2,100.00" },
  ghusoon_bunduq_1: { title: "غصون البندق - الكتاب الأول", price: "1,200.00" },
  ghusoon_bunduq_2: { title: "غصون البندق - الكتاب الثاني", price: "1,200.00" },
  kayf_tajid_al_hob: { title: "كيف تجد الحب", price: "1,000.00" },
  masarrat_saghira: { title: "مسرات صغيرة", price: "1,400.00" },
  hal_sata2kul_qatti: { title: "هل ستأكل قطتي مقلتي؟", price: "2,250.00" },
  maktabat_muntasaf_al_layl: { title: "مكتبة منتصف الليل", price: "1,600.00" },
  
  // Keep some existing popular books
  el9adimon: { title: "القادمون", price: "1,800.00" },
  ard_zikola: { title: "أرض زيكولا", price: "1,200.00" },
  fatat_al_yaka: { title: " فتاة الياقة الزرقاء", price: "1,400.00" },
  beit_khalati: { title: "بيت خالتي", price: "1,600.00" },
  hobbit: { title: "القلق الاستباقي", price: "1,300.00" },
  sapiens: { title: "واحة يعقوب", price: "1,400.00" },
  alchemist: { title: "الهلكوت", price: "1,300.00" },
  warandpeace: { title: "الشيطان يحكي", price: "1,500.00" },
  hitchhikers: { title: "اعادة برمجة جهازك العصبي", price: "1,300.00" },
  lotr: { title: "دليل الحياة الزوجية", price: "1,500.00" },
  frankenstein: { title: "نبوءة قصر السلطان", price: "1,500.00" },
  odyssey: { title: "المخ الابله", price: "1,900.00" },
  mobydick: { title: "وادي الذئاب", price: "1,400.00" },
  crimeandpunishment: { title: "عناق برائحة الورق", price: "1,400.00" },
  catcher: { title: "اعرف وجهك الاخر", price: "1,500.00" },
  anne_of_green_gables: { title: "Anne of Green Gables", price: "850.00", inStock: false },
  amarita: { title: "أماريتا", price: "1,200.00" },
  amwaj_akma: { title: "أمواج أكما", price: "1,450.00" },
  qawaed: { title: "جارتين قواعد", price: "1,350.00" },
  daqat_al_shamo: { title: "دقات الشامو", price: "1,450.00" },
  wadi_al_dhiab: { title: "وادي الذئاب", price: "1,400.00" },
  waha_yaqub: { title: "واحة يعقوب", price: "1,400.00" },
  the_witcher_sword_of_destiny: { title: "ذا ويتشر: سيف المصير", price: "1,600.00" },
  the_witcher_last_wish: { title: "ذا ويتشر: الأمنية الأخيرة", price: "1,500.00" },
  
  // NEW BOOKS - First Half
  abi_alladhi_akraho: { title: "أبي الذي أكره", price: "1,000.00" },
  ash3alni: { title: "أشعلني", price: "2,000.00" },
  al_layali_al_bayda: { title: "الليالي البيضاء", price: "850.00", inStock: false },
  rasail_ila_milina: { title: "رسائل إلى ميلينا", price: "750.00", originalPrice: "900.00", inStock: true, isDiscounted: true },
  kull_azraq_al_sama: { title: "كل أزرق السماء", price: "2,000.00" },
  hakadha_tata3afa: { title: "هكذا تتعافى", price: "1,200.00" },
  caraval: { title: "Caraval", price: "1,500.00" },
  
  // NEW BOOKS - Second Half
  it_ends_with_us: { title: "It Ends With Us", price: "1,400.00" },
  it_starts_with_us: { title: "It Starts With Us", price: "1,200.00" },
  water_moon: { title: "Water Moon", price: "1,500.00" },
  
  majdouline: { title: "ماجدولين", price: "1200.00" },
  la_yumkinuka_iidhaayi: { title: "لا يمكنك إيذائي", price: "1,500.00" },
  twisted_love: { title: "Twisted Love", price: "1,200.00" },
  ugly_love: { title: "Ugly Love", price: "1,200.00" },
  alsadis_ahmar: { title: "السادس احمر", price: "1,300.00" },
  tariq_jahannam: { title: "طريق جهنم", price: "1,900.00" },
  "3inaq_bara2i7a": { title: "عناق برائحة الورق", price: "1,400.00" },
  qadaya_sherlock: { title: "قضايا شيرلوك هولمز", price: "1,200.00" },
  matjar_daljot: { title: "متجر دالجوت للأحلام", price: "1,400.00" },
  yasma3un_hasisaha: { title: "يسمعون حسيسها", price: "2,000.00" },
  al_houl: { title: "الهول", price: "1,000.00" },
  nafar_min_al_jinn: { title: "نفر من الجن", price: "2,000.00" },
  fi_sohbat_al_habib: { title: "في صحبة الحبيب", price: "1,600.00" },
  manhajiyat_al_seer: { title: "منهجية السير إلى الله", price: "1,500.00" },
  inna_rabbi_latif: { title: "إن ربي لطيف", price: "900.00" },
  yaj3al_lak_makhraja: { title: "يجعلك الله لك مخرجا", price: "1,400.00" },
  thani_ithnayn: { title: "ثاني اثنين", price: "1,200.00" },
  ahbabt_wghadan: { title: "أحببت وغدا", price: "1,700.00" },
  ask_and_it_is_given: { title: "اسأل تعط", price: "1,700.00" },
  vagus_nerve_reset: { title: "إعادة برمجة جهازك العصبي", price: "1,300.00" },
  know_your_other_face: { title: "اعرف وجهك الآخر", price: "1,500.00" },
  bouncing_back_from_rejection: { title: "التعافي من الرفض", price: "1,500.00" },
  the_mountain_is_you: { title: "الجبل هو أنت", price: "1,400.00" },
  the_idiot_brain: { title: "المخ الأبله", price: "1,900.00" },
  the_monster_within: { title: "الوحش الذي يسكنك", price: "1,300.00" },
  stop_stress_before_it_stops_you: { title: "ضعي حدا للتوتر", price: "1,300.00" },
  marriage_life_guide: { title: "دليل الحياة الزوجية", price: "1,500.00" },
  your_psychological_complexes: { title: "عقدك النفسية", price: "1,500.00" },
  cant_hurt_me: { title: "لا يمكنك إيذائي", price: "1,900.00" },
  success_in_your_morning: { title: "نجاحك في صباحك", price: "1,450.00" },
  
  // Missing books from the images
  al_baron: { title: "البارون", price: "1,500.00" },
  little_women: { title: "Little Women", price: "900.00" },
  oliver_twist: { title: "Oliver Twist", price: "1,800.00" },
  pride_and_prejudice: { title: "Pride and Prejudice", price: "1,400.00" },
  anne_of_green_gables: { title: "Anne of Green Gables", price: "850.00" },
  hasees: { title: "هسيس", price: "1,200.00" },
  hatha_ma_hadath_maaha: { title: "هذا ما حدث معها", price: "1,400.00" },
  
  // Added: The Kite Runner (Arabic) and The Hunger Games
  adaa_al_ta2ira_al_waraqiya: { title: "عداء الطائرة الورقية", price: "1,500.00" },
  the_hunger_games: { title: "The Hunger Games", price: "1,600.00" }
};
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
    const title = books[id] ? books[id].title : id;
    li.innerHTML = `
      <span>${title}</span>
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

window.onload = loadCart; 