import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import HomeDashboard from './pages/HomeDashboard';
import RoutePlanner from './pages/RoutePlanner';
import HazardReportsPage from './pages/HazardReportsPage';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import { MapPin, Menu, X, ShieldAlert, ArrowLeft } from 'lucide-react';

function MainLayout() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [plannerStart, setPlannerStart] = useState('L1');
  const [plannerEnd, setPlannerEnd] = useState('L4');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleQuickPlan = (startId, endId) => {
    setPlannerStart(startId);
    setPlannerEnd(endId);
    setActiveTab('planner');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Check admin access
  const isAdmin = user && user.role === 'admin';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Desktop & Mobile Responsive Sidebar - ONLY SHOWN AFTER SUCCESSFUL LOGIN */}
      {user && (
        <>
          <div className={`app-sidebar-wrapper ${mobileMenuOpen ? 'open' : ''}`}>
            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
          </div>

          {/* Mobile Backdrop Overlay */}
          {mobileMenuOpen && (
            <div 
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-backdrop"
            />
          )}
        </>
      )}

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: '100vh',
        position: 'relative'
      }}>
        {/* Top Floating Bar / Header with Location Badge */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.7)'
        }}>
          {/* Mobile Menu Hamburger - shown only when authenticated with sidebar */}
          {user ? (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          ) : (
            <div style={{ width: '24px' }} />
          )}

          {/* Current Page Title */}
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1E293B' }}>
            {!user ? '' : (
              <>
                {activeTab === 'dashboard' && 'EcoWalk Dashboard'}
                {activeTab === 'planner' && 'Walking Route Planner'}
                {activeTab === 'hazards' && 'Community Road Hazards'}
                {activeTab === 'admin' && 'Administrator Portal'}
              </>
            )}
          </div>

          {/* Top-Right Location Pill: "Bengaluru, Karnataka" (from Mockup) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
            border: '1px solid #D1FAE5',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '0.84rem',
            fontWeight: '700',
            color: '#065F46'
          }}>
            <MapPin size={16} color="#059669" />
            <span>Bengaluru, Karnataka</span>
          </div>
        </header>

        {/* Page Content Body */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!user ? (
            /* Unauthenticated: Show only Welcome, Sign In and Registration */
            <HomeDashboard 
              setActiveTab={handleTabChange} 
              onQuickPlan={handleQuickPlan} 
            />
          ) : (
            /* Authenticated: Full access to Dashboard, Planner, Hazards, and Admin */
            <>
              {activeTab === 'dashboard' && (
                <HomeDashboard 
                  setActiveTab={handleTabChange} 
                  onQuickPlan={handleQuickPlan} 
                />
              )}

              {activeTab === 'planner' && (
                <RoutePlanner 
                  initialStart={plannerStart} 
                  initialEnd={plannerEnd} 
                />
              )}

              {activeTab === 'hazards' && (
                <HazardReportsPage />
              )}

              {/* Strict Admin Gate */}
              {activeTab === 'admin' && (
                isAdmin ? (
                  <AdminDashboard />
                ) : (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px'
                  }}>
                    <div className="card" style={{
                      maxWidth: '480px',
                      textAlign: 'center',
                      padding: '36px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto'
                      }}>
                        <ShieldAlert size={32} />
                      </div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1E293B', marginBottom: '8px' }}>
                        Administrator Access Required
                      </h2>
                      <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
                        The Admin Portal is strictly restricted to authorized administrators. Standard walker accounts do not have permission to view this section.
                      </p>
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <ArrowLeft size={16} />
                        Return to Dashboard
                      </button>
                    </div>
                  </div>
                )
              )}

              {activeTab === 'auth' && (
                <AuthPage onSuccess={() => setActiveTab('dashboard')} />
              )}
            </>
          )}
        </main>

        <Footer setActiveTab={handleTabChange} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
