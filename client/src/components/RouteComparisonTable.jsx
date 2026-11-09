import React from 'react';
import {
  Sparkles,
  Trees,
  ShieldCheck,
  Wind,
  Activity,
  Eye,
  Info,
  CheckCircle2
} from 'lucide-react';

/**
 * Task 2: Simplified Route Comparison Matrix Table
 * Displays strictly 9 standardized columns:
 * 1. Route Name
 * 2. Health Score /100
 * 3. Distance in km
 * 4. Estimated Walking Time
 * 5. Greenery Score /100
 * 6. Pedestrian Safety Score /100
 * 7. Clean Air Score /100
 * 8. Road Quality Score /100
 * 9. Action (Inspect & View Route)
 * 
 * AQI station details, raw readings, and hazard lists are preserved
 * and accessible via the "Inspect" action modal.
 */
export default function RouteComparisonTable({
  recommendedRoute,
  alternativeRoutes = [],
  onSelectRoute,
  onInspectRoute,
  selectedRouteId
}) {
  if (!recommendedRoute && (!alternativeRoutes || alternativeRoutes.length === 0)) {
    return null;
  }

  const allRoutes = [recommendedRoute, ...alternativeRoutes].filter(Boolean);

  return (
    <div className="card" style={{ marginTop: '24px', overflow: 'hidden', padding: '20px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={18} color="var(--primary-600)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--slate-900)', margin: 0 }}>
              Multi-Criteria Route Comparison Matrix
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>
            Standardized evaluation comparing the recommended healthy path against alternative routes.
          </p>
        </div>
        <span className="badge badge-emerald" style={{ fontSize: '0.74rem', fontWeight: '700' }}>
          Strict 9-Metric Multi-Criteria View
        </span>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.84rem',
          textAlign: 'left',
          minWidth: '820px'
        }}>
          <thead>
            <tr style={{ background: 'var(--slate-100)', borderBottom: '2px solid var(--slate-200)' }}>
              {/* 1. Route Name */}
              <th style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--slate-700)', minWidth: '180px' }}>
                Route Name
              </th>
              {/* 2. Health Score /100 */}
              <th style={{ padding: '12px 12px', fontWeight: '800', color: 'var(--slate-700)', textAlign: 'center' }}>
                Health Score /100
              </th>
              {/* 3. Distance in km */}
              <th style={{ padding: '12px 12px', fontWeight: '800', color: 'var(--slate-700)', textAlign: 'center' }}>
                Distance (km)
              </th>
              {/* 4. Estimated Walking Time */}
              <th style={{ padding: '12px 12px', fontWeight: '800', color: 'var(--slate-700)', textAlign: 'center' }}>
                Walking Time
              </th>
              {/* 5. Greenery Score /100 */}
              <th style={{ padding: '12px 12px', fontWeight: '800', color: '#059669', textAlign: 'center' }}>
                Greenery Score /100
              </th>
              {/* 6. Pedestrian Safety Score /100 */}
              <th style={{ padding: '12px 12px', fontWeight: '800', color: '#0284C7', textAlign: 'center' }}>
                Pedestrian Safety /100
              </th>
              {/* 7. Clean Air Score /100 */}
              <th style={{ padding: '12px 12px', fontWeight: '800', color: '#0D9488', textAlign: 'center' }}>
                Clean Air Score /100
              </th>
              {/* 8. Road Quality Score /100 */}
              <th style={{ padding: '12px 12px', fontWeight: '800', color: '#7C3AED', textAlign: 'center' }}>
                Road Quality /100
              </th>
              {/* 9. Action */}
              <th style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--slate-700)', textAlign: 'center' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {allRoutes.map((r, index) => {
              const isRec = r.isRecommended;
              const isSelected = selectedRouteId === r.id;
              const cleanAir = r.cleanAirScore !== undefined ? r.cleanAirScore : Math.max(0, 100 - (r.trafficPollutionRisk || 35));
              const roadQuality = r.roadQualityScore !== undefined ? r.roadQualityScore : (r.effectiveRoadCondition || r.roadConditionScore || 85);

              return (
                <tr
                  key={r.id || index}
                  style={{
                    borderBottom: '1px solid var(--slate-200)',
                    backgroundColor: isSelected
                      ? 'rgba(16, 185, 129, 0.08)'
                      : isRec
                        ? 'rgba(236, 253, 245, 0.55)'
                        : '#ffffff',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {/* 1. Route Name */}
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {isRec ? (
                        <span className="badge badge-emerald" style={{ fontSize: '0.68rem', fontWeight: '800' }}>
                          ★ Best Route
                        </span>
                      ) : (
                        <span className="badge badge-sky" style={{ fontSize: '0.68rem', fontWeight: '700' }}>
                          Route {index + 1}
                        </span>
                      )}
                      <span style={{ fontWeight: '800', color: 'var(--slate-900)' }}>
                        {r.name}
                      </span>
                    </div>
                  </td>

                  {/* 2. Health Score /100 */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: '800',
                      fontSize: '0.92rem',
                      backgroundColor: r.healthScore >= 80 ? '#D1FAE5' : r.healthScore >= 60 ? '#FEF3C7' : '#FEE2E2',
                      color: r.healthScore >= 80 ? '#065F46' : r.healthScore >= 60 ? '#B45309' : '#DC2626',
                      border: `1px solid ${r.healthScore >= 80 ? '#A7F3D0' : r.healthScore >= 60 ? '#FDE68A' : '#FECACA'}`
                    }}>
                      {r.healthScore} / 100
                    </span>
                  </td>

                  {/* 3. Distance in km */}
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: 'var(--slate-900)' }}>
                    {r.distanceKm} km
                  </td>

                  {/* 4. Estimated Walking Time */}
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--slate-700)', fontWeight: '600' }}>
                    ~{r.estimatedMinutes} mins
                  </td>

                  {/* 5. Greenery Score /100 */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#059669' }}>
                      {r.greeneryScore} / 100
                    </span>
                  </td>

                  {/* 6. Pedestrian Safety Score /100 */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#0284C7' }}>
                      {r.safetyScore} / 100
                    </span>
                  </td>

                  {/* 7. Clean Air Score /100 */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#0D9488' }}>
                      {cleanAir} / 100
                    </span>
                  </td>

                  {/* 8. Road Quality Score /100 */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#7C3AED' }}>
                      {roadQuality} / 100
                    </span>
                  </td>

                  {/* 9. Action (Inspect & View Route) */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectRoute) onSelectRoute(r);
                          if (onInspectRoute) onInspectRoute(r);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Inspect detailed calculations, CPCB station, and audit breakdown"
                      >
                        <Info size={13} color="#0284C7" />
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectRoute && onSelectRoute(r)}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Highlight this walking pathway on the Leaflet map"
                      >
                        <Eye size={13} />
                        {isSelected ? 'Viewing' : 'View'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
