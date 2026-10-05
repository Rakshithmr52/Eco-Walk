import React from 'react';
import { 
  Trees, 
  ShieldCheck, 
  Wind, 
  Activity, 
  Flame, 
  Leaf, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  Sparkles,
  MessageSquarePlus,
  Send
} from 'lucide-react';

export default function RouteCard({
  route,
  onOpenFeedback = null,
  onOpenReport = null,
  onLogWalk = null,
  isRecommended = true
}) {
  if (!route) return null;

  const score = route.healthScore || 85;
  // Calculate SVG circular stroke offset for 0-100 score
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let scoreColor = '#10B981';
  if (score < 60) scoreColor = '#F59E0B';
  if (score < 40) scoreColor = '#EF4444';

  return (
    <div className="card" style={{
      border: isRecommended ? '2px solid var(--primary-400)' : '1px solid var(--slate-200)',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Top Banner for Best Match */}
      {isRecommended && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(90deg, #059669 0%, #10B981 100%)',
          color: '#ffffff',
          padding: '4px 16px',
          fontSize: '0.75rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          letterSpacing: '0.3px'
        }}>
          <Sparkles size={14} />
          RECOMMENDED HEALTHY ROUTE • OPTIMAL COMPOSITE SCORE
        </div>
      )}

      <div style={{ paddingTop: isRecommended ? '14px' : '0' }}>
        {/* Header with Title and Health Score Dial */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginTop: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`badge ${isRecommended ? 'badge-emerald' : 'badge-slate'}`}>
                {route.tag || 'Walking Pathway'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: '600' }}>
                {route.terrainType}
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--slate-900)' }}>
              {route.name}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: '4px', lineHeight: '1.4' }}>
              {route.description}
            </p>
          </div>

          {/* Health Score Circular Meter */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ position: 'relative', width: '84px', height: '84px' }}>
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle
                  cx="42"
                  cy="42"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="42"
                  cy="42"
                  r={radius}
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 42 42)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: 'var(--slate-900)',
                  lineHeight: '1'
                }}>
                  {score}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: '700', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                  HEALTH
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Walking Metrics Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          background: 'var(--slate-50)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          margin: '16px 0',
          border: '1px solid var(--slate-200)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: '600' }}>DISTANCE</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--slate-900)' }}>
              {route.distanceKm} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>km</span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: '600' }}>EST. TIME</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--slate-900)' }}>
              {route.estimatedMinutes} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>mins</span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: '600' }}>CALORIES</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--accent-amber)' }}>
              ~{route.caloriesBurned} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>kcal</span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: '600' }}>CO2 SAVED</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary-600)' }}>
              {route.co2SavedGrams} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>g</span>
            </div>
          </div>
        </div>

        {/* Health Attribute Breakdown Bars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trees size={14} color="#059669" /> Greenery Canopy
              </span>
              <span style={{ color: 'var(--primary-700)' }}>{route.greeneryScore}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--slate-200)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${route.greeneryScore}%`, height: '100%', background: '#10B981', borderRadius: '3px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} color="#0284C7" /> Pedestrian Safety
              </span>
              <span style={{ color: '#0284C7' }}>{route.safetyScore}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--slate-200)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${route.safetyScore}%`, height: '100%', background: '#0284C7', borderRadius: '3px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wind size={14} color="#0D9488" /> Clean Air Index
              </span>
              <span style={{ color: '#0D9488' }}>{Math.max(0, 100 - route.trafficPollutionRisk)}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--slate-200)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, 100 - route.trafficPollutionRisk)}%`, height: '100%', background: '#0D9488', borderRadius: '3px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={14} color="#8B5CF6" /> Road Quality
              </span>
              <span style={{ color: '#8B5CF6' }}>{route.effectiveRoadCondition || route.roadConditionScore}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--slate-200)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${route.effectiveRoadCondition || route.roadConditionScore}%`, height: '100%', background: '#8B5CF6', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Hazard Warning Box if Hazards Exist */}
        {route.hazardData && route.hazardData.reportCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginBottom: '14px',
            fontSize: '0.78rem',
            color: '#991B1B'
          }}>
            <AlertTriangle size={16} color="#DC2626" flexShrink={0} />
            <span>
              <strong>Active Road Hazards:</strong> {route.hazardData.reportCount} community report(s) flagged on this route. Health score penalized by -{route.hazardData.penalty} pts.
            </span>
          </div>
        )}

        {/* Recommendation Reasons Section */}
        {route.recommendationReasons && route.recommendationReasons.length > 0 && (
          <div style={{
            background: 'rgba(236, 253, 245, 0.6)',
            border: '1px solid var(--primary-100)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '0.78rem',
              fontWeight: '700',
              color: 'var(--primary-900)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Award size={15} color="var(--primary-600)" />
              Why this route is recommended (Rule-Based Evaluation):
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--slate-700)', lineHeight: '1.5' }}>
              {route.recommendationReasons.map((reason, idx) => (
                <li key={idx} style={{ marginBottom: '3px' }}>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onLogWalk && onLogWalk(route)}
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
          >
            <CheckCircle2 size={16} />
            Walk This Route
          </button>

          <button
            onClick={() => onOpenFeedback && onOpenFeedback(route)}
            className="btn btn-secondary btn-sm"
          >
            <MessageSquarePlus size={16} />
            Rate Route
          </button>

          <button
            onClick={() => onOpenReport && onOpenReport(route)}
            className="btn btn-secondary btn-sm"
            title="Report Pothole or Road Issue on this path"
          >
            <AlertTriangle size={16} color="var(--accent-amber)" />
            Report Issue
          </button>
        </div>
      </div>
    </div>
  );
}
