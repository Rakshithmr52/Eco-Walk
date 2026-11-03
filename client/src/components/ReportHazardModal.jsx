import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  AlertTriangle, 
  Camera, 
  Upload, 
  CheckCircle2,
  Trash2,
  MapPin,
  Crosshair,
  Info,
  ThumbsUp,
  ShieldCheck,
  RefreshCw,
  Layers
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Custom Pin Marker for the Hazard Location Selector
 */
const createPinpointIcon = () => L.divIcon({
  className: 'leaflet-custom-div-icon',
  html: `
    <div style="
      width: 32px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <div style="
        width: 30px;
        height: 30px;
        background: #DC2626;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 10px rgba(220, 38, 38, 0.4);
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
    </div>
  `,
  iconSize: [32, 38],
  iconAnchor: [16, 38]
});

/**
 * Click handler on the mini-map to update pin coordinates
 */
function MiniMapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      if (onLocationChange) {
        onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
}

/**
 * Recenter the mini-map when coordinates change
 */
function MiniMapCenterHandler({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      map.setView([coords.lat, coords.lng], 16, { animate: true });
    }
  }, [coords, map]);
  return null;
}

export default function ReportHazardModal({
  isOpen,
  onClose,
  route = null,
  locations = [],
  activeCoords = null,
  onReportSubmitted = null
}) {
  const { user } = useAuth();
  
  // Geographic Coordinate State
  const [coords, setCoords] = useState(() => {
    if (activeCoords && typeof activeCoords.lat === 'number') {
      return { lat: activeCoords.lat, lng: activeCoords.lng };
    }
    if (route && Array.isArray(route.waypoints) && route.waypoints.length > 0) {
      const mid = route.waypoints[Math.floor(route.waypoints.length / 2)];
      if (Array.isArray(mid) && mid.length >= 2) return { lat: mid[0], lng: mid[1] };
    }
    return { lat: 12.9716, lng: 77.5946 }; // Default Bengaluru center
  });

  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [locationName, setLocationName] = useState(route ? route.name : '');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Form Fields
  const [issueType, setIssueType] = useState('pothole');
  const [severity, setSeverity] = useState('moderate');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Proximity Detection & De-duplication State
  const [nearbyHazards, setNearbyHazards] = useState([]);
  const [checkingNearby, setCheckingNearby] = useState(false);
  const [showNewFormAnyway, setShowNewFormAnyway] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  // Sync initial coordinates when modal opens or activeCoords change
  useEffect(() => {
    if (!isOpen) return;

    let initialLat = 12.9716;
    let initialLng = 77.5946;

    if (activeCoords && typeof activeCoords.lat === 'number') {
      initialLat = activeCoords.lat;
      initialLng = activeCoords.lng;
    } else if (route && Array.isArray(route.waypoints) && route.waypoints.length > 0) {
      const mid = route.waypoints[Math.floor(route.waypoints.length / 2)];
      if (Array.isArray(mid) && mid.length >= 2) {
        initialLat = mid[0];
        initialLng = mid[1];
      }
    }

    setCoords({ lat: initialLat, lng: initialLng });
    setShowNewFormAnyway(false);
    setError('');
    setSuccessMsg('');
    lookupNearbyAndGeocode(initialLat, initialLng);
  }, [isOpen, activeCoords, route]);

  // Lookup nearby hazards (for de-duplication) and reverse geocode road name
  const lookupNearbyAndGeocode = async (lat, lng) => {
    setCheckingNearby(true);
    setIsReverseGeocoding(true);

    try {
      const [nearbyRes, geocodeRes] = await Promise.allSettled([
        api.reports.getNearby({ lat, lng, radiusMeters: 80 }),
        api.routes.reverseGeocode(lat, lng)
      ]);

      if (nearbyRes.status === 'fulfilled' && nearbyRes.value?.success) {
        setNearbyHazards(nearbyRes.value.reports || []);
      } else {
        setNearbyHazards([]);
      }

      if (geocodeRes.status === 'fulfilled' && geocodeRes.value?.success) {
        const place = geocodeRes.value.result;
        if (place?.name) {
          setLocationName(place.name);
        }
      }
    } catch (err) {
      console.warn('Proximity / Geocode lookup error:', err);
    } finally {
      setCheckingNearby(false);
      setIsReverseGeocoding(false);
    }
  };

  const handleCoordinateChange = (newCoords) => {
    setCoords(newCoords);
    setGpsAccuracy(null);
    lookupNearbyAndGeocode(newCoords.lat, newCoords.lng);
  };

  // 1-Tap Use Current GPS Location
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingGps(false);
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setCoords(newCoords);
        setGpsAccuracy(pos.coords.accuracy);
        lookupNearbyAndGeocode(newCoords.lat, newCoords.lng);
      },
      (geoErr) => {
        setDetectingGps(false);
        setError('Could not acquire GPS position. You can tap anywhere on the mini-map to drop the pin.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 1-Click Community Confirmation ("I Saw This Too")
  const handleConfirmExisting = async (hazard) => {
    setConfirmingId(hazard.id);
    setError('');

    try {
      const payload = {
        userEmail: user?.email || 'walker@ecowalk.local',
        userName: user?.name || 'Local Walker'
      };

      const res = await api.reports.confirm(hazard.id, payload);
      setSuccessMsg(res.message || 'Hazard verified! Confirmation recorded.');
      
      if (onReportSubmitted) {
        onReportSubmitted(res.report);
      }

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to confirm hazard.');
    } finally {
      setConfirmingId(null);
    }
  };

  // Image Upload Handler
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

  // Submit New Hazard Report
  const handleSubmitNew = async (e) => {
    e.preventDefault();
    if (!locationName.trim() || !description.trim()) {
      setError('Please provide the road name and a brief description of the physical damage or obstruction.');
      return;
    }

    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      setError('Precise GPS coordinates are required.');
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
        coordinates: [coords.lat, coords.lng]
      };

      const res = await api.reports.create(payload);

      if (res.deduplicated) {
        setSuccessMsg(res.message);
      } else {
        setSuccessMsg('Road hazard pinned and broadcasted to all walkers! Thank you for keeping pedestrian paths safe.');
      }

      if (onReportSubmitted) {
        onReportSubmitted(res.report);
      }

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1600);
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--slate-200)',
          position: 'sticky',
          top: 0,
          backgroundColor: '#ffffff',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--slate-900)', margin: 0 }}>
                Pinpoint Road Hazard
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)', margin: 0 }}>
                Strict GPS coordinate logging & automated community de-duplication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Status Banners */}
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.88rem',
              fontWeight: '600',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Academic / Mentorship Transparency Notice: Road Quality vs Hazards */}
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#065F46', lineHeight: '1.45' }}>
              <strong>Automated System Note:</strong> Overall road walkability, surface type, and traffic safety are already computed automatically by EcoWalk's GIS engine. Please report only <strong>acute, physical obstructions</strong> (potholes, open drains, fallen obstacles, or dark unlit spots) at this exact spot.
            </div>
          </div>

          {/* SECTION 1: Exact Geographic Coordinate Pinpointer */}
          <div style={{
            backgroundColor: 'var(--slate-50)',
            border: '1px solid var(--slate-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} color="#DC2626" />
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--slate-800)' }}>
                  Hazard Geographic Location
                </span>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentGps}
                disabled={detectingGps}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Crosshair size={14} className={detectingGps ? 'spin-icon' : ''} />
                {detectingGps ? 'Acquiring GPS...' : 'Use My Current GPS Position'}
              </button>
            </div>

            {/* Interactive Leaflet Mini-Map for Pin Drop */}
            <div style={{
              height: '180px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid var(--slate-300)',
              marginBottom: '10px'
            }}>
              <MapContainer
                center={[coords.lat, coords.lng]}
                zoom={16}
                scrollWheelZoom={false}
                zoomControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[coords.lat, coords.lng]} icon={createPinpointIcon()} />
                <MiniMapClickHandler onLocationChange={handleCoordinateChange} />
                <MiniMapCenterHandler coords={coords} />
              </MapContainer>

              <div style={{
                position: 'absolute',
                bottom: '6px',
                right: '8px',
                zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.92)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: 'var(--slate-600)',
                pointerEvents: 'none'
              }}>
                Tap anywhere on map to reposition pin
              </div>
            </div>

            {/* Coordinates & Reverse Geocode Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              fontSize: '0.78rem'
            }}>
              <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.7rem' }}>GPS Coordinates</span>
                <strong style={{ color: 'var(--slate-800)' }}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </strong>
                {gpsAccuracy && (
                  <span style={{ color: '#059669', marginLeft: '6px', fontSize: '0.7rem', fontWeight: '600' }}>
                    (±{Math.round(gpsAccuracy)}m)
                  </span>
                )}
              </div>

              <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.7rem' }}>
                  Detected Street / Pathway {isReverseGeocoding && '(resolving...)'}
                </span>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Sankey Tank Crossroad, Gate 2"
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontWeight: '700',
                    color: 'var(--slate-800)',
                    fontSize: '0.8rem',
                    background: 'transparent',
                    padding: 0
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Automated Proximity Hazard Detection & 1-Click Confirmation */}
          {nearbyHazards.length > 0 && !showNewFormAnyway && (
            <div style={{
              backgroundColor: '#FFFBEB',
              border: '2px solid #FCD34D',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: '800', marginBottom: '8px' }}>
                <AlertTriangle size={18} color="#D97706" />
                <span>Existing Hazard Detected Nearby ({nearbyHazards[0].distanceMeters}m away)</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#78350F', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                A walker has already reported an active hazard at this exact spot. Instead of uploading a duplicate, confirm you saw this hazard to help civic teams prioritize repairs:
              </p>

              <div style={{
                background: '#ffffff',
                border: '1px solid #FDE68A',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className={`badge ${nearbyHazards[0].severity === 'critical' || nearbyHazards[0].severity === 'high' ? 'badge-rose' : 'badge-amber'}`}>
                    {nearbyHazards[0].issueType.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ThumbsUp size={12} /> {nearbyHazards[0].confirmations || 1} Walkers Confirmed
                  </span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--slate-900)' }}>
                  {nearbyHazards[0].locationName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                  "{nearbyHazards[0].description}"
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleConfirmExisting(nearbyHazards[0])}
                  disabled={Boolean(confirmingId)}
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '220px', padding: '10px 16px', backgroundColor: '#059669', borderColor: '#059669' }}
                >
                  <ThumbsUp size={16} />
                  {confirmingId === nearbyHazards[0].id ? 'Recording Confirmation...' : 'Confirm I Saw This Too (+1)'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFormAnyway(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '10px 14px' }}
                >
                  Report a Different Issue Here
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: Standardized New Hazard Form (Shown when no duplicate or user opts to report a different issue) */}
          {(nearbyHazards.length === 0 || showNewFormAnyway) && (
            <form onSubmit={handleSubmitNew}>
              {showNewFormAnyway && nearbyHazards.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F1F5F9',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '14px',
                  fontSize: '0.78rem',
                  color: 'var(--slate-600)'
                }}>
                  <span>Reporting a distinct new issue at this coordinate.</span>
                  <button
                    type="button"
                    onClick={() => setShowNewFormAnyway(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: '700', cursor: 'pointer' }}
                  >
                    View existing hazard instead
                  </button>
                </div>
              )}

              {/* Hazard Category & Severity Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                    Specific Hazard Category *
                  </label>
                  <select
                    className="form-select"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                  >
                    <option value="pothole">Pothole / Broken Pavement</option>
                    <option value="drainage">Open Drainage / Waterlogging</option>
                    <option value="obstruction">Sidewalk Obstruction / Barrier</option>
                    <option value="unsafe_lighting">Broken Streetlight / Dark Hazard</option>
                    <option value="uneven_pavement">Uneven Cobblestones / Sinking Pavers</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                    Severity Level *
                  </label>
                  <select
                    className="form-select"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    required
                  >
                    <option value="low">Low (Minor trip hazard)</option>
                    <option value="moderate">Moderate (Caution needed)</option>
                    <option value="high">High (Injury risk / diverted onto road)</option>
                    <option value="critical">Critical (Completely impassable / deep ditch)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                  Damage Description & Pedestrian Risk *
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 1-foot deep rainwater puddle and jagged asphalt near curb..."
                  required
                />
              </div>

              {/* Photo Attachment (Local preview) */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                  Attach Photo (Optional)
                </label>
                <div style={{
                  border: '2px dashed var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  cursor: 'pointer'
                }}>
                  {imageBase64 ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={imageBase64}
                        alt="Hazard Preview"
                        style={{ maxHeight: '120px', borderRadius: 'var(--radius-md)', display: 'block' }}
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
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Camera size={24} color="var(--slate-400)" style={{ margin: '0 auto 6px auto' }} />
                      <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--slate-700)' }}>
                        Click to attach photo of road hazard
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>
                        PNG, JPG, or WEBP (Max 5MB)
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
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
                  {loading ? 'Submitting Coordinates...' : 'Pin Hazard to Map'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
