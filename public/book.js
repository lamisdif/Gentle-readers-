// JavaScript extracted from book.html
const books = {
  // New books from the latest images
  // New books added by request
  akrahouka_la_tatrokni: {
    title: "أكرهك لا تتركني",
    author: "Unknown",
    description: "رواية أكرهك لا تتركني",
    description_ar: "رواية أكرهك لا تتركني",
    cover: "imgs/أكرهك لا تتركني.jpg",
    price: "3,000.00",
    isbn: "9789776543323"
  },
  al_nabi_al_afriqi: {
    title: "النبي الافريقي",
    author: "Unknown",
    description: "رواية النبي الافريقي",
    description_ar: "رواية النبي الافريقي",
    cover: "imgs/النبي الافريقي.jpg",
    price: "1,400.00",
    isbn: "9789776543320"
  },
  al_wajh_al_hajari: {
    title: "الوجه الحجري",
    author: "Unknown",
    description: "رواية الوجه الحجري",
    description_ar: "رواية الوجه الحجري",
    cover: "imgs/الوجه الحجري.jpg",
    price: "1,400.00",
    isbn: "9789776543321"
  },
  qissa_mawt_mu3lan: {
    title: "قصة موت معلن",
    author: "غابرييل غارسيا ماركيز",
    description: "Chronicle of a Death Foretold",
    description_ar: "قصة موت معلن",
    cover: "imgs/قصة موت معلن.jpg",
    price: "1,000.00",
    isbn: "9789776543322"
  },
  hakatha_takalam_tabrizi_1: {
    title: "هكذا تكلم تبريزي 1",
    author: "شمس الدين التبريزي",
    description: "The conversations and spiritual teachings of Shams Tabrizi, the spiritual mentor of Rumi. Part 1 of the series.",
    description_ar: "مقالات شمس الدين التبريزي وأحاديثه الصوفية التي تتناول الصحبة الروحية بينه وبين جلال الدين الرومي. الجزء الأول.",
    cover: "imgs/هكذا تكلم تبريزي 1.png",
    price: "1,200.00",
    isbn: "9789776543301"
  },
  hakatha_takalam_tabrizi_2: {
    title: "هكذا تكلم تبريزي 2",
    author: "شمس الدين التبريزي",
    description: "The conversations and spiritual teachings of Shams Tabrizi, the spiritual mentor of Rumi. Part 2 of the series.",
    description_ar: "مقالات شمس الدين التبريزي وأحاديثه الصوفية التي تتناول الصحبة الروحية بينه وبين جلال الدين الرومي. الجزء الثاني.",
    cover: "imgs/هكذا تكلم تبريزي 2.png",
    price: "1,200.00",
    isbn: "9789776543302"
  },
  hakatha_takalam_tabrizi_3: {
    title: "هكذا تكلم تبريزي 3",
    author: "شمس الدين التبريزي",
    description: "The conversations and spiritual teachings of Shams Tabrizi, the spiritual mentor of Rumi. Part 3 of the series.",
    description_ar: "مقالات شمس الدين التبريزي وأحاديثه الصوفية التي تتناول الصحبة الروحية بينه وبين جلال الدين الرومي. الجزء الثالث.",
    cover: "imgs/هكذا تكلم تبريزي 3.png",
    price: "1,200.00",
    isbn: "9789776543303"
  },
  hakatha_takalam_tabrizi_4: {
    title: "هكذا تكلم تبريزي 4",
    author: "شمس الدين التبريزي",
    description: "The conversations and spiritual teachings of Shams Tabrizi, the spiritual mentor of Rumi. Part 4 of the series.",
    description_ar: "مقالات شمس الدين التبريزي وأحاديثه الصوفية التي تتناول الصحبة الروحية بينه وبين جلال الدين الرومي. الجزء الرابع.",
    cover: "imgs/هكذا تكلم تبريزي  4.png",
    price: "900.00",
    isbn: "9789776543304"
  },
  ayyam_al_hijran: {
    title: "أيام الهجران",
    author: "إيلينا فيرانتي",
    description: "A powerful novel about abandonment and the emotional journey of a woman who must rebuild her life after her husband leaves her. Set in Naples, it explores themes of love, loss, and resilience.",
    description_ar: "رواية قوية عن الهجران والرحلة العاطفية لامرأة يجب عليها إعادة بناء حياتها بعد أن يتركها زوجها. تدور أحداثها في نابولي وتستكشف مواضيع الحب والخسارة والقدرة على التحمل.",
    cover: "imgs/أيام الهجران.jpg",
    price: "1,450.00",
    isbn: "9789776543211",
    inStock: false
  },
  al_3adat_al_dharia: {
    title: "العادات الذرية",
    author: "جيمس كلير",
    description: "An easy approach to building good habits and getting rid of bad habits. This book provides practical strategies for making small changes that lead to remarkable results in personal development.",
    description_ar: "منهج سهل لبناء العادات الجيدة والتخلص من العادات السيئة. يوفر هذا الكتاب استراتيجيات عملية لإجراء تغييرات صغيرة تؤدي إلى نتائج مذهلة في التطوير الشخصي.",
    cover: "imgs/العادات الذرية.jpg",
    price: "1,600.00",
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
    price: "1,400.00",
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
    price: "1,000.00",
    isbn: "9789776543216"
  },
  masarrat_saghira: {
    title: "مسرات صغيرة",
    author: "آلان دو بوتون",
    description: "Another installment from The School of Life series, focusing on finding joy in everyday moments and appreciating the small pleasures that make life beautiful.",
    description_ar: "جزء آخر من سلسلة مدرسة الحياة، يركز على إيجاد الفرح في اللحظات اليومية وتقدير المسرات الصغيرة التي تجعل الحياة جميلة.",
    cover: "imgs/مسرات صغيرة.jpg",
    price: "1,400.00",
    isbn: "9789776543217",
    inStock: false
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
  },
  little_women: {
    title: "نساء صغيرات",
    author: "لويزا ماي ألكوت",
    description: "A classic coming-of-age story following the four March sisters - Meg, Jo, Beth, and Amy - as they navigate life, love, and personal growth during the Civil War era. This timeless tale explores themes of family, independence, and the challenges of growing up.",
    description_ar: "قصة كلاسيكية عن النضج تتبع الأختين الأربع مارش - ميج وجو وبيث وإيمي - وهن يتنقلن في الحياة والحب والنمو الشخصي خلال عصر الحرب الأهلية. هذه الحكاية الخالدة تستكشف مواضيع الأسرة والاستقلالية وتحديات النمو.",
    cover: "imgs/نساء صغيرات.jpg",
    price: "3,000.00",
    isbn: "9789776543230"
  },
  oliver_twist: {
    title: "Oliver Twist",
    author: "Charles Dickens",
    description: "A classic Dickens novel following the adventures of Oliver Twist, an orphan who escapes from a workhouse and falls in with a gang of pickpockets led by the cunning Fagin. This timeless tale explores themes of poverty, crime, and redemption in Victorian London.",
    description_ar: "رواية كلاسيكية من تأليف ديكنز تتبع مغامرات أوليفر تويست، اليتيم الذي يهرب من دار العمل ويسقط في عصابة من النشالين يقودها فاجين الماكر. هذه الحكاية الخالدة تستكشف مواضيع الفقر والجريمة والفداء في لندن الفيكتورية.",
    cover: "imgs/Oliver Twist.jpg",
    price: "1,300.00",
    isbn: "9789776543231"
  },
  anne_of_green_gables: {
    title: "Anne of Green Gables",
    author: "Lucy Maud Montgomery",
    description: "The heartwarming story of Anne Shirley, an imaginative and talkative orphan who is mistakenly sent to live with Marilla and Matthew Cuthbert on Prince Edward Island. This beloved classic follows Anne's adventures and growth as she transforms the lives of everyone around her.",
    description_ar: "قصة مؤثرة عن آن شيرلي، اليتيمة الخيالية والثرثارة التي يتم إرسالها بالخطأ للعيش مع ماريلا وماثيو كوثبرت في جزيرة الأمير إدوارد. هذا الكلاسيكي المحبوب يتبع مغامرات ونمو آن وهي تحول حياة كل من حولها.",
    cover: "imgs/Anne of green gables.jpg",
    price: "1,600.00",
    isbn: "9789776543233",
    inStock: false
  },
  hasees: {
    title: "هسيس",
    author: "عبدالله بوموزة",
    description: "A deep psychological horror novel dealing with human inner fears and existential terror. The story follows a character facing their real nightmares in a world where fear becomes a tangible reality. A fascinating exploration of the human mind and its limits.",
    description_ar: "رواية رعب نفسي عميقة تتعامل مع مخاوف الإنسان الداخلية والرعب الوجودي. تتبع القصة شخصية تواجه كوابيسها الحقيقية في عالم حيث يصبح الخوف حقيقة ملموسة. استكشاف مذهل للعقل البشري وحدوده.",
    cover: "imgs/هسيس.jpg",
    price: "1,800.00",
    isbn: "9789776543234"
  },
  hatha_ma_hadath_maaha: {
    title: "هذا ما حدث معها",
    author: "أسامة المسلم",
    description: "An impactful novel that tells the story of a young girl in a desert village dealing with challenges and difficult circumstances. The story follows her journey in facing hardships and finding inner strength to overcome obstacles and achieve her dreams.",
    description_ar: "رواية مؤثرة تروي قصة فتاة صغيرة في قرية صحراوية تتعامل مع التحديات والظروف الصعبة. تتبع القصة رحلتها في مواجهة المصاعب وإيجاد القوة الداخلية للتغلب على العقبات وتحقيق أحلامها.",
    cover: "imgs/هذا ما حدث معها.jpg",
    price: "1,200.00",
    isbn: "9789776543235"
  },
  al_baron: {
    title: "البارون",
    author: "شهد قربان",
    description: "A mysterious and thrilling novel revolving around the enigmatic character of the Baron who appears in a world full of secrets and symbols. The story follows a journey of discovering the truth behind this mysterious character in a world full of deception and illusion.",
    description_ar: "رواية غامضة ومثيرة تدور حول شخصية البارون الغامضة التي تظهر في عالم مليء بالأسرار والرموز. تتبع القصة رحلة اكتشاف الحقيقة وراء هذه الشخصية الغامضة في عالم مليء بالخداع والوهم.",
    cover: "imgs/البارون.jpg",
    price: "1,900.00",
    isbn: "9789776543236"
  },

  // Additional books from search.html to prevent "book not found" errors
  ard_zikola: {
    title: "أرض زيكولا",
    author: "عمرو عبد الحميد",
    description: "A compelling narrative about a mysterious land and its inhabitants, exploring themes of identity, belonging, and the search for meaning in an unfamiliar world.",
    description_ar: "سرد مقنع عن أرض غامضة وسكانها، يستكشف مواضيع الهوية والانتماء والبحث عن المعنى في عالم غير مألوف.",
    cover: "imgs/ارض زيكولا.jpg",
    price: "1,200.00",
    isbn: "9789776543237"
  },
  fatat_al_yaka: {
    title: "فتاة الياقة",
    author: "عمرو عبد الحميد",
    description: "A story about a girl with a distinctive collar, exploring themes of uniqueness, social expectations, and the courage to be different in a conformist world.",
    description_ar: "قصة عن فتاة ذات ياقة مميزة، تستكشف مواضيع التفرد والتوقعات الاجتماعية والشجاعة لتكون مختلفة في عالم متطابق.",
    cover: "imgs/فتاة الياقة الزرقاء.jpg",
    price: "1,400.00",
    isbn: "9789776543238"
  },
  greatgatsby: {
    title: "مرتفعات ويذرنج",
    author: "إيميلي برونتي",
    description: "A passionate and tumultuous love story set on the Yorkshire moors, exploring themes of revenge, obsession, and the destructive power of love.",
    description_ar: "قصة حب عاطفية وعاصفة تدور في مرتفعات يوركشاير، تستكشف مواضيع الانتقام والهوس والقوة المدمرة للحب.",
    cover: "imgs/مرتفعات ويذرنج.jpg",
    price: "1,500.00",
    isbn: "9789776543239"
  },
  mockingbird: {
    title: "المستذلون المهانون",
    author: "فيودور دوستويفسكي",
    description: "A compelling narrative about the marginalized and oppressed, exploring themes of social justice and human dignity.",
    description_ar: "سرد مقنع عن المهمشين والمضطهدين، يستكشف مواضيع العدالة الاجتماعية والكرامة الإنسانية.",
    cover: "imgs/المستذلون المهانون.jpg",
    price: "1,600.00",
    isbn: "9789776543240"
  },
  dune: {
    title: "الابلة",
    author: "فيودور دوستويفسكي",
    description: "A psychological masterpiece exploring the depths of human nature, morality, and the consequences of our actions.",
    description_ar: "تحفة نفسية تستكشف أعماق الطبيعة البشرية والأخلاق وعواقب أفعالنا.",
    cover: "imgs/الابلة 1.jpg",
    price: "1,700.00",
    isbn: "9789776543241"
  },
  الابلة: {
    title: "الابلة",
    author: "فيودور دوستويفسكي",
    description: "A Russian classic novel dealing with a complex love story between Prince Myshkin and Nastasya Filippovna, with elements of love and madness.",
    description_ar: "رواية روسية كلاسيكية تتناول قصة حب معقدة بين الأمير ميشكين وناستاسيا فيليبوفنا، مع عناصر من الحب والجنون.",
    cover: "imgs/الابلة 1.jpg",
    price: "1,700.00",
    isbn: "9789776543242"
  },
  hitchhikers: {
    title: "اعادة برمجة",
    author: "آنا فيرجسون",
    description: "A comprehensive guide to self-development and reprogramming the mind to achieve success and happiness in life.",
    description_ar: "دليل شامل للتطوير الذاتي وإعادة برمجة العقل لتحقيق النجاح والسعادة في الحياة.",
    cover: "imgs/اعادة برمجة.jpg",
    price: "1,300.00",
    isbn: "9789776543243"
  },
  lotr: {
    title: "دليل الحياة الزوجية",
    author: "كيفن ليمان",
    description: "A comprehensive guide to a successful married life, covering the foundations of a healthy relationship and effective communication between spouses.",
    description_ar: "دليل شامل لحياة زوجية ناجحة، يغطي أسس العلاقة الصحية والتواصل الفعال بين الزوجين.",
    cover: "imgs/دليل الحياة الزوجية.jpg",
    price: "1,500.00",
    isbn: "9789776543244"
  },
  odyssey: {
    title: "المخ الابله",
    author: "دين برنيت",
    description: "An exploration of the insatiable mind and its endless quest for knowledge, understanding, and meaning in life.",
    description_ar: "استكشاف للعقل النهم وسعيه اللامتناهي للمعرفة والفهم والمعنى في الحياة.",
    cover: "imgs/المخ الابله.jpg",
    price: "1,900.00",
    isbn: "9789776543245"
  },
  mobydick: {
    title: "وادي الذئاب",
    author: "عمرو عبد الحميد",
    description: "A thrilling adventure set in a mysterious valley where danger and discovery await, exploring themes of survival and primal instincts.",
    description_ar: "مغامرة مثيرة تدور في وادي غامض حيث تنتظر المخاطر والاكتشاف، تستكشف مواضيع البقاء والغرائز البدائية.",
    cover: "imgs/وادي الذئاب.jpg",
    price: "1,400.00",
    isbn: "9789776543246"
  },
  warandpeace: {
    title: "الشيطان يحكي",
    author: "أحمد خالد مصطفى",
    description: "A dark and compelling narrative where the devil himself tells stories, revealing the hidden truths and moral complexities of human nature.",
    description_ar: "سرد مظلم ومقنع حيث يحكي الشيطان نفسه القصص، ويكشف الحقائق المخفية والتعقيدات الأخلاقية للطبيعة البشرية.",
    cover: "imgs/الشيطان يحكي.jpg",
    price: "1,800.00",
    isbn: "9789776543247"
  },
  crimeandpunishment: {
    title: "عناق برائحة الورق",
    author: "منى سلامة",
    description: "A sensual and evocative tale exploring the power of scent and touch in human relationships, where memories are intertwined with fragrance.",
    description_ar: "حكاية حسية ومؤثرة تستكشف قوة الرائحة واللمس في العلاقات الإنسانية، حيث تتداخل الذكريات مع العطر.",
    cover: "imgs/عناق برائحة الورق.jpg",
    price: "1,600.00",
    isbn: "9789776543248"
  },
  عناق_برائحة: {
    title: "عناق برائحة الورق",
    author: "أحمد خالد توفيق",
    description: "A romantic novel dealing with an emotional love story with elements of fantasy and romance, from the Ma Waraa Al Tabia series.",
    description_ar: "رواية رومانسية تتناول قصة حب عاطفية مع عناصر من الخيال والرومانسية، من سلسلة ما وراء الطبيعة.",
    cover: "imgs/عناق برائحة الورق.jpg",
    price: "1,600.00",
    isbn: "9789776543249"
  },
  catcher: {
    title: "اعرف وجهك الاخر",
    author: "د.يوسف الحسني",
    description: "A journey of self-discovery and identity exploration, where the protagonist learns to recognize and accept their true self.",
    description_ar: "رحلة اكتشاف الذات واستكشاف الهوية، حيث يتعلم البطل التعرف على ذاته الحقيقية وقبولها.",
    cover: "imgs/اعرف وجهك.jpg",
    price: "1,500.00",
    isbn: "9789776543250"
  },
  rasail_ila_milina: {
    title: "رسائل إلى ميلينا",
    author: "فرانز كافكا",
    description: "A collection of intimate letters from Franz Kafka to Milena Jesenská, revealing the profound emotional and intellectual connection between two extraordinary minds. These letters offer a rare glimpse into Kafka's personal thoughts, fears, and desires, showcasing his literary genius in its most vulnerable form.",
    description_ar: "مجموعة من الرسائل الحميمة من فرانز كافكا إلى ميلينا ييسينسكا، تكشف عن الصلة العاطفية والفكرية العميقة بين عقلين استثنائيين. هذه الرسائل تقدم نظرة نادرة على أفكار كافكا الشخصية ومخاوفه ورغباته، وتعرض عبقريته الأدبية في أكثر أشكالها ضعفاً.",
    cover: "imgs/رسائل الى ميلينا.jpg",
    price: "750.00",
    originalPrice: "900.00",
    isbn: "9789776543251",
    inStock: true,
    isDiscounted: true
  },
  pride_and_prejudice: {
    title: "كبرياء و هوى",
    author: "جين أوستن",
    description: "A classic novel of manners, love, and social class in 19th-century England. It follows the emotional development of Elizabeth Bennet, who learns the error of making hasty judgments and comes to appreciate the difference between superficial and essential goodness.",
    description_ar: "رواية كلاسيكية عن الأخلاق والحب والطبقة الاجتماعية في إنجلترا في القرن التاسع عشر. تتبع التطور العاطفي لإليزابيث بينيت، التي تتعلم خطأ إصدار الأحكام المتسرعة وتدرك الفرق بين الخير السطحي والأساسي.",
    cover: "imgs/كبرياء و هوى.jpg",
    price: "900.00",
    originalPrice: "1000.00",
    isbn: "9789776543252",
    inStock: true,
    isDiscounted: true
  },
  al_naqous_al_zujaji: {
    title: "الناقوس الزجاجي",
    author: "سيلفيا بلاث",
    description: "The Bell Jar is the only novel by American poet Sylvia Plath. The story follows Esther Greenwood, a talented young woman who wins an opportunity to work at a fashion magazine in New York. Despite apparent success, she suffers from increasing feelings of isolation and psychological distress, leading to a suicide attempt and her admission to a psychiatric hospital. The novel sheds light on Esther's internal struggles, especially regarding society's expectations of women and the constraints placed upon them. 'The Bell Jar' is used as a metaphor to represent the feeling of suffocation and isolation she experiences. This novel is considered one of the classic literary works that deeply and honestly addressed themes of mental health and female identity.",
    description_ar: "رواية 'الناقوس الزجاجي' هي العمل الروائي الوحيد للشاعرة الأمريكية سيلفيا بلاث. تدور أحداث الرواية حول إيستر غرينوود، شابة موهوبة تفوز بفرصة للعمل في مجلة موضة بنيويورك. رغم النجاح الظاهري، تعاني من شعور متزايد بالعزلة والاضطراب النفسي، مما يؤدي بها إلى محاولة انتحار ودخولها مصحة نفسية. تُسلط الرواية الضوء على الصراعات الداخلية للبطلة، خاصة فيما يتعلق بتوقعات المجتمع من النساء والقيود المفروضة عليهن. يُستخدم 'الناقوس الزجاجي' كاستعارة لتمثيل الشعور بالاختناق والعزلة التي تعاني منها. تُعتبر هذه الرواية من الأعمال الأدبية الكلاسيكية التي تناولت موضوعات الصحة النفسية والهوية النسائية بعمق وصدق.",
    cover: "imgs/الناقوس الزجاجي.jpg",
    price: "1,700.00",
    isbn: "9789776543250",
    inStock: false
  },
  oscar_wilde: {
    title: "أوسكار وايلد",
    author: "أوسكار وايلد",
    description: "A collection of the complete short stories by Oscar Wilde, one of the most celebrated writers of the Victorian era. This collection showcases Wilde's wit, satire, and unique storytelling style, featuring tales that blend humor, morality, and social commentary.",
    description_ar: "مجموعة من الأعمال القصصية الكاملة لأوسكار وايلد، أحد أشهر كتاب العصر الفيكتوري. تعرض هذه المجموعة براعة وايلد في السخرية والأسلوب القصصي الفريد، وتضم قصصاً تمزج بين الفكاهة والأخلاق والتعليق الاجتماعي.",
    cover: "imgs/اوسكار وايلد.jpg",
    price: "1,700.00",
    isbn: "9789776543251"
  },
  sa_akun_hunak: {
    title: "سأكون هناك",
    author: "كيونج سوك شين",
    description: "A powerful novel by Kyung-Sook Shin, winner of the Man Asian Booker Prize 2011. The story explores themes of loss, memory, and the enduring bonds of love and family. Set in contemporary Korea, it follows characters navigating through life's challenges and finding strength in connection.",
    description_ar: "رواية قوية من تأليف كيونج سوك شين، الفائزة بجائزة المان بوكر الآسيوية 2011. تستكشف القصة مواضيع الفقدان والذاكرة والروابط الدائمة للحب والعائلة. تدور أحداثها في كوريا المعاصرة، وتتبع شخصيات تتنقل عبر تحديات الحياة وتجد القوة في الارتباط.",
    cover: "imgs/سأكون هناك.jpg",
    price: "1,800.00",
    isbn: "9789776543252"
  },
  al_sindbad_al_a3ma: {
    title: "السندباد الأعمى",
    author: "بثينة العيسى",
    description: "A surreal and captivating novel by Buthaina Al-Essa. The story follows 'The Blind Sinbad' on a journey through sea and war, exploring themes of memory, loss, and the search for meaning in a fragmented world. The novel blends reality with fantasy, creating a rich tapestry of human experience.",
    description_ar: "رواية سريالية آسرة من تأليف بثينة العيسى. تتبع القصة 'السندباد الأعمى' في رحلة عبر البحر والحرب، مستكشفة مواضيع الذاكرة والفقدان والبحث عن المعنى في عالم مجزأ. تمزج الرواية بين الواقع والخيال، مخلقة نسيجاً غنياً من التجربة الإنسانية.",
    cover: "imgs/السندباد الاعمى.jpg",
    price: "1,700.00",
    isbn: "9789776543253"
  },
  // Dostoevsky books
  al_muqamir: {
    title: "المقامر",
    author: "فيودور دوستويفسكي",
    description: "The Gambler is a novel by Fyodor Dostoevsky about a young tutor who becomes obsessed with gambling. The story explores themes of addiction, passion, and the destructive power of obsession, set against the backdrop of a German gambling resort.",
    description_ar: "المقامر رواية لفيودور دوستويفسكي عن مدرس شاب يصبح مهووساً بالمقامرة. تستكشف القصة مواضيع الإدمان والعاطفة والقوة المدمرة للهوس، في إطار منتجع ألماني للمقامرة.",
    cover: "imgs/المقامر.jpg",
    price: "1,300.00",
    isbn: "9789776543254"
  },
  al_shayatin: {
    title: "الشياطين",
    author: "فيودور دوستويفسكي",
    description: "The Demons (also known as The Possessed) is one of Dostoevsky's most complex novels, exploring political radicalism, nihilism, and the moral decay of Russian society. The story follows a group of revolutionaries whose ideals lead to chaos and destruction.",
    description_ar: "الشياطين (المعروف أيضاً باسم الممسوسون) هي واحدة من أكثر روايات دوستويفسكي تعقيداً، تستكشف الراديكالية السياسية والعدمية والانحلال الأخلاقي للمجتمع الروسي. تتبع القصة مجموعة من الثوريين الذين تؤدي أيديولوجياتهم إلى الفوضى والدمار.",
    cover: "imgs/الشياطين.png",
    price: "4,000.00",
    isbn: "9789776543255",
    inStock: false
  },
  al_ablah: {
    title: "الأبله",
    author: "فيودور دوستويفسكي",
    description: "The Idiot is a novel about Prince Myshkin, a man of pure heart and innocence who returns to Russia after treatment for epilepsy. His goodness and naivety clash with the corrupt society around him, leading to tragedy.",
    description_ar: "الأبله رواية عن الأمير ميشكين، رجل ذو قلب نقي وبراءة يعود إلى روسيا بعد علاج من الصرع. تتصادم خيرته وسذاجته مع المجتمع الفاسد من حوله، مما يؤدي إلى المأساة.",
    cover: "imgs/الأبله.jpg",
    price: "4,800.00",
    isbn: "9789776543256",
    inStock: false
  },
  al_ikhwa_karamazov: {
    title: "الإخوة كارامازوف",
    author: "فيودور دوستويفسكي",
    description: "The Brothers Karamazov is Dostoevsky's final and greatest novel, exploring themes of faith, doubt, free will, and morality through the story of three brothers and their relationship with their father. A profound philosophical and psychological masterpiece.",
    description_ar: "الإخوة كارامازوف هي آخر وأعظم روايات دوستويفسكي، تستكشف مواضيع الإيمان والشك والإرادة الحرة والأخلاق من خلال قصة ثلاثة إخوة وعلاقتهم بأبيهم. تحفة فلسفية ونفسية عميقة.",
    cover: "imgs/الاخوة-كارامازوف-1.jpg",
    price: "6,000.00",
    isbn: "9789776543257",
    inStock: false
  },
  al_layali_al_bayda: {
    title: "الليالي البيضاء",
    author: "فيودور دوستويفسكي",
    description: "White Nights is a sentimental story from the diary of a dreamer, set in St. Petersburg. It tells the story of a lonely young man who falls in love with a young woman he meets during the white nights of summer. A beautiful tale of unrequited love and fleeting moments of connection.",
    description_ar: "الليالي البيضاء قصة عاطفية من مذكرات حالم، تدور أحداثها في سانت بطرسبرغ. تحكي قصة شاب وحيد يقع في الحب مع شابة يلتقي بها خلال الليالي البيضاء في الصيف. حكاية جميلة عن الحب غير المتبادل ولحظات عابرة من التواصل.",
    cover: "imgs/الليالي-البيضاء.jpg",
    price: "900.00",
    isbn: "9789776543263",
    inStock: false
  },
  al_fuqara: {
    title: "الفقراء",
    author: "فيودور دوستويفسكي",
    description: "Poor Folk is Dostoevsky's first novel, an epistolary work that tells the story of two impoverished correspondents. The novel explores themes of poverty, love, and human dignity through their letters.",
    description_ar: "الفقراء هي أول رواية لدوستويفسكي، عمل رسائلي يروي قصة مراسلين فقيرين. تستكشف الرواية مواضيع الفقر والحب والكرامة الإنسانية من خلال رسائلهما.",
    cover: "imgs/الفقراء.jpg",
    price: "1,250.00",
    isbn: "9789776543258",
    inStock: false
  },
  fi_qabwi: {
    title: "في قبوي",
    author: "فيودور دوستويفسكي",
    description: "Notes from Underground (also known as In the Basement) is a philosophical novella that presents the confession of an isolated, bitter narrator. It explores themes of free will, determinism, and the nature of human consciousness.",
    description_ar: "مذكرات من تحت الأرض (المعروف أيضاً باسم في قبوي) هي رواية فلسفية تقدم اعتراف راوٍ معزول ومرير. تستكشف مواضيع الإرادة الحرة والحتمية وطبيعة الوعي الإنساني.",
    cover: "imgs/في-قبوي.jpg",
    price: "1,200.00",
    isbn: "9789776543259",
    inStock: false
  },
  dhikrayat_min_manzil_al_amwat: {
    title: "ذكريات من منزل الأموات",
    author: "فيودور دوستويفسكي",
    description: "The House of the Dead is a semi-autobiographical novel based on Dostoevsky's experiences in a Siberian prison camp. It provides a detailed account of prison life and explores themes of human nature, suffering, and redemption.",
    description_ar: "منزل الأموات رواية شبه سيرة ذاتية مبنية على تجارب دوستويفسكي في معسكر سجون سيبيريا. تقدم وصفاً مفصلاً لحياة السجن وتستكشف مواضيع الطبيعة البشرية والمعاناة والفداء.",
    cover: "imgs/ذكريات من منزل الأموات.jpg",
    price: "1,850.00",
    isbn: "9789776543260",
    inStock: false
  },
  al_zawj_al_abadi: {
    title: "الزوج الأبدي",
    author: "فيودور دوستويفسكي",
    description: "The Eternal Husband is a psychological novella about a man who discovers his deceased wife had a lover. The story explores themes of jealousy, revenge, and the complex relationships between men, set in St. Petersburg.",
    description_ar: "الزوج الأبدي رواية نفسية عن رجل يكتشف أن زوجته المتوفاة كان لها عاشق. تستكشف القصة مواضيع الغيرة والانتقام والعلاقات المعقدة بين الرجال، في إطار سانت بطرسبرغ.",
    cover: "imgs/الزوج-الأبدي.jpg",
    price: "1,300.00",
    isbn: "9789776543261"
  },
  dhikrayat_shita_fi_mashaer_al_sayf: {
    title: "ذكريات شتاء في مشاعر الصيف",
    author: "فيودور دوستويفسكي",
    description: "Memories from Winter in Summer Feelings is a collection of Dostoevsky's works that explores the contrast between seasons and emotions. The stories delve into human psychology and the complexity of feelings across different times.",
    description_ar: "ذكريات شتاء في مشاعر الصيف مجموعة من أعمال دوستويفسكي تستكشف التباين بين الفصول والعواطف. تغوص القصص في علم النفس البشري وتعقيد المشاعر عبر الأوقات المختلفة.",
    cover: "imgs/ذكريات-شتاء-.jpg",
    price: "1,200.00",
    isbn: "9789776543262"
  },
  al_jara_wa_al_qalb_al_daif: {
    title: "الجارة والقلب الضعيف",
    author: "فيودور دوستويفسكي",
    description: "The Neighbor and the Weak Heart is a collection of two stories by Dostoevsky. The stories explore themes of human relationships, emotional vulnerability, and the delicate nature of the human heart in social interactions.",
    description_ar: "الجارة والقلب الضعيف مجموعة من قصتين لدوستويفسكي. تستكشف القصص مواضيع العلاقات الإنسانية والهشاشة العاطفية والطبيعة الحساسة للقلب البشري في التفاعلات الاجتماعية.",
    cover: "imgs/الجارة قلب ضعيف.jpg",
    price: "1,300.00",
    isbn: "9789776543263"
  },
  al_mithl_wa_qissa_aleima: {
    title: "المثل وقصة أليمة",
    author: "فيودور دوستويفسكي",
    description: "The Idiot and a Painful Story combines two of Dostoevsky's works, exploring themes of innocence, suffering, and the human condition. The stories examine how pure hearts navigate a world filled with pain and complexity.",
    description_ar: "المثل وقصة أليمة يجمع بين عملين لدوستويفسكي، يستكشفان مواضيع البراءة والمعاناة والحالة الإنسانية. تفحص القصص كيف تتنقل القلوب النقية في عالم مليء بالألم والتعقيد.",
    cover: "imgs/غلاف-المثل.jpg",
    price: "1,700.00",
    isbn: "9789776543264"
  },
  qaryat_stibanchikogo: {
    title: "قرية ستيبانتشيكوفو",
    author: "فيودور دوستويفسكي",
    description: "The Village of Stepanchikovo and Its Inhabitants is a satirical novel about a small Russian village and its eccentric residents. The story humorously explores social dynamics, hypocrisy, and the absurdities of rural Russian life.",
    description_ar: "قرية ستيبانتشيكوفو وسكانها رواية ساخرة عن قرية روسية صغيرة وسكانها المثيرين. تستكشف القصة بشكل فكاهي ديناميكيات اجتماعية والنفاق وعبثيات الحياة الريفية الروسية.",
    cover: "imgs/غلاف-قرية-ستيبانتشيكوفو.jpg",
    price: "1,700.00",
    isbn: "9789776543265"
  },
  madhlun_mahzun: {
    title: "مذلون مهانون",
    author: "فيودور دوستويفسكي",
    description: "Humiliated and Insulted is a novel about a young writer who becomes involved with a family torn apart by social injustice. The story explores themes of love, sacrifice, and the suffering of the innocent in a corrupt society.",
    description_ar: "مذلون مهانون رواية عن كاتب شاب ينخرط مع عائلة ممزقة بسبب الظلم الاجتماعي. تستكشف القصة مواضيع الحب والتضحية ومعاناة الأبرياء في مجتمع فاسد.",
    cover: "imgs/مذلون-مهانون-.jpg",
    price: "2,500.00",
    isbn: "9789776543267"
  },
  al_batal_al_saghir: {
    title: "البطل الصغير",
    author: "فيودور دوستويفسكي",
    description: "The Little Hero is a short story by Dostoevsky that explores themes of childhood, innocence, and heroism in a small world. The story follows a young protagonist who discovers courage and meaning in everyday life.",
    description_ar: "البطل الصغير قصة قصيرة لدوستويفسكي تستكشف مواضيع الطفولة والبراءة والبطولة في عالم صغير. تتبع القصة بطل شاب يكتشف الشجاعة والمعنى في الحياة اليومية.",
    cover: "imgs/البطل الصغير.jpg",
    price: "1,200.00",
    isbn: "9789776543268"
  },
  awlad_haretna: {
    title: "أولاد حارتنا",
    author: "نجيب محفوظ",
    description: "Children of Our Alley is one of Naguib Mahfouz's most famous and controversial novels. It tells the story of generations living in an alley in Cairo, exploring themes of power, religion, and human nature through allegorical characters and events.",
    description_ar: "أولاد حارتنا من أشهر وأكثر روايات نجيب محفوظ إثارة للجدل. تحكي قصة أجيال تعيش في حارة بالقاهرة، مستكشفة مواضيع القوة والدين والطبيعة البشرية من خلال شخصيات وأحداث رمزية.",
    cover: "imgs/أولاد حارتنا.png",
    price: "3,000.00",
    isbn: "9789776543269",
    inStock: false
  },
  al_ayam: {
    title: "الأيام",
    author: "طه حسين",
    description: "The Days is the celebrated autobiographical trilogy of Taha Hussein. He recounts his childhood in rural Egypt, his struggle with blindness, and his relentless pursuit of knowledge from the village kuttab to Al-Azhar and the Sorbonne, offering a profound portrait of resilience and intellectual awakening.",
    description_ar: "\"الأيام\" هي السيرة الذاتية الشهيرة لطه حسين، حيث يروي طفولته في الريف المصري، ومعاناته مع فقدان البصر، وسعيه الدؤوب نحو العلم من الكُتّاب إلى الأزهر ثم السوربون. شهادة مؤثرة عن الصبر، والإصرار، والانبعاث الفكري.",
    cover: "imgs/الايام HARDCOVER.jpg",
    price: "3,500 DA",
    isbn: "9789776543278"
  },
  al_ayam_illustrated: {
    title: "الأيام",
    author: "طه حسين",
    description: "The Days is the celebrated autobiographical trilogy of Taha Hussein in an illustrated graphic novel edition. This version brings the classic story to life through beautiful illustrations, making it accessible to a new generation of readers.",
    description_ar: "\"الأيام\" هي السيرة الذاتية الشهيرة لطه حسين في طبعة رواية مصورة. هذه النسخة تجعل القصة الكلاسيكية تنبض بالحياة من خلال الرسوم الجميلة، مما يجعلها في متناول جيل جديد من القراء.",
    cover: "imgs/الأيام.jpg",
    price: "1,200.00",
    isbn: "9789776543282"
  },
  the_days: {
    title: "The Days",
    author: "Taha Hussein",
    description: "The Days is the celebrated autobiographical trilogy of Taha Hussein, translated into English. He recounts his childhood in rural Egypt, his struggle with blindness, and his relentless pursuit of knowledge from the village kuttab to Al-Azhar and the Sorbonne, offering a profound portrait of resilience and intellectual awakening.",
    description_ar: "\"الأيام\" هي السيرة الذاتية الشهيرة لطه حسين، مترجمة إلى الإنجليزية. يروي طفولته في الريف المصري، ومعاناته مع فقدان البصر، وسعيه الدؤوب نحو العلم من الكُتّاب إلى الأزهر ثم السوربون. شهادة مؤثرة عن الصبر، والإصرار، والانبعاث الفكري.",
    cover: "imgs/The days.jpg",
    price: "1,200.00",
    isbn: "9789776543283"
  },
  kull_shay_an_al_hob: {
    title: "كل شيء عن الحب",
    author: "بيل هوكس",
    description: "All About Love by bell hooks is a powerful exploration of love in all its forms. The book challenges conventional notions of love and offers a transformative vision of love as a practice of freedom, justice, and healing.",
    description_ar: "\"كل شيء عن الحب\" لبيل هوكس هو استكشاف قوي للحب بجميع أشكاله. يتحدى الكتاب المفاهيم التقليدية للحب ويقدم رؤية تحويلية للحب كممارسة للحرية والعدالة والشفاء.",
    cover: "imgs/كل شيء عن الحب.png",
    price: "1,700.00",
    isbn: "9789776543284"
  },
  al_masih_yuslab_min_jadid: {
    title: "المسيح يصلب من جديد",
    author: "نيكوس كازانتزاكيس",
    description: "Christ Recrucified is a powerful novel by Nikos Kazantzakis that tells the story of a Greek village that decides to reenact the Passion of Christ during Easter. The novel explores themes of faith, sacrifice, and the conflict between spiritual ideals and human nature.",
    description_ar: "المسيح يصلب من جديد رواية قوية لنيكوس كازانتزاكيس تحكي قصة قرية يونانية تقرر إعادة تمثيل آلام المسيح خلال عيد الفصح. تستكشف الرواية مواضيع الإيمان والتضحية والصراع بين المثل الروحية والطبيعة البشرية.",
    cover: "imgs/المسيح يصلب من جديد.png",
    price: "1,500.00",
    isbn: "9789776543270"
  },
  isti3dadat_li_3aqd_qiran: {
    title: "استعدادات لعقد قران",
    author: "فرانتس كافكا",
    description: "Preparations for a Country Wedding is a collection of short stories by Franz Kafka, including the title story and other works. These stories showcase Kafka's unique style, exploring themes of alienation, bureaucracy, and the absurdity of modern life through surreal and symbolic narratives.",
    description_ar: "استعدادات لعقد قران مجموعة قصص قصيرة لفرانتس كافكا، تتضمن القصة التي تحمل العنوان وأعمال أخرى. تعرض هذه القصص أسلوب كافكا الفريد، مستكشفة مواضيع الاغتراب والبيروقراطية وعبثية الحياة الحديثة من خلال سرديات سريالية ورمزية.",
    cover: "imgs/استعدادات لعقد قران.png",
    price: "900.00",
    isbn: "9789776543271"
  },
  tharthara_fawq_al_nil: {
    title: "ثرثرة فوق النيل",
    author: "نجيب محفوظ",
    description: "Chatter on the Nile is a satirical novel by Naguib Mahfouz that follows a group of intellectuals who gather on a houseboat on the Nile to discuss politics, society, and life. The novel critiques Egyptian society and explores themes of disillusionment, escapism, and the gap between intellectual ideals and reality.",
    description_ar: "ثرثرة فوق النيل رواية ساخرة لنجيب محفوظ تتبع مجموعة من المثقفين يجتمعون على مركب في النيل لمناقشة السياسة والمجتمع والحياة. تنتقد الرواية المجتمع المصري وتستكشف مواضيع خيبة الأمل والهروب والفجوة بين المثل الفكرية والواقع.",
    cover: "imgs/ثرثرة فوق النيل.png",
    price: "1,300.00",
    isbn: "9789776543272"
  },
  al_maddah_al_sawda: {
    title: "المادة السوداء",
    author: "نيك كراوتش",
    description: "The Black Material is a contemporary American novel by Nick Crouch that explores dark themes through a fragmented narrative style. The novel delves into complex psychological and social issues, presenting a thought-provoking examination of modern life and human nature.",
    description_ar: "المادة السوداء رواية أمريكية معاصرة لنيك كراوتش تستكشف مواضيع مظلمة من خلال أسلوب سردي مجزأ. تتعمق الرواية في قضايا نفسية واجتماعية معقدة، مقدمة فحصاً مثيراً للتفكير في الحياة الحديثة والطبيعة البشرية.",
    cover: "imgs/المادة السوداء.jpg",
    price: "2,400.00",
    isbn: "9789776543273"
  },
  al_gharib: {
    title: "الغريب",
    author: "ألبير كامو",
    description: "The Stranger is Albert Camus's existential masterpiece that tells the story of Meursault, a French Algerian who commits a senseless murder on a beach. The novel explores themes of absurdity, alienation, and the meaninglessness of life through Camus's philosophy of the absurd.",
    description_ar: "الغريب تحفة ألبير كامو الوجودية التي تحكي قصة مورسو، فرنسي جزائري يرتكب جريمة قتل بلا معنى على شاطئ. تستكشف الرواية مواضيع العبث والاغتراب وعدم معنى الحياة من خلال فلسفة كامو في العبثية.",
    cover: "imgs/الغريب.jpg",
    price: "1,000.00",
    isbn: "9789776543274"
  },
  al_ta3oon: {
    title: "الطاعون",
    author: "ألبير كامو",
    description: "The Plague is Albert Camus's powerful allegorical novel about a plague that strikes the Algerian city of Oran. Through the story of Dr. Rieux and other characters, Camus explores themes of human solidarity, resistance to suffering, and the absurdity of existence in the face of an indifferent universe.",
    description_ar: "الطاعون رواية رمزية قوية لألبير كامو عن وباء يضرب مدينة وهران الجزائرية. من خلال قصة الدكتور ريوك وشخصيات أخرى، يستكشف كامو مواضيع التضامن الإنساني ومقاومة المعاناة وعبثية الوجود في مواجهة كون غير مبال.",
    cover: "imgs/الطاعون.jpg",
    price: "1,350.00",
    isbn: "9789776543275"
  },
  qawa3id_al_3ishq_al_arba3oon: {
    title: "قواعد العشق الأربعون",
    author: "أليف شافاك",
    description: "The Forty Rules of Love is a beautiful novel by Elif Shafak that weaves together two parallel stories: a modern-day American woman's journey of self-discovery and the 13th-century tale of Rumi and Shams of Tabriz. The novel explores themes of love, spirituality, and transformation through the forty rules of love.",
    description_ar: "قواعد العشق الأربعون رواية جميلة لأليف شافاك تنسج معاً قصتين متوازيتين: رحلة امرأة أمريكية معاصرة لاكتشاف الذات وقصة القرن الثالث عشر لجلال الدين الرومي وشمس التبريزي. تستكشف الرواية مواضيع الحب والروحانية والتحول من خلال القواعد الأربعين للحب.",
    cover: "imgs/قواعد العشق الاربعون.jpg",
    price: "3,000.00",
    isbn: "9789776543276"
  },
  malhamat_al_harafish: {
    title: "ملحمة الحرافيش",
    author: "نجيب محفوظ",
    description: "The Epic of the Harafish is one of Naguib Mahfouz's most celebrated works, telling the story of generations of people living in an alley in Cairo. The novel explores themes of power, social justice, and human nature through a rich tapestry of characters and events spanning multiple generations.",
    description_ar: "ملحمة الحرافيش من أشهر أعمال نجيب محفوظ، تحكي قصة أجيال من الناس يعيشون في حارة بالقاهرة. تستكشف الرواية مواضيع القوة والعدالة الاجتماعية والطبيعة البشرية من خلال نسيج غني من الشخصيات والأحداث تمتد عبر أجيال متعددة.",
    cover: "imgs/ملحمة الحرافيش.png",
    price: "3,000.00",
    isbn: "9789776543277"
  },
  al_mareedh: {
    title: "المريض",
    author: "خوان جوميز خورادو",
    description: "EL PACIENTE (The Patient) is a gripping medical thriller by Juan Gómez-Jurado. A chilling and intense story that emphasizes themes of danger, mystery, and possibly a rogue medical professional. A novel that excites adrenaline and races against time.",
    description_ar: "المريض (EL PACIENTE) رواية طبية مثيرة من خوان جوميز خورادو. قصة مروعة ومكثفة تؤكد على مواضيع الخطر والغموض وربما طبيب منحرف. رواية تثير الأدرينالين وتسابق الزمن.",
    cover: "imgs/المريض.jpg",
    price: "3,000.00",
    isbn: "9789776543280"
  },
  al_muslim_al_yahudi: {
    title: "المسلم اليهودي",
    author: "كمال رحيم",
    description: "Diary of a Jewish Muslim is a powerful novel by Kamal Ruhayyim that explores identity, belonging, and the complex intersections of religious and cultural heritage. The story follows a protagonist navigating the dual identity of being both Jewish and Muslim in contemporary society.",
    description_ar: "المسلم اليهودي رواية قوية لكمال رحيم تستكشف الهوية والانتماء وتقاطعات التراث الديني والثقافي المعقدة. تتبع القصة بطل الرواية وهو يتنقل في الهوية المزدوجة لكونه يهودياً ومسلماً في المجتمع المعاصر.",
    cover: "imgs/المسلم اليهودي.jpg",
    price: "2,000.00",
    isbn: "9789776543279"
  },
  ayam_al_shatat: {
    title: "أيام الشتات",
    author: "كمال رحيم",
    description: "Days in the Diaspora is the second part of Kamal Ruhayyim's Jewish Trilogy. The novel follows characters navigating life in the diaspora, exploring themes of displacement, memory, and the search for home. Set against the backdrop of European cities, it tells a story of longing and belonging.",
    description_ar: "أيام الشتات الجزء الثاني من ثلاثية اليهود لكمال رحيم. تتبع الرواية شخصيات تتنقل في الحياة في الشتات، مستكشفة مواضيع التشرد والذاكرة والبحث عن الوطن. تدور أحداثها في خلفية المدن الأوروبية، وتحكي قصة الحنين والانتماء.",
    cover: "imgs/أيام الشتات.jpg",
    price: "2,200.00",
    isbn: "9789776543280"
  },
  ahlam_al_3awda: {
    title: "أحلام العودة",
    author: "كمال رحيم",
    description: "Dreams of Coming Home is the third part of Kamal Ruhayyim's Jewish Trilogy. The novel explores the dreams and aspirations of characters longing to return home, examining themes of nostalgia, identity, and the complex relationship between memory and reality.",
    description_ar: "أحلام العودة الجزء الثالث من ثلاثية اليهود لكمال رحيم. تستكشف الرواية أحلام وتطلعات شخصيات تتوق للعودة إلى الوطن، متفحصة مواضيع الحنين والهوية والعلاقة المعقدة بين الذاكرة والواقع.",
    cover: "imgs/أحلام العودة.jpg",
    price: "1,800.00",
    isbn: "9789776543281"
  },
  raaytu_yusuf: {
    title: "رأيت يوسف",
    author: "مروة عبد الجواد",
    description: "I Saw Joseph is a novel by Marwa Abd El-Gawad that explores themes of identity, memory, and personal journey through a rich narrative style inspired by classical Arabic storytelling traditions.",
    description_ar: "رأيت يوسف رواية لمروة عبد الجواد تستكشف مواضيع الهوية والذاكرة والرحلة الشخصية من خلال أسلوب سردي غني مستوحى من تقاليد السرد العربية الكلاسيكية.",
    cover: "imgs/رايت يوسف.jpg",
    price: "1,500.00",
    isbn: "9789776543285"
  },
  hadith_al_sabah_wal_masa: {
    title: "حديث الصباح والمساء",
    author: "نجيب محفوظ",
    description: "Morning and Evening Talk is a novel by Naguib Mahfouz that weaves together the stories of multiple characters across different generations, exploring themes of time, memory, and the interconnectedness of human lives through conversations and narratives that span from morning to evening.",
    description_ar: "حديث الصباح والمساء رواية لنجيب محفوظ تنسج معاً قصص شخصيات متعددة عبر أجيال مختلفة، مستكشفة مواضيع الزمن والذاكرة وترابط حيوات البشر من خلال محادثات وسرديات تمتد من الصباح إلى المساء.",
    cover: "imgs/حديث الصباح والمساء.jpg",
    price: "1,700.00",
    isbn: "9789776543286"
  }
,
  nineteen_eighty_four: {
    title: "1984",
    author: "جورج أورويل",
    description: "Nineteen Eighty-Four is a dystopian social science fiction novel by George Orwell. It themes centre on the consequences of totalitarianism, mass surveillance, and repressive regimentation of persons and behaviours within society.",
    description_ar: "1984 هي رواية ديستوبية لجورج أورويل. تدور موضوعاتها حول عواقب الشمولية والمراقبة الجماعية والقمع المنهجي للأفراد والسلوكيات داخل المجتمع.",
    cover: "imgs/1984.png",
    price: "1,400.00",
    isbn: "9789776543310"
  },
  zorba_al_yunani: {
    title: "زوربا اليوناني",
    author: "نيكوس كازانتزاكيس",
    description: "Zorba the Greek is a novel by Nikos Kazantzakis. It tells the story of a young Greek intellectual who ventures to escape his bookish life with the help of the boisterous and mysterious Alexis Zorba.",
    description_ar: "زوربا اليوناني رواية لنيكوس كازانتزاكيس. تحكي قصة مفكر يوناني شاب يغامر للهروب من حياته الكتبية بمساعدة أليكسيس زوربا الصاخب والغامض.",
    cover: "imgs/زوربا اليوناني.jpg",
    price: "2,000.00",
    isbn: "9789776543311"
  }
};


function addToCart() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  if (!bookId) return;

  // Check if book is out of stock
  if (books[bookId] && books[bookId].inStock === false) {
    const lang = localStorage.getItem('lang') || 'en';
    alert(lang === 'ar' ? 'هذا الكتاب نفدت الكمية حالياً' : 'This book is currently out of stock');
    return;
  }

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

document.addEventListener('DOMContentLoaded', function () {
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