import React, { useEffect } from 'react';
import './styles/Community_preview.css';

// ALIGNED: Matches the modular IAnnouncement / NewsItem interface
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority?: string;
  image_url?: string;
  created_at: string;
  expires_at?: string;
}

interface CommunityPreviewProps {
  article: NewsItem;
  onBack: () => void;
}

const Community_Preview: React.FC<CommunityPreviewProps> = ({ article, onBack }) => {
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="CM_OVERLAY_BACKDROP" onClick={onBack}>
      
      <div className="CM_PREVIEW_CARD" onClick={(e) => e.stopPropagation()}>
        
        {/* --- TOP HEADER NAVIGATION --- */}
        <div className="CM_PREVIEW_NAV">
           <button className="CM_PREVIEW_BACK_BTN" onClick={onBack}>
             <i className="fas fa-arrow-left"></i> BACK TO BULLETIN
           </button>
           <button className="CM_CLOSE_ICON_BTN" onClick={onBack}>
             <i className="fas fa-times"></i>
           </button>
        </div>

        <div className="CM_PREVIEW_SCROLL_AREA">
          {/* --- HERO BANNER --- */}
          <div className="CM_PREVIEW_HERO">
            {article.image_url ? (
               <img src={article.image_url} alt="announcement hero" className="CM_HERO_IMG" />
            ) : (
               <div className="CM_HERO_PLACEHOLDER">
                 <i className="fas fa-bullhorn"></i>
               </div>
            )}
          </div>

          {/* --- CONTENT BODY --- */}
          <div className="CM_PREVIEW_BODY">
            <div className="CM_BADGE_ROW">
              <span className="CM_CAT_TAG">{article.category}</span>
              {article.priority === 'High' && <span className="CM_PRIO_TAG URGENT">URGENT</span>}
              <span className="CM_DATE_TEXT">
                Posted on {new Date(article.created_at).toLocaleDateString(undefined, { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>

            <h1 className="CM_PREVIEW_TITLE">{article.title}</h1>

            <div className="CM_PREVIEW_DIVIDER"></div>

            <div className="CM_PREVIEW_TEXT">
              {/* Supports multi-line content from the admin textarea */}
              {article.content.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {article.expires_at && (
              <div className="CM_EXPIRY_NOTICE">
                <i className="fas fa-info-circle"></i>
                <span>This advisory is valid until {new Date(article.expires_at).toLocaleDateString()}.</span>
              </div>
            )}
          </div>
        </div>

        {/* --- FOOTER BRanding --- */}
        <div className="CM_PREVIEW_FOOTER">
          <small>Official Announcement • Barangay Engineer's Hill Portal</small>
        </div>

      </div>
    </div>
  );
};

export default Community_Preview;