import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LeafShoeIcon } from './EcoWalkLogo';
import { Leaf, Trees, Users, Heart } from 'lucide-react';

export default function Footer({ setActiveTab }) {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';

  return (
    <footer style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(226, 232, 240, 0.8)',
      padding: '24px 32px',
      marginTop: 'auto',
      zIndex: 10
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        {/* Core Pillars (From Mockup: Healthier People | Cleaner Environment | Stronger Communities) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          fontSize: '0.85rem',
          color: '#334155',
          fontWeight: '600'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Leaf size={16} color="#059669" />
            <span>Healthier People</span>
          </div>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trees size={16} color="#047857" />
            <span>Cleaner Environment</span>
          </div>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} color="#0F766E" />
            <span>Stronger Communities</span>
          </div>
        </div>

        {/* Cursive / Stylized Slogan from Mockup: "Explore Bengaluru on Foot" */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          position: 'relative'
        }}>
          <span style={{
            fontFamily: 'cursive, "Brush Script MT", "Caveat", "Dancing Script", sans-serif',
            fontSize: '1.45rem',
            color: '#064E3B',
            fontWeight: '700',
            letterSpacing: '0.5px',
            transform: 'rotate(-2deg)'
          }}>
            Explore Bengaluru on Foot
          </span>
          <div style={{
            width: '100%',
            height: '3px',
            backgroundColor: '#10B981',
            borderRadius: '2px',
            marginTop: '-2px'
          }} />
        </div>
      </div>

      {/* Sub-bar with navigation links and copyright */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingTop: '16px',
        marginTop: '16px',
        borderTop: '1px solid #F1F5F9',
        fontSize: '0.78rem',
        color: '#64748B'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LeafShoeIcon size={20} />
          <span style={{ fontWeight: '700', color: '#0F172A' }}>EcoWalk</span>
          <span>• Promoting healthy urban pedestrian mobility in Bengaluru, Karnataka</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontWeight: '500' }}>
          <span 
            onClick={() => setActiveTab('dashboard')} 
            style={{ cursor: 'pointer', color: '#475569', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
          >
            Dashboard
          </span>
          <span 
            onClick={() => setActiveTab('planner')} 
            style={{ cursor: 'pointer', color: '#475569', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
          >
            Find Routes
          </span>
          <span 
            onClick={() => setActiveTab('hazards')} 
            style={{ cursor: 'pointer', color: '#475569', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
          >
            Road Hazards
          </span>
          {isAdmin && (
            <span 
              onClick={() => setActiveTab('admin')} 
              style={{ cursor: 'pointer', color: '#0284C7', fontWeight: '700' }}
            >
              Admin Portal
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
