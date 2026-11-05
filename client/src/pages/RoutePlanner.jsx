import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  Trees,
  ShieldCheck,
  Wind,
  Activity,
  Layers,
  Award,
  Navigation,
  Search,
  Crosshair,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MapVisualizer from '../components/MapVisualizer';
import RouteCard from '../components/RouteCard';
import RouteComparisonTable from '../components/RouteComparisonTable';
import FeedbackModal from '../components/FeedbackModal';
import ReportHazardModal from '../components/ReportHazardModal';

export default function RoutePlanner({ initialStart = 'L1', initialEnd = '' }) {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);

  // GPS State
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'requesting' | 'acquired' | 'denied' | 'error'
  const [gpsCoords, setGpsCoords] = useState(null); // { lat, lng, accuracy }
  const [gpsError, setGpsError] = useState('');
  const [useGpsOrigin, setUseGpsOrigin] = useState(true);

  // Manual Origin Fallback State
  const [manualStartNodeId, setManualStartNodeId] = useState(initialStart);

  // Destination Search & Selection State (Left unselected initially so user explicitly chooses)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null); // { lat, lng, name, label }
  const [fallbackEndNodeId, setFallbackEndNodeId] = useState(initialEnd || '');
  const searchDebounceRef = useRef(null);

  // Preference switches
  const [prioritizeGreenery, setPrioritizeGreenery] = useState(true);
  const [prioritizeSafety, setPrioritizeSafety] = useState(true);
  const [avoidPollution, setAvoidPollution] = useState(true);
  const [avoidPotholes, setAvoidPotholes] = useState(true);
  const [walkingSpeed, setWalkingSpeed] = useState(user?.walkingSpeed || 'moderate');

  // Recommendation Results
  const [recommendationResult, setRecommendationResult] = useState(null);
  const [inspectedRoute, setInspectedRoute] = useState(null);
  const [activeHazards, setActiveHazards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logSuccessMsg, setLogSuccessMsg] = useState('');

  // Modals state
  const [feedbackRoute, setFeedbackRoute] = useState(null);
  const [reportRoute, setReportRoute] = useState(null);
  const [isHazardModalOpen, setIsHazardModalOpen] = useState(false);
  const [hazardModalCoords, setHazardModalCoords] = useState(null);

  /**
   * Request GPS position using browser navigator.geolocation
   */
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser. Please select an origin landmark manually.');
      setUseGpsOrigin(false);
      return;
    }

    setGpsStatus('requesting');
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const coords = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || 15
        };
        setGpsCoords(coords);
        setGpsStatus('acquired');
        setUseGpsOrigin(true);

        // If a destination is already set, calculate routes immediately
        if (selectedDestination) {
          triggerRouteCalculation(coords, selectedDestination);
        }
      },
      (geoError) => {
        console.warn('Geolocation error:', geoError);
        let errorMsg = 'Failed to acquire GPS location.';
        if (geoError.code === 1) { // PERMISSION_DENIED
          setGpsStatus('denied');
          errorMsg = 'Location permission was denied. You can enable permissions in your browser or select your starting landmark manually below.';
        } else if (geoError.code === 2) { // POSITION_UNAVAILABLE
          setGpsStatus('error');
          errorMsg = 'GPS signal is currently unavailable on this device. Using manual origin selection.';
        } else if (geoError.code === 3) { // TIMEOUT
          setGpsStatus('error');
          errorMsg = 'Location request timed out. Please click "Detect My Location" to retry or pick a landmark.';
        }
        setGpsError(errorMsg);
        setUseGpsOrigin(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Initial load: fetch landmarks, verified hazards, and request GPS automatically
  useEffect(() => {
    async function init() {
      try {
        const [locData, hazardData] = await Promise.all([
          api.routes.getLocations(),
          api.reports.getAll({ status: 'verified' })
        ]);
        const locs = locData.locations || [];
        setLocations(locs);
        setActiveHazards(hazardData.reports || []);

        // Only set destination if explicitly provided (e.g. from a quick plan action)
        // Otherwise, destination is left unselected so the user chooses their own destination
        if (initialEnd) {
          const destLoc = locs.find(l => l.id === initialEnd);
          if (destLoc) {
            const initialDestObj = {
              name: destLoc.shortName || destLoc.name,
              label: `${destLoc.name} (${destLoc.type})`,
              lat: destLoc.lat || (destLoc.y ? 12.93 + (destLoc.y / 700) * 0.1 : 13.0219),
              lng: destLoc.lng || (destLoc.x ? 77.56 + (destLoc.x / 1000) * 0.08 : 77.5671)
            };
            setSelectedDestination(initialDestObj);
            setSearchQuery(initialDestObj.name);
          }
        }

        // Automatic GPS request on entering the route planner
        detectLocation();
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  /**
   * Clear destination and reset computed routes so user can choose a new destination
   */
  const handleClearDestination = () => {
    setSelectedDestination(null);
    setSearchQuery('');
    setFallbackEndNodeId('');
    setRecommendationResult(null);
    setInspectedRoute(null);
    setError('');
  };

  /**
   * Debounced Destination Autocomplete Search
   */
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const lat = gpsCoords?.lat || 12.9716;
        const lng = gpsCoords?.lng || 77.5946;
        const res = await api.routes.searchDestinations(val.trim(), lat, lng);
        setSearchResults(res.results || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Destination search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  /**
   * Select destination from search dropdown or landmarks
   */
  const handleSelectDestination = (dest) => {
    setSelectedDestination(dest);
    setSearchQuery(dest.name);
    setShowSearchDropdown(false);
    setError('');

    // Trigger calculation with current start point
    const startPoint = (useGpsOrigin && gpsCoords) ? gpsCoords : getManualStartCoords();
    if (startPoint) {
      triggerRouteCalculation(startPoint, dest);
    }
  };

  /**
   * Helper to resolve manual start coordinates from selected landmark
   */
  const getManualStartCoords = () => {
    const loc = locations.find(l => l.id === manualStartNodeId);
    if (!loc) return null;
    return {
      lat: loc.lat || (loc.y ? 12.93 + (loc.y / 700) * 0.1 : 12.9507),
      lng: loc.lng || (loc.x ? 77.56 + (loc.x / 1000) * 0.08 : 77.5848),
      name: loc.shortName || loc.name
    };
  };

  /**
   * Main Route Calculation Function
   */
  const triggerRouteCalculation = async (startPoint, destPoint) => {
    if (!startPoint || !destPoint) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        startCoords: { lat: startPoint.lat, lng: startPoint.lng },
        destinationCoords: { lat: destPoint.lat, lng: destPoint.lng },
        startLabel: useGpsOrigin && gpsCoords ? 'Current GPS Location' : (startPoint.name || 'Manual Starting Point'),
        destinationLabel: destPoint.name || destPoint.label || 'Selected Destination',
        walkingSpeed,
        preferences: {
          prioritizeGreenery,
          prioritizeSafety,
          avoidPollution,
          avoidPotholes
        }
      };

      const res = await api.routes.recommend(payload);
      setRecommendationResult(res);
      setInspectedRoute(res.recommendedRoute);
    } catch (err) {
      console.error('Route calculation error:', err);
      setError(err.message || 'Failed to compute walking routes. Please try another destination or adjust criteria.');
      setRecommendationResult(null);
      setInspectedRoute(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle swap: reverses origin and destination
   */
  const handleSwapEndpoints = () => {
    if (!selectedDestination) return;
    const currentOrigin = (useGpsOrigin && gpsCoords) ? gpsCoords : getManualStartCoords();
    if (!currentOrigin) return;

    // Switch origin to manual mode using destination coordinates
    setUseGpsOrigin(false);
    const newOriginLoc = {
      lat: selectedDestination.lat,
      lng: selectedDestination.lng,
      name: selectedDestination.name
    };

    const newDest = {
      lat: currentOrigin.lat,
      lng: currentOrigin.lng,
      name: currentOrigin.name || 'Previous Location',
      label: currentOrigin.name || `${currentOrigin.lat.toFixed(4)}, ${currentOrigin.lng.toFixed(4)}`
    };

    setSelectedDestination(newDest);
    setSearchQuery(newDest.name);
    triggerRouteCalculation(newOriginLoc, newDest);
  };

  /**
   * Clicking directly on the Leaflet map sets clicked point as destination
   */
  const handleMapClick = (clickCoords) => {
    const clickedDest = {
      lat: clickCoords.lat,
      lng: clickCoords.lng,
      name: `Point on Map (${clickCoords.lat.toFixed(4)}, ${clickCoords.lng.toFixed(4)})`,
      label: `Geographic coordinate [${clickCoords.lat.toFixed(5)}, ${clickCoords.lng.toFixed(5)}]`
    };
    handleSelectDestination(clickedDest);
  };

  const handleLogWalk = async (route) => {
    try {
      await api.routes.recommend({
        startCoords: route.startCoords,
        destinationCoords: route.destinationCoords,
        logWalk: true
      });
      setLogSuccessMsg(`Walk logged! +${route.distanceKm} km, +${route.caloriesBurned} kcal recorded to your profile.`);
      setTimeout(() => setLogSuccessMsg(''), 4000);
    } catch (e) {
      alert('Walk completed! Great job on choosing a healthy green walking route.');
    }
  };

  const currentActiveStart = (useGpsOrigin && gpsCoords) ? gpsCoords : getManualStartCoords();

  return (
    <div className="container" style={{ paddingBottom: '60px', paddingTop: '28px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-emerald">
              <Compass size={14} /> Rule-Based Health Engine
            </span>
            <span className="badge badge-sky">
              <Navigation size={14} /> Live GPS Routing
            </span>
            {recommendationResult?.routingProvider && (
              <span className="badge badge-slate" title="Directions Engine">
                {recommendationResult.routingProvider}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            Healthy Route Finder & Real GPS Navigation
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
            Real-time GPS walking routes evaluated for high tree shade, clean air, safe pedestrian walkways, and active road hazard avoidance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setHazardModalCoords(currentActiveStart);
            setIsHazardModalOpen(true);
          }}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#DC2626',
            borderColor: '#FECACA',
            fontWeight: '700',
            padding: '10px 16px',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)'
          }}
          title="Pin a road hazard directly at your current GPS location or on the map"
        >
          <AlertTriangle size={18} />
          Flag Road Hazard
        </button>
      </div>

      {logSuccessMsg && (
        <div style={{
          padding: '12px 18px',
          backgroundColor: '#D1FAE5',
          color: '#065F46',
          borderRadius: 'var(--radius-md)',
          fontWeight: '600',
          fontSize: '0.9rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} />
          {logSuccessMsg}
        </div>
      )}

      {/* Main Grid: Control Panel & Real Geographic Map */}
      <div className="route-planner-grid">
        {/* Left Side: Route Controls, GPS & Destination Search */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--slate-900)', margin: 0 }}>
              Route Parameters
            </h2>
            <button
              type="button"
              onClick={detectLocation}
              disabled={gpsStatus === 'requesting'}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Detect current device GPS coordinates"
            >
              {gpsStatus === 'requesting' ? (
                <>
                  <Loader2 size={13} className="spin-animation" /> Locating...
                </>
              ) : (
                <>
                  <Crosshair size={13} color="#059669" /> Detect My Location
                </>
              )}
            </button>
          </div>

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

          {/* GPS Status Box */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: gpsStatus === 'acquired' ? '#ECFDF5' : (gpsStatus === 'denied' || gpsStatus === 'error' ? '#FEF2F2' : '#F8FAFC'),
            border: `1px solid ${gpsStatus === 'acquired' ? '#A7F3D0' : (gpsStatus === 'denied' || gpsStatus === 'error' ? '#FECACA' : '#E2E8F0')}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.82rem'
          }}>
            {gpsStatus === 'requesting' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7' }}>
                <Loader2 size={15} className="spin-animation" />
                <span>Acquiring GPS fix from device sensors...</span>
              </div>
            )}

            {gpsStatus === 'acquired' && gpsCoords && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#065F46' }}>
                    <Navigation size={14} color="#059669" /> GPS Connected &bull; Active Origin
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                    ±{Math.round(gpsCoords.accuracy)}m Accuracy
                  </span>
                </div>
                <div style={{ marginTop: '4px', color: '#047857', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  Lat: {gpsCoords.lat.toFixed(5)} &bull; Lng: {gpsCoords.lng.toFixed(5)}
                </div>
              </div>
            )}

            {(gpsStatus === 'denied' || gpsStatus === 'error') && (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#991B1B' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '700' }}>GPS Notice</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '2px', lineHeight: '1.4' }}>{gpsError}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={detectLocation}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    Retry GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseGpsOrigin(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    Use Manual Origin
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Starting Origin Point */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                Starting Point (Point A)
              </label>

              {gpsStatus === 'acquired' && (
                <button
                  type="button"
                  onClick={() => setUseGpsOrigin(!useGpsOrigin)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {useGpsOrigin ? 'Switch to Manual Origin' : 'Use Live GPS Origin'}
                </button>
              )}
            </div>

            {useGpsOrigin && gpsCoords ? (
              <div style={{
                padding: '10px 14px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={16} color="#059669" />
                  <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#065F46' }}>
                    My Current Location (GPS)
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#047857' }}>
                  {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                </span>
              </div>
            ) : (
              <select
                className="form-select"
                value={manualStartNodeId}
                onChange={(e) => {
                  setManualStartNodeId(e.target.value);
                  setUseGpsOrigin(false);
                }}
              >
                <option value="">-- Choose Starting Landmark --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.shortName} ({loc.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Swap Button */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0 10px 0' }}>
            <button
              type="button"
              onClick={handleSwapEndpoints}
              disabled={!selectedDestination}
              className="btn btn-secondary btn-sm"
              title="Reverse Start and Destination"
              style={{ borderRadius: 'var(--radius-full)', padding: '4px 14px', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} />
              Swap Direction
            </button>
          </div>

          {/* Destination Search & Point B */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284C7' }} />
              Destination Search (Point B)
            </label>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search street, landmark, or park in city..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchDropdown(true);
                }}
                style={{ paddingLeft: '34px', paddingRight: '32px' }}
              />
              <Search
                size={16}
                color="var(--slate-400)"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              {searchLoading ? (
                <Loader2
                  size={15}
                  className="spin-animation"
                  color="#0284C7"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchDropdown(false);
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--slate-400)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>

            {/* Destination Autocomplete Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 2000,
                background: '#ffffff',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                border: '1px solid var(--slate-200)',
                marginTop: '4px',
                maxHeight: '260px',
                overflowY: 'auto'
              }}>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectDestination(result)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--slate-100)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--slate-50)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--slate-900)' }}>
                        {result.name}
                      </span>
                      <span className="badge badge-slate" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                        {result.type}
                      </span>
                    </div>
                    {result.label && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {result.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Destination Selection Confirmation Pill or Prompt */}
            {selectedDestination ? (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: '#F0F9FF',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369A1', fontWeight: '700', overflow: 'hidden' }}>
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {selectedDestination.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ color: 'var(--slate-500)', fontSize: '0.72rem' }}>
                    {selectedDestination.lat.toFixed(4)}, {selectedDestination.lng.toFixed(4)}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearDestination}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Clear selected destination"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed #CBD5E1',
                fontSize: '0.78rem',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <MapPin size={15} color="#0284C7" style={{ flexShrink: 0 }} />
                <span>Search above, pick from the landmark list below, or click anywhere directly on the map.</span>
              </div>
            )}

            {/* Quick Landmark Fallback Select */}
            <div style={{ marginTop: '8px' }}>
              <select
                className="form-select"
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                value={fallbackEndNodeId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFallbackEndNodeId(val);
                  if (!val) {
                    handleClearDestination();
                    return;
                  }
                  const loc = locations.find(l => l.id === val);
                  if (loc) {
                    handleSelectDestination({
                      name: loc.shortName || loc.name,
                      label: `${loc.name} (${loc.type})`,
                      lat: loc.lat || (loc.y ? 12.93 + (loc.y / 700) * 0.1 : 12.9796),
                      lng: loc.lng || (loc.x ? 77.56 + (loc.x / 1000) * 0.08 : 77.5908)
                    });
                  }
                }}
              >
                <option value="">-- Or Choose a Destination Landmark --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.shortName} ({loc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Walking Pace */}
          <div className="form-group">
            <label className="form-label">Walking Pace</label>
            <select
              className="form-select"
              value={walkingSpeed}
              onChange={(e) => setWalkingSpeed(e.target.value)}
            >
              <option value="leisurely">Leisurely Stroll (~3.8 km/h)</option>
              <option value="moderate">Moderate Health Walk (~4.8 km/h)</option>
              <option value="brisk">Brisk Power Walk (~5.6 km/h)</option>
            </select>
          </div>

          {/* Rule-Based Priority Toggles */}
          <div style={{
            background: 'var(--slate-50)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--slate-200)',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: '700',
              color: 'var(--slate-700)',
              marginBottom: '12px',
              textTransform: 'uppercase'
            }}>
              <Sliders size={14} /> Health Optimization Criteria
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prioritizeGreenery}
                  onChange={(e) => setPrioritizeGreenery(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trees size={15} color="#059669" /> Maximize Greenery & Shade (+35%)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avoidPollution}
                  onChange={(e) => setAvoidPollution(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Wind size={15} color="#0D9488" /> Bypass High Vehicular Exhaust (+25%)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prioritizeSafety}
                  onChange={(e) => setPrioritizeSafety(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={15} color="#0284C7" /> Prioritize Sidewalk Safety (+25%)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avoidPotholes}
                  onChange={(e) => setAvoidPotholes(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={15} color="#8B5CF6" /> Penalize Active Potholes & Hazards (+15%)
                </span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const start = (useGpsOrigin && gpsCoords) ? gpsCoords : getManualStartCoords();
              if (!start) {
                setError('Please enable GPS or select a starting landmark.');
                return;
              }
              if (!selectedDestination) {
                setError('Please search or select a destination.');
                return;
              }
              triggerRouteCalculation(start, selectedDestination);
            }}
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            <Compass size={18} />
            {loading ? 'Evaluating Health Indices...' : 'Calculate Healthy Route'}
          </button>
        </div>

        {/* Right Side: Real Geographic Leaflet Map */}
        <div>
          <MapVisualizer
            currentLocation={useGpsOrigin ? gpsCoords : null}
            manualStartLocation={!useGpsOrigin ? getManualStartCoords() : null}
            destinationLocation={selectedDestination}
            selectedRoute={inspectedRoute}
            alternativeRoutes={recommendationResult?.alternativeRoutes || []}
            activeHazardReports={activeHazards}
            locations={locations}
            onSelectLocation={(loc) => {
              handleSelectDestination({
                name: loc.shortName || loc.name,
                label: `${loc.name} (${loc.type})`,
                lat: loc.lat || (loc.y ? 12.93 + (loc.y / 700) * 0.1 : 12.9796),
                lng: loc.lng || (loc.x ? 77.56 + (loc.x / 1000) * 0.08 : 77.5908)
              });
            }}
            onMapClick={handleMapClick}
            onSelectRoute={(route) => setInspectedRoute(route)}
            onOpenReportModal={() => {
              setHazardModalCoords(currentActiveStart);
              setIsHazardModalOpen(true);
            }}
            onConfirmHazard={(updatedReport) => {
              setActiveHazards(prev => prev.map(h => h.id === updatedReport.id ? { ...h, confirmations: updatedReport.confirmations } : h));
              const start = (useGpsOrigin && gpsCoords) ? gpsCoords : getManualStartCoords();
              if (start && selectedDestination) {
                triggerRouteCalculation(start, selectedDestination);
              }
            }}
            height="530px"
          />

          <div style={{
            fontSize: '0.78rem',
            color: 'var(--slate-500)',
            marginTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '0 4px'
          }}>
            <span>Tip: Click anywhere on the map to set a walking destination.</span>
            <span>Click hazard markers to upvote (+1) or verify road status.</span>
          </div>
        </div>
      </div>

      {/* Informational Guidance Banner when waiting for Destination */}
      {!selectedDestination && (
        <div className="card" style={{
          marginTop: '24px',
          padding: '28px 24px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px dashed #93C5FD',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.05)'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: '#E0F2FE',
            color: '#0284C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto'
          }}>
            <MapPin size={22} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
            {useGpsOrigin && gpsCoords ? 'Current Location Acquired — Please Choose Your Destination' : 'Choose Your Walking Destination'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748B', maxWidth: '540px', margin: '0 auto', lineHeight: '1.5' }}>
            {useGpsOrigin && gpsCoords
              ? 'Your device GPS location is set as Point A. Search for a destination in the search box, pick from the landmark list, or click anywhere directly on the map to generate healthy walking routes.'
              : 'Search for any destination, pick from the landmark list, or click anywhere on the map to set your destination.'}
          </p>
        </div>
      )}

      {/* Recommended Route Card (Hero Feature) */}
      {inspectedRoute && (
        <div style={{ marginBottom: '24px', marginTop: '24px' }}>
          <RouteCard
            route={inspectedRoute}
            isRecommended={inspectedRoute.isRecommended}
            onLogWalk={handleLogWalk}
            onOpenFeedback={(r) => setFeedbackRoute(r)}
            onOpenReport={(r) => {
              setReportRoute(r);
              setHazardModalCoords(
                r.waypoints?.[Math.floor((r.waypoints?.length || 1) / 2)] 
                  ? { lat: r.waypoints[Math.floor(r.waypoints.length / 2)][0], lng: r.waypoints[Math.floor(r.waypoints.length / 2)][1] } 
                  : currentActiveStart
              );
              setIsHazardModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Alternative Routes Comparison Matrix Table */}
      {recommendationResult && (
        <RouteComparisonTable
          recommendedRoute={recommendationResult.recommendedRoute}
          alternativeRoutes={recommendationResult.alternativeRoutes}
          selectedRouteId={inspectedRoute?.id}
          onSelectRoute={(r) => setInspectedRoute(r)}
        />
      )}

      {/* Modals for Feedback & Hazard Reporting */}
      <FeedbackModal
        isOpen={Boolean(feedbackRoute)}
        route={feedbackRoute}
        onClose={() => setFeedbackRoute(null)}
        onFeedbackSubmitted={() => {
          // refresh details if needed
        }}
      />

      <ReportHazardModal
        isOpen={isHazardModalOpen || Boolean(reportRoute)}
        route={reportRoute}
        locations={locations}
        activeCoords={hazardModalCoords || currentActiveStart}
        onClose={() => {
          setIsHazardModalOpen(false);
          setReportRoute(null);
          setHazardModalCoords(null);
        }}
        onReportSubmitted={(newRep) => {
          setActiveHazards(prev => {
            const existsIndex = prev.findIndex(h => h.id === newRep.id);
            if (existsIndex !== -1) {
              const updated = [...prev];
              updated[existsIndex] = newRep;
              return updated;
            }
            return [newRep, ...prev];
          });
          const start = (useGpsOrigin && gpsCoords) ? gpsCoords : getManualStartCoords();
          if (start && selectedDestination) {
            triggerRouteCalculation(start, selectedDestination);
          }
        }}
      />
    </div>
  );
}
