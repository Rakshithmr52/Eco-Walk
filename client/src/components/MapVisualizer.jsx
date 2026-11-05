import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Crosshair,
  Info,
  Compass,
  CheckCircle2,
  ThumbsUp
} from 'lucide-react';
import { api } from '../services/api';

/**
 * Custom Leaflet HTML DivIcons
 * Designed to prevent missing asset errors and match EcoWalk styling
 */
const createUserGpsIcon = () => L.divIcon({
  className: 'leaflet-custom-div-icon',
  html: `
    <div class="user-gps-marker">
      <div class="user-gps-ping"></div>
      <div class="user-gps-dot">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14]
});

const createDestinationIcon = () => L.divIcon({
  className: 'leaflet-custom-div-icon',
  html: `
    <div class="destination-map-pin">
      <div class="destination-pin-body">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    </div>
  `,
  iconSize: [30, 36],
  iconAnchor: [15, 34],
  popupAnchor: [0, -34]
});

const createStartIcon = () => L.divIcon({
  className: 'leaflet-custom-div-icon',
  html: `
    <div class="manual-start-pin">
      <span>A</span>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13]
});

const createHazardIcon = (severity) => {
  const isCritical = severity === 'critical' || severity === 'high';
  const color = isCritical ? '#EF4444' : '#F59E0B';
  return L.divIcon({
    className: 'leaflet-custom-div-icon',
    html: `
      <div class="hazard-leaflet-pin" style="--hazard-color: ${color}">
        <span class="hazard-ping" style="background-color: ${color}"></span>
        <div class="hazard-center" style="background-color: ${color}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

const createLandmarkIcon = (shortName) => L.divIcon({
  className: 'leaflet-custom-div-icon',
  html: `
    <div class="landmark-badge-pin">
      <div class="landmark-dot"></div>
      <span class="landmark-text">${shortName}</span>
    </div>
  `,
  iconSize: [70, 22],
  iconAnchor: [35, 11]
});

/**
 * Bounds fitting handler that updates map view when coordinates or routes change
 */
function MapBoundsHandler({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: true });
    }
  }, [bounds, map]);
  return null;
}

/**
 * Interactive map click listener for setting destinations or manual starting points
 */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
}

/**
 * Custom Floating Control Toolbar for Zoom & Navigation
 */
function MapControls({ onRecenterGps, hasGps, onOpenReportModal }) {
  const map = useMap();
  return (
    <div className="leaflet-floating-toolbar">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="btn btn-secondary btn-sm"
        title="Zoom In"
        style={{ padding: '6px 10px' }}
      >
        <ZoomIn size={16} />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="btn btn-secondary btn-sm"
        title="Zoom Out"
        style={{ padding: '6px 10px' }}
      >
        <ZoomOut size={16} />
      </button>
      {hasGps && (
        <button
          type="button"
          onClick={onRecenterGps}
          className="btn btn-primary btn-sm"
          title="Center on Current GPS Location"
          style={{ padding: '6px 10px' }}
        >
          <Crosshair size={16} />
        </button>
      )}
      {onOpenReportModal && (
        <button
          type="button"
          onClick={onOpenReportModal}
          className="btn btn-secondary btn-sm"
          title="Pin Road Hazard at Location"
          style={{ padding: '6px 10px', color: '#DC2626', borderColor: '#FECACA' }}
        >
          <AlertTriangle size={16} />
        </button>
      )}
    </div>
  );
}

export default function MapVisualizer({
  currentLocation = null, // { lat, lng, accuracy }
  destinationLocation = null, // { lat, lng, name, label }
  manualStartLocation = null, // { lat, lng, name }
  selectedRoute = null,
  alternativeRoutes = [],
  activeHazardReports = [],
  locations = [],
  onSelectRoute = null,
  onMapClick = null,
  onSelectLocation = null,
  onOpenReportModal = null,
  onConfirmHazard = null,
  height = '540px'
}) {
  const [showHazards, setShowHazards] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showAccuracyCircle, setShowAccuracyCircle] = useState(true);
  const [showRadiusCircle, setShowRadiusCircle] = useState(true);
  const [confirmedHazards, setConfirmedHazards] = useState({});
  const [confirmingId, setConfirmingId] = useState(null);
  const mapRef = useRef(null);

  // Handle in-map hazard confirmation (+1)
  const handleConfirmHazard = async (report) => {
    setConfirmingId(report.id);
    try {
      const res = await api.reports.confirm(report.id);
      const newCount = res.report?.confirmations || ((report.confirmations || 1) + 1);
      setConfirmedHazards(prev => ({
        ...prev,
        [report.id]: newCount
      }));
      if (onConfirmHazard) {
        onConfirmHazard(res.report || { ...report, confirmations: newCount });
      }
    } catch (err) {
      console.warn('Failed to confirm hazard:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  // Default coordinate center (Bengaluru civic hub or current GPS)
  const defaultCenter = [
    currentLocation?.lat || 12.9716,
    currentLocation?.lng || 77.5946
  ];

  // Compute map bounds encompassing active locations & routes
  const bounds = React.useMemo(() => {
    const latLngs = [];

    if (currentLocation && typeof currentLocation.lat === 'number') {
      latLngs.push([currentLocation.lat, currentLocation.lng]);
    }
    if (manualStartLocation && typeof manualStartLocation.lat === 'number') {
      latLngs.push([manualStartLocation.lat, manualStartLocation.lng]);
    }
    if (destinationLocation && typeof destinationLocation.lat === 'number') {
      latLngs.push([destinationLocation.lat, destinationLocation.lng]);
    }
    if (selectedRoute && Array.isArray(selectedRoute.waypoints) && selectedRoute.waypoints.length > 0) {
      selectedRoute.waypoints.forEach(pt => {
        if (Array.isArray(pt) && pt.length >= 2) latLngs.push(pt);
      });
    }
    if (Array.isArray(alternativeRoutes) && alternativeRoutes.length > 0) {
      alternativeRoutes.forEach(alt => {
        if (alt && Array.isArray(alt.waypoints)) {
          alt.waypoints.forEach(pt => {
            if (Array.isArray(pt) && pt.length >= 2) latLngs.push(pt);
          });
        }
      });
    }

    if (latLngs.length === 0) return null;
    if (latLngs.length === 1) {
      const [lat, lng] = latLngs[0];
      return L.latLngBounds([[lat - 0.005, lng - 0.005], [lat + 0.005, lng + 0.005]]);
    }
    return L.latLngBounds(latLngs);
  }, [currentLocation, destinationLocation, manualStartLocation, selectedRoute]);

  const handleRecenterGps = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], 16, { animate: true });
    }
  };

  return (
    <div className="map-container" style={{ height, position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Top Left: Active Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        border: '1px solid var(--primary-100)'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#10B981',
          boxShadow: '0 0 8px #10B981'
        }} />
        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary-900)' }}>
          Real Geographic Map • OpenStreetMap & ORS
        </span>
      </div>

      {/* Top Right: Layer Visibility Toggles */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        border: '1px solid var(--slate-200)',
        fontSize: '0.78rem',
        fontWeight: '600',
        color: 'var(--slate-700)'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showHazards}
            onChange={(e) => setShowHazards(e.target.checked)}
          />
          <span>Road Hazards ({activeHazardReports.length})</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showLandmarks}
            onChange={(e) => setShowLandmarks(e.target.checked)}
          />
          <span>Civic Landmarks</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showRadiusCircle}
            onChange={(e) => setShowRadiusCircle(e.target.checked)}
          />
          <span style={{ color: '#0284C7', fontWeight: '700' }}>5 km Walk Radius</span>
        </label>

        {currentLocation && currentLocation.accuracy && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showAccuracyCircle}
              onChange={(e) => setShowAccuracyCircle(e.target.checked)}
            />
            <span>GPS Radius (±{Math.round(currentLocation.accuracy)}m)</span>
          </label>
        )}
      </div>

      {/* Main Real Interactive Leaflet Map */}
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={false}
        ref={mapRef}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        {/* OpenStreetMap Standard Tile Layer with Mandatory Attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Map Click & Bounds Controllers */}
        <MapClickHandler onMapClick={onMapClick} />
        <MapBoundsHandler bounds={bounds} />
        <MapControls
          onRecenterGps={handleRecenterGps}
          hasGps={Boolean(currentLocation)}
          onOpenReportModal={onOpenReportModal}
        />

        {/* Current GPS Location Marker with Pulsing Ring & Accuracy Circle */}
        {currentLocation && typeof currentLocation.lat === 'number' && (
          <>
            {showAccuracyCircle && currentLocation.accuracy && (
              <Circle
                center={[currentLocation.lat, currentLocation.lng]}
                radius={currentLocation.accuracy}
                pathOptions={{
                  color: '#10B981',
                  fillColor: '#10B981',
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: '4, 4'
                }}
              />
            )}
            <Marker
              position={[currentLocation.lat, currentLocation.lng]}
              icon={createUserGpsIcon()}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: '800' }}>
                    <Navigation size={14} /> Your GPS Location
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                    Latitude: <strong>{currentLocation.lat.toFixed(5)}</strong><br />
                    Longitude: <strong>{currentLocation.lng.toFixed(5)}</strong>
                  </div>
                  {currentLocation.accuracy && (
                    <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '4px', fontWeight: '600' }}>
                      Accuracy: ±{Math.round(currentLocation.accuracy)} meters
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Manual Starting Point Marker (when GPS is not used) */}
        {!currentLocation && manualStartLocation && typeof manualStartLocation.lat === 'number' && (
          <Marker
            position={[manualStartLocation.lat, manualStartLocation.lng]}
            icon={createStartIcon()}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <div style={{ fontWeight: '800', color: '#059669' }}>
                  Starting Location (Point A)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '2px' }}>
                  {manualStartLocation.name || `${manualStartLocation.lat.toFixed(4)}, ${manualStartLocation.lng.toFixed(4)}`}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 5 km Walking Radius Boundary Circle around Active Origin */}
        {showRadiusCircle && (currentLocation || manualStartLocation) && (
          <Circle
            center={[
              (currentLocation || manualStartLocation).lat,
              (currentLocation || manualStartLocation).lng
            ]}
            radius={5000}
            pathOptions={{
              color: '#0284C7',
              fillColor: '#38BDF8',
              fillOpacity: 0.05,
              weight: 2,
              dashArray: '6, 6'
            }}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <div style={{ fontWeight: '800', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Navigation size={14} /> 5 km Walking Radius Zone
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '4px', lineHeight: '1.4' }}>
                  Pedestrian destination limit. Destinations selected via search, landmark dropdown, or map click must be located within this 5 km zone.
                </div>
              </div>
            </Popup>
          </Circle>
        )}

        {/* Destination Marker */}
        {destinationLocation && typeof destinationLocation.lat === 'number' && (
          <Marker
            position={[destinationLocation.lat, destinationLocation.lng]}
            icon={createDestinationIcon()}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284C7', fontWeight: '800' }}>
                  <MapPin size={14} /> Destination (Point B)
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--slate-900)', marginTop: '4px' }}>
                  {destinationLocation.name || 'Selected Destination'}
                </div>
                {destinationLocation.label && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--slate-600)', marginTop: '2px' }}>
                    {destinationLocation.label}
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                  {destinationLocation.lat.toFixed(5)}, {destinationLocation.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Alternative Route Polylines (Vibrant Azure Blue with Blue Halo) */}
        {alternativeRoutes.map((altRoute, idx) => {
          if (selectedRoute && selectedRoute.id === altRoute.id) return null;
          if (!altRoute.waypoints || altRoute.waypoints.length === 0) return null;

          return (
            <React.Fragment key={altRoute.id || idx}>
              {/* Soft Azure Blue Halo */}
              <Polyline
                positions={altRoute.waypoints}
                pathOptions={{
                  color: '#BAE6FD',
                  weight: 10,
                  opacity: 0.65,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* Interactive Sky Blue Walking Route Line */}
              <Polyline
                positions={altRoute.waypoints}
                pathOptions={{
                  color: '#0284C7',
                  weight: 5.5,
                  opacity: 0.95,
                  dashArray: '8, 8',
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                eventHandlers={{
                  click: () => onSelectRoute && onSelectRoute(altRoute)
                }}
              >
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369A1', fontWeight: '800' }}>
                      <Compass size={15} /> {altRoute.isRecommended ? '⭐ Route 1 (Recommended Best Match)' : '🚶 Route 2 (Alternative Path)'}
                    </div>
                    <div style={{ fontWeight: '800', color: 'var(--slate-900)', marginTop: '4px' }}>
                      {altRoute.name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                      Distance: <strong>{altRoute.distanceKm} km</strong> &bull; Walk Time: <strong>{altRoute.estimatedMinutes} mins</strong>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#0369A1', marginTop: '2px', fontWeight: '700' }}>
                      Health Score: {altRoute.healthScore} / 100
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectRoute && onSelectRoute(altRoute)}
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '8px', width: '100%', fontSize: '0.78rem', padding: '5px 10px' }}
                    >
                      Inspect this Route
                    </button>
                  </div>
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* Recommended / Selected Route Polylines (Dual glow & trunk) */}
        {selectedRoute && selectedRoute.waypoints && selectedRoute.waypoints.length > 0 && (
          <>
            {/* Soft Green Halo */}
            <Polyline
              positions={selectedRoute.waypoints}
              pathOptions={{
                color: '#A7F3D0',
                weight: 10,
                opacity: 0.75,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            {/* Primary Emerald Route Line */}
            <Polyline
              positions={selectedRoute.waypoints}
              pathOptions={{
                color: '#059669',
                weight: 5.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: '800' }}>
                    <CheckCircle2 size={16} /> Recommended Healthy Route
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--slate-900)', marginTop: '4px' }}>
                    {selectedRoute.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                    Distance: <strong>{selectedRoute.distanceKm} km</strong> &bull; Walk Time: <strong>{selectedRoute.estimatedMinutes} mins</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#059669', marginTop: '2px', fontWeight: '700' }}>
                    Health Score: {selectedRoute.healthScore} / 100
                  </div>
                  {selectedRoute.airQualityTag && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      Air Quality: {selectedRoute.airQualityTag}
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          </>
        )}

        {/* Active Hazard Markers */}
        {showHazards && activeHazardReports.map(report => {
          let rLat, rLng;
          if (Array.isArray(report.coordinates) && report.coordinates.length >= 2) {
            rLat = report.coordinates[0];
            rLng = report.coordinates[1];
          } else if (report.lat && report.lng) {
            rLat = report.lat;
            rLng = report.lng;
          }

          if (rLat === undefined || rLng === undefined) return null;

          const currentConfirms = confirmedHazards[report.id] || report.confirmations || 1;
          const isConfirmed = Boolean(confirmedHazards[report.id]);

          return (
            <Marker
              key={report.id}
              position={[rLat, rLng]}
              icon={createHazardIcon(report.severity)}
            >
              <Popup>
                <div style={{ padding: '4px', maxWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className={`badge ${report.severity === 'critical' || report.severity === 'high' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                      <AlertTriangle size={11} /> {report.issueType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '800' }}>
                      👥 {currentConfirms} {currentConfirms === 1 ? 'Walker' : 'Walkers'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--slate-900)' }}>
                    {report.locationName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '4px', lineHeight: '1.4' }}>
                    {report.description}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '4px' }}>
                    Coords: {rLat.toFixed(5)}, {rLng.toFixed(5)}
                  </div>
                  {report.imageUrl && (
                    <img
                      src={report.imageUrl}
                      alt="Hazard snapshot"
                      style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px' }}
                    />
                  )}

                  {/* 1-Click Community Hazard Confirmation */}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--slate-200)' }}>
                    <button
                      type="button"
                      onClick={() => handleConfirmHazard(report)}
                      disabled={isConfirmed || confirmingId === report.id}
                      className="btn btn-secondary btn-sm"
                      style={{
                        width: '100%',
                        fontSize: '0.74rem',
                        padding: '5px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        backgroundColor: isConfirmed ? '#D1FAE5' : '#F1F5F9',
                        color: isConfirmed ? '#065F46' : 'var(--slate-800)',
                        borderColor: isConfirmed ? '#10B981' : 'var(--slate-300)'
                      }}
                    >
                      <ThumbsUp size={12} />
                      {isConfirmed ? '✓ You Confirmed This (+1)' : 'Confirm I Saw This Too (+1)'}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Optional Civic Landmarks */}
        {showLandmarks && locations.map(loc => {
          if (!loc.lat || !loc.lng) return null;
          return (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={createLandmarkIcon(loc.shortName || loc.name)}
              eventHandlers={{
                click: () => onSelectLocation && onSelectLocation(loc)
              }}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <div style={{ fontWeight: '800', color: 'var(--slate-900)' }}>{loc.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '2px' }}>{loc.description}</div>
                  <button
                    type="button"
                    onClick={() => onSelectLocation && onSelectLocation(loc)}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '6px', width: '100%', fontSize: '0.75rem', padding: '4px' }}
                  >
                    Set as Destination
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Footer Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        border: '1px solid var(--slate-200)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        fontSize: '0.74rem',
        fontWeight: '600',
        color: 'var(--slate-700)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '4px', backgroundColor: '#059669', borderRadius: '2px' }} />
          <span>Recommended Route</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '3px', borderTop: '3px dashed #64748B' }} />
          <span>Alternative Route</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <span>Hazard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#059669', border: '2px solid #ffffff' }} />
          <span>GPS Start</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#0284C7', border: '2px solid #ffffff' }} />
          <span>Destination</span>
        </div>
      </div>
    </div>
  );
}
