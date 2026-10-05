/**
 * Mongoose Schema Definitions for EcoWalk (MCA Project Submission)
 * These schemas document the relational and document models for MongoDB integration.
 * In Phase 1 local execution, the system uses the dual-mode JSON storage layer in `storage.js`
 * so the application runs seamlessly out-of-the-box without requiring an active MongoDB daemon.
 */

const UserSchema = {
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['walker', 'admin'], default: 'walker' },
  walkingSpeed: { type: String, enum: ['leisurely', 'moderate', 'brisk'], default: 'moderate' },
  preferences: {
    prioritizeGreenery: { type: Boolean, default: true },
    prioritizeSafety: { type: Boolean, default: true },
    avoidPollution: { type: Boolean, default: true },
    avoidPotholes: { type: Boolean, default: true },
    importanceWeights: {
      greenery: { type: Number, default: 0.35 },
      safety: { type: Number, default: 0.25 },
      airQuality: { type: Number, default: 0.25 },
      roadCondition: { type: Number, default: 0.15 }
    }
  },
  stats: {
    totalDistanceKm: { type: Number, default: 0 },
    totalWalks: { type: Number, default: 0 },
    totalCalories: { type: Number, default: 0 },
    co2SavedKg: { type: Number, default: 0 },
    reportsSubmitted: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
};

const RouteSchema = {
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  tag: { type: String },
  routeType: { type: String, enum: ['nature_focused', 'arterial_road', 'historic_urban'], default: 'nature_focused' },
  startNodeId: { type: String, required: true },
  startNodeName: { type: String, required: true },
  endNodeId: { type: String, required: true },
  endNodeName: { type: String, required: true },
  distanceKm: { type: Number, required: true },
  estimatedMinutes: { type: Number, required: true },
  greeneryScore: { type: Number, min: 0, max: 100, required: true },
  safetyScore: { type: Number, min: 0, max: 100, required: true },
  trafficPollutionRisk: { type: Number, min: 0, max: 100, required: true },
  roadConditionScore: { type: Number, min: 0, max: 100, required: true },
  terrainType: { type: String },
  elevationGainMeters: { type: Number, default: 0 },
  waypoints: [[Number]],
  description: { type: String },
  highlights: [String],
  warnings: [String]
};

const ReportSchema = {
  id: { type: String, required: true, unique: true },
  routeId: { type: String, required: true },
  routeName: { type: String },
  locationName: { type: String, required: true },
  coordinates: [Number],
  issueType: { 
    type: String, 
    enum: ['pothole', 'drainage', 'unsafe_lighting', 'obstruction', 'uneven_pavement'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'moderate', 'high', 'critical'], 
    default: 'moderate' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'resolved'], 
    default: 'pending' 
  },
  description: { type: String, required: true },
  imageUrl: { type: String },
  reportedBy: { type: String, required: true },
  userEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  resolvedAt: { type: Date },
  adminNotes: { type: String }
};

const FeedbackSchema = {
  id: { type: String, required: true, unique: true },
  routeId: { type: String, required: true },
  routeName: { type: String },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  greeneryRating: { type: Number, min: 1, max: 5 },
  safetyRating: { type: Number, min: 1, max: 5 },
  roadQualityRating: { type: Number, min: 1, max: 5 },
  comfortRating: { type: Number, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
};

module.exports = {
  UserSchema,
  RouteSchema,
  ReportSchema,
  FeedbackSchema
};
