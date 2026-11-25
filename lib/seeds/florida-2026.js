// Florida public displays for the 2026 season, from a list Anthony shared on Nov 25, 2026.
// Spots: the listed street address geocoded with the US Census geocoder, or for a few big parks
// the coordinates on their Wikipedia page. Home displays are only included when a public listing
// (local news, Tacky Light Tour, tourism sites) names them at that address; a few take the name
// that listing uses. Dates and hours are as the shared list gives them and were not each checked.
// Jacksonville-area displays already in jacksonville-2026 are left out here.
const FLORIDA_2026 = [
  // #6: 10580 Crystal Springs Rd
  { name: "Christmas on Crystal Springs", lat: 30.30186, lng: -81.83698, when: { f: "2026-12-01", e: "2026-12-31" } },
  // #7: Cummer Museum, 829 Riverside Ave
  { name: "Riverside Avondale Luminaria", lat: 30.31552, lng: -81.67699, when: { f: "2026-12-20", e: "2026-12-20", h: "From dusk, one night" } },
  // #8: 1749 Southcreek Dr
  { name: "Southcreek Lights", lat: 30.07641, lng: -81.61794, when: { f: "2026-11-26", e: "2026-12-31" } },
  // #9: 776 Grand Parke Dr
  { name: "Lights on Grand Parke", lat: 30.12735, lng: -81.61552, when: { f: "2026-12-01", e: "2026-12-31", h: "Music on 88.5 FM" } },
  // #13: 1253 Winding Brook Ct
  { name: "Candi's Lighted D'Lites", lat: 30.11642, lng: -81.82555, when: { f: "2026-12-01", e: "2026-12-31" } },
  // #14: 395 St Marks Pond Blvd
  { name: "Christmas at Ancient City Farmstead", lat: 29.99121, lng: -81.38871, when: { f: "2026-12-12", e: "2026-12-22", h: "4:30-9 PM, select nights" } },
  // #15: 4412 Janiero St
  { name: "Janiero St. Wonderland", lat: 29.93993, lng: -81.34431, when: { f: "2026-11-20", e: "2027-01-11" } },
  // #16: 101 Centre St, near Front St
  { name: "Dickens on Centre", lat: 30.67145, lng: -81.46459, when: { f: "2026-12-11", e: "2026-12-13" } },
  // #17: 11016 Lillian Saunders Dr (Wikipedia)
  { name: "White Springs Festival of Lights", lat: 30.33111, lng: -82.76694, when: { f: "2026-12-04", e: "2026-12-23", h: "Dusk-9 PM" } },
  // #18: 4990 NE 180th Ave
  { name: "Christmas in the Quarry", lat: 29.40707, lng: -82.47387, when: { f: "2026-12-12", e: "2027-01-02", h: "5:30-8 PM, select nights" } },
  // #19: 19650 NE 30th St
  { name: "Kirby Family Farm Christmas Train", lat: 29.37384, lng: -82.44334, when: { f: "2026-11-27", e: "2026-12-31", h: "6-10 PM, select nights" } },
  // #20: 5201 NW 34th Blvd
  { name: "Winter Wonderland Gainesville", lat: 29.7018, lng: -82.36707, when: { e: "2026-12-31", h: "Fri-Sat from 5:30 PM" } },
  // #21: 13085 SW 1st Ln
  { name: "Light Up Tioga", lat: 29.65552, lng: -82.48093, when: { f: "2026-12-05", e: "2026-12-31" } },
  // #23: 1915 SE Lake Weir Ave
  { name: "Ocala Christmas Light Spectacular", lat: 29.16633, lng: -82.12544, when: { e: "2026-12-31", h: "Select nights" } },
  // #24: 3205 Thomasville Rd
  { name: "Dorothy B. Oven Park Holiday Lights", lat: 30.49219, lng: -84.25461, when: { f: "2026-11-26", e: "2027-01-01", h: "6-10 PM, weekends to 11" } },
  // #25: 3246 Endicott Dr
  { name: "Endicott Lights", lat: 30.3939, lng: -84.21158, when: { f: "2026-11-28", e: "2026-12-31", h: "Music on 88.7 FM" } },
  // #26: 1421 Woodgate Way
  { name: "Jingle on Woodgate Way", lat: 30.48491, lng: -84.2517, when: { f: "2026-11-29", e: "2026-12-31" } },
  // #27: 9300 Emerald Coast Pkwy W
  { name: "Nights of Lights at Baytowne Wharf", lat: 30.37764, lng: -86.33728, when: { f: "2026-12-01", e: "2026-12-31", h: "Shows at 6, 7 and 8 PM" } },
  // #28: 10 Harbor Blvd
  { name: "HarborWalk Village Lights", lat: 30.39513, lng: -86.51384, when: { f: "2026-11-27", e: "2026-12-31" } },
  // #29: 7650 Sowell Rd
  { name: "Sowell's North Pole Christmas Light Display", lat: 30.68832, lng: -86.99783, when: { e: "2026-12-31" } },
  // #31: 1801 W International Speedway Blvd
  { name: "Magic of Lights Daytona", lat: 29.19279, lng: -81.06689, when: { f: "2026-11-20", e: "2027-01-02", h: "6-10 PM" } },
  // #32: 1031 Camphor Ln
  { name: "Christmas Spectacular at Stetson Mansion", lat: 29.02284, lng: -81.32261, when: { f: "2026-11-01", e: "2027-01-17", h: "Tours by reservation" } },
  // #33: 530 N Donnelly St
  { name: "Light Up Mount Dora", lat: 28.80083, lng: -81.64464, when: { f: "2026-11-21", e: "2027-01-06" } },
  // #34: 1920 N Forest Ave
  { name: "Dazzling Nights at Leu Gardens", lat: 28.56858, lng: -81.35529, when: { f: "2026-11-27", e: "2027-01-03", h: "Select nights" } },
  // #36: 6000 Universal Blvd
  { name: "Universal Orlando Holidays", lat: 28.47498, lng: -81.46305, when: { e: "2027-01-03" } },
  // #37: 7007 Sea World Dr
  { name: "SeaWorld's Christmas Celebration", lat: 28.40656, lng: -81.47007, when: { f: "2026-11-06", e: "2027-01-04", h: "Select nights" } },
  // #38: 150 N New York Ave
  { name: "Winter on the Avenue", lat: 28.59824, lng: -81.35274, when: { f: "2026-12-04", e: "2026-12-31" } },
  // #39: 14118 Winterset Dr
  { name: "Winterset Drive Christmas Lights", lat: 28.36588, lng: -81.17552, when: { f: "2026-12-01", e: "2027-01-07" } },
  // #42: 701 Front St, Market Street area
  { name: "Now Snowing in Celebration", lat: 28.31803, lng: -81.54065, when: { f: "2026-11-28", e: "2026-12-31", h: "5:30-9:30 PM" } },
  // #43: 3251 Margaritaville Blvd
  { name: "Holiday Nights at Sunset Walk", lat: 28.34551, lng: -81.60877, when: { f: "2026-11-27", e: "2026-12-25", h: "6-10 PM, select nights" } },
  // #44: 1 Legoland Way (Wikipedia)
  { name: "Christmas Bricktacular at LEGOLAND", lat: 27.98917, lng: -81.68994, when: { f: "2026-11-21", e: "2027-01-03", h: "Select dates" } },
  // #45: 2500 Parkway Dr
  { name: "Space Coast Light Fest", lat: 28.15763, lng: -80.66258, when: { f: "2026-12-01", e: "2027-01-01", h: "From 6:30 PM" } },
  // #46: 8225 N Wickham Rd (Wikipedia)
  { name: "Holiday Lights at Brevard Zoo", lat: 28.22509, lng: -80.71398, when: { f: "2026-11-20", e: "2027-01-02", h: "6-9 PM, select nights" } },
  // #47: 2261 Town Center Ave
  { name: "The Avenue Viera Holiday Lights", lat: 28.24226, lng: -80.72814, when: { f: "2026-11-20", e: "2026-12-24" } },
  // #48: 10165 N McKinley Dr (Wikipedia)
  { name: "Christmas Town at Busch Gardens", lat: 28.0375, lng: -82.4225, when: { f: "2026-11-13", e: "2027-01-04", h: "Select dates" } },
  // #49: 1101 W Sligh Ave
  { name: "Christmas in the Wild at ZooTampa", lat: 28.0108, lng: -82.47174, when: { f: "2026-11-27", e: "2026-12-30", h: "From 4 PM, select nights" } },
  // #50: 600 N Ashley Dr
  { name: "Winter Village at Curtis Hixon Park", lat: 27.94892, lng: -82.46056, when: { f: "2026-11-20", e: "2027-01-03" } },
  // #51: 1 Tropicana Dr (Wikipedia)
  { name: "Enchant Christmas at Tropicana Field", lat: 27.76833, lng: -82.65333, when: { f: "2026-11-20", e: "2026-12-27" } },
  // #52: 2719 Oakdale St S
  { name: "Oakdale Christmas House", lat: 27.74375, lng: -82.63588, when: { f: "2026-11-27", e: "2027-01-03", h: "6-10 PM" } },
  // #53: 400 Bayshore Dr NE
  { name: "Downtown St. Pete Waterfront Lights", lat: 27.7763, lng: -82.63073, when: { e: "2027-01-01" } },
  // #54: 12520 Ulmerton Rd
  { name: "Holiday Lights in the Gardens", lat: 27.88499, lng: -82.81182, when: { f: "2026-11-27", e: "2027-01-03", h: "5:30-9:30 PM" } },
  // #55: 101 Central Park Dr
  { name: "Holiday Lights in Largo Central Park", lat: 27.91472, lng: -82.78351, when: { f: "2026-11-26", e: "2027-01-03", h: "5-10 PM" } },
  // #57: 6063 136th Ter N
  { name: "136th Terrace North Musical Lights", lat: 27.89518, lng: -82.71884, when: { f: "2026-11-25", e: "2027-01-01" } },
  // #58: 2456 Indian Trl W
  { name: "Indian Trail West Lights", lat: 28.09282, lng: -82.7637, when: { f: "2026-11-30", e: "2027-01-01" } },
  // #60: 2508 W Oak Ave
  { name: "Christmas Lane", lat: 28.01654, lng: -82.14828, when: { f: "2026-11-27", e: "2026-12-24", h: "6-10 PM, select nights" } },
  // #61: 215 Sydney Washer Rd
  { name: "Tampa Bay's Festival of Lights", lat: 27.9401, lng: -82.20297, when: { f: "2026-11-26", e: "2026-12-27", h: "From 6 PM" } },
  // #62: 1811 72nd St NW
  { name: "Pilos Family Christmas Show", lat: 27.51608, lng: -82.63334, when: { f: "2026-11-26", e: "2026-12-31" } },
  // #63: 9800 17th Ave NW (Wikipedia)
  { name: "Winter Nights Under the Lights", lat: 27.5135, lng: -82.66, when: { f: "2026-12-17", e: "2026-12-20", h: "6-9 PM" } },
  // #64: 1534 Mound St
  { name: "Lights in Bloom at Selby Gardens", lat: 27.3285, lng: -82.54045, when: { f: "2026-12-05", e: "2027-01-02", h: "5:30-9 PM" } },
  // #65: 210 N Cattlemen Rd
  { name: "Holidays at UTC", lat: 27.38552, lng: -82.45607, when: { f: "2026-11-14", e: "2027-01-03", h: "6:30-9:30 PM" } },
  // #66: 300 Madison Dr
  { name: "St. Armands Circle Holiday Night of Lights", lat: 27.31895, lng: -82.57947, when: { f: "2026-12-04", e: "2026-12-31" } },
  // #67: 200 W Venice Ave
  { name: "Downtown Venice & Centennial Park Lights", lat: 27.09993, lng: -82.44551, when: { f: "2026-11-27", e: "2026-12-31" } },
  // #68: 1200 W Retta Esplanade
  { name: "Fishermen's Village Festival of Lights", lat: 26.92733, lng: -82.06331, when: { f: "2026-11-15", e: "2026-12-31" } },
  // #69: 2333 El Jobean Rd
  { name: "The Enchanted Holiday Experience", lat: 27.00082, lng: -82.18199, when: { f: "2026-12-17", e: "2026-12-27" } },
  // #70: 2350 McGregor Blvd
  { name: "Edison and Ford Holiday Nights", lat: 26.63478, lng: -81.87959, when: { f: "2026-11-27", e: "2027-01-03", h: "5:30-9 PM" } },
  // #71: 7330 Gladiolus Dr
  { name: "Holiday Express at Lakes Park", lat: 26.52801, lng: -81.87315, when: { e: "2026-12-30" } },
  // #72: 3450 Ortiz Ave
  { name: "Holiday Lights at Calusa Nature Center", lat: 26.61478, lng: -81.81148, when: { f: "2026-12-04", h: "6-9 PM, select Fri-Sun" } },
  // #73: 2301 First St
  { name: "Sidney & Berne Davis Art Center Lights", lat: 26.64461, lng: -81.8695, when: { f: "2026-11-27", e: "2026-12-25" } },
  // #75: 10450 Reynolds St
  { name: "Riverside Park Christmas Lights", lat: 26.34049, lng: -81.77941, when: { f: "2026-12-04", e: "2027-01-01" } },
  // #78: 4820 Bayshore Dr
  { name: "Johnsonville Night Lights in the Garden", lat: 26.10892, lng: -81.7704, when: { f: "2026-11-27", e: "2027-01-03" } },
  // #79: 100 block of Nottingham Dr, main entrance off Airport-Pulling Rd
  { name: "Victoria Park Christmas Lights", lat: 26.25814, lng: -81.77027, when: { f: "2026-12-01", e: "2026-12-31" } },
  // #80: 300 block of 5th Ave S at 3rd St S
  { name: "Fifth Avenue South & Third Street South", lat: 26.14086, lng: -81.80305, when: { f: "2026-11-23", e: "2026-12-31" } },
  // #81: 350 US Highway 1
  { name: "McKee Jungle Lights", lat: 27.60589, lng: -80.38245, when: { f: "2026-11-09", e: "2027-01-02" } },
  // #82: 7555 20th St
  { name: "Christmas at Tara", lat: 27.63901, lng: -80.48252, when: { f: "2026-12-01", e: "2026-12-31", h: "Select nights" } },
  // #83: 210 Savannah Rd
  { name: "Heathcote's Garden of Lights", lat: 27.41792, lng: -80.32299, when: { e: "2026-12-27", h: "Select nights" } },
  // #86: 100 N Clematis St
  { name: "Sandi the Sand Tree", lat: 26.71376, lng: -80.0492, when: { f: "2026-12-03", e: "2026-12-31", h: "6-10 PM" } },
  // #87: 1301 Summit Blvd
  { name: "Zoo Lights at Palm Beach Zoo", lat: 26.66596, lng: -80.06969, when: { f: "2026-11-20", e: "2027-01-03", h: "5-9 PM, select nights" } },
  // #88: 531 N Military Trl
  { name: "ILUMINA at Mounts Botanical Garden", lat: 26.6852, lng: -80.11201, when: { f: "2026-11-18", e: "2027-01-17", h: "Select nights" } },
  // #89: 7715 Forest Hill Blvd (Wikipedia)
  { name: "Lights 4 Hope Drive-Thru", lat: 26.65557, lng: -80.16419, when: { f: "2026-11-27", e: "2026-12-27", h: "Select nights" } },
  // #90: 700 S Rosemary Ave
  { name: "Nightly Snowfall at CityPlace", lat: 26.70738, lng: -80.05712, when: { f: "2026-11-14", e: "2026-12-31", h: "Snow 6:30, 7:30, 8:30 PM" } },
  // #91: 51 N Swinton Ave
  { name: "Delray Beach 100-Ft Christmas Tree", lat: 26.46257, lng: -80.07306, when: { f: "2026-12-01", e: "2026-12-31", h: "10 AM-9 PM" } },
  // #92: 3600 W Sample Rd
  { name: "Holiday Fantasy of Lights", lat: 26.27391, lng: -80.17437, when: { f: "2026-11-21", e: "2027-01-02", h: "6-10 PM" } },
  // #93: 3750 S Flamingo Rd
  { name: "Winter Wonderland at Flamingo Gardens", lat: 26.06955, lng: -80.31365, when: { f: "2026-11-21", e: "2026-12-30", h: "5:30-9:30 PM" } },
  // #95: 10901 Old Cutler Rd
  { name: "NightGarden at Fairchild", lat: 25.67295, lng: -80.27827, when: { f: "2026-11-07", e: "2027-01-11", h: "6-10 PM, select nights" } },
  // #96: 1111 Parrot Jungle Trl (Wikipedia)
  { name: "Luminosa at Jungle Island", lat: 25.7861, lng: -80.1742, when: { f: "2026-11-13", e: "2027-01-10", h: "From 5:30 PM" } },
  // #97: 7900 SW 40th St
  { name: "Christmas Wonderland at Tropical Park", lat: 25.73291, lng: -80.31985, when: { f: "2026-11-12", e: "2027-01-04" } },
  // #98: Zoo Miami (approximate) (Wikipedia (approximate))
  { name: "Zoo Lights Miami", lat: 25.61, lng: -80.4, when: { f: "2026-11-27", e: "2026-12-30", h: "6:30-10 PM, select nights" } },
  // #99: 11000 Red Rd
  { name: "Nights of Lights at Pinecrest Gardens", lat: 25.66846, lng: -80.28417, when: { f: "2026-12-04", e: "2026-12-27", h: "6:30-10 PM, select nights" } },
  // #100: 201 William St, Historic Seaport
  { name: "Key West Harbor Walk of Lights", lat: 24.56106, lng: -81.80141, when: { f: "2026-11-25", e: "2026-12-31" } },
];

export const SEEDS = { "florida-2026": FLORIDA_2026 };
