const storage = require('../models/storage');
const recommendationEngine = require('../services/recommendationEngine');

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
 * Recommend healthy walking routes based on start, end, and user preferences
 */
exports.recommendRoutes = (req, res) => {
  try {
    const { startNodeId, endNodeId, preferences, walkingSpeed } = req.body;

    if (!startNodeId || !endNodeId) {
      return res.status(400).json({ error: 'Start and destination landmarks are required.' });
    }

    if (startNodeId === endNodeId) {
      return res.status(400).json({ error: 'Start and destination landmarks cannot be the same.' });
    }

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

    const recommendation = recommendationEngine.evaluateAndRecommendRoutes(
      startNodeId,
      endNodeId,
      effectivePrefs,
      effectiveSpeed
    );

    if (!recommendation.success) {
      return res.status(404).json({ error: recommendation.message });
    }

    // If user is authenticated, log a walk interaction in their stats
    if (req.user && req.body.logWalk) {
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
    return res.status(500).json({ error: 'Failed to compute route recommendations.' });
  }
};
