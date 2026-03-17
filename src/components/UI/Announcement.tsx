import { useState, useEffect, useMemo, useCallback } from 'react';
import Announcement_modal from '../buttons/Announcement_modal';
import './styles/Announcement.css';
import { API_BASE_URL } from './api'; // <-- Centralized Import

// EXPORTED to be shared with the Modal to prevent "Two different types" error
export interface IAnnouncement {
  id: string;
  title: string;
  content: string;
  category: string; 
  priority: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Archived';
  created_at: string;
  expires_at: string;
  views: number;
  image_url?: string;
}

// Derive the specific endpoint from the base
const ANNOUNCEMENT_API = `${API_BASE_URL}/announcements`;

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IAnnouncement | null>(null);

  // FETCH ANNOUNCEMENTS
  const fetchAnnouncements = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(ANNOUNCEMENT_API, { signal });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Sync Error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // INITIAL LOAD
  useEffect(() => {
    const controller = new AbortController();
    fetchAnnouncements(controller.signal);
    return () => controller.abort();
  }, [fetchAnnouncements]);

  // DELETE ANNOUNCEMENT
  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this announcement?")) return;
    try {
      const res = await fetch(`${ANNOUNCEMENT_API}/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAnnouncements();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  // MODAL HANDLER
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // FILTER LOGIC
  const filteredList = useMemo(() => {
    return announcements.filter(a => {
      const matchesSearch = (a.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                            (a.content?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'All' || a.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [announcements, searchTerm, priorityFilter]);

  return (
    <div className="ANN_PAGE_WRAP">
      <div className="ANN_MAIN_CONTAINER">
        
        <header className="ANN_HEADER">
          <div className="ANN_TITLE_GROUP">
            <h1 className="ANN_TITLE">Bulletin Board</h1>
            <p className="ANN_SUB">Manage and broadcast community updates.</p>
          </div>
          <button className="BTN_ADD_NEW" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
            <i className="fas fa-plus"></i> New Announcement
          </button>
        </header>

        <div className="ANN_CONTENT_CARD">
          
          <div className="ANN_FILTER_BAR">
            <div className="ANN_SEARCH_BOX">
              <i className="fas fa-search"></i>
              <input 
                placeholder="Search by keyword..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="ANN_FILTER_GROUP">
              <label>Priority:</label>
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="All">All Records</option>
                <option value="High">High Only</option>
                <option value="Medium">Medium Only</option>
                <option value="Low">Low Only</option>
              </select>
            </div>
          </div>

          <div className="ANN_LIST_WRAP">
            {loading ? (
              <div className="ANN_EMPTY_STATE">Loading data...</div>
            ) : filteredList.length === 0 ? (
              <div className="ANN_EMPTY_STATE">No announcements found in the registry.</div>
            ) : (
              filteredList.map(item => (
                <div key={item.id} className="ANN_ITEM_ROW">
                  <div className="ANN_THUMBNAIL_BOX">
                    {item.image_url ? (
                      <img src={item.image_url} alt="post thumbnail" />
                    ) : (
                      <div className="ANN_INITIAL">{(item.title || "?").charAt(0)}</div>
                    )}
                  </div>

                  <div className="ANN_INFO_BOX">
                    <div className="ANN_TOP_LINE">
                      <h4>{item.title}</h4>
                      <span className={`PRIO_BADGE ${item.priority?.toLowerCase() || 'low'}`}>
                        {item.priority}
                      </span>
                    </div>
                    
                    <div className="ANN_CAT_TAG">{item.category}</div>
                    <p className="ANN_SNIPPET">{item.content}</p>
                    
                    <div className="ANN_FOOT_LINE">
                      <span><i className="fas fa-calendar-alt"></i> {new Date(item.created_at).toLocaleDateString()}</span>
                      <span className="ANN_EXPIRY">
                        <i className="fas fa-clock"></i> Expires: {new Date(item.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="ANN_ACTIONS_BOX">
                    <button className="ANN_ICON_BTN" onClick={() => { setEditingItem(item); setIsModalOpen(true); }}>
                      <i className="fas fa-pen"></i>
                    </button>
                    <button className="ANN_ICON_BTN DEL" onClick={() => handleDelete(item.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Announcement_modal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={() => fetchAnnouncements()}
        editingItem={editingItem}
      />
    </div>
  );
}