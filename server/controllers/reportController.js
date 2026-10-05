const { v4: uuidv4 } = require('uuid');
const storage = require('../models/storage');

/**
 * Get all hazard reports with optional filters
 */
exports.getReports = (req, res) => {
  try {
    const { status, routeId, issueType } = req.query;
    let reports = storage.getReports();

    if (status) {
      reports = reports.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }
    if (routeId) {
      reports = reports.filter(r => r.routeId === routeId);
    }
    if (issueType) {
      reports = reports.filter(r => r.issueType.toLowerCase() === issueType.toLowerCase());
    }

    return res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
};

/**
 * Create a new pothole / road hazard report
 */
exports.createReport = (req, res) => {
  try {
    const {
      routeId,
      routeName,
      locationName,
      coordinates,
      issueType,
      severity = 'moderate',
      description,
      imageUrl = ''
    } = req.body;

    if (!locationName || !issueType || !description) {
      return res.status(400).json({ error: 'Location, issue type, and description are required.' });
    }

    const validTypes = ['pothole', 'drainage', 'unsafe_lighting', 'obstruction', 'uneven_pavement'];
    if (!validTypes.includes(issueType)) {
      return res.status(400).json({ error: `Issue type must be one of: ${validTypes.join(', ')}` });
    }

    if (imageUrl) {
      if (typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'Invalid image format.' });
      }
      // Check maximum length (~7MB string for ~5MB binary file)
      if (imageUrl.length > 7 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image attachment exceeds maximum allowable size (5MB).' });
      }
      // Must be a data URI of an image or a valid URL
      const isDataUri = imageUrl.startsWith('data:image/');
      const isHttpUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
      if (!isDataUri && !isHttpUrl) {
        return res.status(400).json({ error: 'Image must be a valid image data URI (JPEG, PNG, WebP) or URL.' });
      }
    }

    const reporterName = req.user?.name || req.body.reportedBy || 'Community Walker';
    const reporterEmail = req.user?.email || req.body.userEmail || 'anonymous@ecowalk.local';

    const newReport = {
      id: `REP-${uuidv4().substring(0, 6).toUpperCase()}`,
      routeId: routeId || 'R-GENERAL',
      routeName: routeName || 'Greenfield District Pathway',
      locationName: locationName.trim(),
      coordinates: coordinates || [450, 350],
      issueType,
      severity: ['low', 'moderate', 'high', 'critical'].includes(severity) ? severity : 'moderate',
      status: 'pending',
      description: description.trim(),
      imageUrl: imageUrl || '',
      reportedBy: reporterName,
      userEmail: reporterEmail,
      createdAt: new Date().toISOString(),
      verifiedAt: null,
      resolvedAt: null,
      rejectedAt: null,
      adminNotes: ''
    };

    storage.createReport(newReport);

    // If authenticated, update user report stats safely
    if (req.user?.id) {
      storage.updateUserStats(req.user.id, { reportsSubmitted: 1, walks: 0 });
    }

    return res.status(201).json({
      success: true,
      message: 'Road hazard report submitted successfully! Thank you for keeping our walking paths safe.',
      report: newReport
    });
  } catch (error) {
    console.error('Create Report Error:', error);
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
};

/**
 * Update report status (Admin action)
 */
exports.updateReportStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['pending', 'verified', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = storage.updateReportStatus(id, status, adminNotes);
    if (!updated) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    return res.json({
      success: true,
      message: `Report status updated to ${status}.`,
      report: updated
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update report status.' });
  }
};
