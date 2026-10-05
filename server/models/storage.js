const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const {
  initialLocations,
  initialRoutes,
  sampleUsers,
  sampleReports,
  sampleFeedback
} = require('../seeds/initialData');

const DATA_DIR = config.DATA_DIR;

// File paths
const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  locations: path.join(DATA_DIR, 'locations.json'),
  routes: path.join(DATA_DIR, 'routes.json'),
  reports: path.join(DATA_DIR, 'reports.json'),
  feedback: path.join(DATA_DIR, 'feedback.json')
};

/**
 * Initialize storage directory and seed files if they don't exist
 */
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const seedMap = {
    users: sampleUsers,
    locations: initialLocations,
    routes: initialRoutes,
    reports: sampleReports,
    feedback: sampleFeedback
  };

  Object.entries(FILES).forEach(([key, filePath]) => {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(seedMap[key], null, 2), 'utf8');
      console.log(`[Storage] Initialized ${key}.json with seed data`);
    }
  });
}

/**
 * Generic Read Helper
 */
function readData(collectionName) {
  try {
    const filePath = FILES[collectionName];
    if (!fs.existsSync(filePath)) {
      initStorage();
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[Storage] Error reading ${collectionName}:`, error.message);
    return [];
  }
}

/**
 * Generic Write Helper (Atomic-safe)
 */
function writeData(collectionName, data) {
  try {
    const filePath = FILES[collectionName];
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`[Storage] Error writing ${collectionName}:`, error.message);
    return false;
  }
}

const storage = {
  initStorage,

  // Users
  getUsers: () => readData('users'),
  getUserById: (id) => readData('users').find(u => u.id === id),
  getUserByEmail: (email) => readData('users').find(u => u.email.toLowerCase() === email.toLowerCase()),
  createUser: (userData) => {
    const users = readData('users');
    users.push(userData);
    writeData('users', users);
    return userData;
  },
  updateUserStats: (userId, statDeltas = {}) => {
    const users = readData('users');
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      const u = users[index];
      const walksToAdd = statDeltas.walks !== undefined ? statDeltas.walks : 0;
      u.stats = {
        totalDistanceKm: Number(((u.stats?.totalDistanceKm || 0) + (statDeltas.distanceKm || 0)).toFixed(2)),
        totalWalks: (u.stats?.totalWalks || 0) + walksToAdd,
        totalCalories: Math.round((u.stats?.totalCalories || 0) + (statDeltas.calories || 0)),
        co2SavedKg: Number(((u.stats?.co2SavedKg || 0) + (statDeltas.co2SavedKg || 0)).toFixed(2)),
        reportsSubmitted: (u.stats?.reportsSubmitted || 0) + (statDeltas.reportsSubmitted || 0)
      };
      writeData('users', users);
      return u;
    }
    return null;
  },
  updateUserPreferences: (userId, { walkingSpeed, preferences }) => {
    const users = readData('users');
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      if (walkingSpeed && ['leisurely', 'moderate', 'brisk'].includes(walkingSpeed)) {
        users[index].walkingSpeed = walkingSpeed;
      }
      if (preferences) {
        users[index].preferences = { ...users[index].preferences, ...preferences };
      }
      writeData('users', users);
      return users[index];
    }
    return null;
  },

  // Locations
  getLocations: () => readData('locations'),
  getLocationById: (id) => readData('locations').find(l => l.id === id),

  // Routes
  getRoutes: () => readData('routes'),
  getRouteById: (id) => readData('routes').find(r => r.id === id),
  getRoutesBetweenNodes: (startId, endId) => {
    const routes = readData('routes');
    return routes.filter(r => 
      (r.startNodeId === startId && r.endNodeId === endId) ||
      (r.startNodeId === endId && r.endNodeId === startId)
    );
  },
  addRoute: (routeData) => {
    const routes = readData('routes');
    routes.push(routeData);
    writeData('routes', routes);
    return routeData;
  },

  // Reports (Potholes, road conditions)
  getReports: () => readData('reports'),
  getReportById: (id) => readData('reports').find(rep => rep.id === id),
  getReportsByRouteId: (routeId) => readData('reports').filter(rep => rep.routeId === routeId),
  getActiveReportsForRoute: (routeId) => readData('reports').filter(
    rep => rep.routeId === routeId && (rep.status === 'pending' || rep.status === 'verified')
  ),
  createReport: (reportData) => {
    const reports = readData('reports');
    reports.unshift(reportData); // newest first
    writeData('reports', reports);
    return reportData;
  },
  updateReportStatus: (id, status, adminNotes = '') => {
    const reports = readData('reports');
    const index = reports.findIndex(r => r.id === id);
    if (index !== -1) {
      reports[index].status = status;
      if (status === 'verified') {
        reports[index].verifiedAt = new Date().toISOString();
      } else if (status === 'resolved') {
        reports[index].resolvedAt = new Date().toISOString();
      } else if (status === 'rejected') {
        reports[index].rejectedAt = new Date().toISOString();
      }
      if (adminNotes !== undefined) {
        reports[index].adminNotes = adminNotes;
      }
      writeData('reports', reports);
      return reports[index];
    }
    return null;
  },

  // Feedback & Ratings
  getFeedback: () => readData('feedback'),
  getFeedbackById: (id) => readData('feedback').find(f => f.id === id),
  getFeedbackByRouteId: (routeId) => readData('feedback').filter(f => f.routeId === routeId),
  createFeedback: (feedbackData) => {
    const feedback = readData('feedback');
    if (!feedbackData.status) {
      feedbackData.status = 'published';
    }
    feedback.unshift(feedbackData);
    writeData('feedback', feedback);
    return feedbackData;
  },
  updateFeedbackStatus: (id, status, adminNotes = '') => {
    const feedback = readData('feedback');
    const index = feedback.findIndex(f => f.id === id);
    if (index !== -1) {
      feedback[index].status = status;
      if (adminNotes !== undefined) {
        feedback[index].adminNotes = adminNotes;
      }
      feedback[index].updatedAt = new Date().toISOString();
      writeData('feedback', feedback);
      return feedback[index];
    }
    return null;
  },

  // Reset / Reseed function (helpful for testing)
  resetToSeeds: () => {
    writeData('users', sampleUsers);
    writeData('locations', initialLocations);
    writeData('routes', initialRoutes);
    writeData('reports', sampleReports);
    writeData('feedback', sampleFeedback);
    return true;
  }
};

module.exports = storage;
