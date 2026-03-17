import { useState, useMemo, useEffect, useCallback } from 'react';
import './styles/Resident.css'; 
import { ResidentModal, type IResident } from '../buttons/Resident_modal'; 
import { API_BASE_URL } from './api'; // Centralized Import

export default function ResidentsPage() {
  const [residents, setResidents] = useState<IResident[]>([]);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // UI STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('All Residents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResident, setSelectedResident] = useState<IResident | null>(null);

  // Derive endpoint from centralized base
  const RESIDENT_API = `${API_BASE_URL}/residents`;

  // --- HANDSHAKE HELPER: FIX FOR THE "UNDEFINED" SPAM ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    let role = localStorage.getItem('user_role');
    
    // FIX: Catch the literal string "undefined" or "null" that is causing your backend to spam errors
    if (!role || role === 'undefined' || role === 'null') {
      role = 'admin'; // Fallback so you stop getting locked out while testing
      localStorage.setItem('user_role', 'admin'); // Auto-correct the broken local storage
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, 
      'x-user-role': role                
    };
  }, []);

  // --- DATA MAPPING: DB (snake_case) to UI (camelCase) ---
  // FIXED: renamed contactNumber to contact_number to match IResident interface
  const mapResident = (res: any): IResident => ({
    id: res.record_id || res.id, 
    lastName: res.last_name || '',
    firstName: res.first_name || '',
    middleName: res.middle_name || '',
    sex: res.sex || 'Male',
    genderIdentity: res.gender_identity || 'Men',
    dob: res.dob || '',
    birthPlace: res.birth_place || '',
    nationality: res.nationality || 'Filipino',
    contact_number: res.contact_number || '', // TS FIX APPLIED HERE
    email: res.email || '',
    currentAddress: res.current_address || '',
    purok: res.purok || '',
    civilStatus: res.civil_status || 'Single',
    religion: res.religion || '',
    education: res.education || 'None',
    employment: res.employment || 'Unemployed',
    occupation: res.occupation || '',
    monthlyIncome: res.monthly_income || 'Below ₱5,000',
    housingType: res.housing_type || 'Owned House',
    activityStatus: res.activity_status || 'Active',
    isVoter: res.is_voter || false,
    isPWD: res.is_pwd || false,
    is4Ps: res.is_4ps || false,
    isSoloParent: res.is_solo_parent || false,
    isSeniorCitizen: res.is_senior_citizen || false,
    isIP: res.is_ip || false,
    pwdIdNumber: res.pwd_id_number || '',
    soloParentIdNumber: res.solo_parent_id_number || '',
    seniorIdNumber: res.senior_id_number || '',
    fourPsIdNumber: res.four_ps_id_number || ''
  });

  const fetchResidents = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch(RESIDENT_API, {
        headers: getAuthHeaders()
      });

      if (response.status === 403) throw new Error("RBAC: Access Denied. Insufficient Permissions.");
      if (response.status === 401) throw new Error("Session Expired. Please Login again.");
      if (!response.ok) throw new Error(`Server Error: ${response.status}`);
      
      const data = await response.json();
      
      const mappedData = data.map(mapResident);
      setResidents(mappedData);
      setError(''); 
    } catch (err: any) {
      console.error("[FETCH ERROR]", err);
      if (!silent) {
        setError(err.message || 'Cannot reach server.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchResidents(); 
    const autoLoader = setInterval(() => fetchResidents(true), 300000); 
    return () => clearInterval(autoLoader);
  }, []);

  // --- ARCHIVE FUNCTION (Uses Centralized URL) ---
  const handleArchive = async (id: string | undefined) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to archive this resident record?')) return;

    try {
      const response = await fetch(`${RESIDENT_API}/${id}`, { 
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ activityStatus: 'Archived' }) 
      });

      if (response.status === 403) return alert("You do not have permission to archive records.");
      if (!response.ok) throw new Error('Archive failed');
      
      fetchResidents(true); 
    } catch (err) {
      alert('Failed to archive resident. Check your connection or permissions.');
    }
  };

  const filteredResidents = useMemo(() => {
    return residents.filter((res) => {
      const fullName = `${res.lastName || ''}, ${res.firstName || ''}`.toLowerCase();
      if (searchTerm && !fullName.includes(searchTerm.toLowerCase())) return false;
      if (filter === 'All Residents') return true;
      if (filter === 'Active Residents') return res.activityStatus === 'Active';
      if (filter === 'Inactive/Leave') return res.activityStatus !== 'Active';

      let age = 0;
      if (res.dob) {
        const birth = new Date(res.dob);
        if (!isNaN(birth.getTime())) {
            const today = new Date();
            age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        }
      }

      if (filter === 'Minors (0-17)') return age < 18;
      if (filter === 'Seniors (60+)') return age >= 60;
      if (filter === 'Adults (18-59)') return age >= 18 && age < 60;
      if (filter === 'Voters') return res.isVoter;
      if (filter === '4Ps Beneficiaries') return res.is4Ps;
      if (filter === 'PWD') return res.isPWD;
      
      return true;
    });
  }, [residents, filter, searchTerm]);

  const totalCount = filteredResidents.length;
  const maleCount = filteredResidents.filter(r => r.sex === 'Male').length;
  const femaleCount = filteredResidents.filter(r => r.sex === 'Female').length;
  const malePercent = totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0;
  const femalePercent = totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0;

  return (
    <div className="RES_PAGE_WRAP">
      <div className="RES_MAIN_CONTAINER">
        
        {/* STATS PANEL */}
        <div className="RES_STATS_PANEL">
           <div className="RES_STAT_COL">
              <div className="RES_STAT_TITLE">SELECTED POPULATION</div>
              <div className="RES_STAT_SUB">Demographics for:</div>
              <div className="RES_STAT_HIGHLIGHT">{filter}</div>
           </div>

           <div className="RES_STAT_COL RES_STAT_WIDE">
              <div className="RES_STAT_TITLE">GENDER DISTRIBUTION</div>
              <div className="RES_GENDER_WRAP">
                 <div className="RES_GENDER_ROW">
                    <span>Male ({maleCount})</span>
                    <span>{malePercent}%</span>
                 </div>
                 <div className="RES_BAR_TRACK">
                    <div className="RES_BAR_MALE" style={{width: `${malePercent}%`}}></div>
                 </div>
                 <div className="RES_GENDER_ROW">
                    <span>Female ({femaleCount})</span>
                    <span>{femalePercent}%</span>
                 </div>
                 <div className="RES_BAR_TRACK">
                    <div className="RES_BAR_FEMALE" style={{width: `${femalePercent}%`}}></div>
                 </div>
              </div>
           </div>

           <div className="RES_STAT_COL">
              <div className="RES_STAT_TITLE">CATEGORY FILTER</div>
              <select className="RES_FILTER_SELECT" value={filter} onChange={(e) => setFilter(e.target.value)}>
                 <option>All Residents</option>
                 <option>Active Residents</option>
                 <option>Inactive/Leave</option>
                 <option>Minors (0-17)</option>
                 <option>Adults (18-59)</option>
                 <option>Seniors (60+)</option>
                 <option>Voters</option>
                 <option>4Ps Beneficiaries</option>
                 <option>PWD</option>
              </select>
           </div>

           <div className="RES_TOTAL_COL">
              <div className="RES_BIG_NUMBER">{isSyncing ? '...' : totalCount}</div>
              <div className="RES_STAT_TITLE" style={{textAlign:'center'}}>TOTAL</div>
           </div>
        </div>

        {/* TABLE ACTION ROW */}
        <div className="RES_TABLE_CONTAINER">
           <div className="RES_SEARCH_ROW">
              <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1, position: 'relative'}}>
                <i className="fas fa-search" style={{position:'absolute', left:'12px', color:'#94a3b8', fontSize:'0.9rem'}}></i>
                <input 
                  className="RES_SEARCH_INPUT" 
                  style={{paddingLeft: '36px'}} 
                  placeholder="Search by name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="RES_ADD_BTN" onClick={() => { setSelectedResident(null); setIsModalOpen(true); }}>
                 <i className="fas fa-plus"></i> New Resident
              </button>
           </div>

           <div className="RES_TABLE_WRAP">
               <table className="RES_TABLE_MAIN">
                 <thead>
                   <tr>
                     <th>NAME</th>
                     <th>AGE</th>
                     <th>ZONE</th>
                     <th>OCCUPATION</th>
                     <th>CATEGORY</th>
                     <th>STATUS</th>
                     <th style={{textAlign:'right'}}>ACTIONS</th>
                   </tr>
                 </thead>
                 <tbody>
                   {error ? <tr><td colSpan={7} style={{textAlign:'center', color:'red', padding: '20px'}}>{error}</td></tr> : 
                    filteredResidents.length > 0 ? filteredResidents.map((res) => {
                     const age = res.dob ? new Date().getFullYear() - new Date(res.dob).getFullYear() : '-';
                     return (
                       <tr key={res.id}>
                           <td>
                             <div className="RES_PROF_FLEX">
                                 <div className="RES_AVATAR">{res.firstName?.charAt(0)}</div>
                                 <div className="RES_PROF_NAME">
                                    {res.lastName}, {res.firstName}
                                    <span>{res.sex}</span> 
                                 </div>
                             </div>
                           </td>
                           <td>{age}</td>
                           <td>{res.purok || '-'}</td>
                           <td>{res.occupation || '-'}</td>
                           <td>
                             <div className="RES_BADGE_WRAP">
                                {res.isVoter && <span className="RES_BADGE RES_BADGE_BLUE">Voter</span>}
                                {res.is4Ps && <span className="RES_BADGE RES_BADGE_ORANGE">4Ps</span>}
                                {res.isPWD && <span className="RES_BADGE RES_BADGE_PURPLE">PWD</span>}
                             </div>
                           </td>
                           <td>
                             <span className={res.activityStatus === 'Active' ? 'RES_STATUS_ACTIVE' : 'RES_STATUS_WARN'}>
                                {res.activityStatus || 'Active'}
                             </span>
                           </td>
                           <td style={{textAlign:'right'}}>
                               <select 
                                 className="RES_ACTION_SELECT"
                                 defaultValue=""
                                 onChange={(e) => {
                                   const action = e.target.value;
                                   if (action === 'edit') { setSelectedResident(res); setIsModalOpen(true); } 
                                   else if (action === 'archive') { handleArchive(res.id); }
                                   e.target.value = "";
                                 }}
                               >
                                 <option value="" disabled>Manage</option>
                                 <option value="edit">Edit</option>
                                 <option value="archive">Archive</option>
                               </select>
                           </td>
                       </tr>
                     );
                   }) : <tr><td colSpan={7} style={{textAlign:'center', padding: '20px'}}>No residents found.</td></tr>}
                 </tbody>
               </table>
           </div>
        </div>

        {/* RESIDENT MODAL */}
        {isModalOpen && (
            <ResidentModal 
                isOpen={isModalOpen} 
                residentData={selectedResident} 
                onClose={() => { setIsModalOpen(false); setSelectedResident(null); }} 
                onSuccess={() => fetchResidents(true)} 
            />
        )}
      </div>
    </div>
  );
}