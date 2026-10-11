const assert = require('assert');
const http = require('http');
const app = require('../server');
const storage = require('../models/storage');

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;

async function post(path, body = {}, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function patch(path, body = {}, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Starting EcoWalk End-to-End Verification Test Suite...\n');

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

  // 1. Health check
  const health = await get('/api/health');
  test('Backend health check is online', () => {
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'online');
  });

  // 2. Demo User Authentication
  const walkerLogin = await post('/api/auth/login', {
    email: 'walker@ecowalk.local',
    password: 'walk123'
  });
  test('Demo walker login succeeds with valid token', () => {
    assert.strictEqual(walkerLogin.status, 200);
    assert.ok(walkerLogin.data.token, 'Token must be provided');
    assert.strictEqual(walkerLogin.data.user.role, 'walker');
    assert.strictEqual(walkerLogin.data.user.passwordHash, undefined, 'Password hash must never be returned');
  });
  const walkerToken = walkerLogin.data.token;

  const adminLogin = await post('/api/auth/login', {
    email: 'admin@ecowalk.local',
    password: 'admin123'
  });
  test('Demo admin login succeeds with valid token', () => {
    assert.strictEqual(adminLogin.status, 200);
    assert.ok(adminLogin.data.token, 'Admin token must be provided');
    assert.strictEqual(adminLogin.data.user.role, 'admin');
  });
  const adminToken = adminLogin.data.token;

  // 3. Registration Input & Password Validation
  const shortPassRegister = await post('/api/auth/register', {
    name: 'Short Pass User',
    email: `short_${Date.now()}@ecowalk.local`,
    password: '123'
  });
  test('Registration rejects short password (< 6 chars) with 400 Bad Request', () => {
    assert.strictEqual(shortPassRegister.status, 400);
    assert.ok(shortPassRegister.data.error.includes('6 characters'));
  });

  const invalidEmailRegister = await post('/api/auth/register', {
    name: 'Bad Email User',
    email: 'not-an-email-format',
    password: 'validPassword123'
  });
  test('Registration rejects invalid email format with 400 Bad Request', () => {
    assert.strictEqual(invalidEmailRegister.status, 400);
    assert.ok(invalidEmailRegister.data.error.includes('valid email'));
  });

  const testEmail = `test_walker_${Date.now()}@ecowalk.local`;
  const registerAttempt = await post('/api/auth/register', {
    name: 'Privilege Escalation Tester',
    email: testEmail,
    password: 'password123',
    role: 'admin' // Attempting to sneak admin role
  });
  test('Public registration forces role to walker and rejects unauthorized admin elevation', () => {
    assert.strictEqual(registerAttempt.status, 201);
    assert.strictEqual(registerAttempt.data.user.role, 'walker', 'Role must default to walker');
  });

  // 4. Admin Endpoint Authorization & Access Control
  const normalUserAdminAccess = await get('/api/admin/stats', {
    Authorization: `Bearer ${walkerToken}`
  });
  test('Normal user accessing admin stats is rejected with 403 Forbidden', () => {
    assert.strictEqual(normalUserAdminAccess.status, 403);
  });

  const unauthenticatedAdminAccess = await get('/api/admin/stats');
  test('Unauthenticated request to admin stats is rejected with 401 Unauthorized', () => {
    assert.strictEqual(unauthenticatedAdminAccess.status, 401);
  });

  const adminAccess = await get('/api/admin/stats', {
    Authorization: `Bearer ${adminToken}`
  });
  test('Authenticated admin accessing admin stats succeeds with 200 OK', () => {
    assert.strictEqual(adminAccess.status, 200);
    assert.ok(adminAccess.data.stats.totalRoutes >= 10);
    assert.ok(adminAccess.data.stats.totalUsers >= 2);
  });

  // 5. Locations and Predefined Routes
  const locationsRes = await get('/api/routes/locations');
  test('All 12 Bengaluru landmarks are present', () => {
    assert.strictEqual(locationsRes.status, 200);
    assert.strictEqual(locationsRes.data.count, 12);
  });

  // 6. MAUT Route Recommendation Engine
  const recRes = await post('/api/routes/recommend', {
    startNodeId: 'L1', // Lalbagh Botanical Gardens
    endNodeId: 'L4',   // IISc Campus
    preferences: {
      prioritizeGreenery: true,
      avoidPollution: true
    }
  });
  test('Route recommendation computes valid scores between 0 and 100', () => {
    assert.strictEqual(recRes.status, 200);
    assert.ok(recRes.data.recommendedRoute, 'Recommended route exists');
    const score = recRes.data.recommendedRoute.healthScore;
    assert.ok(score >= 0 && score <= 100, `Health score ${score} must be between 0 and 100`);
    assert.ok(recRes.data.recommendedRoute.estimatedMinutes > 0, 'Estimated minutes must be positive');
    assert.ok(recRes.data.recommendedRoute.caloriesBurned > 0, 'Calories burned must be positive');
    assert.ok(recRes.data.recommendedRoute.co2SavedGrams > 0, 'CO2 saved must be positive');
    assert.ok(recRes.data.recommendedRoute.recommendationReasons.length > 0, 'Recommendation reasons must be generated');
  });

  // 7. Dynamic Hazard Penalty Verification
  const targetRouteId = recRes.data.recommendedRoute.id;
  const initialRoadScore = recRes.data.recommendedRoute.effectiveRoadCondition;

  // Submit a critical pothole hazard on this route
  const hazardRes = await post('/api/reports', {
    routeId: targetRouteId,
    routeName: recRes.data.recommendedRoute.name,
    locationName: 'Test Intersection',
    issueType: 'pothole',
    severity: 'critical',
    description: 'Deep road hazard for automated test verification.',
    reportedBy: 'QA Tester',
    userEmail: 'qa@ecowalk.local'
  });
  test('Hazard report creation succeeds with 201 Created', () => {
    assert.strictEqual(hazardRes.status, 201);
    assert.ok(hazardRes.data.report.id, 'Report ID generated');
  });
  const createdReportId = hazardRes.data.report.id;

  // Re-evaluate routes - hazard must apply penalty!
  const recWithHazard = await post('/api/routes/recommend', {
    startNodeId: 'L1',
    endNodeId: 'L4',
    preferences: { prioritizeGreenery: true }
  });
  const penalizedRoute = [recWithHazard.data.recommendedRoute, ...recWithHazard.data.alternativeRoutes]
    .find(r => r.id === targetRouteId);

  test('New critical hazard dynamically applies 25 pt penalty to route road condition', () => {
    assert.ok(penalizedRoute, 'Penalized route found');
    assert.strictEqual(penalizedRoute.hazardData.penalty, 25, 'Penalty must be 25 for critical hazard');
    assert.ok(penalizedRoute.effectiveRoadCondition < initialRoadScore, 'Effective road condition must be penalized');
  });

  // Admin verifies and then resolves the hazard
  const verifyRes = await patch(`/api/reports/${createdReportId}/status`, {
    status: 'verified',
    adminNotes: 'Field inspection completed by municipal team.'
  }, {
    Authorization: `Bearer ${adminToken}`
  });
  test('Admin can mark report verified', () => {
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.report.status, 'verified');
  });

  const resolveRes = await patch(`/api/reports/${createdReportId}/status`, {
    status: 'resolved',
    adminNotes: 'Repaired and asphalt patched.'
  }, {
    Authorization: `Bearer ${adminToken}`
  });
  test('Admin can resolve report, which clears the route penalty', () => {
    assert.strictEqual(resolveRes.status, 200);
    assert.strictEqual(resolveRes.data.report.status, 'resolved');
  });

  // Re-check recommendation: penalty should now be 0 for this report
  const recAfterResolve = await post('/api/routes/recommend', {
    startNodeId: 'L1',
    endNodeId: 'L4'
  });
  const resolvedRoute = [recAfterResolve.data.recommendedRoute, ...recAfterResolve.data.alternativeRoutes]
    .find(r => r.id === targetRouteId);
  test('Resolved report removes active penalty from route recommendation', () => {
    const activeForCreated = resolvedRoute.hazardData.reportDetails.some(r => r.id === createdReportId);
    assert.strictEqual(activeForCreated, false, 'Resolved report must not be in active hazard list');
  });

  // 8. Hazard Photo Validation
  const invalidImageRes = await post('/api/reports', {
    routeId: 'R-GENERAL',
    locationName: 'Test Location',
    issueType: 'pothole',
    description: 'Bad image format test',
    imageUrl: 'not-an-image-data-url-or-http'
  });
  test('Reject invalid image attachment format with 400 Bad Request', () => {
    assert.strictEqual(invalidImageRes.status, 400);
  });

  // 9. Feedback Submission and Admin Moderation
  const fbRes = await post('/api/feedback', {
    routeId: targetRouteId,
    routeName: 'Arboretum Walk',
    rating: 5,
    greeneryRating: 5,
    safetyRating: 5,
    roadQualityRating: 5,
    comfortRating: 5,
    comment: 'Spectacular walking experience! Shaded and clean air.'
  }, {
    Authorization: `Bearer ${walkerToken}`
  });
  test('Feedback creation succeeds with 201 Created and default published status', () => {
    assert.strictEqual(fbRes.status, 201);
    assert.strictEqual(fbRes.data.feedback.status, 'published');
  });
  const createdFbId = fbRes.data.feedback.id;

  const fbModRes = await patch(`/api/feedback/${createdFbId}/status`, {
    status: 'reviewed',
    adminNotes: 'Audited by administrator.'
  }, {
    Authorization: `Bearer ${adminToken}`
  });
  test('Admin can moderate feedback status to reviewed', () => {
    assert.strictEqual(fbModRes.status, 200);
    assert.strictEqual(fbModRes.data.feedback.status, 'reviewed');
  });

  const walkerFbModAttempt = await patch(`/api/feedback/${createdFbId}/status`, {
    status: 'hidden'
  }, {
    Authorization: `Bearer ${walkerToken}`
  });
  test('Normal user cannot moderate feedback status (rejected with 403 Forbidden)', () => {
    assert.strictEqual(walkerFbModAttempt.status, 403);
  });

  // 10. User Preferences & Walk Counting Bug Fix
  const profileBefore = await get('/api/auth/profile', {
    Authorization: `Bearer ${walkerToken}`
  });
  const initialWalkCount = profileBefore.data.user.stats.totalWalks;

  const prefUpdateRes = await patch('/api/auth/preferences', {
    walkingSpeed: 'brisk',
    preferences: { prioritizeGreenery: true }
  }, {
    Authorization: `Bearer ${walkerToken}`
  });
  test('Updating preferences succeeds', () => {
    assert.strictEqual(prefUpdateRes.status, 200);
    assert.strictEqual(prefUpdateRes.data.user.walkingSpeed, 'brisk');
  });

  const profileAfter = await get('/api/auth/profile', {
    Authorization: `Bearer ${walkerToken}`
  });
  test('Updating preferences does NOT spuriously increment totalWalks', () => {
    assert.strictEqual(profileAfter.data.user.stats.totalWalks, initialWalkCount, 'Walks count must remain constant');
  });

  // 11. Admin User Directory Audit
  const adminUsersRes = await get('/api/admin/users', {
    Authorization: `Bearer ${adminToken}`
  });
  test('Admin can view registered user directory and sensitive hashes are excluded', () => {
    assert.strictEqual(adminUsersRes.status, 200);
    assert.ok(Array.isArray(adminUsersRes.data.users));
    assert.ok(adminUsersRes.data.users.length >= 2);
    adminUsersRes.data.users.forEach(u => {
      assert.strictEqual(u.passwordHash, undefined, 'Password hash must never leak in admin user list');
      assert.ok(u.id && u.email && u.role);
    });
  });

  // 12. Multiple Bengaluru Landmark Route Pairs
  const routePair1 = await post('/api/routes/recommend', {
    startNodeId: 'L2', // Cubbon Park
    endNodeId: 'L7',   // Indiranagar 100ft Road
    walkingSpeed: 'moderate'
  });
  test('Route evaluation between L2 (Cubbon Park) and L7 (Indiranagar) produces plausible pedestrian routes', () => {
    assert.strictEqual(routePair1.status, 200);
    assert.ok(routePair1.data.recommendedRoute);
    assert.ok(routePair1.data.recommendedRoute.distanceKm > 0 && routePair1.data.recommendedRoute.distanceKm < 15);
    assert.ok(routePair1.data.recommendedRoute.estimatedMinutes > 0);
    assert.ok(routePair1.data.recommendedRoute.waypoints.length >= 2);
  });

  const routePair2 = await post('/api/routes/recommend', {
    startNodeId: 'L3', // MG Road Metro
    endNodeId: 'L9',   // Koramangala 4th Block
    walkingSpeed: 'moderate'
  });
  test('Route evaluation between L3 (MG Road) and L9 (Koramangala) calculates alternatives', () => {
    assert.strictEqual(routePair2.status, 200);
    assert.ok(routePair2.data.recommendedRoute);
    assert.ok(routePair2.data.alternativeRoutes.length >= 1);
  });

  // 13. Preference Weight Effects on Recommendations
  const recBalanced = await post('/api/routes/recommend', {
    startNodeId: 'L1',
    endNodeId: 'L4',
    preferences: { prioritizeGreenery: false, prioritizeSafety: false }
  });
  const recGreenery = await post('/api/routes/recommend', {
    startNodeId: 'L1',
    endNodeId: 'L4',
    preferences: { prioritizeGreenery: true }
  });
  test('Toggling prioritizeGreenery increases greenery weight in recommendation engine', () => {
    assert.strictEqual(recBalanced.status, 200);
    assert.strictEqual(recGreenery.status, 200);
    const weightBalanced = recBalanced.data.recommendedRoute.weightsUsed.wG;
    const weightGreenery = recGreenery.data.recommendedRoute.weightsUsed.wG;
    assert.ok(weightGreenery > weightBalanced, 'Greenery weight must increase when prioritizeGreenery is true');
  });

  // 14. Map Landmark Coordinates & Plausibility
  test('All 12 Bengaluru landmarks have valid coordinates within the vector canvas', () => {
    const locs = locationsRes.data.locations;
    assert.strictEqual(locs.length, 12);
    locs.forEach(loc => {
      assert.ok(loc.x >= 0 && loc.x <= 1000, `Landmark ${loc.id} x (${loc.x}) within [0, 1000]`);
      assert.ok(loc.y >= 0 && loc.y <= 700, `Landmark ${loc.id} y (${loc.y}) within [0, 700]`);
      assert.ok(loc.name && loc.shortName, `Landmark ${loc.id} has valid labels`);
    });
  });

  // 15. Storage Persistence Verification
  test('JSON storage correctly persists users, reports, routes, locations, and feedback', () => {
    const diskUsers = storage.getUsers();
    const diskReports = storage.getReports();
    const diskFeedback = storage.getFeedback();
    const diskLocations = storage.getLocations();
    const diskRoutes = storage.getRoutes();

    assert.ok(diskUsers.length >= 2, 'Users persisted in storage');
    assert.ok(diskReports.length >= 1, 'Hazard reports persisted in storage');
    assert.ok(diskFeedback.length >= 1, 'Feedback persisted in storage');
    assert.strictEqual(diskLocations.length, 12, 'All 12 locations persisted in storage');
    assert.ok(diskRoutes.length >= 10, 'Routes persisted in storage');

    // Confirm created report is saved in disk storage
    const foundReport = diskReports.find(r => r.id === createdReportId);
    assert.ok(foundReport, 'Report created during test is persisted to storage');
    assert.strictEqual(foundReport.status, 'resolved', 'Updated status is persisted to storage');
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Start server on test port and execute
server = app.listen(TEST_PORT, async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      console.log('Test server shut down cleanly.');
    });
  }
});
