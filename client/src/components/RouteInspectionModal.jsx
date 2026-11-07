import React from 'react';
import { 
  X, 
  Sparkles, 
  Trees, 
  ShieldCheck, 
  Wind, 
  Activity, 
  AlertTriangle, 
  ExternalLink,
  Info,
  CheckCircle2,
  Navigation
} from 'lucide-react';

export default function RouteInspectionModal({
  isOpen,
  route,
  onClose
}) {
  if (!isOpen || !route) return null;

  const maut = route.mautBreakdown || {
    weights: {
      greenery: 0.35,
      safety: 0.25,
      cleanAir: 0.25,
      roadQuality: 0.15
    },
    subScores: {
      greeneryScore: route.greeneryScore || 50,
      safetyScore: route.safetyScore || 70,
      cleanAirScore: route.cleanAirScore !== undefined ? route.cleanAirScore : Math.max(0, 100 - (route.trafficPollutionRisk || 35)),
      roadQualityScore: route.roadQualityScore || route.effectiveRoadCondition || 85
    },
    contributions: {
      greenery: Number((0.35 * (route.greeneryScore || 50)).toFixed(2)),
      safety: Number((0.25 * (route.safetyScore || 70)).toFixed(2)),
      cleanAir: Number((0.25 * (route.cleanAirScore || 75)).toFixed(2)),
      roadQuality: Number((0.15 * (route.roadQualityScore || 85)).toFixed(2))
    },
    rawHealthScore: route.healthScore || 80,
    distancePenalty: 0,
    finalHealthScore: route.healthScore || 80
  };

  const how = route.howEcoWalkEvaluates;
  const cpcb = route.cpcbStation;
  const hazards = route.hazardData || { penalty: 0, reportCount: 0, reportDetails: [] };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 3000 }}>
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--slate-200)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge ${route.isRecommended ? 'badge-emerald' : 'badge-sky'}`}>
                {route.isRecommended ? '★ Recommended Route' : 'Alternative Route'}
              </span>
              <span className="badge badge-slate" style={{ fontSize: '0.72rem' }}>
                Detailed Route Audit
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--slate-900)', margin: 0 }}>
              {route.name}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', margin: '4px 0 0 0' }}>
              Full Multi-Criteria Health Score (MAUT) & Environmental Traceability Breakdown
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Health Score Summary Banner */}
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
              Final Health Recommendation Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#059669', lineHeight: 1 }}>
                {route.healthScore}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#64748B' }}>/ 100</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.74rem' }}>Distance</div>
              <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '0.96rem' }}>{route.distanceKm} km</div>
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.74rem' }}>Est. Time</div>
              <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '0.96rem' }}>~{route.estimatedMinutes} mins</div>
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.74rem' }}>Distance Penalty</div>
              <div style={{ fontWeight: '800', color: maut.distancePenalty > 0 ? '#DC2626' : '#059669', fontSize: '0.96rem' }}>
                -{maut.distancePenalty} pts
              </div>
            </div>
          </div>
        </div>

        {/* Detailed 4 Sub-Score Criteria Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          
          {/* Sub-Score 1: Greenery Proximity / Coverage */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trees size={18} color="#059669" />
                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Greenery Proximity & Coverage Score (G)
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '850', color: '#059669' }}>
                  {maut.subScores.greeneryScore} / 100
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  (Weight: {maut.weights.greenery} &bull; Contrib: +{maut.contributions.greenery})
                </span>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Data Source:</strong> OpenStreetMap (OSM) verified parks, gardens, and urban tree canopy reserves (<code>leisure=park</code>, <code>natural=wood</code>).
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Spatial Proximity Buffer:</strong> Evaluated across {route.greeneryDetails?.totalSegmentsEvaluated || 'multiple'} discrete 50-meter walking segments using 150m spatial buffer decay. Segments within 150m: <strong>{route.greeneryDetails?.segmentCoveragePct || 0}%</strong>.
              </p>
              {route.greeneryDetails?.matchedGreenSpaces && route.greeneryDetails.matchedGreenSpaces.length > 0 && (
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong>Nearby Green Spaces:</strong> {route.greeneryDetails.matchedGreenSpaces.join(', ')}.
                </p>
              )}
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.74rem', color: '#64748B' }}>
                <strong>Limitation:</strong> Proximity to mapped public parks and tree canopies; does not guarantee continuous private overhead awnings.
              </p>
            </div>
          </div>

          {/* Sub-Score 2: Pedestrian Infrastructure Safety */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#0284C7" />
                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Pedestrian Infrastructure Safety Score (S)
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '850', color: '#0284C7' }}>
                  {maut.subScores.safetyScore} / 100
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  (Weight: {maut.weights.safety} &bull; Contrib: +{maut.contributions.safety})
                </span>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Data Source:</strong> OpenStreetMap footway/sidewalk tags (<code>highway=footway</code>, <code>footway=sidewalk</code>, crossings).
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Infrastructure Assessment:</strong> {route.pedestrianSafetyDetails?.sidewalkCoveragePct || 0}% designated pedestrian footways/sidewalks. Unclassified tags are handled neutrally as UNKNOWN ({route.pedestrianSafetyDetails?.unknownInfrastructurePct || 0}%) rather than penalized.
              </p>
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.74rem', color: '#64748B' }}>
                <strong>Disclaimer:</strong> Measures physical pedestrian infrastructure separation from vehicular motorways; does not measure crime rates.
              </p>
            </div>
          </div>

          {/* Sub-Score 3: CPCB Clean Air Score */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wind size={18} color="#0D9488" />
                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  CPCB Clean Air Score (C)
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '850', color: '#0D9488' }}>
                  {maut.subScores.cleanAirScore} / 100
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  (Weight: {maut.weights.cleanAir} &bull; Contrib: +{maut.contributions.cleanAir})
                </span>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Data Source:</strong> Official Central Pollution Control Board (CPCB) CAAQMS Station (<a href="https://airquality.cpcb.gov.in/AQI_India/" target="_blank" rel="noopener noreferrer" style={{ color: '#059669', textDecoration: 'underline' }}>airquality.cpcb.gov.in</a>).
              </p>
              {cpcb && (
                <div style={{ backgroundColor: '#F0FDF4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #DCFCE7', margin: '8px 0' }}>
                  <div>Matched Station: <strong>{cpcb.name}</strong> ({cpcb.locality})</div>
                  <div>Station Distance to Route: <strong>{route.cpcbDistanceKm || cpcb.distanceToRouteKm || 0} km</strong></div>
                  <div>Raw Grounded CPCB AQI: <strong>{route.cpcbAqi}</strong> ({route.cpcbCategory || 'Satisfactory'}) &bull; Pollutant: <strong>{cpcb.prominentPollutant || 'PM2.5'}</strong></div>
                  <div>Last Updated: <strong>{cpcb.lastUpdated ? new Date(cpcb.lastUpdated).toLocaleString('en-IN') : 'Recent CAAQMS Bulletin'}</strong></div>
                </div>
              )}
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Conversion Formula:</strong> <code>CleanAirScore = clamp(100 - AQI / 5, 0, 100)</code> = clamp(100 - {route.cpcbAqi || 75} / 5, 0, 100) = <strong>{maut.subScores.cleanAirScore} / 100</strong>.
              </p>
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.74rem', color: '#64748B' }}>
                <strong>CPCB Disclaimer:</strong> Regional ambient monitoring station measurements. CPCB monitors district ambient air quality and does not operate independent micro-sensors on every individual street.
              </p>
            </div>
          </div>

          {/* Sub-Score 4: Road Quality & Active Hazards */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#7C3AED" />
                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Road Surface Quality & Condition Score (R)
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '850', color: '#7C3AED' }}>
                  {maut.subScores.roadQualityScore} / 100
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  (Weight: {maut.weights.roadQuality} &bull; Contrib: +{maut.contributions.roadQuality})
                </span>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Data Source:</strong> OpenStreetMap surface tags (<code>asphalt</code>, <code>paved</code>, <code>concrete</code>) &amp; EcoWalk Community Hazard Reports.
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Surface Condition:</strong> {route.roadQualityDetails?.dominantSurface || 'Asphalt / Urban Paved Sidewalk'} (Base: {route.roadQualityDetails?.baseSurfaceScore || 88}/100).
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Active Verified Hazards within 150m:</strong> {hazards.reportCount || 0} active report(s) (Penalty Applied: <strong>-{hazards.penalty || 0} pts</strong>). Resolved or rejected community reports receive <strong>0 penalty</strong>.
              </p>
              {hazards.reportDetails && hazards.reportDetails.length > 0 && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
                  <div style={{ fontWeight: '700', color: '#991B1B', fontSize: '0.75rem', marginBottom: '4px' }}>
                    Active Hazard Alerts Near Path:
                  </div>
                  {hazards.reportDetails.map((h, i) => (
                    <div key={h.id || i} style={{ fontSize: '0.74rem', color: '#B91C1C', marginBottom: '2px' }}>
                      &bull; {(h.issueType || h.type || 'Hazard').replace('_', ' ')}: {h.locationName || h.title || 'Road Hazard'} ({h.severity} severity)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Environmental & Health Guidance Disclaimer */}
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '0.74rem',
          color: '#64748B',
          lineHeight: '1.4'
        }}>
          <strong>Health &amp; Environmental Guidance:</strong> EcoWalk health scores represent relative multi-attribute decision-support indices based on spatial environmental indicators and do not constitute clinical or personal medical certifications.
        </div>

        {/* Close Button Footer */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 24px' }}
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}

