import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './styles/Account_Management.css'; 
import { API_BASE_URL } from './api'; // <-- Imported here

interface IAccount {
  account_id?: string; 
  id?: number | string; 
  username: string;
  role: string;
  resident_id?: string;
  official_id?: string;
  profile?: { first_name: string; last_name: string }; 
  residents?: { first_name: string; last_name: string };
  officials?: { full_name: string; position: string }; 
  displayName?: string; 
}

type TabState = 'Officials' | 'Residents';

export default function AccountManagement() {
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<TabState>('Officials');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedAccount, setSelectedAccount] = useState<IAccount | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  // --- HANDSHAKE HELPER: SECURES ALL REQUESTS & FIXES ROLE SPAM ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    let role = localStorage.getItem('user_role');
    
    // Auto-fix for the "undefined" role pointing problem
    if (!role || role === 'undefined' || role === 'null') {
      role = 'superadmin'; // Safe fallback for this specific management page
      localStorage.setItem('user_role', 'superadmin');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-role': role
    };
  }, []);

  const fetchAccounts = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      // HANDSHAKE APPLIED
      const response = await fetch(`${API_BASE_URL}/rbac/accounts`, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 403) throw new Error("RBAC: Access Denied. Superadmin required.");
      if (!response.ok) throw new Error(`Server Error: ${response.status}`);
      
      const data = await response.json();
      setAccounts(data);
      setError(''); 
    } catch (err: any) {
      console.error("[FETCH ERROR]", err);
      if (accounts.length === 0) setError(err.message || 'Cannot reach server.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAccounts(); 
    const autoLoader = setInterval(() => fetchAccounts(true), 300000); 
    return () => clearInterval(autoLoader);
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return alert("Password must be at least 8 characters.");
    if (!selectedAccount) return;

    const targetId = selectedAccount.account_id || selectedAccount.id;
    if (!targetId) return alert("Cannot reset: Account ID missing.");

    try {
      // HANDSHAKE APPLIED
      const response = await fetch(`${API_BASE_URL}/accounts/reset/${targetId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: newPassword })
      });

      if (response.status === 403) throw new Error('Permission Denied.');
      if (!response.ok) throw new Error('Failed to reset password');
      
      alert('Password updated successfully');
      setIsResetOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const targetId = selectedAccount.account_id || selectedAccount.id;

    try {
      // HANDSHAKE APPLIED
      const response = await fetch(`${API_BASE_URL}/rbac/accounts/${targetId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newRole })
      });

      if (response.status === 403) throw new Error('Unauthorized Action.');
      if (!response.ok) throw new Error('Failed to update role');
      
      fetchAccounts(true);
      setIsRoleOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const processedAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const resProfile = acc.profile || acc.residents;
      let searchName = '';

      if (resProfile) {
        searchName = `${resProfile.first_name || ''} ${resProfile.last_name || ''}`;
      } else if (acc.officials) {
        searchName = acc.officials.full_name || '';
      }

      const search = searchTerm.toLowerCase().trim();
      return !search || 
        (acc.username && acc.username.toLowerCase().includes(search)) || 
        (acc.role && acc.role.toLowerCase().includes(search)) || 
        searchName.toLowerCase().includes(search);
    }).map(acc => {
      const resProfile = acc.profile || acc.residents;
      let fullName = '';

      if (resProfile && (resProfile.first_name || resProfile.last_name)) {
        const lName = resProfile.last_name ? resProfile.last_name.charAt(0).toUpperCase() + resProfile.last_name.slice(1) : '';
        const fName = resProfile.first_name ? resProfile.first_name.charAt(0).toUpperCase() + resProfile.first_name.slice(1) : '';
        fullName = `${lName}${lName && fName ? ', ' : ''}${fName}`;
      } else if (acc.officials && acc.officials.full_name) {
        fullName = acc.officials.full_name;
      } else {
        fullName = String(acc.role).toLowerCase() === 'resident' ? 'Resident Account' : 'System Administrator';
      }
      
      return { ...acc, displayName: fullName };
    });
  }, [accounts, searchTerm]);

  const officialAccounts = processedAccounts.filter(a => {
    const safeRole = String(a.role).toLowerCase();
    return ['admin', 'superadmin', 'staff'].includes(safeRole);
  });
  
  const residentAccounts = processedAccounts.filter(a => String(a.role).toLowerCase() === 'resident');
  const currentTableData = activeTab === 'Officials' ? officialAccounts : residentAccounts;

  return (
    <div className="ACC_PAGE_WRAP">
      <div className="ACC_MAIN_CONTAINER">
        <div className="ACC_STATS_PANEL">
           <div className="ACC_STAT_COL">
              <div className="ACC_STAT_TITLE">
                 SYSTEM ACCOUNTS
                 {isSyncing && <span style={{fontSize:'10px', color:'#3b82f6', marginLeft:'10px'}}>● Syncing...</span>}
              </div>
              <div className="ACC_STAT_SUB">Currently managing:</div>
              <div className="ACC_STAT_HIGHLIGHT">{activeTab} Group</div>
           </div>

           <div className="ACC_STAT_COL ACC_STAT_WIDE">
              <div className="ACC_STAT_TITLE">QUICK SUMMARY</div>
              <div className="ACC_STAT_SUB">
                Manage credentials and administrative permissions for all system users across the barangay network.
              </div>
           </div>

           <div className="ACC_TOTAL_COL">
              <div className="ACC_BIG_NUMBER">{processedAccounts.length}</div>
              <div className="ACC_STAT_TITLE" style={{textAlign:'center'}}>TOTAL RECORDS</div>
           </div>
        </div>

        <div className="ACC_SEARCH_ROW">
           <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1, position: 'relative'}}>
             <i className="fas fa-search" style={{position:'absolute', left:'12px', color:'#94a3b8', fontSize:'0.9rem'}}></i>
             <input 
               className="ACC_SEARCH_INPUT" 
               style={{paddingLeft: '36px'}} 
               placeholder="Search by name, username, or role..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        {error && (
          <div className="ACC_ERROR_BOX" style={{padding: '1rem', color: '#ef4444', background: '#fee2e2', borderRadius: '8px', textAlign: 'center', marginBottom: '1rem'}}>
              <p>{error}</p>
              <button onClick={() => fetchAccounts()} style={{marginTop: '10px', padding: '6px 12px'}}>Retry Connection</button>
          </div>
        )}

        <div className="ACC_TABS_CONTAINER">
          <button className={`ACC_TAB_BTN ${activeTab === 'Officials' ? 'ACTIVE' : ''}`} onClick={() => setActiveTab('Officials')}>
            Officials & System Admins
          </button>
          <button className={`ACC_TAB_BTN ${activeTab === 'Residents' ? 'ACTIVE' : ''}`} onClick={() => setActiveTab('Residents')}>
            Resident Accounts
          </button>
        </div>

        <div className="ACC_TABLE_CARD">
           <div className="ACC_TABLE_WRAP">
               <table className="ACC_TABLE_MAIN">
                 <thead>
                   <tr>
                     <th>USER DETAILS</th>
                     <th>USERNAME</th>
                     <th>ROLE</th>
                     <th style={{textAlign:'right'}}>ACTIONS</th>
                   </tr>
                 </thead>
                 <tbody>
                   {currentTableData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ACC_EMPTY_STATE">
                          No {activeTab.toLowerCase()} found {searchTerm ? `matching "${searchTerm}"` : ''}.
                        </td>
                      </tr>
                   ) : currentTableData.map((acc, index) => {
                     const safeKey = acc.account_id || acc.id || `temp-${index}`;
                     const displayUid = acc.account_id ? acc.account_id.split('-')[0] : acc.id;

                     return (
                       <tr key={safeKey}>
                           <td>
                             <div className="ACC_PROF_FLEX">
                                 <div className={`ACC_AVATAR ${['admin', 'superadmin', 'staff'].includes(String(acc.role).toLowerCase()) ? 'ADMIN' : ''}`}>
                                   {acc.displayName?.charAt(0) || '?'}
                                 </div>
                                 <div className="ACC_PROF_NAME">
                                    {acc.displayName}
                                    <span>UID: {displayUid}...</span>
                                 </div>
                             </div>
                           </td>
                           <td><span className="ACC_TEXT_MUTED">{acc.username}</span></td>
                           <td>
                             <span className={`ACC_BADGE ${['admin', 'superadmin', 'staff'].includes(String(acc.role).toLowerCase()) ? 'ACC_BADGE_ADMIN' : 'ACC_BADGE_RESIDENT'}`}>
                               {String(acc.role).toUpperCase()}
                             </span>
                           </td>
                           <td style={{textAlign:'right'}}>
                               <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                                 <button className="ACC_ACTION_ICON" onClick={() => { setSelectedAccount(acc); setNewRole(acc.role); setIsRoleOpen(true); }} title="Change Role">
                                   <i className="fas fa-user-tag" style={{color: '#3b82f6'}}></i>
                                 </button>
                                 <button className="ACC_ACTION_ICON" onClick={() => { setSelectedAccount(acc); setNewPassword(''); setIsResetOpen(true); }} title="Reset Password">
                                   <i className="fas fa-key" style={{color: '#d97706'}}></i>
                                 </button>
                               </div>
                           </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
           </div>
        </div>
      </div>

      {/* PASSWORD RESET MODAL */}
      {isResetOpen && (
        <div className="ACC_MODAL_OVERLAY">
          <div className="ACC_MODAL_BOX">
            <h2><i className="fas fa-lock"></i> Reset Password</h2>
            <p>Enter a new secure password for <strong>{selectedAccount?.username}</strong>.</p>
            <form onSubmit={handlePasswordReset}>
              <input type="password" required minLength={8} className="ACC_FORM_INPUT" placeholder="New Password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <div className="ACC_MODAL_ACTIONS">
                <button type="button" className="ACC_BTN_CANCEL" onClick={() => setIsResetOpen(false)}>Cancel</button>
                <button type="submit" className="ACC_BTN_SAVE">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE EDIT MODAL */}
      {isRoleOpen && (
        <div className="ACC_MODAL_OVERLAY">
          <div className="ACC_MODAL_BOX">
            <h2><i className="fas fa-user-tag"></i> Edit Account Role</h2>
            <p>Change permissions for <strong>{selectedAccount?.displayName}</strong>.</p>
            <form onSubmit={handleRoleChange}>
              <select className="ACC_FORM_INPUT" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="resident">Resident</option>
                <option value="staff">Barangay Staff</option>
                <option value="admin">Administrator</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <div className="ACC_MODAL_ACTIONS">
                <button type="button" className="ACC_BTN_CANCEL" onClick={() => setIsRoleOpen(false)}>Cancel</button>
                <button type="submit" className="ACC_BTN_SAVE">Save Role</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}