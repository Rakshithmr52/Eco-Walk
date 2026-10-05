import React, { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MapVisualizer from '../components/MapVisualizer';
import RouteCard from '../components/RouteCard';
import RouteComparisonTable from '../components/RouteComparisonTable';
import FeedbackModal from '../components/FeedbackModal';
import ReportHazardModal from '../components/ReportHazardModal';

export default function RoutePlanner({ initialStart = 'L1', initialEnd = 'L4' }) {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [startNodeId, setStartNodeId] = useState(initialStart);
  const [endNodeId, setEndNodeId] = useState(initialEnd);

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

  // Load locations and hazard reports
  useEffect(() => {
    async function init() {
      try {
        const [locData, hazardData] = await Promise.all([
          api.routes.getLocations(),
          api.reports.getAll({ status: 'verified' })
        ]);
        setLocations(locData.locations || []);
        setActiveHazards(hazardData.reports || []);

        // Trigger initial recommendation calculation
        calculateRoutes(initialStart, initialEnd);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  const calculateRoutes = async (sId = startNodeId, eId = endNodeId) => {
    if (!sId || !eId) return;
    if (sId === eId) {
      setError('Start and destination landmarks cannot be the same spot.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        startNodeId: sId,
        endNodeId: eId,
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
      setError(err.message || 'Failed to compute routes.');
      setRecommendationResult(null);
      setInspectedRoute(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapLandmarks = () => {
    const prevStart = startNodeId;
    setStartNodeId(endNodeId);
    setEndNodeId(prevStart);
    calculateRoutes(endNodeId, prevStart);
  };

  // Clicking a landmark on the local map allows setting start/destination easily
  const handleMapLocationClick = (loc) => {
    if (!startNodeId || (startNodeId && endNodeId)) {
      setStartNodeId(loc.id);
      setEndNodeId('');
    } else if (startNodeId && !endNodeId) {
      if (loc.id === startNodeId) return;
      setEndNodeId(loc.id);
      calculateRoutes(startNodeId, loc.id);
    }
  };

  const handleLogWalk = async (route) => {
    try {
      await api.routes.recommend({
        startNodeId: route.startNodeId,
        endNodeId: route.endNodeId,
        logWalk: true
      });
      setLogSuccessMsg(`Walk logged! +${route.distanceKm} km, +${route.caloriesBurned} kcal recorded to your profile.`);
      setTimeout(() => setLogSuccessMsg(''), 4000);
    } catch (e) {
      alert('Walk completed! Great job on choosing a healthy green route.');
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '60px', paddingTop: '28px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge badge-emerald">
            <Compass size={14} /> Rule-Based Health Engine
          </span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--slate-900)' }}>
          Healthy Route Finder & Comparison
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
          Enter origin and destination landmarks to discover shaded, clean-air, hazard-free walking corridors.
        </p>
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

      {/* Main Grid: Control Panel & Vector Map Visualizer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        gap: '24px',
        marginBottom: '28px',
        alignItems: 'start'
      }}>
        {/* Left Side: Route Controls & Preference Engine */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--slate-900)', marginBottom: '16px' }}>
            Route Parameters
          </h2>

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

          {/* Start Point */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              Start Landmark (Point A)
            </label>
            <select
              className="form-select"
              value={startNodeId}
              onChange={(e) => setStartNodeId(e.target.value)}
            >
              <option value="">-- Choose Origin --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.shortName} ({loc.type})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0 10px 0' }}>
            <button
              type="button"
              onClick={handleSwapLandmarks}
              className="btn btn-secondary btn-sm"
              title="Reverse Start and Destination"
              style={{ borderRadius: 'var(--radius-full)', padding: '4px 14px' }}
            >
              <RefreshCw size={13} />
              Swap Direction
            </button>
          </div>

          {/* Destination Point */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284C7' }} />
              Destination Landmark (Point B)
            </label>
            <select
              className="form-select"
              value={endNodeId}
              onChange={(e) => setEndNodeId(e.target.value)}
            >
              <option value="">-- Choose Destination --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.shortName} ({loc.type})
                </option>
              ))}
            </select>
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
            onClick={() => calculateRoutes()}
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            <Compass size={18} />
            {loading ? 'Evaluating Health Indices...' : 'Calculate Healthy Route'}
          </button>
        </div>

        {/* Right Side: Interactive Local SVG Vector Map Visualizer */}
        <div>
          <MapVisualizer
            locations={locations}
            selectedRoute={inspectedRoute}
            alternativeRoutes={recommendationResult?.alternativeRoutes || []}
            activeHazardReports={activeHazards}
            startNodeId={startNodeId}
            endNodeId={endNodeId}
            onSelectLocation={handleMapLocationClick}
            onSelectRoute={(route) => setInspectedRoute(route)}
            height="520px"
          />

          <div style={{
            fontSize: '0.78rem',
            color: 'var(--slate-500)',
            marginTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 4px'
          }}>
            <span>Tip: Click any landmark on the vector map to select as Start or Destination.</span>
            <span>Click dashed lines on map to switch route inspection.</span>
          </div>
        </div>
      </div>

      {/* Recommended Route Card (Hero Feature) */}
      {inspectedRoute && (
        <div style={{ marginBottom: '24px' }}>
          <RouteCard
            route={inspectedRoute}
            isRecommended={inspectedRoute.isRecommended}
            onLogWalk={handleLogWalk}
            onOpenFeedback={(r) => setFeedbackRoute(r)}
            onOpenReport={(r) => setReportRoute(r)}
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
        isOpen={Boolean(reportRoute)}
        route={reportRoute}
        locations={locations}
        onClose={() => setReportRoute(null)}
        onReportSubmitted={(newRep) => {
          setActiveHazards(prev => [newRep, ...prev]);
          calculateRoutes(); // re-evaluates road condition penalty immediately!
        }}
      />
    </div>
  );
}
