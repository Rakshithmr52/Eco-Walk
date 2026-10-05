const storage = require('../models/storage');

/**
 * Get comprehensive administrative dashboard statistics
 */
exports.getAdminStats = (req, res) => {
  try {
    const users = storage.getUsers();
    const routes = storage.getRoutes();
    const reports = storage.getReports();
    const feedback = storage.getFeedback();

    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const verifiedReports = reports.filter(r => r.status === 'verified').length;
    const resolvedReports = reports.filter(r => r.status === 'resolved').length;

    const avgRating = feedback.length > 0
      ? Number((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1))
      : 5.0;

    const totalEcoKm = Number(
      users.reduce((sum, u) => sum + (u.stats?.totalDistanceKm || 0), 0).toFixed(1)
    );
    const totalCO2SavedKg = Number(
      users.reduce((sum, u) => sum + (u.stats?.co2SavedKg || 0), 0).toFixed(2)
    );

    return res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalRoutes: routes.length,
        totalReports: reports.length,
        pendingReports,
        verifiedReports,
        resolvedReports,
        totalFeedback: feedback.length,
        averageRating: avgRating,
        totalEcoKm,
        totalCO2SavedKg
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
};

/**
 * Get user roster for admin
 */
exports.getAllUsers = (req, res) => {
  try {
    const users = storage.getUsers().map(({ passwordHash, ...safeUser }) => safeUser);
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
};

/**
 * Reset dataset back to initial seeds
 */
exports.resetDatabase = (req, res) => {
  try {
    storage.resetToSeeds();
    return res.json({
      success: true,
      message: 'Local database has been reseeded to original Greenfield District sample data.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reseed database.' });
  }
};
