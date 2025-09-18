import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

const supabaseUrl = "https://fsximdllrhglabxbqvay.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"; // حطي هنا المفتاح العام من Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

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
  'Tiaret': ['Tiaret', 'Ain Bouchekif', 'Ain Deheb', 'Ain El Hadid', 'Ain Kermes', 'Ain Zarit', 'Bougara', 'Chehaima', 'Dahmouni', 'Djebilet Rosfa', 'Faidja', 'Frenda', 'Guertoufa', 'Hamadia', 'Ksar Chellala', 'Madna', 'Mahdia', 'Mechraa Sfa', 'Medroussa', 'Meghila', 'Mellakou', 'Nadorah', 'Naima', 'Oued Lili', 'Rahouia', 'Rechaiga', 'Sebaine', 'Sebt', 'Serghine', 'Si Abdelghani', 'Sidi Abderrahmane', 'Sidi Ali Mellal', 'Sidi Bakhti', 'Sidi Hosni', 'Sougueur', 'Tagdemt', 'Takhemaret', 'Tidda', 'Tousnina', 'Zmalet El Emir Abdelkader'],
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




document.addEventListener('DOMContentLoaded', function() {
  setLanguage(localStorage.getItem('lang') || 'en');
  
  // Populate wilaya dropdown
  const wilayaSelect = document.getElementById('checkout-wilaya-select');
  const dairaSelect = document.getElementById('checkout-daira-select');
  
  if (wilayaSelect) {
    const wilayas = Object.keys(wilayaDairaData);
    // Clear any stale options beyond placeholder
    while (wilayaSelect.options.length > 1) wilayaSelect.remove(1);
    wilayas.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      wilayaSelect.appendChild(opt);
    });
    
    // Add event listener for wilaya selection
    wilayaSelect.addEventListener('change', function() {
      const selectedWilaya = this.value;
      updateDairaOptions(selectedWilaya);
    });
  }
  
  // Function to update daira options based on selected wilaya
  function updateDairaOptions(wilaya) {
    if (dairaSelect) {
      // Clear existing options except placeholder
      while (dairaSelect.options.length > 1) dairaSelect.remove(1);
      
      if (wilaya && wilayaDairaData[wilaya]) {
        const dairas = wilayaDairaData[wilaya];
        dairas.forEach((daira) => {
          const opt = document.createElement('option');
          opt.value = daira;
          opt.textContent = daira;
          dairaSelect.appendChild(opt);
        });
      }
    }
  }

  // Handle delivery method change to show/hide address field
  const deliverySelect = document.getElementById('checkout-delivery-select');
  const addressField = document.getElementById('address-field');
  const addressInput = document.getElementById('checkout-address-input');
  
  if (deliverySelect && addressField && addressInput) {
    deliverySelect.addEventListener('change', function() {
      if (this.value === 'home') {
        addressField.style.display = 'block';
        addressInput.required = true;
      } else {
        addressField.style.display = 'none';
        addressInput.required = false;
        addressInput.value = ''; // Clear address when not needed
      }
    });
  }
});
// Full authoritative list of all books in the bookstore (copied from search.html)
const books = {
  // New books from the latest images
  ayyam_al_hijran: { title: "أيام الهجران", author: "إيلينا فيرانتي", price: "1,450.00" },
  al_3adat_al_dharia: { title: "العادات الذرية", author: "جيمس كلير", price: "1,400.00" },
        eva_luna: { title: "إيفا لونا", author: "إيزابيل الليندي", price: "2,100.00" },
  ghusoon_bunduq_1: { title: "غصون البندق - الكتاب الأول", author: "منى سلامة", price: "1,200.00" },
  ghusoon_bunduq_2: { title: "غصون البندق - الكتاب الثاني", author: "منى سلامة", price: "1,200.00" },
  kayf_tajid_al_hob: { title: "كيف تجد الحب", author: "آلان دو بوتون", price: "1,000.00" },
  masarrat_saghira: { title: "مسرات صغيرة", author: "آلان دو بوتون", price: "1,400.00" },
  hal_sata2kul_qatti: { title: "هل ستأكل قطتي مقلتي؟", author: "كيتلين دوتي", price: "2,250.00" },
  maktabat_muntasaf_al_layl: { title: "مكتبة منتصف الليل", author: "مات هيغ", price: "1,600.00" },
  
  // Keep some existing popular books
  el9adimon: { title: "القادمون", author: "أحمد خالد مصطفى", price: "1,800.00" },
  ard_zikola: { title: "أرض زيكولا", author: "عمرو عبد الحميد", price: "1,200.00" },
  fatat_al_yaka: { title: "فتاة الياقة", author: "عمرو عبد الحميد", price: "1,400.00" },
  beit_khalati: { title: "بيت خالتي", author: "أحمد خيري العمري", price: "1,600.00" },
  hobbit: { title: "القلق الاستباقي", author: "د.سالي م.وينستون د.مارتن ن.سيف", price: "1,300.00" },
  sapiens: { title: "واحة يعقوب", author: "عمرو عبد الحميد", price: "1,400.00" },
  alchemist: { title: "الهلكوت", author: "أحمد خالد مصطفى", price: "1,300.00" },
  warandpeace: { title: "الشيطان يحكي", author: "أحمد خالد مصطفى", price: "1,500.00" },
  hitchhikers: { title: "اعادة برمجة", author: "آنا فيرجسون", price: "1,300.00" },
  lotr: { title: "دليل الحياة الزوجية", author: "كيفن ليمان", price: "1,500.00" },
  frankenstein: { title: "نبوءة قصر السلطان", author: "مروى جوهر", price: "1,500.00" },
  odyssey: { title: "المخ الابله", author: "دين برنيت", price: "1,900.00" },
  mobydick: { title: "وادي الذئاب", author: "عمرو عبد الحميد", price: "1,400.00" },
  crimeandpunishment: { title: "عناق برائحة الورق", author: "منى سلامة", price: "1,400.00" },
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
  alsadis_ahmar: { title: "السادس احمر", author: "أحمد خيري العمري", price: "1,300.00" },
  tariq_jahannam: { title: "طريق جهنم", author: "أيمن العتوم", price: "1,900.00" },
  "3inaq_bara2i7a": { title: "عناق برائحة الورق", author: "منى سلامة", price: "1,400.00" },
  qadaya_sherlock: { title: "قضايا شيرلوك هولمز", author: "أرثر كونان دويل", price: "1,200.00" },
  matjar_daljot: { title: "متجر دالجوت للأحلام", author: "لي مي بيه", price: "1,400.00" },
  yasma3un_hasisaha: { title: "يسمعون حسيسها", author: "أيمن العتوم", price: "2,000.00" },
  al_houl: { title: "الهول", author: "أحمد خالد توفيق", price: "1,000.00" },
  the_witcher_sword_of_destiny: { title: "الويتشر سيف المصير", author: "أندجي سابكوفسكي", price: "1,600.00" },
  the_witcher_last_wish: { title: "الويتشر الأمنية الأخيرة", author: "أندجي سابكوفسكي", price: "1,500.00" },
  kun_al_shakhs: { title: "كن الشخص الذي يجعلك سعيدا", author: "مجهول", price: "1,200.00" },
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
  success_in_your_morning: { title: "نجاحك في صباحك", author: "بنيامين سبول ومايكل زاندر", price: "1,450.00" },
  
  // Missing books from the images
  al_baron: { title: "البارون", author: "شهد قربان", price: "1,300.00" },
  little_women: { title: "Little Women", author: "Louisa May Alcott", price: "850.00" },
  oliver_twist: { title: "Oliver Twist", author: "Charles Dickens", price: "1,800.00" },
  pride_and_prejudice: { title: "Pride and Prejudice", author: "Jane Austen", price: "1,000.00" },
  anne_of_green_gables: { title: "Anne of Green Gables", author: "Lucy Maud Montgomery", price: "850.00" },
  hasees: { title: "هسيس", author: "عبدالله بوموزة", price: "1,200.00" },
  hatha_ma_hadath_maaha: { title: "هذا ما حدث معها", author: "أسامة المسلم", price: "1,200.00" },
  
  // NEW BOOKS - First Half
  abi_alladhi_akraho: { title: "أبي الذي أكره", author: "د.عماد رشاد عثمان", price: "1,000.00" },
  ash3alni: { title: "أشعلني", author: "طاهرة مافي", price: "2,000.00" },
  al_layali_al_bayda: { title: "الليالي البيضاء", author: "دوستويفسكي", price: "800.00" },
  kull_azraq_al_sama: { title: "كل أزرق السماء", author: "ميليسا را كوستا", price: "2,000.00" },
  hakadha_tata3afa: { title: "هكذا تتعافى", author: "بريانا ويست", price: "1,200.00" },
  caraval: { title: "Caraval", author: "Stephanie Garber", price: "1,500.00" },
  
  // NEW BOOKS - Second Half
  it_ends_with_us: { title: "It Ends With Us", author: "Colleen Hoover", price: "1,400.00" },
  it_starts_with_us: { title: "It Starts With Us", author: "Colleen Hoover", price: "1,200.00" },
  water_moon: { title: "Water Moon", author: "Samantha Sotto Yambao", price: "1,500.00" },
  these_violent_delights: { title: "These Violent Delights", author: "Chloe Gong", price: "1,500.00" },
  majdouline: { title: "ماجدولين", author: "مصطفى لطفى المنفلوطي", price: "850.00" },
  la_yumkinuka_iidhaayi: { title: "لا يمكنك إيذائي", author: "ديفيد غوغينز", price: "1,500.00" }
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
  // Add a small delay to ensure everything is loaded
  setTimeout(loadOrderSummary, 100);
});

// Quantity controls (event delegation)
document.addEventListener('click', function(e) {
  if (e.target && (e.target.classList.contains('qty-inc') || e.target.classList.contains('qty-dec'))) {
    const id = e.target.getAttribute('data-id');
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
      .insert([{ firstName, familyName, phoneNumber, deliveryMethod, wilaya, daira, address, items, total_price: totalPrice }], { returning: 'representation' });

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
