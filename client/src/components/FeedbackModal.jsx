import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Send, 
  CheckCircle2, 
  Smile, 
  Trees, 
  ShieldCheck, 
  Activity 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FeedbackModal({
  isOpen,
  onClose,
  route = null,
  onFeedbackSubmitted = null
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [greeneryRating, setGreeneryRating] = useState(5);
  const [safetyRating, setSafetyRating] = useState(5);
  const [roadQualityRating, setRoadQualityRating] = useState(5);
  const [comfortRating, setComfortRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !route) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        routeId: route.id,
        routeName: route.name,
        rating,
        greeneryRating,
        safetyRating,
        roadQualityRating,
        comfortRating,
        comment: comment.trim(),
        userId: user?.id || 'U-GUEST',
        userName: user?.name || 'Fellow Walker'
      };

      const res = await api.feedback.create(payload);
      setSuccessMsg('Rating submitted! Thank you for helping optimize our healthy route index.');
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(res.feedback);
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  const StarRatingInput = ({ value, onChange, label, icon: Icon, iconColor }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--slate-700)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icon && <Icon size={16} color={iconColor} />}
        {label}
      </span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={22}
            onClick={() => onChange(star)}
            style={{
              cursor: 'pointer',
              fill: star <= value ? '#F59E0B' : 'transparent',
              color: star <= value ? '#F59E0B' : '#CBD5E1',
              transition: 'transform 0.1s ease'
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--slate-200)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--slate-900)' }}>
              Rate & Review Walking Route
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              {route.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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

          {successMsg && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {/* Primary Overall Rating */}
          <div style={{
            background: 'var(--slate-50)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '20px',
            border: '1px solid var(--slate-200)'
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--slate-800)', marginBottom: '8px' }}>
              Overall Route Experience
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={32}
                  onClick={() => setRating(star)}
                  style={{
                    cursor: 'pointer',
                    fill: star <= rating ? '#F59E0B' : 'transparent',
                    color: star <= rating ? '#F59E0B' : '#CBD5E1',
                    transform: star <= rating ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '6px' }}>
              {rating === 5 ? 'Exceptional health walk!' : rating >= 4 ? 'Good walking route' : rating >= 3 ? 'Average path' : 'Poor conditions'}
            </div>
          </div>

          {/* Specific Metric Breakdown */}
          <div style={{ marginBottom: '20px' }}>
            <StarRatingInput
              label="Greenery & Shade Density"
              icon={Trees}
              iconColor="#059669"
              value={greeneryRating}
              onChange={setGreeneryRating}
            />
            <StarRatingInput
              label="Pedestrian Safety & Lighting"
              icon={ShieldCheck}
              iconColor="#0284C7"
              value={safetyRating}
              onChange={setSafetyRating}
            />
            <StarRatingInput
              label="Sidewalk Smoothness & Road Condition"
              icon={Activity}
              iconColor="#8B5CF6"
              value={roadQualityRating}
              onChange={setRoadQualityRating}
            />
            <StarRatingInput
              label="Walking Comfort & Air Freshness"
              icon={Smile}
              iconColor="#0D9488"
              value={comfortRating}
              onChange={setComfortRating}
            />
          </div>

          {/* Comment */}
          <div className="form-group">
            <label className="form-label">Review or Tips for Other Walkers</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Beautiful blooming flowers in the morning, very safe for senior citizens..."
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              <Send size={16} />
              {loading ? 'Submitting...' : 'Post Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
