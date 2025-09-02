// JavaScript extracted from book.html
const books = {
  // New books from the latest images
  ayyam_al_hijran: {
    title: "أيام الهجران",
    author: "إيلينا فيرانتي",
    description: "A powerful novel about abandonment and the emotional journey of a woman who must rebuild her life after her husband leaves her. Set in Naples, it explores themes of love, loss, and resilience.",
    description_ar: "رواية قوية عن الهجران والرحلة العاطفية لامرأة يجب عليها إعادة بناء حياتها بعد أن يتركها زوجها. تدور أحداثها في نابولي وتستكشف مواضيع الحب والخسارة والقدرة على التحمل.",
    cover: "imgs/أيام الهجران.jpg",
    price: "1,450.00",
    isbn: "9789776543211"
  },
  al_3adat_al_dharia: {
    title: "العادات الذرية",
    author: "جيمس كلير",
    description: "An easy approach to building good habits and getting rid of bad habits. This book provides practical strategies for making small changes that lead to remarkable results in personal development.",
    description_ar: "منهج سهل لبناء العادات الجيدة والتخلص من العادات السيئة. يوفر هذا الكتاب استراتيجيات عملية لإجراء تغييرات صغيرة تؤدي إلى نتائج مذهلة في التطوير الشخصي.",
    cover: "imgs/العادات الذرية.jpg",
    price: "1,400.00",
    isbn: "9789776543212"
  },
  eva_luna: {
    title: "إيفا لونا",
    author: "إيزابيل الليندي",
    description: "A magical realist novel about a young woman with the gift of storytelling who navigates through love, revolution, and the power of imagination in Latin America.",
    description_ar: "رواية واقعية سحرية عن شابة تمتلك موهبة رواية القصص وتتنقل عبر الحب والثورة وقوة الخيال في أمريكا اللاتينية.",
    cover: "imgs/ايفا لونا.jpg",
    price: "2,100.00",
    isbn: "9789776543213"
  },
  ghusoon_bunduq_1: {
    title: "غصون البندق - الكتاب الأول",
    author: "منى سلامة",
    description: "The first book in a series that explores themes of growth, resilience, and the beauty of nature. A story that connects human emotions with the natural world.",
    description_ar: "الكتاب الأول في سلسلة تستكشف مواضيع النمو والقدرة على التحمل وجمال الطبيعة. قصة تربط المشاعر الإنسانية بالعالم الطبيعي.",
    cover: "imgs/غصون البندق.jpg",
    price: "1,200.00",
    isbn: "9789776543214"
  },
  ghusoon_bunduq_2: {
    title: "غصون البندق - الكتاب الثاني",
    author: "منى سلامة",
    description: "The second book continues the journey of growth and discovery, deepening the connection between human experience and the natural world.",
    description_ar: "الكتاب الثاني يواصل رحلة النمو والاكتشاف، ويعمق الصلة بين التجربة الإنسانية والعالم الطبيعي.",
    cover: "imgs/غصون البندق2.jpg",
    price: "1,200.00",
    isbn: "9789776543215"
  },
  kayf_tajid_al_hob: {
    title: "كيف تجد الحب",
    author: "آلان دو بوتون",
    description: "Part of The School of Life series, this book explores the philosophy and psychology of love, offering insights into how to find and maintain meaningful relationships.",
    description_ar: "جزء من سلسلة مدرسة الحياة، يستكشف هذا الكتاب فلسفة وعلم نفس الحب، ويقدم رؤى حول كيفية العثور على العلاقات الهادفة والحفاظ عليها.",
    cover: "imgs/كيف تجد الحب.jpg",
    price: "1,300.00",
    isbn: "9789776543216"
  },
  masarrat_saghira: {
    title: "مسرات صغيرة",
    author: "آلان دو بوتون",
    description: "Another installment from The School of Life series, focusing on finding joy in everyday moments and appreciating the small pleasures that make life beautiful.",
    description_ar: "جزء آخر من سلسلة مدرسة الحياة، يركز على إيجاد الفرح في اللحظات اليومية وتقدير المسرات الصغيرة التي تجعل الحياة جميلة.",
    cover: "imgs/مسرات صغيرة.jpg",
    price: "1,300.00",
    isbn: "9789776543217"
  },
  hal_sata2kul_qatti: {
    title: "هل ستأكل قطتي مقلتي؟",
    author: "كيتلين دوتي",
    description: "A fascinating and humorous exploration of death-related questions that curious minds often wonder about, making the topic of mortality more approachable and educational.",
    description_ar: "استكشاف رائع ومضحك للأسئلة المتعلقة بالموت التي غالباً ما يتساءل عنها العقول الفضولية، مما يجعل موضوع الموت أكثر سهولة في الوصول إليه وتعليمياً.",
    cover: "imgs/هل ستأكل قطتي مقلتي.jpg",
    price: "2,250.00",
    isbn: "9789776543218"
  },
  maktabat_muntasaf_al_layl: {
    title: "مكتبة منتصف الليل",
    author: "مات هيغ",
    description: "A Sunday Times bestselling novel about infinite possibilities and second chances. Between life and death, there's a library where each book represents a different life you could have lived.",
    description_ar: "رواية من أكثر الكتب مبيعاً في صنداي تايمز عن الاحتمالات اللانهائية والفرص الثانية. بين الحياة والموت توجد مكتبة حيث يمثل كل كتاب حياة مختلفة كان يمكن أن تعيشها.",
    cover: "imgs/مكتبة منتصف الليل.jpg",
    price: "1,600.00",
    isbn: "9789776543219"
  },
  
  // Keep some existing popular books
  el9adimon: {
    title: "القادمون",
    author: "أحمد خالد مصطفى",
    description: "A timeless tale of love, class, and societal expectations. Elizabeth Bennet navigates the complexities of Regency-era England.",
    description_ar: "قصة خيالية عن الحب والفوارق الطبقية وتوقعات المجتمع في إنجلترا القديمة.",
    cover: "imgs/el9adimon.jpg",
    price: "1,800.00",
    isbn: "9789776543210"
  },
  al_houl: {
    title: "الهول",
    author: "أحمد خالد توفيق",
    description: "A deep psychological horror novel dealing with human inner fears and existential terror. The story follows a character facing their real nightmares in a world where fear becomes a tangible reality. A fascinating exploration of the human mind and its limits.",
    description_ar: "رواية رعب نفسي عميقة تتعامل مع مخاوف الإنسان الداخلية والرعب الوجودي. تتبع القصة شخصية تواجه كوابيسها الحقيقية في عالم حيث يصبح الخوف حقيقة ملموسة. استكشاف مذهل للعقل البشري وحدوده.",
    cover: "imgs/الهول.jpg",
    price: "1,000.00",
    isbn: "9789776543225"
  },
  the_witcher_sword_of_destiny: {
    title: "الويتشر سيف المصير",
    author: "أندجي سابكوفسكي",
    description: "The Witcher: Sword of Destiny is a collection of short stories from the Witcher universe, following Geralt of Rivia's adventures in a world filled with magic and monsters. Each story reveals aspects of the Witcher's character and his challenges in a world where the line between good and evil is blurred.",
    description_ar: "مجموعة قصص قصيرة من عالم الويتشر، تتبع مغامرات جيرالت من ريفيا في عالم مليء بالسحر والوحوش. كل قصة تكشف جانباً من شخصية الويتشر وتحدياته في عالم حيث الخط الفاصل بين الخير والشر ضبابي.",
    cover: "imgs/الويتشر .jpg",
    price: "1,600.00",
    isbn: "9789776543226"
  },
  the_witcher_last_wish: {
    title: "الويتشر الأمنية الأخيرة",
    author: "أندجي سابكوفسكي",
    description: "The Witcher: The Last Wish is the first collection of Witcher stories, introducing the world of Geralt of Rivia. The stories follow the Witcher's adventures in a world filled with magic and monsters, where he must make difficult decisions between good and evil in a morally gray world.",
    description_ar: "المجموعة الأولى من قصص الويتشر، تقدم مقدمة لعالم جيرالت من ريفيا. تتبع القصص مغامرات الويتشر في عالم مليء بالسحر والوحوش، حيث يجب عليه اتخاذ قرارات صعبة بين الخير والشر في عالم رمادي.",
    cover: "imgs/الويتشر .jpg",
    price: "1,500.00",
    isbn: "9789776543227"
  },
  kun_al_shakhs: {
    title: "كن الشخص الذي يجعلك سعيدا",
    author: "مجهول",
    description: "Be the Person Who Makes You Happy is a motivational guide for finding happiness from within. The book explains that true happiness comes from self-acceptance and self-love, not from depending on others or external circumstances. A powerful message about self-discovery and inner contentment.",
    description_ar: "دليل تحفيزي للبحث عن السعادة من الداخل. يوضح الكتاب أن السعادة الحقيقية تأتي من قبول الذات وحب النفس، وليس من الاعتماد على الآخرين أو الظروف الخارجية. رسالة قوية عن اكتشاف الذات والرضا الداخلي.",
    cover: "imgs/كن الشخص الذي يجعلك سعيدا.jpg",
    price: "1,200.00",
    isbn: "9789776543228"
  },
  qadaya_sherlock: {
    title: "قضايا شيرلوك هولمز غير المحلولة",
    author: "ستيوارت روس",
    description: "The Unsolved Case Files of Sherlock Holmes presents a collection of mysterious cases that Sherlock Holmes has yet to solve. Be Sherlock Holmes' personal assistant and help him solve 24 intriguing puzzles. Each case requires logical thinking and clever solutions.",
    description_ar: "مجموعة من القضايا الغامضة التي لم يحلها شيرلوك هولمز بعد. كن مساعد شيرلوك هولمز الشخصي وساعده في حل 24 لغزاً محيراً. كل قضية تتطلب تفكيراً منطقياً وحلولاً ذكية.",
    cover: "imgs/قضايا شيرلوك هولمز.jpg",
    price: "1,200.00",
    isbn: "9789776543229"
  }
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