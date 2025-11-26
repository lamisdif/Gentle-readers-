import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

const supabaseUrl = "https://fsximdllrhglabxbqvay.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"; // حطي هنا المفتاح العام من Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

const books = {
  // New books from the latest images
  ayyam_al_hijran: { title: "أيام الهجران", price: "1,450.00", inStock: false },
  al_3adat_al_dharia: { title: "العادات الذرية", price: "1,600.00" },
  eva_luna: { title: "إيفا لونا", price: "2,100.00" },
  ghusoon_bunduq_1: { title: "غصون البندق - الكتاب الأول", price: "1,200.00" },
  ghusoon_bunduq_2: { title: "غصون البندق - الكتاب الثاني", price: "1,200.00" },
  kayf_tajid_al_hob: { title: "كيف تجد الحب", price: "1,000.00" },
  masarrat_saghira: { title: "مسرات صغيرة", price: "1,400.00", inStock: false },
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
  abi_alladhi_akraho: { title: "أبي الذي أكره", price: "1,000.00", inStock: false },
  ash3alni: { title: "أشعلني", price: "2,000.00" },
  rasail_ila_milina: { title: "رسائل إلى ميلينا", price: "750.00", originalPrice: "900.00", inStock: true, isDiscounted: true },
  pride_and_prejudice: { title: "كبرياء و هوى", price: "900.00", originalPrice: "1000.00", inStock: true, isDiscounted: true },
  kull_azraq_al_sama: { title: "كل أزرق السماء", price: "2,000.00" },
  hakadha_tata3afa: { title: "هكذا تتعافى", price: "1,200.00" },
  caraval: { title: "Caraval", price: "1,500.00" },
  
  // NEW BOOKS - Second Half
  it_ends_with_us: { title: "It Ends With Us", price: "1,400.00" },
  it_starts_with_us: { title: "It Starts With Us", price: "1,200.00" },
  water_moon: { title: "Water Moon", price: "1,500.00" },
  
  majdouline: { title: "ماجدولين", price: "1200.00", inStock: false },
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
  little_women: { title: "نساء صغيرات", price: "3,000.00" },
  oliver_twist: { title: "Oliver Twist", price: "1,800.00" },
  pride_and_prejudice: { title: "كبرياء و هوى", price: "900.00", originalPrice: "1000.00", inStock: true, isDiscounted: true },
  anne_of_green_gables: { title: "Anne of Green Gables", price: "850.00" },
  hasees: { title: "هسيس", price: "1,200.00" },
  hatha_ma_hadath_maaha: { title: "هذا ما حدث معها", price: "1,400.00" },
  
  // Added: The Kite Runner (Arabic) and The Hunger Games
  adaa_al_ta2ira_al_waraqiya: { title: "عداء الطائرة الورقية", price: "1,500.00" },
  the_hunger_games: { title: "The Hunger Games", price: "1,600.00" },
  al_naqous_al_zujaji: { title: "الناقوس الزجاجي", price: "1,700.00", inStock: false },
  
  // New books with prices
  oscar_wilde: { title: "أوسكار وايلد", price: "1,650.00" },
  sa_akun_hunak: { title: "سأكون هناك", price: "1,800.00" },
  al_sindbad_al_a3ma: { title: "السندباد الأعمى", price: "1,700.00" },
  // Dostoevsky books
  al_muqamir: { title: "المقامر", price: "1,300.00" },
  al_shayatin: { title: "الشياطين", price: "4,000.00", inStock: false },
  al_ablah: { title: "الأبله", price: "4,800.00", inStock: false },
  al_ikhwa_karamazov: { title: "الإخوة كارامازوف", price: "6,000.00", inStock: false },
  al_layali_al_bayda: { title: "الليالي البيضاء", price: "900.00", inStock: false },
  al_fuqara: { title: "الفقراء", price: "1,250.00", inStock: false },
  fi_qabwi: { title: "في قبوي", price: "1,200.00", inStock: false },
  dhikrayat_min_manzil_al_amwat: { title: "ذكريات من منزل الأموات", price: "1,850.00", inStock: false },
  al_zawj_al_abadi: { title: "الزوج الأبدي", price: "1,300.00" },
  dhikrayat_shita_fi_mashaer_al_sayf: { title: "ذكريات شتاء في مشاعر الصيف", price: "1,200.00" },
  al_jara_wa_al_qalb_al_daif: { title: "الجارة والقلب الضعيف", price: "1,300.00" },
  al_mithl_wa_qissa_aleima: { title: "المثل وقصة أليمة", price: "1,700.00" },
  qaryat_stibanchikogo: { title: "قرية ستيبانتشيكوفو", price: "1,700.00" },
  madhlun_mahzun: { title: "مذلون مهانون", price: "2,500.00" },
  al_batal_al_saghir: { title: "البطل الصغير", price: "1,200.00" },
  awlad_haretna: { title: "أولاد حارتنا", price: "3,000.00", inStock: false },
  al_ayam: { title: "الأيام", price: "3,500 DA" },
  al_ayam_illustrated: { title: "الأيام", price: "1,200.00" },
  the_days: { title: "The Days", price: "1,200.00" },
  kull_shay_an_al_hob: { title: "كل شيء عن الحب", price: "1,700.00" },
  al_masih_yuslab_min_jadid: { title: "المسيح يصلب من جديد", price: "1,500.00" },
  isti3dadat_li_3aqd_qiran: { title: "استعدادات لعقد قران", price: "900.00" },
  tharthara_fawq_al_nil: { title: "ثرثرة فوق النيل", price: "1,300.00" },
  al_maddah_al_sawda: { title: "المادة السوداء", price: "2,400.00" },
  al_gharib: { title: "الغريب", price: "1,000.00" },
  al_ta3oon: { title: "الطاعون", price: "1,350.00" },
  qawa3id_al_3ishq_al_arba3oon: { title: "قواعد العشق الأربعون", price: "3,000.00" },
  malhamat_al_harafish: { title: "ملحمة الحرافيش", price: "3,000.00" },
  al_mareedh: { title: "المريض", price: "3,000.00" },
  al_muslim_al_yahudi: { title: "المسلم اليهودي", price: "2,000 DA" },
  ayam_al_shatat: { title: "أيام الشتات", price: "2,200 DA" },
  ahlam_al_3awda: { title: "أحلام العودة", price: "1,800 DA" },
  raaytu_yusuf: { title: "رأيت يوسف", price: "1,500 DA" },
  hadith_al_sabah_wal_masa: { title: "حديث الصباح والمساء", price: "1,700 DA" }
};

// Wilaya-Daira data structure
const wilayaDairaData = {
  'Adrar': ['Adrar', 'Aougrout', 'Aoulef', 'Bordj Badji Mokhtar', 'Charouine', 'Fenoughil', 'Reggane', 'Tamentit', 'Timimoun', 'Zaouiet Kounta'],
  'Chlef': ['Chlef', 'Abou El Hassan', 'Ain Merane', 'Benaired', 'Boukadir', 'El Karimia', 'El Marsa', 'Hadj Mechri', 'Kadiria', 'Lardjem', 'Moussadek', 'Oued Fodda', 'Ouled Ben Abdelkader', 'Ouled Fares', 'Oum Drou', 'Sendjas', 'Sidi Abderrahmane', 'Sidi Akkacha', 'Sobha', 'Tadjena', 'Talassa', 'Taougrit', 'Tenes', 'Zeboudja'],
  'Laghouat': ['Laghouat', 'Aflou', 'Ain Madhi', 'Ain Sidi Ali', 'Benacer Benchohra', 'Brida', 'El Assafia', 'El Ghicha', 'El Haouaita', 'Gueltat Sidi Saad', 'Hassi Delaa', 'Hassi R\'Mel', 'Kheneg', 'Ksar El Hirane', 'Mekhareg', 'Oued Morra', 'Oued M\'Zi', 'Sidi Bouzid', 'Sidi Makhlouf', 'Tadjemout', 'Tadjrouna', 'Taouiala'],
  'Oum El Bouaghi': ['Oum El Bouaghi', 'Ain Babouche', 'Ain Beida', 'Ain Diss', 'Ain Fakroun', 'Ain Kercha', 'Ain M\'Lila', 'Ain Zitoun', 'Behir Chergui', 'Berriche', 'Bir Chouhada', 'Dhalaa', 'El Amiria', 'El Belala', 'El Fedjoudj Boughrara Saoudi', 'El Harmilia', 'Fkirina', 'Hanchir Toumghani', 'Ksar Sbahi', 'Meskiana', 'Oued Nini', 'Ouled Gacem', 'Ouled Hamla', 'Ouled Zouai', 'Rahia', 'Sigus', 'Souk Naamane', 'Zorg'],
  'Batna': ['Batna', 'Ain Djasser', 'Ain Touta', 'Arris', 'Azil Abedelkader', 'Barika', 'Bitam', 'Boulhilat', 'Boumia', 'Boumerdes', 'Bouzina', 'Chemora', 'Chir', 'Djezzar', 'El Btiha', 'El Kantara', 'El Madher', 'Fesdis', 'Foum Toub', 'Ghassira', 'Gosbat', 'Guigba', 'Hidoussa', 'Ichmoul', 'Inoughissen', 'Kimmel', 'Ksar Bellezma', 'Larbaa', 'Lazrou', 'Lemsane', 'Maafa', 'Menaa', 'Merouana', 'N\'Gaous', 'Oued Chaaba', 'Oued El Ma', 'Ouled Aouf', 'Ouled Fadel', 'Ouled Selam', 'Ouled Si Slimane', 'Ras El Aioun', 'Seggana', 'Seriana', 'T\'Kout', 'Tazoult', 'Teniet El Abed', 'Tighanimine', 'Tigherghar', 'Tilatou', 'Timgad', 'Zanat El Beida'],
  'Béjaïa': ['Béjaïa', 'Adekar', 'Ait R\'Zine', 'Ait Smail', 'Akbou', 'Akfadou', 'Amalou', 'Amizour', 'Aokas', 'Barbacha', 'Boudjellil', 'Bouhamza', 'Boukhelifa', 'Chemini', 'Darguina', 'Draa El Mizan', 'El Flaye', 'El Kseur', 'Fenaia Il Maten', 'Ferraoun', 'Ighil Ali', 'Ighram', 'Kendira', 'Kherrata', 'Lakhdaria', 'M\'Chedallah', 'M\'Sila', 'Oued Ghir', 'Ouzellaguen', 'Seddouk', 'Sidi Aich', 'Sidi Ayad', 'Souk El Tenine', 'Souk Oufella', 'Tala Hamza', 'Tamokra', 'Tamridjt', 'Taourirt Ighil', 'Taskriout', 'Tazmalt', 'Tibane', 'Tichy', 'Tifra', 'Timezrit', 'Tizi N\'Berber', 'Toudja', 'Village de Ait Abbas'],
  'Biskra': ['Biskra', 'Ain Naga', 'Ain Zaatout', 'Besbes', 'Bordj Ben Azzouz', 'Bouchagroun', 'Branis', 'Chaiba', 'Chetma', 'Djemorah', 'Doucen', 'El Feidh', 'El Ghrous', 'El Hadjab', 'El Haouch', 'El Kantara', 'El Outaya', 'Foughala', 'Hassi Messaoud', 'Khenguet Sidi Nadji', 'Lichana', 'Lioua', 'M\'Chouneche', 'M\'Lili', 'Mekhadma', 'M\'Sila', 'Ouled Djellal', 'Oumache', 'Ourlal', 'Ras El Miaad', 'Sidi Khaled', 'Sidi Okba', 'Tolga', 'Zeribet El Oued'],
  'Béchar': ['Béchar', 'Abadla', 'Béni Abbès', 'Béni Ikhlef', 'Béni Ounif', 'Boukais', 'El Ouata', 'Erg Ferradj', 'Igli', 'Kenadsa', 'Kerzaz', 'Lahmar', 'Mechraa Houari Boumediene', 'Meridja', 'Mogheul', 'Ouled Khodeir', 'Taghit', 'Tabelbala', 'Timoudi'],
  'Blida': ['Blida', 'Ain Romana', 'Beni Mered', 'Beni Tamou', 'Beni Yenni', 'Bouarfa', 'Boufarik', 'Bougara', 'Bouinan', 'Boumedfaa', 'Chiffa', 'Chrea', 'Djebabra', 'El Affroun', 'El Khemis', 'Guerrouaou', 'Hammam Elouane', 'Larbaa', 'Larbatache', 'Mouzaia', 'Oued Alleug', 'Oued Djer', 'Ouled Yaich', 'Souhane', 'Soumaa', 'Tablat'],
  'Bouira': ['Bouira', 'Ahl El Ksar', 'Ain Bessem', 'Ain El Hadjar', 'Ain Laloui', 'Ain Turk', 'Ait Laaziz', 'Aomar', 'Ath Mansour', 'Bechloul', 'Bir Ghbalou', 'Boghni', 'Bordj Okhriss', 'Bouderbala', 'Boudjima', 'Bouira', 'Boumerdes', 'Bouzegza Keddara', 'Chorfa', 'Dechmia', 'Dirrah', 'Djebahia', 'El Adjiba', 'El Asnam', 'El Hachimia', 'El Khemis', 'El Mokrani', 'Guerrouma', 'Hadjera Zerga', 'Haizer', 'Hanif', 'Kadiria', 'Lakhdaria', 'M\'Chedallah', 'Maala', 'Maamora', 'Mechdallah', 'Meftah', 'Mokrani', 'Naciria', 'Oued Djer', 'Ouled Rached', 'Raouraoua', 'Ridane', 'Saharidj', 'Souk El Had', 'Sour El Ghozlane', 'Taghzout', 'Taguedit', 'Zbarbar'],
  'Sétif': ['Sétif', 'Ain Arnat', 'Ain Azel', 'Ain El Kebira', 'Ain Lahdjar', 'Ain Oulmene', 'Ain Roua', 'Ain Sebt', 'Ain Taghrout', 'Ain Temouchent', 'Ain Zana', 'Amoucha', 'Babor', 'Bazer Sakhra', 'Beidha Bordj', 'Belaa', 'Beni Aziz', 'Beni Chebana', 'Beni Fouda', 'Beni Hocine', 'Beni Ourtilane', 'Beni Oussine', 'Bir El Arch', 'Bir Haddada', 'Bouandas', 'Bougaa', 'Bouhamza', 'Bousselam', 'Boutaleb', 'Chechar', 'Dehamcha', 'Djemila', 'Draa Kebila', 'El Eulma', 'El Ouricia', 'El Ouldja', 'Guelal', 'Guelta Zerka', 'Guenzet', 'Hammam Guergour', 'Hammam Soukhna', 'Harbil', 'Ksar El Abtal', 'Maaouia', 'Maoklane', 'Mezloug', 'Oued El Barad', 'Ouled Addi Guebala', 'Ouled Sabor', 'Ouled Si Ahmed', 'Ouled Tebben', 'Rasfa', 'Salah Bey', 'Serdj El Ghoul', 'Tachouda', 'Talaifacene', 'Taya', 'Tella', 'Tizi N\'Bechar', 'Zemmora'],
  'Tamanrasset': ['Tamanrasset', 'Abalessa', 'In Amguel', 'In Guezzam', 'In Salah', 'Tazrouk', 'Tin Zaouatine'],
  'Tébessa': ['Tébessa', 'Ain Zerga', 'Bir Dheheb', 'Bir El Ater', 'Bir Mokadem', 'Boukhadra', 'El Aouinet', 'El Kouif', 'El Ma Labiodh', 'El Mezeraa', 'El Ogla', 'Ferkane', 'Guorriguer', 'Hammamet', 'Lahouidjbet', 'Morsott', 'Negrine', 'Ouenza', 'Oum Ali', 'Saf Saf El Ouesra', 'Stah Guentis', 'Tebessa', 'Tlidjene'],
  'Tlemcen': ['Tlemcen', 'Ain Fezza', 'Ain Ghoraba', 'Ain Kihal', 'Ain Tallout', 'Ain Youcef', 'Amieur', 'Azails', 'Bab El Assa', 'Beni Boussaid', 'Beni Mester', 'Beni Ouarsous', 'Beni Snous', 'Bensekrane', 'Bouhlou', 'Bouihi', 'Chetouane', 'El Aricha', 'El Fehoul', 'El Gor', 'El Khemis', 'El Malah', 'El Menzeh', 'Fellaoucene', 'Ghazaouet', 'Hammam Boughrara', 'Hennaya', 'Honaïne', 'Maghnia', 'Marsa Ben M\'Hidi', 'Nedroma', 'Oued Lakhdar', 'Ouled Mimoun', 'Ouled Riyah', 'Remchi', 'Sabra', 'Sebbaa Chioukh', 'Sebdou', 'Sidi Abdelli', 'Sidi Djillali', 'Souahlia', 'Souk Thlata', 'Terni Beni Hediel', 'Tianet', 'Zemmora'],
  'Tiaret': ['Tiaret', 'Ain Bouchekif', 'Ain Deheb', 'Ain El Hadid', 'Ain Kermes', 'Ain Zarit', 'Bougara', 'Chehaima', 'Dahmouni', 'Djebilet Rosfa', 'Faidja', 'Frenda', 'Guertoufa', 'Hamadia', 'Ksar Chellala', 'Madna', 'Mahdia', 'Mechraa Sfa', 'Medrissa', 'Medroussa', 'Meghila', 'Mellakou', 'Nadorah', 'Naima', 'Oued Lili', 'Rahouia', 'Rechaiga', 'Sebaine', 'Sebt', 'Serghine', 'Si Abdelghani', 'Sidi Abderrahmane', 'Sidi Ali Mellal', 'Sidi Bakhti', 'Sidi Hosni', 'Sougueur', 'Tagdemt', 'Takhemaret', 'Tidda', 'Tousnina', 'Zmalet El Emir Abdelkader'],
  'Tizi Ouzou': ['Tizi Ouzou', 'Ain El Hammam', 'Ain Zaouia', 'Ait Aissa Mimoun', 'Ait Bouadou', 'Ait Chafaa', 'Ait Khelili', 'Ait Mahmoud', 'Ait Oumalou', 'Ait Toudert', 'Ait Yahia', 'Ait Yahia Moussa', 'Akbil', 'Akerrou', 'Assi Youcef', 'Azazga', 'Azeffoun', 'Beni Douala', 'Beni Yenni', 'Boghni', 'Boudjima', 'Bounouh', 'Bouzeguene', 'Draa Ben Khedda', 'Draa El Mizan', 'Freha', 'Frikat', 'Iboudrarene', 'Idjeur', 'Iferhounene', 'Ifigha', 'Iflissen', 'Illilten', 'Illoula Oumalou', 'Imsouhal', 'Irdjen', 'Larba Nath Irathen', 'M\'Kira', 'Maatkas', 'Makouda', 'Mechtras', 'Mekla', 'Mizrana', 'M\'kira', 'Ouacif', 'Ouadhia', 'Ouaguenoun', 'Sidi Namane', 'Souk El Thenine', 'Tadmait', 'Tigzirt', 'Timizart', 'Tirmitine', 'Tizi Gheniff', 'Tizi N\'Tleta', 'Tizi Rached', 'Yakouren', 'Zekri'],
  'Algiers': ['Algiers', 'Ain Benian', 'Ain Taya', 'Bab Ezzouar', 'Baba Hassen', 'Baraki', 'Ben Aknoun', 'Beni Messous', 'Bir Khadem', 'Bir Mourad Rais', 'Birtouta', 'Bordj El Bahri', 'Bordj El Kiffan', 'Bouchaoui', 'Bouharoun', 'Bouinan', 'Bourouba', 'Casbah', 'Cheraga', 'Chéraga', 'Dar El Beida', 'Dely Brahim', 'Djasr Kasentina', 'Douera', 'Draria', 'El Achour', 'El Biar', 'El Harrach', 'El Madania', 'El Magharia', 'El Mouradia', 'Hammamet', 'Hussein Dey', 'Hydra', 'Kouba', 'Les Eucalyptus', 'Mahelma', 'Mohammedia', 'Oued Koriche', 'Oued Smar', 'Ouled Chebel', 'Ouled Fayet', 'Rais Hamidou', 'Reghaia', 'Rouiba', 'Saoula', 'Sidi Moussa', 'Souidania', 'Staoueli', 'Tessala El Merdja', 'Zeralda'],
  'Djelfa': ['Djelfa', 'Ain El Ibel', 'Ain Fekka', 'Ain Maabed', 'Ain Oussera', 'Amourah', 'Benhar', 'Birine', 'Bouira Lahdab', 'Charef', 'Dar Chioukh', 'El Guedid', 'El Idrissia', 'El Khemis', 'El Oued', 'Faidh El Botma', 'Guernini', 'Guettara', 'Had Sahary', 'Hassi Bahbah', 'Hassi El Euch', 'Hassi Fedoul', 'M\'Liliha', 'Messaad', 'Moudjebara', 'Oum Laadham', 'Sed Rahal', 'Selmana', 'Sidi Baizid', 'Sidi Ladjel', 'Tadmit', 'Zaafrane', 'Zaccar'],
  'Jijel': ['Jijel', 'Ain El Melh', 'Ain Errich', 'Ain Kechra', 'Ain N\'Chor', 'Ain Roua', 'Ain Tine', 'Bordj Tahar', 'Bouafia', 'Bouchtata', 'Boudriaa Ben Yadjis', 'Boussif Ouled Askeur', 'Chekfa', 'Djemaa Beni Habibi', 'Djemaa Ouled Cheikh', 'El Ancer', 'El Aouana', 'El Kennar Nouchfi', 'El Milia', 'Emir Abdelkader', 'Erraguene', 'Ghebala', 'Ghebala', 'Kaous', 'Kemir Oued Adjoul', 'Oudjana', 'Ouled Rabah', 'Ouled Yahia Khadrouch', 'Selma Benziada', 'Settara', 'Sidi Abdelaziz', 'Sidi Maarouf', 'Taher', 'Texenna', 'Ziama Mansouriah', 'Ziama Mansouriah'],
  'Saïda': ['Saïda', 'Ain El Hadjar', 'Ain Sekhouna', 'Ain Soltane', 'Aoubellil', 'Benachiba Chelia', 'Bir El Hammam', 'Doui Thabet', 'El Hassasna', 'Hounet', 'Maamora', 'Moulay Larbi', 'Ouled Brahim', 'Ouled Khaled', 'Sidi Ahmed', 'Sidi Amar', 'Sidi Boubekeur', 'Tircine', 'Youb'],
  'Skikda': ['Skikda', 'Ain Bouziane', 'Ain Charchar', 'Ain Kechra', 'Ain Zouit', 'Azzaba', 'Ben Azzouz', 'Beni Bechir', 'Beni Oulbane', 'Beni Zid', 'Bin El Ouiden', 'Bouchtata', 'Cheraia', 'Collo', 'Djendel Saadi Mohamed', 'El Ghedir', 'El Hadaiek', 'El Harrouch', 'El Marsa', 'Emdjez Edchich', 'Essebt', 'Filfila', 'Hamadi Krouma', 'Kanoua', 'Kerkera', 'Kheneg Mayoum', 'Oued Zehour', 'Ouled Attia', 'Ouled Bechih', 'Ouled Hebaba', 'Oum Toub', 'Ramdane Djamel', 'Salah Bouchaour', 'Sidi Mezghiche', 'Tamalous', 'Zerdazas', 'Zitouna'],
  'Sidi Bel Abbès': ['Sidi Bel Abbès', 'Ain Adden', 'Ain El Berd', 'Ain Kada', 'Ain Thrid', 'Ain Tindamine', 'Amarnas', 'Badredine El Mokrani', 'Belarbi', 'Ben Badis', 'Benachiba Chelia', 'Bir El Hammam', 'Bouhanifia', 'Boukhanafis', 'Chetouane Belaila', 'Dhaya', 'El Hacaiba', 'Hassi Zehana', 'Hassi Zahana', 'Lamtar', 'Makedra', 'Mascara', 'Mekerra', 'Merine', 'Mostefa Ben Brahim', 'Moulay Slissen', 'Oued Taourira', 'Oued Sefioun', 'Ouled Khaled', 'Ras El Ma', 'Redjem Demouche', 'Sehala Thaoura', 'Sfisef', 'Sidi Ali Boussidi', 'Sidi Ali Benyoub', 'Sidi Brahim', 'Sidi Chaib', 'Sidi Dahou Zairs', 'Sidi Hamadouche', 'Sidi Khaled', 'Sidi Lahcene', 'Sidi Yacoub', 'Tabia', 'Tafissour', 'Taoudmout', 'Tefessour', 'Tenira', 'Tessala', 'Tilmouni', 'Zerouala'],
  'Annaba': ['Annaba', 'Ain Berda', 'Ain Kerma', 'Annaba', 'Berrahal', 'Chetaibi', 'Cheurfa', 'El Bouni', 'El Hadjar', 'Eulma', 'Oued El Aneb', 'Oued Zitoun', 'Seraidi', 'Sidi Amar', 'Sidi Salem', 'Treat', 'Zighout Youcef'],
  'Guelma': ['Guelma', 'Ain Ben Beida', 'Ain Larbi', 'Ain Makhlouf', 'Ain Reggada', 'Ain Sandel', 'Belkheir', 'Ben Djarah', 'Beni Mezline', 'Bordj Sabath', 'Bou Hachana', 'Bou Hamdane', 'Bouati Mahmoud', 'Bouchegouf', 'Boumahra Ahmed', 'Dahouara', 'Djeballah Khemissi', 'El Fedjoudj', 'Guelaat Bou Sbaa', 'Hammam Debagh', 'Hammam N\'Bails', 'Heliopolis', 'Kheirane', 'Khezarra', 'Medjez Amar', 'Medjez Sfa', 'Nechmaya', 'Oued Cheham', 'Oued Fragha', 'Oued Zenati', 'Ouled Ali', 'Ouled Dahmane', 'Ouled Rached', 'Ras El Agba', 'Roknia', 'Salaoua Announa', 'Tamlouka', 'Taya'],
  'Constantine': ['Constantine', 'Ain Abid', 'Ain Kerma', 'Ain Smara', 'Ben Badis', 'Didouche Mourad', 'El Haria', 'El Khroub', 'Hamma Bouziane', 'Hamma Bouziane', 'Ibn Ziad', 'Messaoud Boudjriou', 'Ouled Rahmoune', 'Zighoud Youcef'],
  'Médéa': ['Médéa', 'Ain Boucif', 'Ain Ouksir', 'Aissaouia', 'Aziz', 'Ben Chicao', 'Beni Slimane', 'Berrouaghia', 'Boghar', 'Bou Aiche', 'Bouaichoune', 'Bouaiche', 'Boumedfaa', 'Chahbounia', 'Chellalet El Adhaoura', 'Derrag', 'El Azizia', 'El Guelbelkebir', 'El Hamdania', 'El Omaria', 'Guelb El Kebab', 'Hannacha', 'Kef Lakhdar', 'Ksar El Boukhari', 'Medea', 'Ouled Antar', 'Ouled Brahim', 'Ouled Deidech', 'Ouled Hellal', 'Ouled Maaref', 'Ouled Sidi Brahim', 'Ouled Sidi Mihoub', 'Ouled Yaich', 'Oum El Djalil', 'Rebaia', 'Saneg', 'Seghouane', 'Si Mahdjoub', 'Sidi Damed', 'Sidi Errabia', 'Sidi Naamane', 'Souagui', 'Tablat', 'Tamesguida', 'Tizi Mahdi', 'Zbarbar'],
  'Mostaganem': ['Mostaganem', 'Ain Nouissy', 'Ain Sidi Cherif', 'Ain Tedles', 'Bouguirat', 'El Hassaine', 'Fornaka', 'Hadjadj', 'Hassi Mameche', 'Kheir Eddine', 'Mansourah', 'Mesra', 'Mostaganem', 'Nekmaria', 'Oued El Kheir', 'Ouled Boughalem', 'Ouled Maallah', 'Ouled Malah', 'Safsaf', 'Sidi Ali', 'Sidi Bellater', 'Sidi Lakhdar', 'Souaflia', 'Stidia', 'Tazgait', 'Touahria'],
  'M\'Sila': ['M\'Sila', 'Ain El Hadjel', 'Ain El Melh', 'Ain Fares', 'Ain Khadra', 'Ain Rich', 'Ain Soltane', 'Ain Zana', 'Ben Srour', 'Berhoum', 'Bou Saada', 'Chellal', 'Dehahna', 'Djebel Messaad', 'El Hamel', 'El Houamed', 'El Oueldja', 'Hammam Dalaa', 'Khoubana', 'Maadid', 'Magra', 'M\'Cif', 'Medjedel', 'Menaa', 'M\'Sila', 'Ouanougha', 'Ouled Addi Guebala', 'Ouled Derradj', 'Ouled Madhi', 'Ouled Mansour', 'Ouled Sidi Brahim', 'Ouled Slimane', 'Ouled Tebben', 'Oultem', 'Sidi Aissa', 'Sidi Hadjeres', 'Sidi M\'Hamed', 'Souamaa', 'Tarmount', 'Zarzour'],
  'Mascara': ['Mascara', 'Ain Fares', 'Ain Fekan', 'Ain Ferah', 'Ain Fras', 'Ain Kihal', 'Ain Sidi Cherif', 'Ain Trid', 'Alaimia', 'Beniane', 'Bou Hanifia', 'Bou Henni', 'Chorfa', 'El Bordj', 'El Gaada', 'El Ghomri', 'El Guettana', 'El Hachem', 'El Keurt', 'El Menaouer', 'Ferraguig', 'Froha', 'Gharrous', 'Ghriss', 'Guittena', 'Hachem', 'Hacine', 'Hammam Bouhadjar', 'Hammamet', 'Khalouia', 'Khouas', 'Lahmar', 'Maoussa', 'Mascara', 'Matemore', 'Mocta Douz', 'Mohammadia', 'Nesmoth', 'Oggaz', 'Oued El Abtal', 'Oued Taria', 'Ouled Benaouda', 'Ouled Bouachra', 'Ouled Maallah', 'Ouled Mansour', 'Ouled Sidi Mihoub', 'Ras El Ain', 'Sedjerara', 'Sehailia', 'Sidi Abdeldjebar', 'Sidi Boussaid', 'Sidi Kada', 'Sig', 'Tighennif', 'Tizi', 'Zahana', 'Zelameta'],
  'Ouargla': ['Ouargla', 'Ain Beida', 'Ain El Hadjar', 'Ain El Ibel', 'Ain Sidi Ali', 'Benaceur', 'Blidet Amor', 'Bordj Omar Driss', 'El Allia', 'El Borma', 'El Hadjira', 'El Oued', 'Hassi Ben Abdellah', 'Hassi Messaoud', 'M\'Naguar', 'M\'Rara', 'N\'Goussa', 'Ouargla', 'Rouissat', 'Sidi Khouiled', 'Sidi Slimane', 'Tebesbest', 'Temacine', 'Touggourt', 'Zaouia El Abidia'],
  'Oran': ['Oran', 'Ain El Kerma', 'Ain El Turk', 'Arzew', 'Ben Freha', 'Bethioua', 'Bir El Djir', 'Boufatis', 'Bousfer', 'Boutlelis', 'El Ancer', 'El Braya', 'El Kerma', 'Es Senia', 'Gdyel', 'Hassi Ben Okba', 'Hassi Bounif', 'Hassi Mefsoukh', 'Hassi Messaoud', 'Misserghin', 'M\'Sila', 'Oran', 'Oued Tlelat', 'Ouled Ben Abdelkader', 'Ouled Mimoun', 'Sidi Ben Yebka', 'Sidi Chami', 'Sidi Lakhdar', 'Tafraoui', 'Touahria'],
  'El Bayadh': ['El Bayadh', 'Ain El Orak', 'Ain Sidi Slimane', 'Arbaouat', 'Boualem', 'Bougtob', 'Boukais', 'Boussemghoun', 'Brezina', 'Cheguig', 'Chellala', 'Dahmouni', 'El Abiodh Sidi Cheikh', 'El Bayadh', 'El Kheither', 'El Meghaier', 'Ghassoul', 'Kef El Ahmar', 'Krakda', 'Rogassa', 'Sidi Ameur', 'Sidi Slimane', 'Sidi Tifour', 'Stitten', 'Tousmouline'],
  'Illizi': ['Illizi', 'Amguid', 'Bordj Omar Driss', 'Debdeb', 'Illizi', 'In Amenas', 'Zarzaitine'],
  'Bordj Bou Arréridj': ['Bordj Bou Arréridj', 'Ain Taghrout', 'Ain Tesra', 'Belimour', 'Ben Daoud', 'Bir Kasdali', 'Bordj Bou Arréridj', 'Bordj Ghdir', 'Bordj Zemmoura', 'Bougaa', 'Boumerdes', 'Colla', 'Djaafra', 'El Achir', 'El Achour', 'El Anasser', 'El Euch', 'El Hamadia', 'El M\'Hir', 'El Mokrani', 'Ghilassa', 'Haraza', 'Hasnaoua', 'Ksour', 'Mansoura', 'Medjana', 'Ouled Brahim', 'Ouled Dahmane', 'Ouled Sidi Brahim', 'Rabta', 'Ras El Oued', 'Sidi Embarek', 'Tafreg', 'Taglait', 'Tassameurt', 'Tefreg', 'Teniet En Nasr', 'Tixter', 'Zemmoura'],
  'Boumerdès': ['Boumerdès', 'Ain El Assel', 'Ain Tagourait', 'Baghlia', 'Ben Choud', 'Beni Amrane', 'Bordj Menaiel', 'Boudouaou', 'Boudouaou El Bahri', 'Boumerdes', 'Bouzegza Keddara', 'Chabet El Ameur', 'Corso', 'Dellys', 'Djinet', 'El Kharrouba', 'Hammedi', 'Isser', 'Keddara', 'Khemis El Khechna', 'Larbatache', 'Leghata', 'Naciria', 'Ouled Aissa', 'Ouled Hedadj', 'Ouled Moussa', 'Reggane', 'Si Mustapha', 'Sidi Daoud', 'Souk El Had', 'Taourga', 'Thenia', 'Timezrit', 'Zemmouri'],
  'El Tarf': ['El Tarf', 'Ain El Assel', 'Ain Kerma', 'Ain Zana', 'Ben M\'Hidi', 'Berrihane', 'Besbes', 'Bouhadjar', 'Bouteldja', 'Chebaita Mokhtar', 'Chefia', 'Drean', 'El Aioun', 'El Kala', 'El Tarf', 'Hammam Beni Salah', 'Lac des Oiseaux', 'Oued Zitoun', 'Ouled Driss', 'Ouled Moussa', 'Raml Souk', 'Sidi Khellil', 'Souarekh', 'Zerizer', 'Zitouna'],
  'Tindouf': ['Tindouf', 'Oum El Assel', 'Tindouf'],
  'Tissemsilt': ['Tissemsilt', 'Ammari', 'Beni Chaib', 'Beni Lahcene', 'Bordj Bounaama', 'Bordj El Emir Abdelkader', 'Boucaid', 'Khemisti', 'Lardjem', 'Lazharia', 'Maacem', 'Melaab', 'Ouled Bessem', 'Sidi Abed', 'Sidi Boutouchent', 'Sidi Lantri', 'Sidi Slimane', 'Tamalaht', 'Theniet El Had', 'Tissemsilt', 'Youssoufia'],
  'El Oued': ['El Oued', 'Ain El Beida', 'Ain Chouhada', 'Bayadha', 'Beni Guecha', 'Debila', 'Djamaa', 'Douar El Ma', 'El M\'Ghair', 'El Oued', 'Guemar', 'Hassi Khalifa', 'Kouinine', 'Magrane', 'Mih Ouansa', 'Nakhla', 'Oued El Alenda', 'Oum Touyour', 'Reguiba', 'Robbah', 'Sidi Amrane', 'Sidi Khelil', 'Still', 'Taghzout', 'Taleb Larbi', 'Tendla', 'Trifaoui'],
  'Khenchela': ['Khenchela', 'Ain Touila', 'Babar', 'Bouhmama', 'Chechar', 'Chelia', 'Djellal', 'El Hamma', 'El Mahmal', 'El Oueldja', 'Ensigha', 'Fais', 'Kaïs', 'Khenchela', 'Khirane', 'M\'Sara', 'M\'Toussa', 'Ouled Rechache', 'Remila', 'Tamza', 'Yabous'],
  'Souk Ahras': ['Souk Ahras', 'Ain Zana', 'Ain Soltane', 'Ain El Hadjar', 'Ain Kechra', 'Ain Tine', 'Bir Bouhouche', 'Drea', 'Hanancha', 'M\'Daourouch', 'Mechroha', 'Merahna', 'Oued Keberit', 'Ouled Driss', 'Ouled Moumen', 'Ragouba', 'Sedrata', 'Sidi Fredj', 'Taoura', 'Terraguelt', 'Tiffech', 'Zaarouria'],
  'Tipaza': ['Tipaza', 'Ahmar El Ain', 'Ain Tagourait', 'Attatba', 'Bou Haroun', 'Bou Ismaïl', 'Boumedfaa', 'Bourkika', 'Chaiba', 'Cherchell', 'Damous', 'Douaouda', 'Fouka', 'Gouraya', 'Hadjout', 'Hammam Righa', 'Kolea', 'Larhat', 'Menaceur', 'Merad', 'Messelmoun', 'Nador', 'Sidi Amar', 'Sidi Ghiles', 'Sidi Rached', 'Sidi Semiane', 'Tipaza'],
  'Mila': ['Mila', 'Ain Beida Harriche', 'Ain Mellouk', 'Ain Tine', 'Amira Arras', 'Beni Chibane', 'Bouhatem', 'Chelghoum Laid', 'Chigara', 'Derradji Bousselah', 'El Mechira', 'Elayadi Barbes', 'Ferdjioua', 'Grarem Gouga', 'Hamala', 'Mila', 'Minar Zarza', 'Oued Athmania', 'Oued Endja', 'Oued Seguen', 'Ouled Khalouf', 'Rouached', 'Sidi Khelifa', 'Sidi Merouane', 'Tadjenanet', 'Tassadane Haddada', 'Teleghma', 'Terrai Bainen', 'Tiberguent', 'Yahia Beniguecha', 'Zeghaia'],
  'Aïn Defla': ['Aïn Defla', 'Ain Benian', 'Ain Bouyahia', 'Ain Defla', 'Ain Lechiakh', 'Ain Soltane', 'Ain Torki', 'Arib', 'Bathia', 'Belaas', 'Ben Allal', 'Bir Ould Khelifa', 'Bordj El Emir Khaled', 'Boumedfaa', 'Bourached', 'Djelida', 'Djemaa Ouled Cheikh', 'El Abadia', 'El Amra', 'El Attaf', 'El Hassania', 'El Maine', 'Hammam Righa', 'Hoceinia', 'Khemis Miliana', 'Mekhatria', 'Miliana', 'Oued Chorfa', 'Oued Djemaa', 'Ouled El Ma', 'Rouina', 'Sidi Lakhdar', 'Tacheta Zougagha', 'Tarik Ibn Ziad', 'Tiberkanine', 'Zeddine'],
  'Naâma': ['Naâma', 'Ain Ben Khelil', 'Ain Sefra', 'Asla', 'Djeniene Bourezg', 'El Biod', 'Kasdir', 'Makman Ben Amer', 'Mecheria', 'Moghrar', 'Naâma', 'Sfissifa', 'Tiout'],
  'Aïn Témouchent': ['Aïn Témouchent', 'Aghlal', 'Ain El Arbaa', 'Ain Kihal', 'Ain Témouchent', 'Ain Tolba', 'Aoubellil', 'Beni Saf', 'Bou Zedjar', 'Chaabet El Leham', 'Chentouf', 'El Amria', 'El Emir Abdelkader', 'El Malah', 'El Messaid', 'Hammam Bou Hadjar', 'Hassasna', 'Hassi El Ghella', 'Oued Berkeche', 'Oued Sabah', 'Ouled Boudjemaa', 'Ouled Kihal', 'Ouled Mimoun', 'Sidi Ben Adda', 'Sidi Boumediene', 'Sidi Ouriache', 'Tamzoura', 'Terga'],
  'Ghardaïa': ['Ghardaïa', 'Berriane', 'Bounoura', 'Dhayet Bendhahoua', 'El Atteuf', 'El Guerrara', 'El M\'Ghair', 'Ghardaïa', 'Hassi Fehal', 'Hassi Gara', 'Mansoura', 'Metlili', 'Sebseb', 'Zelfana'],
  'Relizane': ['Relizane', 'Ain Defla', 'Ain Merane', 'Ammi Moussa', 'Belaas', 'Beni Dergoun', 'Beni Zentis', 'Bouguirat', 'Dar Ben Abdellah', 'Djidiouia', 'El Guettar', 'El H\'Madna', 'El Matmar', 'El Ouldja', 'Had Echkalla', 'Hamri', 'Lahlef', 'Lazharia', 'Mendes', 'Merdja Sidi Abed', 'Oued El Djemaa', 'Oued Essalem', 'Ouled Aiche', 'Ouled Sidi Mihoub', 'Ramka', 'Relizane', 'Sidi Khettab', 'Sidi Lazreg', 'Sidi M\'Hamed Ben Ali', 'Sidi Saada', 'Souk El Had', 'Yellel', 'Zemmora'],
  'Timimoun': ['Timimoun', 'Aougrout', 'Charouine', 'Deldoul', 'Fenoughil', 'Metarfa', 'Ouled Aissa', 'Ouled Said', 'Talmine', 'Timimoun'],
  'Bordj Badji Mokhtar': ['Bordj Badji Mokhtar', 'Timiaouine'],
  'Ouled Djellal': ['Ouled Djellal', 'Besbes', 'Doucen', 'Ras El Miad', 'Sidi Khaled'],
  'Béni Abbès': ['Béni Abbès', 'El Ouata', 'Igli', 'Kerzaz', 'Tamtert'],
  'In Salah': ['In Salah', 'Foggaret Ezzaouia'],
  'In Guezzam': ['In Guezzam', 'Tin Zaouatine'],
  'Touggourt': ['Touggourt', 'El Hadjira', 'Megarine', 'Nezla', 'Tebesbest'],
  'Djanet': ['Djanet', 'Bordj El Haouas'],
  'El Meghaier': ['El Meghaier', 'Djamaa', 'M\'Rara', 'Oum Touyour', 'Sidi Khelil'],
  'El Meniaa': ['El Meniaa', 'Hassi Gara', 'Hassi Fehal']
};

function getCurrentLang() {
  return localStorage.getItem('lang') || 'en';
}

function getBookTitle(book, lang) {
  // If you want to support English/Arabic titles, add both to the books object and select here
  return book.title;
}

function getCartObject() {
  const stored = JSON.parse(localStorage.getItem("cart")) || {};
  if (Array.isArray(stored)) {
    const obj = {};
    stored.forEach(id => { obj[id] = (obj[id] || 0) + 1; });
    localStorage.setItem("cart", JSON.stringify(obj));
    return obj;
  }
  return stored;
}

function loadOrderSummary() {
  const cart = getCartObject();
  const cartItemsDiv = document.getElementById("cartItems");
  const orderDetailsDiv = document.getElementById("orderDetails");
  const totalPriceLabel = document.getElementById("totalPrice");
  
  
  // Check if required elements exist
  if (!cartItemsDiv || !orderDetailsDiv || !totalPriceLabel) {
    console.error("Required DOM elements not found");
    return;
  }
  
  let subtotal = 0;
  cartItemsDiv.innerHTML = "";
  orderDetailsDiv.innerHTML = "";
  const lang = getCurrentLang();
  
  // Check if cart is empty
  if (Object.keys(cart).length === 0) {
    cartItemsDiv.innerHTML = '<div class="book-item" style="text-align: center; color: #666; font-style: italic;">Your cart is empty. Please add some books to continue.</div>';
    orderDetailsDiv.innerHTML = '<span>No items</span><span>0 DZD</span>';
    totalPriceLabel.textContent = "0 DZD";
    return;
  }
  
  Object.keys(cart).forEach(bookId => {
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
    const qty = cart[bookId] || 1;
    let price = 0;
    if (book.price) {
      price = parseFloat(book.price.replace(/[^\d.]/g, ""));
    }
    subtotal += price * qty;
    const itemDiv = document.createElement("div");
    itemDiv.className = "book-item";
    itemDiv.innerHTML = `
      <span>${getBookTitle(book, lang)}</span>
      <div style="display:flex; gap:8px; align-items:center;">
        <button aria-label="Decrease" data-id="${bookId}" class="qty-dec" style="background:#e5e7eb; padding:2px 8px; border-radius:6px;">-</button>
        <span class="qty" data-id="${bookId}">${qty}</span>
        <button aria-label="Increase" data-id="${bookId}" class="qty-inc" style="background:#e5e7eb; padding:2px 8px; border-radius:6px;">+</button>
        <span style="min-width:80px; text-align:right;">${price * qty} DZD</span>
      </div>`;
    cartItemsDiv.appendChild(itemDiv);
    const detailDiv = document.createElement("span");
    detailDiv.innerHTML = `${getBookTitle(book, lang)} × ${qty}`;
    const priceDiv = document.createElement("span");
    priceDiv.innerHTML = `${price * qty} DZD`;
    orderDetailsDiv.appendChild(detailDiv);
    orderDetailsDiv.appendChild(priceDiv);
  });
  totalPriceLabel.textContent = `${subtotal} DZD`;
}
document.addEventListener("DOMContentLoaded", function() {
  populateWilayas();

  const wilayaSelect = document.getElementById('checkout-wilaya-select');
  const dairaSelect = document.getElementById('checkout-daira-select');
  const deliverySelect = document.getElementById('checkout-delivery-select');

  if (wilayaSelect) {
    if (wilayaSelect.value) {
      populateDairas(wilayaSelect.value);
    }
    wilayaSelect.addEventListener('change', function() {
      populateDairas(this.value);
      if (dairaSelect) {
        dairaSelect.value = '';
      }
    });
  }

  if (dairaSelect && (!wilayaSelect || !wilayaSelect.value)) {
    dairaSelect.disabled = true;
  }

  if (deliverySelect) {
    toggleAddressField(deliverySelect.value);
    deliverySelect.addEventListener('change', function() {
      toggleAddressField(this.value);
    });
  }

  // Add a small delay to ensure everything is loaded
  setTimeout(loadOrderSummary, 100);
});

// Quantity controls (event delegation)
document.addEventListener('click', function(e) {
  if (e.target && (e.target.classList.contains('qty-inc') || e.target.classList.contains('qty-dec'))) {
    const id = e.target.getAttribute('data-id');
    
    // Check if book is out of stock
    const outOfStockBooks = ['la_yumkinuka_iidhaayi', 'the_hunger_games'];
    if (outOfStockBooks.includes(id) && e.target.classList.contains('qty-inc')) {
      alert('This book is currently out of stock / هذا الكتاب نفدت الكمية حالياً');
      return;
    }
    
    const cart = getCartObject();
    const delta = e.target.classList.contains('qty-inc') ? 1 : -1;
    const next = (cart[id] || 0) + delta;
    if (next <= 0) {
      delete cart[id];
    } else {
      cart[id] = next;
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    loadOrderSummary();
  }
});
const checkoutForm = document.getElementById("checkoutForm");
if (checkoutForm) {
  checkoutForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // Collect form data
    const firstName = document.getElementById("checkout-name-input")?.value?.trim();
    const familyName = document.getElementById("checkout-family-input")?.value?.trim();
    const phoneNumber = document.getElementById("checkout-number-input")?.value?.trim();
    const instagramUsername = document.getElementById("checkout-instagram-input")?.value?.trim();
    const deliveryMethod = document.getElementById("checkout-delivery-select")?.value;
    const wilaya = document.getElementById("checkout-wilaya-select")?.value;
    const daira = document.getElementById("checkout-daira-select")?.value;
    const address = document.getElementById("checkout-address-input")?.value?.trim();
    const cartItems = getCartObject();

    // Form validation
    if (!firstName) {
      alert('Please enter your first name');
      return;
    }
    if (!familyName) {
      alert('Please enter your family name');
      return;
    }
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }
    if (!deliveryMethod) {
      alert('Please select a delivery method');
      return;
    }
    if (!wilaya) {
      alert('Please select a wilaya');
      return;
    }
    if (!daira) {
      alert('Please select a daira');
      return;
    }
    if (deliveryMethod === 'home' && !address) {
      alert('Please enter your address for home delivery');
      return;
    }
    if (!cartItems || Object.keys(cartItems).length === 0) {
      alert('Your cart is empty. Please add some books before placing an order.');
      return;
    }

  // Extract only book titles from cart items and calculate total price
  let totalPrice = 0;
  const items = Object.keys(cartItems).map(bookId => {
    const book = books[bookId];
    const qty = cartItems[bookId] || 1;
    const title = book ? book.title : `Unknown Book (${bookId})`;
    
    // Calculate price for this book
    let price = 0;
    if (book && book.price) {
      price = parseFloat(book.price.replace(/[^\d.]/g, ""));
    }
    totalPrice += price * qty;
    
    return `${title} × ${qty}`;
  });

  // Send to backend
  console.log('Submitting order with total price:', totalPrice, 'DZD');
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([{ firstName, familyName, phoneNumber, instagramUsername, deliveryMethod, wilaya, daira, address, items, total_price: totalPrice }], { returning: 'representation' });

    if (error) {
      alert("ERROR " + error.message);
      console.error(error);
    } else if (data && data.length > 0) {
      alert("Successfully submitted order! Order ID: " + data[0].id);
      localStorage.removeItem("cart");
      window.location.href = "index.html";
    } else {
      alert("successfully submitted order!");
      localStorage.removeItem("cart");
      window.location.href = "index.html";
    }
  } catch (err) {
    alert("Network error. Please try again later.");
    console.error(err);
  }
  });
}

function getPlaceholderTexts(lang) {
  return {
    wilaya: lang === 'ar' ? 'اختر الولاية' : 'Select wilaya',
    daira: lang === 'ar' ? 'اختر الدائرة' : 'Select daira',
    delivery: lang === 'ar' ? 'اختر طريقة التوصيل' : 'Select delivery method'
  };
}

function populateWilayas() {
  const wilayaSelect = document.getElementById('checkout-wilaya-select');
  const dairaSelect = document.getElementById('checkout-daira-select');
  if (!wilayaSelect || !dairaSelect) return;

  const lang = getCurrentLang();
  const placeholders = getPlaceholderTexts(lang);

  wilayaSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.id = 'checkout-wilaya-placeholder';
  defaultOption.textContent = `${placeholders.wilaya} / ${lang === 'ar' ? 'Choose wilaya' : 'اختر الولاية'}`;
  wilayaSelect.appendChild(defaultOption);

  Object.keys(wilayaDairaData).sort().forEach(wilaya => {
    const option = document.createElement('option');
    option.value = wilaya;
    option.textContent = wilaya;
    wilayaSelect.appendChild(option);
  });

  dairaSelect.innerHTML = '';
  const dairaPlaceholder = document.createElement('option');
  dairaPlaceholder.value = '';
  dairaPlaceholder.id = 'checkout-daira-placeholder';
  dairaPlaceholder.textContent = `${placeholders.daira} / ${lang === 'ar' ? 'Choose daira' : 'اختر الدائرة'}`;
  dairaSelect.appendChild(dairaPlaceholder);
  dairaSelect.disabled = true;
}

function populateDairas(selectedWilaya) {
  const dairaSelect = document.getElementById('checkout-daira-select');
  if (!dairaSelect) return;

  const lang = getCurrentLang();
  const placeholders = getPlaceholderTexts(lang);

  dairaSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.id = 'checkout-daira-placeholder';
  placeholder.textContent = `${placeholders.daira} / ${lang === 'ar' ? 'Choose daira' : 'اختر الدائرة'}`;
  dairaSelect.appendChild(placeholder);

  const options = wilayaDairaData[selectedWilaya] || [];
  if (options.length === 0) {
    dairaSelect.disabled = true;
    return;
  }

  options.forEach(daira => {
    const option = document.createElement('option');
    option.value = daira;
    option.textContent = daira;
    dairaSelect.appendChild(option);
  });
  dairaSelect.disabled = false;
}

function toggleAddressField(deliveryMethod) {
  const addressField = document.getElementById('address-field');
  if (!addressField) return;

  const shouldShow = deliveryMethod === 'home';
  addressField.style.display = shouldShow ? 'block' : 'none';
  if (!shouldShow) {
    const addressInput = document.getElementById('checkout-address-input');
    if (addressInput) {
      addressInput.value = '';
    }
  }
}

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
