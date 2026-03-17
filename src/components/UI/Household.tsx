import { useState, useEffect, useCallback, useMemo } from 'react';
import HouseHold_modal from '../buttons/HouseHold_modal'; 
import Household_view from '../forms/Household_view'; 
import './styles/HouseHold.css'; 
// Imported getAuthHeaders directly from api.ts
import { HOUSEHOLDS_API, RESIDENTS_API, getAuthHeaders } from './api'; 

// --- INTERFACES ---
export interface Resident {
  id: string;
  fullName: string;
  is4Ps: boolean;
  monthlyIncome: string;
  purok: string;
}

export interface Household {
  id: string; 
  household_number: string;
  head: string; 
  zone: string; 
  address: string;
  membersCount: number; 
  is4Ps: boolean; 
  isIndigent: boolean; 
}

export default function HouseholdPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false); 
  const [selectedHH, setSelectedHH] = useState<string | null>(null); 
  const [editingHH, setEditingHH] = useState<Household | null>(null); 
  
  const [activeTab, setActiveTab] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [householdList, setHouseholdList] = useState<Household[]>([]);
  const [residentList, setResidentList] = useState<Resident[]>([]);

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // APPLYING THE IMPORTED HANDSHAKE TO HOUSEHOLDS FETCH
      const hhRes = await fetch(HOUSEHOLDS_API, { 
        headers: getAuthHeaders() 
      });
      
      if (!hhRes.ok) throw new Error("Sync Failed");
      
      const hhData = await hhRes.json();
      setHouseholdList(hhData);

      // APPLYING THE IMPORTED HANDSHAKE TO RESIDENTS FETCH
      const resRes = await fetch(RESIDENTS_API, { 
        headers: getAuthHeaders() 
      });

      if (resRes.ok) {
        const rawRes = await resRes.json();
        setResidentList(rawRes.map((r: any) => ({
          id: r.record_id || r.id,
          fullName: `${r.last_name}, ${r.first_name}`,
          is4Ps: r.is_4ps,
          monthlyIncome: r.monthly_income,
          purok: r.purok
        })));
      }
    } catch (error) {
      console.error("Data Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed local dependency since getAuthHeaders is external now

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // FILTERED DATA
  const filteredHouseholds = useMemo(() => {
    return householdList.filter(h => {
      const matchesSearch = h.head.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            h.household_number?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === '4Ps') return h.is4Ps;
      if (activeTab === 'Indigent') return h.isIndigent;
      return true;
    });
  }, [householdList, activeTab, searchTerm]);

  // PAGINATION LOGIC
  const totalPages = Math.ceil(filteredHouseholds.length / itemsPerPage);
  const paginatedHouseholds = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHouseholds.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHouseholds, currentPage]);

  return (
    <div className="HP_PAGE_WRAPPER">
      <div className="HP_MAIN_CONTAINER">
        <header className="HP_PAGE_HEADER">
          <div className="HP_HEADER_TEXT_BLOCK">
            <h1 className="HP_PAGE_TITLE">Household Profiling</h1>
            <p className="HP_PAGE_SUBTITLE">RBIM-Compliant Family Records System.</p>
          </div>
          <button className="HP_ADD_NEW_BTN" onClick={() => { setEditingHH(null); setIsModalOpen(true); }}>
            <i className="fas fa-plus"></i> New Household
          </button>
        </header>

        <div className="HP_TABLE_CARD_CONTAINER">
          <div className="HP_TABS_LIST">
            {['All', '4Ps', 'Indigent'].map(tab => (
              <button 
                key={tab}
                className={`HP_TAB_TRIGGER ${activeTab === tab ? 'HP_TAB_ACTIVE' : ''}`} 
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              >
                {tab} {tab === 'All' && <span className="HP_COUNT_BADGE">{householdList.length}</span>}
              </button>
            ))}
          </div>

          <div className="HP_SEARCH_SECTION">
            <div className="HP_SEARCH_INPUT_WRAPPER">
              <i className="fas fa-search HP_SEARCH_ICON"></i>
              <input 
                className="HP_SEARCH_FIELD" 
                type="text" 
                placeholder="Search Head or HH Number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="HP_DATA_TABLE_WRAPPER">
            <table className="HP_HOUSE_TABLE">
              <thead className="HP_TABLE_HEAD">
                <tr>
                  <th className="HP_TH_LEFT">HH Number</th>
                  <th className="HP_TH_LEFT">Family Head</th>
                  <th className="HP_TH_LEFT">Zone</th>
                  <th className="HP_TH_LEFT">Members</th>
                  <th className="HP_TH_LEFT">Status</th>
                  <th className="HP_TH_RIGHT" style={{textAlign: 'right'}}>Action</th>
                </tr>
              </thead>
              <tbody className="HP_TABLE_BODY">
                {isLoading ? (
                   <tr><td colSpan={6} className="HP_EMPTY_CELL">Syncing with system...</td></tr>
                ) : paginatedHouseholds.length === 0 ? (
                  <tr><td colSpan={6} className="HP_EMPTY_CELL">No household records found.</td></tr>
                ) : (
                  paginatedHouseholds.map((house) => (
                    <tr key={house.id} className="HP_TB_ROW">
                      <td style={{padding: '1rem'}}><span className="HP_HH_NUM">{house.household_number}</span></td>
                      <td style={{padding: '1rem'}}>
                        <div className="HP_PRIMARY_NAME" onClick={() => { setSelectedHH(house.id); setIsViewOpen(true); }}>
                          {house.head}
                        </div>
                      </td>
                      <td className="HP_ZONE_TEXT" style={{padding: '1rem'}}>{house.zone}</td>
                      <td style={{padding: '1rem'}}>
                        <span className="HP_MEMBER_PILL">{house.membersCount} Members</span>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <div className="HP_BADGE_CONTAINER">
                          {house.is4Ps && <span className="HP_BADGE HP_BADGE_4PS">4Ps</span>}
                          {house.isIndigent && <span className="HP_BADGE HP_BADGE_INDIGENT">Indigent</span>}
                        </div>
                      </td>
                      <td style={{padding: '1rem', textAlign: 'right'}}>
                        <button className="HP_ACTION_ICON_BTN" onClick={() => { setEditingHH(house); setIsModalOpen(true); }}>
                          <i className="fas fa-edit"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="HP_PAGINATION_BAR">
            <div className="HP_PAGINATION_INFO">
              Showing {filteredHouseholds.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredHouseholds.length)} of {filteredHouseholds.length}
            </div>
            <div className="HP_NAV_GROUP">
              <button 
                className="HP_NAV_BTN" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <button 
                className="HP_NAV_BTN" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0 || isLoading}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        {isModalOpen && (
          <HouseHold_modal 
            onClose={() => setIsModalOpen(false)} 
            residentList={residentList as any} 
            onSaveSuccess={refreshData as any}
            {...({ initialData: editingHH } as any)} 
          />
        )}

        {isViewOpen && selectedHH && (
          <Household_view householdId={selectedHH} onClose={() => { setIsViewOpen(false); setSelectedHH(null); }} />
        )}
      </div>
    </div>
  );
}