import { useState, useEffect, useMemo } from 'react';
import './styles/Archive.css'; // Dedicated Archive CSS
import { API_BASE_URL } from './api'; // <-- Centralized Import

type ArchiveTab = 'Documents' | 'Blotter';

export default function Archive() {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('Documents');
  const [documents, setDocuments] = useState<any[]>([]);
  const [blotters, setBlotters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- 1. STRICT ARCHIVE FETCHING ---
  useEffect(() => {
    const fetchArchiveData = async () => {
      setLoading(true);
      try {
        const [docRes, blotterRes] = await Promise.all([
          fetch(`${API_BASE_URL}/documents`),
          fetch(`${API_BASE_URL}/blotter`)
        ]);

        if (docRes.ok) {
          const docData = await docRes.json();
          // STRICT ARCHIVE: Only pull terminal states
          const archivedDocs = docData.filter((d: any) => 
            d.status === 'Completed' || d.status === 'Rejected' || d.status === 'Archived'
          );
          setDocuments(archivedDocs);
        }

        if (blotterRes.ok) {
          const blotterData = await blotterRes.json();
          // STRICT ARCHIVE: Only pull terminal states
          const archivedBlotters = blotterData.filter((b: any) => 
            b.status === 'Settled' || b.status === 'Archived' || b.status === 'Dismissed'
          );
          setBlotters(archivedBlotters);
        }
      } catch (err) {
        console.error("Failed to fetch archive records", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArchiveData();
  }, []);

  // --- 2. SEARCH FILTERING ---
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => 
      (doc.reference_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (doc.resident_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (doc.type?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.date_requested).getTime() - new Date(a.date_requested).getTime());
  }, [documents, searchTerm]);

  const filteredBlotters = useMemo(() => {
    return blotters.filter(caseItem => 
      (caseItem.case_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (caseItem.complainant_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (caseItem.respondent?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.date_filed).getTime() - new Date(a.date_filed).getTime());
  }, [blotters, searchTerm]);

  return (
    <div className="ARC_PAGE_WRAP">
      <div className="ARC_MAIN_CONTAINER">
        
        {/* --- HEADER STATS PANEL --- */}
        <div className="ARC_STATS_PANEL">
           <div className="ARC_STAT_COL">
              <div className="ARC_STAT_TITLE">VAULT STATUS</div>
              <div className="ARC_STAT_SUB">Historical Records</div>
              <div className="ARC_STAT_HIGHLIGHT"><i className="fas fa-lock"></i> Read-Only</div>
           </div>

           <div className="ARC_STAT_COL ARC_STAT_WIDE">
              <div className="ARC_STAT_TITLE">ARCHIVE DIRECTORY</div>
              <div className="ARC_STAT_SUB">
                This secure vault contains permanently closed cases and finalized documents. These records cannot be altered.
              </div>
           </div>

           <div className="ARC_TOTAL_COL">
              <div className="ARC_BIG_NUMBER">
                {activeTab === 'Documents' ? filteredDocs.length : filteredBlotters.length}
              </div>
              <div className="ARC_STAT_TITLE" style={{textAlign:'center'}}>
                {activeTab === 'Documents' ? 'STORED DOCS' : 'STORED CASES'}
              </div>
           </div>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="ARC_SEARCH_ROW">
           <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1, position: 'relative'}}>
             <i className="fas fa-search" style={{position:'absolute', left:'16px', color:'#64748b', fontSize:'1rem'}}></i>
             <input 
               className="ARC_SEARCH_INPUT" 
               placeholder={activeTab === 'Documents' ? "Search archived documents by reference or name..." : "Search archived cases by case number or names..."} 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        {/* --- TABS --- */}
        <div className="ARC_TABS_CONTAINER">
          <button 
            className={`ARC_TAB_BTN ${activeTab === 'Documents' ? 'ACTIVE' : ''}`}
            onClick={() => setActiveTab('Documents')}
          >
            <i className="fas fa-folder-open"></i> Document Archives
          </button>
          <button 
            className={`ARC_TAB_BTN ${activeTab === 'Blotter' ? 'ACTIVE' : ''}`}
            onClick={() => setActiveTab('Blotter')}
          >
            <i className="fas fa-file-signature"></i> Blotter Archives
          </button>
        </div>

        {/* --- DATA TABLE --- */}
        <div className="ARC_TABLE_CARD">
           <div className="ARC_TABLE_WRAP">
               {loading ? (
                  <div className="ARC_LOADING_STATE">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <p>Decrypting archive vault...</p>
                  </div>
               ) : activeTab === 'Documents' ? (
                 <table className="ARC_TABLE_MAIN">
                   <thead>
                     <tr>
                       <th>REFERENCE NO.</th>
                       <th>RESIDENT NAME</th>
                       <th>DOCUMENT TYPE</th>
                       <th>DATE FINALIZED</th>
                       <th style={{textAlign:'right'}}>END STATUS</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredDocs.length === 0 ? (
                        <tr><td colSpan={5} className="ARC_EMPTY_STATE"><i className="fas fa-box-open"></i> No archived documents found.</td></tr>
                     ) : filteredDocs.map((doc) => (
                       <tr key={doc.id}>
                           <td className="ARC_ID_CELL">{doc.reference_no}</td>
                           <td className="ARC_NAME_CELL">{doc.resident_name}</td>
                           <td className="ARC_TYPE_CELL">{doc.type}</td>
                           <td className="ARC_DATE_CELL">{new Date(doc.date_requested).toLocaleDateString()}</td>
                           <td style={{textAlign:'right'}}>
                             <span className={`ARC_BADGE ${doc.status === 'Completed' ? 'SUCCESS' : 'DANGER'}`}>
                               {doc.status.toUpperCase()}
                             </span>
                           </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               ) : (
                 <table className="ARC_TABLE_MAIN">
                   <thead>
                     <tr>
                       <th>CASE NO.</th>
                       <th>COMPLAINANT</th>
                       <th>RESPONDENT</th>
                       <th>NATURE OF CASE</th>
                       <th style={{textAlign:'right'}}>END STATUS</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredBlotters.length === 0 ? (
                        <tr><td colSpan={5} className="ARC_EMPTY_STATE"><i className="fas fa-box-open"></i> No settled cases found.</td></tr>
                     ) : filteredBlotters.map((blotter) => (
                       <tr key={blotter.id}>
                           <td className="ARC_ID_CELL">{blotter.case_number}</td>
                           <td className="ARC_NAME_CELL">{blotter.complainant_name}</td>
                           <td className="ARC_TYPE_CELL">{blotter.respondent}</td>
                           <td className="ARC_DATE_CELL">{blotter.incident_type}</td>
                           <td style={{textAlign:'right'}}>
                             <span className={`ARC_BADGE ${blotter.status === 'Settled' ? 'INFO' : 'NEUTRAL'}`}>
                               {blotter.status.toUpperCase()}
                             </span>
                           </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
           </div>
        </div>

      </div>
    </div>
  );
}