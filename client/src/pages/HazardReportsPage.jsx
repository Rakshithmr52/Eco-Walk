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
  Search
} from 'lucide-react';
import { api } from '../services/api';
import ReportHazardModal from '../components/ReportHazardModal';

export default function HazardReportsPage() {
  const [reports, setReports] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = !searchQuery.trim() || 
      r.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.issueType.toLowerCase().includes(searchQuery.toLowerCase());
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
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--slate-900)' }}>
            Road Hazards & Condition Reports
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
            Crowdsourced alerts for potholes, broken sidewalks, open drainage, and dark pedestrian corridors.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary btn-lg"
        >
          <Plus size={20} />
          Report Road Hazard
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '28px' }}>
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

          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
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

      {/* Reports Grid */}
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
                    <span className={`badge ${isCritical ? 'badge-rose' : 'badge-amber'}`} style={{ textTransform: 'uppercase' }}>
                      <AlertTriangle size={12} /> {report.issueType.replace('_', ' ')} • {report.severity}
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
                    {report.locationName}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> {report.routeName}
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
                  <span>Reported by: <strong>{report.reportedBy}</strong></span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      <ReportHazardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReportSubmitted={(newRep) => {
          setReports(prev => [newRep, ...prev]);
        }}
      />
    </div>
  );
}
