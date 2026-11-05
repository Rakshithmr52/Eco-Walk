/**
 * EcoWalk Phase 1 Comprehensive In-Process Verification Suite (CommonJS)
 * Verifies all Phase 1 capabilities:
 * 1. User Authentication & Data Persistence
 * 2. Open Destination Search, Map Click Geocoding & 8 km Walking Radius
 * 3. Official CPCB AQI Service (11 CAAQMS stations, category mapping, route matching, transparency)
 * 4. Genuine Pedestrian Routing & Verification of Synthetic Route Removal
 * 5. Road Hazard Reporting Lifecycle (Create, Verify, Route-Buffer Matching & Road Score Penalty)
 * 6. Health-Based MAUT Recommendation Engine (Weights, Grounded P & R, Reasons, Health Disclaimer)
 * 7. Route Controller API Validation (Req/Res handling, 8 km limit, Error handling)
 */

const assert = require('assert');
const path = require('path');
const storage = require('../models/storage');
const cpcbAqiService = require('../services/cpcbAqiService');
const routingService = require('../services/routingService');
const recommendationEngine = require('../services/recommendationEngine');
const routeController = require('../controllers/routeController');

// Ensure storage is initialized
storage.initStorage();

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failedCount++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failedCount++;
  }
}

// Helper to mock Express req/res
function createMockReqRes(reqOptions = {}) {
  const req = {
    body: {},
    query: {},
    params: {},
    user: null,
    ...reqOptions
  };
  let statusCode = 200;
  let jsonBody = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      jsonBody = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getBody: () => jsonBody
  };

  return { req, res };
}

async function runSuite() {
  console.log('========================================================');
  console.log('   ECOWALK PHASE 1 - AUTOMATION & HEALTH VERIFICATION   ');
  console.log('========================================================\n');

  // -------------------------------------------------------------------------
  // 1. User Authentication & Data Persistence
  // -------------------------------------------------------------------------
  console.log('--- 1. User Authentication & Persistence ---');
  
  const testEmail = `phase1_test_${Date.now()}@ecowalk.org`;
  let createdUser = null;

  runTest('Create new user in storage', () => {
    createdUser = storage.createUser({
      id: `usr_${Date.now()}`,
      name: 'Dr. Jane Walker',
      email: testEmail,
      password: 'SecurePassword123!',
      role: 'user',
      preferences: { prioritizeAirQuality: true, prioritizeGreenery: true },
      walkingSpeed: 'moderate',
      stats: { totalDistanceKm: 0, totalWalks: 0, totalCalories: 0, co2SavedKg: 0, reportsSubmitted: 0 },
      createdAt: new Date().toISOString()
    });
    assert.ok(createdUser, 'User successfully created');
    assert.strictEqual(createdUser.email, testEmail);
    assert.ok(createdUser.id, 'User has an ID');
  });

  runTest('Retrieve user by email and ID from persistence', () => {
    const fetchedByEmail = storage.getUserByEmail(testEmail);
    assert.ok(fetchedByEmail, 'User found by email');
    assert.strictEqual(fetchedByEmail.id, createdUser.id);

    const fetchedById = storage.getUserById(createdUser.id);
    assert.ok(fetchedById, 'User found by ID');
    assert.strictEqual(fetchedById.name, 'Dr. Jane Walker');
  });

  // -------------------------------------------------------------------------
  // 2. Open Destination Search, Map Click Geocoding & Radius Enforcement
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Open Destination Selection & Walking Radius (7-8 km) ---');

  await runAsyncTest('Destination search works with open query within 8.0 km radius', async () => {
    // Search around Vidhana Soudha / Cubbon Park (lat: 12.9791, lng: 77.5913)
    const results = await routingService.searchDestinations('Cubbon', 12.9791, 77.5913, 8.0);
    assert.ok(Array.isArray(results), 'Results is an array');
    assert.ok(results.length > 0, 'Returned search results for Cubbon');
    const first = results[0];
    assert.ok(first.name, 'Result has a name');
    assert.ok(typeof first.lat === 'number', 'Result has numeric lat');
    assert.ok(typeof first.lng === 'number', 'Result has numeric lng');
    assert.ok(first.distanceKm <= 8.0, `Result is within 8.0 km radius (got ${first.distanceKm} km)`);
  });

  await runAsyncTest('Reverse geocoding resolves coordinates to address label', async () => {
    // Coordinate near Cubbon Park / MG Road
    const address = await routingService.reverseGeocode(12.9767, 77.5993);
    assert.ok(address && typeof address.name === 'string', 'Address.name is a string');
    assert.ok(address.name.length > 0, 'Address.name is non-empty');
  });

  runTest('Haversine distance calculation is accurate', () => {
    // Distance between Majestic (12.9781, 77.5696) and MG Road (12.9756, 77.6066) ~ 4.0 km
    const dist = routingService.haversineDistance(12.9781, 77.5696, 12.9756, 77.6066);
    assert.ok(dist >= 3.8 && dist <= 4.3, `Distance is ~4.0 km (got ${dist.toFixed(2)} km)`);
  });

  runTest('Walking limit check rejects destinations beyond 8.0 km by default', () => {
    // Lalbagh to Electronic City (~14 km)
    const dist = routingService.haversineDistance(12.9507, 77.5848, 12.8452, 77.6602);
    const maxWalkingDistanceKm = 8.0;
    const isExceeded = dist > maxWalkingDistanceKm;
    assert.strictEqual(isExceeded, true, `14 km destination correctly detected as exceeding 8 km limit`);
  });

  runTest('Walking limit check permits destinations within 8.0 km range (e.g. 6.5 km walk)', () => {
    // Lalbagh (12.9507, 77.5848) to Indiranagar (12.9719, 77.6412) ~ 6.5 km
    const dist = routingService.haversineDistance(12.9507, 77.5848, 12.9719, 77.6412);
    assert.ok(dist <= 8.0, `Indiranagar is ${dist.toFixed(2)} km, within 8.0 km limit`);
  });

  // -------------------------------------------------------------------------
  // 3. Official CPCB AQI Integration
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Official CPCB AQI Service & Station Matching ---');

  await runAsyncTest('CPCB service loads all 11 official Bengaluru CAAQMS stations', async () => {
    const stations = await cpcbAqiService.getAllCpcbStations();
    assert.strictEqual(stations.length, 11, 'Exactly 11 official stations configured');
    
    // Check required fields for each station
    for (const station of stations) {
      assert.ok(station.id, 'Station has id');
      assert.ok(station.stationName, 'Station has stationName');
      assert.ok(station.locality, 'Station has locality');
      assert.ok(typeof station.lat === 'number', 'Station has numeric lat');
      assert.ok(typeof station.lng === 'number', 'Station has numeric lng');
      assert.ok(typeof station.aqi === 'number', 'Station has numeric AQI');
      assert.ok(station.category, 'Station has category');
      assert.ok(station.prominentPollutant, 'Station has prominent pollutant');
      assert.ok(station.lastUpdated, 'Station has timestamp');
      assert.ok(station.agency.includes('CPCB'), 'Agency is official CPCB');
    }
  });

  runTest('CPCB AQI category mapping adheres to official standard', () => {
    assert.strictEqual(cpcbAqiService.getCpcbCategory(35).category, 'Good');
    assert.strictEqual(cpcbAqiService.getCpcbCategory(85).category, 'Satisfactory');
    assert.strictEqual(cpcbAqiService.getCpcbCategory(145).category, 'Moderate');
    assert.strictEqual(cpcbAqiService.getCpcbCategory(250).category, 'Poor');
    assert.strictEqual(cpcbAqiService.getCpcbCategory(340).category, 'Very Poor');
    assert.strictEqual(cpcbAqiService.getCpcbCategory(450).category, 'Severe');
  });

  await runAsyncTest('Route-to-station proximity matching calculates route-level AQI', async () => {
    // Route from Majestic towards Vidhana Soudha
    const routeWaypoints = [
      [12.9781, 77.5696], // Near City Railway Station CPCB monitor
      [12.9775, 77.5750],
      [12.9785, 77.5850],
      [12.9791, 77.5913]
    ];

    const assessment = await cpcbAqiService.matchRouteToCpcbStations(routeWaypoints);
    assert.ok(assessment, 'Assessment object generated');
    assert.ok(assessment.matchedStation && assessment.matchedStation.name, 'Contains nearest station name');
    assert.ok(typeof assessment.routeAqi === 'number', 'Contains route-level average AQI');
    assert.ok(assessment.category, 'Contains AQI category');
    assert.ok(typeof assessment.distanceToStationKm === 'number', 'Contains distance to nearest station');
    assert.ok(assessment.dataSource.includes('CPCB'), 'Source mentions official CPCB');
    assert.ok(assessment.isEstimated, 'Marks route-level estimate as estimated from stations');
    assert.ok(assessment.disclosure.includes('CPCB'), 'Disclosure note mentions official CPCB');
  });

  runTest('Pollution risk score P is grounded in CPCB AQI (0 to 100 scale)', () => {
    const riskGood = cpcbAqiService.mapAqiToPollutionRisk(50);
    assert.strictEqual(riskGood, 20, 'AQI 50 maps to P=20 (Good tier)');

    const riskModerate = cpcbAqiService.mapAqiToPollutionRisk(150);
    assert.strictEqual(riskModerate, 60, 'AQI 150 maps to P=60 (Moderate tier)');

    const riskPoor = cpcbAqiService.mapAqiToPollutionRisk(300);
    assert.strictEqual(riskPoor, 90, 'AQI 300 maps to P=90 (Poor tier)');

    const riskSevere = cpcbAqiService.mapAqiToPollutionRisk(500);
    assert.strictEqual(riskSevere, 100, 'AQI 500 maps to P=100 (Severe tier)');
  });

  // -------------------------------------------------------------------------
  // 4. Genuine Pedestrian Routing & Verification of Synthetic Route Removal
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Pedestrian Routing & Synthetic Code Removal ---');

  runTest('Routing service code contains zero synthetic route generators', () => {
    assert.strictEqual(typeof routingService.generateSyntheticAlternative, 'undefined', 'Synthetic route generator function deleted');
  });

  await runAsyncTest('Pedestrian route generator returns genuine route geometries', async () => {
    const startCoords = { lat: 12.9756, lng: 77.5920 }; // MG Road
    const destinationCoords = { lat: 12.9791, lng: 77.5913 }; // Cubbon Park (~0.8 km)

    const routeData = await routingService.getWalkingRoutes(startCoords, destinationCoords);
    assert.ok(routeData && Array.isArray(routeData.features), 'Returns GeoJSON features array');
    assert.ok(routeData.features.length >= 1, 'At least 1 genuine route returned');
    
    for (const f of routeData.features) {
      assert.ok(f.properties?.summary?.distance > 0, 'Route has positive distance');
      assert.ok(f.geometry && Array.isArray(f.geometry.coordinates), 'Route has coordinates array');
      assert.ok(f.geometry.coordinates.length >= 2, 'Route has at least 2 coordinate points');
      assert.strictEqual(f.properties?.isSynthesizedAlternative, undefined, 'No synthesized route flag');
    }
  });

  // -------------------------------------------------------------------------
  // 5. Road Hazard Reporting Lifecycle & Road Quality Impact
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Road Hazard Reporting Lifecycle & Road Quality Impact ---');

  let testReportId = null;

  runTest('User submits a road hazard report (pothole on MG Road)', () => {
    const report = storage.createReport({
      id: `rep_${Date.now()}`,
      userId: createdUser.id,
      userName: createdUser.name,
      type: 'pothole',
      title: 'Deep pothole on MG Road pedestrian crossing',
      description: 'Trip hazard for pedestrians near traffic signal',
      severity: 'high',
      status: 'pending',
      lat: 12.9760,
      lng: 77.5930,
      coordinates: [12.9760, 77.5930],
      location: {
        address: 'MG Road crossing'
      },
      createdAt: new Date().toISOString()
    });

    assert.ok(report, 'Report created');
    assert.ok(report.id, 'Report has an ID');
    assert.strictEqual(report.status, 'pending', 'Initial status is pending');
    testReportId = report.id;
  });

  runTest('Admin verifies the road hazard report', () => {
    const updated = storage.updateReportStatus(testReportId, 'verified', 'Verified by Admin Inspector');
    assert.ok(updated, 'Report status updated');
    assert.strictEqual(updated.status, 'verified', 'Status is now verified');

    const fetched = storage.getReportById(testReportId);
    assert.strictEqual(fetched.status, 'verified', 'Persistence reflects verified status');
  });

  runTest('Hazard spatial matching penalizes road quality score for intersecting routes', () => {
    // Route directly passing by the pothole at 12.9760, 77.5930
    const passingWaypoints = [
      [12.9758, 77.5925],
      [12.9760, 77.5930], // Exact pothole coordinate
      [12.9765, 77.5935]
    ];

    const penaltyPassing = recommendationEngine.calculateGeoHazardPenalty(passingWaypoints);
    assert.ok(penaltyPassing.penalty > 0, `Hazard penalty is applied for passing route (got -${penaltyPassing.penalty} pts)`);

    // Route far away (Lalbagh, ~3 km south)
    const distantWaypoints = [
      [12.9507, 77.5848],
      [12.9515, 77.5855]
    ];
    const penaltyDistant = recommendationEngine.calculateGeoHazardPenalty(distantWaypoints);
    assert.strictEqual(penaltyDistant.penalty, 0, 'No hazard penalty applied for distant route');
  });

  // -------------------------------------------------------------------------
  // 6. Health-Based MAUT Recommendation Engine
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Health-Based MAUT Recommendation Engine ---');

  runTest('MAUT formula adheres to HS = (wG*G + wS*S + wA*(100-P) + wR*R) - Dp', () => {
    const G = 80;   // Greenery
    const S = 75;   // Pedestrian safety
    const P = 40;   // Pollution risk (Air quality 100 - P = 60)
    const R = 70;   // Road quality
    const Dp = 1.5; // Distance penalty

    const wG = 0.25;
    const wS = 0.25;
    const wA = 0.30;
    const wR = 0.20;

    const expectedHS = Math.round((wG * G + wS * S + wA * (100 - P) + wR * R) - Dp);
    const calculatedHS = recommendationEngine.calculateHealthScore({
      greeneryScore: G,
      safetyScore: S,
      pollutionRisk: P,
      roadQualityScore: R,
      distancePenalty: Dp,
      weights: { wG, wS, wA, wR }
    });

    assert.strictEqual(calculatedHS, expectedHS, `MAUT calculation matches: ${calculatedHS} vs expected ${expectedHS}`);
  });

  await runAsyncTest('Complete route recommendation prioritizes health, includes CPCB & disclaimer', async () => {
    const startCoords = { lat: 12.9756, lng: 77.5920 }; // MG Road
    const destinationCoords = { lat: 12.9791, lng: 77.5913 }; // Cubbon Park (~0.8 km)

    const result = await recommendationEngine.evaluateAndRecommendRealRoutes({
      startCoords,
      destinationCoords,
      startLabel: 'MG Road Metro',
      destinationLabel: 'Cubbon Park Entrance',
      userPreferences: { prioritizeAirQuality: true, prioritizeGreenery: true },
      walkingSpeed: 'moderate',
      maxWalkingDistanceKm: 8.0
    });

    assert.ok(result, 'Result generated');
    assert.ok(result.recommendedRoute, 'Has recommended route');
    const rec = result.recommendedRoute;
    assert.strictEqual(rec.isRecommended, true);
    assert.ok(typeof rec.healthScore === 'number', 'Has numeric health score');
    
    // Check CPCB AQI data presence
    assert.ok(rec.cpcbStation, 'Recommended route includes CPCB station assessment');
    assert.ok(rec.cpcbStation.name, 'Includes CPCB station name');
    assert.ok(typeof rec.cpcbAqi === 'number', 'Includes CPCB AQI value');
    assert.ok(rec.cpcbCategory, 'Includes CPCB AQI category');
    assert.ok(rec.cpcbDataSource && rec.cpcbDataSource.includes('CPCB'), 'Source is CPCB');

    // Check justified recommendation reasons
    assert.ok(Array.isArray(rec.recommendationReasons), 'Contains recommendation reasons');
    assert.ok(rec.recommendationReasons.length >= 2, 'Has at least 2 justified reasons');
    
    // Check health disclaimer
    assert.ok(result.healthDisclaimer, 'Health disclaimer is present at response level');
    assert.ok(result.healthDisclaimer.includes('decision-support'), 'Disclaimer clarifies decision-support nature');
    assert.ok(rec.healthDisclaimer, 'Health disclaimer is present on route card');
  });

  // -------------------------------------------------------------------------
  // 7. Route Controller API Handlers
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Route Controller API Handlers ---');

  await runAsyncTest('getCpcbStations controller returns 11 stations with 200 OK', async () => {
    const { req, res } = createMockReqRes();
    await routeController.getCpcbStations(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    const body = res.getBody();
    assert.ok(body.success, 'Response success is true');
    assert.strictEqual(body.count, 11, 'Returns 11 stations');
    assert.strictEqual(body.stations.length, 11);
  });

  await runAsyncTest('recommendRoutes controller rejects destinations beyond 8.0 km', async () => {
    const { req, res } = createMockReqRes({
      body: {
        startCoords: { lat: 12.9507, lng: 77.5848 }, // Lalbagh
        destinationCoords: { lat: 12.8452, lng: 77.6602 } // Electronic City (~14 km)
      }
    });

    await routeController.recommendRoutes(req, res);
    assert.strictEqual(res.getStatusCode(), 400);
    const body = res.getBody();
    assert.ok(body.error.includes('8 km walking radius'), `Rejection message mentions 8 km: ${body.error}`);
  });

  await runAsyncTest('recommendRoutes controller rejects identical coordinates', async () => {
    const { req, res } = createMockReqRes({
      body: {
        startCoords: { lat: 12.9756, lng: 77.5920 },
        destinationCoords: { lat: 12.9756, lng: 77.5920 }
      }
    });

    await routeController.recommendRoutes(req, res);
    assert.strictEqual(res.getStatusCode(), 400);
    const body = res.getBody();
    assert.ok(body.error.includes('too close'));
  });

  await runAsyncTest('recommendRoutes controller processes valid walk under 8 km', async () => {
    const { req, res } = createMockReqRes({
      body: {
        startCoords: { lat: 12.9756, lng: 77.5920 },
        destinationCoords: { lat: 12.9791, lng: 77.5913 },
        startLabel: 'MG Road',
        destinationLabel: 'Cubbon Park'
      }
    });

    await routeController.recommendRoutes(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    const body = res.getBody();
    assert.ok(body.success);
    assert.ok(body.recommendedRoute);
    assert.ok(body.recommendedRoute.cpcbStation);
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n========================================================');
  console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
