const { v4: uuidv4 } = require('uuid');
const storage = require('../models/storage');

/**
 * Get all feedback
 */
exports.getAllFeedback = (req, res) => {
  try {
    const feedback = storage.getFeedback();
    return res.json({ success: true, count: feedback.length, feedback });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve feedback.' });
  }
};

/**
 * Get feedback for a specific route
 */
exports.getFeedbackByRoute = (req, res) => {
  try {
    const { routeId } = req.params;
    const feedback = storage.getFeedbackByRouteId(routeId);
    return res.json({ success: true, count: feedback.length, feedback });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve route feedback.' });
  }
};

/**
 * Submit user feedback and rating
 */
exports.createFeedback = (req, res) => {
  try {
    const {
      routeId,
      routeName,
      rating,
      greeneryRating,
      safetyRating,
      roadQualityRating,
      comfortRating,
      comment
    } = req.body;

    if (!routeId || !rating) {
      return res.status(400).json({ error: 'Route ID and overall rating (1-5) are required.' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
    }

    const newFeedback = {
      id: `FB-${uuidv4().substring(0, 6).toUpperCase()}`,
      routeId,
      routeName: routeName || 'Greenfield Walking Route',
      userId: req.user?.id || 'U-GUEST',
      userName: req.user?.name || req.body.userName || 'Community Walker',
      rating: Math.round(numRating),
      greeneryRating: Number(greeneryRating) || numRating,
      safetyRating: Number(safetyRating) || numRating,
      roadQualityRating: Number(roadQualityRating) || numRating,
      comfortRating: Number(comfortRating) || numRating,
      comment: (comment || '').trim(),
      createdAt: new Date().toISOString()
    };

    storage.createFeedback(newFeedback);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been recorded and will help fellow walkers.',
      feedback: newFeedback
    });
  } catch (error) {
    console.error('Create Feedback Error:', error);
    return res.status(500).json({ error: 'Failed to submit feedback.' });
  }
};

/**
 * Update feedback status / moderation (Admin action)
 */
exports.updateFeedbackStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['published', 'reviewed', 'hidden'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = storage.updateFeedbackStatus(id, status, adminNotes);
    if (!updated) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }

    return res.json({
      success: true,
      message: `Feedback status updated to ${status}.`,
      feedback: updated
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update feedback status.' });
  }
};
