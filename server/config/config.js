const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'ecowalk-mca-phase1-super-secret-key-2026',
  JWT_EXPIRES_IN: '7d',
  DATA_DIR: path.join(__dirname, '..', 'data'),
  // Average human walking speed ~ 4.8 km/h (80 meters/min)
  AVERAGE_WALKING_SPEED_KMPH: 4.8,
  // Average calories burned per km walking for a 65-70kg adult ~ 60 kcal/km
  CALORIES_PER_KM: 62,
  // Average CO2 saved by walking vs standard urban petrol car ~ 170g per km
  CO2_SAVED_PER_KM_GRAMS: 171
};
