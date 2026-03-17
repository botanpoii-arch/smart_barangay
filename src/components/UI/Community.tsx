import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Community_Preview, { type NewsItem } from '../forms/Community_preview';
import CommunityLoginModal from '../buttons/Community_login_modal';
import './styles/Community.css';
import { API_BASE_URL } from './api'; // Centralized Import

interface CommunityProps {
  onExit?: () => void;
  onLoginSuccess?: (user: any) => void;
}

const Community: React.FC<CommunityProps> = ({ onExit, onLoginSuccess }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Derive the announcements endpoint from the base
  const ANNOUNCEMENTS_URL = `${API_BASE_URL}/announcements`;

  // --- 1. NAME FORMATTER: Standardizes to "Ranni L. Carian" ---
  const formatResidentSession = (user: any) => {
    if (!user.profile) return user;

    const capitalize = (str: string) => 
      str.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const fName = capitalize(user.profile.first_name || '');
    const lName = capitalize(user.profile.last_name || '');
    const mInit = user.profile.middle_name?.trim() 
      ? `${user.profile.middle_name.trim().charAt(0).toUpperCase()}. ` 
      : '';

    return {
      ...user,
      formattedName: `${fName} ${mInit}${lName}`.trim()
    };
  };

  // --- 2. API SYNC: Connects to actual Announcements DB (Uses ANNOUNCEMENTS_URL) ---
  const fetchNews = useCallback(async (controller?: AbortController) => {
    try {
      const res = await fetch(ANNOUNCEMENTS_URL, { 
        signal: controller?.signal 
      });
      if (res.ok) {
        const data = await res.json();
        setNewsList(data);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error("Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, [ANNOUNCEMENTS_URL]);

  useEffect(() => {
    const controller = new AbortController();
    fetchNews(controller);
    
    // Auto-refresh board every 5 minutes
    const interval = setInterval(() => fetchNews(), 300000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchNews]);

  // --- 3. FILTERING LOGIC ---
  const filters = ['All', 'Public Advisory', 'Senior Citizen', 'Health & Safety', 'Youth & Sports', 'Community Project'];

  const filteredNews = useMemo(() => {
    return newsList.filter(n => activeFilter === 'All' || n.category === activeFilter);
  }, [newsList, activeFilter]);

  const handleLoginSuccess = (user: any) => {
    const sessionUser = formatResidentSession(user);
    if (onLoginSuccess) onLoginSuccess(sessionUser);
    setShowLogin(false);
  };

  return (
    <div className="CM_PAGE_WRAPPER">
      <div className="CM_PAGE_STAGE">
        
        {/* NAVBAR */}
        <nav className="CM_NAV_MAIN">
          <div className="CM_NAV_LEFT">
            <div className="CM_LOGO_SHIELD"><i className="fas fa-shield-alt"></i></div>
            <div className="CM_BRAND_INFO">
              <strong>Barangay Portal</strong>
              <span>Citizen Services</span>
            </div>
          </div>
          <div className="CM_NAV_RIGHT">
            <button className="CM_EXIT_LINK" onClick={onExit}>
              <i className="fas fa-sign-out-alt"></i> EXIT
            </button>
          </div>
        </nav>

        {/* HERO */}
        <header className="CM_HERO_HERO">
          <h1>Welcome to Barangay Engineer's Hill</h1>
          <p>Stay informed with official community updates and resident services.</p>
        </header>

        {/* SIGN IN CTA */}
        <section className="CM_SIGNIN_SECTION">
          <div className="CM_SIGNIN_CONTENT">
            <h2>Sign up for more barangay services</h2>
            <p>
              Log in to your secure resident account to apply for official clearances, 
              view localized records, and access community alerts.
            </p>
            <button className="CM_LOGIN_TRIGGER_BTN" onClick={() => setShowLogin(true)}>
              SIGN IN TO PORTAL
            </button>
          </div>
        </section>

        {/* COMMUNITY BULLETIN */}
        <main className="CM_ANNOUNCEMENT_SECTION">
          <div className="CM_ANNOUNCEMENT_HEADER">
            <h2>Latest Announcements</h2>
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
          </div>

          <div className="CM_ANNOUNCEMENT_GRID">
            {loading ? (
              <div className="CM_LOADING_STATE">Syncing Bulletin Board...</div>
            ) : filteredNews.length === 0 ? (
              <div className="CM_EMPTY_STATE">No announcements available in this category.</div>
            ) : (
              filteredNews.map(news => (
                <article key={news.id} className="CM_NEWS_ITEM" onClick={() => setSelectedArticle(news)}>
                  <div className="CM_NEWS_PREVIEW_IMG">
                    {news.image_url ? (
                      <img src={news.image_url} alt="announcement" />
                    ) : (
                      <div className="CM_NEWS_PLACEHOLDER"><i className="fas fa-bullhorn"></i></div>
                    )}
                  </div>
                  <div className="CM_NEWS_BODY">
                    <div className="CM_NEWS_META">
                      <span className="CM_NEWS_DATE">{new Date(news.created_at || '').toLocaleDateString()}</span>
                      <span className="CM_NEWS_CAT">{news.category}</span>
                    </div>
                    <h4>{news.title}</h4>
                    <p className="CM_SNIPPET">{news.content.substring(0, 120)}...</p>
                    <button className="CM_NEWS_LINK">READ MORE <i className="fas fa-arrow-right"></i></button>
                  </div>
                </article>
              ))
            )}
          </div>
        </main>

        {/* MODALS */}
        {selectedArticle && (
          <Community_Preview article={selectedArticle} onBack={() => setSelectedArticle(null)} />
        )}

        <CommunityLoginModal 
          isOpen={showLogin} 
          onClose={() => setShowLogin(false)} 
          onLoginSuccess={handleLoginSuccess} 
        />

      </div>
    </div>
  );
};

export default Community;