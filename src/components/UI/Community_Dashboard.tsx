import React, { useState, useEffect, useMemo, useCallback } from 'react';
import "./styles/Community_Dashboard.css";

// IMPORTED MODALS & VIEWS
import CommunityResetPasswordModal from '../buttons/Community_Resetpassword_modal'; 
import Community_Blotter_Request from '../buttons/Community_Blotter_Request'; 
import Community_Document_Request from '../buttons/Community_Document_Request';
import Community_Preview, { type NewsItem } from '../forms/Community_preview';
import Community_Blotter_view from '../forms/Community_Blotter_view';
import Community_Document_view from '../forms/Community_Document_view';
import Community_Profile from '../forms/Community_Profile';
import Community_Guide, { type GuideStep } from '../buttons/Community_Guide'; 
import { API_BASE_URL } from './api'; // Centralized Import

interface DashboardProps {
  onLogout: () => void;
}

type MainView = 'Announcements' | 'Blotter' | 'Documents';
type TabState = 'Pending' | 'Processing' | 'Ready' | 'Completed';

const Community_Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  // --- STATE MANAGEMENT ---
  const [resident, setResident] = useState<any>(null);
  const [blotters, setBlotters] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]); 
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  
  const [currentView, setCurrentView] = useState<MainView>('Announcements');
  const [activeTab, setActiveTab] = useState<TabState>('Pending');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Selection States (For the Side Panel)
  const [selectedRecord, setSelectedRecord] = useState<any>(null); 
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  // UI Toggles
  const [showProfile, setShowProfile] = useState(false);
  const [showForceReset, setShowForceReset] = useState(false);
  const [showBlotterModal, setShowBlotterModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false); 
  const [showGuide, setShowGuide] = useState(false); 

  // Mapping specific endpoints from the imported root
  const BLOTTER_URL = `${API_BASE_URL}/blotter`;
  const DOCUMENTS_URL = `${API_BASE_URL}/documents`;
  const ANNOUNCEMENTS_URL = `${API_BASE_URL}/announcements`;

  const filters = ['All', 'Public Advisory', 'Senior Citizen', 'Health & Safety', 'Youth & Sports', 'Community Project'];

  // --- HANDSHAKE HELPER (AUTHENTICATION HEADERS) ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    let role = localStorage.getItem('user_role');
    
    // Default to resident if not found, since this is the Community Dashboard
    if (!role || role === 'undefined' || role === 'null') {
      role = 'resident'; 
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, 
      'x-user-role': role                
    };
  }, []);

  // --- INITIALIZE SESSION ---
  useEffect(() => {
    const savedSession = localStorage.getItem('resident_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      const profileData = parsed.profile || {};
      
      if (parsed.requires_reset === true) {
        setShowForceReset(true);
      }
      
      if (!profileData.record_id) {
        localStorage.removeItem('resident_session');
        onLogout(); 
        return;
      }

      setResident({ 
        ...profileData, 
        formattedName: `${profileData.first_name} ${profileData.last_name}`, 
        record_id: profileData.record_id,
        account_id: parsed.account_id || parsed.id,
        username: parsed.username
      });
      
      fetchData(profileData.record_id);

    } else {
      onLogout();
    }
  }, [onLogout]);

  // Handle Guide display securely after data loads
  useEffect(() => {
    if (!loading && resident) {
      try {
        const hasSeenGuide = localStorage.getItem('has_seen_guide');
        if (!hasSeenGuide) {
          setShowGuide(true);
        }
      } catch (e) {
        console.warn("localStorage is disabled");
      }
    }
  }, [loading, resident]);

  const finishGuide = () => {
    setShowGuide(false);
    try {
      localStorage.setItem('has_seen_guide', 'true');
    } catch (error) {
      console.error("Could not save guide preferences", error);
    }
  };

  // --- FETCH & MAP DATA ---
  const fetchData = async (residentId: string) => {
    if (!residentId) return;
    try {
      setLoading(true);
      
      // Handshake applied to the parallel fetch requests
      const [blotterRes, docRes, newsRes] = await Promise.all([
        fetch(BLOTTER_URL, { headers: getAuthHeaders() }),
        fetch(DOCUMENTS_URL, { headers: getAuthHeaders() }),
        fetch(ANNOUNCEMENTS_URL, { headers: getAuthHeaders() })
      ]);

      if (!blotterRes.ok || !docRes.ok || !newsRes.ok) throw new Error("Sync failed");

      const blotterData = await blotterRes.json();
      const docData = await docRes.json();
      const newsData = await newsRes.json();

      setNewsList(newsData);

      setBlotters(blotterData
        .filter((b: any) => b.complainant_id === residentId)
        .map((b: any) => {
          let uiTab = 'Pending';
          if (b.status === 'Active' || b.status === 'Hearing') uiTab = 'Processing';
          else if (b.status === 'Settled' || b.status === 'Archived' || b.status === 'Dismissed') uiTab = 'Completed';

          return {
            id: b.case_number, 
            type: 'Blotter Report',
            date: b.date_filed, 
            status: uiTab, 
            rawStatus: b.status, 
            details: `Vs ${b.respondent}: ${b.incident_type}`, 
            price: 'Free',
          };
        })
      );

      setDocuments(docData
        .filter((d: any) => d.resident_id === residentId)
        .map((d: any) => {
          return {
            id: d.reference_no || 'REF-N/A', 
            type: d.type || 'Document',
            date: new Date(d.date_requested).toLocaleDateString(),
            status: d.status || 'Pending', 
            rawStatus: d.status,
            details: `Purpose: ${d.purpose}`,
            price: !d.price ? 'Free' : `₱${d.price}.00`,
          };
        })
      );

    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredNews = useMemo(() => {
    return newsList.filter(n => activeFilter === 'All' || n.category === activeFilter);
  }, [newsList, activeFilter]);

  const getFilteredList = (list: any[]) => {
    return list.filter(item => 
      item.status.toLowerCase() === activeTab.toLowerCase() && 
      (item.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.details?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // --- DYNAMIC GUIDE STEPS ---
  const getGuideSteps = (): GuideStep[] => {
    if (showProfile) {
      return [
        { targetId: 'guide-profile-btn', title: 'Profile Settings', content: 'Manage your personal information and update your password here.', position: 'bottom' }
      ];
    }
    
    switch (currentView) {
      case 'Blotter':
        return [
          { targetId: 'guide-blotter-tab', title: 'Blotter History', content: 'Track the status of your reported incidents.', position: 'bottom' },
          { targetId: 'guide-add-btn', title: 'File a Report', content: 'Click here to submit a new blotter incident.', position: 'left' }
        ];
      case 'Documents':
        return [
          { targetId: 'guide-documents-tab', title: 'My Documents', content: 'View and track all your requested community documents.', position: 'bottom' },
          { targetId: 'guide-add-btn', title: 'Request Document', content: 'Click here to request a new certificate or clearance.', position: 'left' }
        ];
      case 'Announcements':
      default:
        return [
          { targetId: 'guide-bulletin-tab', title: 'Bulletin Board', content: 'Stay updated with the latest community announcements here.', position: 'bottom' },
          { targetId: 'guide-profile-btn', title: 'Your Profile', content: 'Click your profile to manage your account settings.', position: 'bottom' }
        ];
    }
  };

  const currentGuideSteps = getGuideSteps();

  return (
    <div className="DASH_PAGE_ROOT">
      {/* GUIDE COMPONENT */}
      <Community_Guide 
        isOpen={showGuide} 
        steps={currentGuideSteps}
        onComplete={finishGuide} 
        onSkip={finishGuide} 
      />

      {/* --- FLOATING HELP BUTTON --- */}
      {!showGuide && (
        <button 
          onClick={() => setShowGuide(true)}
          title="Show Tour Guide"
          style={{
            position: 'fixed',
            bottom: '80px', 
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#1a56db',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9990,
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <i className="fas fa-question"></i>
        </button>
      )}

      {/* --- TIER 1: MAIN NAVIGATION --- */}
      <nav className="DASH_PRIMARY_NAV">
        <div className="NAV_LEFT">
          <div className="BRAND_BOX">
            <i className="fas fa-shield-alt"></i>
            <span>ENGINEER'S HILL</span>
          </div>
          {/* DESKTOP VIEW SWITCHER */}
          <div className="VIEW_SWITCHER DESKTOP_ONLY">
            <button 
              id="guide-bulletin-tab"
              className={currentView === 'Announcements' && !showProfile ? 'ACTIVE' : ''} 
              onClick={() => { setCurrentView('Announcements'); setShowProfile(false); setSelectedRecord(null); }}
            >
              Bulletin Board
            </button>
            <button 
              id="guide-blotter-tab" 
              className={currentView === 'Blotter' && !showProfile ? 'ACTIVE' : ''} 
              onClick={() => { setCurrentView('Blotter'); setShowProfile(false); setSelectedRecord(null); }}
            >
              Blotter History
            </button>
            <button 
              id="guide-documents-tab"
              className={currentView === 'Documents' && !showProfile ? 'ACTIVE' : ''} 
              onClick={() => { setCurrentView('Documents'); setShowProfile(false); setSelectedRecord(null); }}
            >
              My Documents
            </button>
          </div>
        </div>

        <div className="NAV_RIGHT">
          <div 
            id="guide-profile-btn" 
            className="USER_PROFILE" 
            onClick={() => setShowProfile(true)} 
            style={{ cursor: 'pointer' }}
          >
            <div className="USER_TEXT DESKTOP_ONLY">
              <span className="NAME">{resident?.formattedName}</span>
              <span className="ROLE">RESIDENT</span>
            </div>
            <div className="AVATAR_CIRCLE">{resident?.formattedName?.charAt(0) || 'U'}</div>
          </div>
          <button className="LOGOUT_BTN DESKTOP_ONLY" onClick={onLogout} title="Logout" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            Logout
          </button>
          {/* MOBILE LOGOUT ICON */}
          <button className="LOGOUT_BTN MOBILE_ONLY" onClick={onLogout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </nav>

      {/* --- MAIN DASHBOARD VIEWPORT --- */}
      <main className="DASH_VIEWPORT">
        {showProfile ? (
          <Community_Profile 
            resident={resident} 
            onClose={() => setShowProfile(false)} 
            onEditPassword={() => setShowForceReset(true)} 
          />
        ) : (
          <>
            {/* --- TIER 2: SECONDARY NAV --- */}
            <div className="DASH_SECONDARY_NAV">
              {currentView === 'Announcements' ? (
                <div className="CM_FILTER_BAR">
                  {filters.map(f => (
                    <button 
                      key={f} 
                      className={`CM_FILTER_TAB ${activeFilter === f ? 'ACTIVE' : ''}`}
                      onClick={() => setActiveFilter(f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="STATUS_TABS">
                    {['Pending', 'Processing', 'Ready', 'Completed'].map((tab) => (
                      <button key={tab} className={`STATUS_BTN ${activeTab === tab ? 'ACTIVE' : ''}`} onClick={() => setActiveTab(tab as TabState)}>
                        {tab === 'Ready' ? 'Ready for Pickup' : tab}
                        <span className="COUNT_BADGE">
                          {currentView === 'Blotter' ? blotters.filter(b => b.status === tab).length : documents.filter(d => d.status === tab).length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="SUB_NAV_TOOLS">
                    <div className="SUB_SEARCH">
                      <i className="fas fa-search"></i>
                      <input placeholder={`Search ${currentView}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button id="guide-add-btn" className="BTN_ADD" onClick={() => currentView === 'Blotter' ? setShowBlotterModal(true) : setShowDocModal(true)}>
                      <i className="fas fa-plus"></i> <span className="BTN_TEXT">New {currentView === 'Blotter' ? 'Report' : 'Request'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="CONTENT_AREA">
              {loading ? (
                <div className="DASH_LOADER"><div className="SPINNER"></div><p>Syncing...</p></div>
              ) : currentView === 'Announcements' ? (
                <div className="CM_ANNOUNCEMENT_GRID">
                  {filteredNews.length === 0 ? (
                    <div className="EMPTY_DASH"><i className="fas fa-folder-open"></i><p>No announcements in this category.</p></div>
                  ) : (
                    filteredNews.map(news => (
                      <article key={news.id} className="CM_NEWS_ITEM" onClick={() => setSelectedArticle(news)}>
                        <div className="CM_NEWS_PREVIEW_IMG">
                          {news.image_url ? <img src={news.image_url} alt="news" /> : <div className="CM_NEWS_PLACEHOLDER"><i className="fas fa-bullhorn"></i></div>}
                        </div>
                        <div className="CM_NEWS_BODY">
                          <div className="CM_NEWS_META">
                            <span className="CM_NEWS_DATE">{new Date(news.created_at || '').toLocaleDateString()}</span>
                            <span className="CM_NEWS_CAT">{news.category}</span>
                          </div>
                          <h4>{news.title}</h4>
                          <p className="CM_SNIPPET">{news.content.substring(0, 100)}...</p>
                          <button className="CM_NEWS_LINK">VIEW DETAILS</button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              ) : (
                <div className="TRACKING_LIST_WRAP">
                  {currentView === 'Blotter' ? (
                    <Community_Blotter_view data={getFilteredList(blotters)} onSelect={(item) => setSelectedRecord(item)} />
                  ) : (
                    <Community_Document_view data={getFilteredList(documents)} onSelect={(item) => setSelectedRecord(item)} />
                  )}
                  
                  {getFilteredList(currentView === 'Blotter' ? blotters : documents).length === 0 && (
                    <div className="EMPTY_DASH"><i className="fas fa-inbox"></i><p>No {activeTab.toLowerCase()} items found.</p></div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="MOBILE_BOTTOM_NAV MOBILE_ONLY">
        <button 
          id="guide-bulletin-tab-mobile" 
          className={currentView === 'Announcements' && !showProfile ? 'ACTIVE' : ''} 
          onClick={() => { setCurrentView('Announcements'); setShowProfile(false); setSelectedRecord(null); }}
        >
          <i className="fas fa-bullhorn"></i>
          <span>Bulletin</span>
        </button>
        <button 
          id="guide-blotter-tab-mobile" 
          className={currentView === 'Blotter' && !showProfile ? 'ACTIVE' : ''} 
          onClick={() => { setCurrentView('Blotter'); setShowProfile(false); setSelectedRecord(null); }}
        >
          <i className="fas fa-file-signature"></i>
          <span>Blotter</span>
        </button>
        <button 
          id="guide-documents-tab-mobile"
          className={currentView === 'Documents' && !showProfile ? 'ACTIVE' : ''} 
          onClick={() => { setCurrentView('Documents'); setShowProfile(false); setSelectedRecord(null); }}
        >
          <i className="fas fa-folder-open"></i>
          <span>Documents</span>
        </button>
        <button 
          id="guide-profile-btn-mobile"
          className={showProfile ? 'ACTIVE' : ''} 
          onClick={() => setShowProfile(true)}
        >
          <i className="fas fa-user"></i>
          <span>Profile</span>
        </button>
      </nav>

      {/* --- SIDE PANEL (GILID) DETAILS --- */}
      {selectedRecord && (
        <div className="CM_SIDE_PANEL_OVERLAY" onClick={() => setSelectedRecord(null)}>
          <div className="CM_SIDE_PANEL" onClick={e => e.stopPropagation()}>
            <div className="PANEL_HEADER">
              <h3>{selectedRecord.type}</h3>
              <button className="CLOSE_PANEL" onClick={() => setSelectedRecord(null)}>&times;</button>
            </div>
            <div className="PANEL_BODY">
              <div className="INFO_ROW">
                <strong>Reference:</strong> 
                <span>{selectedRecord.id}</span>
              </div>
              <div className="INFO_ROW">
                <strong>Status:</strong> 
                <span className={`STATUS_LABEL ${(selectedRecord.rawStatus || selectedRecord.status).toUpperCase()}`}>
                  {selectedRecord.rawStatus || selectedRecord.status}
                </span>
              </div>
              <div className="INFO_ROW">
                <strong>Date:</strong> 
                <span>{selectedRecord.date}</span>
              </div>
              <div className="INFO_SECTION">
                <strong>Details:</strong>
                <p>{selectedRecord.details}</p>
              </div>
              {selectedRecord.price !== 'Free' && (
                <div className="INFO_ROW">
                  <strong>Total Fees:</strong> 
                  <span>{selectedRecord.price}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {selectedArticle && <Community_Preview article={selectedArticle} onBack={() => setSelectedArticle(null)} />}
      <Community_Blotter_Request isOpen={showBlotterModal} onClose={() => setShowBlotterModal(false)} onSuccess={() => fetchData(resident?.record_id)} />
      <Community_Document_Request isOpen={showDocModal} onClose={() => setShowDocModal(false)} onSuccess={() => fetchData(resident?.record_id)} residentName={resident?.formattedName} residentId={resident?.record_id} />
      <CommunityResetPasswordModal isOpen={showForceReset} resident={resident} onSuccess={() => setShowForceReset(false)} />
    </div>
  );
};

export default Community_Dashboard;