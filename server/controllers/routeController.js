const storage = require('../models/storage');
const recommendationEngine = require('../services/recommendationEngine');
const routingService = require('../services/routingService');
const cpcbAqiService = require('../services/cpcbAqiService');

/**
 * Get all available district landmarks/nodes
 */
exports.getLocations = (req, res) => {
  try {
    const locations = storage.getLocations();
    return res.json({ success: true, count: locations.length, locations });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve locations.' });
  }
};

/**
 * Get all official CPCB Continuous Ambient Air Quality Monitoring Stations (CAAQMS) in Bengaluru
 */
exports.getCpcbStations = async (req, res) => {
  try {
    const stations = await cpcbAqiService.getAllCpcbStations();
    return res.json({ success: true, count: stations.length, stations });
  } catch (error) {
    console.error('CPCB Stations Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve CPCB monitoring stations.' });
  }
};

/**
 * Destination Search & Geocoding (Server-side, protects API keys, avoids unrestricted Nominatim)
 * Constrains destination results within a healthy walking radius (default: 8.0 km)
 */
exports.searchDestinations = async (req, res) => {
  try {
    const query = req.query.query || req.query.q || '';
    const lat = parseFloat(req.query.lat) || 12.9716;
    const lng = parseFloat(req.query.lon || req.query.lng) || 77.5946;
    const radius = parseFloat(req.query.radius) || 8.0;

    if (!query || query.trim().length < 2) {
      return res.json({ success: true, count: 0, results: [] });
    }

    const results = await routingService.searchDestinations(query, lat, lng, radius);
    return res.json({ success: true, count: results.length, radiusKm: radius, results });
  } catch (error) {
    console.error('Destination Search Error:', error);
    return res.status(500).json({ error: 'Failed to search destinations.' });
  }
};

/**
 * Reverse Geocode coordinates into street or area name
 */
exports.reverseGeocode = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng || req.query.lon);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid numeric latitude and longitude query parameters are required.' });
    }

    const result = await routingService.reverseGeocode(lat, lng);
    return res.json({ success: true, result });
  } catch (error) {
    console.error('Reverse Geocode Error:', error);
    return res.status(500).json({ error: 'Failed to reverse geocode coordinates.' });
  }
};

/**
 * Get all predefined routes
 */
exports.getAllRoutes = (req, res) => {
  try {
    const routes = storage.getRoutes();
    return res.json({ success: true, count: routes.length, routes });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve routes.' });
  }
};

/**
 * Get route by ID with live feedback and hazard reports
 */
exports.getRouteById = (req, res) => {
  try {
    const { id } = req.params;
    const route = storage.getRouteById(id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found.' });
    }

    const hazardData = recommendationEngine.calculateHazardPenalty(id);
    const feedback = storage.getFeedbackByRouteId(id);

    // Calculate average rating
    const avgRating = feedback.length > 0 
      ? Number((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1))
      : 5.0;

    return res.json({
      success: true,
      route: {
        ...route,
        effectiveRoadCondition: Math.max(10, route.roadConditionScore - hazardData.penalty),
        hazardData,
        averageRating: avgRating,
        feedbackCount: feedback.length,
        recentFeedback: feedback.slice(0, 5)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve route details.' });
  }
};

/**
 * Recommend healthy walking routes based on real GPS coordinates or landmarks and user preferences
 */
exports.recommendRoutes = async (req, res) => {
  try {
    const { 
      startCoords, 
      destinationCoords, 
      startLabel, 
      destinationLabel,
      startNodeId, 
      endNodeId, 
      preferences, 
      walkingSpeed,
      maxWalkingDistanceKm,
      logWalk 
    } = req.body;

    // Determine user preferences (from payload or user profile if logged in)
    let effectivePrefs = preferences || {};
    let effectiveSpeed = walkingSpeed || 'moderate';

    if (req.user) {
      const user = storage.getUserById(req.user.id);
      if (user) {
        effectivePrefs = { ...(user.preferences || {}), ...(preferences || {}) };
        effectiveSpeed = walkingSpeed || user.walkingSpeed || 'moderate';
      }
    }

    let recommendation = null;

    // 1. If real GPS coordinates are supplied
    if (
      startCoords && typeof startCoords.lat === 'number' && typeof startCoords.lng === 'number' &&
      destinationCoords && typeof destinationCoords.lat === 'number' && typeof destinationCoords.lng === 'number'
    ) {
      // Check if start and destination are identical
      const dist = routingService.haversineDistance(
        startCoords.lat, startCoords.lng,
        destinationCoords.lat, destinationCoords.lng
      );
      if (dist < 0.02) { // less than 20 meters
        return res.status(400).json({ error: 'Start and destination locations are too close to generate a walking route.' });
      }

      // Enforce walking radius limit (default: 8.0 km target range)
      const maxLimit = typeof maxWalkingDistanceKm === 'number' && maxWalkingDistanceKm > 0 ? maxWalkingDistanceKm : 8.0;
      if (dist > maxLimit) {
        return res.status(400).json({
          error: `Destination is ${dist.toFixed(1)} km away. EcoWalk is designed for healthy pedestrian walks within an ${maxLimit} km walking radius. Please select a closer destination or adjust your walking range.`
        });
      }

      recommendation = await recommendationEngine.evaluateAndRecommendRealRoutes({
        startCoords,
        destinationCoords,
        startLabel: startLabel || 'Current GPS Location',
        destinationLabel: destinationLabel || 'Selected Destination',
        userPreferences: effectivePrefs,
        walkingSpeed: effectiveSpeed,
        maxWalkingDistanceKm: maxLimit
      });

      // Validate actual calculated pedestrian road network distance (Requirement 10)
      if (recommendation && recommendation.recommendedRoute) {
        const actualWalkKm = recommendation.recommendedRoute.distanceKm;
        if (actualWalkKm > maxLimit) {
          return res.status(400).json({
            error: `The calculated pedestrian walking route is ${actualWalkKm} km, which exceeds your walking limit of ${maxLimit} km. EcoWalk prioritizes safe walks within your selected range. Please choose a closer destination.`
          });
        }
      }
    } 
    // 2. Fallback to startNodeId / endNodeId (backward compatibility)
    else if (startNodeId && endNodeId) {
      if (startNodeId === endNodeId) {
        return res.status(400).json({ error: 'Start and destination landmarks cannot be the same.' });
      }

      recommendation = await recommendationEngine.evaluateAndRecommendRoutes(
        startNodeId,
        endNodeId,
        effectivePrefs,
        effectiveSpeed
      );
    } else {
      return res.status(400).json({ error: 'Valid starting coordinates and destination are required to calculate routes.' });
    }

    if (!recommendation || !recommendation.success) {
      return res.status(404).json({ error: recommendation?.message || 'Could not find walking paths.' });
    }

    // If user is authenticated, log a walk interaction in their profile stats
    if (req.user && logWalk && recommendation.recommendedRoute) {
      storage.updateUserStats(req.user.id, {
        distanceKm: recommendation.recommendedRoute.distanceKm,
        calories: recommendation.recommendedRoute.caloriesBurned,
        co2SavedKg: Number((recommendation.recommendedRoute.co2SavedGrams / 1000).toFixed(2)),
        walks: 1
      });
    }

    return res.json(recommendation);
  } catch (error) {
    console.error('Route Recommendation Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to compute route recommendations.' });
  }
};
