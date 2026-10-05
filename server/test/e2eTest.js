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

  // 3. Prevent Privilege Escalation on Registration
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
