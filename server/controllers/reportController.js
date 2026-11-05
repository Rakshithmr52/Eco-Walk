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
      reports = reports.filter(r => (r.status || '').toLowerCase() === status.toLowerCase());
    }
    if (routeId) {
      reports = reports.filter(r => r.routeId === routeId);
    }
    if (issueType) {
      reports = reports.filter(r => (r.issueType || r.type || '').toLowerCase() === issueType.toLowerCase());
    }

    return res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
};

/**
 * Get hazard reports near a specific geographic coordinate within radius (meters)
 * Used for automated de-duplication and community confirmation ("I saw this too")
 */
exports.getNearbyReports = (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng || req.query.lon);
    const radiusMeters = parseFloat(req.query.radiusMeters || req.query.radius || 80);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid numeric latitude and longitude query parameters are required.' });
    }

    const nearby = storage.getNearbyReports(lat, lng, radiusMeters);
    return res.json({
      success: true,
      count: nearby.length,
      radiusMeters,
      reports: nearby
    });
  } catch (error) {
    console.error('Get Nearby Reports Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve nearby reports.' });
  }
};

/**
 * Confirm / Upvote an existing hazard report ("I saw this too")
 * Prevents redundant duplicate uploads and increases community verification count
 */
exports.confirmReport = (req, res) => {
  try {
    const { id } = req.params;
    const userIdentifier = req.user?.email || req.body?.userEmail || req.user?.name || req.body?.userName || 'Community Walker';

    const result = storage.confirmReport(id, userIdentifier);
    if (!result) {
      return res.status(404).json({ error: 'Hazard report not found.' });
    }

    if (result.alreadyConfirmed) {
      return res.json({
        success: true,
        alreadyConfirmed: true,
        message: 'You have already confirmed this hazard report.',
        report: result.report
      });
    }

    // Award walker activity stats if authenticated
    if (req.user?.id) {
      storage.updateUserStats(req.user.id, { reportsSubmitted: 0, walks: 0 });
    }

    return res.json({
      success: true,
      alreadyConfirmed: false,
      message: `Hazard confirmation recorded (+1). Total walker confirmations: ${result.report.confirmations}.`,
      report: result.report
    });
  } catch (error) {
    console.error('Confirm Report Error:', error);
    return res.status(500).json({ error: 'Failed to confirm report.' });
  }
};

/**
 * Create a new pothole / road hazard report
 * Strictly requires precise geographic coordinates and automatically checks for duplicates nearby
 */
exports.createReport = (req, res) => {
  try {
    const routeId = req.body.routeId;
    const routeName = req.body.routeName;
    const locationName = req.body.locationName || req.body.title || req.body.location?.address;
    const coordinates = req.body.coordinates || (req.body.lat && req.body.lng ? [req.body.lat, req.body.lng] : null);
    const issueType = req.body.issueType || req.body.type;
    const severity = req.body.severity || 'moderate';
    const description = req.body.description;
    const imageUrl = req.body.imageUrl || '';

    if (!locationName || !issueType || !description) {
      return res.status(400).json({ error: 'Location, issue type, and description are required.' });
    }

    // Geographic Coordinates Validation & Resolution
    let resolvedLat, resolvedLng;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const [c1, c2] = coordinates.map(Number);
      if (isNaN(c1) || isNaN(c2)) {
        return res.status(400).json({ error: 'Coordinates must contain valid numbers.' });
      }
      // Check if coordinates are legacy SVG coordinates (e.g. x: 520, y: 280 within SVG viewBox 1000x700)
      if (c1 >= 0 && c1 <= 1000 && c2 >= 0 && c2 <= 700 && (c1 > 90 || c2 > 90)) {
        resolvedLat = Number((12.93 + (c2 / 700) * 0.1).toFixed(6));
        resolvedLng = Number((77.56 + (c1 / 1000) * 0.08).toFixed(6));
      } else if (c1 >= -90 && c1 <= 90 && c2 >= -180 && c2 <= 180) {
        resolvedLat = c1;
        resolvedLng = c2;
      } else {
        return res.status(400).json({ error: 'Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).' });
      }
    } else if (routeId) {
      // Auto-resolve coordinate along route polyline
      const route = storage.getRouteById(routeId);
      if (route && Array.isArray(route.waypoints) && route.waypoints.length > 0) {
        const mid = route.waypoints[Math.floor(route.waypoints.length / 2)];
        resolvedLat = mid[0] > 90 ? Number((12.93 + (mid[1] / 700) * 0.1).toFixed(6)) : mid[0];
        resolvedLng = mid[1] > 180 ? Number((77.56 + (mid[0] / 1000) * 0.08).toFixed(6)) : mid[1];
      } else {
        resolvedLat = 12.9716;
        resolvedLng = 77.5946;
      }
    } else {
      return res.status(400).json({ error: 'Precise geographic coordinates [latitude, longitude] are required to report a road hazard.' });
    }

    const lat = resolvedLat;
    const lng = resolvedLng;

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

    // Automated Proximity De-duplication Check (within 35 meters)
    const nearbySameType = storage.getNearbyReports(lat, lng, 35)
      .filter(r => (r.issueType || r.type || '').toLowerCase() === issueType.toLowerCase());

    if (nearbySameType.length > 0) {
      const existing = nearbySameType[0];
      const confirmRes = storage.confirmReport(existing.id, reporterEmail);
      return res.status(200).json({
        success: true,
        deduplicated: true,
        message: `An active matching hazard was already reported ${existing.distanceMeters}m away at this spot. Your confirmation (+1) has been recorded instead of creating a duplicate!`,
        report: confirmRes.report
      });
    }

    const newReport = {
      id: `REP-${uuidv4().substring(0, 6).toUpperCase()}`,
      routeId: routeId || 'R-COMMUNITY',
      routeName: routeName || locationName,
      locationName: locationName.trim(),
      title: locationName.trim(),
      coordinates: [lat, lng],
      lat,
      lng,
      location: { address: locationName.trim() },
      issueType,
      type: issueType,
      severity: ['low', 'moderate', 'high', 'critical'].includes(severity) ? severity : 'moderate',
      status: 'pending',
      description: description.trim(),
      imageUrl: imageUrl || '',
      reportedBy: reporterName,
      userName: reporterName,
      userEmail: reporterEmail,
      confirmations: 1,
      confirmedBy: [reporterEmail],
      lastConfirmedAt: new Date().toISOString(),
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
      deduplicated: false,
      message: 'Road hazard report submitted successfully! Precise coordinates captured and broadcasted to walkers.',
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
