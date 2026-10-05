import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Camera, 
  Upload, 
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReportHazardModal({
  isOpen,
  onClose,
  route = null,
  locations = [],
  onReportSubmitted = null
}) {
  const { user } = useAuth();
  const [issueType, setIssueType] = useState('pothole');
  const [severity, setSeverity] = useState('moderate');
  const [locationName, setLocationName] = useState(route ? route.name : '');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Handle local file selection and convert to Base64 data URI
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!locationName.trim() || !description.trim()) {
      setError('Please provide the location name and issue description.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        routeId: route?.id || 'R-COMMUNITY',
        routeName: route?.name || locationName,
        locationName: locationName.trim(),
        issueType,
        severity,
        description: description.trim(),
        imageUrl: imageBase64,
        reportedBy: user?.name || 'Local Walker',
        userEmail: user?.email || 'walker@ecowalk.local',
        // Coordinate approximation based on route waypoint or district center
        coordinates: route?.waypoints?.[Math.floor((route.waypoints?.length || 1) / 2)] || [480, 360]
      };

      const res = await api.reports.create(payload);
      setSuccessMsg('Hazard report submitted! It will appear on the district map.');
      if (onReportSubmitted) {
        onReportSubmitted(res.report);
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--slate-200)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#FEF3C7',
              color: 'var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--slate-900)' }}>
                Report Road Hazard / Condition
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                Help fellow walkers avoid potholes, broken paths, and unsafe drainage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {/* Location / Pathway */}
          <div className="form-group">
            <label className="form-label">Pathway or Location Spot *</label>
            <input
              type="text"
              className="form-input"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Near West Commercial crossing, Metro gate #2"
              required
            />
          </div>

          {/* Issue Type & Severity Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Hazard Category *</label>
              <select
                className="form-select"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option value="pothole">Pothole / Broken Pavement</option>
                <option value="drainage">Open Drainage / Waterlogging</option>
                <option value="unsafe_lighting">Broken Streetlight / Dark Alley</option>
                <option value="obstruction">Sidewalk Obstruction</option>
                <option value="uneven_pavement">Uneven Cobblestones</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Severity Level *</label>
              <select
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="low">Low (Minor annoyance)</option>
                <option value="moderate">Moderate (Trip risk / caution)</option>
                <option value="high">High (Injury risk / barrier)</option>
                <option value="critical">Critical (Completely impassable)</option>
              </select>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="form-group">
            <label className="form-label">Description of Condition *</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the depth, size, water pooling, or pedestrian risk..."
              required
            />
          </div>

          {/* Photo Attachment (Local preview) */}
          <div className="form-group">
            <label className="form-label">Attach Photo (Optional)</label>
            <div style={{
              border: '2px dashed var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              backgroundColor: 'var(--slate-50)',
              cursor: 'pointer'
            }}>
              {imageBase64 ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={imageBase64}
                    alt="Hazard Preview"
                    style={{ maxHeight: '140px', borderRadius: 'var(--radius-md)', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageBase64('')}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.9)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <Camera size={28} color="var(--slate-400)" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-700)' }}>
                    Click to browse or drop road condition photo
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                    PNG, JPG, or WEBP (Max 5MB) • Stored locally in base64
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              <Upload size={16} />
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
