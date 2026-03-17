import { useState, useEffect, useMemo, useCallback } from 'react';
import Officials_modal from '../buttons/Officials_modal';
import './styles/Officials.css'; 
import { API_BASE_URL } from './api'; // Centralized Import

interface IOfficial {
  id: string;
  full_name: string;
  position: 'Barangay Captain' | 'Barangay Secretary' | 'Barangay Treasurer' | 'Kagawad' | 'SK Chairperson';
  term_start: string;
  term_end: string;
  status: 'Active' | 'End of Term' | 'Resigned';
  contact_number?: string;
}

export default function OfficialsPage() {
  const [officials, setOfficials] = useState<IOfficial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officialToEdit, setOfficialToEdit] = useState<IOfficial | null>(null);

  // Derive specific endpoint from Centralized Base
  const OFFICIALS_API = `${API_BASE_URL}/officials`;

  // --- HANDSHAKE HELPER: ENSURES SECURE REQUESTS & PREVENTS "UNDEFINED" SPAM ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    let role = localStorage.getItem('user_role');
    
    // Auto-correct corrupt localStorage values to prevent 403 Forbidden loops
    if (!role || role === 'undefined' || role === 'null') {
      role = 'admin'; 
      localStorage.setItem('user_role', 'admin');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, 
      'x-user-role': role                
    };
  }, []);

  const fetchOfficials = async () => {
    setLoading(true);
    try {
      // PERFORM HANDSHAKE (Updated to use OFFICIALS_API)
      const res = await fetch(OFFICIALS_API, {
        headers: getAuthHeaders()
      });

      if (res.status === 403) throw new Error("RBAC: Access Denied.");
      if (res.status === 401) throw new Error("Session Expired. Please Login.");
      
      if (res.ok) {
        const data = await res.json();
        setOfficials(data);
        setError('');
      } else {
        throw new Error(`Server Error: ${res.status}`);
      }
    } catch (err: any) {
      console.error("[FETCH ERROR]", err);
      setError(err.message || 'Cannot reach server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficials();
  }, []);

  const handleAddNew = () => {
    setOfficialToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (off: IOfficial) => {
    setOfficialToEdit(off);
    setIsModalOpen(true);
  };

  // ==========================================
  // NULL-SAFE SEARCH FILTER
  // ==========================================
  const filteredOfficials = useMemo(() => {
    if (!searchTerm.trim()) return officials;

    const lowerSearch = searchTerm.toLowerCase();

    return officials.filter(o => {
      const safeName = (o.full_name || '').toLowerCase();
      const safePosition = (o.position || '').toLowerCase();

      return safeName.includes(lowerSearch) || safePosition.includes(lowerSearch);
    });
  }, [officials, searchTerm]);

  return (
    <div className="OFFIC_PAGE_WRAP">
      <div className="OFFIC_MAIN_CONTAINER">
        
        <div className="OFFIC_HEADER_FLEX">
          <div className="OFFIC_TITLE_GROUP">
            <h1 className="OFFIC_PAGE_TITLE">Barangay Officials</h1>
            <p className="OFFIC_PAGE_SUB">Manage elected and appointed officials.</p>
          </div>
          <button className="OFFIC_ADD_BTN" onClick={handleAddNew}>
            <i className="fas fa-user-plus"></i> Add Official
          </button>
        </div>

        <div className="OFFIC_TABLE_CONTAINER">
          <div className="OFFIC_SEARCH_ROW">
            <div className="OFFIC_SEARCH_INPUT_WRAP">
              <i className="fas fa-search OFFIC_SEARCH_ICON"></i>
              <input 
                className="OFFIC_SEARCH_INPUT" 
                placeholder="Search name or position..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '15px', color: '#ef4444', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div className="OFFIC_TABLE_WRAP">
            <table className="OFFIC_TABLE_MAIN">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>POSITION</th>
                  <th>TERM START</th>
                  <th>STATUS</th>
                  <th className="OFFIC_TEXT_RIGHT">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan={5} className="OFFIC_TABLE_LOAD">Syncing with server...</td></tr>
                ) : filteredOfficials.length === 0 ? (
                   <tr><td colSpan={5} className="OFFIC_TABLE_EMPTY">No officials found.</td></tr>
                ) : (
                  filteredOfficials.map((off) => (
                    <tr key={off.id}>
                      <td className="OFFIC_NAME_CELL">
                        <div className="OFFIC_AVATAR_FLEX">
                          <div className={`OFFIC_AVATAR_CIRCLE ${off.position === 'Barangay Captain' ? 'CAPTAIN' : 'STAFF'}`}>
                            {(off.full_name || 'X').charAt(0)}
                          </div>
                          {off.full_name}
                        </div>
                      </td>
                      <td>{off.position}</td>
                      <td>{off.term_start || 'N/A'}</td>
                      <td>
                        <span className={`OFFIC_STATUS_BADGE ${off.status === 'Active' ? 'ACTIVE' : 'INACTIVE'}`}>
                          {off.status}
                        </span>
                      </td>
                      <td className="OFFIC_ACTIONS_CELL">
                        <button className="OFFIC_ACTION_ICON EDIT" onClick={() => handleEdit(off)} title="Edit">
                          <i className="fas fa-pen"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Officials_modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { fetchOfficials(); }}
        officialToEdit={officialToEdit}
        existingOfficials={officials}
      />
    </div>
  );
}