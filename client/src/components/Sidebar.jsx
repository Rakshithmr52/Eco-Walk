import React from 'react';
import { useAuth } from '../context/AuthContext';
import EcoWalkLogo from './EcoWalkLogo';
import { 
  Home, 
  Compass, 
  AlertTriangle, 
  ShieldCheck, 
  LogOut, 
  User, 
  Footprints,
  Leaf
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const isAdmin = user && user.role === 'admin';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home
    },
    {
      id: 'planner',
      label: 'Find Routes',
      icon: Compass
    },
    {
      id: 'hazards',
      label: 'Road Hazards',
      icon: AlertTriangle
    }
  ];

  // Strictly add Admin Portal only if the authenticated user has the 'admin' role
  if (isAdmin) {
    navItems.push({
      id: 'admin',
      label: 'Admin Portal',
      icon: ShieldCheck,
      badge: 'Admin'
    });
  }

  return (
    <aside style={{
      width: '260px',
      backgroundColor: '#063B2F',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      minHeight: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 22px 20px 22px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <EcoWalkLogo 
          size={38} 
          variant="light" 
          onClick={() => setActiveTab('dashboard')} 
        />
      </div>

      {/* Vertical Navigation Menu */}
      <nav style={{
        flex: 1,
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontSize: '0.92rem',
                fontWeight: isActive ? '700' : '500',
                backgroundColor: isActive ? '#059669' : 'transparent',
                color: isActive ? '#FFFFFF' : '#D1FAE5',
                boxShadow: isActive ? '0 4px 14px rgba(5, 150, 105, 0.4)' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#D1FAE5';
                }
              }}
            >
              <Icon 
                size={20} 
                color={isActive ? '#FFFFFF' : '#6EE7B7'} 
                style={{ flexShrink: 0 }}
              />
              <span style={{ flex: 1 }}>{item.label}</span>

              {item.badge && (
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  letterSpacing: '0.5px'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Dedicated Sign Out Navigation Item */}
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            fontSize: '0.92rem',
            fontWeight: '600',
            backgroundColor: 'transparent',
            color: '#FCA5A5',
            marginTop: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#FCA5A5';
          }}
        >
          <LogOut size={20} color="#F87171" style={{ flexShrink: 0 }} />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* User Session & Footer Card */}
      <div style={{
        padding: '18px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {user ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#10B981',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: '800',
                flexShrink: 0
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {user.name}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: '#A7F3D0',
                  textTransform: 'capitalize'
                }}>
                  {user.role === 'admin' ? 'Administrator' : 'Health Walker'}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log Out"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#FCA5A5',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EF4444';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.color = '#FCA5A5';
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveTab('auth')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <User size={15} />
            Sign In / Register
          </button>
        )}

        {/* Motivational Footprint Emblem */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 6px',
          opacity: 0.85
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34D399',
            flexShrink: 0
          }}>
            <Leaf size={22} />
          </div>
          <div style={{
            fontSize: '0.74rem',
            lineHeight: '1.25',
            color: '#D1FAE5',
            fontWeight: '600'
          }}>
            Walk Today<br />
            for a Healthier Tomorrow
          </div>
        </div>
      </div>
    </aside>
  );
}
