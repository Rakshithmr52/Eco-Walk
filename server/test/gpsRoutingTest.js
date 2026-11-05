const assert = require('assert');
const app = require('../server');

const TEST_PORT = 5056;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;

async function post(path, body = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runGpsRoutingTests() {
  console.log('================================================================');
  console.log('🌿 EcoWalk Phase 1: Real GPS, Interactive Map & Routing Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Destination Geocoding & Search API
  console.log('--- 1. Destination Search & Geocoding API ---');
  const search1 = await get('/api/routes/search-destination?query=Lalbagh');
  test('Search destination for "Lalbagh" returns matching results', () => {
    assert.strictEqual(search1.status, 200);
    assert.ok(search1.data.results.length >= 1, 'At least 1 result returned');
    const first = search1.data.results[0];
    assert.ok(first.name, 'Result has name');
    assert.ok(typeof first.lat === 'number', 'Result has numeric latitude');
    assert.ok(typeof first.lng === 'number', 'Result has numeric longitude');
    assert.ok(first.lat >= 12 && first.lat <= 14, 'Latitude in realistic Bengaluru bounds');
    assert.ok(first.lng >= 77 && first.lng <= 78, 'Longitude in realistic Bengaluru bounds');
  });

  const searchEmpty = await get('/api/routes/search-destination?query=');
  test('Empty search query returns empty array without error', () => {
    assert.strictEqual(searchEmpty.status, 200);
    assert.strictEqual(searchEmpty.data.results.length, 0);
  });

  // 2. Real GPS Walking Route Recommendation API
  console.log('\n--- 2. Real GPS Walking Route Recommendation ---');
  // Start: Lalbagh (12.9507, 77.5848), Destination: Vidhana Soudha (12.9796, 77.5908)
  const realRouteRes = await post('/api/routes/recommend', {
    startCoords: { lat: 12.9507, lng: 77.5848 },
    destinationCoords: { lat: 12.9796, lng: 77.5908 },
    startLabel: 'Current GPS Location (Lalbagh)',
    destinationLabel: 'Vidhana Soudha & Attara Kacheri',
    walkingSpeed: 'moderate',
    preferences: {
      prioritizeGreenery: true,
      prioritizeSafety: true,
      avoidPollution: true,
      avoidPotholes: true
    }
  });

  test('Real GPS route calculation succeeds with 200 OK', () => {
    assert.strictEqual(realRouteRes.status, 200);
    assert.strictEqual(realRouteRes.data.success, true);
    assert.ok(realRouteRes.data.recommendedRoute, 'Recommended route exists');
  });

  const rec = realRouteRes.data.recommendedRoute;
  test('Recommended route contains real Leaflet geographic waypoints [lat, lng]', () => {
    assert.ok(Array.isArray(rec.waypoints), 'Waypoints is an array');
    assert.ok(rec.waypoints.length > 10, 'Contains realistic number of coordinate vertices');
    const firstPt = rec.waypoints[0];
    assert.ok(Array.isArray(firstPt) && firstPt.length >= 2, 'Waypoint is a coordinate pair');
    assert.ok(firstPt[0] >= 12 && firstPt[0] <= 14, `First waypoint lat (${firstPt[0]}) is valid lat`);
    assert.ok(firstPt[1] >= 77 && firstPt[1] <= 78, `First waypoint lng (${firstPt[1]}) is valid lng`);
  });

  test('Recommended route contains realistic distance, time, and calories', () => {
    assert.ok(rec.distanceKm > 2.0 && rec.distanceKm < 8.0, `Distance ${rec.distanceKm}km is realistic`);
    assert.ok(rec.estimatedMinutes >= 20, `Walk time ${rec.estimatedMinutes}min is realistic`);
    assert.ok(rec.caloriesBurned > 100, `Calories ${rec.caloriesBurned}kcal is computed`);
    assert.ok(rec.co2SavedGrams > 200, `CO2 saved ${rec.co2SavedGrams}g is computed`);
  });

  test('Multi-criteria health engine evaluates health indices (0-100)', () => {
    assert.ok(rec.healthScore >= 50 && rec.healthScore <= 100, `Health score ${rec.healthScore} is in valid range`);
    assert.ok(rec.greeneryScore >= 20 && rec.greeneryScore <= 100, `Greenery score ${rec.greeneryScore} is valid`);
    assert.ok(rec.safetyScore >= 50 && rec.safetyScore <= 100, `Safety score ${rec.safetyScore} is valid`);
    assert.ok(rec.trafficPollutionRisk >= 10 && rec.trafficPollutionRisk <= 100, `Pollution risk ${rec.trafficPollutionRisk} is valid`);
    assert.ok(rec.roadConditionScore >= 50, `Road condition ${rec.roadConditionScore} is valid`);
  });

  test('Environmental data source transparency notice is present', () => {
    assert.ok(rec.environmentalDataSource, 'Environmental data source disclosure is present');
    assert.ok(rec.environmentalDataSource.includes('Proximity'), 'Identifies model source');
    assert.ok(rec.environmentalDataSource.includes('unavailable'), 'Explicitly notes unavailable sensor data');
  });

  test('Rule-based natural language recommendation reasons are generated', () => {
    assert.ok(Array.isArray(rec.recommendationReasons), 'Recommendation reasons is an array');
    assert.ok(rec.recommendationReasons.length >= 3, 'Contains at least 3 justified reasons');
  });

  test('Alternative walking routes are returned and marked isRecommended=false', () => {
    assert.ok(Array.isArray(realRouteRes.data.alternativeRoutes), 'Alternative routes is an array');
    assert.ok(realRouteRes.data.alternativeRoutes.length >= 1, 'At least 1 alternative route is returned (minimum 2 routes evaluated)');
    const alt = realRouteRes.data.alternativeRoutes[0];
    assert.strictEqual(alt.isRecommended, false);
    assert.ok(alt.healthScore <= rec.healthScore, 'Recommended route has highest health score (giving the best route)');
  });

  // 3. Error Handling and Edge Cases
  console.log('\n--- 3. Error Handling & Edge Cases ---');
  const identicalCoords = await post('/api/routes/recommend', {
    startCoords: { lat: 12.9507, lng: 77.5848 },
    destinationCoords: { lat: 12.9507, lng: 77.5848 }
  });
  test('Identical start and destination coordinates rejected with 400 Bad Request', () => {
    assert.strictEqual(identicalCoords.status, 400);
    assert.ok(identicalCoords.data.error.includes('too close'));
  });

  // Test 5 km walking radius enforcement
  const distantCoords = await post('/api/routes/recommend', {
    startCoords: { lat: 12.9507, lng: 77.5848 }, // Lalbagh
    destinationCoords: { lat: 12.8452, lng: 77.6602 } // Electronic City (~14 km away)
  });
  test('Destination beyond 5 km walking radius rejected with 400 Bad Request', () => {
    assert.strictEqual(distantCoords.status, 400);
    assert.ok(distantCoords.data.error.includes('5 km'), 'Mentions 5 km walking radius limit');
  });

  const missingCoords = await post('/api/routes/recommend', {
    startCoords: { lat: 12.9507 } // missing lng & destination
  });
  test('Missing coordinates rejected with 400 Bad Request', () => {
    assert.strictEqual(missingCoords.status, 400);
  });

  console.log('\n========================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================');

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

server = app.listen(TEST_PORT, async () => {
  try {
    await runGpsRoutingTests();
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    if (server) server.close();
    process.exit(1);
  }
});

