// Nigerian tourist attractions by state
// fee_min / fee_max in NGN (0 = free or not specified)
const SEED_DATA = [
  // Abia
  ['Abia', 'National War Museum',             300,    1000,  '₦300–₦1,000'],
  ['Abia', 'Ojukwu Bunker',                   0,      0,     null],
  ['Abia', 'Arochukwu Long Juju Slave Route', 0,      0,     null],
  // Adamawa
  ['Adamawa', 'Sukur Cultural Landscape',     500,    1000,  '₦500–₦1,000'],
  ['Adamawa', 'Mandara Mountains',            0,      0,     null],
  ['Adamawa', 'Koma Hill',                    0,      0,     null],
  // Akwa Ibom
  ['Akwa Ibom', 'Ibeno Beach',                0,      0,     'Free entry'],
  ['Akwa Ibom', 'Oron Museum',                0,      0,     'Nominal/Free'],
  ['Akwa Ibom', 'Ibom Tropicana',             0,      0,     null],
  // Anambra
  ['Anambra', 'Ogbunike Caves',               3000,   4000,  '₦3,000 entry + ~₦1,000 guide fee'],
  ['Anambra', 'Agulu Lake',                   0,      0,     null],
  ['Anambra', 'Igbo-Ukwu Museum',             0,      0,     null],
  // Bauchi
  ['Bauchi', 'Yankari Game Reserve',          2000,   2000,  '₦2,000 adult, ₦800 child'],
  ['Bauchi', 'Wikki Warm Springs',            0,      0,     'Within Yankari Game Reserve'],
  // Bayelsa
  ['Bayelsa', 'Oloibiri Oil Well',            0,      0,     null],
  ['Bayelsa', 'Akassa Lighthouse',            0,      0,     null],
  ['Bayelsa', 'Ox-Bow Lake',                  0,      0,     'Nominal'],
  // Benue
  ['Benue', 'Enemabia Warm Spring',           0,      0,     null],
  ['Benue', 'Ushongo Hills',                  500,    1000,  '₦500–₦1,000'],
  // Borno
  ['Borno', 'Chad Basin National Park',       0,      0,     'Nominal (check security advisory)'],
  ['Borno', 'Borno State Museum',             0,      0,     'Nominal (check security advisory)'],
  // Cross River
  ['Cross River', 'Obudu Mountain Resort',    1000,   1000,  '₦1,000 park access; extra for cable car/accommodation'],
  ['Cross River', 'Agbokim Waterfalls',       500,    1000,  '₦500–₦1,000'],
  // Delta
  ['Delta', 'River Ethiope',                  0,      0,     null],
  ['Delta', "Nana's Museum",                  0,      0,     'Nominal'],
  ['Delta', 'Mungo Park House',               0,      0,     'Nominal'],
  // Ebonyi
  ['Ebonyi', 'Uburu Salt Lake',               0,      0,     null],
  ['Ebonyi', 'Amanchor Cave',                 0,      0,     null],
  ['Ebonyi', 'Ndibe Sand Beach',              0,      0,     'Nominal'],
  // Edo
  ["Edo", "Oba's Palace",                     0,      0,     null],
  ['Edo', 'Benin Moats',                      0,      0,     null],
  ['Edo', 'Okomu National Park',              1000,   1000,  '₦1,000+'],
  // Ekiti
  ['Ekiti', 'Ikogosi Warm Springs',           2000,   5000,  '₦2,000–₦5,000'],
  ['Ekiti', 'Arinta Waterfalls',              0,      0,     null],
  // Enugu
  ['Enugu', 'Awhum Waterfall & Cave',         500,    1000,  '₦500–₦1,000'],
  ['Enugu', 'Ngwo Pine Forest',               500,    1000,  '₦500–₦1,000'],
  // Gombe
  ['Gombe', 'Dadin Kowa Dam',                 0,      0,     null],
  ['Gombe', 'Tangale Peak',                   0,      0,     null],
  ["Gombe", "Bubayero's Tomb",                0,      0,     'Nominal/Free'],
  // Imo
  ['Imo', 'Oguta Lake',                       0,      0,     null],
  ['Imo', 'Mbari Cultural Center',            0,      0,     'Nominal'],
  // Jigawa
  ['Jigawa', 'Birnin Kudu Rock Paintings',    0,      0,     null],
  ['Jigawa', 'Baturiya Bird Sanctuary',       0,      0,     'Nominal'],
  // Kaduna
  ['Kaduna', 'Kajuru Castle',                 20000,  30000, '₦20,000–₦30,000 day visit'],
  ['Kaduna', 'Kamuku National Park',          1000,   2000,  '₦1,000–₦2,000'],
  // Kano
  ['Kano', 'Ancient Kano City Walls',         0,      0,     null],
  ['Kano', 'Gidan Makama Museum',             200,    200,   '₦200'],
  // Katsina
  ['Katsina', 'Kusugu Well',                  0,      0,     null],
  ['Katsina', 'Gobarau Minaret',              0,      0,     'Nominal'],
  // Kebbi
  ['Kebbi', 'Argungu Fishing Festival',       0,      0,     'Seasonal'],
  ['Kebbi', 'Kanta Museum',                   0,      0,     'Nominal'],
  // Kogi
  ['Kogi', 'Niger/Benue Confluence',          0,      0,     null],
  ['Kogi', 'Mount Patti',                     0,      0,     null],
  ['Kogi', 'National Museum of Colonial History', 200, 500,  '₦200–₦500'],
  // Kwara
  ['Kwara', 'Owu Waterfalls',                 0,      0,     null],
  ['Kwara', 'Esie Museum',                    100,    100,   '₦100'],
  // Lagos
  ['Lagos', 'Lekki Conservation Centre',      5000,   5000,  '₦5,000'],
  ['Lagos', 'Tarkwa Bay',                     0,      0,     'Free entry; ₦1,500–₦2,500 boat fare'],
  ['Lagos', 'Nike Art Gallery',               0,      0,     'Free'],
  // Nasarawa
  ['Nasarawa', 'Farin Ruwa Waterfalls',       0,      0,     null],
  ['Nasarawa', 'Keana Salt Village',          500,    1000,  '₦500–₦1,000'],
  // Niger
  ['Niger', 'Gurara Waterfalls',              500,    500,   '₦500'],
  ['Niger', 'Zuma Rock',                      0,      0,     'Free'],
  // Ogun
  ['Ogun', 'Olumo Rock',                      1000,   2000,  '₦1,000 stairs / ₦2,000 elevator'],
  ['Ogun', 'Olusegun Obasanjo Presidential Library', 5000, 5000, '₦5,000'],
  // Ondo
  ['Ondo', 'Idanre Hills',                    1000,   1000,  '₦1,000'],
  // Osun
  ['Osun', 'Osun-Osogbo Sacred Grove',        1000,   2000,  '₦1,000–₦2,000'],
  ['Osun', 'Erin-Ijesha Waterfalls',          500,    1000,  '₦500–₦1,000'],
  // Oyo
  ['Oyo', 'Ado Awaye Suspended Lake',         500,    500,   '₦500 base entry'],
  ['Oyo', 'Agodi Gardens',                    1000,   1000,  '₦1,000'],
  ['Oyo', 'UI Zoo',                           1500,   1500,  '₦1,500'],
  // Plateau
  ['Plateau', 'Jos National Museum & Wildlife Park', 500, 1500, '₦500–₦1,500'],
  ['Plateau', 'Shere Hills',                  0,      0,     null],
  // Rivers
  ['Rivers', 'Port Harcourt Pleasure Park',   1500,   1500,  '₦1,500 adult + individual ride fees'],
  // Sokoto
  ["Sokoto", "Sultan's Palace",               0,      0,     'Free/Donations'],
  ['Sokoto', 'Hubbare / Tomb of Dan Fodio',   0,      0,     'Free/Donations'],
  // Taraba
  ['Taraba', 'Gashaka-Gumti National Park',   500,    2000,  '₦500–₦2,000'],
  ['Taraba', 'Mambilla Plateau',              0,      0,     null],
  // Yobe
  ['Yobe', 'Dufuna Canoe Site',               0,      0,     null],
  ['Yobe', 'Dagona Birds Sanctuary',          0,      0,     'Nominal'],
  // Zamfara
  ['Zamfara', 'Kwatarkwashi Rock',            0,      0,     'Nominal'],
  ['Zamfara', 'Kanoma Hills',                 0,      0,     'Nominal'],
  // FCT / Abuja
  ['FCT', 'Millennium Park',                  0,      0,     'Free'],
  ['FCT', 'National Children\'s Park & Zoo',  0,      0,     'Nominal'],
  ['FCT', 'Discovery Museum',                 0,      0,     null],
];

// City name (as used in GIGM/flight dropdowns) → state name (as stored in attractions table)
const CITY_TO_STATE = {
  'Lagos':         'Lagos',
  'Abuja':         'FCT',
  'Ibadan':        'Oyo',
  'Port Harcourt': 'Rivers',
  'Benin City':    'Edo',
  'Enugu':         'Enugu',
  'Kano':          'Kano',
  'Kaduna':        'Kaduna',
  'Owerri':        'Imo',
  'Warri':         'Delta',
  'Asaba':         'Delta',
  'Calabar':       'Cross River',
  'Abeokuta':      'Ogun',
  'Ilorin':        'Kwara',
  'Onitsha':       'Anambra',
  'Akure':         'Ondo',
  'Jos':           'Plateau',
  'Maiduguri':     'Borno',
  'Uyo':           'Akwa Ibom',
  'Yola':          'Adamawa',
  'Sokoto':        'Sokoto',
  'Bauchi':        'Bauchi',
  'Makurdi':       'Benue',
  'Lokoja':        'Kogi',
  'Lafia':         'Nasarawa',
  'Gombe':         'Gombe',
  'Owerri':        'Imo',
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
