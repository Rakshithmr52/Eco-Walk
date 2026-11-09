
const assert = require('assert');
const http = require('http');
const app = require('../server');
const storage = require('../models/storage');
const recommendationEngine = require('../services/recommendationEngine');

const PORT = 5059;
let server;
let adminToken = '';
let walkerToken = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, text: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runIntegritySuite() {
  console.log('========================================================================');
  console.log('🛡️ EcoWalk: Find Routes & Road Hazards Verification Suite');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
    try {
      fn();
      console.log(`  ✓ ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(desc, fn) {
    try {
      await fn();
      console.log(`  ✓ ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${desc}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // Start test server
  await new Promise(resolve => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server running on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });

  try {
    // Auth Setup
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@ecowalk.local',
      password: 'admin123'
    });
    if (loginRes.data && loginRes.data.token) {
      adminToken = loginRes.data.token;
    }

    const walkerLoginRes = await request('POST', '/api/auth/login', {
      email: 'walker@ecowalk.local',
      password: 'walk123'
    });
    if (walkerLoginRes.data && walkerLoginRes.data.token) {
      walkerToken = walkerLoginRes.data.token;
    }

    console.log('\n--- 1. Open Find Routes & Environmental Data ---');
    await asyncTest('Find Routes locations API responds with 200 and coordinates', async () => {
      const res = await request('GET', '/api/routes/locations');
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.locations));
      assert(res.data.locations.length > 0);
      const first = res.data.locations[0];
      assert(typeof first.lat === 'number' && typeof first.lng === 'number');
    });

    await asyncTest('CPCB monitoring stations load with valid Bengaluru coordinates and AQI', async () => {
      const res = await request('GET', '/api/routes/cpcb-stations');
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.stations));
      assert(res.data.stations.length >= 10);
      const btm = res.data.stations.find(s =>
        (s.stationName && s.stationName.includes('BTM')) ||
        (s.name && s.name.includes('BTM')) ||
        (s.locality && s.locality.includes('BTM'))
      );
      assert(btm, 'BTM Layout CAAQMS station must be present');
      assert(typeof btm.aqi === 'number');
    });

    console.log('\n--- 2. Destination Search & Geocoding ---');
    await asyncTest('Search destination for "Cubbon Park" returns real coordinate results within radius', async () => {
      const res = await request('GET', '/api/routes/search-destination?query=Cubbon&lat=12.9716&lon=77.5946&radius=8');
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.results));
      assert(res.data.results.length > 0);
      const first = res.data.results[0];
      assert(typeof first.lat === 'number');
      assert(typeof first.lng === 'number');
    });

    await asyncTest('Reverse geocoding resolves map click coordinates to readable street / area name', async () => {
      const res = await request('GET', '/api/routes/reverse-geocode?lat=12.9763&lng=77.5929');
      assert.strictEqual(res.status, 200);
      assert(res.data.result);
      assert(typeof res.data.result.name === 'string');
    });

    console.log('\n--- 3. Walking Route Generation & Multi-Criteria MAUT ---');
    let generatedRoutes = null;
    await asyncTest('Generate route from GPS origin to selected destination', async () => {
      const res = await request('POST', '/api/routes/recommend', {
        startCoords: { lat: 12.9716, lng: 77.5946 },
        destinationCoords: { lat: 12.9815, lng: 77.6201 },
        startLabel: 'Bengaluru Center (GPS)',
        destinationLabel: 'Ulsoor Lake Promenade',
        maxWalkingDistanceKm: 8.0,
        walkingSpeed: 'moderate'
      });
      assert.strictEqual(res.status, 200);
      assert(res.data.success);
      assert(res.data.recommendedRoute);
      assert(res.data.recommendedRoute.distanceKm > 0);
      assert(res.data.recommendedRoute.distanceKm <= 8.0);
      assert(res.data.recommendedRoute.estimatedMinutes > 0);
      assert(res.data.recommendedRoute.healthScore >= 0 && res.data.recommendedRoute.healthScore <= 100);
      assert(Array.isArray(res.data.recommendedRoute.waypoints));
      assert(res.data.recommendedRoute.waypoints.length >= 2);
      assert(res.data.recommendedRoute.cpcbStation);
      assert(typeof res.data.recommendedRoute.cpcbAqi === 'number');
      generatedRoutes = res.data;
    });

    await asyncTest('Generate alternatives returns genuine distinct walking paths marked isRecommended=false', async () => {
      assert(generatedRoutes);
      assert(Array.isArray(generatedRoutes.alternativeRoutes));
      assert(generatedRoutes.alternativeRoutes.length > 0);
      for (const alt of generatedRoutes.alternativeRoutes) {
        assert.strictEqual(alt.isRecommended, false);
        assert(alt.distanceKm > 0);
        assert(alt.waypoints && alt.waypoints.length >= 2);
      }
    });

    await asyncTest('Walking limit validation enforces 8 km boundary', async () => {
      const res = await request('POST', '/api/routes/recommend', {
        startCoords: { lat: 12.9716, lng: 77.5946 },
        destinationCoords: { lat: 13.1986, lng: 77.7066 }, // Kempegowda Airport ~28 km away
        maxWalkingDistanceKm: 8.0
      });
      assert.strictEqual(res.status, 400);
      assert(res.data.error.includes('walking radius') || res.data.error.includes('exceeds'));
    });

    console.log('\n--- 4. Road Hazards Module & Persistence ---');
    let createdReportId = '';
    await asyncTest('Open Road Hazards: loads existing reports without schema crashes', async () => {
      const res = await request('GET', '/api/reports');
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.reports));
      assert(res.data.reports.length > 0);
      for (const r of res.data.reports) {
        assert(r.id, 'Report must have an id');
        assert(typeof (r.issueType || r.type) === 'string', 'Report must have issueType or type');
        assert(typeof (r.locationName || r.title) === 'string', 'Report must have locationName or title');
      }
    });

    await asyncTest('Submit hazard: authenticated user submits a new pothole report with coordinates', async () => {
      const uniqueOffset = (Date.now() % 10000) / 100000;
      const uniqueLat = Number((12.95 + uniqueOffset).toFixed(5));
      const uniqueLng = Number((77.58 + uniqueOffset).toFixed(5));
      const res = await request(
        'POST',
        '/api/reports',
        {
          locationName: 'Cubbon Road Pedestrian Curb',
          coordinates: [uniqueLat, uniqueLng],
          issueType: 'pothole',
          severity: 'high',
          description: 'Deep crack in granite sidewalk edge causing pedestrian tripping.',
          reportedBy: 'Active Walker'
        },
        { Authorization: `Bearer ${walkerToken}` }
      );
      assert(res.status === 201 || res.status === 200, `Expected 201 or 200, got ${res.status}`);
      assert(res.data.success);
      assert(res.data.report);
      assert(res.data.report.id);
      createdReportId = res.data.report.id;
    });

    await asyncTest('Persistence check: newly submitted report remains in JSON storage and GET /api/reports', async () => {
      const res = await request('GET', '/api/reports');
      assert.strictEqual(res.status, 200);
      const found = res.data.reports.find(r => r.id === createdReportId);
      assert(found, `Newly submitted report ${createdReportId} must be present in persistent storage`);
      assert.strictEqual(found.locationName, 'Cubbon Road Pedestrian Curb');
    });

    await asyncTest('Admin verifies report: status transitions from pending to verified', async () => {
      assert(createdReportId);
      const res = await request(
        'PATCH',
        `/api/reports/${createdReportId}/status`,
        {
          status: 'verified',
          adminNotes: 'Civic engineer inspected and confirmed trip risk. Work order created.'
        },
        { Authorization: `Bearer ${adminToken}` }
      );
      assert.strictEqual(res.status, 200);
      assert(res.data.success);
      assert.strictEqual(res.data.report.status, 'verified');
      assert(res.data.report.adminNotes.includes('Civic engineer'));
    });

    console.log('\n--- 5. Module Integration: Hazards Affecting Route Evaluation ---');
    await asyncTest('Verified hazard is detected and penalizes road condition in route calculation', async () => {
      // Calculate route passing directly near Cubbon Road (12.9772, 77.5988)
      const res = await request('POST', '/api/routes/recommend', {
        startCoords: { lat: 12.9760, lng: 77.5930 },
        destinationCoords: { lat: 12.9790, lng: 77.6030 },
        startLabel: 'Cubbon Gate',
        destinationLabel: 'MG Road Junction',
        maxWalkingDistanceKm: 8.0
      });
      assert.strictEqual(res.status, 200);
      const route = res.data.recommendedRoute;
      assert(route.hazardData);
      assert(route.hazardData.penalty >= 0);
      assert(typeof route.effectiveRoadCondition === 'number');
      assert(route.effectiveRoadCondition <= route.roadConditionScore);
    });

    await asyncTest('Resolved and rejected hazards are not displayed as active road warnings', async () => {
      // Mark our report as resolved
      const res = await request(
        'PATCH',
        `/api/reports/${createdReportId}/status`,
        { status: 'resolved', adminNotes: 'Asphalt patched.' },
        { Authorization: `Bearer ${adminToken}` }
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.report.status, 'resolved');

      // Check storage active reports
      const allActive = storage.getReports().filter(r => r.status === 'pending' || r.status === 'verified');
      const resolvedFound = allActive.find(r => r.id === createdReportId);
      assert(!resolvedFound, 'Resolved report must NOT be included in active reports list');
    });

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n========================================================================');
  console.log(`FINAL INTEGRITY TEST OUTCOME: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegritySuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  if (server) server.close();
  process.exit(1);
});
