const assert = require('assert');
const app = require('../server');
const storage = require('../models/storage');

const TEST_PORT = 5057;
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

async function runHazardPrecisionTests() {
  console.log('========================================================================');
  console.log('🛡️ EcoWalk: Precision GPS Hazard Pinpointing & De-duplication Test Suite');
  console.log('========================================================================\n');

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

  // 1. Reverse Geocoding API
  console.log('--- 1. Geographic Reverse Geocoding API ---');
  const geocodeRes = await get('/api/routes/reverse-geocode?lat=12.9796&lng=77.5908');
  test('Reverse geocoding resolves coordinates to civic landmark / street name', () => {
    assert.strictEqual(geocodeRes.status, 200);
    assert.strictEqual(geocodeRes.data.success, true);
    assert.ok(geocodeRes.data.result.name, 'Result has street/landmark name');
    assert.ok(geocodeRes.data.result.name.includes('Vidhana Soudha'), 'Identified Vidhana Soudha landmark proximity');
  });

  const invalidGeocode = await get('/api/routes/reverse-geocode?lat=invalid&lng=xyz');
  test('Invalid coordinates return 400 Bad Request', () => {
    assert.strictEqual(invalidGeocode.status, 400);
  });

  // 2. Strict Coordinate Validation on Hazard Reporting
  console.log('\n--- 2. Strict Coordinate Validation on Hazard Reporting ---');
  const missingCoordsRes = await post('/api/reports', {
    locationName: 'Vague Location',
    issueType: 'pothole',
    description: 'Road is not good'
  });
  test('Reporting without precise geographic coordinates is strictly rejected (400)', () => {
    assert.strictEqual(missingCoordsRes.status, 400);
    assert.ok(missingCoordsRes.data.error.includes('coordinates'), 'Error mentions required coordinates');
  });

  const outOfBoundsCoordsRes = await post('/api/reports', {
    locationName: 'Invalid Coords',
    issueType: 'pothole',
    coordinates: [999, 999],
    description: 'Out of bounds'
  });
  test('Out-of-bounds latitude/longitude is rejected (400)', () => {
    assert.strictEqual(outOfBoundsCoordsRes.status, 400);
  });

  // 3. Proximity Hazard Query API
  console.log('\n--- 3. Proximity Hazard Query API (Radius Lookup) ---');
  // IISc Campus Main Gate is at 13.0219, 77.5671 (sample report REP-101 is located here)
  const nearbyRes = await get('/api/reports/nearby?lat=13.0220&lng=77.5672&radiusMeters=100');
  test('Nearby query finds active hazard within 100m radius', () => {
    assert.strictEqual(nearbyRes.status, 200);
    assert.strictEqual(nearbyRes.data.success, true);
    assert.ok(nearbyRes.data.reports.length >= 1, 'At least 1 nearby hazard found');
    const hazard = nearbyRes.data.reports[0];
    assert.strictEqual(hazard.id, 'REP-101');
    assert.ok(typeof hazard.distanceMeters === 'number', 'Contains computed distance in meters');
    assert.ok(hazard.distanceMeters <= 50, 'Distance is within 50 meters');
  });

  const farNearbyRes = await get('/api/reports/nearby?lat=13.1500&lng=77.7000&radiusMeters=80');
  test('Nearby query returns empty array when no hazards exist within radius', () => {
    assert.strictEqual(farNearbyRes.status, 200);
    assert.strictEqual(farNearbyRes.data.count, 0);
  });

  // 4. Hazard Upvoting / Confirmation ("I Saw This Too")
  console.log('\n--- 4. Community Upvoting & Auto-Verification ---');
  // REP-102 is currently pending with 2 confirmations
  const confirm1 = await post('/api/reports/REP-102/confirm', {
    userEmail: 'third_walker@ecowalk.local',
    userName: 'Kiran Rao'
  });
  test('Walker confirmation increments confirmations count (+1)', () => {
    assert.strictEqual(confirm1.status, 200);
    assert.strictEqual(confirm1.data.success, true);
    assert.strictEqual(confirm1.data.report.confirmations, 3);
  });

  test('Reaching 3+ confirmations auto-upgrades status to "verified"', () => {
    assert.strictEqual(confirm1.data.report.status, 'verified');
    assert.ok(confirm1.data.report.verifiedAt, 'verifiedAt timestamp recorded');
    assert.ok(confirm1.data.report.adminNotes.includes('Auto-verified'), 'Notes state community verification');
  });

  const duplicateVote = await post('/api/reports/REP-102/confirm', {
    userEmail: 'third_walker@ecowalk.local'
  });
  test('Duplicate confirmation from same walker is prevented (alreadyConfirmed: true)', () => {
    assert.strictEqual(duplicateVote.status, 200);
    assert.strictEqual(duplicateVote.data.alreadyConfirmed, true);
    assert.strictEqual(duplicateVote.data.report.confirmations, 3, 'Count not incremented on duplicate');
  });

  // 5. Automated De-duplication on Creation
  console.log('\n--- 5. Automated De-duplication on Report Creation ---');
  // Submit a pothole right at IISc Campus coordinate (where REP-101 pothole already exists)
  const deduplicateRes = await post('/api/reports', {
    locationName: 'IISc Gate Pothole',
    issueType: 'pothole',
    severity: 'high',
    coordinates: [13.0219, 77.5671],
    description: 'Road is broken with deep pothole',
    userEmail: 'dedup_walker@ecowalk.local'
  });

  test('Submitting a duplicate hazard within 35m merges and upvotes existing hazard (deduplicated: true)', () => {
    assert.strictEqual(deduplicateRes.status, 200);
    assert.strictEqual(deduplicateRes.data.deduplicated, true);
    assert.ok(deduplicateRes.data.message.includes('already reported'));
    assert.strictEqual(deduplicateRes.data.report.id, 'REP-101');
    assert.strictEqual(deduplicateRes.data.report.confirmations, 5, 'Confirmation count incremented');
  });

  // 6. Creating a Truly Novel Hazard at New Coordinate
  console.log('\n--- 6. Creating a Novel Hazard at Unreported Coordinate ---');
  const novelLat = 13.0800 + Math.random() * 0.05;
  const novelLng = 77.6500 + Math.random() * 0.05;
  const novelRes = await post('/api/reports', {
    locationName: 'Hebbal Wetland Overpass',
    issueType: 'obstruction',
    severity: 'moderate',
    coordinates: [novelLat, novelLng],
    description: 'Fallen tree branch across pedestrian boardwalk',
    userEmail: 'new_reporter@ecowalk.local'
  });

  test('Novel hazard at new coordinate creates a new report with status 201', () => {
    assert.strictEqual(novelRes.status, 201);
    assert.strictEqual(novelRes.data.deduplicated, false);
    assert.ok(novelRes.data.report.id.startsWith('REP-'));
    assert.strictEqual(novelRes.data.report.confirmations, 1);
    assert.deepStrictEqual(novelRes.data.report.coordinates, [novelLat, novelLng]);
  });

  console.log('\n========================================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================');

  server.close();
  if (failed > 0) {
    process.exit(1);
  }
}

server = app.listen(TEST_PORT, async () => {
  server.unref();
  try {
    await runHazardPrecisionTests();
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    if (server) server.close();
    process.exit(1);
  }
});
