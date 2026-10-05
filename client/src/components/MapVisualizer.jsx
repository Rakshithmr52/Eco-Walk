import React, { useState } from 'react';
import { 
  MapPin, 
  Trees, 
  Waves, 
  AlertTriangle, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Layers,
  Info
} from 'lucide-react';

export default function MapVisualizer({
  locations = [],
  selectedRoute = null,
  alternativeRoutes = [],
  activeHazardReports = [],
  onSelectLocation = null,
  onSelectRoute = null,
  startNodeId = null,
  endNodeId = null,
  height = '540px'
}) {
  const [zoom, setZoom] = useState(1);
  const [showHazards, setShowHazards] = useState(true);
  const [showCanopy, setShowCanopy] = useState(true);
  const [hoveredHazard, setHoveredHazard] = useState(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.8));
  const handleResetZoom = () => setZoom(1);

  // SVG polyline points formatter
  const formatPoints = (waypoints) => {
    if (!waypoints || waypoints.length === 0) return '';
    return waypoints.map(pt => `${pt[0]},${pt[1]}`).join(' ');
  };

  return (
    <div className="map-container" style={{ height, position: 'relative', width: '100%' }}>
      {/* Floating Control Toolbar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          border: '1px solid var(--slate-200)'
        }}>
          <button
            onClick={handleZoomIn}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
            title="Reset View"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Layer Toggles */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          padding: '8px 12px',
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
              checked={showCanopy}
              onChange={(e) => setShowCanopy(e.target.checked)}
            />
            <span>Greenery Zones</span>
          </label>
        </div>
      </div>

      {/* Floating Mode Indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
          Bengaluru Eco-Walking Network • Local Vector Map
        </span>
      </div>

      {/* Main SVG Vector Canvas */}
      <svg
        viewBox="0 0 1000 700"
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.25s ease'
        }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="parkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="routeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Grid pattern */}
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="#CBD5E1" opacity="0.6" />
          </pattern>

          {/* Shadow Filter */}
          <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Background Grid */}
        <rect width="1000" height="700" fill="#F8FAFC" />
        <rect width="1000" height="700" fill="url(#gridPattern)" />

        {/* District Terrain - Water Bodies */}
        {/* Ulsoor Lake / Sankey Tank (North-East) */}
        <path
          d="M 720 80 C 780 70, 920 90, 940 180 C 950 250, 890 280, 800 250 C 740 230, 680 160, 720 80 Z"
          fill="url(#waterGrad)"
          stroke="#38BDF8"
          strokeWidth="2"
        />
        <text x="830" y="130" fill="#0284C7" fontSize="11" fontWeight="700" opacity="0.7">
          ULSOOR LAKE
        </text>

        {/* Lakeside Promenade Corridor (Eastern Valley) */}
        <path
          d="M 850 300 Q 820 420 870 540 T 920 680 L 980 680 L 980 300 Z"
          fill="url(#waterGrad)"
          stroke="#38BDF8"
          strokeWidth="1.5"
          opacity="0.85"
        />
        <text x="890" y="470" fill="#0284C7" fontSize="10" fontWeight="700" transform="rotate(75, 890, 470)" opacity="0.6">
          SANKEY ECO CORRIDOR
        </text>

        {/* District Terrain - Greenery Canopies */}
        {showCanopy && (
          <g>
            {/* Botanical Gardens / Cubbon Park Zone */}
            <path
              d="M 80 80 C 180 60, 290 80, 310 180 C 320 260, 220 280, 140 260 C 70 240, 50 140, 80 80 Z"
              fill="url(#parkGrad)"
              stroke="#6EE7B7"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <text x="140" y="115" fill="#065F46" fontSize="11" fontWeight="700" opacity="0.65">
              CUBBON PARK & LALBAGH BOTANICAL ARBORETUM
            </text>

            {/* South Green Reserve */}
            <path
              d="M 120 520 C 200 500, 280 540, 260 660 C 180 670, 90 640, 120 520 Z"
              fill="url(#parkGrad)"
              stroke="#6EE7B7"
              strokeWidth="1.5"
              opacity="0.8"
            />

            {/* Central Civic Garden */}
            <rect
              x="420"
              y="320"
              width="140"
              height="100"
              rx="20"
              fill="url(#parkGrad)"
              stroke="#6EE7B7"
              strokeWidth="1.5"
              opacity="0.7"
            />

            {/* Tree Clusters */}
            {[
              [120, 140], [220, 160], [160, 220], [250, 110], [450, 340],
              [520, 360], [770, 140], [860, 200], [800, 480], [840, 580]
            ].map(([tx, ty], i) => (
              <g key={i} transform={`translate(${tx}, ${ty}) scale(0.65)`} opacity="0.5">
                <circle cx="0" cy="0" r="14" fill="#10B981" />
                <circle cx="-6" cy="-4" r="10" fill="#34D399" />
                <circle cx="6" cy="-4" r="9" fill="#059669" />
              </g>
            ))}
          </g>
        )}

        {/* Base Street & Boulevard Network */}
        <g stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          {/* Main East-West Boulevard */}
          <line x1="180" y1="140" x2="460" y2="170" />
          <line x1="460" y1="170" x2="820" y2="160" />
          
          {/* Mid East-West Avenue */}
          <line x1="190" y1="380" x2="480" y2="370" />
          <line x1="480" y1="370" x2="760" y2="380" />

          {/* South East-West Boulevard */}
          <line x1="160" y1="590" x2="320" y2="570" />
          <line x1="320" y1="570" x2="610" y2="560" />
          <line x1="610" y1="560" x2="880" y2="570" />

          {/* North-South Corridors */}
          <line x1="180" y1="140" x2="190" y2="380" />
          <line x1="190" y1="380" x2="160" y2="590" />
          
          <line x1="460" y1="170" x2="480" y2="370" />
          <line x1="480" y1="370" x2="320" y2="570" />
          <line x1="480" y1="370" x2="610" y2="560" />

          <line x1="820" y1="160" x2="840" y2="350" />
          <line x1="840" y1="350" x2="760" y2="380" />
          <line x1="760" y1="380" x2="880" y2="570" />
        </g>

        {/* Inner pedestrian sidewalk overlay */}
        <g stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3">
          <line x1="180" y1="140" x2="460" y2="170" />
          <line x1="460" y1="170" x2="820" y2="160" />
          <line x1="190" y1="380" x2="480" y2="370" />
          <line x1="480" y1="370" x2="760" y2="380" />
          <line x1="320" y1="570" x2="610" y2="560" />
          <line x1="610" y1="560" x2="880" y2="570" />
        </g>

        {/* Alternative Routes (Dashed comparison paths) */}
        {alternativeRoutes.map((altRoute, index) => {
          const isSelected = selectedRoute && selectedRoute.id === altRoute.id;
          if (isSelected) return null; // rendered as selected route below
          return (
            <g 
              key={altRoute.id || index}
              onClick={() => onSelectRoute && onSelectRoute(altRoute)}
              style={{ cursor: 'pointer' }}
            >
              {/* Outer clickable buffer */}
              <polyline
                points={formatPoints(altRoute.waypoints)}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />
              {/* Visible dashed line */}
              <polyline
                points={formatPoints(altRoute.waypoints)}
                fill="none"
                stroke="#94A3B8"
                strokeWidth="4.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Selected / Recommended Route Highlighting */}
        {selectedRoute && selectedRoute.waypoints && (
          <g>
            {/* Glowing background halo */}
            <polyline
              points={formatPoints(selectedRoute.waypoints)}
              fill="none"
              stroke="#A7F3D0"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
            {/* Solid vibrant route trunk */}
            <polyline
              points={formatPoints(selectedRoute.waypoints)}
              fill="none"
              stroke="url(#routeGlowGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dynamic animated dash line representing walkers moving */}
            <polyline
              className="route-path-animated"
              points={formatPoints(selectedRoute.waypoints)}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Waypoint nodes along path */}
            {selectedRoute.waypoints.slice(1, -1).map((pt, idx) => (
              <circle
                key={idx}
                cx={pt[0]}
                cy={pt[1]}
                r="4.5"
                fill="#ffffff"
                stroke="#047857"
                strokeWidth="2.5"
              />
            ))}
          </g>
        )}

        {/* Active Hazard Markers (Potholes, drainage, obstructions) */}
        {showHazards && activeHazardReports.map(report => {
          const [rx, ry] = report.coordinates || [450, 350];
          const isPothole = report.issueType === 'pothole';
          const isCritical = report.severity === 'critical' || report.severity === 'high';
          const markerColor = isCritical ? '#EF4444' : '#F59E0B';

          return (
            <g
              key={report.id}
              transform={`translate(${rx}, ${ry})`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredHazard(report)}
              onMouseLeave={() => setHoveredHazard(null)}
              onClick={() => setHoveredHazard(report)}
            >
              {/* Pulsing hazard ring */}
              <circle
                cx="0"
                cy="0"
                r="12"
                fill={markerColor}
                opacity="0.3"
                className="hazard-marker-pulse"
              />
              <circle
                cx="0"
                cy="0"
                r="7"
                fill={markerColor}
                stroke="#ffffff"
                strokeWidth="2"
                filter="url(#pinShadow)"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="8"
                fontWeight="900"
              >
                !
              </text>
            </g>
          );
        })}

        {/* District Landmarks / Nodes */}
        {locations.map(loc => {
          const isStart = startNodeId === loc.id;
          const isEnd = endNodeId === loc.id;
          let pinBg = '#0F172A';
          let pinRadius = 14;

          if (isStart) {
            pinBg = '#10B981';
            pinRadius = 18;
          } else if (isEnd) {
            pinBg = '#0284C7';
            pinRadius = 18;
          }

          return (
            <g
              key={loc.id}
              className="landmark-pin"
              transform={`translate(${loc.x}, ${loc.y})`}
              onClick={() => onSelectLocation && onSelectLocation(loc)}
              onMouseEnter={() => setHoveredLocation(loc)}
              onMouseLeave={() => setHoveredLocation(null)}
            >
              {/* Pin Halo */}
              {(isStart || isEnd) && (
                <circle
                  cx="0"
                  cy="0"
                  r={pinRadius + 6}
                  fill={isStart ? '#A7F3D0' : '#BAE6FD'}
                  opacity="0.8"
                />
              )}

              {/* Pin Base Circle */}
              <circle
                cx="0"
                cy="0"
                r={pinRadius}
                fill={pinBg}
                stroke="#ffffff"
                strokeWidth="3"
                filter="url(#pinShadow)"
              />

              {/* Pin Center Dot or Indicator */}
              {isStart ? (
                <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                  A
                </text>
              ) : isEnd ? (
                <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                  B
                </text>
              ) : (
                <circle cx="0" cy="0" r="4.5" fill="#ffffff" />
              )}

              {/* Landmark Label Plate */}
              <g transform="translate(0, 24)">
                <rect
                  x="-65"
                  y="-12"
                  width="130"
                  height="22"
                  rx="6"
                  fill="rgba(15, 23, 42, 0.85)"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  {loc.shortName || loc.name}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip for Hazard Pin */}
      {hoveredHazard && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          zIndex: 30,
          background: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          maxWidth: '320px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
          border: '1px solid var(--slate-200)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className={`badge ${hoveredHazard.severity === 'critical' || hoveredHazard.severity === 'high' ? 'badge-rose' : 'badge-amber'}`}>
              <AlertTriangle size={12} />
              {hoveredHazard.issueType.replace('_', ' ').toUpperCase()}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'capitalize' }}>
              Status: <strong>{hoveredHazard.status}</strong>
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--slate-900)' }}>
            {hoveredHazard.locationName}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '4px' }}>
            {hoveredHazard.description}
          </div>
        </div>
      )}

      {/* Hover Tooltip for Landmark */}
      {hoveredLocation && !hoveredHazard && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          zIndex: 30,
          background: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          maxWidth: '300px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
          border: '1px solid var(--slate-200)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <MapPin size={16} color="var(--primary-600)" />
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--slate-900)' }}>
              {hoveredLocation.name}
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--slate-600)', lineHeight: '1.4' }}>
            {hoveredLocation.description}
          </p>
          <div style={{ fontSize: '0.72rem', color: 'var(--primary-700)', fontWeight: '600', marginTop: '6px' }}>
            Simulated Air Quality: {hoveredLocation.ambientAirQuality} (Sample estimate)
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 20,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        padding: '10px 16px',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        border: '1px solid var(--slate-200)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--slate-700)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '18px', height: '5px', backgroundColor: '#059669', borderRadius: '2px' }} />
          <span>Recommended Route</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '18px', height: '4px', borderTop: '3px dashed #94A3B8' }} />
          <span>Alternative Route</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <span>Road Hazard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#A7F3D0', borderRadius: '3px' }} />
          <span>Greenery Canopy</span>
        </div>
      </div>
    </div>
  );
}
