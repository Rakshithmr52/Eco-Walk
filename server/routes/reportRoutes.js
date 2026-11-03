const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { optionalAuth, verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', reportController.getReports);
router.get('/nearby', reportController.getNearbyReports);
router.post('/', optionalAuth, reportController.createReport);
router.post('/:id/confirm', optionalAuth, reportController.confirmReport);
router.patch('/:id/status', verifyToken, requireAdmin, reportController.updateReportStatus);

module.exports = router;
