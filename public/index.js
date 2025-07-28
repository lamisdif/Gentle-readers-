// JavaScript extracted from index.html
// (No inline <script> blocks found in the first 250 lines. If present later, will extract in next batch.) 

// Add RTL/LTR support and language switcher logic
const translations = {
  en: {
    HOME: "HOME",
    PAGES: "PAGES",
    RELIGIOUS: "RELIGIOUS",
    ROMANCE: "ROMANCE",
    FICTION: "FICTION",
    DEVELOPMENT: "DEVELOPMENT",
    HORROR: "HORROR",
    NOVELS: "NOVELS",
    "MY ACCOUNT": "MY ACCOUNT",
    "Explore": "Explore",
    "GOOD ONLINE": "GOOD ONLINE",
    "Latest books online": "Latest books online",
    "MORE GOOD ONLINE": "MORE GOOD ONLINE",
    "More Latest books online": "More Latest books online",
    "Book Summary": "Book Summary",
    "Price": "Price",
    "Welcome to GentleReaders": "Welcome to GentleReaders",
    "Your Next Great Read Awaits": "Your Next Great Read Awaits",
    "Inkwooven For GentleReaders": "Inkwooven For GentleReaders",
    "Browse Books": "Browse Books",
    "Stay in touch with GentleReaders, follow us on social media and learn about new promotions!": "Stay in touch with GentleReaders, follow us on social media and learn about new promotions!",
    "Every book you pick up has its own humor or trauma, and gets either the bad or good from whatever it read.": "Every book you pick up has its own humor or trauma, and gets either the bad or good from whatever it read.",
    "JOHNATAN MASST": "JOHNATAN MASST",
    desc_book1: "A timeless tale of love, class, and societal expectations. Elizabeth Bennet navigates the complexities of Regency-era England.",
    desc_book2: "A compelling narrative about a mysterious land and its inhabitants, exploring themes of identity, belonging, and the search for meaning in an unfamiliar world.",
    desc_book3: "A story about a girl with a distinctive collar, exploring themes of uniqueness, social expectations, and the courage to be different in a conformist world.",
    desc_book4: "A nostalgic journey back to an aunt's house, filled with memories, family bonds, and the warmth of childhood experiences that shape who we become.<br/><span class='book-isbn'>ISBN: 9789779921136</span>",
    desc_book5: "An insightful exploration of anticipatory anxiety and how to manage the psychological challenges of modern life.",
    desc_book6: "A tale of refuge and renewal, where an oasis becomes a symbol of hope and transformation in the midst of life's challenges.",
    desc_book7: "A philosophical exploration of destruction and renewal, examining the cycles of life and the inevitability of change.",
    desc_book8: "A dark and compelling narrative where the devil himself tells stories, revealing the hidden truths and moral complexities of human nature.",
    desc_book9: "A comprehensive guide to self-development and reprogramming the mind to achieve success and happiness in life.",
    desc_book10: "A comprehensive guide to a successful married life, covering the foundations of a healthy relationship and effective communication between spouses.",
    desc_book11: "A mysterious prophecy unfolds within the walls of a sultan's palace, revealing secrets that could change the course of history.",
    desc_book12: "An exploration of the insatiable mind and its endless quest for knowledge, understanding, and meaning in life.",
    desc_book13: "A thrilling adventure set in a mysterious valley where danger and discovery await, exploring themes of survival and primal instincts.<br/><span class='book-isbn'>ISBN: 9789931886655</span>",
    desc_book14: "A sensual and evocative tale exploring the power of scent and touch in human relationships, where memories are intertwined with fragrance.",
    desc_book15: "A journey of self-discovery and identity exploration, where the protagonist learns to recognize and accept their true self.",
    desc_book16: "A compelling narrative about a mysterious land and its inhabitants, exploring themes of identity, belonging, and the search for meaning in an unfamiliar world.",
  },
  ar: {
    HOME: "الرئيسية",
    PAGES: "الصفحات",
    RELIGIOUS: "ديني",
    ROMANCE: "رومانسي",
    FICTION: "خيال",
    DEVELOPMENT: "تطوير الذات",
    HORROR: "رعب",
    NOVELS: "روايات",
    "MY ACCOUNT": "حسابي",
    "Explore": "استكشف",
    "GOOD ONLINE": "كتب مميزة",
    "Latest books online": "أحدث الكتب المضافة",
    "MORE GOOD ONLINE": "كتب مميزة أخرى",
    "More Latest books online": "المزيد من أحدث الكتب",
    "Book Summary": "ملخص الكتاب",
    "Price": "السعر",
    "Welcome to GentleReaders": "مرحباً بكم في جنتل ريدرز",
    "Your Next Great Read Awaits": "قراءتك العظيمة التالية بانتظارك",
    "Inkwooven For GentleReaders": "حبر منسوج لجنتل ريدرز",
    "Browse Books": "تصفح الكتب",
    "Stay in touch with GentleReaders, follow us on social media and learn about new promotions!": "ابقَ على تواصل مع جنتل ريدرز، تابعنا على وسائل التواصل الاجتماعي وتعرف على العروض الجديدة!",
    "Every book you pick up has its own humor or trauma, and gets either the bad or good from whatever it read.": "كل كتاب تلتقطه له طابعه الخاص من الفكاهة أو الدراما، ويأخذ الجيد أو السيء مما قرأه.",
    "JOHNATAN MASST": "جوناثان ماست",
    desc_book1: "قصة خيالية عن الحب والفوارق الطبقية وتوقعات المجتمع في إنجلترا القديمة.",
    desc_book2: "رواية مشوقة عن أرض غامضة وسكانها، تدور حول الهوية والانتماء والبحث عن المعنى.",
    desc_book3: "قصة عن فتاة ذات ياقة مميزة، تدور حول التميز وتوقعات المجتمع وشجاعة الاختلاف.",
    desc_book4: "رحلة حنين إلى بيت الخالة، مليئة بذكريات الطفولة وروابط الأسرة التي تشكل فهمنا للانتماء والمنزل.<br/><span class='book-isbn'>ردمك: 9789779921136</span>",
    desc_book5: "استكشاف عميق للقلق الاستباقي وكيفية إدارة التحديات النفسية في الحياة الحديثة.",
    desc_book6: "قصة عن الملاذ والتجدد، حيث تصبح الواحة رمزاً للأمل والتحول وسط تحديات الحياة.",
    desc_book7: "استكشاف فلسفي للهدم والتجدد، ودراسة دورات الحياة وحتمية التغيير.",
    desc_book8: "سرد مظلم وجذاب حيث يروي الشيطان قصصاً تكشف عن تعقيدات الطبيعة البشرية.",
    desc_book9: "دليل شامل لتطوير الذات وإعادة برمجة العقل لتحقيق النجاح والسعادة.",
    desc_book10: "دليل شامل لحياة زوجية ناجحة، يغطي أسس العلاقة الصحية والتواصل الفعال بين الزوجين.",
    desc_book11: "نبوءة غامضة تتكشف داخل قصر السلطان، تكشف أسراراً قد تغير مجرى التاريخ.",
    desc_book12: "استكشاف للعقل اللامحدود وسعيه الدائم للمعرفة والفهم والمعنى في الحياة.",
    desc_book13: "مغامرة مثيرة في وادٍ غامض حيث تنتظر المخاطر والاكتشافات، وتدور حول البقاء وغرائز الإنسان.<br/><span class='book-isbn'>ردمك: 9789931886655</span>",
    desc_book14: "قصة حسية تستكشف قوة الذكريات والعلاقات الإنسانية المرتبطة بالعطر واللمس.",
    desc_book15: "رحلة لاكتشاف الذات واستكشاف الهوية، حيث يتعلم البطل التعرف على نفسه الحقيقية وقبولها.",
    desc_book16: "رواية مشوقة عن أرض غامضة وسكانها، تدور حول الهوية والانتماء والبحث عن المعنى.",
  }
};

function setLanguage(lang) {
  document.body.setAttribute('lang', lang);
  if (lang === 'ar') {
    document.body.style.direction = 'rtl';
    document.body.style.textAlign = 'right';
  } else {
    document.body.style.direction = 'ltr';
    document.body.style.textAlign = 'left';
  }
  // Sidebar/menu
  document.getElementById('nav-home').textContent = translations[lang].HOME;
  document.getElementById('nav-pages').childNodes[0].textContent = translations[lang].PAGES + ' ';
  document.getElementById('nav-religious').textContent = translations[lang].RELIGIOUS;
  document.getElementById('nav-romance').textContent = translations[lang].ROMANCE;
  document.getElementById('nav-fiction').textContent = translations[lang].FICTION;
  document.getElementById('nav-development').textContent = translations[lang].DEVELOPMENT;
  document.getElementById('nav-horror').textContent = translations[lang].HORROR;
  document.getElementById('nav-novels').textContent = translations[lang].NOVELS;
  var acc = document.getElementById('nav-account');
  if (acc) acc.textContent = translations[lang]["MY ACCOUNT"];
  document.querySelector('.explore-btn-sidebar').textContent = translations[lang]["Explore"];

  // Hero section
  document.getElementById('hero-welcome').textContent = translations[lang]["Welcome to GentleReaders"];
  document.getElementById('hero-title').textContent = translations[lang]["Your Next Great Read Awaits"];
  document.getElementById('hero-desc').textContent = translations[lang]["Inkwooven For GentleReaders"];
  document.getElementById('hero-browse').textContent = translations[lang]["Browse Books"];

  // Genre cards
  var strips = document.querySelectorAll('.strip-title');
  var genreKeys = ["RELIGIOUS", "ROMANCE", "FICTION", "DEVELOPMENT", "HORROR", "NOVELS"];
  strips.forEach(function(el, i) {
    el.textContent = translations[lang][genreKeys[i]];
  });

  // Section headers
  document.getElementById('section-good-online').textContent = translations[lang]["GOOD ONLINE"];
  document.getElementById('section-latest-books').textContent = translations[lang]["Latest books online"];

  // Book descriptions (first slider)
  for (let i = 1; i <= 8; i++) {
    var desc = document.getElementById('desc-book' + i);
    if (desc) desc.innerHTML = translations[lang]['desc_book' + i];
  }
  // Book descriptions (second slider)
  for (let i = 9; i <= 16; i++) {
    var desc = document.getElementById('desc-book' + i);
    if (desc) desc.innerHTML = translations[lang]['desc_book' + i];
  }

  // Second section headers
  var moreGood = document.querySelectorAll('.section-header .sub-title');
  if (moreGood[1]) moreGood[1].textContent = translations[lang]["MORE GOOD ONLINE"];
  var moreLatest = document.querySelectorAll('.section-header .main-title');
  if (moreLatest[1]) moreLatest[1].textContent = translations[lang]["More Latest books online"];

  // Quote section
  document.getElementById('quote-main').textContent = translations[lang]["Every book you pick up has its own humor or trauma, and gets either the bad or good from whatever it read."];
  document.getElementById('quote-author').textContent = translations[lang]["JOHNATAN MASST"];

  // Footer
  document.getElementById('footer-brand').textContent = 'GentleReaders';
  document.getElementById('footer-desc').textContent = translations[lang]["Stay in touch with GentleReaders, follow us on social media and learn about new promotions!"];

  // Book summary headers
  document.querySelectorAll('.flip-book-card-back-content h4').forEach(function(el) {
    el.textContent = translations[lang]["Book Summary"];
  });
  // Book price labels
  document.querySelectorAll('.book-price').forEach(function(el) {
    var price = el.textContent.match(/\d+[\d,.]*/);
    el.textContent = translations[lang]["Price"] + ': ' + (price ? price[0] : '');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var lang = localStorage.getItem('lang') || 'en';
  setLanguage(lang);

  // Language switcher logic
  var btnEn = document.getElementById('btn-en');
  var btnAr = document.getElementById('btn-ar');
  if (btnEn && btnAr) {
    btnEn.onclick = function() {
      localStorage.setItem('lang', 'en');
      setLanguage('en');
    };
    btnAr.onclick = function() {
      localStorage.setItem('lang', 'ar');
      setLanguage('ar');
    };
  }
}); 