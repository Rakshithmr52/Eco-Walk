import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Map, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  RotateCcw, 
  Star,
  Trees,
  Wind,
  Activity,
  Check,
  XCircle,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';

  const [activeTab, setActiveTab] = useState('hazards');
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [routesList, setRoutesList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');
  const [adminNoteInput, setAdminNoteInput] = useState({});

  const loadAllAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, reportsRes, routesRes, fbRes] = await Promise.all([
        api.admin.getStats().catch(() => ({ stats: {} })),
        api.admin.getUsers().catch(() => ({ users: [] })),
        api.reports.getAll(),
        api.routes.getAll(),
        api.feedback.getAll()
      ]);

      setStats(statsRes.stats || {});
      setUsersList(usersRes.users || []);
      setReportsList(reportsRes.reports || []);
      setRoutesList(routesRes.routes || []);
      setFeedbackList(fbRes.feedback || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '36px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1E293B', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: '1.5' }}>
            The EcoWalk Admin Portal is strictly reserved for administrative accounts. Standard walker accounts cannot access or view this portal.
          </p>
        </div>
      </div>
    );
  }

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      setActionErrorMsg('');
      const notes = adminNoteInput[reportId] || '';
      await api.reports.updateStatus(reportId, newStatus, notes);
      setActionSuccessMsg(`Hazard report updated to ${newStatus}.`);
      setTimeout(() => setActionSuccessMsg(''), 3000);
      loadAllAdminData();
    } catch (err) {
      setActionErrorMsg('Failed to update report status: ' + (err.message || 'Error'));
      setTimeout(() => setActionErrorMsg(''), 4000);
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId, newStatus) => {
    try {
      setActionErrorMsg('');
      await api.feedback.updateStatus(feedbackId, newStatus);
      setActionSuccessMsg(`Feedback status updated to ${newStatus}.`);
      setTimeout(() => setActionSuccessMsg(''), 3000);
      loadAllAdminData();
    } catch (err) {
      setActionErrorMsg('Failed to update feedback: ' + (err.message || 'Error'));
      setTimeout(() => setActionErrorMsg(''), 4000);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Are you sure you want to reseed the local database to the default Greenfield sample data?')) {
      return;
    }
    try {
      setActionErrorMsg('');
      await api.admin.resetDatabase();
      setActionSuccessMsg('Database reseeded successfully!');
      setTimeout(() => setActionSuccessMsg(''), 3000);
      loadAllAdminData();
    } catch (err) {
      setActionErrorMsg('Reseed failed: ' + (err.message || 'Error'));
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '60px', paddingTop: '28px' }}>
      {/* Top Admin Header */}
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
            <span className="badge badge-blue">
              <ShieldCheck size={14} /> Administrator Control Center
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            System Administration & Analytics
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
            Monitor walkers, audit road hazard reports, examine route datasets, and moderate community feedback.
          </p>
        </div>

        <button
          onClick={handleResetDatabase}
          className="btn btn-secondary btn-sm"
          title="Reseed JSON Database to original sample data"
        >
          <RotateCcw size={15} />
          Reseed Sample Database
        </button>
      </div>

      {actionSuccessMsg && (
        <div style={{
          padding: '12px 18px',
          backgroundColor: '#D1FAE5',
          color: '#065F46',
          borderRadius: 'var(--radius-md)',
          fontWeight: '600',
          fontSize: '0.9rem',
          marginBottom: '24px',
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
          padding: '12px 18px',
          backgroundColor: '#FEE2E2',
          color: '#B91C1C',
          borderRadius: 'var(--radius-md)',
          fontWeight: '600',
          fontSize: '0.9rem',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <XCircle size={18} />
          {actionErrorMsg}
        </div>
      )}

      {/* KPI Metric Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Total Users
            </span>
            <Users size={18} color="var(--primary-600)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            {usersList.length || stats?.totalUsers || 2}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--primary-700)', marginTop: '4px' }}>
            Active health walkers
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Predefined Routes
            </span>
            <Map size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            {routesList.length || stats?.totalRoutes || 14}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0284C7', marginTop: '4px' }}>
            Local dataset walking paths
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Hazard Reports
            </span>
            <AlertTriangle size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            {reportsList.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#D97706', marginTop: '4px' }}>
            {reportsList.filter(r => r.status === 'pending').length} pending action
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
              Total Feedback
            </span>
            <MessageSquare size={18} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            {feedbackList.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#8B5CF6', marginTop: '4px' }}>
            Avg Rating: ★ {stats?.averageRating || '4.8'}
          </div>
        </div>
      </div>

      {/* Admin Module Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--slate-200)',
        marginBottom: '24px'
      }}>
        {[
          { id: 'hazards', label: 'Road Hazards Moderation', count: reportsList.length },
          { id: 'users', label: 'Registered Walkers', count: usersList.length },
          { id: 'routes', label: 'Route Inventory', count: routesList.length },
          { id: 'feedback', label: 'Feedback & Ratings', count: feedbackList.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              color: activeTab === tab.id ? 'var(--primary-700)' : 'var(--slate-500)',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary-600)' : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tab 1: Hazard Reports Moderation Table */}
      {activeTab === 'hazards' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
            Road Hazard Moderation & Verification
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--slate-100)', borderBottom: '2px solid var(--slate-200)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Issue & Severity</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Location & Route</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Reporter</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Admin Notes & Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--slate-500)' }}>
                      No hazard reports found in the district database.
                    </td>
                  </tr>
                ) : (
                  reportsList.map(rep => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid var(--slate-200)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${rep.severity === 'critical' || rep.severity === 'high' ? 'badge-rose' : 'badge-amber'}`}>
                          {rep.issueType} • {rep.severity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '700' }}>{rep.locationName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{rep.routeName}</div>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                        {rep.description}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.78rem' }}>
                        <div>{rep.reportedBy}</div>
                        <div style={{ color: 'var(--slate-400)' }}>{new Date(rep.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${
                          rep.status === 'resolved' ? 'badge-emerald' : 
                          rep.status === 'verified' ? 'badge-amber' : 
                          rep.status === 'rejected' ? 'badge-rose' : 'badge-slate'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {rep.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Admin/Repair note..."
                            defaultValue={rep.adminNotes}
                            onChange={(e) => setAdminNoteInput({ ...adminNoteInput, [rep.id]: e.target.value })}
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          />
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleUpdateStatus(rep.id, 'verified')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              title="Verify community report"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(rep.id, 'resolved')}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              title="Mark hazard resolved"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(rep.id, 'rejected')}
                              className="btn btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}
                              title="Reject invalid/spam report"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Registered Walkers Directory */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
            Registered Walkers & Profiles
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--slate-100)', borderBottom: '2px solid var(--slate-200)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>User Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Walking Pace</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Total Eco Km</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Total Walks</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>CO2 Saved (kg)</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--slate-500)' }}>
                      No registered walkers found.
                    </td>
                  </tr>
                ) : (
                  usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--slate-200)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700' }}>{u.name}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--slate-600)' }}>{u.email}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-emerald'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textTransform: 'capitalize' }}>{u.walkingSpeed}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>
                        {u.stats?.totalDistanceKm || 0} km
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {u.stats?.totalWalks || 0}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--primary-700)', fontWeight: '700' }}>
                        {u.stats?.co2SavedKg || 0} kg
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Predefined Route Dataset Inventory */}
      {activeTab === 'routes' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
            Predefined Walking Route Inventory (Local Dataset)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--slate-100)', borderBottom: '2px solid var(--slate-200)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Route ID & Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Connects</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Distance</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Greenery</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Safety</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Traffic Risk</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Road Quality</th>
                </tr>
              </thead>
              <tbody>
                {routesList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--slate-500)' }}>
                      No routes found in the database.
                    </td>
                  </tr>
                ) : (
                  routesList.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--slate-200)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '700' }}>{r.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{r.id} • {r.terrainType}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.78rem' }}>
                        {r.startNodeName} → {r.endNodeName}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>{r.distanceKm} km</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>{r.greeneryScore}%</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#0284C7', fontWeight: '700' }}>{r.safetyScore}%</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#DC2626', fontWeight: '700' }}>{r.trafficPollutionRisk}%</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#8B5CF6', fontWeight: '700' }}>{r.roadConditionScore}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Community Feedback Audit */}
      {activeTab === 'feedback' && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>
            User Ratings & Reviews Audit Log
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--slate-100)', borderBottom: '2px solid var(--slate-200)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Route</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Walker</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Rating</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Comment</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Date & Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--slate-500)' }}>
                      No user feedback submitted yet.
                    </td>
                  </tr>
                ) : (
                  feedbackList.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--slate-200)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700' }}>{f.routeName}</td>
                      <td style={{ padding: '12px 14px' }}>{f.userName}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className="badge badge-amber">★ {f.rating}.0</span>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: '300px' }}>"{f.comment}"</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${
                          f.status === 'hidden' ? 'badge-slate' :
                          f.status === 'reviewed' ? 'badge-blue' : 'badge-emerald'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {f.status || 'published'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.78rem' }}>
                        <div style={{ color: 'var(--slate-500)', marginBottom: '4px' }}>
                          {new Date(f.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {f.status !== 'reviewed' && (
                            <button
                              onClick={() => handleUpdateFeedbackStatus(f.id, 'reviewed')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                              title="Mark feedback as reviewed"
                            >
                              Review
                            </button>
                          )}
                          {f.status !== 'hidden' ? (
                            <button
                              onClick={() => handleUpdateFeedbackStatus(f.id, 'hidden')}
                              className="btn btn-sm"
                              style={{ padding: '3px 6px', fontSize: '0.7rem', backgroundColor: '#F1F5F9', color: '#64748B' }}
                              title="Hide feedback from public view"
                            >
                              Hide
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateFeedbackStatus(f.id, 'published')}
                              className="btn btn-sm"
                              style={{ padding: '3px 6px', fontSize: '0.7rem', backgroundColor: '#D1FAE5', color: '#065F46' }}
                              title="Publish feedback"
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
