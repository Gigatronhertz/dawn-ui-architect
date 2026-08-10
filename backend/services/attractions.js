// Nigerian tourist attractions, parks, and venues by state
// fee_min / fee_max in NGN (0 = free or not specified)
// fee_note carries practical context the AI uses when building itineraries
const SEED_DATA = [

  // ── Abia (Umuahia / Aba) ─────────────────────────────────────────────────
  ['Abia', 'National War Museum, Umuahia',           300,   1000,  '₦300–₦1,000; largest war-artefact collection in West Africa; Biafra exhibits'],
  ['Abia', 'Ojukwu Bunker, Umuahia',                 0,     0,     'Free — Biafra War underground bunker; guided tours available on request'],
  ['Abia', 'Arochukwu Long Juju Slave Route',        1000,  2000,  '₦1,000–₦2,000 + guide fee; 6 km historic slave-trade route through forest'],
  ['Abia', 'Ariaria International Market, Aba',      0,     0,     'Free entry — one of the largest markets in West Africa; shoes, textiles, goods'],
  ['Abia', 'Azumini Blue River',                     500,   1000,  '₦500–₦1,000; crystal-clear freshwater river; boat rides and swimming'],
  ['Abia', 'Aba Shopping & Food District',           0,     0,     'Free — Aba is Nigeria\'s manufacturing hub; leather goods, tailoring, suya spots'],

  // ── Adamawa (Yola) ───────────────────────────────────────────────────────
  ['Adamawa', 'Sukur Cultural Landscape (UNESCO)',   500,   1000,  '₦500–₦1,000 + guide; UNESCO World Heritage hilltop kingdom; iron-smelting pits'],
  ['Adamawa', 'Mandara Mountains',                   0,     0,     'Free — dramatic volcanic range on Cameroon border; trekking and village visits'],
  ['Adamawa', 'Koma Hills',                          0,     0,     'Free; remote highland settlements; 4WD recommended; traditional way of life'],
  ['Adamawa', 'Lamurde Hot Spring',                  500,   1000,  '₦500–₦1,000; natural hot spring near Numan; bathing pools on site'],
  ['Adamawa', 'Tongo Hills & Rock Formations',       0,     0,     'Free — unusual balancing granite rocks near Gombi; dramatic photography'],
  ['Adamawa', 'River Benue Waterfront, Yola',        0,     0,     'Free — scenic riverfront; local fish restaurants; canoe rides available'],

  // ── Akwa Ibom (Uyo) ─────────────────────────────────────────────────────
  ['Akwa Ibom', 'Ibeno Beach',                       0,     0,     'Free — longest beach in Nigeria (~60 km); seafood vendors; quieter than Lagos beaches'],
  ['Akwa Ibom', 'Oron Museum',                       500,   1000,  '₦500–₦1,000; important pre-colonial Ekpu ancestor figures; ~1 hr from Uyo by boat'],
  ['Akwa Ibom', 'Ibom Tropicana Entertainment',      2000,  5000,  '₦2,000–₦5,000 by activity; pool, rides, sports; Uyo\'s biggest leisure complex'],
  ['Akwa Ibom', 'Le Meridien Ibom Golf Resort',      5000,  10000, '₦5,000–₦10,000 day pass; 18-hole course, pool, spa; upscale setting'],
  ['Akwa Ibom', 'Uyo Cultural Centre',               500,   1000,  '₦500–₦1,000; Ibibio traditional crafts, dance costumes, carved masks'],
  ['Akwa Ibom', 'Ibom e-Library, Uyo',               0,     0,     'Free — architecturally striking modern public library; worth seeing exterior'],
  ['Akwa Ibom', 'Eket Waterfront & Beach',           0,     0,     'Free — coastal town ~1 hr from Uyo; oil-heritage area; quieter atmosphere'],

  // ── Anambra (Awka / Onitsha) ─────────────────────────────────────────────
  ['Anambra', 'Ogbunike Caves',                      3000,  4000,  '₦3,000 entry + ~₦1,000 guide; sacred cave system with 300+ carved steps; spiritual site'],
  ['Anambra', 'Agulu Lake',                          500,   1000,  '₦500–₦1,000; lake famous for sacred crocodiles; boat rides available'],
  ['Anambra', 'Igbo-Ukwu National Museum',           500,   1000,  '₦500–₦1,000; 9th-century bronze artefacts of extraordinary craftsmanship'],
  ['Anambra', 'Onitsha Main Market',                 0,     0,     'Free entry — one of the largest markets in Africa; River Niger views from bridge'],
  ['Anambra', 'Nnewi Auto Parts Market',             0,     0,     'Free entry — largest auto-parts market in Africa; industrial tourism, Nnewi'],
  ['Anambra', 'Omambala River, Otuocha',             500,   1000,  '₦500–₦1,000; scenic river; boat trips to riverside fishing villages'],
  ['Anambra', 'Nri Kingdom Heritage Sites',          500,   1000,  '₦500–₦1,000 + guide; spiritual origin of Igbo civilisation; shrines and monuments'],

  // ── Bauchi ──────────────────────────────────────────────────────────────
  ['Bauchi', 'Yankari National Park',                2000,  2000,  '₦2,000 adult entry; largest game reserve in Nigeria; elephants, baboons, hippos'],
  ['Bauchi', 'Wikki Warm Springs',                   0,     0,     'Free with park entry — crystal-clear natural warm pool inside Yankari; swimming allowed'],
  ['Bauchi', 'Bauchi Museum',                        500,   1000,  '₦500–₦1,000; traditional Bauchi emirate artefacts; colonial-era exhibits'],
  ['Bauchi', 'Gaji River Game Drive (Yankari)',       0,     0,     'Free with park entry; riverside wildlife; hippo sightings most mornings'],
  ['Bauchi', 'Emir\'s Palace, Bauchi',               0,     0,     'Free exterior; active emirate; guided palace tours by arrangement with palace staff'],

  // ── Bayelsa (Yenagoa) ───────────────────────────────────────────────────
  ['Bayelsa', 'Oloibiri Oil Well No. 1',             500,   1000,  '₦500–₦1,000; site of Nigeria\'s first commercial oil discovery (1956); heritage museum'],
  ['Bayelsa', 'Akassa Lighthouse & Beach',           0,     0,     'Free — 19th-century colonial lighthouse at Atlantic coast; boat hire required from Brass'],
  ['Bayelsa', 'Ox-Bow Lake, Yenagoa',               500,   1000,  '₦500–₦1,000; boating and fishing on a natural ox-bow lake; scenic wetland'],
  ['Bayelsa', 'Isaac Boro Park, Yenagoa',            0,     0,     'Free — well-kept city park; monument to Niger Delta activist Isaac Adaka Boro'],
  ['Bayelsa', 'Yenagoa Waterfront',                  0,     0,     'Free — riverside promenade; local food stalls and fish markets; sunset views'],

  // ── Benue (Makurdi) ─────────────────────────────────────────────────────
  ['Benue', 'Enemabia Warm Spring, Gboko',           0,     0,     'Free; natural warm spring used for bathing and healing; traditional Tiv site'],
  ['Benue', 'Ushongo Hills',                         500,   1000,  '₦500–₦1,000 + guide; dramatic granite inselbergs; views across Benue valley'],
  ['Benue', 'River Benue Waterfront, Makurdi',       0,     0,     'Free — wide river views from state capital; local fish restaurants; sunset canoes'],
  ['Benue', 'Benue State Museum, Makurdi',           500,   1000,  '₦500–₦1,000; Tiv cultural artefacts, bronze objects, traditional war instruments'],
  ['Benue', 'Katsina-Ala River Gorge',               0,     0,     'Free — scenic river valley in Katsina-Ala LGA; Tiv farming communities; canoe hire'],

  // ── Borno (Maiduguri) ── ACTIVE SECURITY ADVISORY — verify before travel ─
  ['Borno', 'Shehu of Borno\'s Palace, Maiduguri',   0,     0,     'Free exterior — one of Nigeria\'s oldest royal palaces — VERIFY SECURITY before visiting'],
  ['Borno', 'Borno State Museum, Maiduguri',         500,   500,   '₦500; Kanem-Bornu Empire artefacts — VERIFY SECURITY ADVISORY before visiting'],
  ['Borno', 'Chad Basin National Park',              0,     0,     'Nominal — near Lake Chad; migratory birds — FCO/US STATE DEPT ADVISORY IN EFFECT'],

  // ── Cross River (Calabar) ────────────────────────────────────────────────
  ['Cross River', 'Obudu Mountain Resort',           1000,  1000,  '₦1,000 park access; cable car extra; cooler highland climate; stunning valley views'],
  ['Cross River', 'Agbokim Waterfalls',              500,   1000,  '₦500–₦1,000 + guide; seven-tier waterfall in dense forest; swimming in lower pools'],
  ['Cross River', 'Tinapa Business & Leisure Resort', 2000, 5000,  '₦2,000–₦5,000; water park, cinema, food court; Calabar\'s biggest leisure complex'],
  ['Cross River', 'Marina Resort, Calabar',          2000,  5000,  '₦2,000–₦5,000 day pass; riverfront resort; speedboat rides on Cross River'],
  ['Cross River', 'Old Residency Museum',            500,   1000,  '₦500–₦1,000; colonial-era building; Efik heritage, slave trade and missionary history'],
  ['Cross River', 'Kwa Falls, Afi Mountain Area',    1000,  2000,  '₦1,000–₦2,000; stunning waterfall in rainforest; ~2 hr drive from Calabar'],
  ['Cross River', 'CERCOPAN Primate Sanctuary',      2000,  5000,  '₦2,000–₦5,000; drill and primate rehabilitation centre; guided educational tour'],
  ['Cross River', 'National Museum Calabar',         500,   1000,  '₦500–₦1,000; Efik trade goods, masquerade regalia, colonial history'],
  ['Cross River', 'Calabar Waterfront Promenade',    0,     0,     'Free — scenic riverside walk; seafood restaurants; best at sunset; Christmas lights Dec'],
  ['Cross River', 'Duke Town Church & Slave History', 500,  1000,  '₦500–₦1,000; 1846 mission church; landing site of first missionaries in Nigeria'],
  ['Cross River', 'Drill Ranch, Afi Wildlife Sanctuary', 3000, 5000, '₦3,000–₦5,000; world\'s largest drill monkey colony; ~3 hr from Calabar; book ahead'],

  // ── Delta (Asaba / Warri) ────────────────────────────────────────────────
  ['Delta', 'Abraka River Resort',                   1000,  2000,  '₦1,000–₦2,000; resort on River Ethiope; swimming, boating, riverside chalets'],
  ['Delta', 'River Ethiope, Abraka',                 0,     0,     'Free entry to river — one of the clearest rivers in Nigeria; fishing and swimming'],
  ['Delta', 'Nana\'s Museum, Koko',                  500,   1000,  '₦500–₦1,000; celebrates Chief Nana Olomu; anti-colonial resistance history'],
  ['Delta', 'Mungo Park Residence, Burutu',          500,   1000,  '₦500–₦1,000; colonial-era house where explorer Mungo Park stayed; Niger Delta waterway'],
  ['Delta', 'Warri Waterfront',                      0,     0,     'Free — city river views; local fish market; catfish and banga soup restaurants'],
  ['Delta', 'Delta Mall, Warri',                     0,     0,     'Free entry — largest shopping mall in Niger Delta; cinema, restaurants, supermarket'],
  ['Delta', 'Gelegele Atlantic Beach',               500,   1000,  '₦500–₦1,000; coastal beach ~1 hr from Warri by road; local seafood on site'],
  ['Delta', 'Ughelli Craft & Heritage Area',         0,     0,     'Free — traditional Delta brasswork and carvings; workshops and vendors in town'],

  // ── Ebonyi (Abakaliki) ───────────────────────────────────────────────────
  ['Ebonyi', 'Uburu Salt Lake',                      0,     0,     'Free — ancient brine lake; traditional salt production; spiritual significance'],
  ['Ebonyi', 'Okposi Salt Lake',                     0,     0,     'Free — second salt lake; complementary visit with Uburu; traditional harvesting'],
  ['Ebonyi', 'Amanchor Cave, Abakaliki',             500,   1000,  '₦500–₦1,000; local cave system; guided walks; rock formations'],
  ['Ebonyi', 'Ndibe Sand Beach, Afikpo',             500,   1000,  '₦500–₦1,000; freshwater beach on Niger River tributary; popular on weekends'],
  ['Ebonyi', 'Abakaliki International Stadium & Park', 0,  0,     'Free grounds; impressive modern stadium; Abakaliki city centre landmark'],
  ['Ebonyi', 'Ikwo Waterfall',                       500,   1000,  '₦500–₦1,000; forested waterfall in Ikwo LGA; best in rainy season (June–October)'],

  // ── Edo (Benin City) ─────────────────────────────────────────────────────
  ['Edo', 'Oba\'s Palace, Benin City',               0,     2000,  'Free exterior; guided tours ₦1,000–₦2,000; seat of 900-year Benin Kingdom'],
  ['Edo', 'Benin City National Museum',              500,   1000,  '₦500–₦1,000; Benin Bronzes replicas, Yoruba heritage, colonial history'],
  ['Edo', 'Igun Street Bronze Casters',              0,     0,     'Free to walk — active bronze-casting guilds in ancient street; purchase optional'],
  ['Edo', 'Benin City Moats (Iya)',                  0,     0,     'Free — remnants of world\'s largest earthworks (~16,000 km²); longer than Great Wall of China'],
  ['Edo', 'Emotan Statue & Oba Market',              0,     0,     'Free — central market and iconic statue of legendary Benin woman warrior hero'],
  ['Edo', 'Okomu National Park',                     1000,  2000,  '₦1,000–₦2,000 + guide; rainforest reserve; white-throated monkeys, forest elephants'],
  ['Edo', 'Gelegele Atlantic Beach',                 500,   1000,  '₦500–₦1,000; coastal beach ~1 hr from Benin City; ocean swimming; local food'],
  ['Edo', 'Ring Road & Sapele Rd Nightlife Strip',   0,     0,     'Free entry — Benin City\'s main nightlife corridor; suya spots, bars, live music'],
  ['Edo', 'Osogan Forest Reserve',                   500,   1000,  '₦500–₦1,000; secondary forest near Benin; birdwatching and nature walks'],
  ['Edo', 'Igue Festival (December)',                0,     0,     'Free — annual royal festival at Oba\'s Palace; open-air cultural performances; contact palace for dates'],

  // ── Ekiti (Ado-Ekiti) ────────────────────────────────────────────────────
  ['Ekiti', 'Ikogosi Warm Springs',                  2000,  5000,  '₦2,000–₦5,000; unique warm and cold spring confluence; resort accommodation on site'],
  ['Ekiti', 'Arinta Waterfalls, Ipole-Iloro',        500,   1000,  '₦500–₦1,000 + guide; multi-tier waterfall in forest; swimming in lower pools'],
  ['Ekiti', 'Fajuyi Memorial Park, Ado-Ekiti',       500,   500,   '₦500; park and museum honouring military governor Fajuyi; pleasant grounds'],
  ['Ekiti', 'Olosunta Hills & Orole Cave',           500,   1000,  '₦500–₦1,000; sacred hills near Ikere-Ekiti; cave with Yoruba deity shrines'],
  ['Ekiti', 'Ikere Gorge Dam',                       500,   1000,  '₦500–₦1,000; large dam with scenic reservoir; boat rides possible'],
  ['Ekiti', 'Ebun Waterfalls, Ise-Ekiti',            500,   1000,  '₦500–₦1,000; forest waterfall; local guides available at site entrance'],
  ['Ekiti', 'Ado-Ekiti Heritage Museum',             500,   500,   '₦500; traditional Ekiti artefacts, crown jewels, masquerade regalia'],

  // ── Enugu ────────────────────────────────────────────────────────────────
  ['Enugu', 'Awhum Waterfall & Cave',                500,   1000,  '₦500–₦1,000; spectacular waterfall with cave behind it; Benedictine monastery on site'],
  ['Enugu', 'Ngwo Pine Forest & Waterfall',          500,   1000,  '₦500–₦1,000; pine forest picnic area; small waterfall; cool highland air year-round'],
  ['Enugu', 'Nike Lake Resort',                      5000,  10000, '₦5,000–₦10,000 day pass; upscale lakeside resort; pool, boat rides, restaurant'],
  ['Enugu', 'Polo Park Mall',                        0,     4500,  'Free entry to mall; cinema ₦2,500–₦4,500; restaurants and food court on site'],
  ['Enugu', 'Ezeagu Tourist Complex',                1000,  2000,  '₦1,000–₦2,000; caves, lakes and waterfalls in one site; ~45 min from Enugu city'],
  ['Enugu', 'Milken Hills, Enugu',                   0,     0,     'Free — rocky hillside at city edge; popular for evening walks; city panorama'],
  ['Enugu', 'Iva Valley Coal Mine Heritage',         0,     0,     'Free — site of 1949 miners\' massacre; memorial and heritage walk; brings history alive'],
  ['Enugu', 'Enugu State Zoo',                       500,   1000,  '₦500–₦1,000; animals native to Southeast Nigeria; family attraction'],
  ['Enugu', 'Independence Layout Restaurant Strip',  0,     0,     'Free — Enugu\'s premier food and bar street; local peppersoup, Igbo cuisine, nightlife'],

  // ── FCT / Abuja ─────────────────────────────────────────────────────────
  ['FCT', 'Millennium Park',                         0,     0,     'Free — large landscaped park in central Abuja; best on weekend mornings'],
  ['FCT', 'National Children\'s Park & Zoo',         500,   500,   '~₦500 adults; animals, rides, open green spaces; family attraction'],
  ['FCT', 'Discovery Museum',                        500,   1000,  '₦500–₦1,000; interactive exhibits on Nigerian history and science'],
  ['FCT', 'Nigerian National Mosque',                0,     0,     'Free — visitors welcome outside prayer times; one of the largest mosques in Africa'],
  ['FCT', 'National Christian Centre (NCCC)',        0,     0,     'Free — landmark cathedral; guided tours on request; striking modern architecture'],
  ['FCT', 'Unity Fountain',                          0,     0,     'Free — illuminated fountain near Three Arms Zone; best at night; popular weekend spot'],
  ['FCT', 'Aso Rock Scenic Viewpoint',               0,     0,     'Free — roadside viewpoint on Airport Road; interior access restricted to residents'],
  ['FCT', 'Jabi Lake Mall & Lakeside Walk',          0,     2000,  'Free entry to mall and lake path; boat rides ₦1,000–₦2,000/person'],
  ['FCT', 'Arts & Crafts Village, Gilmore',          0,     0,     'Free entry — indigenous crafts, textiles, bronze sculptures; bring cash for vendors'],
  ['FCT', 'Silverbird Galleria, Central Area',       0,     5000,  'Free entry to mall; cinema tickets ₦3,500–₦5,000; restaurants on site'],
  ['FCT', 'Ceddi Plaza, Wuse II',                    0,     5000,  'Free entry; bowling alley ₦3,000–₦5,000 per game; restaurants and lounge'],
  ['FCT', 'Wuse Market',                             0,     0,     'Free — largest retail market in Abuja; fabric, electronics, food, household goods'],
  ['FCT', 'Nike Art Gallery, Garki',                 0,     0,     'Free — four-storey gallery of contemporary Nigerian art and sculpture'],
  ['FCT', 'Ladi Kwali Pottery Centre, Wuse',         0,     500,   'Free–₦500 — traditional Gwari pottery workshops and displays; buy direct from potters'],
  ['FCT', 'Wonderland Fun Park, Wuse II',            2000,  5000,  '₦2,000–₦5,000 all-in wristband for rides and games; good for groups'],
  ['FCT', 'Transcorp Hilton Pool Day Pass',          10000, 15000, '₦10,000–₦15,000 — pool access at Abuja\'s most iconic hotel; café and bar included'],
  ['FCT', 'Usuma Dam Recreational Area',             0,     0,     'Free — scenic lake and picnic spot ~30 min from CBD; popular weekend escape'],
  ['FCT', 'Mpape Rock Plateau',                      0,     0,     'Free — panoramic views over Abuja skyline; best for sunrise or sunset hikes'],
  ['FCT', 'Zuma Rock Viewpoint (40 min drive)',      0,     0,     'Free — monolith on Abuja–Kaduna Expressway near Suleja; great roadside photo stop'],
  ['FCT', 'Gurara Waterfalls Day Trip (90 min)',     500,   500,   '₦500 entry in Niger State — popular half-day trip from Abuja; bring swimwear'],

  // ── Gombe ────────────────────────────────────────────────────────────────
  ['Gombe', 'Dadin Kowa Dam & Lake',                 0,     0,     'Free — large reservoir; boat rides; fishing; picnic area; good for bird watching'],
  ['Gombe', 'Tangale Peak & Rock',                   0,     0,     'Free — granite peak near Kaltungo; panoramic views across Gombe countryside'],
  ['Gombe', 'Bubayero\'s Tomb, Gombe Town',          0,     0,     'Free/donations — tomb of the founder of the Gombe emirate; active heritage site'],
  ['Gombe', 'Pantami Mountain, Gombe City',          0,     0,     'Free — rocky hill at city edge; morning walks; panoramic city views'],
  ['Gombe', 'Gombe State Museum',                    200,   500,   '₦200–₦500; Fulani, Tangale and Waja cultural artefacts'],

  // ── Imo (Owerri) ─────────────────────────────────────────────────────────
  ['Imo', 'Oguta Lake',                              500,   1000,  '₦500–₦1,000; large freshwater lake; boat rides; resort hotels on shore'],
  ['Imo', 'Oguta Lake Holiday Resort',               2000,  4000,  '₦2,000–₦4,000 day access; pool, boats, beach area on lake shore'],
  ['Imo', 'Mbari Cultural Centre, Owerri',           500,   1000,  '₦500–₦1,000; traditional Igbo mud sculpture gallery; rare cultural heritage'],
  ['Imo', 'Nekede Zoo & Botanical Garden',           500,   1000,  '₦500–₦1,000; animals native to Southeast Nigeria; shaded botanical section'],
  ['Imo', 'Cemetery Road Food & Suya Strip',         0,     0,     'Free — Owerri\'s famous late-night food street; peppered snails, point-and-kill fish'],
  ['Imo', 'Imo Mall, Owerri',                        0,     0,     'Free entry — modern shopping and dining centre in Owerri CBD'],
  ['Imo', 'Assumpta Cathedral, Owerri',              0,     0,     'Free — striking colonial-era Catholic cathedral; guided tours available'],
  ['Imo', 'Owerri Craft Centre',                     0,     0,     'Free — traditional Igbo textiles, pottery, carvings; vendors on site; buy direct'],

  // ── Jigawa (Dutse) ───────────────────────────────────────────────────────
  ['Jigawa', 'Birnin Kudu Rock Paintings',           0,     0,     'Free — ancient rock art; ~2 hrs from Dutse; local guide needed for site access'],
  ['Jigawa', 'Hadejia-Nguru Wetlands',               0,     0,     'Free — internationally important wetlands; spectacular migratory birds Oct–Mar'],
  ['Jigawa', 'Baturiya Bird Sanctuary',              0,     0,     'Nominal — flamingos and wetland birds; best November–March'],
  ['Jigawa', 'Dutse Rock',                           0,     0,     'Free — granite inselberg at state capital; panoramic views over flat Sahel plain'],
  ['Jigawa', 'Ringim Castle Ruins',                  0,     0,     'Free — ruins of 19th-century walled Hausa settlement; guide recommended'],

  // ── Kaduna ───────────────────────────────────────────────────────────────
  ['Kaduna', 'Kajuru Castle',                        20000, 30000, '₦20,000–₦30,000 day visit; ₦50,000+ per room; medieval-style castle; pool; book ahead'],
  ['Kaduna', 'Kamuku National Park',                 1000,  2000,  '₦1,000–₦2,000; woodland savannah; roan antelope, lions, hippos, leopards'],
  ['Kaduna', 'Lugard Hall & Colonial Heritage Area', 0,     0,     'Free exterior — seat of Northern Nigerian colonial government; historic architecture'],
  ['Kaduna', 'Arewa House Museum',                   500,   1000,  '₦500–₦1,000; archives and museum of Northern Nigerian political and cultural history'],
  ['Kaduna', 'Kaduna Zoological Garden',             500,   1000,  '₦500–₦1,000; animals native to Northern Nigeria; family attraction'],
  ['Kaduna', 'Matsirga Waterfall, Kafanchan',        500,   1000,  '₦500–₦1,000; waterfall in forest setting near Kafanchan; swimming allowed'],
  ['Kaduna', 'Nok Valley Archaeological Site',       1000,  2000,  '₦1,000–₦2,000 + guide; origin of Nok terracotta tradition (~500 BC); museum nearby'],
  ['Kaduna', 'Kagoro Hills',                         500,   1000,  '₦500–₦1,000; scenic highlands near Kafanchan; cool climate; walking trails'],
  ['Kaduna', 'Kaduna State Museum',                  500,   500,   '₦500; large collection of Northern Nigerian traditional arts and royal regalia'],
  ['Kaduna', 'Kauru Waterfalls',                     500,   1000,  '₦500–₦1,000; forested waterfall near Kauru town; best after rainy season (Oct–Dec)'],

  // ── Kano ────────────────────────────────────────────────────────────────
  ['Kano', 'Ancient Kano City Walls (Ganuwar Kano)', 0,    0,     'Free — 14th-century mud-brick walls; original gates still standing; guided walking tours'],
  ['Kano', 'Gidan Makama Museum',                    200,  500,   '₦200–₦500; Kano Emirate artefacts housed in a 15th-century palace building'],
  ['Kano', 'Emir\'s Palace, Kano',                   0,    2000,  'Free exterior; guided tours ₦1,000–₦2,000; active seat of Kano Emirate'],
  ['Kano', 'Kurmi Market, Old Kano',                 0,    0,     'Free entry — 500-year-old market; leather goods, spices, calabashes, Kano fabric'],
  ['Kano', 'Kofar Mata Dye Pits',                    0,    0,     'Free — working 500-year-old indigo dye pits; fascinating to watch; tip the guide'],
  ['Kano', 'Kantin Kwari Textile Market',            0,    0,     'Free entry — largest fabric market in West Africa; lace, brocade, ankara wholesale'],
  ['Kano', 'Dala Hill',                              500,  1000,  '₦500–₦1,000; ancient volcanic hill at city centre; founding site of Kano; panoramic views'],
  ['Kano', 'Kano State Museum & Zoo',                500,  1000,  '₦500–₦1,000; combined ticket; artefacts and native animals; family attraction'],
  ['Kano', 'Falgore Game Reserve',                   1000, 2000,  '₦1,000–₦2,000; savannah reserve ~70 km south of Kano; lions, roan antelope, warthog'],
  ['Kano', 'Challawa Gorge Dam',                     0,    0,     'Free — scenic dam southeast of Kano; weekend picnic spot; fishing allowed'],

  // ── Katsina ──────────────────────────────────────────────────────────────
  ['Katsina', 'Kusugu Well, Old Katsina City',       0,    0,     'Free — ancient well where Usman Dan Fodio reportedly drank; heritage site in old city'],
  ['Katsina', 'Gobarau Minaret',                     0,    0,     'Nominal — 15th-century tower; reportedly oldest minaret in sub-Saharan Africa'],
  ['Katsina', 'Katsina Emirate Palace',              0,    0,     'Free exterior; guided palace tours by arrangement; active emirate'],
  ['Katsina', 'Katsina State Museum',                200,  500,   '₦200–₦500; ancient manuscripts, Fulani cultural items, colonial history'],
  ['Katsina', 'Dutsin-Ma Hills',                     0,    0,     'Free — granite hills ~70 km from Katsina city; scenic drives and light hiking'],

  // ── Kebbi (Birnin Kebbi) ─────────────────────────────────────────────────
  ['Kebbi', 'Argungu Fishing & Cultural Festival',   0,    0,     'Free attendance — February annually; UNESCO cultural heritage; book accommodation months ahead'],
  ['Kebbi', 'Kanta Museum & Fort, Argungu',          500,  1000,  '₦500–₦1,000; 16th-century Kebbi Empire heritage; ancient armour and sword collection'],
  ['Kebbi', 'Kainji Lake National Park (Kebbi sector)', 1000, 2000, '₦1,000–₦2,000; shared park with Niger State; boating, fishing, wildlife safari'],
  ['Kebbi', 'Birnin Kebbi Waterfront',               0,    0,     'Free — River Rima views from state capital; local fishing communities; peaceful walks'],
  ['Kebbi', 'Argungu Heritage Town',                 0,    0,     'Free — traditional mud-brick architecture; pre-colonial Kebbi Kingdom centre'],

  // ── Kogi (Lokoja) ────────────────────────────────────────────────────────
  ['Kogi', 'Niger-Benue River Confluence',           0,    0,     'Free — visible meeting of two great rivers; boat trip ₦1,000–₦3,000 from Lokoja waterfront'],
  ['Kogi', 'Mount Patti',                            0,    0,     'Free — forested hill above Lokoja; first Nigerian flag raised here; panoramic river views'],
  ['Kogi', 'National Museum of Colonial History',    200,  500,   '₦200–₦500; Lugard\'s residence; original colonial memorabilia and documents'],
  ['Kogi', 'Fort Lugard & Lord Lugard\'s House',     500,  1000,  '₦500–₦1,000; colonial fort where Nigeria was named in 1914; riverside setting'],
  ['Kogi', 'Idah Heritage & Attah\'s Palace',        0,    0,     'Free exterior — Igala royal palace in Idah; River Niger setting; heritage walks'],
  ['Kogi', 'Lokoja Waterfront Fish Restaurants',     0,    0,     'Free entry — fresh catfish and tilapia grilled riverside; sunset boat trips available'],

  // ── Kwara (Ilorin) ───────────────────────────────────────────────────────
  ['Kwara', 'Owu Waterfalls',                        0,    0,     'Free — reportedly tallest waterfall in West Africa (~120 m); remote; guide essential'],
  ['Kwara', 'Esie Museum',                           500,  500,   '₦500; largest known collection of stone images in sub-Saharan Africa (~800 figures)'],
  ['Kwara', 'Ilorin Emir\'s Palace',                 0,    0,     'Free exterior — active Emirate palace; guided tours by arrangement with palace staff'],
  ['Kwara', 'Sobi Hill, Ilorin',                     0,    0,     'Free — hill offering views over Ilorin city; popular for morning walks and exercise'],
  ['Kwara', 'Erin-Ile Waterfalls',                   500,  1000,  '₦500–₦1,000; forested waterfall near Offa; natural swimming pool at base'],
  ['Kwara', 'Ipaye Cave & Rock',                     500,  1000,  '₦500–₦1,000 + guide; limestone cave with unusual formations; ~1 hr from Ilorin'],
  ['Kwara', 'Kwara Mall, Ilorin',                    0,    0,     'Free entry — modern mall; cinema, restaurants, supermarket'],
  ['Kwara', 'Dada Pottery, Ilorin',                  0,    0,     'Free to visit; traditional pottery-making demonstration; purchase directly from potters'],

  // ── Lagos ────────────────────────────────────────────────────────────────
  ['Lagos', 'Lekki Conservation Centre',             5000, 5000,  '₦5,000; longest canopy walkway in Africa; mangrove boardwalk; monkeys and 250+ bird species'],
  ['Lagos', 'Tarkwa Bay Beach',                      0,    0,     'Free entry; speedboat from CMS Marina ₦1,500–₦2,500 return; calm sheltered Atlantic beach'],
  ['Lagos', 'Nike Art Gallery, Victoria Island',     0,    0,     'Free — five-floor gallery of contemporary Nigerian art; restaurant on site; worth 2 hrs'],
  ['Lagos', 'Freedom Park, Lagos Island',            0,    0,     'Free — cultural events venue inside a converted colonial prison; concerts, food, art shows'],
  ['Lagos', 'Badagry Slave Port & Museum',           500,  2000,  '₦500–₦2,000 depending on tour; sobering transatlantic slave trade history; 90 min from Lagos'],
  ['Lagos', 'National Museum Lagos, Onikan',         500,  1000,  '₦500–₦1,000; Benin Bronzes, colonial artefacts, Nok terracotta; underrated gem'],
  ['Lagos', 'Terra Kulture, Victoria Island',        0,    0,     'Free gallery; Nigerian restaurant ₦8,000–₦20,000; theatre events ₦3,000–₦10,000'],
  ['Lagos', 'Elegushi Beach, Lekki',                 1000, 2000,  '₦1,000–₦2,000 entry; long Atlantic beach; food vendors, jet skis, beach volleyball'],
  ['Lagos', 'Eleko Beach',                           500,  1000,  '₦500–₦1,000; quieter beach beyond Lekki; suya and fresh fish spots on site'],
  ['Lagos', 'Lekki Arts & Crafts Market',            0,    0,     'Free entry — artisan market near Lekki roundabout; masks, beads, fabric, bronze; bargain'],
  ['Lagos', 'Eko Atlantic City Boardwalk',           0,    0,     'Free — reclaimed island waterfront; architectural walk; Atlantic Ocean views; new development'],
  ['Lagos', 'MUSON Centre, Onikan',                  0,    15000, 'Free to visit; concert tickets ₦3,000–₦15,000; Nigeria\'s premier classical and jazz venue'],
  ['Lagos', 'Balmoral Beach Club',                   5000, 10000, '₦5,000–₦10,000 day pass; private beach club; pool, sunbeds, bar, weekend DJ sets'],
  ['Lagos', 'Afrikiko Leisure Centre, GRA',          2000, 5000,  '₦2,000–₦5,000; multipurpose leisure complex; pool, sports courts, suya night market'],
  ['Lagos', 'Hard Rock Cafe Lagos, Victoria Island', 0,    0,     'Free entry; meals ₦8,000–₦20,000; memorabilia; live music some evenings'],

  // ── Nasarawa (Lafia) ─────────────────────────────────────────────────────
  ['Nasarawa', 'Farin Ruwa Waterfalls',              500,  1000,  '₦500–₦1,000; dramatic 150 m waterfall; best access dry season Nov–Mar; guide required'],
  ['Nasarawa', 'Keana Salt Lake',                    500,  1000,  '₦500–₦1,000; ancient brine lake; traditional salt production still practiced'],
  ['Nasarawa', 'Doma Castle & Ruins',                500,  500,   '₦500; ruins of 19th-century walled settlement on a hill; panoramic views'],
  ['Nasarawa', 'Awe Salt Lake',                      0,    0,     'Free — similar to Keana; traditional significance; complementary visit with Keana'],
  ['Nasarawa', 'Nasarawa State Museum, Lafia',       500,  500,   '₦500; Eggon, Tiv and Alago cultural artefacts and pre-colonial exhibits'],

  // ── Niger (Minna) ────────────────────────────────────────────────────────
  ['Niger', 'Gurara Waterfalls',                     500,  500,   '₦500; popular waterfall ~2 hrs from Abuja; natural pools at base; busy on weekends'],
  ['Niger', 'Zuma Rock',                             0,    0,     'Free — massive 725 m monolith on Abuja–Kaduna highway; iconic photo stop; no climbing'],
  ['Niger', 'Kainji Lake National Park',             1000, 2000,  '₦1,000–₦2,000; Nigeria\'s oldest national park (1976); lion, elephant, hippo, crocodile'],
  ['Niger', 'Kainji Dam & Museum',                   500,  500,   '₦500; viewpoint over dam wall; small museum on Niger River hydropower history'],
  ['Niger', 'Bida Glass & Brasswork Village',        0,    0,     'Free — artisans making traditional Bida glasswork and brass; buy direct from craftsmen'],
  ['Niger', 'Bida Emir\'s Palace',                   0,    0,     'Free exterior; active emirate; traditional brasswork heritage area nearby'],
  ['Niger', 'Shiroro Lake',                          1000, 2000,  '₦1,000–₦2,000; boat trips on large reservoir; fishing communities; scenic granite hills'],
  ['Niger', 'Lavun Waterfalls',                      500,  1000,  '₦500–₦1,000; waterfall in Lavun LGA; guide required; forest setting'],

  // ── Ogun (Abeokuta / Ijebu-Ode) ─────────────────────────────────────────
  ['Ogun', 'Olumo Rock, Abeokuta',                   1000, 2000,  '₦1,000 stairs / ₦2,000 elevator; historic granite rock fortress; museum; city views'],
  ['Ogun', 'Obasanjo Presidential Library',          5000, 5000,  '₦5,000; impressive building with grounds, gallery and library; Ota, Ogun State'],
  ['Ogun', 'Birikisu Sungbo Eredo',                  500,  1000,  '₦500–₦1,000 + guide; ancient earthworks (800 AD); longer than Great Wall of China section'],
  ['Ogun', 'Omo Forest Reserve',                     1000, 2000,  '₦1,000–₦2,000; biodiversity hotspot; guided tours; primates and forest elephants'],
  ['Ogun', 'Ijebu Museum, Ijebu-Ode',                500,  1000,  '₦500–₦1,000; Ijebu Kingdom artefacts, traditional textiles and beadwork'],
  ['Ogun', 'Awujale\'s Palace, Ijebu-Ode',           0,    0,     'Free exterior — active royal palace of Awujale of Ijebu; guided tours by arrangement'],
  ['Ogun', 'Abeokuta Pottery Village',               0,    0,     'Free — traditional pottery-making demonstrations; workshops and purchase on site'],
  ['Ogun', 'Olabisi Onabanjo University Campus',     0,    0,     'Free — pleasant Ago-Iwoye campus; botanical garden; architecture walk'],

  // ── Ondo (Akure) ─────────────────────────────────────────────────────────
  ['Ondo', 'Idanre Hills',                           1000, 1000,  '₦1,000; 660 steps to summit; ancient hilltop settlement; UNESCO tentative list; cocoa farm below'],
  ['Ondo', 'Igbo-Olodumare Sacred Forest, Idanre',  1000, 2000,  '₦1,000–₦2,000 + guide; sacred forest with spiritual and ecological significance'],
  ['Ondo', 'Oke Maria Mountain, Ondo City',          0,    0,     'Free — Catholic pilgrimage mountain; Stations of the Cross; city views from summit'],
  ['Ondo', 'Ebomi Sacred Lake',                      500,  1000,  '₦500–₦1,000; lake with spiritual significance; guided visits with local community'],
  ['Ondo', 'Ipele Waterfall',                        500,  1000,  '₦500–₦1,000; forested waterfall near Ipele; natural swimming pool'],
  ['Ondo', 'Akure Heritage Museum',                  500,  500,   '₦500; Deji of Akure palace artefacts; traditional Ondo and Yoruba history'],
  ['Ondo', 'Owo National Museum',                    500,  1000,  '₦500–₦1,000; remarkable 15th-century Yoruba bronze, terracotta and ivory finds'],

  // ── Osun (Osogbo / Ile-Ife) ─────────────────────────────────────────────
  ['Osun', 'Osun-Osogbo Sacred Grove (UNESCO)',      1000, 2000,  '₦1,000–₦2,000; UNESCO World Heritage riverside forest; Yoruba deity sculptures; peaceful walks'],
  ['Osun', 'Erin-Ijesha (Olumirin) Waterfalls',      500,  1000,  '₦500–₦1,000; seven-tier waterfall; swimming in lower tiers; popular on weekends'],
  ['Osun', 'National Museum Ile-Ife (Ife Museum)',   500,  1000,  '₦500–₦1,000; original Ife bronze and terracotta heads; world-class archaeological collection'],
  ['Osun', 'Ooni\'s Palace, Ile-Ife',                0,    2000,  'Free exterior; guided tours ₦1,000–₦2,000; spiritual capital of Yoruba people'],
  ['Osun', 'Obafemi Awolowo University Campus',      0,    0,     'Free — beautiful Ile-Ife campus; botanical gardens, natural history museum, gallery'],
  ['Osun', 'Osogbo Arts Village & Gallery',          0,    0,     'Free — cluster of independent studios near the Sacred Grove; Osogbo school of art'],
  ['Osun', 'Orole Caves, Ipetu-Ijesa',               500,  1000,  '₦500–₦1,000; limestone cave with bats and unusual formations; guided walks'],

  // ── Oyo (Ibadan) ─────────────────────────────────────────────────────────
  ['Oyo', 'Ado Awaye Suspended Lake',                500,  500,   '₦500; one of only two suspended lakes in the world; rope bridge; guided hike required'],
  ['Oyo', 'Agodi Gardens, Ibadan',                   1000, 1000,  '₦1,000; botanical garden in city centre; pond, walking paths, small animal section'],
  ['Oyo', 'University of Ibadan Zoological Garden', 1500, 1500,  '₦1,500; on UI campus; over 100 species; shaded paths; Nigeria\'s oldest zoo'],
  ['Oyo', 'Bower\'s Tower (Oke Are), Ibadan',        500,  1000,  '₦500–₦1,000; 1936 colonial landmark tower on city\'s highest hill; panoramic Ibadan views'],
  ['Oyo', 'Old Oyo National Park',                   1000, 2000,  '₦1,000–₦2,000; savannah reserve near Oyo town; lions, buffalo, warthog, roan antelope'],
  ['Oyo', 'Mapo Hall, Ibadan',                       0,    0,     'Free exterior — iconic 1929 colonial court building; Ibadan\'s most photographed landmark'],
  ['Oyo', 'Eleyele Lake & Dam',                      500,  500,   '₦500; urban lake and dam near Ibadan; boating, picnic area; popular at sunset'],
  ['Oyo', 'Cocoa House, Dugbe',                      0,    0,     'Free exterior — 1965 skyscraper; first high-rise in tropical Africa; heritage photo stop'],
  ['Oyo', 'Ibadan Museum of Natural History',        500,  1000,  '₦500–₦1,000; natural history and Nigerian cultural artefacts; UI campus'],
  ['Oyo', 'Dugbe Market / Gbagi Textile Hub',        0,    0,     'Free — Ibadan\'s main fabric market district; aso-oke, ankara, adire tie-dye wholesale'],

  // ── Plateau (Jos) ────────────────────────────────────────────────────────
  ['Plateau', 'Jos National Museum & Wildlife Park', 500,  1500,  '₦500–₦1,500; original Nok terracotta, traditional architecture display, animals; Nigeria\'s best museum'],
  ['Plateau', 'Shere Hills',                         0,    0,     'Free — granite hills 30 km from Jos; hiking, bouldering, rock pools; cool highland air year-round'],
  ['Plateau', 'Rayfield Resort, Jos',                2000, 5000,  '₦2,000–₦5,000 day pass; colonial-era resort; apple and strawberry orchards; pool; horse riding'],
  ['Plateau', 'Kurra Falls',                         500,  1000,  '₦500–₦1,000; waterfall inside rocky gorge near Pankshin; swimming pools at base'],
  ['Plateau', 'Assop Falls, Barkin Ladi',            500,  1000,  '₦500–₦1,000; multi-tier waterfall; natural swimming pools; ~40 min from Jos'],
  ['Plateau', 'Riyom Rock',                          0,    0,     'Free — striking natural balanced-rock formation near Riyom; ~30 min from Jos city'],
  ['Plateau', 'Pandam Wildlife Park',                1000, 2000,  '₦1,000–₦2,000; hippos, crocodiles, primates; northeast of Jos; birdwatching excellent'],
  ['Plateau', 'Jos Traditional Museum of Architecture', 500, 500, '₦500; outdoor display of replica traditional Nigerian buildings from different ethnic groups'],
  ['Plateau', 'Wase Rock, Wase',                     500,  1000,  '₦500–₦1,000; massive inselberg with Wase Emirate palace at base; ~2 hrs from Jos'],

  // ── Rivers (Port Harcourt) ───────────────────────────────────────────────
  ['Rivers', 'Port Harcourt Pleasure Park',          1500, 1500,  '₦1,500 adult + individual ride fees; city amusement park; waterpark section popular'],
  ['Rivers', 'Isaac Boro Park, GRA',                 0,    0,     'Free — well-maintained city park in GRA; popular with families; morning joggers'],
  ['Rivers', 'Port Harcourt Tourist Beach Club',     1000, 3000,  '₦1,000–₦3,000; waterfront club on Bonny Estuary; food, drinks, swimming area'],
  ['Rivers', 'Genesis Deluxe Cinemas, PH Mall',      2500, 4500,  '₦2,500–₦4,500; best cinema in Port Harcourt; international and Nollywood films'],
  ['Rivers', 'Rivers State Museum',                  500,  1000,  '₦500–₦1,000; Ogoni, Kalabari, Ijaw cultural artefacts and oil-heritage exhibits'],
  ['Rivers', 'Mile 1 Market, Port Harcourt',         0,    0,     'Free entry — largest market in PH; seafood, textiles, electronics; vibrant atmosphere'],
  ['Rivers', 'Bonny Island Heritage Day Trip',       5000, 10000, '₦5,000–₦10,000 return speedboat; Bonny Kingdom heritage; colonial cemetery; bird watching'],
  ['Rivers', 'Polo Club Port Harcourt',              0,    0,     'Free entry to grounds; polo matches on weekends; colonial leisure setting in GRA'],
  ['Rivers', 'Ada George Road Food & Nightlife',     0,    0,     'Free entry — PH\'s main bar and food strip; fish peppersoup, point-and-kill, live music'],

  // ── Sokoto ───────────────────────────────────────────────────────────────
  ['Sokoto', 'Sultan\'s Palace, Sokoto',             0,    0,     'Free exterior — seat of Sultan of Sokoto; most senior Muslim figure in Nigeria; guided tours by arrangement'],
  ['Sokoto', 'Hubbare (Tomb of Usman Dan Fodio)',    0,    0,     'Free/donations — tomb of Islamic scholar and Jihad leader; active pilgrimage site'],
  ['Sokoto', 'Waziri Junaidu History Museum',        200,  500,   '₦200–₦500; Sokoto Caliphate manuscripts, armour and relics; important Islamic heritage'],
  ['Sokoto', 'Sokoto State Museum',                  200,  500,   '₦200–₦500; Fulani and Hausa traditional artefacts; pre-colonial exhibits'],
  ['Sokoto', 'Sokoto Central Mosque',                0,    0,     'Free — one of the largest mosques in West Africa; visitors welcome outside prayer times'],
  ['Sokoto', 'Dange Historical Ruins',               0,    0,     'Free — ruins of Sokoto Caliphate-era walled settlement; guide recommended from Sokoto'],

  // ── Taraba (Jalingo) ─────────────────────────────────────────────────────
  ['Taraba', 'Gashaka-Gumti National Park',          500,  2000,  '₦500–₦2,000; Nigeria\'s largest park; chimpanzees, lions, elephants; superb birdwatching'],
  ['Taraba', 'Mambilla Plateau',                     0,    0,     'Free — high-altitude plateau (~1,800 m); tea farms, cool climate; most scenic drive in Nigeria'],
  ['Taraba', 'Chappal Waddi Summit Trek',            2000, 5000,  '₦2,000–₦5,000 park entry + guide; highest mountain in Nigeria (2,419 m); multi-day trek'],
  ['Taraba', 'Mayo-Selbe Hot Spring',                500,  1000,  '₦500–₦1,000; natural hot springs near Gashaka; remote but rewarding'],
  ['Taraba', 'Donga River & Jukun Heritage',        0,    0,     'Free — cultural area near Donga; Jukun Kingdom historical sites and riverside scenery'],

  // ── Yobe (Damaturu) ── ACTIVE SECURITY ADVISORY — verify before travel ──
  ['Yobe', 'Dufuna Canoe Archaeological Site',       0,    0,     'Free — world\'s second oldest canoe (~8,000 yrs); near Fune — VERIFY SECURITY ADVISORY'],
  ['Yobe', 'Dagona Birds Sanctuary',                 0,    0,     'Nominal — flamingos and pelicans; best Nov–Feb — VERIFY SECURITY ADVISORY'],
  ['Yobe', 'Yobe State Museum, Damaturu',            200,  500,   '₦200–₦500; Northern Nigerian heritage — VERIFY SECURITY ADVISORY before visiting'],

  // ── Zamfara (Gusau) ── ACTIVE SECURITY ADVISORY — verify before travel ──
  ['Zamfara', 'Kiyawa Dam, Gusau',                   0,    0,     'Free — scenic reservoir near Gusau city; relatively safer; weekend picnics — VERIFY LOCAL SECURITY'],
  ['Zamfara', 'Kwatarkwashi Rock',                   0,    0,     'Nominal — SECURITY ADVISORY: banditry active in rural Zamfara; check with local authorities first'],
  ['Zamfara', 'Kanoma Hills',                        0,    0,     'Nominal — SECURITY ADVISORY: rural Zamfara travel requires security clearance; confirm before going'],
];

// City name (as typed in origin/destination dropdowns) → state name (as stored in attractions table)
const CITY_TO_STATE = {
  // Major cities already in frontend dropdowns
  'Lagos':          'Lagos',
  'Abuja':          'FCT',
  'Ibadan':         'Oyo',
  'Port Harcourt':  'Rivers',
  'Benin City':     'Edo',
  'Enugu':          'Enugu',
  'Kano':           'Kano',
  'Kaduna':         'Kaduna',
  'Owerri':         'Imo',
  'Warri':          'Delta',
  'Asaba':          'Delta',
  'Calabar':        'Cross River',
  'Abeokuta':       'Ogun',
  'Ilorin':         'Kwara',
  'Onitsha':        'Anambra',
  'Akure':          'Ondo',
  'Jos':            'Plateau',
  'Maiduguri':      'Borno',
  'Uyo':            'Akwa Ibom',
  'Yola':           'Adamawa',
  'Sokoto':         'Sokoto',
  'Bauchi':         'Bauchi',
  'Makurdi':        'Benue',
  'Lokoja':         'Kogi',
  'Lafia':          'Nasarawa',
  'Gombe':          'Gombe',
  // Additional state capitals and large cities
  'Umuahia':        'Abia',
  'Aba':            'Abia',
  'Yenagoa':        'Bayelsa',
  'Abakaliki':      'Ebonyi',
  'Ado-Ekiti':      'Ekiti',
  'Osogbo':         'Osun',
  'Ile-Ife':        'Osun',
  'Minna':          'Niger',
  'Awka':           'Anambra',
  'Dutse':          'Jigawa',
  'Birnin Kebbi':   'Kebbi',
  'Jalingo':        'Taraba',
  'Damaturu':       'Yobe',
  'Gusau':          'Zamfara',
  'Katsina':        'Katsina',
  'Ijebu-Ode':      'Ogun',
  'Ondo City':      'Ondo',
  'Oyo':            'Oyo',
  'Ogbomosho':      'Oyo',
  'Kafanchan':      'Kaduna',
  'Zaria':          'Kaduna',
};

function cityToState(city) {
  return CITY_TO_STATE[city] || null;
}

function formatAttractionsForPrompt(attractions) {
  if (!attractions || attractions.length === 0) return '';
  const lines = attractions.map(a => {
    const fee = a.fee_note
      ? ` (${a.fee_note})`
      : a.fee_max > 0
      ? ` (₦${a.fee_min.toLocaleString()}${a.fee_max !== a.fee_min ? `–₦${a.fee_max.toLocaleString()}` : ''})`
      : ' (Free/Nominal)';
    return `  • ${a.name}${fee}`;
  });
  return lines.join('\n');
}

module.exports = { SEED_DATA, cityToState, formatAttractionsForPrompt };
