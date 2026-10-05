const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { optionalAuth, verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', feedbackController.getAllFeedback);
router.get('/route/:routeId', feedbackController.getFeedbackByRoute);
router.post('/', optionalAuth, feedbackController.createFeedback);
router.patch('/:id/status', verifyToken, requireAdmin, feedbackController.updateFeedbackStatus);

module.exports = router;
