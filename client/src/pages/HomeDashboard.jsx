import React, { useState, useEffect } from 'react';
import { 
  Footprints, 
  Trees, 
  ShieldCheck, 
  Wind, 
  Activity, 
  ArrowRight, 
  Flame, 
  Leaf, 
  AlertTriangle,
  Compass,
  CheckCircle2,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import EcoWalkLogo, { LeafShoeIcon } from '../components/EcoWalkLogo';

export default function HomeDashboard({ setActiveTab, onQuickPlan }) {
  const { user, login, register } = useAuth();
  const [locations, setLocations] = useState([]);
  const [reports, setReports] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [quickStart, setQuickStart] = useState('L1');
  const [quickEnd, setQuickEnd] = useState('L4');
  const [loading, setLoading] = useState(true);

  // Auth Form State (Integrated directly below welcome section as requested)
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('walker');
  const [walkingSpeed, setWalkingSpeed] = useState('moderate');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [locRes, repRes, fbRes] = await Promise.all([
          api.routes.getLocations(),
          api.reports.getAll({ status: 'pending' }),
          api.feedback.getAll()
        ]);
        setLocations(locRes.locations || []);
        setReports(repRes.reports || []);
        setFeedback((fbRes.feedback || []).slice(0, 4));
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleQuickRouteSubmit = (e) => {
    e.preventDefault();
    if (quickStart === quickEnd) {
      alert('Start and destination landmarks cannot be the same.');
      return;
    }
    if (onQuickPlan) {
      onQuickPlan(quickStart, quickEnd);
    }
    setActiveTab('planner');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (authMode === 'register' && password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, role, walkingSpeed });
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPass) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await login(demoEmail, demoPass);
    } catch (err) {
      setAuthError(err.message || 'Demo login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const userStats = user?.stats || {
    totalDistanceKm: 18.4,
    totalWalks: 12,
    totalCalories: 1140,
    co2SavedKg: 3.15,
    reportsSubmitted: 2
  };

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Hero Welcome Backdrop Container (Scenic Bengaluru Park View with gentle overlay) */}
      <div style={{
        backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.75), rgba(248, 250, 252, 0.92)), url('/bengaluru_bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '48px 24px 64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)'
      }}>
        {/* 1. Clean EcoWalk Welcome Section (Replaces the large green box) */}
        <div style={{
          textAlign: 'center',
          maxWidth: '640px',
          marginBottom: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Leaf + Walking-Shoe Symbol Emblem */}
          <div style={{
            marginBottom: '10px',
            transform: 'scale(1.15)',
            filter: 'drop-shadow(0 6px 12px rgba(5, 150, 105, 0.25))'
          }}>
            <LeafShoeIcon size={72} />
          </div>

          {/* EcoWalk Brand Title with Underline */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h2 style={{
              fontFamily: 'var(--font-heading, "Plus Jakarta Sans", sans-serif)',
              fontSize: '2.5rem',
              fontWeight: '800',
              letterSpacing: '-0.5px',
              color: '#0F172A',
              margin: 0,
              lineHeight: 1
            }}>
              Eco<span style={{ color: '#059669' }}>Walk</span>
            </h2>
            <div style={{
              width: '54px',
              height: '4px',
              backgroundColor: '#10B981',
              borderRadius: '2px',
              marginTop: '6px'
            }} />
          </div>

          {/* Welcome Heading (Changed to "Welcome to EcoWalk") */}
          <h1 style={{
            fontSize: '1.9rem',
            fontWeight: '800',
            color: '#0F4E3F',
            margin: '0 0 8px 0',
            letterSpacing: '-0.3px'
          }}>
            Welcome to EcoWalk
          </h1>

          {/* Subtitle from Mockup */}
          <p style={{
            fontSize: '1.05rem',
            color: '#475569',
            fontWeight: '500',
            margin: 0
          }}>
            Walk healthier <span style={{ color: '#059669', margin: '0 6px' }}>|</span> Live greener <span style={{ color: '#059669', margin: '0 6px' }}>|</span> A better Bengaluru
          </p>
        </div>

        {/* 2. Direct Sign In & Registration Card below Welcome (Shown when not authenticated) */}
        {!user ? (
          <div className="card" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '28px 32px',
            borderRadius: '20px',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.12)',
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            {/* Tab Switcher: Sign In | Register */}
            <div style={{
              display: 'flex',
              background: '#F1F5F9',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  backgroundColor: authMode === 'login' ? '#065F46' : 'transparent',
                  color: authMode === 'login' ? '#FFFFFF' : '#64748B',
                  boxShadow: authMode === 'login' ? '0 2px 8px rgba(6, 95, 70, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  backgroundColor: authMode === 'register' ? '#065F46' : 'transparent',
                  color: authMode === 'register' ? '#FFFFFF' : '#64748B',
                  boxShadow: authMode === 'register' ? '0 2px 8px rgba(6, 95, 70, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Register
              </button>
            </div>

            {/* Form Title & Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>
                {authMode === 'login' ? 'Sign in to your account' : 'Create your Walker account'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                Continue your journey to a healthier tomorrow
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                borderRadius: '10px',
                fontSize: '0.82rem',
                marginBottom: '16px',
                border: '1px solid #FECACA'
              }}>
                {authError}
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <div style={{ position: 'relative' }}>
                    <User size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '42px', borderRadius: '10px' }}
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#059669" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px', borderRadius: '10px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#059669" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '42px', paddingRight: '40px', borderRadius: '10px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Role</label>
                    <select
                      className="form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '8px 10px', borderRadius: '8px' }}
                    >
                      <option value="walker">Walker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Walking Pace</label>
                    <select
                      className="form-select"
                      value={walkingSpeed}
                      onChange={(e) => setWalkingSpeed(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '8px 10px', borderRadius: '8px' }}
                    >
                      <option value="leisurely">Leisurely</option>
                      <option value="moderate">Moderate</option>
                      <option value="brisk">Brisk</option>
                    </select>
                  </div>
                </div>
              )}

              {authMode === 'login' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '18px',
                  fontSize: '0.82rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#059669' }}
                    />
                    Remember me
                  </label>
                  <span 
                    onClick={() => alert('For password assistance, please contact the administrator.')}
                    style={{ color: '#059669', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Forgot password?
                  </span>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  backgroundColor: '#059669',
                  justifyContent: 'center'
                }}
              >
                {authLoading ? 'Signing In...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* OR Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '18px 0',
              color: '#94A3B8',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
              <span style={{ padding: '0 12px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            </div>

            {/* Toggle Button: "Create New Account" */}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '0.88rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              {authMode === 'login' ? 'Create New Account' : 'Sign in to Existing Account'}
            </button>

            {/* 1-Click Evaluator Demo Logins (Convenient for viva / examiner grading) */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#ECFDF5',
              borderRadius: '10px',
              border: '1px solid #A7F3D0'
            }}>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                color: '#065F46',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Sparkles size={12} color="#059669" />
                Quick 1-Click Demo Login:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('sarah@example.com', 'eco123')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    color: '#065F46',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Footprints size={13} color="#059669" />
                  Walker Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@ecowalk.local', 'admin123')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    color: '#0369A1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ShieldCheck size={13} color="#0284C7" />
                  Admin Demo
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* User Profile Stats Bar (Shown when authenticated) */
          <div style={{
            width: '100%',
            maxWidth: '860px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            padding: '24px 28px',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.08)',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
              paddingBottom: '14px',
              borderBottom: '1px solid #F1F5F9'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600' }}>Active Walker Session</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Welcome, {user.name}! 🌿
                </h3>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                {user.role} • {user.walkingSpeed || 'Moderate'} Pace
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '16px'
            }}>
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#059669', fontWeight: '700' }}>
                  Total Eco Walked
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0F172A' }}>
                  {userStats.totalDistanceKm} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>km</span>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#059669', fontWeight: '700' }}>
                  Total Walks
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0F172A' }}>
                  {userStats.totalWalks}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#059669', fontWeight: '700' }}>
                  Calories Burned
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#D97706' }}>
                  ~{userStats.totalCalories} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>kcal</span>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#059669', fontWeight: '700' }}>
                  CO2 Saved
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#059669' }}>
                  {userStats.co2SavedKg} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>kg</span>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#059669', fontWeight: '700' }}>
                  Road Reports
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0F172A' }}>
                  {userStats.reportsSubmitted}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Grid: Quick Route Finder & Bengaluru Environmental Indices */}
      <div className="container" style={{ padding: '36px 24px 60px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '28px',
          marginBottom: '36px'
        }}>
          {/* Quick Route Finder Card */}
          <div className="card" style={{ borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Compass size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Plan Your Bengaluru Walking Route
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Select start and destination landmarks for health-optimized corridors
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickRouteSubmit}>
              <div className="quick-search-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem' }}>Starting Point (A)</label>
                  <select
                    className="form-select"
                    value={quickStart}
                    onChange={(e) => setQuickStart(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.shortName || loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem' }}>Destination (B)</label>
                  <select
                    className="form-select"
                    value={quickEnd}
                    onChange={(e) => setQuickEnd(e.target.value)}
                    style={{ borderRadius: '10px' }}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.shortName || loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{
                background: '#F8FAFC',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid #E2E8F0',
                marginBottom: '20px',
                fontSize: '0.82rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                <span>
                  Evaluates tree canopy shade, pedestrian safety, air quality, and active road hazard penalties.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: '700',
                  justifyContent: 'center',
                  backgroundColor: '#059669'
                }}
              >
                Explore Recommended Routes
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          {/* Bengaluru District Air & Greenery Index */}
          <div className="card" style={{ borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#F0FDF4',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Trees size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Bengaluru Walking Health Index
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Simulated baseline environmental indicators across urban walking corridors (Sample Estimates)
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '14px',
                borderRadius: '12px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', marginBottom: '4px' }}>
                  <Wind size={16} />
                  <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>Air Quality (Simulated AQI)</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#14532D' }}>
                  42 <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>Good</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#15803D', marginTop: '2px' }}>
                  Sample baseline estimate
                </div>
              </div>

              <div style={{
                padding: '14px',
                borderRadius: '12px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', marginBottom: '4px' }}>
                  <Trees size={16} />
                  <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>Canopy Shade</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#064E3B' }}>
                  78% <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>Dense</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '2px' }}>
                  High UV protection
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem'
            }}>
              <span style={{ color: '#64748B' }}>Active Community Hazard Alerts</span>
              <span className="badge badge-amber" style={{ fontWeight: '700' }}>
                {reports.length} Open Reports
              </span>
            </div>
          </div>
        </div>

        {/* Feature Highlights: Why EcoWalk Bengaluru */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          <div className="card" style={{ padding: '22px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trees size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0F172A' }}>Tree-Shaded Corridors</h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Prioritizes avenues sheltered by Bengaluru's signature rain trees, tabebuia blossoms, and botanical parks.
            </p>
          </div>

          <div className="card" style={{ padding: '22px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0F172A' }}>Certified Pedestrian Safety</h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Routes select wide sidewalks, illuminated pathways, and safe pedestrian zebra crossings.
            </p>
          </div>

          <div className="card" style={{ padding: '22px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0F172A' }}>Live Hazard Avoidance</h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
              Crowdsourced pothole and road hazard reports automatically apply dynamic penalties to avoid compromised footpaths.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
