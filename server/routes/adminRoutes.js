const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/stats', verifyToken, requireAdmin, adminController.getAdminStats);
router.get('/users', verifyToken, requireAdmin, adminController.getAllUsers);
router.post('/reset', verifyToken, requireAdmin, adminController.resetDatabase);

module.exports = router;
