const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function req(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function verifyAll() {
  console.log('===============================================================');
  console.log('🌿 EcoWalk Complete Checklist Verification & Validation Suite');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function check(label, condition, detail = '') {
    if (condition) {
      console.log(`  [PASS] ✓ ${label}`);
      passed++;
    } else {
      console.error(`  [FAIL] ✗ ${label} - ${detail}`);
      failed++;
    }
  }

  // 1. Health check
  console.log('--- 1. Backend Service & Storage Health ---');
  const health = await req('/api/health');
  check('Backend API is online', health.status === 200 && health.data.status === 'online');
  check('Storage mode is Local JSON File Database', health.data.storageMode.includes('Local JSON'));

  // 2. User Registration & Password Validation
  console.log('\n--- 2. Registration & Password Validation ---');
  const shortPass = await req('/api/auth/register', 'POST', {
    name: 'Short Tester',
    email: `test_short_${Date.now()}@ecowalk.local`,
    password: '123'
  });
  check('Reject password under 6 characters (400)', shortPass.status === 400 && shortPass.data.error.includes('6 characters'));

  const badEmail = await req('/api/auth/register', 'POST', {
    name: 'Bad Email',
    email: 'not-an-email',
    password: 'securePassword123'
  });
  check('Reject invalid email format (400)', badEmail.status === 400 && badEmail.data.error.includes('valid email'));

  const testUserEmail = `walker_${Date.now()}@ecowalk.local`;
  const registerSuccess = await req('/api/auth/register', 'POST', {
    name: 'Kavya Raman',
    email: testUserEmail,
    password: 'kavyaPassword123',
    role: 'admin', // Attempting privilege escalation
    walkingSpeed: 'moderate'
  });
  check('Register new user succeeds (201)', registerSuccess.status === 201 && registerSuccess.data.token);
  check('Privilege escalation rejected: role is walker', registerSuccess.data.user.role === 'walker');
  check('Password hash excluded from returned profile', registerSuccess.data.user.passwordHash === undefined);
  const newWalkerToken = registerSuccess.data.token;

  // 3. User Login & Access Control
  console.log('\n--- 3. User Login & Access Control ---');
  const loginRes = await req('/api/auth/login', 'POST', {
    email: testUserEmail,
    password: 'kavyaPassword123'
  });
  check('Login with registered credentials succeeds (200)', loginRes.status === 200 && loginRes.data.token);

  const adminLoginRes = await req('/api/auth/login', 'POST', {
    email: 'admin@ecowalk.local',
    password: 'admin123'
  });
  check('Admin demo login succeeds (200)', adminLoginRes.status === 200 && adminLoginRes.data.user.role === 'admin');
  const adminToken = adminLoginRes.data.token;

  // Normal user cannot access admin APIs
  const forbiddenStats = await req('/api/admin/stats', 'GET', null, newWalkerToken);
  check('Normal user accessing admin stats is 403 Forbidden', forbiddenStats.status === 403);

  const forbiddenUsers = await req('/api/admin/users', 'GET', null, newWalkerToken);
  check('Normal user accessing admin user directory is 403 Forbidden', forbiddenUsers.status === 403);

  const unauthAccess = await req('/api/admin/stats', 'GET');
  check('Unauthenticated request to admin stats is 401 Unauthorized', unauthAccess.status === 401);

  // 4. Complete User Workflow
  console.log('\n--- 4. Complete User Workflow ---');
  // Profile
  const profile = await req('/api/auth/profile', 'GET', null, newWalkerToken);
  check('Fetch user profile', profile.status === 200 && profile.data.user.name === 'Kavya Raman');

  // Find Routes
  const locations = await req('/api/routes/locations');
  check('Fetch Bengaluru landmarks (12 locations)', locations.status === 200 && locations.data.count === 12);

  // Get Recommendation
  const recRes = await req('/api/routes/recommend', 'POST', {
    startNodeId: 'L1', // Lalbagh
    endNodeId: 'L4',   // IISc
    preferences: { prioritizeGreenery: true, avoidPollution: true }
  }, newWalkerToken);
  check('Route recommendation computed', recRes.status === 200 && recRes.data.recommendedRoute);
  
  const recRoute = recRes.data.recommendedRoute;
  const initialRoadCondition = recRoute.effectiveRoadCondition;
  check('Health score between 0 and 100', recRoute.healthScore >= 0 && recRoute.healthScore <= 100);
  check('Estimated time is calculated', recRoute.estimatedMinutes > 0);
  check('Distance is calculated', recRoute.distanceKm > 0);
  check('Calories burned is calculated', recRoute.caloriesBurned > 0);
  check('CO2 saved is calculated', recRoute.co2SavedGrams > 0);
  check('Alternative routes provided for comparison', recRes.data.alternativeRoutes.length >= 1);

  // Report Hazard
  const hazardRes = await req('/api/reports', 'POST', {
    routeId: recRoute.id,
    routeName: recRoute.name,
    locationName: 'Sankey Tank Crossroad',
    issueType: 'pothole',
    severity: 'critical',
    description: 'Deep rainwater puddle and broken asphalt after monsoon shower.',
    coordinates: [520, 280]
  }, newWalkerToken);
  check('Submit road hazard report (201)', hazardRes.status === 201 && hazardRes.data.report.id);
  const createdHazardId = hazardRes.data.report.id;

  // Verify Active Hazard Penalty
  const recAfterHazard = await req('/api/routes/recommend', 'POST', {
    startNodeId: 'L1',
    endNodeId: 'L4'
  });
  const penalizedRoute = [recAfterHazard.data.recommendedRoute, ...recAfterHazard.data.alternativeRoutes]
    .find(r => r.id === recRoute.id);
  check('Active hazard applies 25 pt penalty', penalizedRoute.hazardData.penalty === 25);
  check('Effective road condition is reduced', penalizedRoute.effectiveRoadCondition < initialRoadCondition);

  // Submit Feedback
  const feedbackRes = await req('/api/feedback', 'POST', {
    routeId: recRoute.id,
    routeName: recRoute.name,
    rating: 5,
    greeneryRating: 5,
    safetyRating: 4,
    roadQualityRating: 4,
    comfortRating: 5,
    comment: 'Wonderful shade under mahogany trees, highly recommended for morning walks!'
  }, newWalkerToken);
  check('Submit user feedback (201)', feedbackRes.status === 201 && feedbackRes.data.feedback.id);
  const createdFeedbackId = feedbackRes.data.feedback.id;

  // 5. Admin Dashboard Verification
  console.log('\n--- 5. Admin Dashboard & Moderation ---');
  const adminStats = await req('/api/admin/stats', 'GET', null, adminToken);
  check('Admin stats retrieved', adminStats.status === 200 && adminStats.data.stats.totalUsers >= 3);

  const adminUsers = await req('/api/admin/users', 'GET', null, adminToken);
  check('Admin views user accounts', adminUsers.status === 200 && adminUsers.data.users.length >= 3);

  // Verify hazard
  const verifyHazard = await req(`/api/reports/${createdHazardId}/status`, 'PATCH', {
    status: 'verified',
    adminNotes: 'Confirmed by BBMP ward inspector.'
  }, adminToken);
  check('Admin marks hazard as verified', verifyHazard.status === 200 && verifyHazard.data.report.status === 'verified');

  // Resolve hazard
  const resolveHazard = await req(`/api/reports/${createdHazardId}/status`, 'PATCH', {
    status: 'resolved',
    adminNotes: 'Pothole filled and hot-mix asphalt leveled.'
  }, adminToken);
  check('Admin resolves hazard', resolveHazard.status === 200 && resolveHazard.data.report.status === 'resolved');

  // Verify penalty cleared
  const recAfterResolve = await req('/api/routes/recommend', 'POST', {
    startNodeId: 'L1',
    endNodeId: 'L4'
  });
  const routeAfterResolve = [recAfterResolve.data.recommendedRoute, ...recAfterResolve.data.alternativeRoutes]
    .find(r => r.id === recRoute.id);
  const stillHasPenalty = routeAfterResolve.hazardData.reportDetails.some(r => r.id === createdHazardId);
  check('Resolved hazard removes route penalty', stillHasPenalty === false);

  // Moderate Feedback
  const modFeedback = await req(`/api/feedback/${createdFeedbackId}/status`, 'PATCH', {
    status: 'reviewed',
    adminNotes: 'Verified walker review.'
  }, adminToken);
  check('Admin moderates feedback status to reviewed', modFeedback.status === 200 && modFeedback.data.feedback.status === 'reviewed');

  // 6. Route Recommendation Engine Across Bengaluru Landmarks
  console.log('\n--- 6. Bengaluru Landmark Recommendations ---');
  const testPairs = [
    { start: 'L2', end: 'L7', name: 'Cubbon Park to Indiranagar 100ft Road' },
    { start: 'L3', end: 'L9', name: 'MG Road Metro to Koramangala 4th Block' },
    { start: 'L5', end: 'L10', name: 'Ulsoor Lake to Jayanagar 4th Block' },
    { start: 'L6', end: 'L12', name: 'Vidhana Soudha to National Military Memorial' }
  ];

  for (const pair of testPairs) {
    const pairRec = await req('/api/routes/recommend', 'POST', {
      startNodeId: pair.start,
      endNodeId: pair.end
    });
    check(`Route for ${pair.name} computed successfully`, pairRec.status === 200 && pairRec.data.recommendedRoute.healthScore > 0);
  }

  // Preference weight verification
  const recWithGreenery = await req('/api/routes/recommend', 'POST', {
    startNodeId: 'L1',
    endNodeId: 'L4',
    preferences: { prioritizeGreenery: true }
  });
  const recWithoutGreenery = await req('/api/routes/recommend', 'POST', {
    startNodeId: 'L1',
    endNodeId: 'L4',
    preferences: { prioritizeGreenery: false }
  });
  check('User preference shifts algorithm weights', 
    recWithGreenery.data.recommendedRoute.weightsUsed.wG > recWithoutGreenery.data.recommendedRoute.weightsUsed.wG
  );

  // 7. Map Data Integrity
  console.log('\n--- 7. Map Data Integrity ---');
  const allLocs = locations.data.locations;
  const validCoordinates = allLocs.every(l => l.x >= 0 && l.x <= 1000 && l.y >= 0 && l.y <= 700);
  check('All 12 landmark pins have coordinates inside vector canvas (0..1000, 0..700)', validCoordinates);
  
  const allRoutes = await req('/api/routes');
  const validWaypoints = allRoutes.data.routes.every(r => Array.isArray(r.waypoints) && r.waypoints.length >= 2);
  check('All routes have valid multi-point waypoints', validWaypoints);

  // 8. Storage Data Persistence
  console.log('\n--- 8. Data Persistence in JSON Storage ---');
  const dataDir = path.join(__dirname, '..', 'data');
  const usersFile = path.join(dataDir, 'users.json');
  const reportsFile = path.join(dataDir, 'reports.json');
  const feedbackFile = path.join(dataDir, 'feedback.json');

  const diskUsers = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  const diskReports = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
  const diskFeedback = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));

  check('Registered user Kavya Raman persists in users.json', diskUsers.some(u => u.email === testUserEmail));
  check('Reported hazard persists in reports.json with resolved status', diskReports.some(r => r.id === createdHazardId && r.status === 'resolved'));
  check('Submitted feedback persists in feedback.json with reviewed status', diskFeedback.some(f => f.id === createdFeedbackId && f.status === 'reviewed'));

  console.log('\n===============================================================');
  console.log(`🎯 Summary: ${passed} Checked Items Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
