import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Camera, 
  Filter, 
  ShieldAlert,
  Flame,
  Search,
  Check,
  XCircle,
  ShieldCheck,
  Layers,
  Map as MapIcon,
  List,
  ThumbsUp,
  Activity
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ReportHazardModal from '../components/ReportHazardModal';

/**
 * Custom Leaflet marker icons for Hazard Reports
 */
const createHazardMapIcon = (severity, status) => {
  let bgColor = '#F59E0B'; // moderate default
  let borderColor = '#D97706';

  if (status === 'resolved') {
    bgColor = '#10B981';
    borderColor = '#059669';
  } else if (status === 'rejected') {
    bgColor = '#64748B';
    borderColor = '#475569';
  } else if (severity === 'critical' || severity === 'high') {
    bgColor = '#EF4444';
    borderColor = '#DC2626';
  }

  return L.divIcon({
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
          background: ${bgColor};
          border: 2px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
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
    iconAnchor: [16, 38],
    popupAnchor: [0, -38]
  });
};

/**
 * Helper to auto-fit map bounds around active hazard markers
 */
function MapBoundsFitter({ reports }) {
  const map = useMap();
  useEffect(() => {
    if (!reports || reports.length === 0) return;
    const coords = [];
    for (const r of reports) {
      let lat = r.lat;
      let lng = r.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        if (Array.isArray(r.coordinates) && r.coordinates.length >= 2) {
          lat = r.coordinates[0];
          lng = r.coordinates[1];
        }
      }
      if (typeof lat === 'number' && typeof lng === 'number' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        coords.push([lat, lng]);
      }
    }
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [reports, map]);
  return null;
}

export default function HazardReportsPage() {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';

  const [reports, setReports] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'map' | 'list'
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');
  const [adminNotes, setAdminNotes] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getAll();
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      setActionErrorMsg('');
      setUpdatingId(reportId);
      const note = adminNotes[reportId] || '';
      await api.reports.updateStatus(reportId, newStatus, note);
      setActionSuccessMsg(`Report status updated to ${newStatus}.`);
      setTimeout(() => setActionSuccessMsg(''), 3500);
      await fetchReports();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to update report status.');
      setTimeout(() => setActionErrorMsg(''), 4500);
    } finally {
      setUpdatingId(null);
    }
  };

  // Safe search & filter
  const filteredReports = reports.filter(r => {
    const statusVal = (r.status || '').toLowerCase();
    const matchesStatus = filterStatus === 'all' || statusVal === filterStatus.toLowerCase();

    const locName = (r.locationName || r.location?.address || r.title || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    const issue = (r.issueType || r.type || '').toLowerCase();
    const reporter = (r.reportedBy || r.userName || '').toLowerCase();

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || locName.includes(q) || desc.includes(q) || issue.includes(q) || reporter.includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="container" style={{ paddingBottom: '60px', paddingTop: '28px' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-amber">
              <AlertTriangle size={14} /> Community Road Safety
            </span>
            <span className="badge badge-slate">Locally Persisted</span>
            {isAdmin && (
              <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Admin Moderator
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            Road Hazards & Condition Reports
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
            Crowdsourced alerts for potholes, broken sidewalks, open drainage, and dark pedestrian corridors with geographic map verification.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary btn-lg"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={20} />
          Report Road Hazard
        </button>
      </div>

      {/* Action Notification Messages */}
      {actionSuccessMsg && (
        <div style={{
          backgroundColor: '#ECFDF5',
          color: '#065F46',
          border: '1px solid #A7F3D0',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={18} />
          {actionSuccessMsg}
        </div>
      )}

      {actionErrorMsg && (
        <div style={{
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          border: '1px solid #FECACA',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <XCircle size={18} />
          {actionErrorMsg}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Reports', count: reports.length },
              { id: 'pending', label: 'Pending', count: reports.filter(r => r.status === 'pending').length },
              { id: 'verified', label: 'Verified Hazards', count: reports.filter(r => r.status === 'verified').length },
              { id: 'resolved', label: 'Resolved / Fixed', count: reports.filter(r => r.status === 'resolved').length },
              { id: 'rejected', label: 'Rejected', count: reports.filter(r => r.status === 'rejected').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`btn btn-sm ${filterStatus === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className="btn btn-sm"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: viewMode === 'split' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'split' ? 'var(--slate-900)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Split Map & List View"
              >
                <Layers size={13} /> Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className="btn btn-sm"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: viewMode === 'map' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'map' ? 'var(--slate-900)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Full Map View"
              >
                <MapIcon size={13} /> Map Only
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="btn btn-sm"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'list' ? 'var(--slate-900)' : 'var(--slate-600)',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Cards List View"
              >
                <List size={13} /> List Only
              </button>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} color="var(--slate-400)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search hazards or spots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px', paddingBottom: '8px', paddingTop: '8px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Hazard Map */}
      {(viewMode === 'split' || viewMode === 'map') && (
        <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '28px', border: '1px solid var(--slate-300)', borderRadius: '16px' }}>
          <div style={{
            padding: '12px 18px',
            background: 'var(--slate-50)',
            borderBottom: '1px solid var(--slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <span style={{ fontWeight: '700', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="#DC2626" /> Active Hazard Geolocation Map ({filteredReports.length} Plotted)
            </span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--slate-600)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span> Critical / High
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span> Moderate / Pending
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Resolved
              </span>
            </div>
          </div>

          <div style={{ height: viewMode === 'map' ? '560px' : '400px', width: '100%', position: 'relative' }}>
            <MapContainer
              center={[12.9716, 77.5946]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <MapBoundsFitter reports={filteredReports} />

              {filteredReports.map(report => {
                let rLat = report.lat;
                let rLng = report.lng;
                if (typeof rLat !== 'number' || typeof rLng !== 'number') {
                  if (Array.isArray(report.coordinates) && report.coordinates.length >= 2) {
                    rLat = report.coordinates[0];
                    rLng = report.coordinates[1];
                  }
                }
                if (typeof rLat !== 'number' || typeof rLng !== 'number') return null;

                const issue = (report.issueType || report.type || 'hazard').replace('_', ' ').toUpperCase();
                const loc = report.locationName || report.title || report.location?.address || 'Reported Location';
                const reporter = report.reportedBy || report.userName || 'Community Walker';
                const isCritical = report.severity === 'critical' || report.severity === 'high';
                const isResolved = report.status === 'resolved';
                const isRejected = report.status === 'rejected';

                return (
                  <Marker
                    key={report.id}
                    position={[rLat, rLng]}
                    icon={createHazardMapIcon(report.severity, report.status)}
                  >
                    <Popup>
                      <div style={{ padding: '4px', maxWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span className={`badge ${isResolved ? 'badge-emerald' : isRejected ? 'badge-slate' : isCritical ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                            <AlertTriangle size={11} /> {issue}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isResolved ? '#D1FAE5' : isRejected ? '#FEE2E2' : report.status === 'verified' ? '#FEF3C7' : '#F1F5F9',
                            color: isResolved ? '#065F46' : isRejected ? '#DC2626' : report.status === 'verified' ? '#B45309' : '#475569',
                            textTransform: 'capitalize'
                          }}>
                            {report.status}
                          </span>
                        </div>

                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                          {loc}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '4px', lineHeight: '1.4' }}>
                          {report.description}
                        </div>

                        {report.imageUrl && (
                          <div style={{ marginTop: '8px' }}>
                            <img
                              src={report.imageUrl}
                              alt="Hazard evidence"
                              style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }}
                            />
                          </div>
                        )}

                        <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)', marginTop: '6px' }}>
                          Reported by: <strong>{reporter}</strong> &bull; {new Date(report.createdAt).toLocaleDateString()}
                        </div>

                        {/* Admin Action Buttons in Map Popup */}
                        {isAdmin && (
                          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--slate-200)' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--slate-700)', marginBottom: '4px' }}>
                              Admin Moderation:
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(report.id, 'verified')}
                                disabled={updatingId === report.id || report.status === 'verified'}
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(report.id, 'resolved')}
                                disabled={updatingId === report.id || report.status === 'resolved'}
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                              >
                                Resolve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(report.id, 'rejected')}
                                disabled={updatingId === report.id || report.status === 'rejected'}
                                className="btn btn-sm"
                                style={{ fontSize: '0.7rem', padding: '3px 8px', backgroundColor: '#FEE2E2', color: '#DC2626' }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Reports Grid */}
      {(viewMode === 'split' || viewMode === 'list') && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-500)' }}>
              Loading community road hazard reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <CheckCircle2 size={48} color="var(--primary-600)" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--slate-900)' }}>
                No hazards found in this filter
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '6px' }}>
                The pedestrian pathways in this view are clear and safe.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '24px'
            }}>
              {filteredReports.map(report => {
                const isCritical = report.severity === 'critical' || report.severity === 'high';
                const isResolved = report.status === 'resolved';
                const isRejected = report.status === 'rejected';

                const issueTypeLabel = (report.issueType || report.type || 'hazard').replace('_', ' ');
                const locationLabel = report.locationName || report.title || report.location?.address || 'Reported Location';
                const routeLabel = report.routeName || report.location?.address || 'Bengaluru Walkway';
                const reporterLabel = report.reportedBy || report.userName || 'Community Walker';

                let rLat = report.lat;
                let rLng = report.lng;
                if (typeof rLat !== 'number' || typeof rLng !== 'number') {
                  if (Array.isArray(report.coordinates) && report.coordinates.length >= 2) {
                    rLat = report.coordinates[0];
                    rLng = report.coordinates[1];
                  }
                }

                return (
                  <div key={report.id} className="card" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: isResolved 
                      ? '4px solid #10B981' 
                      : isRejected
                        ? '4px solid #94A3B8'
                        : isCritical 
                          ? '4px solid #EF4444' 
                          : '4px solid #F59E0B'
                  }}>
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span className={`badge ${isResolved ? 'badge-emerald' : isRejected ? 'badge-slate' : isCritical ? 'badge-rose' : 'badge-amber'}`} style={{ textTransform: 'uppercase' }}>
                          <AlertTriangle size={12} /> {issueTypeLabel} • {report.severity || 'moderate'}
                        </span>

                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: isResolved ? '#D1FAE5' : isRejected ? '#FEE2E2' : report.status === 'verified' ? '#FEF3C7' : '#F1F5F9',
                          color: isResolved ? '#065F46' : isRejected ? '#DC2626' : report.status === 'verified' ? '#B45309' : 'var(--slate-700)',
                          textTransform: 'capitalize'
                        }}>
                          {report.status}
                        </span>
                      </div>

                      {/* Location Title */}
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--slate-900)', marginBottom: '6px' }}>
                        {locationLabel}
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} /> {routeLabel}
                        {typeof rLat === 'number' && typeof rLng === 'number' && (
                          <span style={{ color: 'var(--slate-400)', marginLeft: '6px' }}>
                            ({rLat.toFixed(4)}, {rLng.toFixed(4)})
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', lineHeight: '1.5', marginBottom: '14px' }}>
                        {report.description}
                      </p>

                      {/* Image Attachment Preview if Present */}
                      {report.imageUrl && (
                        <div style={{ marginBottom: '14px' }}>
                          <img
                            src={report.imageUrl}
                            alt="Hazard Condition"
                            style={{
                              width: '100%',
                              maxHeight: '180px',
                              objectFit: 'cover',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--slate-200)'
                            }}
                          />
                        </div>
                      )}

                      {/* Confirmations Count */}
                      <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ThumbsUp size={13} /> {report.confirmations || 1} Community Walker {(report.confirmations || 1) === 1 ? 'Confirmation' : 'Confirmations'}
                      </div>

                      {/* Admin Notes if Resolved or Handled */}
                      {report.adminNotes && (
                        <div style={{
                          background: 'var(--slate-50)',
                          border: '1px solid var(--slate-200)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 12px',
                          fontSize: '0.78rem',
                          color: 'var(--slate-700)',
                          marginBottom: '12px'
                        }}>
                          <strong>Civic Action / Note:</strong> {report.adminNotes}
                        </div>
                      )}

                      {/* Admin Moderation Action Form */}
                      {isAdmin && (
                        <div style={{
                          background: '#F8FAFC',
                          border: '1px dashed #CBD5E1',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 12px',
                          marginBottom: '12px'
                        }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--slate-700)', marginBottom: '6px' }}>
                            Admin Moderation:
                          </div>
                          <input
                            type="text"
                            placeholder="Repair / moderation note..."
                            defaultValue={report.adminNotes || ''}
                            onChange={(e) => setAdminNotes({ ...adminNotes, [report.id]: e.target.value })}
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', marginBottom: '8px' }}
                          />
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, 'verified')}
                              disabled={updatingId === report.id || report.status === 'verified'}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                              disabled={updatingId === report.id || report.status === 'resolved'}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, 'rejected')}
                              disabled={updatingId === report.id || report.status === 'rejected'}
                              className="btn btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Metadata */}
                    <div style={{
                      borderTop: '1px solid var(--slate-100)',
                      paddingTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--slate-500)'
                    }}>
                      <span>Reported by: <strong>{reporterLabel}</strong></span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Report Modal */}
      <ReportHazardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReportSubmitted={(newRep) => {
          setReports(prev => [newRep, ...prev]);
          setActionSuccessMsg('New road hazard reported and pinned to the community map!');
          setTimeout(() => setActionSuccessMsg(''), 3500);
        }}
      />
    </div>
  );
}
