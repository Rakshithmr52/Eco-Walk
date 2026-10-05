import React from 'react';
import { 
  Sparkles, 
  Trees, 
  ShieldCheck, 
  Wind, 
  Activity, 
  AlertTriangle,
  ArrowRight,
  Eye
} from 'lucide-react';

export default function RouteComparisonTable({
  recommendedRoute,
  alternativeRoutes = [],
  onSelectRoute,
  selectedRouteId
}) {
  if (!recommendedRoute && (!alternativeRoutes || alternativeRoutes.length === 0)) {
    return null;
  }

  const allRoutes = [recommendedRoute, ...alternativeRoutes].filter(Boolean);

  return (
    <div className="card" style={{ marginTop: '24px', overflow: 'hidden' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Sparkles size={18} color="var(--primary-600)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            Multi-Criteria Route Comparison Matrix
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
          Detailed comparison of the recommended healthy path against alternative urban routes.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.85rem',
          textAlign: 'left'
        }}>
          <thead>
            <tr style={{ background: 'var(--slate-100)', borderBottom: '2px solid var(--slate-200)' }}>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)' }}>Route Name & Type</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Health Score</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Distance</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Est. Time</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Greenery</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Safety</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Clean Air</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Road Quality</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Hazards</th>
              <th style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--slate-700)', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {allRoutes.map((r, index) => {
              const isRec = r.isRecommended;
              const isSelected = selectedRouteId === r.id;

              return (
                <tr 
                  key={r.id || index}
                  style={{
                    borderBottom: '1px solid var(--slate-200)',
                    backgroundColor: isSelected 
                      ? 'rgba(16, 185, 129, 0.08)' 
                      : isRec 
                        ? 'rgba(236, 253, 245, 0.4)' 
                        : '#ffffff',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {/* Name & Badge */}
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isRec ? (
                        <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>Best Pick</span>
                      ) : (
                        <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>Alt {index}</span>
                      )}
                      <span style={{ fontWeight: '700', color: 'var(--slate-900)' }}>
                        {r.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                      {r.terrainType}
                    </div>
                  </td>

                  {/* Health Score */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: '800',
                      fontSize: '0.92rem',
                      backgroundColor: r.healthScore >= 80 ? 'var(--primary-100)' : '#FEF3C7',
                      color: r.healthScore >= 80 ? 'var(--primary-800)' : '#B45309'
                    }}>
                      {r.healthScore}/100
                    </span>
                  </td>

                  {/* Distance */}
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700' }}>
                    {r.distanceKm} km
                  </td>

                  {/* Time */}
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--slate-600)' }}>
                    {r.estimatedMinutes} min
                  </td>

                  {/* Greenery */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#059669' }}>
                      {r.greeneryScore}%
                    </span>
                  </td>

                  {/* Safety */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#0284C7' }}>
                      {r.safetyScore}%
                    </span>
                  </td>

                  {/* Clean Air */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#0D9488' }}>
                      {Math.max(0, 100 - r.trafficPollutionRisk)}%
                    </span>
                  </td>

                  {/* Road Quality */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#8B5CF6' }}>
                      {r.effectiveRoadCondition || r.roadConditionScore}%
                    </span>
                  </td>

                  {/* Hazards */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    {r.hazardData && r.hazardData.reportCount > 0 ? (
                      <span className="badge badge-rose" style={{ fontSize: '0.72rem' }}>
                        <AlertTriangle size={11} /> {r.hazardData.reportCount} Alert
                      </span>
                    ) : (
                      <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                        Clear
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <button
                      onClick={() => onSelectRoute && onSelectRoute(r)}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      <Eye size={13} />
                      {isSelected ? 'Viewing' : 'Inspect'}
                    </button>
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
