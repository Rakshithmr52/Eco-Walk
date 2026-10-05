const bcrypt = require('bcryptjs');

const initialLocations = [
  {
    id: 'L1',
    name: 'Lalbagh Botanical Gardens',
    shortName: 'Lalbagh Gardens',
    type: 'park',
    description: 'Famous 240-acre botanical sanctuary in Bengaluru with glass house, century-old shaded tree canopies, and serene walking tracks.',
    x: 180,
    y: 140,
    icon: 'Trees',
    ambientAirQuality: 'Excellent (AQI 28)',
    elevation: '45m'
  },
  {
    id: 'L2',
    name: 'Vidhana Soudha & Attara Kacheri',
    shortName: 'Vidhana Soudha',
    type: 'landmark',
    description: 'Historic Neo-Dravidian state legislature plaza in Bengaluru featuring broad paved sidewalks and heritage rain tree shade.',
    x: 460,
    y: 170,
    icon: 'Landmark',
    ambientAirQuality: 'Moderate (AQI 62)',
    elevation: '42m'
  },
  {
    id: 'L3',
    name: 'Ulsoor Lake Promenade',
    shortName: 'Ulsoor Lake',
    type: 'waterfront',
    description: 'Scenic lakeside paved boardwalk with refreshing breezes, water ripples, and pedestrian-only walking tracks in central Bengaluru.',
    x: 820,
    y: 160,
    icon: 'Waves',
    ambientAirQuality: 'Excellent (AQI 32)',
    elevation: '38m'
  },
  {
    id: 'L4',
    name: 'IISc Campus Green Spine',
    shortName: 'IISc Campus',
    type: 'academic',
    description: 'Sprawling academic campus featuring manicured lawn alleys, dedicated cycle/pedestrian paths, and zero motor vehicle zones.',
    x: 190,
    y: 380,
    icon: 'GraduationCap',
    ambientAirQuality: 'Good (AQI 40)',
    elevation: '44m'
  },
  {
    id: 'L5',
    name: 'State Central Library (Cubbon Park)',
    shortName: 'Cubbon Library',
    type: 'culture',
    description: 'Historic red-brick heritage landmark situated within Cubbon Park greenery, surrounded by bamboo groves and shaded trails.',
    x: 480,
    y: 370,
    icon: 'BookOpen',
    ambientAirQuality: 'Good (AQI 45)',
    elevation: '43m'
  },
  {
    id: 'L6',
    name: 'Gandhi Bazaar Heritage Walk',
    shortName: 'Gandhi Bazaar',
    type: 'market',
    description: 'Traditional Basavanagudi tree-lined street featuring pedestrianized walking lanes, flower markets, and morning walker routes.',
    x: 760,
    y: 380,
    icon: 'ShoppingBag',
    ambientAirQuality: 'Moderate (AQI 68)',
    elevation: '40m'
  },
  {
    id: 'L7',
    name: 'Majestic Kempegowda Station',
    shortName: 'Majestic Metro',
    type: 'transit',
    description: 'Major multi-modal public transit nexus with elevated pedestrian skywalks, tactile paving, and bright LED security lighting.',
    x: 320,
    y: 570,
    icon: 'Train',
    ambientAirQuality: 'Moderate (AQI 74)',
    elevation: '41m'
  },
  {
    id: 'L8',
    name: 'Kanteerava Sports Pavilion',
    shortName: 'Kanteerava Stadium',
    type: 'sports',
    description: 'Public sports pavilion with synthetic running tracks, outdoor fitness equipment, and tree-lined perimeter sidewalks.',
    x: 610,
    y: 560,
    icon: 'Activity',
    ambientAirQuality: 'Good (AQI 48)',
    elevation: '40m'
  },
  {
    id: 'L9',
    name: 'Sankey Tank Forest Trail',
    shortName: 'Sankey Tank',
    type: 'nature',
    description: 'Ecological lakeside haven in Malleshwaram featuring paved perimeter walking trails, bird habitats, and fresh clean air.',
    x: 880,
    y: 570,
    icon: 'TreePine',
    ambientAirQuality: 'Excellent (AQI 24)',
    elevation: '36m'
  },
  {
    id: 'L10',
    name: 'Jayanagar Tree Boulevard',
    shortName: 'Jayanagar 4th Block',
    type: 'residential',
    description: 'Calm suburban residential neighbourhood characterized by broad shaded avenues, speed humps, and minimal traffic noise.',
    x: 160,
    y: 590,
    icon: 'Home',
    ambientAirQuality: 'Good (AQI 38)',
    elevation: '46m'
  },
  {
    id: 'L11',
    name: 'Bengaluru Fort & Heritage Gate',
    shortName: 'Bengaluru Fort',
    type: 'heritage',
    description: 'Historic stone fortress gateway opening into pedestrian alleys, artisan craft stalls, and heritage street lamps.',
    x: 350,
    y: 250,
    icon: 'Castle',
    ambientAirQuality: 'Moderate (AQI 55)',
    elevation: '43m'
  },
  {
    id: 'L12',
    name: 'Hebbal Wetland Bird Park',
    shortName: 'Hebbal Wetland',
    type: 'park',
    description: 'Conserved marshland ecological sanctuary with raised wooden observation decks, tranquil reed beds, and zero vehicular access.',
    x: 840,
    y: 350,
    icon: 'Flower2',
    ambientAirQuality: 'Excellent (AQI 22)',
    elevation: '37m'
  }
];

// Rich predefined routes between landmarks
const initialRoutes = [
  // L1 (Botanical Gardens) -> L4 (Tech Campus)
  {
    id: 'R-L1-L4-1',
    name: 'Emerald Arboretum Walkway',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L1',
    startNodeName: 'Lalbagh Botanical Gardens',
    endNodeId: 'L4',
    endNodeName: 'IISc Campus Green Spine',
    distanceKm: 1.4,
    estimatedMinutes: 18,
    greeneryScore: 94,
    safetyScore: 92,
    trafficPollutionRisk: 12,
    roadConditionScore: 95,
    terrainType: 'Permeable Eco-Paver & Garden Path',
    elevationGainMeters: 4,
    waypoints: [
      [180, 140],
      [160, 200],
      [150, 270],
      [165, 330],
      [190, 380]
    ],
    description: 'Meanders through the shaded western garden canopy and continuous pedestrian arbor into the university campus grounds.',
    highlights: [
      '94% Shaded Tree Canopy Coverage',
      'Completely Isolated from Motor Traffic',
      'Zero Exhaust & Ultra-Low Particulate Pollution',
      'Smooth, Non-Slip Interlocking Pavers'
    ],
    warnings: []
  },
  {
    id: 'R-L1-L4-2',
    name: 'West Commercial Arterial Avenue',
    tag: 'Quick Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: 'L1',
    startNodeName: 'Lalbagh Botanical Gardens',
    endNodeId: 'L4',
    endNodeName: 'IISc Campus Green Spine',
    distanceKm: 1.1,
    estimatedMinutes: 14,
    greeneryScore: 32,
    safetyScore: 68,
    trafficPollutionRisk: 78,
    roadConditionScore: 74,
    terrainType: 'Concrete Sidewalk alongside 4-Lane Road',
    elevationGainMeters: 2,
    waypoints: [
      [180, 140],
      [220, 220],
      [230, 300],
      [210, 350],
      [190, 380]
    ],
    description: 'Direct urban route running beside the busy West Commercial Road. High vehicle noise and traffic fumes.',
    highlights: [
      'Slightly shorter walking distance (1.1 km)',
      'Direct straight line connectivity'
    ],
    warnings: [
      'Elevated vehicle emissions (AQI 85)',
      'Continuous noise pollution from heavy delivery vans',
      'Narrow sidewalk near intersection construction'
    ]
  },

  // L1 (Botanical Gardens) -> L2 (Clock Tower)
  {
    id: 'R-L1-L2-1',
    name: 'Botanical Floral Boulevard',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L1',
    startNodeName: 'Lalbagh Botanical Gardens',
    endNodeId: 'L2',
    endNodeName: 'Vidhana Soudha & Attara Kacheri',
    distanceKm: 1.6,
    estimatedMinutes: 20,
    greeneryScore: 92,
    safetyScore: 90,
    trafficPollutionRisk: 18,
    roadConditionScore: 94,
    terrainType: 'Wide Shaded Sidewalks with Green Verge',
    elevationGainMeters: 3,
    waypoints: [
      [180, 140],
      [250, 130],
      [330, 145],
      [400, 160],
      [460, 170]
    ],
    description: 'Pleasant avenue lined with flowering bougainvillea and tall gulmohar trees with dedicated pedestrian crossings.',
    highlights: [
      '88% continuous tree shade',
      'Wide barrier-separated sidewalks',
      'Clean air flow with minimal vehicle presence'
    ],
    warnings: []
  },
  {
    id: 'R-L1-L2-2',
    name: 'Heritage Alleyway Cut-Through',
    tag: 'Historic Short Cut',
    routeType: 'historic_urban',
    startNodeId: 'L1',
    startNodeName: 'Lalbagh Botanical Gardens',
    endNodeId: 'L2',
    endNodeName: 'Vidhana Soudha & Attara Kacheri',
    distanceKm: 1.3,
    estimatedMinutes: 17,
    greeneryScore: 45,
    safetyScore: 72,
    trafficPollutionRisk: 52,
    roadConditionScore: 68,
    terrainType: 'Aged Cobblestones & Narrow Pavement',
    elevationGainMeters: 5,
    waypoints: [
      [180, 140],
      [270, 180],
      [350, 200],
      [420, 185],
      [460, 170]
    ],
    description: 'Traverses traditional stone paved heritage alleyways. Authentic character but uneven stepping surfaces.',
    highlights: [
      'Architectural heritage buildings',
      'Lower vehicular speed due to narrow lanes'
    ],
    warnings: [
      'Uneven cobblestone surfaces prone to tripping',
      'Limited evening street lamp brightness'
    ]
  },

  // L4 (Tech Campus) -> L7 (Metro Central)
  {
    id: 'R-L4-L7-1',
    name: 'South Green Belt Greenway',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L4',
    startNodeName: 'IISc Campus Green Spine',
    endNodeId: 'L7',
    endNodeName: 'Majestic Kempegowda Station',
    distanceKm: 1.5,
    estimatedMinutes: 19,
    greeneryScore: 91,
    safetyScore: 93,
    trafficPollutionRisk: 15,
    roadConditionScore: 96,
    terrainType: 'Modern Rubberized Jogging Track & Paved Walk',
    elevationGainMeters: 3,
    waypoints: [
      [190, 380],
      [190, 460],
      [220, 520],
      [270, 560],
      [320, 570]
    ],
    description: 'Designed as a suburban ecological corridor with native trees, fitness stations, and bright solar lights.',
    highlights: [
      'Low impact joint-friendly rubberized path option',
      '90% high greenery density',
      'Continuous CCTV and solar LED lighting'
    ],
    warnings: []
  },
  {
    id: 'R-L4-L7-2',
    name: 'Industrial Transit By-pass',
    tag: 'Quick Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: 'L4',
    startNodeName: 'IISc Campus Green Spine',
    endNodeId: 'L7',
    endNodeName: 'Majestic Kempegowda Station',
    distanceKm: 1.2,
    estimatedMinutes: 15,
    greeneryScore: 28,
    safetyScore: 64,
    trafficPollutionRisk: 82,
    roadConditionScore: 60,
    terrainType: 'Concrete Curb with Multiple Driveway Cuts',
    elevationGainMeters: 2,
    waypoints: [
      [190, 380],
      [250, 430],
      [290, 500],
      [320, 570]
    ],
    description: 'Direct cut across logistics depots and bus exit corridors. Heavy diesel particulate exposure.',
    highlights: ['Shorter distance by 300 meters'],
    warnings: [
      'Severe diesel exhaust (traffic risk: 82/100)',
      'Potholes and broken curbs from logistics trucks',
      'Unprotected pedestrian crossings'
    ]
  },

  // L2 (Clock Tower) -> L3 (Green Lake)
  {
    id: 'R-L2-L3-1',
    name: 'Lakeside Willow Walk',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L2',
    startNodeName: 'Vidhana Soudha & Attara Kacheri',
    endNodeId: 'L3',
    endNodeName: 'Ulsoor Lake Promenade',
    distanceKm: 1.8,
    estimatedMinutes: 23,
    greeneryScore: 96,
    safetyScore: 95,
    trafficPollutionRisk: 10,
    roadConditionScore: 98,
    terrainType: 'Smooth Permeable Boardwalk & Pavers',
    elevationGainMeters: 2,
    waypoints: [
      [460, 170],
      [550, 150],
      [640, 140],
      [730, 150],
      [820, 160]
    ],
    description: 'Idyllic pedestrian promenade connecting the town square to the scenic waterfront along willow groves and gardens.',
    highlights: [
      'Water body micro-climate reduces ambient temperature by 3°C',
      '96% lush floral & tree density',
      'Fully wheelchair accessible and bollard protected'
    ],
    warnings: []
  },
  {
    id: 'R-L2-L3-2',
    name: 'East Link Expressway Flyover Walk',
    tag: 'Quick Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: 'L2',
    startNodeName: 'Vidhana Soudha & Attara Kacheri',
    endNodeId: 'L3',
    endNodeName: 'Ulsoor Lake Promenade',
    distanceKm: 1.5,
    estimatedMinutes: 19,
    greeneryScore: 30,
    safetyScore: 66,
    trafficPollutionRisk: 86,
    roadConditionScore: 78,
    terrainType: 'Elevated Concrete Footpath',
    elevationGainMeters: 9,
    waypoints: [
      [460, 170],
      [560, 190],
      [660, 200],
      [760, 180],
      [820, 160]
    ],
    description: 'Fast route alongside the expressway flyover. High crosswinds, noise, and engine exhaust fumes.',
    highlights: ['Direct connection'],
    warnings: [
      'Extremely high vehicle emissions (Risk: 86/100)',
      'Loud 75dB traffic decibel noise level',
      'Exposed to harsh direct sun with zero shade'
    ]
  },

  // L5 (Central Library) -> L8 (Sports Complex)
  {
    id: 'R-L5-L8-1',
    name: 'Civic Arboretum Trail',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L5',
    startNodeName: 'State Central Library (Cubbon Park)',
    endNodeId: 'L8',
    endNodeName: 'Kanteerava Sports Pavilion',
    distanceKm: 1.6,
    estimatedMinutes: 20,
    greeneryScore: 89,
    safetyScore: 92,
    trafficPollutionRisk: 22,
    roadConditionScore: 93,
    terrainType: 'Paved Urban Greenway',
    elevationGainMeters: 3,
    waypoints: [
      [480, 370],
      [510, 440],
      [550, 500],
      [610, 560]
    ],
    description: 'Broad civic path through the municipal botanical garden connecting culture to fitness grounds.',
    highlights: [
      '89% tree canopy coverage',
      'Wide 3.5m shared walking and running lane',
      'Pedestrian-activated crosswalk beacons'
    ],
    warnings: []
  },
  {
    id: 'R-L5-L8-2',
    name: 'Commercial Ring Road Way',
    tag: 'Quick Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: 'L5',
    startNodeName: 'State Central Library (Cubbon Park)',
    endNodeId: 'L8',
    endNodeName: 'Kanteerava Sports Pavilion',
    distanceKm: 1.3,
    estimatedMinutes: 16,
    greeneryScore: 35,
    safetyScore: 70,
    trafficPollutionRisk: 75,
    roadConditionScore: 72,
    terrainType: 'Standard Concrete Sidewalk',
    elevationGainMeters: 2,
    waypoints: [
      [480, 370],
      [460, 450],
      [520, 530],
      [610, 560]
    ],
    description: 'Runs along the inner commercial ring road. Heavy car and two-wheeler traffic.',
    highlights: ['Slightly shorter route'],
    warnings: [
      'Intermittent sidewalk disruptions',
      'Moderate dust and vehicular exhaust'
    ]
  },

  // L6 (Eco Market) -> L9 (River Trail)
  {
    id: 'R-L6-L9-1',
    name: 'Riparian Garden Pathway',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L6',
    startNodeName: 'Gandhi Bazaar Heritage Walk',
    endNodeId: 'L9',
    endNodeName: 'Sankey Tank Forest Trail',
    distanceKm: 1.7,
    estimatedMinutes: 21,
    greeneryScore: 95,
    safetyScore: 91,
    trafficPollutionRisk: 14,
    roadConditionScore: 94,
    terrainType: 'Compacted Gravel & Pine Needle Verge',
    elevationGainMeters: 5,
    waypoints: [
      [760, 380],
      [800, 440],
      [840, 510],
      [880, 570]
    ],
    description: 'Tranquil slope descending towards the river valley flanked by bamboo groves and butterfly plantings.',
    highlights: [
      'Lush 95% vegetation and riverside air',
      'Calming acoustic environment with birdsong',
      'Zero motor vehicles'
    ],
    warnings: []
  },
  {
    id: 'R-L6-L9-2',
    name: 'River Freight Access Alley',
    tag: 'Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: 'L6',
    startNodeName: 'Gandhi Bazaar Heritage Walk',
    endNodeId: 'L9',
    endNodeName: 'Sankey Tank Forest Trail',
    distanceKm: 1.4,
    estimatedMinutes: 18,
    greeneryScore: 40,
    safetyScore: 62,
    trafficPollutionRisk: 70,
    roadConditionScore: 58,
    terrainType: 'Cracked Asphalt & Gravel',
    elevationGainMeters: 4,
    waypoints: [
      [760, 380],
      [770, 460],
      [820, 540],
      [880, 570]
    ],
    description: 'Utility access road previously used for municipal barge loading. Patchy surfaces.',
    highlights: ['Shorter distance'],
    warnings: [
      'Reported potholes and loose stones',
      'Inadequate night lighting'
    ]
  },

  // L3 (Green Lake) -> L12 (Wetland Park)
  {
    id: 'R-L3-L12-1',
    name: 'Wetland Boardwalk Overpass',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L3',
    startNodeName: 'Ulsoor Lake Promenade',
    endNodeId: 'L12',
    endNodeName: 'Hebbal Wetland Bird Park',
    distanceKm: 1.3,
    estimatedMinutes: 16,
    greeneryScore: 98,
    safetyScore: 94,
    trafficPollutionRisk: 8,
    roadConditionScore: 97,
    terrainType: 'Timber Boardwalk with Anti-Slip Coating',
    elevationGainMeters: 1,
    waypoints: [
      [820, 160],
      [830, 220],
      [845, 290],
      [840, 350]
    ],
    description: 'Raised eco-boardwalk traversing pristine wetlands and water lily clusters. Cleanest breathing air in the district.',
    highlights: [
      'Pristine air quality (AQI 22)',
      '98% natural green and aquatic scenery',
      'Flat, highly comfortable stride surface'
    ],
    warnings: []
  },
  {
    id: 'R-L3-L12-2',
    name: 'Eastern Embankment Road',
    tag: 'Direct Road Route',
    routeType: 'arterial_road',
    startNodeId: 'L3',
    startNodeName: 'Ulsoor Lake Promenade',
    endNodeId: 'L12',
    endNodeName: 'Hebbal Wetland Bird Park',
    distanceKm: 1.1,
    estimatedMinutes: 14,
    greeneryScore: 50,
    safetyScore: 75,
    trafficPollutionRisk: 55,
    roadConditionScore: 80,
    terrainType: 'Paved Asphalt Sidewalk',
    elevationGainMeters: 3,
    waypoints: [
      [820, 160],
      [800, 240],
      [810, 310],
      [840, 350]
    ],
    description: 'Asphalt sidewalk alongside the outer flood embankment road.',
    highlights: ['Direct line'],
    warnings: ['Occasional utility service vehicle traffic', 'Wind exposed']
  },

  // L7 (Metro Central) -> L8 (Sports Complex)
  {
    id: 'R-L7-L8-1',
    name: 'Fitness Boulevard Park Link',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L7',
    startNodeName: 'Majestic Kempegowda Station',
    endNodeId: 'L8',
    endNodeName: 'Kanteerava Sports Pavilion',
    distanceKm: 1.5,
    estimatedMinutes: 19,
    greeneryScore: 88,
    safetyScore: 94,
    trafficPollutionRisk: 20,
    roadConditionScore: 95,
    terrainType: 'Permeable Pavers & Tree Canopies',
    elevationGainMeters: 2,
    waypoints: [
      [320, 570],
      [400, 580],
      [500, 575],
      [610, 560]
    ],
    description: 'Wide landscaped boulevard designed specifically for pedestrian transit to the sporting arena.',
    highlights: [
      '88% shade with double rows of neem trees',
      'High safety index with clear pedestrian markings',
      'Smooth, well-drained surface'
    ],
    warnings: []
  },
  {
    id: 'R-L7-L8-2',
    name: 'South Expressway Service Road',
    tag: 'Quick Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: 'L7',
    startNodeName: 'Majestic Kempegowda Station',
    endNodeId: 'L8',
    endNodeName: 'Kanteerava Sports Pavilion',
    distanceKm: 1.3,
    estimatedMinutes: 16,
    greeneryScore: 30,
    safetyScore: 65,
    trafficPollutionRisk: 78,
    roadConditionScore: 68,
    terrainType: 'Narrow Paved Curb',
    elevationGainMeters: 2,
    waypoints: [
      [320, 570],
      [420, 620],
      [520, 610],
      [610, 560]
    ],
    description: 'Runs along the south bus terminal and service road. Regular bus exhaust fumes.',
    highlights: ['Shorter distance'],
    warnings: ['High bus traffic pollution', 'Intermittent waterlogging near drainage gratings']
  },

  // L1 (Botanical Gardens) -> L5 (Central Library)
  {
    id: 'R-L1-L5-1',
    name: 'Canopy Heritage Pathway',
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: 'L1',
    startNodeName: 'Lalbagh Botanical Gardens',
    endNodeId: 'L5',
    endNodeName: 'State Central Library (Cubbon Park)',
    distanceKm: 1.7,
    estimatedMinutes: 21,
    greeneryScore: 93,
    safetyScore: 91,
    trafficPollutionRisk: 16,
    roadConditionScore: 93,
    terrainType: 'Cobblestone & Brick Garden Verge',
    elevationGainMeters: 3,
    waypoints: [
      [180, 140],
      [270, 200],
      [350, 250],
      [420, 310],
      [480, 370]
    ],
    description: 'Traces past the Old Town Gate and botanical buffer zone into the library courtyard.',
    highlights: ['93% lush garden shade', 'Calm academic ambiance', 'Low ambient noise'],
    warnings: []
  },
  {
    id: 'R-L1-L5-2',
    name: 'Mid-Town Transit Strip',
    tag: 'Quick Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: 'L1',
    startNodeName: 'Lalbagh Botanical Gardens',
    endNodeId: 'L5',
    endNodeName: 'State Central Library (Cubbon Park)',
    distanceKm: 1.4,
    estimatedMinutes: 17,
    greeneryScore: 38,
    safetyScore: 72,
    trafficPollutionRisk: 72,
    roadConditionScore: 76,
    terrainType: 'Concrete Sidewalk with Crosswalks',
    elevationGainMeters: 2,
    waypoints: [
      [180, 140],
      [280, 260],
      [380, 330],
      [480, 370]
    ],
    description: 'Through the commercial retail corridor. Busy traffic and crowded sidewalks.',
    highlights: ['Slightly shorter walk'],
    warnings: ['Busy pedestrian traffic', 'Air pollution from commercial delivery vans']
  }
];

const sampleUsers = [
  {
    id: 'U-DEMO-WALKER',
    name: 'Rahul',
    email: 'walker@ecowalk.local',
    passwordHash: bcrypt.hashSync('walk123', 8),
    role: 'walker',
    walkingSpeed: 'moderate', // brisk, moderate, leisurely
    preferences: {
      prioritizeGreenery: true,
      prioritizeSafety: true,
      avoidPollution: true,
      avoidPotholes: true,
      importanceWeights: {
        greenery: 0.35,
        safety: 0.25,
        airQuality: 0.25,
        roadCondition: 0.15
      }
    },
    stats: {
      totalDistanceKm: 18.4,
      totalWalks: 12,
      totalCalories: 1140,
      co2SavedKg: 3.15,
      reportsSubmitted: 2
    },
    createdAt: '2026-02-15T09:00:00.000Z'
  },
  {
    id: 'U-DEMO-ADMIN',
    name: 'Rakshith',
    email: 'admin@ecowalk.local',
    passwordHash: bcrypt.hashSync('admin123', 8),
    role: 'admin',
    walkingSpeed: 'brisk',
    preferences: {
      prioritizeGreenery: true,
      prioritizeSafety: true,
      avoidPollution: true,
      avoidPotholes: true,
      importanceWeights: {
        greenery: 0.3,
        safety: 0.3,
        airQuality: 0.2,
        roadCondition: 0.2
      }
    },
    stats: {
      totalDistanceKm: 34.2,
      totalWalks: 24,
      totalCalories: 2120,
      co2SavedKg: 5.85,
      reportsSubmitted: 5
    },
    createdAt: '2026-01-10T10:00:00.000Z'
  }
];

const sampleReports = [
  {
    id: 'REP-101',
    routeId: 'R-L4-L7-2',
    routeName: 'Industrial Transit By-pass',
    locationName: 'Near logistics loading gate #3',
    coordinates: [270, 480],
    issueType: 'pothole',
    severity: 'high',
    status: 'verified', // pending, verified, resolved
    description: 'Deep circular pothole on pedestrian curb filled with loose gravel and sharp stones. High tripping hazard during morning rush.',
    imageUrl: '', // base64 or placeholder preview
    reportedBy: 'Aarav Sharma',
    userEmail: 'walker@ecowalk.local',
    createdAt: '2026-09-18T14:20:00.000Z',
    verifiedAt: '2026-09-19T10:15:00.000Z',
    adminNotes: 'Civic repair team alerted. Barrier cone placed.'
  },
  {
    id: 'REP-102',
    routeId: 'R-L7-L8-2',
    routeName: 'South Expressway Service Road',
    locationName: 'Drainage grating corner near bus bay',
    coordinates: [460, 615],
    issueType: 'drainage',
    severity: 'moderate',
    status: 'pending',
    description: 'Blocked stormwater drain causing foul water puddle spanning 3 meters across sidewalk. Pedestrians forced into vehicle lane.',
    imageUrl: '',
    reportedBy: 'Aarav Sharma',
    userEmail: 'walker@ecowalk.local',
    createdAt: '2026-09-20T08:45:00.000Z',
    verifiedAt: null,
    adminNotes: ''
  },
  {
    id: 'REP-103',
    routeId: 'R-L1-L2-2',
    routeName: 'Heritage Alleyway Cut-Through',
    locationName: 'Heritage gate passage lane',
    coordinates: [350, 200],
    issueType: 'unsafe_lighting',
    severity: 'low',
    status: 'resolved',
    description: 'Flickering street lantern causing dark blindspot after dusk along cobblestone steps.',
    imageUrl: '',
    reportedBy: 'Rakshith',
    userEmail: 'admin@ecowalk.local',
    createdAt: '2026-09-14T19:30:00.000Z',
    resolvedAt: '2026-09-16T11:00:00.000Z',
    adminNotes: 'Municipal electrical team replaced fixture with new 45W energy efficient LED unit.'
  },
  {
    id: 'REP-104',
    routeId: 'R-L6-L9-2',
    routeName: 'River Freight Access Alley',
    locationName: 'Old dock turning curve',
    coordinates: [790, 490],
    issueType: 'pothole',
    severity: 'critical',
    status: 'verified',
    description: 'Severe erosion and sunken asphalt slab leaving 15cm edge drop. Unsafe for night walking.',
    imageUrl: '',
    reportedBy: 'Kavita Rao',
    userEmail: 'kavita@ecowalk.local',
    createdAt: '2026-09-19T17:10:00.000Z',
    verifiedAt: '2026-09-20T09:30:00.000Z',
    adminNotes: 'Temporary warning tape applied; re-paving scheduled.'
  }
];

const sampleFeedback = [
  {
    id: 'FB-201',
    routeId: 'R-L1-L4-1',
    routeName: 'Emerald Arboretum Walkway',
    userId: 'U-DEMO-WALKER',
    userName: 'Aarav Sharma',
    rating: 5,
    greeneryRating: 5,
    safetyRating: 5,
    roadQualityRating: 5,
    comfortRating: 5,
    comment: 'Exceptional morning walk! Pure fresh breeze through the garden canopy, completely silent and serene without a single motor vehicle.',
    createdAt: '2026-09-19T07:45:00.000Z'
  },
  {
    id: 'FB-202',
    routeId: 'R-L2-L3-1',
    routeName: 'Lakeside Willow Walk',
    userId: 'U-DEMO-ADMIN',
    userName: 'Rakshith',
    rating: 5,
    greeneryRating: 5,
    safetyRating: 5,
    roadQualityRating: 5,
    comfortRating: 5,
    comment: 'The lakeside air is so refreshing. The new anti-slip timber boardwalk is smooth and safe even after morning dew.',
    createdAt: '2026-09-18T18:30:00.000Z'
  },
  {
    id: 'FB-203',
    routeId: 'R-L1-L4-2',
    routeName: 'West Commercial Arterial Avenue',
    userId: 'U-DEMO-WALKER',
    userName: 'Aarav Sharma',
    rating: 2,
    greeneryRating: 2,
    safetyRating: 3,
    roadQualityRating: 3,
    comfortRating: 2,
    comment: 'Too loud and congested with delivery trucks. I had to inhale heavy fumes for 15 minutes. Definitely take the Emerald Arboretum path instead!',
    createdAt: '2026-09-17T11:15:00.000Z'
  },
  {
    id: 'FB-204',
    routeId: 'R-L4-L7-1',
    routeName: 'South Green Belt Greenway',
    userId: 'U-DEMO-ADMIN',
    userName: 'Rakshith',
    rating: 4,
    greeneryRating: 5,
    safetyRating: 4,
    roadQualityRating: 5,
    comfortRating: 4,
    comment: 'Great rubberized jogging path option. Safe and well lit in the evening.',
    createdAt: '2026-09-20T19:20:00.000Z'
  }
];

module.exports = {
  initialLocations,
  initialRoutes,
  sampleUsers,
  sampleReports,
  sampleFeedback
};
