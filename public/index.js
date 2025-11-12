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
    desc_book1: "Days of Abandonment is a powerful novel about a woman's emotional breakdown after her husband leaves her. Set in Naples, it explores themes of abandonment, motherhood, and the struggle to maintain sanity when life falls apart.",
    desc_book2: "Atomic Habits offers a proven framework for improving every day. Learn how tiny changes in behavior can result in remarkable outcomes. This book shows you how to build good habits and break bad ones using practical strategies.",
    desc_book3: "Eva Luna is a magical realist novel about a young woman with the gift of storytelling. Born in the jungle, she navigates through love, revolution, and the power of imagination in Latin America, creating her own destiny through her stories.",
    desc_book4: "The first book in the Hazelnut Branches series explores themes of growth, resilience, and the beauty of nature. A story that connects human emotions with the natural world, following characters as they discover strength in unexpected places.",
    desc_book5: "The second book continues the journey of growth and discovery, deepening the connection between human experience and the natural world. Characters face new challenges and discover deeper truths about themselves and their relationships.",
    desc_book6: "Part of The School of Life series, this book explores the philosophy and psychology of love. It offers insights into how to find and maintain meaningful relationships, examining the complexities of modern love and attachment.",
    desc_book7: "Another installment from The School of Life series, focusing on finding joy in everyday moments and appreciating the small pleasures that make life beautiful. It teaches readers to savor simple moments and find happiness in the ordinary.",
    desc_book8: "Will My Cat Eat My Eyeballs? is a fascinating and humorous exploration of death-related questions that curious minds often wonder about. Caitlin Doughty makes the topic of mortality approachable and educational through her unique perspective.",
    desc_book9: "The Midnight Library is a Sunday Times bestselling novel about infinite possibilities and second chances. Between life and death, there's a library where each book represents a different life you could have lived, offering the chance to undo regrets.",
    desc_book10: "A timeless tale of love, class, and societal expectations. Elizabeth Bennet navigates the complexities of Regency-era England, challenging social norms while finding her own path to happiness in this beloved romantic novel.",
    desc_book11: "The heartwarming story of Anne Shirley, an imaginative and talkative orphan who is mistakenly sent to live with Marilla and Matthew Cuthbert on Prince Edward Island. This beloved classic follows Anne's adventures and growth as she transforms the lives of everyone around her.",
    desc_book12: "A deep psychological horror novel dealing with human inner fears and existential terror. The story follows a character facing their real nightmares in a world where fear becomes a tangible reality. A fascinating exploration of the human mind and its limits.",
    desc_book13: "An impactful novel that tells the story of a young girl in a desert village dealing with challenges and difficult circumstances. The story follows her journey in facing hardships and finding inner strength to overcome obstacles and achieve her dreams.",
    desc_book14: "A mysterious and thrilling novel revolving around the enigmatic character of the Baron who appears in a world full of secrets and symbols. The story follows a journey of discovering the truth behind this mysterious character in a world full of deception and illusion.",
    desc_book15: "A classic Dickens novel following the adventures of Oliver Twist, an orphan who escapes from a workhouse and falls in with a gang of pickpockets led by the cunning Fagin. This timeless tale explores themes of poverty, crime, and redemption in Victorian London.",
    desc_book16: "A classic coming-of-age story following the four March sisters - Meg, Jo, Beth, and Amy - as they navigate life, love, and personal growth during the Civil War era. This timeless tale explores themes of family, independence, and the challenges of growing up.",
    desc_book17: "A collection of intimate letters from Franz Kafka to Milena Jesenská, revealing the profound emotional and intellectual connection between two extraordinary minds. These letters offer a rare glimpse into Kafka's personal thoughts, fears, and desires, showcasing his literary genius in its most vulnerable form.",
    desc_book18: "The Bell Jar is the only novel by American poet Sylvia Plath. The story follows Esther Greenwood, a talented young woman who wins an opportunity to work at a fashion magazine in New York. Despite apparent success, she suffers from increasing feelings of isolation and psychological distress, leading to a suicide attempt and her admission to a psychiatric hospital. The novel sheds light on Esther's internal struggles, especially regarding society's expectations of women and the constraints placed upon them. 'The Bell Jar' is used as a metaphor to represent the feeling of suffocation and isolation she experiences.",
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
    desc_book1: "أيام الهجران رواية قوية عن انهيار امرأة عاطفياً بعد أن يتركها زوجها. تدور أحداثها في نابولي وتستكشف مواضيع الهجران والأمومة والصراع للحفاظ على العقل عندما تنهار الحياة.",
    desc_book2: "العادات الذرية يقدم إطار عمل مثبت لتحسين كل يوم. تعلم كيف يمكن للتغييرات الصغيرة في السلوك أن تؤدي إلى نتائج مذهلة. يوضح لك هذا الكتاب كيفية بناء العادات الجيدة وكسر العادات السيئة باستخدام استراتيجيات عملية.",
    desc_book3: "إيفا لونا رواية واقعية سحرية عن شابة تمتلك موهبة رواية القصص. ولدت في الغابة وتتنقل عبر الحب والثورة وقوة الخيال في أمريكا اللاتينية، مخلقة مصيرها الخاص من خلال قصصها.",
    desc_book4: "الكتاب الأول في سلسلة غصون البندق يستكشف مواضيع النمو والقدرة على التحمل وجمال الطبيعة. قصة تربط المشاعر الإنسانية بالعالم الطبيعي، تتبع شخصيات تكتشف القوة في أماكن غير متوقعة.",
    desc_book5: "الكتاب الثاني يواصل رحلة النمو والاكتشاف، ويعمق الصلة بين التجربة الإنسانية والعالم الطبيعي. تواجه الشخصيات تحديات جديدة وتكتشف حقائق أعمق عن أنفسها وعلاقاتها.",
    desc_book6: "جزء من سلسلة مدرسة الحياة، يستكشف هذا الكتاب فلسفة وعلم نفس الحب. يقدم رؤى حول كيفية العثور على العلاقات الهادفة والحفاظ عليها، ويفحص تعقيدات الحب الحديث والتعلق.",
    desc_book7: "جزء آخر من سلسلة مدرسة الحياة، يركز على إيجاد الفرح في اللحظات اليومية وتقدير المسرات الصغيرة التي تجعل الحياة جميلة. يعلم القراء الاستمتاع باللحظات البسيطة وإيجاد السعادة في العادي.",
    desc_book8: "هل ستأكل قطتي مقلتي؟ استكشاف رائع ومضحك للأسئلة المتعلقة بالموت التي غالباً ما يتساءل عنها العقول الفضولية. تجعل كيتلين دوتي موضوع الموت أكثر سهولة في الوصول إليه وتعليمياً من خلال منظورها الفريد.",
    desc_book9: "مكتبة منتصف الليل رواية من أكثر الكتب مبيعاً في صنداي تايمز عن الاحتمالات اللانهائية والفرص الثانية. بين الحياة والموت توجد مكتبة حيث يمثل كل كتاب حياة مختلفة كان يمكن أن تعيشها، مما يوفر فرصة لإلغاء الندم.",
    desc_book10: "حكاية خالدة عن الحب والطبقة والتوقعات الاجتماعية. إليزابيث بينيت تتنقل في تعقيدات إنجلترا في عصر الوصاية، متحدية الأعراف الاجتماعية بينما تجد طريقها الخاص للسعادة في هذه الرواية الرومانسية المحبوبة.",
    desc_book11: "قصة مؤثرة عن آن شيرلي، اليتيمة الخيالية والثرثارة التي يتم إرسالها بالخطأ للعيش مع ماريلا وماثيو كوثبرت في جزيرة الأمير إدوارد. هذا الكلاسيكي المحبوب يتبع مغامرات ونمو آن وهي تحول حياة كل من حولها.",
    desc_book12: "رواية رعب نفسي عميقة تتعامل مع مخاوف الإنسان الداخلية والرعب الوجودي. تتبع القصة شخصية تواجه كوابيسها الحقيقية في عالم حيث يصبح الخوف حقيقة ملموسة. استكشاف مذهل للعقل البشري وحدوده.",
    desc_book13: "رواية مؤثرة تروي قصة فتاة صغيرة في قرية صحراوية تتعامل مع التحديات والظروف الصعبة. تتبع القصة رحلتها في مواجهة المصاعب وإيجاد القوة الداخلية للتغلب على العقبات وتحقيق أحلامها.",
    desc_book14: "رواية غامضة ومثيرة تدور حول شخصية البارون الغامضة التي تظهر في عالم مليء بالأسرار والرموز. تتبع القصة رحلة اكتشاف الحقيقة وراء هذه الشخصية الغامضة في عالم مليء بالخداع والوهم.",
    desc_book15: "رواية كلاسيكية من تأليف ديكنز تتبع مغامرات أوليفر تويست، اليتيم الذي يهرب من دار العمل ويسقط في عصابة من النشالين يقودها فاجين الماكر. هذه الحكاية الخالدة تستكشف مواضيع الفقر والجريمة والفداء في لندن الفيكتورية.",
    desc_book16: "قصة كلاسيكية عن النضج تتبع الأختين الأربع مارش - ميج وجو وبيث وإيمي - وهن يتنقلن في الحياة والحب والنمو الشخصي خلال عصر الحرب الأهلية. هذه الحكاية الخالدة تستكشف مواضيع الأسرة والاستقلالية وتحديات النمو.",
    desc_book17: "مجموعة من الرسائل الحميمة من فرانز كافكا إلى ميلينا ييسينسكا، تكشف عن الصلة العاطفية والفكرية العميقة بين عقلين استثنائيين. هذه الرسائل تقدم نظرة نادرة على أفكار كافكا الشخصية ومخاوفه ورغباته، وتعرض عبقريته الأدبية في أكثر أشكالها ضعفاً.",
    desc_book18: "رواية 'الناقوس الزجاجي' هي العمل الروائي الوحيد للشاعرة الأمريكية سيلفيا بلاث. تدور أحداث الرواية حول إيستر غرينوود، شابة موهوبة تفوز بفرصة للعمل في مجلة موضة بنيويورك. رغم النجاح الظاهري، تعاني من شعور متزايد بالعزلة والاضطراب النفسي، مما يؤدي بها إلى محاولة انتحار ودخولها مصحة نفسية. تُسلط الرواية الضوء على الصراعات الداخلية للبطلة، خاصة فيما يتعلق بتوقعات المجتمع من النساء والقيود المفروضة عليهن. يُستخدم 'الناقوس الزجاجي' كاستعارة لتمثيل الشعور بالاختناق والعزلة التي تعاني منها. تُعتبر هذه الرواية من الأعمال الأدبية الكلاسيكية التي تناولت موضوعات الصحة النفسية والهوية النسائية بعمق وصدق.",
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
      var priceSource = el.dataset.price || el.textContent;
      var priceMatch = priceSource ? priceSource.match(/\d+[\d,.]*/) : null;
      var currency = el.dataset.currency ? el.dataset.currency.trim() : '';
      var translated = translations[lang]["Price"] + ': ' + (priceMatch ? priceMatch[0] : '');
      if (currency) {
        translated += ' ' + currency;
      }
      el.textContent = translated;
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