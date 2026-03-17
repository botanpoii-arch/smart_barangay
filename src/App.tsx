import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/UI/Login';
import Dashboard from './components/UI/Dashboard'; 
import Community from './components/UI/Community';
import Community_Dashboard from './components/UI/Community_Dashboard'; 

import './App.css';

// 1. VIEW TYPES
type AppView = 'login' | 'admin' | 'community' | 'community_dash';

const App: React.FC = () => {
  /**
   * SESSION USER STATE:
   * Retrieves the logged-in user details from sessionStorage.
   */
  const [user, setUser] = useState<any>(() => {
    const savedUser = sessionStorage.getItem('admin_session');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  /**
   * PERSISTENCE: 
   * Reads from sessionStorage to maintain the session across refreshes.
   */
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const savedView = sessionStorage.getItem('app_current_view') as AppView | null;
    return savedView || 'login';
  });

  // 2. GLOBAL THEME PERSISTENCE
  useEffect(() => {
    const savedTheme = localStorage.getItem('sb_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  /**
   * SYNC:
   * Keep the UI view synced with sessionStorage.
   */
  useEffect(() => {
    sessionStorage.setItem('app_current_view', currentView);
  }, [currentView]);

  // 3. LOGOUT LOGIC
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('resident_session');
    sessionStorage.removeItem('admin_session'); 
    sessionStorage.removeItem('app_current_view'); 
    sessionStorage.removeItem('user_role'); 
    setUser(null);
    setCurrentView('login');
  }, []);

  /**
   * 4. OPTIMIZED INACTIVITY TIMER
   */
  useEffect(() => {
    if (currentView === 'login' || currentView === 'community') return;

    let lastActivityTime = Date.now();
    const FOUR_HOURS_MS = 14400000; 

    const updateActivity = () => {
      lastActivityTime = Date.now();
    };

    const intervalId = setInterval(() => {
      if (Date.now() - lastActivityTime >= FOUR_HOURS_MS) {
        alert("You have been logged out due to inactivity.");
        handleLogout();
      }
    }, 60000); 

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    activityEvents.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [currentView, handleLogout]);

  // --- TRANSITION HANDLERS ---

  /**
   * Note: Your Login component should pass the user data 
   * back to App.tsx when a login is successful.
   */
  const handlePortalSelection = (target: string, userData?: any) => {
    if (userData) {
      setUser(userData);
      sessionStorage.setItem('admin_session', JSON.stringify(userData));
    }
    setCurrentView(target as AppView);
  };

  const goToCommunityDashboard = () => {
    setCurrentView('community_dash');
  };

  return (
    <div className="APP_ROOT">
      
      {/* PORTAL: LOGIN GATEWAY */}
      {currentView === 'login' && (
        <Login onSelectPortal={handlePortalSelection} />
      )}

      {/* PORTAL: FULL ADMIN SYSTEM (Staff/Officials) */}
      {currentView === 'admin' && (
        <Dashboard 
          onLogout={handleLogout} 
          user={user} // Missing property fixed
        /> 
      )}

      {/* PORTAL: PUBLIC COMMUNITY VIEW */}
      {currentView === 'community' && (
        <Community 
          onExit={handleLogout} 
          onLoginSuccess={goToCommunityDashboard} 
        />
      )}

      {/* PORTAL: RESIDENT PRIVATE DASHBOARD */}
      {currentView === 'community_dash' && (
        <Community_Dashboard onLogout={() => setCurrentView('community')} />
      )}

    </div>
  );
};

export default App;