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
  
  // Sidebar/menu - with error handling
  try {
    var navHome = document.getElementById('nav-home');
    if (navHome) navHome.textContent = translations[lang].HOME;
    
    var navPages = document.getElementById('nav-pages');
    if (navPages && navPages.childNodes[0]) navPages.childNodes[0].textContent = translations[lang].PAGES + ' ';
    
    var navReligious = document.getElementById('nav-religious');
    if (navReligious) navReligious.textContent = translations[lang].RELIGIOUS;
    
    var navRomance = document.getElementById('nav-romance');
    if (navRomance) navRomance.textContent = translations[lang].ROMANCE;
    
    var navFiction = document.getElementById('nav-fiction');
    if (navFiction) navFiction.textContent = translations[lang].FICTION;
    
    var navDevelopment = document.getElementById('nav-development');
    if (navDevelopment) navDevelopment.textContent = translations[lang].DEVELOPMENT;
    
    var navHorror = document.getElementById('nav-horror');
    if (navHorror) navHorror.textContent = translations[lang].HORROR;
    
    var navNovels = document.getElementById('nav-novels');
    if (navNovels) navNovels.textContent = translations[lang].NOVELS;
    
    var acc = document.getElementById('nav-account');
    if (acc) acc.textContent = translations[lang]["MY ACCOUNT"];
    
    var exploreBtn = document.querySelector('.explore-btn-sidebar');
    if (exploreBtn) exploreBtn.textContent = translations[lang]["Explore"];
  } catch (e) {
    console.log('Some navigation elements not found:', e);
  }

  // Hero section - with error handling
  try {
    var heroWelcome = document.getElementById('hero-welcome');
    if (heroWelcome) heroWelcome.textContent = translations[lang]["Welcome to GentleReaders"];
    
    var heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = translations[lang]["Your Next Great Read Awaits"];
    
    var heroDesc = document.getElementById('hero-desc');
    if (heroDesc) heroDesc.textContent = translations[lang]["Inkwooven For GentleReaders"];
    
    var heroBrowse = document.getElementById('hero-browse');
    if (heroBrowse) heroBrowse.textContent = translations[lang]["Browse Books"];
  } catch (e) {
    console.log('Some hero elements not found:', e);
  }

  // Genre cards - with error handling
  try {
    var strips = document.querySelectorAll('.strip-title');
    var genreKeys = ["RELIGIOUS", "ROMANCE", "FICTION", "DEVELOPMENT", "HORROR", "NOVELS"];
    strips.forEach(function(el, i) {
      if (genreKeys[i]) {
        el.textContent = translations[lang][genreKeys[i]];
      }
    });
  } catch (e) {
    console.log('Genre cards translation error:', e);
  }

  // Section headers - with error handling
  try {
    var sectionGoodOnline = document.getElementById('section-good-online');
    if (sectionGoodOnline) sectionGoodOnline.textContent = translations[lang]["GOOD ONLINE"];
    
    var sectionLatestBooks = document.getElementById('section-latest-books');
    if (sectionLatestBooks) sectionLatestBooks.textContent = translations[lang]["Latest books online"];
  } catch (e) {
    console.log('Section headers translation error:', e);
  }

  // Book descriptions (first slider) - with error handling
  try {
    for (let i = 1; i <= 8; i++) {
      var desc = document.getElementById('desc-book' + i);
      if (desc && translations[lang]['desc_book' + i]) {
        desc.innerHTML = translations[lang]['desc_book' + i];
      }
    }
  } catch (e) {
    console.log('First slider translation error:', e);
  }
  
  // Book descriptions (second slider) - with error handling
  try {
    for (let i = 9; i <= 16; i++) {
      var desc = document.getElementById('desc-book' + i);
      if (desc && translations[lang]['desc_book' + i]) {
        desc.innerHTML = translations[lang]['desc_book' + i];
      }
    }
  } catch (e) {
    console.log('Second slider translation error:', e);
  }

  // Second section headers - with error handling
  try {
    var moreGood = document.querySelectorAll('.section-header .sub-title');
    if (moreGood[1]) moreGood[1].textContent = translations[lang]["MORE GOOD ONLINE"];
    
    var moreLatest = document.querySelectorAll('.section-header .main-title');
    if (moreLatest[1]) moreLatest[1].textContent = translations[lang]["More Latest books online"];
  } catch (e) {
    console.log('Second section headers translation error:', e);
  }

  // Quote section - with error handling
  try {
    var quoteMain = document.getElementById('quote-main');
    if (quoteMain) quoteMain.textContent = translations[lang]["Every book you pick up has its own humor or trauma, and gets either the bad or good from whatever it read."];
    
    var quoteAuthor = document.getElementById('quote-author');
    if (quoteAuthor) quoteAuthor.textContent = translations[lang]["JOHNATAN MASST"];
  } catch (e) {
    console.log('Quote section translation error:', e);
  }

  // Footer - with error handling
  try {
    var footerBrand = document.getElementById('footer-brand');
    if (footerBrand) footerBrand.textContent = 'GentleReaders';
    
    var footerDesc = document.getElementById('footer-desc');
    if (footerDesc) footerDesc.textContent = translations[lang]["Stay in touch with GentleReaders, follow us on social media and learn about new promotions!"];
  } catch (e) {
    console.log('Footer translation error:', e);
  }

  // Book summary headers - with error handling
  try {
    document.querySelectorAll('.flip-book-card-back-content h4').forEach(function(el) {
      el.textContent = translations[lang]["Book Summary"];
    });
  } catch (e) {
    console.log('Book summary headers translation error:', e);
  }
  
  // Book price labels - with error handling
  try {
    document.querySelectorAll('.book-price').forEach(function(el) {
      var price = el.textContent.match(/\d+[\d,.]*/);
      el.textContent = translations[lang]["Price"] + ': ' + (price ? price[0] : '');
    });
  } catch (e) {
    console.log('Book price labels translation error:', e);
  }
  
  // Genre page hero sections - with error handling
  try {
    // Religious page hero
    var religiousTitle = document.getElementById('religious-hero-title');
    if (religiousTitle) {
      religiousTitle.textContent = lang === 'ar' ? 'كتب دينية' : 'Religious';
    }
    var religiousDesc = document.getElementById('religious-hero-desc');
    if (religiousDesc) {
      religiousDesc.textContent = lang === 'ar' ? 'قصص دينية وإرشادات روحية' : 'A curated collection of religious books to enrich the soul and mind.';
    }
    
    // Romance page hero
    var romanceTitle = document.getElementById('romance-hero-title');
    if (romanceTitle) {
      romanceTitle.textContent = lang === 'ar' ? 'رومانسي' : 'Romance';
    }
    var romanceDesc = document.getElementById('romance-hero-desc');
    if (romanceDesc) {
      romanceDesc.textContent = lang === 'ar' ? 'قصص حب وعاطفة' : 'Love stories that touch the heart';
    }
    
    // Fiction page hero
    var fictionTitle = document.getElementById('fiction-hero-title');
    if (fictionTitle) {
      fictionTitle.textContent = lang === 'ar' ? 'خيال' : 'Fiction';
    }
    var fictionDesc = document.getElementById('fiction-hero-desc');
    if (fictionDesc) {
      fictionDesc.textContent = lang === 'ar' ? 'قصص خيالية وسرد إبداعي' : 'Imaginative stories and creative narratives';
    }
    
    // Development page hero
    var developmentTitle = document.getElementById('development-hero-title');
    if (developmentTitle) {
      developmentTitle.textContent = lang === 'ar' ? 'تطوير الذات' : 'Development';
    }
    var developmentDesc = document.getElementById('development-hero-desc');
    if (developmentDesc) {
      developmentDesc.textContent = lang === 'ar' ? 'كتب المساعدة الذاتية والنمو الشخصي' : 'Self-help and personal growth books';
    }
    
    // Horror page hero
    var horrorTitle = document.getElementById('horror-hero-title');
    if (horrorTitle) {
      horrorTitle.textContent = lang === 'ar' ? 'رعب' : 'Horror';
    }
    var horrorDesc = document.getElementById('horror-hero-desc');
    if (horrorDesc) {
      horrorDesc.textContent = lang === 'ar' ? 'قصص تثير الخوف والغموض' : 'Stories that inspire fear and mystery';
    }
    
    // Novels page hero
    var novelsTitle = document.getElementById('novels-hero-title');
    if (novelsTitle) {
      novelsTitle.textContent = lang === 'ar' ? 'روايات' : 'Novels';
    }
    var novelsDesc = document.getElementById('novels-hero-desc');
    if (novelsDesc) {
      novelsDesc.textContent = lang === 'ar' ? 'قصص خالدة وسرد آسر' : 'Discover timeless stories and captivating narratives';
    }
  } catch (e) {
    console.log('Genre page hero sections translation error:', e);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var lang = localStorage.getItem('lang') || 'en';
  setLanguage(lang);

  // Language switcher logic
  var btnEn = document.getElementById('btn-en');
  var btnAr = document.getElementById('btn-ar');
  var btnEnMobile = document.getElementById('btn-en-mobile');
  var btnArMobile = document.getElementById('btn-ar-mobile');
  var langToggle = document.getElementById('lang-toggle');
  var langToggleMobile = document.getElementById('lang-toggle-mobile');
  
  // Function to handle language switching
  function switchToEnglish() {
    localStorage.setItem('lang', 'en');
    setLanguage('en');
    // Update toggle buttons
    if (langToggle) langToggle.textContent = 'AR';
    if (langToggleMobile) langToggleMobile.textContent = 'AR';
  }
  
  function switchToArabic() {
    localStorage.setItem('lang', 'ar');
    setLanguage('ar');
    // Update toggle buttons
    if (langToggle) langToggle.textContent = 'EN';
    if (langToggleMobile) langToggleMobile.textContent = 'EN';
  }
  
  // Desktop language buttons
  if (btnEn && btnAr) {
    btnEn.onclick = switchToEnglish;
    btnAr.onclick = switchToArabic;
  }
  
  // Mobile language buttons
  if (btnEnMobile && btnArMobile) {
    btnEnMobile.onclick = switchToEnglish;
    btnArMobile.onclick = switchToArabic;
  }
  
  // Toggle button functionality
  if (langToggle) {
    langToggle.onclick = function() {
      if (langToggle.textContent === 'AR') {
        switchToArabic();
      } else {
        switchToEnglish();
      }
    };
  }
  
  if (langToggleMobile) {
    langToggleMobile.onclick = function() {
      if (langToggleMobile.textContent === 'AR') {
        switchToArabic();
      } else {
        switchToEnglish();
      }
    };
  }
  
  // Set initial toggle button text
  if (lang === 'ar') {
    if (langToggle) langToggle.textContent = 'EN';
    if (langToggleMobile) langToggleMobile.textContent = 'EN';
  } else {
    if (langToggle) langToggle.textContent = 'AR';
    if (langToggleMobile) langToggleMobile.textContent = 'AR';
  }
}); 