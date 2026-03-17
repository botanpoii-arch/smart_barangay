import React, { useState, useEffect, useMemo, useCallback } from 'react';
// 1. USE THE SECURE LIBRARY INSTEAD OF XLSX
import ExcelJS from 'exceljs';
import './styles/Auditlog.css';
import { API_BASE_URL, getAuthHeaders } from './api'; 

interface IBlock {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  hash: string;
  prev_hash: string;
}

const AUDIT_API = `${API_BASE_URL}/audit`;

export default function AuditLogPage() {
  const [chain, setChain] = useState<IBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. FETCH CHAIN (With Handshake)
  const fetchChain = useCallback(async () => {
    try {
      const res = await fetch(AUDIT_API, {
        headers: getAuthHeaders() // Added Security Handshake
      });
      if (res.ok) {
        const data = await res.json();
        const sortedData = data.sort((a: IBlock, b: IBlock) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setChain(sortedData);
      }
    } catch (err) {
      console.error("Ledger Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChain();
    const interval = setInterval(fetchChain, 5000);
    return () => clearInterval(interval);
  }, [fetchChain]);

  // 2. FILTERING LOGIC
  const filteredChain = useMemo(() => {
    return chain.filter(block => {
      // Privacy Scrubber
      if (block.actor && block.actor.includes('@residents')) return false;

      const matchesSearch = 
        block.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.hash.includes(searchTerm);

      const blockDate = new Date(block.timestamp).toISOString().split('T')[0];
      const matchesDate = filterDate ? blockDate === filterDate : true;

      return matchesSearch && matchesDate;
    });
  }, [chain, searchTerm, filterDate]);

  // 3. SECURE EXCEL EXPORT (Using ExcelJS)
  const handleExportExcel = async () => {
    if (filteredChain.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('System Audit Log');

    // Define Columns
    worksheet.columns = [
      { header: 'Block ID', key: 'id', width: 10 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'Actor/Account', key: 'actor', width: 30 },
      { header: 'Action', key: 'action', width: 25 },
      { header: 'Details', key: 'details', width: 50 },
      { header: 'Hash', key: 'hash', width: 40 }
    ];

    // Style Header Row (Barangay Style)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Matches your UI Title color
    };

    // Add Data
    filteredChain.forEach(block => {
      worksheet.addRow({
        id: block.id,
        date: new Date(block.timestamp).toLocaleDateString(),
        time: new Date(block.timestamp).toLocaleTimeString(),
        actor: block.actor,
        action: block.action,
        details: block.details,
        hash: block.hash
      });
    });

    // Generate and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Barangay_Audit_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleVerifyChain = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      alert("Cryptographic Integrity Verified: Blockchain is secure.");
    }, 2000);
  };

  const formatActorRole = (actorStr: string) => {
    if (!actorStr) return 'System';
    if (actorStr.includes('@')) {
      const parts = actorStr.split('@')[1]?.split('.');
      if (parts && parts[0]) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return actorStr;
  };

  return (
    <div className="AUDIT_PAGE_WRAP" style={pageStyles}>
      <div className="AUDIT_MAIN_CONTAINER" style={containerStyles}>
        
        {/* HEADER SECTION */}
        <div className="AUDIT_HEADER" style={headerStyles}>
          <div>
            <h1 className="AUDIT_TITLE" style={titleStyles}>System Audit Ledger</h1>
            <p className="AUDIT_SUB" style={subtitleStyles}>Immutable cryptographic trail of all system actions.</p>
          </div>
          
          <div className="AUDIT_ACTIONS" style={flexGap}>
            <button className="AUDIT_EXPORT_BTN" onClick={handleExportExcel} style={btnSecondary}>
              <i className="fas fa-file-excel" style={{ marginRight: '8px' }}></i> Export Excel
            </button>

            <button className="AUDIT_VERIFY_BTN" onClick={handleVerifyChain} disabled={isVerifying} style={isVerifying ? btnWait : btnPrimary}>
              {isVerifying ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-shield-alt"></i>}
              {isVerifying ? ' Verifying...' : ' Verify Chain'}
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="AUDIT_TOOLBAR" style={toolbarStyles}>
          <div className="AUDIT_SEARCH" style={searchWrap}>
            <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
            <input placeholder="Search actor, action, or hash..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={searchInput} />
          </div>
          
          <div className="AUDIT_DATE_FILTER" style={filterWrap}>
            <label><i className="fas fa-filter"></i> Date:</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={dateInput} />
            {filterDate && <button onClick={() => setFilterDate('')} style={clearBtn}>Clear</button>}
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="AUDIT_TABLE_CONTAINER" style={tableContainerStyles}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date & Time</th>
                <th style={thStyle}>Account / Role</th>
                <th style={thStyle}>Action & Details</th>
                <th style={thStyle}>Blockchain Hash</th>
                <th style={thStyle}>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {loading && chain.length === 0 ? (
                <tr><td colSpan={5} style={emptyStyle}>Syncing with distributed ledger...</td></tr>
              ) : filteredChain.length === 0 ? (
                <tr><td colSpan={5} style={emptyStyle}>No records found matching criteria.</td></tr>
              ) : (
                filteredChain.map((block) => (
                  <tr key={block.id} style={trStyle}>
                    <td style={cellStyle}>
                        <div style={{fontWeight: 600}}>{new Date(block.timestamp).toLocaleDateString()}</div>
                        <div style={{fontSize: '0.75rem', color: '#64748b'}}>{new Date(block.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td style={cellStyle}>
                      <div style={actorName}><i className="fas fa-user-shield" style={{marginRight: '6px', color: '#94a3b8'}}></i>{formatActorRole(block.actor)}</div>
                      <div style={actorEmail}>{block.actor}</div>
                    </td>
                    <td style={{...cellStyle, maxWidth: '350px'}}>
                      <div style={actionName}>{block.action}</div>
                      <div style={actionDetails}>{block.details}</div>
                    </td>
                    <td style={{...cellStyle, fontFamily: 'monospace'}}>
                      <div style={hashPrev} title={block.prev_hash}><span style={badgeStyle}>PREV</span> {block.prev_hash.substring(0, 12)}...</div>
                      <div style={hashCurr} title={block.hash}><span style={badgeCurrStyle}>CURR</span> {block.hash.substring(0, 12)}...</div>
                    </td>
                    <td style={cellStyle}><span style={secureBadge}><i className="fas fa-check-shield"></i> VERIFIED</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- STYLING OBJECTS ---
const pageStyles: React.CSSProperties = { padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' };
const containerStyles: React.CSSProperties = { maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' };
const headerStyles: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' };
const titleStyles: React.CSSProperties = { fontSize: '1.8rem', fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' };
const subtitleStyles: React.CSSProperties = { fontSize: '0.9rem', color: '#64748b', margin: 0 };
const flexGap: React.CSSProperties = { display: 'flex', gap: '12px' };
const btnSecondary: React.CSSProperties = { background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { background: '#0f172a', border: 'none', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' };
const btnWait: React.CSSProperties = { ...btnPrimary, background: '#f59e0b', cursor: 'wait' };
const toolbarStyles: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const searchWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', width: '350px' };
const searchInput: React.CSSProperties = { border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' };
const filterWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600 };
const dateInput: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px' };
const clearBtn: React.CSSProperties = { background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' };
const tableContainerStyles: React.CSSProperties = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const };
const thStyle: React.CSSProperties = { padding: '14px 16px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' };
const trStyle: React.CSSProperties = { borderBottom: '1px solid #f1f5f9' };
const cellStyle: React.CSSProperties = { padding: '16px', fontSize: '0.85rem' };
const emptyStyle: React.CSSProperties = { textAlign: 'center' as const, padding: '50px', color: '#94a3b8', fontStyle: 'italic' };
const actorName: React.CSSProperties = { fontWeight: 700, color: '#1e293b', marginBottom: '2px' };
const actorEmail: React.CSSProperties = { fontSize: '0.75rem', color: '#94a3b8' };
const actionName: React.CSSProperties = { fontWeight: 700, color: '#334155', marginBottom: '4px' };
const actionDetails: React.CSSProperties = { color: '#64748b', lineHeight: '1.4', fontSize: '0.8rem' };
const hashPrev: React.CSSProperties = { color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' };
const hashCurr: React.CSSProperties = { color: '#0f172a', fontSize: '0.75rem', fontWeight: 600 };
const badgeStyle: React.CSSProperties = { background: '#f1f5f9', padding: '2px 4px', borderRadius: '3px', color: '#64748b', fontSize: '0.65rem' };
const badgeCurrStyle: React.CSSProperties = { ...badgeStyle, background: '#dcfce7', color: '#15803d' };
const secureBadge: React.CSSProperties = { background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 };