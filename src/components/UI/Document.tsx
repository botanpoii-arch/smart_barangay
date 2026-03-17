import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Document_view from '../forms/Document_view'; 
import Document_modal from '../buttons/Document_modal'; 
import Data_Analytics_modal from '../buttons/Data_Analytics_modal'; // <-- IMPORTED ANALYTICS MODAL
import './styles/Document.css';
import { DOCUMENTS_API } from './api';

export interface IDocRequest {
  id: string;
  referenceNo: string;
  residentName: string;
  type: string;
  purpose: string;
  otherPurpose?: string;
  dateRequested: string;
  status: 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Rejected';
  price: number;
}

export default function DocumentsPage() {
  const [requests, setRequests] = useState<IDocRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'Pending' | 'Processing' | 'Ready' | 'History'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<IDocRequest | null>(null);
  
  // MODAL STATES
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false); // <-- NEW ANALYTICS STATE
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const prevCountRef = useRef(0);
  const [newRequestCount, setNewRequestCount] = useState(0);

  // --- HANDSHAKE HELPER ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    let role = localStorage.getItem('user_role');
    
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

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(DOCUMENTS_API, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('System offline. Cannot sync requests.');
      const rawData = await res.json();

      const mappedData = rawData.map((d: any) => ({
        id: d.id || d.record_id, 
        referenceNo: d.reference_no || d.referenceNo || 'REF-N/A',
        residentName: d.resident_name || d.residentName || 'Unknown Resident',
        type: d.type,
        purpose: d.purpose,
        otherPurpose: d.other_purpose || d.otherPurpose,
        dateRequested: d.date_requested || d.dateRequested || new Date().toISOString(),
        status: d.status,
        price: d.price
      }));

      setRequests(mappedData);

      if (mappedData.length > prevCountRef.current && prevCountRef.current !== 0) {
        const diff = mappedData.length - prevCountRef.current;
        if (diff > 0) {
           setNewRequestCount(diff);
           setTimeout(() => setNewRequestCount(0), 5000);
        }
      }
      prevCountRef.current = mappedData.length;
      setError('');
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(() => fetchRequests(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // FILTERED DATA
  const filteredDocs = useMemo(() => {
    setCurrentPage(1); // Reset page on filter/tab change
    return requests.filter(doc => {
      const rName = (doc.residentName || '').toLowerCase();
      const rRef = (doc.referenceNo || '').toLowerCase();
      const sTerm = searchTerm.toLowerCase();

      const matchesSearch = rName.includes(sTerm) || rRef.includes(sTerm);

      if (activeTab === 'History') {
        return matchesSearch && (doc.status === 'Completed' || doc.status === 'Rejected');
      }
      return matchesSearch && doc.status === activeTab;
    });
  }, [requests, activeTab, searchTerm]);

  // PAGINATION LOGIC
  const totalCount = filteredDocs.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedDocs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDocs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDocs, currentPage]);

  const handleRefresh = () => {
    fetchRequests(true);
    setIsViewModalOpen(false);
    setIsManualModalOpen(false);
    setSelectedDoc(null);
  };

  return (
    <div className="DOC_PAGE_LAYOUT">
      
      {/* 1. TOP HEADER */}
      <div className="DOC_TOP_BAR">
        <div className="DOC_TITLE_GROUP">
          <h1>Document Requests</h1>
          <p>Manage clearances, permits, and certifications.</p>
        </div>
        <button 
          className="DOC_MANUAL_CREATE_BTN" 
          onClick={() => { 
            setSelectedDoc(null); 
            setIsManualModalOpen(true); 
          }}
        >
          <i className="fas fa-plus-circle"></i> Create Manually
        </button>
      </div>

      {/* 2. KPI STATS ROW WITH ANALYTICS CARD */}
      <div className="DOC_STATS_GRID">
        {['Pending', 'Processing', 'Ready'].map(s => (
          <div key={s} className="DOC_STAT_CARD">
            <span className="DOC_STAT_VAL">{requests.filter(r => r.status === s).length}</span>
            <span className="DOC_STAT_LABEL">{s.toUpperCase()}</span>
          </div>
        ))}
        
        {/* NEW CLICKABLE ANALYTICS CARD */}
        <div 
          className="DOC_STAT_CARD" 
          onClick={() => setIsAnalyticsOpen(true)}
          style={{ cursor: 'pointer', background: '#eff6ff', border: '1px dashed #3b82f6', transition: 'all 0.2s' }}
          title="Open Data Analytics Dashboard"
        >
          <span className="DOC_STAT_VAL" style={{ color: '#3b82f6' }}><i className="fas fa-chart-pie"></i></span>
          <span className="DOC_STAT_LABEL" style={{ color: '#1e293b', fontWeight: 'bold' }}>VIEW ANALYTICS</span>
        </div>
      </div>

      {/* 3. CONTROLS BAR */}
      <div className="DOC_CONTROLS_BAR">
        <div className="DOC_TAB_GROUP">
          {['Pending', 'Processing', 'Ready', 'History'].map(tab => (
            <button key={tab} className={`DOC_TAB_ITEM ${activeTab === tab ? 'ACTIVE' : ''}`} onClick={() => setActiveTab(tab as any)}>
              {tab}
            </button>
          ))}
        </div>
        <div className="DOC_SEARCH_FIELD">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search name or ref #..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* 4. DATA TABLE WITH SCROLL AND PAGINATION */}
      <div className="DOC_TABLE_CONTAINER">
        <div className="DOC_TABLE_SCROLL_WRAP">
          <table className="DOC_TABLE_CORE">
            <thead>
              <tr>
                <th>REF ID</th>
                <th>RESIDENT</th>
                <th>TYPE</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th style={{textAlign: 'right'}}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading && !requests.length ? (
                <tr><td colSpan={6} className="MSG_ROW">Syncing records...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="MSG_ROW ERROR">{error}</td></tr>
              ) : paginatedDocs.length === 0 ? (
                <tr><td colSpan={6} className="MSG_ROW">No records matching your search.</td></tr>
              ) : (
                paginatedDocs.map(doc => (
                  <tr key={doc.id} onClick={() => { setSelectedDoc(doc); setIsViewModalOpen(true); }} className="DOC_ROW_CLICK">
                    <td><span className="DOC_REF_BADGE">{doc.referenceNo}</span></td>
                    <td><strong>{doc.residentName}</strong></td>
                    <td>{doc.type}</td>
                    <td>{new Date(doc.dateRequested).toLocaleDateString()}</td>
                    <td><span className={`DOC_STATUS_PILL ${doc.status}`}>{doc.status}</span></td>
                    <td style={{textAlign: 'right'}}><i className="fas fa-chevron-right" style={{color: '#cbd5e1'}}></i></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="DOC_PAGINATION_BAR">
          <div className="DOC_PAGINATION_INFO">
            Showing {totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
          </div>
          <div className="DOC_NAV_GROUP">
            <button 
              className="DOC_NAV_BTN" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button 
              className="DOC_NAV_BTN" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {selectedDoc && (
        <Document_view 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)} 
          onUpdate={handleRefresh} 
          onGenerate={(docData) => {
            setSelectedDoc(docData);
            setIsManualModalOpen(true);
          }}
          data={selectedDoc} 
        />
      )}
      
      <Document_modal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
        onSuccess={handleRefresh} 
        requestData={selectedDoc} 
      />

      {/* NEW ANALYTICS MODAL */}
      <Data_Analytics_modal 
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        data={requests as any}
      />

      {newRequestCount > 0 && (
        <div className="DOC_ALARM_TOAST">
          <i className="fas fa-bell"></i> {newRequestCount} New Requests
        </div>
      )}
    </div>
  );
}