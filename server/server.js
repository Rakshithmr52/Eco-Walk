const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const storage = require('./models/storage');

// Import routes
const authRoutes = require('./routes/authRoutes');
const routeRoutes = require('./routes/routeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Initialize local JSON storage and seed data if not present
storage.initStorage();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Generous body limit for image attachments (pothole/drainage photo reports)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// Root developer & status landing page
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EcoWalk Backend API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #1E293B; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 620px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34D399; font-weight: 700; font-size: 0.8rem; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid rgba(16, 185, 129, 0.4); }
    h1 { font-size: 1.8rem; margin: 0 0 10px 0; color: #FFFFFF; font-weight: 800; }
    p { color: #94A3B8; font-size: 0.95rem; line-height: 1.6; margin: 0 0 24px 0; }
    .btn { display: inline-flex; align-items: center; justify-content: center; background: #059669; color: white; padding: 12px 24px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.95rem; transition: background 0.2s ease; }
    .btn:hover { background: #10B981; }
    .endpoints { background: #0F172A; border-radius: 10px; padding: 16px 20px; margin-top: 24px; border: 1px solid #334155; }
    .endpoints h3 { font-size: 0.78rem; text-transform: uppercase; color: #64748B; margin: 0 0 10px 0; letter-spacing: 0.05em; }
    .endpoints ul { list-style: none; padding: 0; margin: 0; font-family: monospace; font-size: 0.85rem; color: #38BDF8; }
    .endpoints li { padding: 4px 0; }
    .endpoints a { color: #38BDF8; text-decoration: none; }
    .endpoints a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● API Server Online (Port 5000)</div>
    <h1>🌿 EcoWalk Backend API Server</h1>
    <p>
      This port (<strong>:5000</strong>) is the Node.js / Express backend service providing REST API data for route calculations, hazard reporting, and authentication.<br><br>
      The visual user interface (interactive map, route planner, dashboards) is hosted on the frontend application at <strong>http://localhost:3000</strong>.
    </p>
    <a href="http://localhost:3000" class="btn">🚀 Open EcoWalk Web App (http://localhost:3000)</a>

    <div class="endpoints">
      <h3>Active API Endpoints:</h3>
      <ul>
        <li>• <a href="/api/health">GET /api/health</a> &mdash; System Health & Storage Status</li>
        <li>• <a href="/api/routes/locations">GET /api/routes/locations</a> &mdash; 12 Bengaluru Landmarks</li>
        <li>• <a href="/api/routes">GET /api/routes</a> &mdash; Candidate Walking Routes</li>
        <li>• <a href="/api/reports">GET /api/reports</a> &mdash; Crowdsourced Hazard Reports</li>
        <li>• <a href="/api/feedback">GET /api/feedback</a> &mdash; User Ratings & Feedback</li>
      </ul>
    </div>
  </div>
</body>
</html>`);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'EcoWalk - Personalized Healthy Walking Route Recommendation System',
    phase: 'Phase 1 MCA Capstone',
    storageMode: 'Local JSON File Database (100% Offline / Zero External APIs)',
    timestamp: new Date().toISOString()
  });
});

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🌿 EcoWalk Backend API Server running on port ${config.PORT}`);
    console.log(`📍 Endpoint: http://localhost:${config.PORT}/api/health`);
    console.log(`🔒 Mode: Zero External APIs (Local Storage & Route Engine)`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
