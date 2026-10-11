import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  Footprints, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LeafShoeIcon } from '../components/EcoWalkLogo';

export default function AuthPage({ onSuccess }) {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('walker');
  const [walkingSpeed, setWalkingSpeed] = useState('moderate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register({ name, email, password, role, walkingSpeed });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPass) => {
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{
      padding: '40px 24px 80px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 160px)'
    }}>
      {/* Auth Card Container */}
      <div className="card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.12)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <LeafShoeIcon size={56} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
            {isLogin ? 'Sign in to EcoWalk' : 'Create Walker Account'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: 0 }}>
            Personalized Healthy Walking Routes in Bengaluru
          </p>
        </div>

        {/* Demo 1-Click Login Quick Fill Box (Crucial for evaluation/viva) */}
        <div style={{
          background: 'var(--primary-50)',
          border: '1px solid var(--primary-100)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color: 'var(--primary-900)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={14} color="var(--primary-600)" />
            Quick 1-Click Evaluator Login:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('walker@ecowalk.local', 'walk123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '6px 10px', justifyContent: 'center' }}
            >
              <Footprints size={14} color="var(--primary-600)" />
              Demo Walker
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@ecowalk.local', 'admin123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '6px 10px', justifyContent: 'center' }}
            >
              <ShieldCheck size={14} color="var(--accent-sky)" />
              Demo Admin
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--slate-100)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem',
              backgroundColor: isLogin ? '#ffffff' : 'transparent',
              color: isLogin ? 'var(--slate-900)' : 'var(--slate-500)',
              boxShadow: isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem',
              backgroundColor: !isLogin ? '#ffffff' : 'transparent',
              color: !isLogin ? 'var(--slate-900)' : 'var(--slate-500)',
              boxShadow: !isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Register
          </button>
        </div>

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

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--slate-400)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--slate-400)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="email"
                required
                placeholder="walker@ecowalk.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--slate-400)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          {!isLogin && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Account Role</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="walker">Walker</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="form-label">Walking Pace</label>
                <select
                  className="form-select"
                  value={walkingSpeed}
                  onChange={(e) => setWalkingSpeed(e.target.value)}
                >
                  <option value="leisurely">Leisurely</option>
                  <option value="moderate">Moderate</option>
                  <option value="brisk">Brisk</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In to Account' : 'Create Walker Account'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
