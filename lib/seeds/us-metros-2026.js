// Big public light displays for the 2026 season in Houston, Asheville, Maryland and about 20 large US
// metros (Florida is in florida-2026), researched Nov 26, 2026. Each show was checked on its own page, or on a
// current 2026 tourism or local-news listing where it has none; the comment names the page read. Spots are the
// listed street address geocoded with the US Census geocoder, the venue's Wikipedia coordinates, or the venue
// in OpenStreetMap; neighborhood displays sit in the middle of the lit streets. Missing dates were not posted yet.
const US_METROS_2026 = [
  // --- Houston TX ---
  // Houston Zoo, 6200 Hermann Park Dr, Houston TX. Spot: Wikipedia (Houston Zoo). Read: houstonzoo.org
  { name: "Zoo Lights at the Houston Zoo", lat: 29.71613, lng: -95.39057, when: { f: "2026-11-19", e: "2027-01-03", h: "5:30-10:30 PM" } },
  // Space Center Houston, 1601 E NASA Pkwy, Houston TX. Spot: Wikipedia (Space Center Houston). Read: spacecenter.org
  { name: "Galaxy Lights at Space Center Houston", lat: 29.55188, lng: -95.09834, when: { f: "2026-11-14", e: "2027-01-03", h: "6-10 PM, select nights" } },
  // Houston Botanic Garden, 1 Botanic Ln, Houston TX. Spot: Wikipedia (Houston Botanic Garden). Read: hbg.org
  { name: "Radiant Nature at Houston Botanic Garden", lat: 29.6875, lng: -95.27, when: { f: "2026-11-20", e: "2027-02-21", h: "6-10 PM, Fri-Sun + select" } },
  // Bayou Bend Collection and Gardens, 6003 Memorial Dr, Houston TX. Spot: Wikipedia (Bayou Bend Collection and Gardens). Read: mfah.org
  { name: "Christmas Village at Bayou Bend", lat: 29.7575, lng: -95.42056, when: { f: "2026-12-04", e: "2026-12-30", h: "5:30-10 PM, select nights" } },
  // Typhoon Texas Waterpark lot, 555 Katy Fort Bend Rd, Katy TX. Spot: OSM Typhoon Texas, 555 Katy Fort Bend Rd. Read: houston.culturemap.com
  { name: "The Light Park (Katy)", lat: 29.7794, lng: -95.80405, when: { e: "2027-01-03", h: "5:30-10 PM; Fri-Sat to 11" } },
  // Hurricane Harbor Splashtown lot, 21300 I-45 N, Spring TX. Spot: OSM Hurricane Harbor Splashtown, 21300 North Fwy. Read: houston.culturemap.com
  { name: "The Light Park (Spring)", lat: 30.07052, lng: -95.43286, when: { e: "2027-01-03", h: "5:30-10 PM; Fri-Sat to 11" } },
  // Moody Gardens, 1 Hope Blvd, Galveston TX. Spot: Wikipedia (Moody Gardens). Read: moodygardens.com
  { name: "Holiday Lights Trail at Moody Gardens", lat: 29.2741, lng: -94.8513, when: { f: "2026-11-21", e: "2027-01-02", h: "5:30-10 PM" } },
  // --- Asheville NC ---
  // The North Carolina Arboretum, 20 Frederick Law Olmsted Way, Asheville NC. Spot: OSM North Carolina Arboretum. Read: ncarboretum.org
  { name: "Winter Lights at the NC Arboretum", lat: 35.49851, lng: -82.60828, when: { f: "2026-11-13", e: "2027-01-03", h: "6-10 PM" } },
  // Lake Julian Park, 37 Lake Julian Rd, Arden NC. Spot: OSM Lake Julian Park. Read: exploreasheville.com
  { name: "Lake Julian Festival of Lights", lat: 35.4809, lng: -82.53763, when: { f: "2026-11-28", e: "2026-12-23", h: "6-8 PM; Fri-Sat to 9" } },
  // --- Maryland ---
  // 726 W 34th St (700 block, Hampden), Baltimore MD. Spot: census 726 W 34th St. Read: baltimore.org
  { name: "Miracle on 34th Street", lat: 39.32878, lng: -76.6283, when: { f: "2026-11-28", e: "2027-01-01", h: "dusk-10 PM; Fri-Sat to 12" } },
  // Merriweather Post Pavilion, 10475 Little Patuxent Pkwy, Columbia MD. Spot: Wikipedia (Merriweather Post Pavilion). Read: mommypoppins.com
  { name: "Merriweather Symphony of Lights", lat: 39.20925, lng: -76.86267, when: { f: "2026-11-27", e: "2027-01-02", h: "6-10 PM; Sat-Sun 5-10 PM" } },
  // Sandy Point State Park, 1100 E College Pkwy, Annapolis MD. Spot: Wikipedia (Sandy Point State Park; park centroid). Read: lightsonthebaymd.org
  { name: "Lights on the Bay at Sandy Point", lat: 39.01139, lng: -76.39417, when: { f: "2026-11-23", e: "2027-01-03", h: "5-9 PM; Fri-Sat to 10" } },
  // Watkins Regional Park, 301 Watkins Park Dr, Upper Marlboro MD. Spot: census 301 Watkins Park Dr. Read: pgparks.com
  { name: "Festival of Lights at Watkins Regional Park", lat: 38.88821, lng: -76.78391, when: { f: "2026-11-27", e: "2027-01-01", h: "5-9:30 PM" } },
  // Brookside Gardens, 1800 Glenallan Ave, Wheaton MD. Spot: Wikipedia (Brookside Gardens). Read: montgomeryparks.org
  { name: "Garden of Lights at Brookside Gardens", lat: 39.05806, lng: -77.03667, when: { f: "2026-11-20", e: "2027-01-03", h: "evenings, timed entry" } },
  // --- Washington DC area ---
  // Smithsonian's National Zoo, 3001 Connecticut Ave NW, Washington DC. Spot: Wikipedia (National Zoological Park). Read: nationalzoo.si.edu
  { name: "ZooLights at the National Zoo", lat: 38.93111, lng: -77.04972, when: { f: "2026-11-20", e: "2027-01-03", h: "5-9 PM; Sun 5-8 PM" } },
  // The Ellipse, President's Park (15th & E St NW), Washington DC. Spot: Wikipedia (The Ellipse). Read: nps.gov
  { name: "National Christmas Tree", lat: 38.8939, lng: -77.0366, when: { f: "2026-12-05", e: "2027-01-01", h: "10 AM-10 PM; Fri-Sat to 11" } },
  // Nationals Park, 1500 S Capitol St SE, Washington DC. Spot: Wikipedia (Nationals Park). Read: mlb.com
  { name: "Enchant Christmas at Nationals Park", lat: 38.87278, lng: -77.0075, when: { f: "2026-11-20", e: "2026-12-27", h: "4:30-9:30 PM, varies" } },
  // Bull Run Regional Park, 7700 Bull Run Dr, Centreville VA. Spot: census 7700 Bull Run Dr. Read: novaparks.com
  { name: "Bull Run Festival of Lights", lat: 38.80483, lng: -77.48864, when: { f: "2026-11-14", e: "2027-01-03", h: "5:30-9:30 PM; Fri-Sun to 10" } },
  // Meadowlark Botanical Gardens, 9750 Meadowlark Gardens Ct, Vienna VA. Spot: Wikipedia (Meadowlark Botanical Gardens). Read: novaparks.com
  { name: "Winter Walk of Lights at Meadowlark", lat: 38.93775, lng: -77.28097, when: { f: "2026-11-11", e: "2027-01-03", h: "5-10 PM (5:30 until Dec 3)" } },
  // Cameron Run Regional Park, 4001 Eisenhower Ave, Alexandria VA. Spot: census 4001 Eisenhower Ave. Read: novaparks.com
  { name: "Bright Nights at Cameron Run", lat: 38.80422, lng: -77.09981, when: { f: "2026-11-14", e: "2027-01-03", h: "5-9 or 10 PM, varies" } },
  // --- New York City ---
  // 45 Rockefeller Plaza (30 Rockefeller Plaza plaza), New York NY. Spot: Wikipedia (Rockefeller Center). Read: 6sqft.com
  { name: "Rockefeller Center Christmas Tree", lat: 40.75861, lng: -73.97917, when: { f: "2026-12-02", e: "2027-01-09" } },
  // 84th St & 12th Ave (grid 11th-13th Aves, 83rd-86th Sts), Brooklyn NY. Spot: census 1150 84th St (between 11th and 12th Aves). Read: helpnewyork.com
  { name: "Dyker Heights Christmas Lights", lat: 40.61717, lng: -74.01604, when: { h: "Dusk-10 PM" } },
  // Bronx Zoo, 2300 Southern Blvd, Bronx NY. Spot: Wikipedia (Bronx Zoo). Read: bronxzoo.com
  { name: "Holiday Lights at the Bronx Zoo", lat: 40.85028, lng: -73.87833, when: { f: "2026-11-21", e: "2027-01-03", h: "4:30-8 PM entry, select nights" } },
  // Brooklyn Botanic Garden, 990 Washington Ave, Brooklyn NY. Spot: Wikipedia (Brooklyn Botanic Garden). Read: bbg.org
  { name: "Lightscape at Brooklyn Botanic Garden", lat: 40.67, lng: -73.9625, when: { f: "2026-11-20", e: "2027-01-03", h: "Evenings, timed entry" } },
  // Jones Beach State Park, 350 Bay Pkwy, Wantagh NY. Spot: Wikipedia (Jones Beach State Park (park centroid, not the show entry). Read: magicoflights.com
  { name: "Magic of Lights Jones Beach", lat: 40.59583, lng: -73.51528, when: { f: "2026-11-20", e: "2027-01-03", h: "5-10 PM; Fri-Sat to 11 PM" } },
  // Snug Harbor, 1000 Richmond Terrace, Staten Island NY. Spot: Wikipedia (Snug Harbor Cultural Center). Read: nyctourism.com
  { name: "NYC Winter Lantern Festival", lat: 40.6425, lng: -74.10278, when: { f: "2026-11-19", e: "2027-01-10", h: "5-10 PM" } },
  // --- Philadelphia ---
  // Philadelphia Zoo, 3400 W Girard Ave, Philadelphia PA. Spot: Wikipedia (Philadelphia Zoo). Read: philadelphiazoo.org
  { name: "LumiNature at the Philadelphia Zoo", lat: 39.9725, lng: -75.19667, when: { f: "2026-11-19", e: "2027-01-09", h: "5-9 PM, select nights" } },
  // Longwood Gardens, 1001 Longwood Rd, Kennett Square PA. Spot: Wikipedia (Longwood Gardens). Read: longwoodgardens.org
  { name: "A Longwood Christmas", lat: 39.86972, lng: -75.67861, when: { f: "2026-11-20", e: "2027-01-10", h: "10 AM-11 PM daily" } },
  // Franklin Square, 200 N 6th St (6th & Race Sts), Philadelphia PA. Spot: Wikipedia (Franklin Square (Philadelphia). Read: phillyvoice.com
  { name: "Electrical Spectacle at Franklin Square", lat: 39.95551, lng: -75.15079, when: { f: "2026-11-19", e: "2027-01-03", h: "Shows every 30 min, 5-9 PM" } },
  // 931 Stony Hill Rd, Yardley PA. Spot: census 931 Stony Hill Rd. Read: shadybrookfarm.com
  { name: "Shady Brook Farm Holiday Light Show", lat: 40.22602, lng: -74.88475, when: { f: "2026-11-21", h: "5-10 PM; Fri-Sat to 11 PM" } },
  // 1600 block S 13th St (between Tasker & Morris Sts), Philadelphia PA. Spot: census 1600 S 13th St. Read: visitphilly.com
  { name: "Miracle on South 13th Street", lat: 39.93016, lng: -75.16633, when: { f: "2026-11-28", e: "2027-01-01", h: "5-10 PM" } },
  // City Hall north apron, Broad St & JFK Blvd, Philadelphia PA. Spot: Wikipedia (Philadelphia City Hall (building, not exact tree spot). Read: visitphilly.com
  { name: "Philly Holiday Tree at City Hall", lat: 39.95239, lng: -75.1636, when: { f: "2026-12-03", e: "2027-01-02", h: "Evenings; lighting Dec 3, 6 PM" } },
  // --- Boston ---
  // Stone Zoo, 149 Pond St, Stoneham MA. Spot: Wikipedia (Stone Zoo). Read: zoonewengland.org
  { name: "ZooLights at Stone Zoo", lat: 42.46296, lng: -71.09295, when: { f: "2026-11-20", e: "2027-01-03", h: "4-9:30 PM" } },
  // Boston Common, 139 Tremont St, Boston MA. Spot: Wikipedia (Boston Common (park, not exact tree spot). Read: boston.gov
  { name: "Boston Common Holiday Tree", lat: 42.355, lng: -71.06556, when: { f: "2026-12-03", h: "Evenings" } },
  // 2468B Washington St (Route 138), Canton MA. Spot: census 2468 Washington St. Read: thetrustees.org
  { name: "Winterlights at Bradley Estate", lat: 42.1992, lng: -71.11918, when: { f: "2026-11-27", e: "2027-01-02", h: "4:30-9 PM, Wed-Sun" } },
  // National Shrine of Our Lady of La Salette, 947 Park St, Attleboro MA. Spot: census 947 Park St. Read: wror.com
  { name: "La Salette Christmas Festival of Lights", lat: 41.93052, lng: -71.26041, when: { f: "2026-11-21", e: "2027-01-03", h: "5-9 PM nightly" } },
  // New England Botanic Garden, 11 French Dr, Boylston MA. Spot: census 11 French Dr. Read: nebg.org
  { name: "Night Lights: Fantastical Forest", lat: 42.35673, lng: -71.72968, when: { f: "2026-11-21", e: "2027-01-03", h: "4-10 PM daily" } },
  // 5 Pine St, Carver MA. Spot: Wikipedia (Edaville Railroad). Read: edaville.com
  { name: "Edaville's Winter Wonderland", lat: 41.84594, lng: -70.77278, when: { f: "2026-11-27", e: "2026-12-27", h: "Fri-Sun evenings" } },
  // --- Los Angeles ---
  // Los Angeles Zoo, 5333 Zoo Drive, Los Angeles CA. Spot: Wikipedia (Los Angeles Zoo). Read: lazoo.org
  { name: "L.A. Zoo Lights", lat: 34.14815, lng: -118.28388, when: { f: "2026-11-20", e: "2027-01-10", h: "Evenings, select nights" } },
  // Descanso Gardens, 1418 Descanso Drive, La Cañada Flintridge CA. Spot: Wikipedia (Descanso Gardens). Read: descansogardens.org
  { name: "Enchanted: Forest of Light at Descanso", lat: 34.20148, lng: -118.2098, when: { f: "2026-11-22", e: "2027-01-09", h: "Timed entry, most nights" } },
  // Santa Anita Park, W Huntington Dr (parking Gate 3 at Huntington Dr & Holly Ave), Arcadia CA. Spot: Wikipedia (Santa Anita Park). Read: enchantchristmas.com
  { name: "Enchant Christmas Los Angeles", lat: 34.14064, lng: -118.04435, when: { f: "2026-11-20", e: "2026-12-27" } },
  // Santa Rosa Ave & E Mariposa St (between Woodbury Rd and Altadena Dr), Altadena CA. Spot: Wikipedia (Christmas Tree Lane). Read: timeout.com
  { name: "Christmas Tree Lane", lat: 34.19028, lng: -118.13583, when: { f: "2026-12-05", h: "Dusk-10 PM" } },
  // E Acacia Ave & California St, El Segundo CA. Spot: OSM middle of E Acacia Ave. Read: timeout.com
  { name: "Candy Cane Lane (El Segundo)", lat: 33.92989, lng: -118.4034, when: { f: "2026-12-12", e: "2026-12-23", h: "4:30-10 PM (shuttle hours)" } },
  // --- Riverside/San Bernardino ---
  // The Mission Inn Hotel & Spa, 3649 Mission Inn Avenue, Riverside CA. Spot: census 3649 Mission Inn Ave. Read: riversideca.gov
  { name: "Festival of Lights at the Mission Inn", lat: 33.98273, lng: -117.37314, when: { f: "2026-11-21", e: "2026-12-31", h: "5-10 PM" } },
  // Thoroughbred St & Jennet St, Rancho Cucamonga CA. Spot: OSM where Thoroughbred St meets Jennet St (approx). Read: cityofrc.us
  { name: "Thoroughbred Holiday Lights", lat: 34.1499, lng: -117.625, when: { f: "2026-12-04", e: "2026-12-24", h: "5-11 PM, drive-thru only" } },
  // Cucamonga-Guasti Regional Park, 800 N Archibald Ave, Ontario CA. Spot: census 800 N Archibald Ave. Read: parks.sbcounty.gov
  { name: "Holiday Walk of Lights at Guasti", lat: 34.07558, lng: -117.59331, when: { f: "2026-12-04", h: "5-9 PM, select nights" } },
  // --- San Diego ---
  // San Diego Zoo, Balboa Park, San Diego CA. Spot: Wikipedia (San Diego Zoo). Read: zoo.sandiegozoo.org
  { name: "Jungle Bells at the San Diego Zoo", lat: 32.73611, lng: -117.15139, when: { f: "2026-12-19", e: "2027-01-03", h: "Lights 5-8 PM" } },
  // San Diego Zoo Safari Park, 15500 San Pasqual Valley Rd, Escondido CA. Spot: OSM San Diego Zoo Safari Park. Read: sdzsafaripark.org
  { name: "Wild Holidays at the Safari Park", lat: 33.09812, lng: -116.99654, when: { f: "2026-11-28", e: "2027-01-03", h: "Until 8 PM, select nights" } },
  // San Diego Botanic Garden, 300 Quail Gardens Dr, Encinitas CA. Spot: Wikipedia (San Diego Botanic Garden). Read: sdbg.org
  { name: "Lightscape at San Diego Botanic Garden", lat: 33.0522, lng: -117.2806, when: { f: "2026-11-20", e: "2027-01-03", h: "Evenings, timed entry" } },
  // Del Mar Fairgrounds, 2260 Jimmy Durante Blvd, Del Mar CA. Spot: census 2260 Jimmy Durante Blvd. Read: kpbs.org
  { name: "Coastal Christmas", lat: 32.97135, lng: -117.26206, when: { f: "2026-12-11", e: "2026-12-26", h: "4-9 PM, select nights" } },
  // Pepper Dr & Lindenwood Dr (entry), El Cajon CA. Spot: OSM Lindenwood Dr, El Cajon (Bostonia). Read: theresandiego.com
  { name: "Jingle Bell Hill", lat: 32.82483, lng: -116.94939, when: { f: "2026-11-27", e: "2027-01-01", h: "5-10 PM" } },
  // Oviedo St & Black Mountain Rd (Rancho Peñasquitos), San Diego CA. Spot: OSM middle of residential Oviedo St (Ellingham/Renato area). Read: theresandiego.com
  { name: "Christmas Card Lane", lat: 32.97272, lng: -117.12124, when: { f: "2026-12-01", h: "Dusk-10 PM" } },
  // --- San Francisco Bay Area ---
  // Oakland Zoo, 9777 Golf Links Road, Oakland CA. Spot: Wikipedia (Oakland Zoo). Read: oaklandzoo.org
  { name: "Glowfari at the Oakland Zoo", lat: 37.7508, lng: -122.1477, when: { f: "2026-11-06", e: "2027-01-31", h: "4:30-9 PM, select nights" } },
  // Plaza de San José, Market St between San Fernando St and San Carlos St, San Jose CA. Spot: Wikipedia (Plaza de César Chávez, renamed Plaza de San José). Read: christmasinthepark.com
  { name: "Christmas in the Park San Jose", lat: 37.332, lng: -121.89, when: { f: "2026-11-27", e: "2027-01-03", h: "Noon-9 PM, Fri-Sun to 10 PM" } },
  // San Francisco Botanical Garden, 1199 9th Avenue, San Francisco CA. Spot: Wikipedia (San Francisco Botanical Garden). Read: gggp.org
  { name: "Lightscape at SF Botanical Garden", lat: 37.76826, lng: -122.46997, when: { e: "2027-01-03", h: "Entry slots 5-8:30 PM" } },
  // Vasona Lake County Park, 333 Blossom Hill Road, Los Gatos CA. Spot: Wikipedia (Vasona Lake County Park). Read: nbcbayarea.com
  { name: "Fantasy of Lights at Vasona Park", lat: 37.24, lng: -121.96861, when: { f: "2026-12-05", e: "2026-12-13", h: "4-9 PM, 4 nights only" } },
  // --- Chicago ---
  // Lincoln Park Zoo, 2001 N Clark St, Chicago IL. Spot: Wikipedia (Lincoln Park Zoo). Read: lpzoo.org
  { name: "ZooLights at Lincoln Park Zoo", lat: 41.92139, lng: -87.63389, when: { f: "2026-11-20", e: "2027-01-03", h: "4:30-9 PM" } },
  // Chicago Botanic Garden, 1000 Lake Cook Rd, Glencoe IL. Spot: Wikipedia (Chicago Botanic Garden). Read: chicagobotanic.org
  { name: "Lightscape at Chicago Botanic Garden", lat: 42.14833, lng: -87.79, when: { f: "2026-11-13", e: "2027-01-03", h: "4:30-10:30 PM" } },
  // Brookfield Zoo Chicago, North Gate, 31st St & Golfview Ave, Brookfield IL. Spot: census 8400 31st St (north gate side). Read: brookfieldzoo.org
  { name: "Holiday Magic at Brookfield Zoo", lat: 41.83536, lng: -87.83224, when: { f: "2026-11-21", e: "2027-01-03", h: "3-9 PM, select nights" } },
  // The Morton Arboretum, 4100 Illinois Route 53, Lisle IL. Spot: Wikipedia (Morton Arboretum). Read: mortonarb.org
  { name: "Illumination at the Morton Arboretum", lat: 41.81611, lng: -88.07028, when: { f: "2026-11-14", e: "2027-01-02", h: "Opens 4:30 PM nightly" } },
  // Cantigny Park, 1S151 Winfield Rd, Wheaton IL. Spot: census 1S151 Winfield Rd. Read: cantigny.org
  { name: "Christmas at Cantigny Light Show", lat: 41.85604, lng: -88.16121, when: { f: "2026-11-20", e: "2027-01-03", h: "Evenings, Wed-Sun" } },
  // Willow Hill Golf Course, 1350 Willow Rd, Northbrook IL. Spot: census 1350 Willow Rd. Read: news.wttw.com
  { name: "Willow Hill Lights", lat: 42.10565, lng: -87.82682, when: { f: "2026-11-13", e: "2027-01-03", h: "5-9 PM (2025 hours)" } },
  // --- Detroit ---
  // Detroit Zoo, 8450 W 10 Mile Rd, Royal Oak MI. Spot: Wikipedia (Detroit Zoo). Read: detroitzoo.org
  { name: "Wild Lights at the Detroit Zoo", lat: 42.47694, lng: -83.15694, when: { f: "2026-11-21", e: "2027-01-03", h: "5-9 PM (Fri-Sat to 10:30)" } },
  // Hines Park, 7651 N Merriman Rd, Westland MI. Spot: census 7651 N Merriman Rd. Read: waynecountymi.gov
  { name: "Wayne County Lightfest", lat: 42.3445, lng: -83.35023, when: { f: "2026-11-19", e: "2026-12-24", h: "6-10 PM, Wed-Sun" } },
  // The Henry Ford, 20900 Oakwood Blvd, Dearborn MI. Spot: Wikipedia (Greenfield Village). Read: thehenryford.org
  { name: "Holiday Nights in Greenfield Village", lat: 42.30361, lng: -83.23417, when: { f: "2026-12-03", e: "2026-12-28", h: "6:30-10 PM, select nights" } },
  // Main St & 4th St, downtown Rochester, Rochester MI. Spot: census 400 S Main St (downtown, show spans Main St). Read: wxyz.com
  { name: "The Big, Bright Light Show", lat: 42.68077, lng: -83.1337, when: { h: "5 PM-midnight" } },
  // --- Minneapolis-St. Paul ---
  // Minnesota Landscape Arboretum, 3675 Arboretum Dr, Chaska MN. Spot: Wikipedia (Minnesota Landscape Arboretum). Read: arb.umn.edu
  { name: "Northern Lights at the Landscape Arboretum", lat: 44.8619, lng: -93.6152, when: { f: "2026-11-20", e: "2027-01-03", h: "4:30-9:30 PM" } },
  // CHS Field, 360 N Broadway St, St. Paul MN. Spot: Wikipedia (CHS Field). Read: glowholiday.com
  { name: "GLOW Holiday Festival at CHS Field", lat: 44.95086, lng: -93.08419, when: { f: "2026-11-19", e: "2027-01-03", h: "Evenings" } },
  // Viking Lakes, 2685 Vikings Cir, Eagan MN. Spot: census 2685 Vikings Pkwy. Read: familyfuntwincities.com
  { name: "Magic of Lights at Viking Lakes", lat: 44.85666, lng: -93.11317, when: { f: "2026-11-20", e: "2027-01-02", h: "From 5:30 PM nightly" } },
  // 3121 150th St W, Shakopee MN. Spot: census 3121 W 150th St. Read: familyfuntwincities.com
  { name: "Sever's Holiday Lights", lat: 44.73283, lng: -93.57986, when: { f: "2026-11-26", e: "2027-01-03", h: "5-9 PM" } },
  // 1526 York Ave, St. Paul MN. Spot: census 1526 E York Ave. Read: visitsaintpaul.com
  { name: "Holiday Lights on York Avenue", lat: 44.96869, lng: -93.03607, when: { f: "2026-11-27", e: "2026-12-31", h: "5-10 PM" } },
  // --- St. Louis ---
  // Missouri Botanical Garden, 4344 Shaw Blvd, St. Louis MO. Spot: Wikipedia (Missouri Botanical Garden). Read: missouribotanicalgarden.org
  { name: "Garden Glow at Missouri Botanical Garden", lat: 38.6125, lng: -90.25972, when: { f: "2026-11-14", e: "2027-01-02", h: "Evenings, timed entry" } },
  // Saint Louis Zoo, 1 Government Dr, St. Louis MO. Spot: Wikipedia (Saint Louis Zoo). Read: stlzoo.org
  { name: "Wild Lights at the Saint Louis Zoo", lat: 38.635, lng: -90.29, when: { f: "2026-11-27", e: "2026-12-30", h: "5-8:30 PM, select nights" } },
  // Tilles Park, 9551 Litzsinger Rd, Ladue MO. Spot: Wikipedia (Tilles Park). Read: stlmag.com
  { name: "Winter Wonderland at Tilles Park", lat: 38.62131, lng: -90.36511, when: { f: "2026-11-25", e: "2027-01-02", h: "5-9 PM" } },
  // National Shrine of Our Lady of the Snows, 442 S DeMazenod Dr, Belleville IL. Spot: Wikipedia (National Shrine of Our Lady of the Snows). Read: downstateil.org
  { name: "Way of Lights", lat: 38.55833, lng: -90.08806, when: { f: "2026-11-20", e: "2026-12-31", h: "5-9 PM" } },
  // 5300 Fox Creek Rd, Pacific MO. Spot: census 5300 Fox Creek Rd. Read: stlmag.com
  { name: "Santa's Magical Kingdom", lat: 38.50449, lng: -90.6902, when: { f: "2026-11-20", e: "2027-01-03", h: "5:30-10:30 PM" } },
  // World Wide Technology Raceway, 700 Raceway Blvd, Madison IL. Spot: Wikipedia (World Wide Technology Raceway). Read: wwtraceway.com
  { name: "WonderLight's Christmas", lat: 38.6508, lng: -90.13537, when: { f: "2026-11-13", e: "2027-01-03", h: "5-10 PM" } },
  // Anheuser-Busch Brewery, 1200 Lynch St, St. Louis MO. Spot: census 1200 Lynch St. Read: budweisertours.com
  { name: "Brewery Lights", lat: 38.60023, lng: -90.2136, when: { f: "2026-11-21", e: "2026-12-26", h: "Select nights, timed entry" } },
  // --- Dallas-Fort Worth ---
  // 8525 Garland Road, Dallas TX. Spot: Wikipedia (Dallas Arboretum and Botanical Garden). Read: dallasarboretum.org
  { name: "Holiday at the Dallas Arboretum", lat: 32.82139, lng: -96.7175, when: { f: "2026-11-11", e: "2027-01-03", h: "Holiday at Night 5-10 PM" } },
  // 650 S. R. L. Thornton Freeway, Dallas TX. Spot: Wikipedia (Dallas Zoo). Read: dallaszoo.com
  { name: "Dallas Zoo Lights", lat: 32.74, lng: -96.815, when: { f: "2026-11-13", e: "2027-01-03", h: "5:30-9 PM, select nights" } },
  // 3220 Botanic Garden Blvd., Fort Worth TX. Spot: Wikipedia (Fort Worth Botanic Garden). Read: fwbg.org
  { name: "Christmas in the Garden, Fort Worth", lat: 32.74, lng: -97.3625, when: { f: "2026-11-20", e: "2027-01-03", h: "Entry 5:30-8 PM" } },
  // Lynn Creek Park, 5610 Lake Ridge Parkway, Grand Prairie TX. Spot: census 5610 Lake Ridge Pkwy. Read: grandfungp.com
  { name: "Prairie Lights", lat: 32.63759, lng: -97.04627, when: { f: "2026-11-26", e: "2026-12-31", h: "Opens 6 PM nightly" } },
  // Texas Motor Speedway, 3545 Lone Star Cir, Fort Worth TX. Spot: Wikipedia (Texas Motor Speedway) - track center, not entry gate). Read: texasmotorspeedway.com
  { name: "Gift of Lights at Texas Motor Speedway", lat: 33.0375, lng: -97.2847, when: { f: "2026-11-26", e: "2027-01-03" } },
  // Armstrong Parkway & Preston Road, Highland Park TX. Spot: OSM: north end of Armstrong Pkwy way near Preston Rd (loose). Read: visitdallas.com
  { name: "Highland Park Christmas Lights", lat: 32.8287, lng: -96.807 },
  // --- Atlanta ---
  // 1345 Piedmont Ave NE, Atlanta GA. Spot: Wikipedia (Atlanta Botanical Garden). Read: atlantabg.org
  { name: "Garden Lights, Holiday Nights", lat: 33.79, lng: -84.37389, when: { f: "2026-11-14", e: "2027-01-10", h: "5-11 PM" } },
  // 7000 Lanier Islands Parkway, Buford GA. Spot: census 7000 Lanier Islands Pkwy. Read: lanierislands.com
  { name: "Magical Nights of Lights at Lanier Islands", lat: 34.17312, lng: -84.00843, when: { f: "2026-11-20", e: "2027-01-03", h: "5-10 PM" } },
  // 1269 Barclay Circle, Marietta GA. Spot: census 1269 Barclay Cir. Read: life.edu
  { name: "Lights of Life", lat: 33.93137, lng: -84.52318, when: { f: "2026-11-26", e: "2026-12-31", h: "Sunset to about 9-10 PM" } },
  // Callaway Gardens, 17617 US-27, Pine Mountain GA. Spot: OSM Callaway Gardens park centroid (loose). Read: callawayresort.com
  { name: "Fantasy In Lights at Callaway Gardens", lat: 32.82978, lng: -84.85623, when: { f: "2026-11-13", e: "2027-01-03" } },
  // Alpha Loop, parking at 2500 Northwinds Parkway, Alpharetta GA. Spot: census 2500 Northwinds Pkwy (parking). Read: awesomealpharetta.com
  { name: "Lights on the Loop", lat: 34.05883, lng: -84.28443, when: { f: "2026-12-04", e: "2027-01-04", h: "5-11 PM" } },
  // --- Charlotte ---
  // Main Street at Dynamo 31, 102 Main Street, McAdenville NC. Spot: census 102 Main St. Read: townofmcadenville.org
  { name: "Christmas Town USA", lat: 35.26083, lng: -81.07307, when: { f: "2026-12-01", e: "2026-12-26", h: "5:30-10 PM" } },
  // 5555 Concord Parkway S, Concord NC. Spot: Wikipedia (Charlotte Motor Speedway) - track center, not entry). Read: charlottemotorspeedway.com
  { name: "Speedway Christmas", lat: 35.3525, lng: -80.6825, when: { f: "2026-11-20", e: "2027-01-03", h: "6-10 PM" } },
  // Daniel Stowe Conservancy, Belmont NC. Spot: OSM Daniel Stowe Botanical Garden. Read: charlottesgotalot.com
  { name: "Holidays at the Garden, Daniel Stowe", lat: 35.16709, lng: -81.05739, when: { f: "2026-11-28", e: "2026-12-30", h: "5-10 PM, select nights" } },
  // Ballantyne's Backyard, 11611 N. Community House Road, Charlotte NC. Spot: census 11611 N Community House Rd. Read: charlotteonthecheap.com
  { name: "Carolina Holiday Light Spectacular", lat: 35.06078, lng: -80.83805, when: { f: "2026-11-27", e: "2026-12-30", h: "5:30-10 PM" } },
  // Truist Field, 324 South Mint Street, Charlotte NC. Spot: Wikipedia (Truist Field); street address also from Wikipedia). Read: charlottesgotalot.com
  { name: "Light the Knights", lat: 35.22799, lng: -80.84901, when: { f: "2026-11-25", e: "2027-01-03", h: "select nights" } },
  // --- Phoenix ---
  // 455 North Galvin Parkway, Phoenix AZ. Spot: Wikipedia (Phoenix Zoo). Read: phoenixzoo.org
  { name: "ZooLights at the Phoenix Zoo", lat: 33.4525, lng: -111.9493, when: { f: "2026-11-25", e: "2027-01-15", h: "5:30-10:30 PM" } },
  // 1201 N. Galvin Parkway, Phoenix AZ. Spot: Wikipedia (Desert Botanical Garden). Read: dbg.org
  { name: "Las Noches de las Luminarias", lat: 33.46194, lng: -111.94472, when: { f: "2026-11-27", e: "2027-01-03", h: "5-9:30 PM, select nights" } },
  // 101 S. LeSueur, Mesa AZ. Spot: Wikipedia (Mesa Arizona Temple). Read: yourvalley.net
  { name: "Mesa Temple Christmas Lights", lat: 33.41289, lng: -111.81958, when: { f: "2026-11-27", e: "2026-12-30", h: "5-10 PM" } },
  // Murphy Park, 5750 W Glenn Dr, Glendale AZ. Spot: census 5750 W Glenn Dr. Read: glendaleaz.gov
  { name: "Glendale Glitters", lat: 33.53991, lng: -112.18305, when: { f: "2026-11-27", e: "2027-01-01", h: "5-10 PM" } },
  // 7301 E. Indian Bend Rd., Scottsdale AZ. Spot: census 7301 E Indian Bend Rd. Read: experiencescottsdale.com
  { name: "Holiday Lights at McCormick-Stillman", lat: 33.53861, lng: -111.92419, when: { f: "2026-11-27", e: "2026-12-30", h: "5:30-9:30 PM" } },
  // Tempe Diablo Stadium, 2200 W. Alameda Drive, Tempe AZ. Spot: Wikipedia (Tempe Diablo Stadium). Read: tempetourism.com
  { name: "World of Illumination Tempe", lat: 33.40056, lng: -111.96972, when: { f: "2026-11-13", e: "2027-01-03" } },
  // Fairmont Scottsdale Princess, Scottsdale AZ. Spot: OSM Fairmont Scottsdale Princess. Read: experiencescottsdale.com
  { name: "Christmas at the Princess", lat: 33.64525, lng: -111.91803, when: { f: "2026-11-20", e: "2027-01-02" } },
  // --- Seattle ---
  // Woodland Park Zoo, 5500 Phinney Ave N, Seattle WA. Spot: Wikipedia (Woodland Park Zoo). Read: zoo.org
  { name: "WildLanterns at Woodland Park Zoo", lat: 47.66834, lng: -122.34984, when: { f: "2026-11-13", e: "2027-01-17", h: "4-9 PM, closed some nights" } },
  // Bellevue Botanical Garden, 12001 Main St, Bellevue WA. Spot: census 12001 Main St. Read: bellevuebotanical.org
  { name: "Garden d'Lights", lat: 47.60996, lng: -122.175, when: { f: "2026-11-28", e: "2027-01-03", h: "4:30-9:30 PM" } },
  // Point Defiance Zoo & Aquarium, 5400 N Pearl St, Tacoma WA. Spot: Wikipedia (Point Defiance Zoo & Aquarium). Read: parkstacoma.gov
  { name: "Zoolights at Point Defiance", lat: 47.3048, lng: -122.5207, when: { f: "2026-11-27", e: "2027-01-03", h: "4:30-10 PM" } },
  // Spanaway Park, 1000 Military Rd S, Spanaway WA. Spot: OSM Spanaway Park. Read: piercecountywa.gov
  { name: "Fantasy Lights at Spanaway Park", lat: 47.11734, lng: -122.44566, when: { f: "2026-11-27", e: "2027-01-03", h: "5:30-9 PM" } },
  // NE Ravenna Blvd & Park Rd NE, Seattle WA. Spot: OSM NE Park Rd, Ravenna. Read: parentmap.com
  { name: "Candy Cane Lane Seattle", lat: 47.66994, lng: -122.30465, when: { f: "2026-12-05", e: "2027-01-01", h: "4-9:30 PM; Fri-Sat to 11" } },
  // Gene Coulon Memorial Beach Park, 1201 Lake Washington Blvd N, Renton WA. Spot: census 1201 Lake Washington Blvd N. Read: rentonwa.gov
  { name: "Clam Lights", lat: 47.50648, lng: -122.2005, when: { f: "2026-12-04", e: "2027-01-03", h: "4-9 PM" } },
  // Warm Beach Camp, 20800 Marine Dr, Stanwood WA. Spot: census 20800 Marine Dr. Read: thelightsofchristmas.com
  { name: "The Lights of Christmas", lat: 48.18554, lng: -122.34548, when: { f: "2026-11-27", e: "2026-12-28", h: "Select nights" } },
  // --- Denver ---
  // Denver Botanic Gardens, 1007 York St, Denver CO. Spot: Wikipedia (Denver Botanic Gardens). Read: botanicgardens.org
  { name: "Blossoms of Light", lat: 39.7325, lng: -104.96083, when: { f: "2026-11-20", e: "2027-01-10", h: "4:30-9 PM" } },
  // Denver Zoo, 2300 Steele St, Denver CO. Spot: OSM Denver Zoo. Read: denverzoo.org
  { name: "Zoo Lights at the Denver Zoo", lat: 39.74924, lng: -104.95041, when: { f: "2026-11-23", e: "2027-01-03", h: "4:30-9 PM; Fri-Sat to 10" } },
  // Chatfield Farms, 8500 W Deer Creek Canyon Rd, Littleton CO. Spot: census 8500 W Deer Creek Canyon Rd. Read: botanicgardens.org
  { name: "Trail of Lights at Chatfield Farms", lat: 39.55311, lng: -105.09268, when: { f: "2026-11-21", e: "2027-01-03", h: "5-8:30 PM, select nights" } },
  // Hudson Gardens, 6115 S Santa Fe Dr, Littleton CO. Spot: census 6115 S Santa Fe Dr. Read: hudsongardens.org
  { name: "Hudson Holidays", lat: 39.60581, lng: -105.02067, when: { f: "2026-11-27", e: "2027-01-03", h: "5-9 PM" } },
  // City and County Building, 1437 Bannock St, Denver CO. Spot: Wikipedia (Denver City and County Building). Read: visitdenver.com
  { name: "Denver City and County Building Lights", lat: 39.73944, lng: -104.98889, when: { f: "2026-11-20", e: "2027-01-24", h: "Nightly after dark" } },
  // Red Rocks Park & Amphitheatre (Entrance 2), Morrison CO. Spot: Wikipedia (Red Rocks Park) - park centroid, not the drive route entry). Read: visitdenver.com
  { name: "Christmas in Color at Red Rocks", lat: 39.66139, lng: -105.20806, when: { h: "From 5:30 PM nightly" } },
];

export const SEEDS = { "us-metros-2026": US_METROS_2026 };
