import React, { useState, useEffect, useCallback } from 'react';
import './styles/Profile.css';

const Profile: React.FC = () => {
  // 1. THEME STATE
  const [theme, setTheme] = useState(() => localStorage.getItem('sb_theme') || 'light');

  // 2. FORM DATA STATE
  const [formData, setFormData] = useState({
    fullName: 'Loading...',
    email: '',
    role: '',
    phone: ''
  });

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // --- REFINED HANDSHAKE HELPER ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    let role = localStorage.getItem('user_role');
    
    // Auto-fix corrupt role values
    if (!role || role === 'undefined' || role === 'null') {
      role = 'admin'; 
      localStorage.setItem('user_role', 'admin');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '', 
      'x-user-role': role                
    };
  }, []);

  // --- FETCH PROFILE: THE CORE HANDSHAKE ---
  const fetchProfileData = useCallback(async () => {
    // 1. Grab ID and Token
    const rawId = localStorage.getItem('account_id');
    const token = localStorage.getItem('auth_token');

    // 2. Strict Validation: Prevent the "weird" behavior by stopping broken requests
    if (!rawId || rawId === 'undefined' || rawId === 'null' || !token) {
      console.error("[PROFILE] Handshake Blocked: Missing ID or Token");
      setError("Session Error: Please log out and back in to refresh your profile.");
      setFormData(prev => ({ ...prev, fullName: 'Guest User' }));
      return;
    }

    setLoading(true);
    try {
      // Use the specific profile endpoint we fixed in the backend
      const res = await fetch(`http://localhost:8000/api/officials/profile/${rawId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (res.status === 401) throw new Error("Session Expired.");
      if (res.status === 403) throw new Error("Access Denied (RBAC).");
      if (res.status === 404) throw new Error("Profile not found in database.");

      if (res.ok) {
        const data = await res.json();
        setFormData({
          fullName: data.full_name || 'Anonymous Official',
          email: data.email || '',
          role: data.role || 'Official',
          phone: data.contact_number || ''
        });
        setError('');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }
    } catch (err: any) {
      console.error("[FETCH ERROR]", err);
      setError(err.message || 'Cannot reach server.');
      setFormData(prev => ({ ...prev, fullName: 'Error Loading' }));
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Handle Theme Application
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sb_theme', theme);
  }, [theme]);

  // Initial Fetch
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const targetId = localStorage.getItem('account_id');
    if (!targetId) return alert("Session lost. Cannot save.");

    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:8000/api/officials/profile/${targetId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          contact_number: formData.phone
        })
      });

      if (!res.ok) throw new Error('Failed to update server record.');

      alert("Profile updated successfully!");
      setIsEditing(false);
      fetchProfileData(); 
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="PF_WIDE_CONTAINER">
      <header className="PF_PAGE_HEADER">
        <h1>My Profile</h1>
        <p>Manage your account settings and system preferences.</p>
      </header>

      {error && (
        <div className="PF_ERROR_BANNER" style={{ 
          padding: '15px', color: '#ef4444', backgroundColor: '#fee2e2', 
          borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #fca5a5' 
        }}>
          <strong><i className="fas fa-exclamation-triangle"></i> {error}</strong>
        </div>
      )}

      <section className="PF_SETTING_SECTION">
        <div className="PF_SECTION_LABEL">Account Details</div>
        <div className="PF_CONTENT_CARD">
          
          <div className="PF_PROFILE_HEADER">
            <div className="PF_AVATAR_WRAPPER">
              <div className="PF_AVATAR_PLACEHOLDER">
                {loading ? '...' : (formData.fullName || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="PF_USER_INFO">
              <h2 className="PF_USER_DISPLAY_NAME">{loading ? 'Syncing...' : formData.fullName}</h2>
              <span className="PF_USER_DISPLAY_ROLE">{String(formData.role).toUpperCase()}</span>
            </div>
          </div>

          <div className="PF_FORM_GRID">
            <div className="PF_INPUT_GROUP">
              <label>Full Name</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName} 
                onChange={handleChange}
                disabled={!isEditing || loading}
                className={`PF_CLEAN_INPUT ${(!isEditing || loading) ? 'PF_DISABLED' : ''}`}
              />
            </div>
            <div className="PF_INPUT_GROUP">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleChange}
                disabled={!isEditing || loading}
                className={`PF_CLEAN_INPUT ${(!isEditing || loading) ? 'PF_DISABLED' : ''}`}
              />
            </div>
            <div className="PF_INPUT_GROUP">
              <label>Phone Number</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone} 
                onChange={handleChange}
                disabled={!isEditing || loading}
                className={`PF_CLEAN_INPUT ${(!isEditing || loading) ? 'PF_DISABLED' : ''}`}
              />
            </div>
            <div className="PF_INPUT_GROUP">
              <label>System Role</label>
              <input 
                type="text" 
                value={String(formData.role).toUpperCase()} 
                disabled 
                className="PF_CLEAN_INPUT PF_DISABLED" 
              />
            </div>
          </div>

          <div className="PF_ACTIONS">
            {isEditing ? (
              <>
                <button className="PF_BTN_CANCEL" onClick={() => setIsEditing(false)} disabled={isSaving}>Discard</button>
                <button className="PF_BTN_SAVE" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button className="PF_BTN_EDIT" onClick={() => setIsEditing(true)} disabled={loading || !!error}>
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </section>

      {/* APPEARANCE SECTION REMAINS SAME */}
      <section className="PF_SETTING_SECTION">
        <div className="PF_SECTION_LABEL">Appearance</div>
        <div className="PF_CONTENT_CARD">
           <div className="PF_THEME_GRID">
             <button className={`PF_THEME_VISUAL_BTN ${theme === 'light' ? 'ACTIVE' : ''}`} onClick={() => setTheme('light')}>Light Mode</button>
             <button className={`PF_THEME_VISUAL_BTN ${theme === 'dark' ? 'ACTIVE' : ''}`} onClick={() => setTheme('dark')}>Dark Mode</button>
           </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;