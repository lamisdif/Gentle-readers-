// JavaScript extracted from checkout.html

document.addEventListener('DOMContentLoaded', function() {
  setLanguage(localStorage.getItem('lang') || 'en');
});
// Full authoritative list of all books in the bookstore (copied from search.html)
const books = {
  el9adimon: { title: "القادمون", author: "أحمد خالد مصطفى", price: "1,800.00" },
  ard_zikola: { title: "أرض زيكولا", author: "عمرو عبد الحميد", price: "1,200.00" },
  fatat_al_yaka: { title: "فتاة الياقة", author: "عمرو عبد الحميد", price: "1,400.00" },
  beit_khalati: { title: "بيت خالتي", author: "أحمد خيري العمري", price: "1,600.00" },
  hobbit: { title: "القلق الاستباقي", author: "د.سالي م.وينستون د.مارتن ن.سيف", price: "1,300.00" },
  sapiens: { title: "واحة يعقوب", author: "عمرو عبد الحميد", price: "1,400.00" },
  alchemist: { title: "الهلكوت", author: "أحمد خالد مصطفى", price: "1,300.00" },
  warandpeace: { title: "الشيطان يحكي", author: "أحمد خالد مصطفى", price: "1,500.00" },
  hitchhikers: { title: "اعادة برمجة", author: "انا فيرجسون", price: "1,300.00" },
  lotr: { title: "دليل الحياة الزوجية", author: "كيفن ليمان", price: "1,500.00" },
  frankenstein: { title: "نبوءة قصر السلطان", author: "مروى جوهر", price: "1,500.00" },
  odyssey: { title: "المخ الابله", author: "دين برنيت", price: "1,900.00" },
  mobydick: { title: "وادي الذئاب", author: "عمرو عبد الحميد", price: "1,400.00" },
  crimeandpunishment: { title: "عناق برائحة", author: "منى سلامة", price: "1,400.00" },
  catcher: { title: "اعرف وجهك الاخر", author: "د.يوسف الحسني", price: "1,500.00" },
  amarita: { title: "أماريتا", author: "عمرو عبد الحميد", price: "1,200.00" },
  amwaj_akma: { title: "أمواج أكما", author: "عمرو عبد الحميد", price: "1,450.00" },
  qawaed: { title: "جارتين قواعد", author: "عمرو عبد الحميد", price: "1,350.00" },
  daqat_al_shamo: { title: "دقات الشامو", author: "عمرو عبد الحميد", price: "1,450.00" },
  wadi_al_dhiab: { title: "وادي الذئاب", author: "عمرو عبد الحميد", price: "1,400.00" },
  waha_yaqub: { title: "واحة يعقوب", author: "عمرو عبد الحميد", price: "1,400.00" },
  the_witcher_sword_of_destiny: { title: "ذا ويتشر: سيف المصير", author: "أندجي سابكوفيسكي", price: "1,600.00" },
  the_witcher_last_wish: { title: "ذا ويتشر: الأمنية الأخيرة", author: "أندجي سابكوفيسكي", price: "1,500.00" },
  it_ends_with_us: { title: "It Ends With Us", author: "Colleen Hoover", price: "1,200.00" },
  it_starts_with_us: { title: "It Starts With Us", author: "Colleen Hoover", price: "1,200.00" },
  twisted_love: { title: "Twisted Love", author: "Ana Huang", price: "1,200.00" },
  ugly_love: { title: "Ugly Love", author: "Colleen Hoover", price: "1,200.00" },
  ghusoon_bunduq_1: { title: "غصون البندق - الكتاب الأول", author: "منى سلامة", price: "1,200.00" },
  ghusoon_bunduq_2: { title: "غصون البندق - الكتاب الثاني", author: "منى سلامة", price: "1,200.00" },
  alsadis_ahmar: { title: "السادس احمر", author: "أحمد خيري العمري", price: "1,300.00" },
  tariq_jahannam: { title: "طريق جهنم", author: "أيمن العتوم", price: "1,900.00" },
  "3inaq_bara2i7a": { title: "عناق برائحة", author: "منى سلامة", price: "1,400.00" },
  qadaya_sherlock: { title: "قضايا شيرلوك هولمز", author: "أرثر كونان دويل", price: "1,600.00" },
  matjar_daljot: { title: "متجر دالجوت للأحلام", author: "لي مي بيه", price: "1,400.00" },
  hal_sata2kul_qatti: { title: "هل ستأكل قطتي مقلتي", author: "كيتلين دوتي", price: "2,250.00" },
  yasma3un_hasisaha: { title: "يسمعون حسيسها", author: "أيمن العتوم", price: "2,000.00" },
  al_houl: { title: "الهول", author: "أحمد خالد توفيق", price: "1,000.00" },
  nafar_min_al_jinn: { title: "نفر من الجن", author: "أيمن العتوم", price: "2,000.00" },
  fi_sohbat_al_habib: { title: "في صحبة الحبيب", author: "د. كفاح أبو هنود", price: "1,600.00" },
  manhajiyat_al_seer: { title: "منهجية السير إلى الله", author: "د. كفاح أبو هنود", price: "1,500.00" },
  inna_rabbi_latif: { title: "إن ربي لطيف", author: "عبدالرحمن مسعد", price: "900.00" },
  yaj3al_lak_makhraja: { title: "يجعلك الله لك مخرجا", author: "أحمد الصابوني", price: "1,400.00" },
  thani_ithnayn: { title: "ثاني اثنين", author: "أدهم شرقاوي", price: "1,200.00" },
  ahbabt_wghadan: { title: "أحببت وغدا", author: "د. عماد رشاد عثمان", price: "1,700.00" },
  ask_and_it_is_given: { title: "اسأل تعط", author: "إستر وجيري هيكس", price: "1,700.00" },
  vagus_nerve_reset: { title: "إعادة برمجة جهازك العصبي", author: "آنا فيرجسون", price: "1,300.00" },
  know_your_other_face: { title: "اعرف وجهك الآخر", author: "د. يوسف الحسني", price: "1,500.00" },
  bouncing_back_from_rejection: { title: "التعافي من الرفض", author: "د. ليزلي بيكر فيلبس", price: "1,500.00" },
  the_mountain_is_you: { title: "الجبل هو أنت", author: "بريانا ويست", price: "1,400.00" },
  the_idiot_brain: { title: "المخ الأبله", author: "دين برنيت", price: "1,900.00" },
  the_monster_within: { title: "الوحش الذي يسكنك", author: "إيناس سمير", price: "1,300.00" },
  stop_stress_before_it_stops_you: { title: "ضعي حدا للتوتر", author: "كيفن ليمان", price: "1,300.00" },
  marriage_life_guide: { title: "دليل الحياة الزوجية", author: "كيفن ليمان", price: "1,500.00" },
  your_psychological_complexes: { title: "عقدك النفسية", author: "د. يوسف الحسني", price: "1,500.00" },
  cant_hurt_me: { title: "لا يمكنك إيذائي", author: "ديفيد جوجينز", price: "1,900.00" },
  success_in_your_morning: { title: "نجاحك في صباحك", author: "بنيامين سبول ومايكل زاندر", price: "1,450.00" }
};

function getCurrentLang() {
  return localStorage.getItem('lang') || 'en';
}

function getBookTitle(book, lang) {
  // If you want to support English/Arabic titles, add both to the books object and select here
  return book.title;
}

function loadOrderSummary() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartItemsDiv = document.getElementById("cartItems");
  const orderDetailsDiv = document.getElementById("orderDetails");
  const totalPriceLabel = document.getElementById("totalPrice");
  let subtotal = 0;
  cartItemsDiv.innerHTML = "";
  orderDetailsDiv.innerHTML = "";
  const lang = getCurrentLang();
  cart.forEach(bookId => {
    const book = books[bookId];
    if (!book) {
      const itemDiv = document.createElement("div");
      itemDiv.className = "book-item";
      itemDiv.innerHTML = `<span>Book not found</span><span>0 DZD</span>`;
      cartItemsDiv.appendChild(itemDiv);
      const detailDiv = document.createElement("span");
      detailDiv.innerHTML = `Book not found`;
      const priceDiv = document.createElement("span");
      priceDiv.innerHTML = `0 DZD`;
      orderDetailsDiv.appendChild(detailDiv);
      orderDetailsDiv.appendChild(priceDiv);
      return;
    }
    let price = 0;
    if (book.price) {
      price = parseFloat(book.price.replace(/[^\d.]/g, ""));
    }
    subtotal += price;
    const itemDiv = document.createElement("div");
    itemDiv.className = "book-item";
    itemDiv.innerHTML = `<span>${getBookTitle(book, lang)}</span><span>${price} DZD</span>`;
    cartItemsDiv.appendChild(itemDiv);
    const detailDiv = document.createElement("span");
    detailDiv.innerHTML = `${getBookTitle(book, lang)}`;
    const priceDiv = document.createElement("span");
    priceDiv.innerHTML = `${price} DZD`;
    orderDetailsDiv.appendChild(detailDiv);
    orderDetailsDiv.appendChild(priceDiv);
  });
  totalPriceLabel.textContent = `${subtotal} DZD`;
}
document.addEventListener("DOMContentLoaded", loadOrderSummary);
document.getElementById("checkoutForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  // Collect form data
  const firstName = document.getElementById("checkout-name-input").value.trim();
  const familyName = document.getElementById("checkout-family-input").value.trim();
  const phoneNumber = document.getElementById("checkout-number-input").value.trim();
  const deliveryMethod = document.getElementById("checkout-delivery-select").value;
  const items = JSON.parse(localStorage.getItem("cart")) || [];

  // Basic validation
  if (!firstName || !familyName || !phoneNumber || !deliveryMethod || items.length === 0) {
    alert("Please fill in all fields and make sure your cart is not empty.");
    return;
  }

  // Send to backend
  try {
    const response = await fetch("http://127.0.0.1:3000/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ firstName, familyName, phoneNumber, deliveryMethod, items })
    });
    const data = await response.json();
    if (response.ok) {
      alert("Order submitted successfully! Order ID: " + data.orderId);
      localStorage.removeItem("cart");
      window.location.href = "index.html";
    } else {
      alert("Error: " + (data.error || "Failed to submit order."));
    }
  } catch (err) {
    alert("Network error. Please try again later.");
  }
});
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
window.addEventListener('DOMContentLoaded', animateOnScroll); 