import React, { useState } from 'react';
import './styles/Community_Resetpassword_modal.css'; 

interface ResetProps {
  isOpen: boolean;
  resident: any; 
  onSuccess: () => void;
}

const CommunityResetPasswordModal: React.FC<ResetProps> = ({ isOpen, resident, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = 'https://mortgage-libs-asking-decades.trycloudflare.com/api';

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- 1. Client-Side Validation ---
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Security requirement: Password must be at least 8 characters.');
      return;
    }

    if (newPassword === confirmPassword) {
      // Logic check passed: now verify they aren't just re-typing '123456'
      if (newPassword.includes('123456')) {
        setError('You cannot use the default password as your new password.');
        return;
      }
    } else {
      setError('Validation failed: Passwords do not match.');
      return;
    }

    // Get the account_id from the resident object passed from Dashboard
    const accountId = resident?.account_id;
    
    if (!accountId) {
        setError("System Error: Account ID missing. Please log out and try again.");
        return;
    }

    setLoading(true);

    try {
      // --- 2. Call the Secure Update Route ---
      const res = await fetch(`${API_BASE}/accounts/reset/${accountId}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password: newPassword,
          updatedBy: resident?.username // For Audit Logs
        })
      });

      const data = await res.json();

      if (!res.ok) {
          throw new Error(data.error || 'Failed to secure account.');
      }

      // --- 3. Update Local Session Flag ---
      // This prevents the modal from popping up again immediately
      const savedSession = localStorage.getItem('resident_session');
      if (savedSession) {
          const session = JSON.parse(savedSession);
          session.requires_reset = false;
          localStorage.setItem('resident_session', JSON.stringify(session));
      }

      // --- 4. Success State ---
      alert("Account Secured! Your password has been updated.");
      onSuccess();

    } catch (err: any) {
      console.error("Reset Error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="CM_RESET_OVERLAY">
      <div className="CM_RESET_CARD">
        
        {/* Header Section */}
        <div className="CM_RESET_HEADER">
          <div className="CM_RESET_ICON">
            <i className="fas fa-user-shield"></i>
          </div>
          <h2>Security Requirement</h2>
          <p>
            Hello <strong>{resident?.first_name || 'Resident'}</strong>, your account is currently using a default password. Please create a new one to continue.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleReset} className="CM_RESET_FORM">
          
          {error && (
            <div className="CM_RESET_ERROR">
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}

          <div className="CM_RESET_INPUT_GROUP">
            <label>New Secure Password</label>
            <div className="CM_RESET_INPUT_WRAPPER">
              <i className="fas fa-lock"></i>
              <input 
                type="password" 
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="CM_RESET_INPUT_GROUP">
            <label>Confirm Password</label>
            <div className="CM_RESET_INPUT_WRAPPER">
              <i className="fas fa-check-double"></i>
              <input 
                type="password" 
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="CM_RESET_SUBMIT" 
            disabled={loading}
          >
            {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Encrypting...
                </>
            ) : (
                <>
                  Update Password <i className="fas fa-shield-alt"></i>
                </>
            )}
          </button>
        </form>

        <div className="CM_RESET_FOOTER">
          <p>This is a one-time security requirement for Engineer's Hill Residents.</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityResetPasswordModal;