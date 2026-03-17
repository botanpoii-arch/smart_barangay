import React, { useState, useEffect, useCallback } from 'react';
import Profile from './Profile'; 
import HouseholdPage from './Household'; 
import ResidentsPage from './Resident'; 
import BlotterPage from './Blotter';
import DocumentsPage from './Document';
import OfficialsPage from './Officials';
import AuditlogPage from './Auditlog';
import AnnouncementPage from './Announcement'; 
import AccountManagementPage from './Account_Management';
import ArchivePage from './Archive'; 

import './styles/Frame.css';      
import './styles/Dashboard.css';  

const API_BASE = 'http://localhost:8000/api';

// --- SHARED HANDSHAKE HELPER ---
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('user_role') || 'guest';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-user-role': role
  };
};

export interface DashboardStats {
  totalPopulation: number;
  documentsIssued: number;
  blotterCases: number;
  systemActivities: number;
}

export interface DashboardData {
  stats: DashboardStats;
  barangayName: string;
  systemName: string;
  adminName: string;
}

export interface IDocRequest {
  id: string;
  referenceNo: string;
  residentName: string;
  type: string;
  dateRequested: string;
  status: string;
}

const initialDashboardData: DashboardData = {
  stats: { totalPopulation: 0, documentsIssued: 0, blotterCases: 0, systemActivities: 0 },
  barangayName: "Barangay Engineer's Hill",
  systemName: "Smart Barangay",
  adminName: "Administrator",
};

// --- 1. DASHBOARD HOME COMPONENT ---
interface DashboardHomeProps {
  data: DashboardData;
  loading: boolean;
  onNavigate: (tabName: string) => void; 
  onAuthError: () => void; // New prop to handle logout on 401/403
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ data, loading, onNavigate, onAuthError }) => {
  const [pendingDocs, setPendingDocs] = useState<IDocRequest[]>([]);
  const [totalPending, setTotalPending] = useState(0); 
  const [pendingLoading, setPendingLoading] = useState(true);

  const fetchPending = useCallback(async (controller?: AbortController) => {
    try {
      // HANDSHAKE APPLIED HERE
      const res = await fetch(`${API_BASE}/documents`, { 
        headers: getAuthHeaders(),
        signal: controller?.signal 
      });

      if (res.status === 401 || res.status === 403) return onAuthError();

      if (res.ok) {
        const docs = await res.json();
        const allPending = docs.filter((d: any) => d.status === 'Pending');
        setTotalPending(allPending.length);

        const top5Pending = allPending
          .sort((a: any, b: any) => {
             const dateA = new Date(a.date_requested || a.dateRequested || 0).getTime();
             const dateB = new Date(b.date_requested || b.dateRequested || 0).getTime();
             return dateB - dateA;
          })
          .slice(0, 5); 
        
        setPendingDocs(top5Pending.map((d: any) => ({
          id: d.id,
          referenceNo: d.reference_no || d.referenceNo || 'N/A',
          residentName: d.resident_name || d.residentName || 'Unknown',
          type: d.type,
          dateRequested: d.date_requested || d.dateRequested,
          status: d.status
        })));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Widget Error:", err);
    } finally {
      setPendingLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPending(controller);
    const interval = setInterval(() => fetchPending(), 15000); 
    return () => { controller.abort(); clearInterval(interval); };
  }, [fetchPending]);

  const stats = [
    { label: "Total Population", val: data.stats.totalPopulation, icon: "fas fa-users", variant: "DS_VAR_BLUE", targetTab: "Residents" },
    { label: "Documents Issued", val: data.stats.documentsIssued, icon: "fas fa-file-invoice", variant: "DS_VAR_PINK", targetTab: "Document" },
    { label: "Blotter Cases", val: data.stats.blotterCases, icon: "fas fa-gavel", variant: "DS_VAR_YELLOW", targetTab: "Blotter Cases" },
    { label: "System Activities", val: data.stats.systemActivities, icon: "fas fa-history", variant: "DS_VAR_RED", targetTab: "Audit Log" },
  ];

  return (
    <div className="DS_CONTAINER">
      <header className="DS_HEADER">
        <h1 className="DS_TITLE">{data.barangayName}</h1>
        <p className="DS_SUBTITLE">
          Welcome back, <strong>{loading ? "..." : data.adminName}</strong>. 
        </p>
      </header>

      <section className="DS_STATS_GRID">
        {stats.map((stat, i) => (
          <div key={i} className="DS_CARD" onClick={() => onNavigate(stat.targetTab)}>
            <div className="DS_CARD_HEADER">
              <div className="DS_CARD_INFO">
                <span className="DS_CARD_LABEL">{stat.label}</span>
                <h2 className="DS_CARD_VALUE">{loading ? "..." : stat.val.toLocaleString()}</h2>
              </div>
              <div className={`DS_ICON_BOX ${stat.variant}`}><i className={stat.icon}></i></div>
            </div>
            <button className="DS_CARD_LINK">View Details <i className="fas fa-arrow-right"></i></button>
          </div>
        ))}
      </section>

      <div className="DS_BOTTOM_GRID">
        <div className="DS_SECTION_BOX">
          <div className="DS_SECTION_HEADER"><h3><i className="fas fa-map-marked-alt"></i> Barangay Map</h3></div>
          <div className="DS_MAP_VIEW">
            <iframe title="Map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.4253308892976!2d120.60060961486333!3d16.402324988673733!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3391a1687d000001%3A0x6b2e04db7df02c0!2sEngineer's%20Hill%20Barangay%20Hall!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph" width="100%" height="100%" style={{ border: 0 }} loading="lazy"></iframe>
          </div>
        </div>

        <div className="DS_SECTION_BOX">
          <div className="DS_SECTION_HEADER">
            <h3><i className="fas fa-clipboard-check"></i> Pending Requests</h3>
            <span className="DS_BADGE" style={{background: '#ef4444', color: 'white'}}>{totalPending} New</span>
          </div>
          <div className="DS_LIST_CONTAINER">
            {pendingLoading ? <div style={{textAlign: 'center', padding: '20px'}}>Syncing...</div> : 
             pendingDocs.length === 0 ? <div className="DS_PLACEHOLDER_CONTENT"><p>All caught up!</p></div> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {pendingDocs.map(doc => (
                  <li key={doc.id} onClick={() => onNavigate('Document')} className="DS_LIST_ITEM">
                    <div>
                      <div style={{ fontWeight: '700' }}>{doc.residentName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{doc.type} • {new Date(doc.dateRequested).toLocaleDateString()}</div>
                    </div>
                    <span className="DS_DOC_REF">{doc.referenceNo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 2. MAIN DASHBOARD ---
interface DashboardProps {
  onLogout: () => void;
  user: any; 
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, user }) => {
  const [data, setData] = useState<DashboardData>(initialDashboardData);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('admin_active_tab') || 'Dashboard');

  useEffect(() => { localStorage.setItem('admin_active_tab', activeTab); }, [activeTab]);

  const fetchStats = useCallback(async (controller?: AbortController) => {
    try {
      // HANDSHAKE APPLIED HERE
      const res = await fetch(`${API_BASE}/stats`, { 
        headers: getAuthHeaders(),
        signal: controller?.signal 
      });

      if (res.status === 401 || res.status === 403) return onLogout();

      if (!res.ok) throw new Error("Stats sync failed");
      const realData = await res.json();
      
      setData({
        stats: {
          totalPopulation: realData.stats.totalPopulation || 0,
          documentsIssued: realData.stats.documentsIssued || 0,
          blotterCases: realData.stats.blotterCases || 0,
          systemActivities: realData.stats.systemActivities || 0,
        },
        barangayName: realData.barangayName || "Barangay Engineer's Hill",
        systemName: realData.systemName || "Smart Barangay",
        adminName: user?.profileName || user?.username || "Administrator",
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Dashboard Stats Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, onLogout]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller);
    const interval = setInterval(() => fetchStats(), 30000); 
    return () => { controller.abort(); clearInterval(interval); };
  }, [fetchStats]);

  const menuItems = [
    { name: 'Dashboard', icon: 'fas fa-th-large' },
    { name: 'Announcements', icon: 'fas fa-bullhorn' },
    { name: 'Officials', icon: 'fas fa-user-shield' },
    { name: 'Residents', icon: 'fas fa-users' },
    { name: 'Household', icon: 'fas fa-home' },
    { name: 'Document', icon: 'fas fa-file-alt' },
    { name: 'Blotter Cases', icon: 'fas fa-gavel' },
    { name: 'Archive', icon: 'fas fa-archive' },
    { name: 'Audit Log', icon: 'fas fa-clipboard-list' },
    { name: 'Account Management', icon: 'fas fa-user-cog' },
    { name: 'My Profile', icon: 'fas fa-cog' },
  ];

  const handleNavigation = (tabName: string) => setActiveTab(tabName);

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <DashboardHome data={data} loading={loading} onNavigate={handleNavigation} onAuthError={onLogout} />;
      case 'My Profile': return <div className="DS_CONTAINER"><Profile /></div>;
      case 'Household': return <HouseholdPage />;
      case 'Residents': return <ResidentsPage />;
      case 'Blotter Cases': return <BlotterPage />;
      case 'Document': return <DocumentsPage />;
      case 'Officials': return <OfficialsPage />;
      case 'Audit Log': return <AuditlogPage />;
      case 'Announcements': return <AnnouncementPage />;
      case 'Archive': return <ArchivePage />; 
      case 'Account Management': return <AccountManagementPage />;
      default: return <div className="DS_CONTAINER"><h2>{activeTab} Module</h2><p>Coming soon...</p></div>;
    }
  };

  return (
    <div className="FRAME_WRAPPER">
      <aside className="FRAME_SIDEBAR">
        <div className="FRAME_LOGO_AREA">
          <i className="fas fa-landmark FRAME_LOGO_ICON"></i>
          <h2 className="FRAME_LOGO_TEXT">Smart Barangay</h2>
        </div>
        <nav className="FRAME_NAV_AREA">
          {menuItems.map((item, index) => (
            <div 
              key={index} 
              className={`FRAME_MENU_ITEM ${activeTab === item.name ? 'FRAME_MENU_ACTIVE' : ''}`}
              onClick={() => setActiveTab(item.name)}
            >
              <i className={item.icon}></i>
              <span>{item.name}</span>
            </div>
          ))}
        </nav>
        <div className="FRAME_FOOTER"><span className="FRAME_VERSION_TEXT">v1.0.0 Engineers Hill</span></div>
      </aside>

      <div className="FRAME_MAIN_COLUMN">
        <header className="FRAME_TOPBAR">
          <div className="FRAME_BREADCRUMB">Pages / <b>{activeTab}</b></div>
          <div className="FRAME_USER">
             <div className="FRAME_USER_TEXT">
                <span className="FRAME_USER_NAME">{loading ? "..." : data.adminName}</span>
                <span className="FRAME_USER_ROLE">{user?.role?.toUpperCase() || 'ADMIN'}</span>
             </div>
             <div className="FRAME_AVATAR"><i className="fas fa-user-tie"></i></div>
             <button className="TB_LOGOUT_BTN" onClick={onLogout}>Logout</button>
          </div>
        </header>
        <main className="FRAME_CONTENT_AREA">{renderContent()}</main>
      </div>
    </div>
  );
};

export default Dashboard;