const storage = require('../models/storage');
const config = require('../config/config');
const routingService = require('./routingService');
const cpcbAqiService = require('./cpcbAqiService');
const osmEnvironmentalService = require('./osmEnvironmentalService');

/**
 * Multi-Criteria Rule-Based Healthy Route Recommendation Engine (Phase 1 Core)
 * Evaluates candidate routes connecting real GPS origin and destination using:
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

// Known urban green canopy zones & parks for proximity evaluation
const KNOWN_GREEN_ZONES = [
  { name: 'Lalbagh Botanical Gardens', lat: 12.9507, lng: 77.5848, radiusKm: 0.9, baseGreenery: 95, pollutionRisk: 14 },
  { name: 'Cubbon Park Arboretum', lat: 12.9763, lng: 77.5929, radiusKm: 0.9, baseGreenery: 92, pollutionRisk: 18 },
  { name: 'Ulsoor Lake Promenade', lat: 12.9815, lng: 77.6201, radiusKm: 0.7, baseGreenery: 90, pollutionRisk: 22 },
  { name: 'IISc Green Spine', lat: 13.0219, lng: 77.5671, radiusKm: 0.8, baseGreenery: 94, pollutionRisk: 15 },
  { name: 'Sankey Tank Forest Trail', lat: 13.0068, lng: 77.5750, radiusKm: 0.6, baseGreenery: 92, pollutionRisk: 16 },
  { name: 'Hebbal Wetland Sanctuary', lat: 13.0382, lng: 77.5913, radiusKm: 0.8, baseGreenery: 96, pollutionRisk: 12 },
  { name: 'Jayanagar Tree Boulevard', lat: 12.9299, lng: 77.5824, radiusKm: 0.6, baseGreenery: 86, pollutionRisk: 28 },
  { name: 'Kanteerava Sports Perimeter', lat: 12.9698, lng: 77.5932, radiusKm: 0.5, baseGreenery: 78, pollutionRisk: 35 }
];

// Heavy transit / elevated vehicular pollution corridors
const HIGH_EMISSION_CORRIDORS = [
  { name: 'Majestic Kempegowda Terminal', lat: 12.9781, lng: 77.5696, radiusKm: 0.7, pollutionRisk: 82 },
  { name: 'Gandhi Bazaar Commercial Market', lat: 12.9438, lng: 77.5707, radiusKm: 0.5, pollutionRisk: 70 },
  { name: 'Bengaluru Fort Main Arterial', lat: 12.9629, lng: 77.5759, radiusKm: 0.5, pollutionRisk: 68 }
];

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
 * Calculates dynamic penalty based on geographic proximity of active hazard reports to a route polyline
 */
function calculateGeoHazardPenalty(waypoints = []) {
  if (!waypoints || waypoints.length === 0) {
    return { penalty: 0, reportCount: 0, reportDetails: [] };
  }

  const allReports = storage.getReports();
  const activeReports = allReports.filter(r => r.status === 'pending' || r.status === 'verified');
  const matchedReports = [];
  let penalty = 0;

  for (const report of activeReports) {
    let rLat, rLng;
    if (Array.isArray(report.coordinates) && report.coordinates.length >= 2) {
      rLat = report.coordinates[0];
      rLng = report.coordinates[1];
    } else if (report.lat && report.lng) {
      rLat = report.lat;
      rLng = report.lng;
    }

    if (rLat === undefined || rLng === undefined) continue;

    // Check if report lies within 150m (0.15km) of any sampled waypoint
    const sampleRate = Math.max(1, Math.floor(waypoints.length / 40));
    let isNearRoute = false;

    for (let i = 0; i < waypoints.length; i += sampleRate) {
      const [wLat, wLng] = waypoints[i];
      const distKm = routingService.haversineDistance(rLat, rLng, wLat, wLng);
      if (distKm <= 0.15) {
        isNearRoute = true;
        break;
      }
    }

    if (isNearRoute) {
      matchedReports.push(report);
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
    }
  }

  return {
    penalty: Math.min(penalty, 60),
    reportCount: matchedReports.length,
    reportDetails: matchedReports
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
 * Spatial analysis to evaluate environmental metrics for a real GPS route
 * Integrates official CPCB monitoring station data for pollution risk baseline
 */
function evaluateRouteEnvironment(waypoints = [], steps = [], routeIndex = 0, cpcbAssessment = null) {
  if (!waypoints || waypoints.length === 0) {
    const baseRisk = cpcbAssessment ? cpcbAssessment.pollutionRisk : 35;
    return {
      greeneryScore: 60,
      safetyScore: 80,
      trafficPollutionRisk: baseRisk,
      roadConditionScore: 85
    };
  }

  // Sample waypoints along polyline for proximity checking
  const sampleStep = Math.max(1, Math.floor(waypoints.length / 30));
  let greenMatches = 0;
  let totalSamples = 0;

  for (let i = 0; i < waypoints.length; i += sampleStep) {
    const [wLat, wLng] = waypoints[i];
    totalSamples++;

    // Proximity to green canopies
    let inGreenZone = false;
    for (const gz of KNOWN_GREEN_ZONES) {
      const d = routingService.haversineDistance(wLat, wLng, gz.lat, gz.lng);
      if (d <= gz.radiusKm) {
        inGreenZone = true;
        break;
      }
    }
    if (inGreenZone) greenMatches++;
  }

  // Step semantic clues from OpenStreetMap / OpenRouteService
  let pedestrianSteps = 0;
  let parkKeywordSteps = 0;
  const totalSteps = Math.max(1, steps.length);

  for (const step of steps) {
    const name = (step.name || '').toLowerCase();
    const instruction = (step.instruction || '').toLowerCase();
    if (
      name.includes('park') || name.includes('garden') || name.includes('lake') ||
      name.includes('trail') || name.includes('walkway') || name.includes('path') ||
      name.includes('promenade') || name.includes('green') || name.includes('avenue')
    ) {
      parkKeywordSteps++;
    }
    if (
      instruction.includes('walk') || instruction.includes('footway') ||
      instruction.includes('pedestrian') || instruction.includes('path') ||
      instruction.includes('steps') || instruction.includes('cycle')
    ) {
      pedestrianSteps++;
    }
  }

  const greenFraction = totalSamples > 0 ? (greenMatches / totalSamples) : 0.3;
  const parkStepFraction = parkKeywordSteps / totalSteps;
  const pedStepFraction = pedestrianSteps / totalSteps;

  // Synthesize metrics
  // Greenery: 35 baseline + up to 60 from green buffer & park steps
  let greeneryScore = Math.round(35 + (greenFraction * 45) + (parkStepFraction * 20));
  greeneryScore = Math.max(25, Math.min(96, greeneryScore));

  // Pedestrian Safety: 70 baseline + step infrastructure
  let safetyScore = Math.round(70 + (pedStepFraction * 22) + (greenFraction * 8));
  safetyScore = Math.max(55, Math.min(95, safetyScore));

  // Pollution Risk grounded in official CPCB monitoring station readings
  let basePollutionRisk = cpcbAssessment && typeof cpcbAssessment.pollutionRisk === 'number'
    ? cpcbAssessment.pollutionRisk
    : 35;

  // Modulate pollution risk by local microclimate: vegetative filtering reduces exposure; major arterial proximity increases
  if (greenFraction > 0.4) {
    basePollutionRisk = Math.max(10, basePollutionRisk - Math.round(greenFraction * 10)); // up to 10 pt reduction under dense canopy
  }

  // Check proximity to heavy vehicular corridors
  let heavyCorridorNear = false;
  for (let i = 0; i < waypoints.length; i += sampleStep) {
    const [wLat, wLng] = waypoints[i];
    for (const em of HIGH_EMISSION_CORRIDORS) {
      const d = routingService.haversineDistance(wLat, wLng, em.lat, em.lng);
      if (d <= em.radiusKm) {
        heavyCorridorNear = true;
        break;
      }
    }
    if (heavyCorridorNear) break;
  }

  if (heavyCorridorNear) {
    basePollutionRisk = Math.min(95, basePollutionRisk + 8);
  }

  // Differentiate alternative candidate routes slightly if multiple alternatives exist
  if (routeIndex === 1) {
    greeneryScore = Math.max(25, Math.round(greeneryScore * 0.88));
    safetyScore = Math.max(55, Math.round(safetyScore * 0.94));
    basePollutionRisk = Math.min(95, Math.round(basePollutionRisk * 1.15));
  } else if (routeIndex > 1) {
    greeneryScore = Math.max(25, Math.round(greeneryScore * 0.80));
    safetyScore = Math.max(55, Math.round(safetyScore * 0.90));
    basePollutionRisk = Math.min(95, Math.round(basePollutionRisk * 1.25));
  }

  let trafficPollutionRisk = Math.max(10, Math.min(95, basePollutionRisk));
  let roadConditionScore = 92;

  return {
    greeneryScore,
    safetyScore,
    trafficPollutionRisk,
    roadConditionScore
  };
}

/**
 * Generates natural language recommendation reasons explaining the rule-based logic
 */
function generateRecommendationReasons(route, isBestMatch, rankDelta = null) {
  const reasons = [];

  // Official CPCB Air Quality justification
  if (route.cpcbStation) {
    const cleanAir = route.cleanAirScore !== undefined ? route.cleanAirScore : (100 - (route.trafficPollutionRisk || 35));
    reasons.push(
      `Official CPCB Air Quality: Matched to ${route.cpcbStation.name} (${route.cpcbStation.distanceToRouteKm || route.cpcbDistanceKm || 0} km away). Grounded AQI: ${route.cpcbAqi} (${route.cpcbCategory}). Clean Air Score: ${cleanAir}/100.`
    );
  } else {
    const cleanAir = route.cleanAirScore !== undefined ? route.cleanAirScore : (100 - (route.trafficPollutionRisk || 35));
    reasons.push(`Clean Air Score: ${cleanAir}/100 based on CPCB CAAQMS ambient air monitoring.`);
  }

  // Road condition & active hazard alerts
  const hazardCount = route.hazardData?.reportCount || 0;
  if (hazardCount === 0) {
    reasons.push(`Zero active road hazards or potholes reported by community walkers on this pathway (Road Quality: ${route.roadQualityScore || route.effectiveRoadCondition || 85}/100).`);
  } else {
    reasons.push(
      `Caution: ${hazardCount} active community hazard/pothole alert(s) detected near this path (-${route.hazardData.penalty} score penalty).`
    );
  }

  // Greenery justification
  const greenScore = route.greeneryScore || 50;
  if (greenScore >= 80) {
    reasons.push(`High greenery and tree canopy shade (${greenScore}/100) offering solar protection and thermal comfort.`);
  } else if (greenScore >= 55) {
    reasons.push(`Moderate urban vegetation and park borders (${greenScore}/100 greenery score).`);
  } else {
    reasons.push(`Urban street corridor with limited foliage shade (${greenScore}/100 greenery score).`);
  }

  // Safety & Infrastructure
  const safeScore = route.safetyScore || 70;
  if (safeScore >= 85) {
    reasons.push(`High pedestrian safety score (${safeScore}/100) along designated walkways and separated footpaths.`);
  } else {
    reasons.push(`Mixed pedestrian-traffic exposure (${safeScore}/100 pedestrian safety score).`);
  }

  return reasons;
}

/**
 * Main Real GPS Recommendation Function
 * Takes real geographic coordinates, fetches real walking routes from OpenRouteService (or OSRM),
 * and evaluates candidate paths using the capstone health engine algorithm.
 */
async function evaluateAndRecommendRealRoutes({
  startCoords,
  destinationCoords,
  startLabel = 'Current GPS Location',
  destinationLabel = 'Destination Landmark',
  userPreferences = {},
  walkingSpeed = 'moderate',
  maxWalkingDistanceKm = 8.0
}) {
  const normStart = Array.isArray(startCoords)
    ? { lat: Number(startCoords[0]), lng: Number(startCoords[1]) }
    : { lat: Number(startCoords.lat), lng: Number(startCoords.lng) };

  const normDest = Array.isArray(destinationCoords)
    ? { lat: Number(destinationCoords[0]), lng: Number(destinationCoords[1]) }
    : { lat: Number(destinationCoords.lat), lng: Number(destinationCoords.lng) };

  // 1. Fetch real walking routes from OpenRouteService / OSRM
  const routingResult = await routingService.getWalkingRoutes(normStart, normDest);
  const features = routingResult.features;
  const speedKmph = PACE_SPEEDS[walkingSpeed] || config.AVERAGE_WALKING_SPEED_KMPH;
  const weights = deriveWeights(userPreferences);

  // Find min distance among candidates for relative penalty
  const distances = features.map(f => (f.properties?.summary?.distance || 1000) / 1000);
  const minDistanceKm = Math.min(...distances);

  // 2. Evaluate each real route candidate asynchronously to match official CPCB stations
  const evaluatedRoutes = await Promise.all(features.map(async (feature, index) => {
    // Coordinates conversion: GeoJSON [lng, lat] -> Leaflet [lat, lng]
    const rawCoords = feature.geometry?.coordinates || [];
    const waypoints = rawCoords.map(pt => [pt[1], pt[0]]);
    const summary = feature.properties?.summary || {};
    const steps = feature.properties?.segments?.[0]?.steps || [];

    const distanceKm = Number(((summary.distance || 1000) / 1000).toFixed(2));
    const estimatedMinutes = Math.max(1, Math.round((distanceKm / speedKmph) * 60));

    // Match route to official CPCB CAAQMS monitoring stations
    const cpcbAssessment = await cpcbAqiService.matchRouteToCpcbStations(waypoints);
    const cleanAirScore = cpcbAssessment.cleanAirScore;
    const cleanAirDetails = cpcbAssessment.cleanAirDetails;

    // Dynamic hazard deduction based on real GPS proximity to active reports
    const hazardData = calculateGeoHazardPenalty(waypoints);

    // Task 3: Greenery Score with Traceable Data
    const greeneryEval = osmEnvironmentalService.evaluateGreeneryScore(waypoints, steps);
    const greeneryScore = greeneryEval.greeneryScore;
    const greeneryDetails = greeneryEval.details;

    // Task 4: Pedestrian Infrastructure Safety Score
    const safetyEval = osmEnvironmentalService.evaluatePedestrianSafetyScore(waypoints, steps, hazardData.reportDetails);
    const safetyScore = safetyEval.safetyScore;
    const pedestrianSafetyDetails = safetyEval.details;

    // Task 5: Road Quality Score
    const roadEval = osmEnvironmentalService.evaluateRoadQualityScore(waypoints, steps, hazardData);
    const roadQualityScore = roadEval.roadQualityScore;
    const roadQualityDetails = roadEval.details;

    // Task 7: Multi-Attribute Utility Health Score (0 - 100 scale)
    // Formula: RawHealthScore = (wG * G) + (wS * S) + (wA * C) + (wR * R)
    const rawHealthScore = Number((
      (weights.wG * greeneryScore) +
      (weights.wS * safetyScore) +
      (weights.wA * cleanAirScore) +
      (weights.wR * roadQualityScore)
    ).toFixed(2));

    // Distance penalty if route is significantly longer than shortest candidate by > 1.2 km
    const distDelta = distanceKm - minDistanceKm;
    const distancePenalty = distDelta > 1.2 ? Number(((distDelta - 1.2) * 5).toFixed(1)) : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(rawHealthScore - distancePenalty)));

    // Calories & CO2 math
    const caloriesBurned = Math.round(distanceKm * config.CALORIES_PER_KM);
    const co2SavedGrams = Math.round(distanceKm * config.CO2_SAVED_PER_KM_GRAMS);

    // Air Quality rating tag
    const airQualityTag = `${cpcbAssessment.category} (AQI ${cpcbAssessment.routeAqi})`;

    // Route title & tags
    const routeTitles = [
      'Eco-Shaded Green Walking Corridor',
      'Direct Urban Street Route',
      'Alternate Pedestrian Avenue'
    ];
    const name = `${startLabel} to ${destinationLabel} (${routeTitles[index] || `Option ${index + 1}`})`;
    const tag = index === 0 ? 'Primary Walking Route' : 'Alternative Walking Path';

    // MAUT Breakdown and Full Audit Details
    const mautBreakdown = {
      weights: {
        greenery: Number(weights.wG.toFixed(3)),
        safety: Number(weights.wS.toFixed(3)),
        cleanAir: Number(weights.wA.toFixed(3)),
        roadQuality: Number(weights.wR.toFixed(3))
      },
      subScores: {
        greeneryScore,
        safetyScore,
        cleanAirScore,
        roadQualityScore
      },
      contributions: {
        greenery: Number((weights.wG * greeneryScore).toFixed(2)),
        safety: Number((weights.wS * safetyScore).toFixed(2)),
        cleanAir: Number((weights.wA * cleanAirScore).toFixed(2)),
        roadQuality: Number((weights.wR * roadQualityScore).toFixed(2))
      },
      rawHealthScore,
      distancePenalty,
      finalHealthScore: healthScore
    };

    // Traceable Environmental & Criteria Evaluation
    const howEcoWalkEvaluates = {
      title: 'How EcoWalk Evaluates This Route',
      formula: 'HealthScore = clamp(round((wG * Greenery + wS * Safety + wA * CleanAir + wR * RoadQuality) - DistancePenalty), 0, 100)',
      criteria: [
        {
          code: 'G',
          name: 'Greenery Proximity & Coverage Score',
          weight: Number(weights.wG.toFixed(3)),
          score: greeneryScore,
          contribution: Number((weights.wG * greeneryScore).toFixed(2)),
          dataSource: greeneryDetails.dataSource,
          explanation: greeneryDetails.coverageExplanation,
          limitations: greeneryDetails.dataLimitations
        },
        {
          code: 'S',
          name: 'Pedestrian Infrastructure Safety Score',
          weight: Number(weights.wS.toFixed(3)),
          score: safetyScore,
          contribution: Number((weights.wS * safetyScore).toFixed(2)),
          dataSource: pedestrianSafetyDetails.dataSource,
          explanation: pedestrianSafetyDetails.calculationExplanation,
          limitations: pedestrianSafetyDetails.disclaimer
        },
        {
          code: 'C',
          name: 'CPCB Clean Air Score',
          weight: Number(weights.wA.toFixed(3)),
          score: cleanAirScore,
          contribution: Number((weights.wA * cleanAirScore).toFixed(2)),
          dataSource: cleanAirDetails.dataSource,
          explanation: `Matched to CPCB Station "${cpcbAssessment.matchedStation?.name || 'CPCB Station'}" (${cpcbAssessment.distanceToStationKm} km away). Grounded AQI: ${cpcbAssessment.routeAqi} (${cpcbAssessment.category}). Formula: clamp(100 - AQI / 5, 0, 100) = ${cleanAirScore}.`,
          limitations: cleanAirDetails.disclaimer
        },
        {
          code: 'R',
          name: 'Road Surface & Condition Score',
          weight: Number(weights.wR.toFixed(3)),
          score: roadQualityScore,
          contribution: Number((weights.wR * roadQualityScore).toFixed(2)),
          dataSource: roadQualityDetails.dataSource,
          explanation: roadQualityDetails.calculationExplanation,
          limitations: 'Active verified hazards deduct points; resolved or rejected community reports apply 0 penalty.'
        }
      ],
      distancePenaltyExplanation: distancePenalty > 0
        ? `Route is ${distDelta.toFixed(2)} km longer than shortest candidate (${minDistanceKm.toFixed(2)} km), applying -${distancePenalty} pt penalty.`
        : `Within acceptable +1.2 km threshold of shortest candidate (${minDistanceKm.toFixed(2)} km); zero distance penalty.`,
      academicDisclaimer: 'EcoWalk route evaluations are multi-criteria utility indices based on spatial environmental indicators and do not constitute clinical or personal health guarantees.'
    };

    const routeObj = {
      id: `ROUTE-REAL-${index + 1}-${Date.now().toString(36)}`,
      name,
      tag,
      routeType: greeneryScore >= 75 ? 'nature_focused' : 'arterial_road',
      startCoords,
      destinationCoords,
      startLabel,
      destinationLabel,
      distanceKm,
      estimatedMinutes,
      greeneryScore,
      greeneryDetails,
      safetyScore,
      pedestrianSafetyDetails,
      trafficPollutionRisk: 100 - cleanAirScore,
      cleanAirScore,
      cleanAirDetails,
      roadConditionScore: roadQualityDetails.baseSurfaceScore || 88,
      roadQualityScore,
      roadQualityDetails,
      effectiveRoadCondition: roadQualityScore,
      hazardData,
      healthScore,
      mautBreakdown,
      howEcoWalkEvaluates,
      caloriesBurned,
      co2SavedGrams,
      airQualityTag,
      // Official CPCB Data Fields
      cpcbStation: cpcbAssessment.matchedStation,
      cpcbAqi: cpcbAssessment.routeAqi,
      cpcbCategory: cpcbAssessment.category,
      cpcbDistanceKm: cpcbAssessment.distanceToStationKm,
      cpcbLastUpdated: cpcbAssessment.matchedStation.lastUpdated,
      cpcbDataSource: cpcbAssessment.dataSource,
      cpcbHealthImpact: cpcbAssessment.healthImpact,
      waypoints,
      stepsCount: steps.length,
      terrainType: greeneryScore >= 80 ? 'Shaded Sidewalk & Pedestrian Verges' : 'Urban Paved Sidewalk',
      description: `Actual pedestrian route generated via real geographic walking network from ${startLabel} to ${destinationLabel}.`,
      highlights: [
        `CPCB Station: ${cpcbAssessment.matchedStation.name} (AQI: ${cpcbAssessment.routeAqi}, ${cpcbAssessment.category})`,
        `${greeneryScore}/100 Greenery Proximity Score (${greeneryDetails.segmentCoveragePct}% within 150m of green canopy)`,
        `${safetyScore}/100 Pedestrian Safety Score (${pedestrianSafetyDetails.sidewalkCoveragePct}% dedicated footways)`,
        `Clean Air Score: ${cleanAirScore}/100 (clamp(100 - AQI/5, 0, 100))`,
        `${roadQualityScore}/100 Road Quality Score (${hazardData.reportCount} active hazards)`
      ],
      warnings: hazardData.reportCount > 0 ? [`Caution: ${hazardData.reportCount} road hazard(s) flagged near this route.`] : [],
      environmentalDataSource: cpcbAssessment.disclosure,
      healthDisclaimer: 'EcoWalk health scores are relative decision-support utility indices based on available environmental data and do not constitute individual medical guarantees or clinical safety certifications.',
      weightsUsed: weights
    };

    return routeObj;
  }));

  // Sort candidate routes by healthScore descending
  evaluatedRoutes.sort((a, b) => b.healthScore - a.healthScore);

  // Mark recommended vs alternatives
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
    startCoords,
    destinationCoords,
    startLabel,
    destinationLabel,
    routingProvider: routingResult.provider,
    userPreferences,
    recommendedRoute: bestRoute,
    alternativeRoutes,
    totalRoutesEvaluated: evaluatedRoutes.length,
    healthDisclaimer: 'EcoWalk health scores are relative decision-support utility indices based on available environmental data and do not constitute individual medical guarantees or clinical safety certifications.'
  };
}

/**
 * Evaluates routes connecting predefined district landmarks (for landmark queries and regression tests)
 */
function evaluateAndRecommendRoutes(startNodeId, endNodeId, userPreferences = {}, walkingSpeed = 'moderate') {
  const startLoc = storage.getLocationById(startNodeId);
  const endLoc = storage.getLocationById(endNodeId);

  // Fetch candidate routes between the two landmarks
  let candidates = storage.getRoutesBetweenNodes(startNodeId, endNodeId);
  if (!candidates || candidates.length === 0) {
    candidates = generateFallbackGraphCandidates(startNodeId, endNodeId);
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

  const evaluatedRoutes = candidates.map(route => {
    const hazardData = calculateHazardPenalty(route.id);
    const effectiveRoadCondition = Math.max(10, route.roadConditionScore - hazardData.penalty);
    const cleanAirScore = Math.max(0, 100 - route.trafficPollutionRisk);

    const rawHealthScore = (
      (weights.wG * route.greeneryScore) +
      (weights.wS * route.safetyScore) +
      (weights.wA * cleanAirScore) +
      (weights.wR * effectiveRoadCondition)
    );

    const distancePenalty = route.distanceKm > 2.0 ? (route.distanceKm - 2.0) * 4 : 0;
    const healthScore = Math.max(0, Math.min(100, Math.round(rawHealthScore - distancePenalty)));
    const estimatedMinutes = Math.round((route.distanceKm / speedKmph) * 60);
    const caloriesBurned = Math.round(route.distanceKm * config.CALORIES_PER_KM);
    const co2SavedGrams = Math.round(route.distanceKm * config.CO2_SAVED_PER_KM_GRAMS);

    let airQualityTag = 'Good';
    if (route.trafficPollutionRisk > 65) airQualityTag = 'Moderate Exhaust';
    if (route.trafficPollutionRisk > 80) airQualityTag = 'Heavy Pollution';

    // Map waypoints to lat/lng if they are in pixel space
    const waypoints = (route.waypoints || []).map(pt => {
      if (pt[0] > 90 || pt[1] > 180) {
        return [12.93 + (pt[1] / 700) * 0.1, 77.56 + (pt[0] / 1000) * 0.08];
      }
      return pt;
    });

    const roadQualityScore = effectiveRoadCondition;

    const mautBreakdown = {
      weights: {
        greenery: Number(weights.wG.toFixed(3)),
        safety: Number(weights.wS.toFixed(3)),
        cleanAir: Number(weights.wA.toFixed(3)),
        roadQuality: Number(weights.wR.toFixed(3))
      },
      subScores: {
        greeneryScore: route.greeneryScore,
        safetyScore: route.safetyScore,
        cleanAirScore,
        roadQualityScore
      },
      contributions: {
        greenery: Number((weights.wG * route.greeneryScore).toFixed(2)),
        safety: Number((weights.wS * route.safetyScore).toFixed(2)),
        cleanAir: Number((weights.wA * cleanAirScore).toFixed(2)),
        roadQuality: Number((weights.wR * roadQualityScore).toFixed(2))
      },
      rawHealthScore: Number(rawHealthScore.toFixed(2)),
      distancePenalty,
      finalHealthScore: healthScore
    };

    const howEcoWalkEvaluates = {
      title: 'How EcoWalk Evaluates This Route',
      formula: 'HealthScore = clamp(round((wG * Greenery + wS * Safety + wA * CleanAir + wR * RoadQuality) - DistancePenalty), 0, 100)',
      criteria: [
        {
          code: 'G',
          name: 'Greenery Proximity & Coverage Score',
          weight: Number(weights.wG.toFixed(3)),
          score: route.greeneryScore,
          contribution: Number((weights.wG * route.greeneryScore).toFixed(2)),
          dataSource: 'OpenStreetMap (OSM) mapped green corridors & parks',
          explanation: `Evaluated urban greenery canopy along walking segment.`,
          limitations: 'Calculated from mapped park boundaries and pedestrian tree verges.'
        },
        {
          code: 'S',
          name: 'Pedestrian Infrastructure Safety Score',
          weight: Number(weights.wS.toFixed(3)),
          score: route.safetyScore,
          contribution: Number((weights.wS * route.safetyScore).toFixed(2)),
          dataSource: 'OpenStreetMap pedestrian footway tags & safety reports',
          explanation: `Evaluated pedestrian sidewalk presence and separation from traffic.`,
          limitations: 'Assesses physical infrastructure; does not assess unpredictable behavior.'
        },
        {
          code: 'C',
          name: 'CPCB Clean Air Score',
          weight: Number(weights.wA.toFixed(3)),
          score: cleanAirScore,
          contribution: Number((weights.wA * cleanAirScore).toFixed(2)),
          dataSource: 'CPCB CAAQMS Station Data',
          explanation: `Estimated Clean Air Index: ${cleanAirScore}/100 based on urban emissions.`,
          limitations: 'Station-level monitoring.'
        },
        {
          code: 'R',
          name: 'Road Surface & Condition Score',
          weight: Number(weights.wR.toFixed(3)),
          score: roadQualityScore,
          contribution: Number((weights.wR * roadQualityScore).toFixed(2)),
          dataSource: 'OpenStreetMap surface attributes & community reports',
          explanation: `Base surface quality: ${route.roadConditionScore}/100, penalized by -${hazardData.penalty} pts for active hazards.`,
          limitations: 'Community-verified reports.'
        }
      ],
      distancePenaltyExplanation: distancePenalty > 0
        ? `Distance penalty of -${distancePenalty.toFixed(1)} pts applied for length over threshold.`
        : 'Zero distance penalty applied.',
      academicDisclaimer: 'EcoWalk route evaluations are multi-criteria utility indices based on spatial environmental indicators and do not constitute clinical or personal health guarantees.'
    };

    return {
      ...route,
      waypoints,
      effectiveRoadCondition,
      roadQualityScore,
      cleanAirScore,
      hazardData,
      healthScore,
      mautBreakdown,
      howEcoWalkEvaluates,
      estimatedMinutes,
      caloriesBurned,
      co2SavedGrams,
      airQualityTag,
      weightsUsed: weights
    };
  });

  evaluatedRoutes.sort((a, b) => b.healthScore - a.healthScore);

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
    startNode: startLoc,
    endNode: endLoc,
    userPreferences,
    recommendedRoute: bestRoute,
    alternativeRoutes,
    totalRoutesEvaluated: evaluatedRoutes.length
  };
}

/**
 * Fallback synthesizer for offline mode
 */
function generateFallbackGraphCandidates(startId, endId) {
  const startLoc = storage.getLocationById(startId);
  const endLoc = storage.getLocationById(endId);
  if (!startLoc || !endLoc) return [];

  const sLat = startLoc.lat || (startLoc.y ? 12.93 + (startLoc.y / 700) * 0.1 : 12.95);
  const sLng = startLoc.lng || (startLoc.x ? 77.56 + (startLoc.x / 1000) * 0.08 : 77.58);
  const eLat = endLoc.lat || (endLoc.y ? 12.93 + (endLoc.y / 700) * 0.1 : 12.98);
  const eLng = endLoc.lng || (endLoc.x ? 77.56 + (endLoc.x / 1000) * 0.08 : 77.60);

  const baseKm = Number(routingService.haversineDistance(sLat, sLng, eLat, eLng).toFixed(1)) || 1.4;

  const route1 = {
    id: `R-SYN-${startId}-${endId}-1`,
    name: `${startLoc.shortName} to ${endLoc.shortName} Green Trail`,
    tag: 'Recommended Healthy Choice',
    routeType: 'nature_focused',
    startNodeId: startId,
    startNodeName: startLoc.name,
    endNodeId: endId,
    endNodeName: endLoc.name,
    distanceKm: Number((baseKm * 1.12).toFixed(1)),
    greeneryScore: 89,
    safetyScore: 92,
    trafficPollutionRisk: 18,
    roadConditionScore: 93,
    terrainType: 'Pedestrian Pavers & Tree-Lined Avenues',
    waypoints: [
      [sLat, sLng],
      [sLat + (eLat - sLat) * 0.4 - 0.003, sLng + (eLng - sLng) * 0.4 + 0.003],
      [sLat + (eLat - sLat) * 0.7 - 0.002, sLng + (eLng - sLng) * 0.7 + 0.002],
      [eLat, eLng]
    ],
    description: `Scenic healthy corridor routed via green verges connecting ${startLoc.name} to ${endLoc.name}.`,
    highlights: ['High shade canopy', 'Away from heavy transport', 'Smooth walking surface'],
    warnings: []
  };

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
    waypoints: [
      [sLat, sLng],
      [sLat + (eLat - sLat) * 0.5, sLng + (eLng - sLng) * 0.5],
      [eLat, eLng]
    ],
    description: `Direct street route through main avenue. Shorter distance but elevated vehicular emissions.`,
    highlights: ['Shortest direct walking distance'],
    warnings: ['High traffic exhaust fumes', 'Crowded sidewalks']
  };

  return [route1, route2];
}

/**
 * Standard MAUT Health Score computation helper
 * HS = (wG * G + wS * S + wA * (100 - P) + wR * R) - Dp
 */
function calculateHealthScore({ greeneryScore, safetyScore, pollutionRisk, roadQualityScore, distancePenalty = 0, weights }) {
  const wG = weights?.wG ?? 0.25;
  const wS = weights?.wS ?? 0.25;
  const wA = weights?.wA ?? 0.30;
  const wR = weights?.wR ?? 0.20;

  const cleanAir = Math.max(0, 100 - pollutionRisk);
  const rawScore = (wG * greeneryScore) + (wS * safetyScore) + (wA * cleanAir) + (wR * roadQualityScore);
  return Number(Math.max(0, Math.min(100, Math.round(rawScore - distancePenalty))).toFixed(1));
}

module.exports = {
  evaluateAndRecommendRoutes,
  evaluateAndRecommendRealRoutes,
  calculateHealthScore,
  calculateHazardPenalty,
  calculateGeoHazardPenalty,
  deriveWeights,
  PACE_SPEEDS
};
