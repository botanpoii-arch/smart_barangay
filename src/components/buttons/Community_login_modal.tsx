import React, { useState, useEffect, useCallback } from 'react';
import './styles/Community_login_modal.css';
import { API_BASE_URL } from '../UI/api'; // Centralized Import

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (data: any) => void; 
}

export const CommunityLoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Derive the login endpoint from the base
  const LOGIN_URL = `${API_BASE_URL}/login`;

  // --- DEVICE FINGERPRINTING ---
  const getFingerprint = useCallback(() => {
    let fp = document.cookie.split('; ').find(row => row.startsWith('sb_dev_fp='))?.split('=')[1];
    if (!fp) {
      fp = 'device_' + Math.random().toString(36).substring(2, 15);
      document.cookie = `sb_dev_fp=${fp}; max-age=86400; path=/`;
    }
    return fp;
  }, []);

  useEffect(() => {
    const deviceId = getFingerprint();
    const savedLockout = localStorage.getItem(`lockout_${deviceId}`);
    if (savedLockout && Date.now() < parseInt(savedLockout)) {
      setLockoutUntil(parseInt(savedLockout));
    }
  }, [getFingerprint]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    const deviceId = getFingerprint();

    if (lockoutUntil && now < lockoutUntil) {
      const wait = Math.ceil((lockoutUntil - now) / 1000);
      setError(`Security Lock: Try again in ${wait}s`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. AUTHENTICATION CALL (Using LOGIN_URL)
      const res = await fetch(LOGIN_URL, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim(), 
          deviceId 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // TIERED LOCKOUT LOGIC
        if (res.status === 429 || data.shouldLock) {
          const penalty = now + 120000; // 2 minutes
          setLockoutUntil(penalty);
          localStorage.setItem(`lockout_${deviceId}`, penalty.toString());
          throw new Error("Security Alert: wait for 2 minutes.");
        }
        
        throw new Error(data.error || 'Invalid credentials');
      }

      // 2. JWT & SUCCESS HANDLING
      if (data.token) {
        // This is the "Handshake" seed - saving the token for use in getAuthHeaders()
        localStorage.setItem('auth_token', data.token); 
      }

      // Save user role if returned (needed for the dashboard handshake)
      if (data.user?.role) {
        localStorage.setItem('user_role', data.user.role);
      }

      const userData = data.user ? data.user : data;
      localStorage.setItem('resident_session', JSON.stringify(userData)); 

      // 3. TRIGGER DASHBOARD TRANSITION
      onLoginSuccess(data); 
      onClose();

    } catch (err: any) {
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="CM_LOGIN_OVERLAY">
      <div className="CM_LOGIN_CARD">
        <button className="CM_LOGIN_CLOSE" onClick={onClose}>&times;</button>
        
        <div className="CM_LOGIN_HEADER">
          <div className="CM_LOGIN_ICON">
            <i className="fas fa-shield-alt"></i>
          </div>
          <h2>Resident Login</h2>
          <p>Official Portal for Engineer's Hill Residents.</p>
        </div>

        <form onSubmit={handleLogin} className="CM_LOGIN_FORM">
          {error && (
            <div className={`CM_ERROR_MSG ${lockoutUntil ? 'LOCKOUT' : ''}`}>
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}
          
          <div className="CM_INPUT_GROUP">
            <label>Resident Username</label>
            <div className="CM_INPUT_WRAPPER">
              <i className="fas fa-user-circle"></i>
              <input 
                type="text" 
                placeholder="jvs0001@residents.eng-hill.brg.ph" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                disabled={loading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
              />
            </div>
          </div>

          <div className="CM_INPUT_GROUP">
            <label>Password</label>
            <div className="CM_INPUT_WRAPPER">
              <i className="fas fa-key"></i>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                disabled={loading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="CM_LOGIN_SUBMIT" 
            disabled={loading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
          >
            {loading ? 'Authorizing...' : lockoutUntil && Date.now() < lockoutUntil ? 'Locked' : 'Sign In'}
          </button>
        </form>

        <div className="CM_LOGIN_FOOTER">
          <p>Forgotten your credentials? Visit the Barangay Hall for a reset.</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityLoginModal;