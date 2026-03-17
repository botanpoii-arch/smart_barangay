import { useState, useEffect } from 'react';
import './styles/Household_view.css';
// 1. IMPORT THE CENTRALIZED API AND HANDSHAKE
import { HOUSEHOLDS_API, RESIDENTS_API, getAuthHeaders } from '../UI/api';

// --- INTERFACES ---
export interface HouseholdViewProps {
  householdId: string;
  onClose: () => void;
}

interface IMemberDetails {
  record_id: string;
  first_name: string;
  last_name: string;
  sex: string;
  dob: string;
  occupation: string;
  is_4ps: boolean;
  monthly_income: string;
}

interface IHouseholdDetails {
  household_number: string;
  head_name: string;
  zone: string;
  address_raw: string; 
}

export default function Household_view({ householdId, onClose }: HouseholdViewProps) {
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<IHouseholdDetails | null>(null);
  const [members, setMembers] = useState<IMemberDetails[]>([]);

  useEffect(() => {
    const fetchHouseholdData = async () => {
      setLoading(true);
      try {
        // 2. APPLY THE HANDSHAKE TO THE FETCH
        const hhRes = await fetch(HOUSEHOLDS_API, {
          headers: getAuthHeaders()
        });
        
        if (!hhRes.ok) throw new Error("Failed to fetch household details");
        const hhData = await hhRes.json();
        const targetHousehold = hhData.find((h: any) => h.id === householdId);

        if (targetHousehold) {
          setHousehold({
            household_number: targetHousehold.household_number,
            head_name: targetHousehold.head,
            zone: targetHousehold.zone,
            address_raw: targetHousehold.address || "Tenure: N/A | Water: N/A | Toilet: N/A",
          });
        }

        // 3. APPLY THE HANDSHAKE TO THE RESIDENTS FETCH
        const resRes = await fetch(RESIDENTS_API, {
          headers: getAuthHeaders()
        });
        
        if (!resRes.ok) throw new Error("Failed to fetch members");
        const resData = await resRes.json();
        
        const familyMembers = resData.filter((r: any) => r.household_id === householdId);
        setMembers(familyMembers);

      } catch (error) {
        console.error("Error loading household view:", error);
      } finally {
        setLoading(false);
      }
    };

    if (householdId) {
      fetchHouseholdData();
    }
  }, [householdId]);

  const parseAddressData = (rawString: string) => {
    if (!rawString) return { tenure: 'N/A', water: 'N/A', toilet: 'N/A' };
    const parts = rawString.split('|').map(s => s.trim());
    const getData = (key: string) => {
      const found = parts.find(p => p.startsWith(key));
      return found ? found.split(':')[1]?.trim() || 'N/A' : 'N/A';
    };
    return {
      tenure: getData('Tenure'),
      water: getData('Water'),
      toilet: getData('Toilet')
    };
  };

  const socioData = household ? parseAddressData(household.address_raw) : { tenure: '', water: '', toilet: '' };
  const is4Ps = members.some(m => m.is_4ps);
  const isIndigent = members.some(m => {
      const incomeStr = String(m.monthly_income || '0').replace(/\D/g, '');
      return parseInt(incomeStr) < 5000;
  });

  return (
    <div className="HP_MODAL_OVERLAY">
      <div className="HP_MODAL_CARD HP_VIEW_CARD">
        
        <div className="HP_MODAL_HEADER">
          <div className="HP_HEADER_META">
            <h2 className="HP_MODAL_TITLE">Household Profile</h2>
            {household && (
              <span className="HP_HH_ID_BADGE">
                {household.household_number}
              </span>
            )}
          </div>
          <button className="HP_MODAL_CLOSE_X" onClick={onClose}>&times;</button>
        </div>

        <div className="HP_MODAL_SCROLL_BODY">
          {loading ? (
            <div className="HP_LOADING_STATE">
              <i className="fas fa-circle-notch fa-spin"></i>
              <p style={{marginLeft: '10px', display: 'inline-block'}}>Loading household records...</p>
            </div>
          ) : household ? (
            <>
              <div className="HP_VIEW_STATS_GRID">
                
                <div className="HP_VIEW_INFO_BLOCK">
                  <div className="HP_FIELD_LABEL">Family Head</div>
                  <div className="HP_FIELD_VALUE_BOLD">
                    {household.head_name}
                  </div>
                  <div className="HP_BADGE_ROW">
                    <span className="HP_SUB_INFO">
                        <i className="fas fa-map-marker-alt"></i> {household.zone}
                    </span>
                    {is4Ps && <span className="HP_STATUS_BADGE HP_STATUS_4PS">4Ps</span>}
                    {isIndigent && <span className="HP_STATUS_BADGE HP_STATUS_INDIGENT">Indigent</span>}
                  </div>
                </div>

                <div className="HP_VIEW_INFO_BLOCK HP_SOCIO_DETAILS">
                  <div className="HP_SOCIO_ITEM">
                    <span className="HP_FIELD_LABEL">Tenure:</span>
                    <span className="HP_FIELD_VALUE">{socioData.tenure}</span>
                  </div>
                  <div className="HP_SOCIO_ITEM">
                    <span className="HP_FIELD_LABEL">Water:</span>
                    <span className="HP_FIELD_VALUE">{socioData.water}</span>
                  </div>
                  <div className="HP_SOCIO_ITEM">
                    <span className="HP_FIELD_LABEL">Toilet:</span>
                    <span className="HP_FIELD_VALUE">{socioData.toilet}</span>
                  </div>
                </div>

              </div>

              <div className="HP_MEMBERS_SECTION">
                <div className="HP_SECTION_INDICATOR">
                    Registered Family Members ({members.length})
                </div>
                <div className="HP_TABLE_WRAP">
                  <table className="HP_VIEW_TABLE">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Sex</th>
                        <th className="HP_TEXT_CENTER">Age</th>
                        <th>Occupation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr><td colSpan={4} className="HP_TABLE_EMPTY">No members found.</td></tr>
                      ) : (
                        members.map((m) => {
                          const age = m.dob ? new Date().getFullYear() - new Date(m.dob).getFullYear() : '-';
                          return (
                            <tr key={m.record_id}>
                              <td className="HP_MEMBER_NAME">
                                {m.last_name}, {m.first_name}
                              </td>
                              <td>{m.sex || 'N/A'}</td>
                              <td className="HP_TEXT_CENTER">{age}</td>
                              <td>{m.occupation || 'N/A'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="HP_ERROR_STATE" style={{textAlign: 'center', padding: '2rem', color: '#ef4444'}}>
              Household not found or has been archived.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}