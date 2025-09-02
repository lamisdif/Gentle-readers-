// JavaScript extracted from cart.html
const books = {
  el9adimon: { title: "القادمون" },
  ard_zikola: { title: "أرض زيكولا" },
  fatat_al_yaka: { title: " فتاة الياقة الزرقاء" },
  beit_khalati: { title: "بيت خالتي" },
  hobbit: { title: "القلق الاستباقي" },
  sapiens: { title: "واحة يعقوب" },
  alchemist: { title: "الهلكوت" },
  warandpeace: { title: "الشيطان يحكي" },
  hitchhikers: { title: "اعادة برمجة جهازك العصبي" },
  lotr: { title: "دليل الحياة الزوجية" },
  frankenstein: { title: "نبوءة قصر السلطان" },
  odyssey: { title: "المخ الابله" },
  mobydick: { title: "وادي الذئاب" },
  crimeandpunishment: { title: "عناق برائحة الورق" },
  catcher: { title: "اعرف وجهك الاخر" },
  amarita: { title: "أماريتا" },
  amwaj_akma: { title: "أمواج أكما" },
  qawaed: { title: "جارتين قواعد" },
  daqat_al_shamo: { title: "دقات الشامو" },
  wadi_al_dhiab: { title: "وادي الذئاب" },
  waha_yaqub: { title: "واحة يعقوب" },
  the_witcher_sword_of_destiny: { title: "ذا ويتشر: سيف المصير" },
  the_witcher_last_wish: { title: "ذا ويتشر: الأمنية الأخيرة" },
  it_ends_with_us: { title: "It Ends With Us" },
  it_starts_with_us: { title: "It Starts With Us" },
  twisted_love: { title: "Twisted Love" },
  ugly_love: { title: "Ugly Love" },
  ghusoon_bunduq_1: { title: "غصون البندق - الكتاب الأول" },
  ghusoon_bunduq_2: { title: "غصون البندق - الكتاب الثاني" },
  alsadis_ahmar: { title: "السادس احمر" },
  tariq_jahannam: { title: "طريق جهنم" },
  "3inaq_bara2i7a": { title: "عناق برائحة الورق" },
  qadaya_sherlock: { title: "قضايا شيرلوك هولمز" },
  matjar_daljot: { title: "متجر دالجوت للأحلام" },
  hal_sata2kul_qatti: { title: "هل ستأكل قطتي مقلتي" },
  yasma3un_hasisaha: { title: "يسمعون حسيسها" },
  al_houl: { title: "الهول" },
  nafar_min_al_jinn: { title: "نفر من الجن" },
  fi_sohbat_al_habib: { title: "في صحبة الحبيب" },
  manhajiyat_al_seer: { title: "منهجية السير إلى الله" },
  inna_rabbi_latif: { title: "إن ربي لطيف" },
  yaj3al_lak_makhraja: { title: "يجعلك الله لك مخرجا" },
  thani_ithnayn: { title: "ثاني اثنين" },
  ahbabt_wghadan: { title: "أحببت وغدا" },
  ask_and_it_is_given: { title: "اسأل تعط" },
  vagus_nerve_reset: { title: "إعادة برمجة جهازك العصبي" },
  know_your_other_face: { title: "اعرف وجهك الآخر" },
  bouncing_back_from_rejection: { title: "التعافي من الرفض" },
  the_mountain_is_you: { title: "الجبل هو أنت" },
  the_idiot_brain: { title: "المخ الأبله" },
  the_monster_within: { title: "الوحش الذي يسكنك" },
  stop_stress_before_it_stops_you: { title: "ضعي حدا للتوتر" },
  marriage_life_guide: { title: "دليل الحياة الزوجية" },
  your_psychological_complexes: { title: "عقدك النفسية" },
  cant_hurt_me: { title: "لا يمكنك إيذائي" },
  success_in_your_morning: { title: "نجاحك في صباحك" }
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