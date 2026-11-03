const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { optionalAuth } = require('../middleware/auth');

router.get('/locations', routeController.getLocations);
router.get('/search-destination', routeController.searchDestinations);
router.get('/reverse-geocode', routeController.reverseGeocode);
router.get('/', routeController.getAllRoutes);
router.get('/:id', routeController.getRouteById);
router.post('/recommend', optionalAuth, routeController.recommendRoutes);

module.exports = router;
