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
  },
  little_women: {
    title: "Little Women",
    author: "Louisa May Alcott",
    description: "A classic coming-of-age story following the four March sisters - Meg, Jo, Beth, and Amy - as they navigate life, love, and personal growth during the Civil War era. This timeless tale explores themes of family, independence, and the challenges of growing up.",
    description_ar: "قصة كلاسيكية عن النضج تتبع الأختين الأربع مارش - ميج وجو وبيث وإيمي - وهن يتنقلن في الحياة والحب والنمو الشخصي خلال عصر الحرب الأهلية. هذه الحكاية الخالدة تستكشف مواضيع الأسرة والاستقلالية وتحديات النمو.",
    cover: "imgs/Little women.jpg",
    price: "900.00",
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
    cover: "imgs/فتاة الياقة.jpg",
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
  al_layali_al_bayda: {
    title: "الليالي البيضاء",
    author: "دوستويفسكي",
    description: "A classic novel by Dostoevsky that tells the story of a lonely young man in St. Petersburg who meets a young girl during the white summer nights. A touching story about love, loneliness, and hope, reflecting Dostoevsky's mastery in exploring the human psyche.",
    description_ar: "رواية كلاسيكية رائعة من دوستويفسكي تروي قصة شاب وحيد في سانت بطرسبرغ يلتقي بفتاة شابة في الليالي البيضاء الصيفية. قصة مؤثرة عن الحب والوحدة والأمل، تعكس براعة دوستويفسكي في استكشاف النفس الإنسانية.",
    cover: "imgs/الليالي البيضاء.jpg",
    price: "850.00",
    isbn: "9789776543238",
    inStock: false
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
    isbn: "9789776543250"
  },
  oscar_wilde: {
    title: "أوسكار وايلد",
    author: "أوسكار وايلد",
    description: "A collection of the complete short stories by Oscar Wilde, one of the most celebrated writers of the Victorian era. This collection showcases Wilde's wit, satire, and unique storytelling style, featuring tales that blend humor, morality, and social commentary.",
    description_ar: "مجموعة من الأعمال القصصية الكاملة لأوسكار وايلد، أحد أشهر كتاب العصر الفيكتوري. تعرض هذه المجموعة براعة وايلد في السخرية والأسلوب القصصي الفريد، وتضم قصصاً تمزج بين الفكاهة والأخلاق والتعليق الاجتماعي.",
    cover: "imgs/اوسكار وايلد.jpg",
    price: "1,650.00",
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
  the_gambler: {
    title: "المقامر",
    author: "فيودور دوستويفسكي",
    description: "The Gambler is a short novel by Fyodor Dostoevsky about a young tutor in the employment of a formerly wealthy Russian general. The novella reflects Dostoevsky's own addiction to roulette, which was in more ways than one the inspiration for the book.",
    description_ar: "المقامر رواية قصيرة لفيودور دوستويفسكي عن مدرس شاب يعمل لدى جنرال روسي كان ثرياً سابقاً. تعكس الرواية إدمان دوستويفسكي نفسه على الروليت، والذي كان مصدر إلهام للكتاب بطرق عديدة.",
    cover: "imgs/المقامر.jpg",
    price: "1,300.00",
    isbn: "9789776543254"
  },
  demons: {
    title: "الشياطين",
    author: "فيودور دوستويفسكي",
    description: "Demons is a novel by Fyodor Dostoevsky, first published in 1871-72. It is considered one of the four masterworks written by Dostoevsky after his return from Siberian exile, along with Crime and Punishment, The Idiot, and The Brothers Karamazov.",
    description_ar: "الشياطين رواية لفيودور دوستويفسكي، نُشرت لأول مرة في 1871-72. تُعتبر واحدة من أربع روائع كتبها دوستويفسكي بعد عودته من المنفى السيبيري، إلى جانب الجريمة والعقاب والأبله والإخوة كارامازوف.",
    cover: "imgs/الشياطين.png",
    price: "4,000.00",
    isbn: "9789776543255"
  },
  the_idiot: {
    title: "الأبله",
    author: "فيودور دوستويفسكي",
    description: "The Idiot is a novel by Fyodor Dostoevsky, first published serially in 1868-69. The title is an ironic reference to the central character of the novel, Prince Lev Nikolayevich Myshkin, a young man whose goodness, open-hearted simplicity, and guilelessness lead many of the more worldly characters he encounters to mistakenly assume that he lacks intelligence and insight.",
    description_ar: "الأبله رواية لفيودور دوستويفسكي، نُشرت لأول مرة بشكل متسلسل في 1868-69. العنوان إشارة ساخرة إلى الشخصية المركزية في الرواية، الأمير ليف نيكولايفيتش ميشكين، شاب طيبته وبساطته وبراءته تجعل العديد من الشخصيات الأكثر دنيوية التي يقابلها تعتقد خطأً أنه يفتقر إلى الذكاء والبصيرة.",
    cover: "imgs/الأبله.jpg",
    price: "4,800.00",
    isbn: "9789776543256"
  },
  the_brothers_karamazov: {
    title: "الإخوة كارامازوف",
    author: "فيودور دوستويفسكي",
    description: "The Brothers Karamazov is the final novel by Russian author Fyodor Dostoevsky. Dostoevsky spent nearly two years writing The Brothers Karamazov, which was published as a serial in The Russian Messenger from January 1879 to November 1880.",
    description_ar: "الإخوة كارامازوف هي الرواية الأخيرة للكاتب الروسي فيودور دوستويفسكي. قضى دوستويفسكي ما يقرب من عامين في كتابة الإخوة كارامازوف، والتي نُشرت كمسلسل في الرسول الروسي من يناير 1879 إلى نوفمبر 1880.",
    cover: "imgs/الاخوة-كارامازوف-1.jpg",
    price: "6,000.00",
    isbn: "9789776543257"
  },
  poor_folk: {
    title: "الفقراء",
    author: "فيودور دوستويفسكي",
    description: "Poor Folk is the first novel by Fyodor Dostoevsky, written over the span of nine months between 1844 and 1845. Dostoevsky was in financial difficulty because of his extravagant lifestyle and his developing gambling addiction.",
    description_ar: "الفقراء هي أول رواية لفيودور دوستويفسكي، كُتبت على مدى تسعة أشهر بين 1844 و1845. كان دوستويفسكي في صعوبة مالية بسبب أسلوب حياته المترف وإدمانه المتزايد على القمار.",
    cover: "imgs/الفقراء.jpg",
    price: "1,250.00",
    isbn: "9789776543258"
  },
  notes_from_underground: {
    title: "في قبوي",
    author: "فيودور دوستويفسكي",
    description: "Notes from Underground is a novella by Fyodor Dostoevsky, first published in the journal Epoch in 1864. It is a first-person narrative in the form of a 'confession': the work was originally announced by Dostoevsky in Epoch under the title 'A Confession'.",
    description_ar: "في قبوي رواية قصيرة لفيودور دوستويفسكي، نُشرت لأول مرة في مجلة العصر في 1864. إنها سرد من منظور الشخص الأول في شكل 'اعتراف': تم الإعلان عن العمل في الأصل من قبل دوستويفسكي في العصر تحت عنوان 'اعتراف'.",
    cover: "imgs/في-قبوي.jpg",
    price: "1,200.00",
    isbn: "9789776543259"
  },
  the_house_of_the_dead: {
    title: "ذكريات من منزل الأموات",
    author: "فيودور دوستويفسكي",
    description: "The House of the Dead is a semi-autobiographical novel published in 1860-2 in the journal Vremya by Russian author Fyodor Dostoevsky. It was the first published novel by Dostoevsky. The novel portrays the life of convicts in a Siberian prison camp.",
    description_ar: "ذكريات من منزل الأموات رواية شبه سيرة ذاتية نُشرت في 1860-2 في مجلة الوقت للكاتب الروسي فيودور دوستويفسكي. كانت أول رواية منشورة لدوستويفسكي. تصور الرواية حياة المدانين في معسكر سجن سيبيري.",
    cover: "imgs/ذكريات من منزل الأموات.jpg",
    price: "1,850.00",
    isbn: "9789776543260"
  },
  the_eternal_husband: {
    title: "الزوج الأبدي",
    author: "فيودور دوستويفسكي",
    description: "The Eternal Husband is a novella by Fyodor Dostoevsky. The Eternal Husband describes the relationship between Velchaninov, a rich and idle bachelor, and Trusotsky, the husband of his former lover.",
    description_ar: "الزوج الأبدي رواية قصيرة لفيودور دوستويفسكي. يصف الزوج الأبدي العلاقة بين فيلتشانينوف، عازب ثري وخامل، وتروسوتسكي، زوج حبيبته السابقة.",
    cover: "imgs/الزوج-الأبدي.jpg",
    price: "1,200.00",
    isbn: "9789776543261"
  },
  winter_notes_on_summer_impressions: {
    title: "ذكريات شتاء في مشاعر الصيف",
    author: "فيودور دوستويفسكي",
    description: "Winter Notes on Summer Impressions is an essay by Fyodor Dostoevsky that he wrote while traveling in western Europe. Many commentators believe that Dostoevsky's visit to the West led to his rejection of constitutionalism and the Western world in general.",
    description_ar: "ذكريات شتاء في مشاعر الصيف مقال لفيودور دوستويفسكي كتبه أثناء سفره في أوروبا الغربية. يعتقد العديد من المعلقين أن زيارة دوستويفسكي للغرب أدت إلى رفضه للدستورية والعالم الغربي بشكل عام.",
    cover: "imgs/ذكريات-شتاء-.jpg",
    price: "1,200.00",
    isbn: "9789776543262"
  },
  the_landlady_a_faint_heart: {
    title: "الجارة والقلب الضعيف",
    author: "فيودور دوستويفسكي",
    description: "The Landlady and A Faint Heart are two short stories by Fyodor Dostoevsky. These works explore themes of psychological complexity, human relationships, and the inner struggles of the characters.",
    description_ar: "الجارة والقلب الضعيف قصتان قصيرتان لفيودور دوستويفسكي. تستكشف هذه الأعمال مواضيع التعقيد النفسي والعلاقات الإنسانية والصّراعات الداخلية للشخصيات.",
    cover: "imgs/الجارة قلب ضعيف.jpg",
    price: "1,200.00",
    isbn: "9789776543263"
  },
  the_double_a_nasty_story: {
    title: "المثل وقصة أليمة",
    author: "فيودور دوستويفسكي",
    description: "The Double and A Nasty Story are works by Fyodor Dostoevsky. The Double is a novella written by Dostoevsky, first published in 1846. It tells the story of a government clerk who goes mad.",
    description_ar: "المثل وقصة أليمة أعمال لفيودور دوستويفسكي. المثل رواية قصيرة كتبها دوستويفسكي، نُشرت لأول مرة في 1846. تحكي قصة كاتب حكومي يجن.",
    cover: "imgs/غلاف-المثل.jpg",
    price: "1,700.00",
    isbn: "9789776543264"
  },
  a_little_hero: {
    title: "البطل الصغير",
    author: "فيودور دوستويفسكي",
    description: "A Little Hero is a short story by Fyodor Dostoevsky. It was written in 1849 while the author was in prison, and first published in 1857.",
    description_ar: "البطل الصغير قصة قصيرة لفيودور دوستويفسكي. كُتبت في 1849 بينما كان المؤلف في السجن، ونُشرت لأول مرة في 1857.",
    cover: "imgs/197861510.jpg",
    price: "1,200.00",
    isbn: "9789776543265"
  },
  the_village_of_stepanchikovo: {
    title: "قرية ستيبانتشيكوغو",
    author: "فيودور دوستويفسكي",
    description: "The Village of Stepanchikovo is a novella by Fyodor Dostoevsky, first published in 1859. It is a satirical work that explores themes of family relationships and social dynamics in a Russian village setting.",
    description_ar: "قرية ستيبانتشيكوغو رواية قصيرة لفيودور دوستويفسكي، نُشرت لأول مرة في 1859. إنها عمل ساخر يستكشف مواضيع العلاقات العائلية والديناميكيات الاجتماعية في إعداد قرية روسية.",
    cover: "imgs/غلاف-قرية-ستيبانتشيكوفو.jpg",
    price: "1,700.00",
    isbn: "9789776543266"
  },
  white_nights: {
    title: "الليالي البيضاء",
    author: "فيودور دوستويفسكي",
    description: "White Nights is a short story by Fyodor Dostoevsky, originally published in 1848, early in the writer's career. Like many of Dostoevsky's stories, it was inspired by the writer's life in St. Petersburg.",
    description_ar: "الليالي البيضاء قصة قصيرة لفيودور دوستويفسكي، نُشرت لأول مرة في 1848، في بداية مسيرة الكاتب. مثل العديد من قصص دوستويفسكي، استُلهمت من حياة الكاتب في سانت بطرسبرغ.",
    cover: "imgs/الليالي-البيضاء.jpg",
    price: "900.00",
    isbn: "9789776543267"
  },
  humiliated_and_insulted: {
    title: "مذلون مهانون",
    author: "فيودور دوستويفسكي",
    description: "Humiliated and Insulted is a novel by Fyodor Dostoevsky, first published in 1861 in the magazine Vremya. It was the first full-length novel that Dostoevsky published after his return from exile in Siberia.",
    description_ar: "مذلون مهانون رواية لفيودور دوستويفسكي، نُشرت لأول مرة في 1861 في مجلة الوقت. كانت أول رواية كاملة الطول ينشرها دوستويفسكي بعد عودته من المنفى في سيبيريا.",
    cover: "imgs/مذلون-مهانون-.jpg",
    price: "2,500.00",
    isbn: "9789776543268"
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