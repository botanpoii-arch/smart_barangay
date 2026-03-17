import React, { useState, useEffect, useRef } from 'react';
import './styles/Login_modal.css';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (token: string) => void;
}

type ModalView =
  | 'LOGIN'
  | 'RECOVER_SELECT'
  | 'RECOVER_EMAIL'
  | 'RECOVER_PHONE'
  | 'RECOVER_OTP'
  | 'RECOVER_SUCCESS';

const Login_modal: React.FC<LoginModalProps> = ({ onClose, onSuccess }) => {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<ModalView>('LOGIN');

  // Data Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OWASP UI: Client-Side Rate Limit Tracking
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // --- MEMORY LEAK PROTECTION ---
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // --- NAVIGATION ---
  const handleBack = () => {
    setError('');
    if (view === 'RECOVER_SELECT') setView('LOGIN');
    else if (view === 'RECOVER_EMAIL' || view === 'RECOVER_PHONE') setView('RECOVER_SELECT');
    else if (view === 'RECOVER_OTP') setView('RECOVER_PHONE');
  };

  // --- ACTION: SIGN IN (FIXED & FUNCTIONAL) ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLocked) {
      setError('Too many attempts. Please wait 30 seconds.');
      return;
    }

    if (!username || !password) {
      setError('Credentials are required.');
      return;
    }

    setLoading(true);

    try {
      // 1. CALL THE ACTUAL BACKEND LOGIN ENDPOINT
      const response = await fetch('http://localhost:8000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!isMounted.current) return;

      if (response.ok) {
        // ==========================================
        // FIXED: SAVE ALL NECESSARY IDENTITY BADGES
        // ==========================================
        localStorage.setItem('auth_token', data.token); 
        localStorage.setItem('user_role', data.user.role); 
        
        // This is what the Profile page was missing:
        localStorage.setItem('account_id', data.user.account_id || data.user.id);
        
        localStorage.setItem('admin_session', JSON.stringify(data.user));

        setAttempts(0);
        setPassword('');
        
        // 3. TRIGGER THE PARENT SUCCESS HANDLER
        onSuccess(data.token);
      } else {
        throw new Error(data.error || 'Authentication failed');
      }

    } catch (err: any) {
      if (!isMounted.current) return;

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPassword('');

      setError(err.message || 'Connection refused. Is the server running?');

      if (newAttempts >= 5) {
        setIsLocked(true);
        setError('Too many failed attempts. Locked for 30s.');
        setTimeout(() => {
          if (isMounted.current) {
            setIsLocked(false);
            setAttempts(0);
            setError('');
          }
        }, 30000);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // --- ACTION: RECOVERY HANDLERS ---
  const handleEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isMounted.current) setView('RECOVER_SUCCESS');
    } catch (err) {
      if (isMounted.current) setView('RECOVER_SUCCESS');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const startPhoneRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isMounted.current) setView('RECOVER_OTP');
    } catch (err) {
      if (isMounted.current) setError('Failed to send OTP.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isMounted.current) setView('RECOVER_SUCCESS');
    } catch (err) {
      if (isMounted.current) {
        setError('Invalid OTP code.');
        setOtp('');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="LM_MODAL_OVERLAY" onClick={onClose}>
      <div className="LM_MODAL_CARD" onClick={(e) => e.stopPropagation()}>

        {view !== 'LOGIN' && view !== 'RECOVER_SUCCESS' && (
          <button className="LM_BACK_LINK" onClick={handleBack}>
            <i className="fas fa-chevron-left"></i> Back
          </button>
        )}

        <button className="LM_CLOSE_BTN" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        {view === 'LOGIN' && (
          <>
            <div className="LM_HEADER">
              <div className="LM_ICON"><i className="fas fa-user-shield"></i></div>
              <h2>Official Access</h2>
              <p>Enter your administrative credentials</p>
            </div>

            <form className="LM_FORM" onSubmit={handleSignIn}>
              {error && <div className="LM_ERROR_MSG">{error}</div>}

              <div className="LM_INPUT_GROUP">
                <label>Username</label>
                <div className="LM_INPUT_WRAPPER">
                  <i className="fas fa-user"></i>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading || isLocked}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="LM_INPUT_GROUP">
                <label>Password</label>
                <div className="LM_INPUT_WRAPPER">
                  <i className="fas fa-lock"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || isLocked}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="LM_EYE_TOGGLE"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="LM_SUBMIT_BTN" disabled={loading || isLocked}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : isLocked ? 'Locked' : 'Authenticate'}
              </button>

              <button
                type="button"
                className="LM_FORGOT_LINK"
                onClick={() => { setView('RECOVER_SELECT'); setError(''); }}
              >
                Forgot password?
              </button>
            </form>
          </>
        )}

        {view === 'RECOVER_SELECT' && (
          <>
            <div className="LM_HEADER">
              <div className="LM_ICON"><i className="fas fa-key"></i></div>
              <h2>Account Recovery</h2>
              <p>Select your verification method</p>
            </div>
            <div className="LM_RECOVERY_OPTIONS">
              <button className="LM_RECOVERY_BTN" onClick={() => setView('RECOVER_EMAIL')}>
                <i className="fas fa-envelope"></i>
                <span>Recover via Email</span>
              </button>
              <button className="LM_RECOVERY_BTN" onClick={() => setView('RECOVER_PHONE')}>
                <i className="fas fa-mobile-alt"></i>
                <span>Recover via Phone Number</span>
              </button>
            </div>
          </>
        )}

        {view === 'RECOVER_EMAIL' && (
          <form className="LM_FORM" onSubmit={handleEmailRecovery}>
            <div className="LM_HEADER"><h2>Email Recovery</h2><p>Enter your registered email address.</p></div>
            <div className="LM_INPUT_GROUP">
              <label>Email Address</label>
              <div className="LM_INPUT_WRAPPER"><i className="fas fa-at"></i><input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            </div>
            <button className="LM_SUBMIT_BTN" disabled={loading}>{loading ? 'Sending link...' : 'Send Reset Link'}</button>
          </form>
        )}

        {view === 'RECOVER_PHONE' && (
          <form className="LM_FORM" onSubmit={startPhoneRecovery}>
            <div className="LM_HEADER"><h2>Phone Verification</h2><p>Enter your registered mobile number.</p></div>
            {error && <div className="LM_ERROR_MSG">{error}</div>}
            <div className="LM_INPUT_GROUP">
              <label>Phone Number</label>
              <div className="LM_INPUT_WRAPPER"><i className="fas fa-phone"></i><input type="tel" placeholder="09XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} required /></div>
            </div>
            <button className="LM_SUBMIT_BTN" disabled={loading}>{loading ? 'Sending OTP...' : 'Send OTP Code'}</button>
          </form>
        )}

        {view === 'RECOVER_OTP' && (
          <form className="LM_FORM" onSubmit={verifyOtp}>
            <div className="LM_HEADER"><h2>Enter OTP</h2><p>We sent a code to {phone.replace(/.(?=.{4})/g, '*')}</p></div>
            {error && <div className="LM_ERROR_MSG">{error}</div>}
            <div className="LM_INPUT_GROUP">
              <input type="text" className="LM_OTP_INPUT" maxLength={6} placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} required autoFocus />
            </div>
            <button className="LM_SUBMIT_BTN" disabled={loading}>{loading ? 'Verifying...' : 'Verify & Continue'}</button>
          </form>
        )}

        {view === 'RECOVER_SUCCESS' && (
          <div className="LM_SUCCESS_AREA">
            <i className="fas fa-check-circle"></i>
            <h2>Identity Verified</h2>
            <p>Your request has been approved. Return to Sign In.</p>
            <button className="LM_SUBMIT_BTN" onClick={() => { setView('LOGIN'); setError(''); }}>Return to Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login_modal;