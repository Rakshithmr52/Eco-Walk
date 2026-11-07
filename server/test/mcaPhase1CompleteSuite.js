/**
 * Comprehensive MCA Phase 1 Test Suite for EcoWalk
 * Tests:
 * 1. GPS Center & Destination Stability (Task 1)
 * 2. 9-Column Comparison Matrix Data Integrity (Task 2)
 * 3. OpenStreetMap Greenery Proximity Score (150m buffer) (Task 3)
 * 4. Pedestrian Infrastructure Safety Score (OSM footways + unknown tags) (Task 4)
 * 5. Road Surface Quality & Condition Score (OSM surface + community hazards) (Task 5)
 * 6. Official CPCB CAAQMS Clean Air Score (Task 6)
 * 7. MAUT Health Score Engine & Weights (Task 7)
 * 8. Transparency & MCA Guide Demonstration Objects (Task 8)
 */

const assert = require('assert');
const recommendationEngine = require('../services/recommendationEngine');
const osmService = require('../services/osmEnvironmentalService');
const cpcbService = require('../services/cpcbAqiService');
const storage = require('../models/storage');
const routingService = require('../services/routingService');

let passedTests = 0;
let failedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function runSuite() {
  console.log('\n========================================================================');
  console.log('🎓 EcoWalk MCA Phase 1 Comprehensive Verification Suite');
  console.log('========================================================================\n');

  // 1. Task 6: CPCB Clean Air Score Formula
  console.log('--- 1. CPCB Clean Air Score & Formula ---');
  it('convertAqiToCleanAirScore implements exact formula clamp(100 - AQI / 5, 0, 100)', () => {
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(0), 100);
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(50), 90);
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(100), 80);
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(200), 60);
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(300), 40);
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(400), 20);
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(500), 0);
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(600), 0); // clamped
    assert.strictEqual(cpcbService.convertAqiToCleanAirScore(-10), 100); // clamped
  });

  it('cpcbAqiService loads official Bengaluru CAAQMS stations with complete metadata', async () => {
    const stations = await cpcbService.getAllCpcbStations();
    assert(Array.isArray(stations) && stations.length >= 11, 'Expected >= 11 CPCB stations');
    const cityStation = stations.find(s => s.id === 'CPCB-BLR-01');
    assert(cityStation, 'City Railway Station should exist');
    assert(typeof cityStation.lat === 'number' && typeof cityStation.lng === 'number');
    assert(typeof cityStation.aqi === 'number');
    assert(cityStation.lastUpdated, 'Must contain observation timestamp');
    assert(cityStation.portalUrl.includes('airquality.cpcb.gov.in'), 'Must reference official CPCB portal');
  });

  // 2. Task 3: Traceable Greenery Proximity Score
  console.log('\n--- 2. Traceable Greenery Proximity Score (OSM 150m Buffer) ---');
  it('evaluateGreeneryScore discretizes waypoints and computes 150m spatial proximity', () => {
    // Route near Cubbon Park: [12.9763, 77.5929]
    const waypointsNearPark = [
      [12.9760, 77.5925],
      [12.9763, 77.5929],
      [12.9770, 77.5935]
    ];
    const stepsWithPark = [
      { name: 'Cubbon Park Walkway', instruction: 'Walk through tree canopy trail' }
    ];

    const result = osmService.evaluateGreeneryScore(waypointsNearPark, stepsWithPark);
    assert(typeof result.greeneryScore === 'number' && result.greeneryScore >= 70, 'Near-park route should have high greenery score');
    assert(result.details, 'Must return calculation details');
    assert(result.details.metricLabel === 'Greenery Proximity / Coverage Score');
    assert(result.details.dataSource.includes('OpenStreetMap'), 'Data source must disclose OSM');
    assert(typeof result.details.segmentCoveragePct === 'number');
    assert(Array.isArray(result.details.matchedGreenSpaces));
    assert(result.details.dataLimitations, 'Must provide clear data limitations');
  });

  // 3. Task 4: Pedestrian Infrastructure Safety Score
  console.log('\n--- 3. Pedestrian Infrastructure Safety Score (OSM Tags + Hazards) ---');
  it('evaluatePedestrianSafetyScore treats unknown tags as neutral and incorporates safety hazards', () => {
    const waypoints = [
      [12.9716, 77.5946],
      [12.9730, 77.5940]
    ];
    const steps = [
      { name: 'Corporation Footway', instruction: 'Walk along dedicated pedestrian footpath' },
      { name: 'unnamed', instruction: 'Continue' }
    ];
    const hazards = [
      { issueType: 'unsafe_lighting', severity: 'high' }
    ];

    const result = osmService.evaluatePedestrianSafetyScore(waypoints, steps, hazards);
    assert(typeof result.safetyScore === 'number');
    assert(result.details.metricLabel === 'Pedestrian Infrastructure Safety Score');
    assert(result.details.dataSource.includes('OpenStreetMap'));
    assert(result.details.unknownInfrastructurePct >= 0, 'Must report unknown infrastructure %');
    assert(result.details.disclaimer.includes('physical pedestrian infrastructure'), 'Must include disclaimer');
  });

  // 4. Task 5: Road Quality Score
  console.log('\n--- 4. Road Surface Quality & Community Hazard Deduction ---');
  it('evaluateRoadQualityScore deducts active verified hazards and penalizes 0 for resolved hazards', () => {
    const waypoints = [[12.9716, 77.5946], [12.9720, 77.5950]];
    const steps = [{ name: 'MG Road', instruction: 'Walk along paved road' }];
    
    // Active hazard
    const activeHazardData = { penalty: 15, reportCount: 1, reportDetails: [{ id: 'REP-1', severity: 'high' }] };
    const resActive = osmService.evaluateRoadQualityScore(waypoints, steps, activeHazardData);
    
    // Zero hazard (resolved)
    const zeroHazardData = { penalty: 0, reportCount: 0, reportDetails: [] };
    const resClear = osmService.evaluateRoadQualityScore(waypoints, steps, zeroHazardData);

    assert(resActive.roadQualityScore < resClear.roadQualityScore, 'Active hazard must reduce road quality');
    assert(resClear.roadQualityScore >= 85, 'Clear road must maintain baseline paved quality');
    assert.strictEqual(resActive.details.hazardPenaltyApplied, 15);
  });

  // 5. Task 7 & Task 8: MAUT Health Score and Guide Demonstration Transparency
  console.log('\n--- 5. MAUT Engine & Academic Demonstration Objects ---');
  it('evaluateAndRecommendRealRoutes returns all 9 comparison metrics, MAUT breakdown, and Guide Demo section', async () => {
    const res = await recommendationEngine.evaluateAndRecommendRealRoutes({
      startCoords: { lat: 12.9716, lng: 77.5946 },
      destinationCoords: { lat: 12.9763, lng: 77.5929 },
      startLabel: 'Bengaluru City Hall',
      destinationLabel: 'Cubbon Park'
    });

    assert(res.success, 'Recommendation must succeed');
    assert(res.recommendedRoute, 'Must have recommendedRoute');
    const r = res.recommendedRoute;

    // Check the 9 core fields required for the comparison matrix
    assert(typeof r.name === 'string', '1. Route Name must be string');
    assert(typeof r.healthScore === 'number' && r.healthScore >= 0 && r.healthScore <= 100, '2. Health Score /100');
    assert(typeof r.distanceKm === 'number', '3. Distance in km');
    assert(typeof r.estimatedMinutes === 'number', '4. Estimated Walking Time');
    assert(typeof r.greeneryScore === 'number', '5. Greenery Score /100');
    assert(typeof r.safetyScore === 'number', '6. Pedestrian Safety Score /100');
    assert(typeof r.cleanAirScore === 'number', '7. Clean Air Score /100');
    assert(typeof r.roadQualityScore === 'number', '8. Road Quality Score /100');

    // Check MAUT breakdown (Task 7)
    assert(r.mautBreakdown, 'Must include mautBreakdown');
    assert(r.mautBreakdown.weights, 'Must include weights');
    const { greenery, safety, cleanAir, roadQuality } = r.mautBreakdown.weights;
    const weightSum = greenery + safety + cleanAir + roadQuality;
    assert(Math.abs(weightSum - 1.0) < 0.01, `Normalized weights must sum to 1.0 (got ${weightSum})`);
    assert(typeof r.mautBreakdown.rawHealthScore === 'number');
    assert(typeof r.mautBreakdown.finalHealthScore === 'number');

    // Check Guide Demonstration transparency object (Task 8)
    assert(r.howEcoWalkEvaluates, 'Must include howEcoWalkEvaluates');
    assert(r.howEcoWalkEvaluates.formula.includes('HealthScore'), 'Must display calculation formula');
    assert(Array.isArray(r.howEcoWalkEvaluates.criteria) && r.howEcoWalkEvaluates.criteria.length === 4, 'Must detail all 4 criteria (G, S, C, R)');
    assert(r.howEcoWalkEvaluates.academicDisclaimer.includes('multi-criteria'), 'Must include disclaimer');
    
    // Check CPCB Station details preserved in inspection data
    assert(r.cpcbStation, 'Must preserve CPCB station in route');
    assert(r.cleanAirDetails, 'Must preserve cleanAirDetails');
    assert(r.cpcbAqi !== undefined, 'Must preserve raw CPCB AQI');
  });

  console.log('\n========================================================================');
  console.log(`SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});

