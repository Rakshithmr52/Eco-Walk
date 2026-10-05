const storage = require('../models/storage');
const config = require('../config/config');

/**
 * Multi-Criteria Rule-Based Healthy Route Recommendation Engine (Phase 1 Core)
 * Evaluates candidate routes connecting start and destination landmarks using:
 * 1. Greenery Canopy Score (G)
 * 2. Pedestrian Safety Score (S)
 * 3. Traffic & Vehicular Emission Risk (P) -> inverted as Clean Air Index (100 - P)
 * 4. Road Condition & Surface Quality Score (R) -> dynamically penalized by active community reports
 * 5. Distance Penalty (D)
 */

// Walking speeds by pace category
const PACE_SPEEDS = {
  leisurely: 3.8, // km/h
  moderate: 4.8,  // km/h
  brisk: 5.6      // km/h
};

/**
 * Calculates dynamic penalty based on active hazard reports along a route
 */
function calculateHazardPenalty(routeId) {
  const activeReports = storage.getActiveReportsForRoute(routeId);
  if (!activeReports || activeReports.length === 0) return { penalty: 0, reportCount: 0, reportDetails: [] };

  let penalty = 0;
  activeReports.forEach(report => {
    switch (report.severity) {
      case 'critical':
        penalty += 25;
        break;
      case 'high':
        penalty += 15;
        break;
      case 'moderate':
        penalty += 8;
        break;
      case 'low':
        penalty += 4;
        break;
      default:
        penalty += 5;
    }
  });

  return {
    penalty: Math.min(penalty, 60), // capped at 60 max penalty
    reportCount: activeReports.length,
    reportDetails: activeReports
  };
}

/**
 * Derives normalized weights based on user preferences or default health priorities
 */
function deriveWeights(preferences = {}) {
  // Baseline balanced health weights
  let weights = {
    greenery: 0.35,
    safety: 0.25,
    airQuality: 0.25,
    roadCondition: 0.15
  };

  if (preferences.importanceWeights && typeof preferences.importanceWeights === 'object') {
    const iw = preferences.importanceWeights;
    if (typeof iw.greenery === 'number' && !isNaN(iw.greenery) && iw.greenery >= 0) weights.greenery = iw.greenery;
    if (typeof iw.safety === 'number' && !isNaN(iw.safety) && iw.safety >= 0) weights.safety = iw.safety;
    if (typeof iw.airQuality === 'number' && !isNaN(iw.airQuality) && iw.airQuality >= 0) weights.airQuality = iw.airQuality;
    if (typeof iw.roadCondition === 'number' && !isNaN(iw.roadCondition) && iw.roadCondition >= 0) weights.roadCondition = iw.roadCondition;
  }

  // Adjust dynamically if specific toggles are set
  if (preferences.prioritizeGreenery) {
    weights.greenery += 0.10;
    weights.roadCondition = Math.max(0.05, weights.roadCondition - 0.05);
  }
  if (preferences.prioritizeSafety) {
    weights.safety += 0.10;
  }
  if (preferences.avoidPollution) {
    weights.airQuality += 0.10;
  }
  if (preferences.avoidPotholes) {
    weights.roadCondition += 0.10;
  }

  // Normalize so sum of weights equals 1.0 safely
  const sum = weights.greenery + weights.safety + weights.airQuality + weights.roadCondition;
  const safeSum = (sum > 0 && !isNaN(sum)) ? sum : 1.0;
  return {
    wG: weights.greenery / safeSum,
    wS: weights.safety / safeSum,
    wA: weights.airQuality / safeSum,
    wR: weights.roadCondition / safeSum
  };
}

/**
 * Generates natural language recommendation reasons explaining the rule-based logic
 */
function generateRecommendationReasons(route, isBestMatch, rankDelta = null) {
  const reasons = [];

  // Greenery justification
  if (route.greeneryScore >= 85) {
    reasons.push(`Superior greenery density (${route.greeneryScore}%) with shaded tree canopies providing UV and heat protection.`);
  } else if (route.greeneryScore >= 60) {
    reasons.push(`Moderate natural landscape and foliage borders (${route.greeneryScore}% greenery index).`);
  } else {
    reasons.push(`Low vegetation coverage (${route.greeneryScore}%), exposed to direct urban sun.`);
  }

  // Air quality & pollution justification
  const cleanAirScore = 100 - route.trafficPollutionRisk;
  if (cleanAirScore >= 80) {
    reasons.push(`Low vehicular exposure (Clean Air Index: ${cleanAirScore}/100) minimizes toxic fine particulate (PM2.5) inhalation.`);
  } else if (cleanAirScore >= 50) {
    reasons.push(`Moderate vehicular presence along parallel transit lane.`);
  } else {
    reasons.push(`High traffic emission corridor (Risk: ${route.trafficPollutionRisk}/100); elevated exhaust fumes.`);
  }

  // Safety & Infrastructure
  if (route.safetyScore >= 88) {
    reasons.push(`High pedestrian safety score (${route.safetyScore}/100) with continuous sidewalks and protected crosswalks.`);
  } else {
    reasons.push(`Reduced pedestrian buffer (${route.safetyScore}/100 safety score) near vehicular traffic.`);
  }

  // Road condition & active hazard alerts
  if (route.hazardData.reportCount === 0) {
    reasons.push(`Zero active road hazards or potholes reported by the community on this pathway.`);
  } else {
    reasons.push(`Caution: ${route.hazardData.reportCount} active hazard/pothole report(s) flagged on this segment (-${route.hazardData.penalty} score deduction).`);
  }

  return reasons;
}

/**
 * Main Recommendation Function
 */
function evaluateAndRecommendRoutes(startNodeId, endNodeId, userPreferences = {}, walkingSpeed = 'moderate') {
  // Fetch candidate routes between the two landmarks
  let candidates = storage.getRoutesBetweenNodes(startNodeId, endNodeId);

  // If no direct predefined route exists between these exact 2 nodes,
  // we intelligently assemble virtual multi-segment candidate paths from the graph of landmarks
  if (!candidates || candidates.length === 0) {
    candidates = generateGraphCandidates(startNodeId, endNodeId);
  }

  if (!candidates || candidates.length === 0) {
    return {
      success: false,
      message: 'No walking paths found connecting the selected landmarks.',
      routes: []
    };
  }

  const speedKmph = PACE_SPEEDS[walkingSpeed] || config.AVERAGE_WALKING_SPEED_KMPH;
  const weights = deriveWeights(userPreferences);

  // Evaluate each candidate route
  const evaluatedRoutes = candidates.map(route => {
    // 1. Hazard penalties
    const hazardData = calculateHazardPenalty(route.id);
    const effectiveRoadCondition = Math.max(10, route.roadConditionScore - hazardData.penalty);

    // 2. Clean air index
    const cleanAirScore = Math.max(0, 100 - route.trafficPollutionRisk);

    // 3. Multi-Attribute Utility Health Score (0 - 100 scale)
    const rawHealthScore = (
      (weights.wG * route.greeneryScore) +
      (weights.wS * route.safetyScore) +
      (weights.wA * cleanAirScore) +
      (weights.wR * effectiveRoadCondition)
    );

    // Distance penalty factor: mild penalty if route is significantly longer than 2.0 km
    const distancePenalty = route.distanceKm > 2.0 ? (route.distanceKm - 2.0) * 4 : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(rawHealthScore - distancePenalty)));

    // Walking metrics
    const estimatedMinutes = Math.round((route.distanceKm / speedKmph) * 60);
    const caloriesBurned = Math.round(route.distanceKm * config.CALORIES_PER_KM);
    const co2SavedGrams = Math.round(route.distanceKm * config.CO2_SAVED_PER_KM_GRAMS);

    // Air Quality rating tag
    let airQualityTag = 'Good';
    if (route.trafficPollutionRisk > 65) airQualityTag = 'Moderate Exhaust';
    if (route.trafficPollutionRisk > 80) airQualityTag = 'Heavy Pollution';

    return {
      ...route,
      effectiveRoadCondition,
      hazardData,
      healthScore,
      estimatedMinutes,
      caloriesBurned,
      co2SavedGrams,
      airQualityTag,
      weightsUsed: weights
    };
  });

  // Sort candidate routes: primary key is healthScore descending
  evaluatedRoutes.sort((a, b) => b.healthScore - a.healthScore);

  // Mark recommended vs alternatives and generate reasons
  const bestRoute = evaluatedRoutes[0];
  bestRoute.isRecommended = true;
  bestRoute.recommendationBadge = 'Best Health Match';
  bestRoute.recommendationReasons = generateRecommendationReasons(bestRoute, true);

  const alternativeRoutes = evaluatedRoutes.slice(1).map(alt => {
    alt.isRecommended = false;
    alt.recommendationBadge = alt.distanceKm < bestRoute.distanceKm ? 'Shorter Distance' : 'Alternative Path';
    alt.recommendationReasons = generateRecommendationReasons(alt, false);
    return alt;
  });

  return {
    success: true,
    startNode: storage.getLocationById(startNodeId),
    endNode: storage.getLocationById(endNodeId),
    userPreferences,
    recommendedRoute: bestRoute,
    alternativeRoutes,
    totalRoutesEvaluated: evaluatedRoutes.length
  };
}

/**
 * Fallback graph path synthesizer for pairs without direct single-edge route
 */
function generateGraphCandidates(startId, endId) {
  const startLoc = storage.getLocationById(startId);
  const endLoc = storage.getLocationById(endId);
  if (!startLoc || !endLoc) return [];

  // Approximate Euclidean distance on 1000x700 plane: 100 pixels ~ 0.4 km
  const dx = endLoc.x - startLoc.x;
  const dy = endLoc.y - startLoc.y;
  const pixelDist = Math.sqrt(dx * dx + dy * dy);
  const baseKm = Number(((pixelDist / 100) * 0.45).toFixed(1));

  // Candidate 1: Shaded Park & Garden Route
  const route1 = {
    id: `R-SYN-${startId}-${endId}-1`,
    name: `${startLoc.shortName} to ${endLoc.shortName} Green Trail`,
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: startId,
    startNodeName: startLoc.name,
    endNodeId: endId,
    endNodeName: endLoc.name,
    distanceKm: Number((baseKm * 1.15).toFixed(1)),
    greeneryScore: 89,
    safetyScore: 92,
    trafficPollutionRisk: 18,
    roadConditionScore: 93,
    terrainType: 'Pedestrian Pavers & Tree-Lined Avenues',
    elevationGainMeters: 4,
    waypoints: [
      [startLoc.x, startLoc.y],
      [Math.round(startLoc.x + dx * 0.4 - dy * 0.15), Math.round(startLoc.y + dy * 0.4 + dx * 0.15)],
      [Math.round(startLoc.x + dx * 0.7 - dy * 0.1), Math.round(startLoc.y + dy * 0.7 + dx * 0.1)],
      [endLoc.x, endLoc.y]
    ],
    description: `Scenic healthy corridor routed via green verges connecting ${startLoc.name} to ${endLoc.name}.`,
    highlights: ['High shade canopy', 'Away from heavy transport', 'Smooth walking surface'],
    warnings: []
  };

  // Candidate 2: Direct Urban Street Route
  const route2 = {
    id: `R-SYN-${startId}-${endId}-2`,
    name: `${startLoc.shortName} to ${endLoc.shortName} Direct Avenue`,
    tag: 'Quick Urban Shortcut',
    routeType: 'arterial_road',
    startNodeId: startId,
    startNodeName: startLoc.name,
    endNodeId: endId,
    endNodeName: endLoc.name,
    distanceKm: baseKm,
    greeneryScore: 38,
    safetyScore: 70,
    trafficPollutionRisk: 74,
    roadConditionScore: 75,
    terrainType: 'Urban Concrete Sidewalk',
    elevationGainMeters: 2,
    waypoints: [
      [startLoc.x, startLoc.y],
      [Math.round(startLoc.x + dx * 0.5), Math.round(startLoc.y + dy * 0.5)],
      [endLoc.x, endLoc.y]
    ],
    description: `Direct street route through main town avenue. Shorter distance but elevated vehicular noise and emissions.`,
    highlights: ['Shortest direct walking distance'],
    warnings: ['High traffic exhaust fumes', 'Crowded sidewalks']
  };

  return [route1, route2];
}

module.exports = {
  evaluateAndRecommendRoutes,
  calculateHazardPenalty,
  PACE_SPEEDS
};
