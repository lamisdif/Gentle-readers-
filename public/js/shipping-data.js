/**
 * Shipping Data for Bookstore
 * Zones and Prices based on Wilaya
 */

var wilayaShippingPrices = {
  "Sétif": { home: 590, desk: 450 },
  "Batna": { home: 700, desk: 550 },
  "Béjaïa": { home: 700, desk: 550 },
  "Alger": { home: 700, desk: 550 },
  "Jijel": { home: 700, desk: 550 },
  "M'Sila": { home: 700, desk: 550 },
  "Bordj Bou Arreridj": { home: 700, desk: 550 },
  "Mila": { home: 700, desk: 550 },
  "Chlef": { home: 900, desk: 650 },
  "Oum El Bouaghi": { home: 900, desk: 650 },
  "Blida": { home: 900, desk: 650 },
  "Bouira": { home: 900, desk: 650 },
  "Tébessa": { home: 900, desk: 650 },
  "Tlemcen": { home: 900, desk: 650 },
  "Tiaret": { home: 900, desk: 650 },
  "Tizi Ouzou": { home: 900, desk: 650 },
  "Saida": { home: 900, desk: 650 },
  "Skikda": { home: 900, desk: 650 },
  "Sidi Bel Abbès": { home: 900, desk: 650 },
  "Annaba": { home: 900, desk: 650 },
  "Guelma": { home: 900, desk: 650 },
  "Constantine": { home: 900, desk: 650 },
  "Médéa": { home: 900, desk: 650 },
  "Mostaganem": { home: 900, desk: 650 },
  "Mascara": { home: 900, desk: 650 },
  "Oran": { home: 900, desk: 650 },
  "Boumerdès": { home: 900, desk: 650 },
  "El Tarf": { home: 900, desk: 650 },
  "Tissemsilt": { home: 900, desk: 650 },
  "Khenchela": { home: 900, desk: 650 },
  "Souk Ahras": { home: 900, desk: 650 },
  "Tipaza": { home: 900, desk: 650 },
  "Ain Defla": { home: 900, desk: 650 },
  "Ain Témouchent": { home: 900, desk: 650 },
  "Relizane": { home: 900, desk: 650 },
  "Laghouat": { home: 950, desk: 750 },
  "Biskra": { home: 950, desk: 750 },
  "Djelfa": { home: 950, desk: 750 },
  "Ouargla": { home: 950, desk: 750 },
  "El Oued": { home: 950, desk: 750 },
  "Ghardaïa": { home: 950, desk: 750 },
  "Ouled Djellal": { home: 950, desk: 750 },
  "Touggourt": { home: 950, desk: 750 },
  "El M'Ghair": { home: 950, desk: 750 },
  "El Menia": { home: 950, desk: 750 },
  "Adrar": { home: 1050, desk: 850 },
  "Béchar": { home: 1050, desk: 850 },
  "El Bayadh": { home: 1050, desk: 850 },
  "Naama": { home: 1050, desk: 850 },
  "Timimoun": { home: 1050, desk: 850 },
  "Bordj Badji Mokhtar": { home: 1050, desk: 850 },
  "Béni Abbès": { home: 1050, desk: 850 },
  "Tamanrasset": { home: 1600, desk: 1400 },
  "Illizi": { home: 1600, desk: 1400 },
  "Tindouf": { home: 1600, desk: 1400 },
  "In Salah": { home: 1600, desk: 1400 },
  "Djanet": { home: 1600, desk: 1400 },
  "In Guezzam": { home: 1600, desk: 1400 }
};

var wilayasData = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira", 
  "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saida", 
  "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", 
  "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arreridj", "Boumerdès", "El Tarf", "Tindouf", 
  "Tissemsilt", "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Ain Defla", "Naama", 
  "Ain Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", 
  "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Menia"
].map(name => ({ name }));



/**
 * COMPLETE DESKS/AGENCIES DATA
 * This object maps Wilaya -> Daira -> Array of Agencies
 * Currently using Wilaya -> Array of Dairas from previous version
 * and will need specific desk names to be added.
 */
var desksData = {
  "Adrar": {
    "Adrar": [
      { name: "Agence de Adrar [Yalidine]", address: "Rue Benhachem Maamar", code: "10102" },
      { name: "Agence El Hataba Adrar [EasyAndSpeed]", address: "Rue Allal, section 22, groupe de propriété 262, porte n°01, commune et wilaya d'Adrar", code: "10401" }
    ],
    "Reggane": [
      { name: "Agence Reggane [Yalidine]", address: "شارع الأمير عبد القادر حي 20 مسكن للتوفير و الاحتياط", code: "21101" }
    ]
  },
  "Chlef": {
    "Chlef": [
      { name: "Agence de Chlef [Yalidine]", address: "route national N4 Chlef", code: "21101" },
      { name: "Agence de Chlef [Guepex]", address: "Cité Cherifi Kadour, 113", code: "21102" },
      { name: "Agence Hay El Nasr [Zimou-Express]", address: "Agence Zimou Express, Hay El Nasr, Ouled Mohmed-Zone 04 (A coté de l'arrêt de bus)", code: "21103" }
    ],
    "Ténès": [
      { name: "Agence de Ténès [Guepex]", address: "Bt A2 Rdc Local 28, Sortie Ouest Route De Mostaganem", code: "23401" }
    ]
  },
  "Laghouat": {
    "Aflou": [
      { name: "Agence de Aflou [Yalidine]", address: "Hai Zahi Ben Aissa, Route El Bayadh (à coté de la centrale de police)", code: "31901" }
    ],
    "Laghouat": [
      { name: "Agence Laghouat (Cité OASIS) [EasyAndSpeed]", address: "Cité l'OASIS, centre ville Laghouat, Laghouat.", code: "30102" }
    ]
  },
  "Oum El Bouaghi": {
    "Aïn M'lila": [
      { name: "Agence de Aïn M'lila [Yalidine]", address: "Route Messas (à coté superette Amiche)", code: "40301" }
    ],
    "Oum el Bouaghi": [
      { name: "Agence de Oum el Bouaghi [Yalidine]", address: "Cité El Moustakbel", code: "40101" }
    ]
  },
  "Batna": {
    "Barika": [
      { name: "Agence de Barika [Guepex]", address: "Boulevard Azil Abdul Rahman, Rue Les Freres Debache, Route De Batna", code: "54201" }
    ],
    "Batna": [
      { name: "Agence des 500 Logements [Yalidine]", address: "Lotissement Meddour (En Face Lycee 500 Logements)", code: "50101" },
      { name: "Agence du CHU Route de Tazoult [Guepex]", address: "Cité frères Lombarkia, ex parc à fourrage", code: "50103" }
    ]
  },
  "Béjaïa": {
    "Akbou": [
      { name: "Agence de Akbou [Yalidine]", address: "Cite 16 Logement Eplf", code: "62501" }
    ],
    "Béjaïa": [
      { name: "Agence de Béjaïa (Cité Tobal) [Guepex]", address: "Cité Tobal en face de Syken collège, Béjaïa", code: "60101" },
      { name: "Agence de Béjaïa (Edimco) [Yalidine]", address: "Zone Industrielle, Rue Mahfoudi Fateh, Edimco, (Derrière le centre commercial Ritadj-Mall)", code: "60102" }
    ],
    "El Kseur": [
      { name: "Agence de El Kseur [Guepex]", address: "Rue Zema Abdelkader, commune d'El Ksar.", code: "64001" }
    ]
  },
  "Biskra": {
    "Biskra": [
      { name: "Agence de Biskra (Zone Ouest) [EasyAndSpeed]", address: "Coopératif du verger N°22 Zone Ouest, Biskra", code: "70402" }
    ],
    "El Kantara": [
      { name: "Agence El Kantara [Yalidine]", address: "Coopérative El Amel cité 5 juillet", code: "71601" }
    ],
    "Tolga": [
      { name: "Agence de Tolga [Guepex]", address: "Cité Sidi Rouak rue Soltani Ahmed", code: "73201" }
    ]
  },
  "Béchar": {
    "Béchar": [
      { name: "Agence de Béchar (Centre Ville) [Yalidine]", address: "Cite Hai El Badr, Lot N°50, Secteur N°49, Local 01, Béchar", code: "80101" },
      { name: "Agence Béchar (Cité Es Salam) [EasyAndSpeed]", address: "Quartier Essalam, Section 21, Groupe foncier n° 524, Béchar", code: "80102" }
    ]
  },
  "Blida": {
    "Blida": [
      { name: "Agence de Blida [Yalidine]", address: "La zone indistruelle Ben Boulaid (Devant Family Shop)", code: "90101" },
      { name: "Agence de Bab Dzair [Guepex]", address: "21 centre d'artisans, rue d'Alger", code: "90102" }
    ],
    "Boufarik": [
      { name: "Agence de Boufarik [Guepex]", address: "64 Rue Si Ben Youcef", code: "92001" }
    ],
    "Larbaa": [
      { name: "Agence de Larbaa [Zimou-Express]", address: "Rue El Emir Khaled", code: "92101" }
    ],
    "Mouzaia": [
      { name: "Agence Mouzaia Blida [Guepex]", address: "Quartier du marché groupe 36", code: "91601" }
    ],
    "Ouled Yaïch": [
      { name: "Agence Ouled Yaich [Yalidine]", address: "Rue de la mosquée", code: "90701" }
    ]
  },
  "Bouira": {
    "Aïn Bessem": [
      { name: "Agence Ain Bessem [Guepex]", address: "Rue Abdelkader Bouziane, Section 46 Groupe de propriété n°156 Commune d'Aïn Bessem", code: "100101" }
    ],
    "Bouira": [
      { name: "Agence de Bouira [Yalidine]", address: "Lotissement Amar Khoudja B0 (A Gauche Du Nouveau Rond Point D'Aigle En Allant Vers Le Boulevard)", code: "101601" }
    ],
    "Lakhdaria": [
      { name: "Agence de Lakhdaria [Yalidine]", address: "cité si Lakhdar Derrière l'Algérienne des Eaux, À côté du laboratoire Boudina.", code: "103101" }
    ],
    "Sour El Ghouzlane": [
      { name: "Agence de Sour El Ghouzlane [Guepex]", address: "N°03 Cite Sayeh, Section 13", code: "104101" }
    ]
  },
  "Tamanrasset": {
    "Tamanrasset": [
      { name: "Agence de Tamanrasset (Gataâ El Oued) [Guepex]", address: "Cité Gataâ El Oued N 742 743 Commune Tamanrasset", code: "110101" },
      { name: "Agence Tamanrasset (Tahaggart) [Yalidine]", address: "Tahaggart CHARKIA EN FACE MOSQUEE F.ZAHRAA", code: "110102" },
      { name: "Agence Tamanrasset (Sorro Ivolutif) [Easy&Speed]", address: "حي سورو (تجزئة 505 قطعة) بلدية تامنراست", code: "110103" }
    ]
  },
  "Tébessa": {
    "Cheria": [
      { name: "Agence Cheria (Tébessa) [Guepex]", address: "رقم 10مكرر التحصيص البلدي رقم 02", code: "120301" }
    ],
    "Tébessa": [
      { name: "Agence de Tébessa [Yalidine]", address: "Boulevard Houari Boumediene (En Face De La Pharmacie Hazourli)", code: "120101" },
      { name: "Centre de tri Skanska (Tébessa) [Yalidine]", address: "Cité El Amel, Skanska, Tébessa", code: "120103" }
    ]
  },
  "Tlemcen": {
    "Chetouane": [
      { name: "Agence Chetouane [Yalidine]", address: "Zone indistruelle", code: "135001" }
    ],
    "Maghnia": [
      { name: "Agence de Maghnia [Yalidine]", address: "Tafna N°4 Cite Perri", code: "132701" }
    ],
    "Remchi": [
      { name: "Agence Remchi [Yalidine]", address: "Rue Adjedir Mohamed", code: "130401" }
    ],
    "Tlemcen": [
      { name: "Agence de Tlemcen (Bel-Air) [Guepex]", address: "Quartier Mohammed 05- BEL-AIR", code: "130101" },
      { name: "Agence de Tlemcen (Mansourah) [Yalidine]", address: "Boulevard Imama (en face la piscine olympique)", code: "130103" }
    ]
  },
  "Tiaret": {
    "Tiaret": [
      { name: "Agence de Tiaret [Yalidine]", address: "Rue police Amer, n 161", code: "143901" }
    ]
  },
  "Tizi Ouzou": {
    "Azazga": [
      { name: "Agence de Azazga [Yalidine]", address: "01 Rue Djurdjura, Immeuble Ait Amara (Dépôt)", code: "151801" }
    ],
    "Beni Douala": [
      { name: "Agence Beni Douala [Yalidine]", address: "Beni Douala", code: "153201" }
    ],
    "Draâ Ben Khedda": [
      { name: "Agence de Draâ Ben Khedda [Guepex]", address: "Touares 01", code: "154701" }
    ],
    "Tizi Gheniff": [
      { name: "Agence de Tizi Gheniff [Guepex]", address: "Rue Fatoum Amar, Rez-De-Chaussee Btm 17, N° 02", code: "151101" }
    ],
    "Tizi Ouzou": [
      { name: "Agence de Bekkar [Guepex]", address: "Cite Bekkar Classe 78 Propriete Groupe 137 (En Face Placette)", code: "150101" },
      { name: "Agence de Nouvelle Ville [Yalidine]", address: "Nouvelle ville", code: "150102" }
    ]
  },
  "Alger": {
    "Aïn Benian": [
      { name: "Agence de Aïn Benian [Guepex]", address: "19 Route Al-Jamilah, Division Kargon", code: "164401" }
    ],
    "Alger Centre": [
      { name: "Sacré-Cœur [Guepex]", address: "116 Didouche Mourad, Sacre Cœur", code: "160101" }
    ],
    "Bab El Oued": [
      { name: "Agence de Bab El Oued [Guepex]", address: "107 Rue Colonel Lotfi", code: "160501" }
    ],
    "Bab Ezzouar": [
      { name: "Agence Bab Ezzouar [Yalitec]", address: "EPLF - Bab Ezzouar", code: "162102" }
    ],
    "Bachdjerrah": [
      { name: "Agence Bachdjerrah [WeCanServices]", address: "Bachdjerrah 3 derrière l'ancien APC, à environ 80 mètres du métro", code: "161601" }
    ],
    "Baraki": [
      { name: "Agence de Baraki [Guepex]", address: "Route de Larbâa (à coté de la supérette Promo+)", code: "161401" }
    ],
    "Bir Mourad Raïs": [
      { name: "Agence Bir Mourad Rais [EasyAndSpeed]", address: "14 rue des trois, Rue des Frères Bouadou, Bir Mourad Raïs 16005", code: "160902" }
    ],
    "Birkhadem": [
      { name: "Agence de Birkhadem [Yalidine]", address: "Cite Vergers Villa N°1", code: "161201" }
    ],
    "Birtouta": [
      { name: "Agence de Birtouta [Guepex]", address: "06 rue El Moudjahid Hamida Mouhamed (à côté de Supermarquet Saadi)", code: "163401" }
    ],
    "Bordj El Bahri": [
      { name: "Agence Bordj El Bahri (Café Chergui) [Yalidine]", address: "Groupe de propriété n°3065, section 02, rez-de-chaussée, commune de Bordj El Bahri, wilaya d'Alger", code: "163901" }
    ],
    "Bordj El Kiffan": [
      { name: "Agence de Bordj El Kiffan [Yalidine]", address: "Rue 1Er Novembre 26 Cite Mimouni N 04", code: "163001" }
    ],
    "Cheraga": [
      { name: "Dar Diaf [Yalidine]", address: "Dar Diaf (à Côté De La Supérette Sedda)", code: "165001" },
      { name: "HUB Cheraga (Plateau) [Yalidine]", address: "10, Rue Aïn Benian Partie: 192 C2, Cheraga, Alger", code: "165002" }
    ],
    "Dar El Beïda": [
      { name: "Agence d'El Hamiz [EasyAndSpeed]", address: "Cité les orangers Groupe A villa N°431, El Hamiz (en face le stade)", code: "162003" }
    ],
    "Djasr Kasentina": [
      { name: "Agence Gué de Constantine [SpeedMail]", address: "Cite Sonelgaz 2 Villa 184 Alger", code: "162602" }
    ],
    "Draria": [
      { name: "Agence de Draria [Guepex]", address: "Cite Darbush 145, Habitation 400, Batiment 2", code: "165301" }
    ],
    "Hussein Dey": [
      { name: "Hussein Dey [Yalidine]", address: "Route Tripoli N°152", code: "161701" }
    ],
    "Kouba": [
      { name: "Agence Kouba [Yalidine]", address: "Lotissement 26 Tranche 56 Local:01, Ben Omar, Kouba, Alger", code: "161801" }
    ],
    "Les Eucalyptus": [
      { name: "Agence Les Eucalyptus [Zimou-Express]", address: "Rue Les Eucalyptus, N°56, palais rouge", code: "163302" }
    ],
    "Mahelma": [
      { name: "Agence de Sidi Abdellah [Zimou-Express]", address: "Cité 1400 local C6 Bt C6 sidi Abdallah, Alger", code: "164701" }
    ],
    "Mohammadia": [
      { name: "Agence les Pins Maritime [Yalitec]", address: "Rue; Les Pins Maritime Alger", code: "162902" }
    ],
    "Oued Smar": [
      { name: "Agence El Harrach (Beaulieu) [WeCanServices]", address: "128 RUE BOUBAGHLA Lot 08 GPE MTE N°229 Lot N°02 RDC (BEAULIEU - OUED SEMAR)", code: "161503" }
    ],
    "Ouled Fayet": [
      { name: "Agence de Ouled Fayet [Guepex]", address: "19 route du stade communal", code: "165101" }
    ],
    "Reghaïa": [
      { name: "Agence de DNC [Yalidine]", address: "Cité El Ouancharis, DNC, Route de Ain Taya (En face Société générale)", code: "164301" }
    ],
    "Rouïba": [
      { name: "Agence de Rouiba [Zimou-Express]", address: "Rue Hassiba Ben Bouali (chemin polyclinique)", code: "164201" }
    ],
    "Zeralda": [
      { name: "Agence de Zeralda [Guepex]", address: "Local Commercial Rez De Chausser , Cite Yesswel Kouider N°01", code: "164601" }
    ]
  },
  "Djelfa": {
    "Aïn Oussara": [
      { name: "Agence de Aïn Oussara [Yalidine]", address: "Cité Mohamed Boudiaf (rue en face la BNA, à coté de douche Rebhi)", code: "170501" }
    ],
    "Djelfa": [
      { name: "Agence de Djelfa [Yalidine]", address: "Cité Boutrifis, route de Boussaâda, lotissement 137 N 06 Immeuble Djouaf Ameur", code: "171401" }
    ]
  },
  "Jijel": {
    "El Milia": [
      { name: "Agence de El Milia [Guepex]", address: "Rue Boulakirba Zidane", code: "180901" }
    ],
    "Jijel": [
      { name: "Agence de Jijel [Yalidine]", address: "Village Mustapha RDC ROUTE SOUMMAM N°24", code: "180101" }
    ],
    "Kaous": [
      { name: "Agence Kaous (Jijel) [Yalidine]", address: "Cité Amoura Messouad N°02 Commune Kaous,Jijel", code: "181401" }
    ],
    "Taher": [
      { name: "Agence de Taher [Guepex]", address: "Immeuble Des Bailleurs, Section 58, Groupement De Propriete N°111, Quartier Zemouch", code: "180501" }
    ]
  },
  "Sétif": {
    "Aïn Arnat": [
      { name: "Agence Ain Arnat [EasyAndSpeed]", address: "Quartier 400 logements, commune d'Aïn Arnat, site n°01, acte n°12, immeuble n°10, daïra d'Aïn Arnat, wilaya de Sétif", code: "190202" }
    ],
    "Aïn Oulmene": [
      { name: "Agence de Aïn Oulmene [Guepex]", address: "Cite 113, Immeuble Residentiel 63, Batiment 1 Rez-De-Chaussee, Entree 3", code: "190701" }
    ],
    "Bougaa": [
      { name: "Agence de Bougaa [Guepex]", address: "Rue Mohamed Chinoune", code: "192601" }
    ],
    "El Eulma": [
      { name: "Desk El Eulma [Yalidine]", address: "Rue Abdelaziz Khaled, n°119 (à côté du hôtel El Bez)", code: "193202" },
      { name: "Agence El Eulma (Cité Sonatrach Smara S) [EasyAndSpeed]", address: "Smara Sud, Section 14, Bloc N° 82+, Logement Participatif N° 06, El Eulma, Sétif", code: "193203" }
    ],
    "Sétif": [
      { name: "Agence Maabouda [Yalidine]", address: "Cite D'Al-Ma'Bouda, Escalier 1 Du Batiment B Section 203 Groupe 77 Parcelle 5", code: "195501" },
      { name: "Agence El Hidhab [Guepex]", address: "Cité El Hidhab, 110 Logements Participatifs, Bâtiment B, Classe 71", code: "195502" },
      { name: "Agence Centre ville [Guepex]", address: "Cité des Frères Mezouache, Section 240, Ilot 67, Rez-de-chaussée, Commune de Sétif", code: "195504" }
    ]
  },
  "Saïda": {
    "Saïda": [
      { name: "Agence de Saïda [Yalidine]", address: "cité Riadh (à coté de la mosquée Riadh)", code: "201101" }
    ]
  },
  "Skikda": {
    "Azzaba": [
      { name: "Agence de Azzaba [Guepex]", address: "Enseigne Cite Za'Af Rabeh", code: "210501" }
    ],
    "Collo": [
      { name: "Agence de Collo [Guepex]", address: "Boulevard Ruwaibah Taher", code: "211401" }
    ],
    "El Harrouch": [
      { name: "Agence de El Harrouch [Guepex]", address: "Cite 24 Logements Sociaux Covalent Sonatiba", code: "211801" }
    ],
    "Skikda": [
      { name: "Centre de tri et Agence Messiouen (Skikda) [Yalidine]", address: "30 logement Bt 02 Rue de Chaussée Skikda", code: "213501" },
      { name: "Nouvelle Agence Skikda L'espérance [Yalidine]", address: "Rue El Reboua El Djamila, partie N°01 rez-de-chaussée", code: "213502" },
      { name: "Agence de Skikda Faubourg [Guepex]", address: "Rue Bachir BOUKADOUM BT 06 local N° 1", code: "213503" }
    ]
  },
  "Sidi Bel Abbès": {
    "Sidi Bel Abbes": [
      { name: "Agence Sidi Bel Abbès [Yalidine]", address: "Rue Mascara, (à cote de l'hotel Beni Talla), Sidi Bel Abbès", code: "223601" },
      { name: "Agence Sidi Bel Abbès (Benhamouda) [Guepex]", address: "Benhamouda, (Monté Sogral avant la mosquée El Safaa), Sidi Bel Abbès", code: "223602" }
    ]
  },
  "Annaba": {
    "Annaba": [
      { name: "Agence de Valmascort [Yalidine]", address: "Avenue Seddik Benyahia Résidence * Fadi el Djamal *", code: "230101" },
      { name: "Agence de Sidi Brahim [Guepex]", address: "Champs de mars numéro n°3", code: "230102" },
      { name: "Agence Sidi Achour [GHANZOH Express By Yalidine]", address: "إقامة المنظر الجميل, Rte de Sidi Achour, Annaba", code: "230103" }
    ],
    "El Bouni": [
      { name: "Agence de El Bouni [Guepex]", address: "El Bouni – Centre, Section n°47, Groupe de propriété n°135, Immeuble n°01", code: "230501" }
    ]
  },
  "Guelma": {
    "Guelma": [
      { name: "Nouvelle Agence Guelma [Yalidine]", address: "Route Ain Larbi, local N°01, Guelma", code: "241901" }
    ],
    "Oued Zenati": [
      { name: "Agence de Oued Zenati [Guepex]", address: "Magasin Num 02", code: "243001" }
    ]
  },
  "Constantine": {
    "Constantine": [
      { name: "Agence Belle Vue [Yalidine]", address: "70 Rue Belle Vue, Les Combattants (Ancienne Ville)", code: "250401" },
      { name: "Agence Sidi Mabrouk [Guepex]", address: "نهج لعراقب احمد رقم 09", code: "250402" },
      { name: "Agence de Constantine (Zouaghi) [Zimou-Express]", address: "Illot N°01 , 212, ain el bay, zouaghi, Constantine", code: "250403" }
    ],
    "Didouche Mourad": [
      { name: "Agence de Didouche Mourad [Yalidine]", address: "El Riadh n°10", code: "250501" }
    ],
    "El Khroub": [
      { name: "Agence d'El Khroub [Guepex]", address: "Cité Bouhali Mohamed Said El Khroub", code: "250601" },
      { name: "Agence Nouvelle ville Ali Mendjeli [Yalidine]", address: "Zone d'Activité N°47 Nouvelle Ville, Ali MENDJLI", code: "250602" },
      { name: "Agence Nouvelle Ville [Guepex]", address: "650 lpa عمارة 24 زاوية محل 145", code: "250605" }
    ]
  },
  "Médéa": {
    "Beni Slimane": [
      { name: "Agence Médéa (Beni Slimane) [Yalidine]", address: "مجموعة ملكية رقم 44 قسم 44 بالتجزئة 55 حصة بني سليمان", code: "260701" }
    ],
    "Médéa": [
      { name: "Agence de Médéa (El Koutab) [Yalidine]", address: "Hai El Koutab Médéa (En face boutique Dyelna Shop)", code: "263301" },
      { name: "Agence de Médéa (Pole Urbain) [Guepex]", address: "Cité 80 Logs LSP Pole Urbain (à coté de la station de service Benhafri)", code: "263302" }
    ],
    "Tablat": [
      { name: "Agence Tablat [Yalidine]", address: "Rue Nationale N:08, Tablat, Médéa.", code: "265901" }
    ]
  },
  "Mostaganem": {
    "Mostaganem": [
      { name: "Salamandre [Yalidine]", address: "Salamandre (Rond Point De La Douane)", code: "271801" },
      { name: "Kharouba [Guepex]", address: "Cité 600 logement Kharouba Mostaganem", code: "271802" }
    ]
  },
  "M'Sila": {
    "Berhoum": [
      { name: "Agence de Berhoum [Guepex]", address: "محل رقم 03 مجموعة ملكية 333 قسم 02 حي زيغود يوسف بلدية برهوم", code: "281001" }
    ],
    "Bou Saâda": [
      { name: "Agence de Bou Saâda [Yalidine]", address: "Cite 20 Aout 636/N°05 A", code: "281201" }
    ],
    "M'Sila": [
      { name: "Agence Salem Shopping Mall [Yalidine]", address: "Salem Shopping Mall, centre commercial (en face la daïra)", code: "282802" }
    ],
    "Sidi Aïssa": [
      { name: "Agence Sidi Aïssa [Guepex]", address: "بلدية سيدي عيسى E03 محل 07 حي الوئام المدني مجموعة ملكية 05 قسم 46 عمارة", code: "283901" }
    ]
  },
  "Mascara": {
    "Mascara": [
      { name: "Agence de Mascara [Yalidine]", address: "zone 08 a coté de la poste Emir Abdelkader", code: "292801" }
    ]
  },
  "Ouargla": {
    "Hassi Messaoud": [
      { name: "Agence de Hassi Messaoud [Yalidine]", address: "Derrière la CNAS, à coté de la clinique Ibn Sina", code: "300801" }
    ],
    "Ouargla": [
      { name: "Agence de Ouargla Centre Ville [Guepex]", address: "حي حركات", code: "301301" },
      { name: "Agence de Ouargla (Chetti el Wekal) [Yalidine]", address: "Ave 1er novembre 1954, El Mkhadma, (Arrêt de tram Chatte El Wakla)", code: "301302" }
    ]
  },
  "Oran": {
    "Arzew": [
      { name: "Agence de Arzew [Guepex]", address: "17 Lotissement N 66 Plan Lot 167", code: "310601" }
    ],
    "Bir El Djir": [
      { name: "El Morchid [Yalidine]", address: "Cooperative Immobiliere Dar El Amel N°68", code: "310301" },
      { name: "Agence Fernand Ville [Yalidine]", address: "65 Rue 1er Novembre Hai Khemisti ,part 4 (Mosquée el kods)", code: "310302" },
      { name: "Agence ILAF Belkaïd Oran [EasyAndSpeed]", address: "Groupe 122 Logement - résidence ILAF Belkaïd", code: "310303" }
    ],
    "Oran": [
      { name: "Cité Djamel [Guepex]", address: "Rond-point cité Djamel (en allant vers Hai Sabah)", code: "310102" },
      { name: "Agence de Gambetta [Zimou-Express]", address: "54 avenue d'arcole, Bouguerri Khelifa, Gambetta", code: "310103" },
      { name: "Agence Canastel [SpeedMail]", address: "25, Rue Akid Lotfi Local N° 02", code: "310104" }
    ]
  },
  "El Bayadh": {
    "El Bayadh": [
      { name: "Agence de El Bayadh [Yalidine]", address: "Rue Mohamed Touil (A Cote Auberge Hanna)", code: "320101" }
    ]
  },
  "Illizi": {
    "Illizi": [
      { name: "Agence de Illizi [Guepex]", address: "Chemin Ain El Kours Cite Salam", code: "330101" }
    ],
    "In Amenas": [
      { name: "Agence In Amenas [Guepex]", address: "القسم 12 مجموعة ملكية 56-342 مسكن بلدية ان اميناس", code: "330601" }
    ]
  },
  "Bordj Bou Arreridj": {
    "Bordj Bou Arreridj": [
      { name: "Agence BBA [Yalidine]", address: "Cite 17 octobre rue ameur tahar N°5", code: "340601" },
      { name: "Agence BBA Nouveau Lycée [Guepex]", address: "محلات تجارية الطيب خيرة قسم 118 مم 66 بورج بوعريريج 0", code: "340603" }
    ],
    "Ras El Oued": [
      { name: "Agence Ras El Oued [Guepex]", address: "Lotissement de 399 lots – Section 38, Groupe de propriété n°123, Commune de Ras El Oued", code: "342801" }
    ]
  },
  "Boumerdès": {
    "Bordj Menaiel": [
      { name: "Agence de Bordj Menaiel [Guepex]", address: "Rue Bouira Boualem, Section 02 Magasin 02", code: "350501" }
    ],
    "Boudouaou": [
      { name: "Agence Boudouaou [Guepex]", address: "مشروع 36 مسكن ترقوي اجتماعي عمارة ا حصة 13 طابق ارضي بن عجال بودواو ولاية بومرداس", code: "350201" }
    ],
    "Boumerdes": [
      { name: "Agence de Boumerdès [Yalidine]", address: "Cité Foés bâtiment B local N°04", code: "350101" }
    ],
    "Hammedi": [
      { name: "Agence Hammedi [WeCanServices]", address: "hammedi centre ville", code: "353601" }
    ]
  },
  "El Tarf": {
    "Dréan": [
      { name: "Agence Dréan El Tarf [Yalidine]", address: "Rue lmzaouda al-arbi el dréan", code: "361301" }
    ],
    "El Tarf": [
      { name: "Agence de El Tarf [Yalidine]", address: "Rue N°44 Cite Les Vergers", code: "361701" }
    ]
  },
  "Tindouf": {
    "Tindouf": [
      { name: "Agence de Tindouf [Yalidine]", address: "Cites Moussani (A Cote De La Radio)", code: "370201" }
    ]
  },
  "Tissemsilt": {
    "Tissemsilt": [
      { name: "Agence de Tissemsilt [Yalidine]", address: "Rue Bouis Ali Num 33 B Section 067 Groupe De Propriete 048", code: "382101" }
    ]
  },
  "El Oued": {
    "El Oued": [
      { name: "Agence de El Oued [Yalidine]", address: "Cite El Moudjahidine (en face Pharmacie Daghoum)", code: "390101" }
    ]
  },
  "Khenchela": {
    "Khenchela": [
      { name: "Agence Route de Meskiana [Yalidine]", address: "Route de Meskiana N°30 lot 66, Khenchela", code: "401302" }
    ]
  },
  "Souk Ahras": {
    "Souk Ahras": [
      { name: "Agence de Souk Ahras [Yalidine]", address: "Cité El Louz Lot 64 (les amandiers)", code: "410101" }
    ]
  },
  "Tipaza": {
    "Cherchell": [
      { name: "Agence Cherchell [Guepex]", address: "N°05 Rue MELHANI ABDERRAHMAN", code: "422201" }
    ],
    "Hadjout": [
      { name: "Agence Hadjout (Rue de stade) [EasyAndSpeed]", address: "Rue de stade RDC Hadjout, Tipaza", code: "421201" }
    ],
    "Koléa": [
      { name: "Agence Koléa [Guepex]", address: "Koléa , Lotissement Amara N°1 Route de Fouka (En Face CEM Noureddine Bouguera)", code: "423501" }
    ],
    "Tipaza": [
      { name: "Agence Tipaza [Yalidine]", address: "24 cite M'hamed Bougara (El Garari)", code: "420101" }
    ]
  },
  "Mila": {
    "Chelghoum Laid": [
      { name: "Agence de Chelghoum Laid [Yalidine]", address: "Rue 01 Novembre, A Côté D'Hôtel El Rhumel", code: "430801" }
    ],
    "Ferdjioua": [
      { name: "Agence Ferdjioua [Guepex]", address: "المحل 01الحصة 04 رقم04 تجزئة التعاونية العقارية الوفاق بلدية فرجيوة", code: "431302" }
    ],
    "Mila": [
      { name: "Centre de tri Mila [Yalidine]", address: "Rue De Zerghia (A Coté Du Point De Vente Iris Et Gam Assurance)", code: "431601" },
      { name: "Agence de Mila [Yalidine]", address: "الطابق الأرضي شارع بن قارة النوار بلدية ميلة", code: "431602" }
    ]
  },
  "Aïn Defla": {
    "Aïn Defla": [
      { name: "Agence de Aïn Defla [Guepex]", address: "Cite Khyat Mohammed (L’Arret De La Zone Industrielle En Face La Pompe d'essence)", code: "440101" }
    ],
    "Khemis Miliana": [
      { name: "Agence de Khemis Miliana [Guepex]", address: "Le Cote Ouest Du Quartier La Cadette Route Nationale", code: "442601" }
    ]
  },
  "Naâma": {
    "Mecheria": [
      { name: "Agence de Mecheria [Guepex]", address: "Rue Abdellaoui Mohammed Cité Iben Badis (Connue Hadj Taleb, Près De Pharmacie Abbad Amina Et École Primaire)", code: "450201" }
    ]
  },
  "Aïn Témouchent": {
    "Aïn Témouchent": [
      { name: "Agence de Aïn Témouchent [Yalidine]", address: "Sonne n5/ n 605/ d 228 logements, Hai Zitoun (à coté de la nouvelle agence de transport)", code: "460401" }
    ],
    "Beni Saf": [
      { name: "Agence de Beni Saf [Guepex]", address: "Cité Sohbi, zone urbaine (en face de la pompe d'essence)", code: "460701" }
    ]
  },
  "Ghardaïa": {
    "Bounoura": [
      { name: "Agence Bounoura (Ghardaia) [SpeedMail]", address: "Cité Bahman local 07 Route d’el Atteuf", code: "470201" }
    ],
    "Ghardaïa": [
      { name: "Agence de Thenia (Ghardaïa) [Guepex]", address: "Ghardaïa Thenia a coté de lycé mofdi zakaria", code: "470701" },
      { name: "Agence de Bouhraoua [Yalidine]", address: "Bouhraoua (En face centre d'exposition)", code: "470702" }
    ]
  },
  "Relizane": {
    "Relizane": [
      { name: "Agence de Relizane [Yalidine]", address: "Boulevard 69 Zaghloul (en face la banque d'Algérie)", code: "483001" }
    ]
  },
  "Timimoun": {
    "Timimoun": [
      { name: "Agence de Timimoun [Yalidine]", address: "Rue Mohamed El Hashemi", code: "490901" }
    ]
  },
  "Ouled Djellal": {
    "Ouled Djellal": [
      { name: "Agence de Ouled Djellal [Yalidine]", address: "Rue Gasmi Ibrahim (En Face Ecole Mazen School)", code: "512601" }
    ]
  },
  "Béni Abbès": {
    "Béni Abbès": [
      { name: "Agence de Béni Abbès [Yalidine]", address: "Route Nationale N° 06, Béni Abbès", code: "520101" }
    ]
  },
  "In Salah": {
    "In Salah": [
      { name: "Agence de In Salah [Yalidine]", address: "Centre ville (à coté de la poste et la maison de jeune)", code: "530801" }
    ]
  },
  "Touggourt": {
    "Touggourt": [
      { name: "Agence de Touggourt [Yalidine]", address: "Cite Rimal 01 (A Cote De La Pharmacie Harkati Route Nationale N°03)", code: "552001" }
    ]
  },
  "Djanet": {
    "Djanet": [
      { name: "Agence de Djanet [Guepex]", address: "Tin Khatma", code: "560201" }
    ]
  },
  "El M'Ghair": {
    "Djamaa": [
      { name: "Agence de Djamaa [Guepex]", address: "Cite Essalam (A Cote Du Clinique Douaa)", code: "572801" }
    ],
    "El M'Ghair": [
      { name: "Agence de El M'Ghair [Yalidine]", address: "Lotissement 360 Logements Nouvelle Zone Urbaine", code: "572701" }
    ]
  },
  "El Menia": {
    "El Menia": [
      { name: "Agence de El Menia [Yalidine]", address: "Route Unite Africaine", code: "580601" }
    ]
  }
};

// Internal map for fuzzy matching wilaya names
var wilayaNameMap = {
  "bejaia": "Béjaïa",
  "béjaïa": "Béjaïa",
  "algiers": "Alger",
  "alger": "Alger",
  "bordj bou arreridj": "Bordj Bou Arreridj",
  "bordj bou arréridj": "Bordj Bou Arreridj",
  "sidi bel abbes": "Sidi Bel Abbès",
  "sidi bel abbès": "Sidi Bel Abbès",
  "tlemcen": "Tlemcen",
  "tlémcen": "Tlemcen",
  "medea": "Médéa",
  "médéa": "Médéa",
  "oum el bouaghi": "Oum El Bouaghi",
  "oum elbouaghi": "Oum El Bouaghi",
  "khenchela": "Khenchela",
  "tipaza": "Tipaza",
  "ain defla": "Ain Defla",
  "aïn defla": "Ain Defla",
  "ain temouchent": "Ain Témouchent",
  "aïn témouchent": "Ain Témouchent"
};

function normalizeWilayaName(name) {
  if (!name) return "";
  const low = name.toLowerCase().replace(/-/g, ' ').trim();
  // Check direct map
  if (wilayaNameMap[low]) return wilayaNameMap[low];
  // Check if it matches any wilaya name in wilayasData (case-insensitive)
  if (typeof wilayasData !== 'undefined') {
    const found = wilayasData.find(w => w.name.toLowerCase() === low);
    if (found) return found.name;
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Helper Functions

function getShippingPrice(wilayaName, method = 'home') {
  const normName = normalizeWilayaName(wilayaName);
  const prices = wilayaShippingPrices[normName];
  if (prices) {
    return (method === 'desk') ? prices.desk : prices.home;
  }
  return 0;
}

function getDairas(wilayaName) {
  const normName = normalizeWilayaName(wilayaName);
  // Find key in desksData case-insensitively
  const actualKey = Object.keys(desksData).find(k => k.toLowerCase() === normName.toLowerCase());
  if (actualKey && desksData[actualKey]) {
    return Object.keys(desksData[actualKey]);
  }
  return [];
}

function getDesks(wilayaName, dairaName) {
  const normName = normalizeWilayaName(wilayaName);
  const actualKey = Object.keys(desksData).find(k => k.toLowerCase() === normName.toLowerCase());
  if (actualKey && desksData[actualKey] && desksData[actualKey][dairaName]) {
    return desksData[actualKey][dairaName];
  }
  return [];
}

function getAllWilayas() {
  return wilayasData.map(w => w.name).sort();
}
