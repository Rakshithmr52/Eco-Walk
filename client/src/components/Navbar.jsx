import React from 'react';
import { useAuth } from '../context/AuthContext';
import EcoWalkLogo from './EcoWalkLogo';
import { 
  Footprints, 
  Compass, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  LogOut, 
  Sparkles,
  Layers
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--slate-200)',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '74px'
      }}>
        {/* Logo & Project Title */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer'
          }}
        >
          <EcoWalkLogo size={36} variant="dark" />
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--slate-100)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--slate-200)'
        }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'dashboard' ? '700' : '600',
              fontSize: '0.88rem',
              backgroundColor: activeTab === 'dashboard' ? '#ffffff' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--primary-800)' : 'var(--slate-600)',
              boxShadow: activeTab === 'dashboard' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={16} color={activeTab === 'dashboard' ? 'var(--primary-600)' : 'currentColor'} />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'planner' ? '700' : '600',
              fontSize: '0.88rem',
              backgroundColor: activeTab === 'planner' ? '#ffffff' : 'transparent',
              color: activeTab === 'planner' ? 'var(--primary-800)' : 'var(--slate-600)',
              boxShadow: activeTab === 'planner' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Compass size={16} color={activeTab === 'planner' ? 'var(--primary-600)' : 'currentColor'} />
            Find Routes
          </button>

          <button
            onClick={() => setActiveTab('hazards')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'hazards' ? '700' : '600',
              fontSize: '0.88rem',
              backgroundColor: activeTab === 'hazards' ? '#ffffff' : 'transparent',
              color: activeTab === 'hazards' ? 'var(--primary-800)' : 'var(--slate-600)',
              boxShadow: activeTab === 'hazards' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <AlertTriangle size={16} color={activeTab === 'hazards' ? 'var(--accent-amber)' : 'currentColor'} />
            Road Hazards
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'admin' ? '700' : '600',
              fontSize: '0.88rem',
              backgroundColor: activeTab === 'admin' ? '#ffffff' : 'transparent',
              color: activeTab === 'admin' ? 'var(--primary-800)' : 'var(--slate-600)',
              boxShadow: activeTab === 'admin' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={16} color={activeTab === 'admin' ? 'var(--accent-sky)' : 'currentColor'} />
            Admin Portal
          </button>
        </nav>

        {/* User Badge / Auth Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: 'var(--primary-50)',
                border: '1px solid var(--primary-100)',
                borderRadius: 'var(--radius-full)'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--primary-600)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary-900)' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--primary-700)', textTransform: 'capitalize' }}>
                    {user.role === 'admin' ? 'Admin Access' : 'Active Walker'}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Log Out"
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('auth')}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 'var(--radius-full)', padding: '8px 20px' }}
            >
              <User size={16} />
              Sign In / Demo
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
