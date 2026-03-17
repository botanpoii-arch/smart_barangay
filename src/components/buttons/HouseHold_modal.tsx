import { useState, useRef, useEffect, } from 'react';
import './styles/Household_modal.css'; 
import { HOUSEHOLDS_API, RESIDENTS_API, getAuthHeaders } from '../UI/api';

export interface HouseholdModalProps {
  onClose: () => void;
  onSaveSuccess?: () => void;
  initialData?: any; // Crucial for Edit Mode
}

export interface IMemberForm {
  id: number; 
  member_id: string; 
  name: string;
  relation: string;
  age: string;
}

export interface IHouseholdForm {
  head_id: string; 
  headName: string;
  headAge: string;
  addressZone: string;
  ownership: string;
  waterSource: string;
  toilet: string;
  members: IMemberForm[];
}

const initialHouseholdState: IHouseholdForm = {
  head_id: '',
  headName: '',
  headAge: '',
  addressZone: '',
  ownership: 'Owned',
  waterSource: 'Deep Well',
  toilet: 'Water Sealed',
  members: []
};

interface ISearchableResident {
  id: string; 
  name: string;
  age: number;
  zone: string;
}

const MemberRow = ({ member, onUpdate, onRemove, residents }: { 
  member: IMemberForm; 
  onUpdate: (id: number, field: keyof IMemberForm, value: any) => void;
  onRemove: (id: number) => void;
  residents: ISearchableResident[];
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLTableRowElement>(null);

  const safeName = member.name || "";
  const filtered = residents.filter(r => (r.name || "").toLowerCase().includes(safeName.toLowerCase()));

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <tr ref={wrapperRef} className="HP_TABLE_ROW">
      <td className="HP_RELATIVE_CELL">
        <div className="HP_COMBOBOX_WRAP">
          <input 
            className="HP_MEMBER_FIELD" 
            placeholder="Search Resident..." 
            value={safeName} 
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => { 
              onUpdate(member.id, 'name', e.target.value); 
              onUpdate(member.id, 'member_id', ''); 
              setIsDropdownOpen(true); 
            }} 
          />
          {isDropdownOpen && safeName && (
            <div className="HP_DROP_RESULTS">
              {filtered.slice(0, 5).map(res => (
                <div key={res.id} className="HP_DROP_ITEM" onClick={() => { 
                  onUpdate(member.id, 'member_id', res.id); 
                  onUpdate(member.id, 'name', res.name); 
                  onUpdate(member.id, 'age', res.age.toString()); 
                  setIsDropdownOpen(false); 
                }}>
                  <span className="HP_DROP_NAME">{res.name}</span>
                  <span className="HP_DROP_SUB">{res.age}yo</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td>
        <select className="HP_MEMBER_FIELD" value={member.relation || ""} onChange={(e) => onUpdate(member.id, 'relation', e.target.value)}>
          <option value="">Relation...</option>
          <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Other</option>
        </select>
      </td>
      <td className="HP_AGE_DISPLAY_CELL">{member.age ? `${member.age} yo` : '-'}</td>
      <td className="HP_CENTERED_ACTION_CELL">
        <button className="HP_REMOVE_ROW_BTN" onClick={() => onRemove(member.id)}><i className="fas fa-times"></i></button>
      </td>
    </tr>
  );
};

export default function HouseHold_modal({ onClose, onSaveSuccess, initialData }: HouseholdModalProps) {
  const headDropdownRef = useRef<HTMLDivElement>(null);
  const [isHeadDropdownOpen, setIsHeadDropdownOpen] = useState(false);
  const [formData, setFormData] = useState<IHouseholdForm>(initialHouseholdState);
  const [isLoading, setIsLoading] = useState(false);
  const [residentList, setResidentList] = useState<ISearchableResident[]>([]);

  // 1. FETCH ALL RESIDENTS (For Dropdowns)
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const response = await fetch(RESIDENTS_API, { headers: getAuthHeaders() });
        if (!response.ok) return;
        const data = await response.json();
        const formatted: ISearchableResident[] = data.map((r: any) => ({
          id: r.record_id || r.id, 
          name: `${r.last_name}, ${r.first_name}`,
          age: r.dob ? new Date().getFullYear() - new Date(r.dob).getFullYear() : 0,
          zone: r.purok || ""
        }));
        setResidentList(formatted);
      } catch (err) { console.error("Error fetching residents:", err); }
    };
    fetchResidents();
  }, []);

  // 2. LOAD EXISTING HOUSEHOLD DATA (If Editing)
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!initialData) return; // Skip if creating new
      
      setIsLoading(true);
      try {
        const res = await fetch(`${HOUSEHOLDS_API}/${initialData.id}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to load household details.");
        const data = await res.json();

        // Extract socio-economic data
        const parts = (data.address || "").split('|').map((s: string) => s.split(':')[1]?.trim() || '');

        setFormData({
          head_id: data.head_id,
          headName: initialData.head,
          headAge: '', 
          addressZone: data.zone,
          ownership: parts[0] || 'Owned',
          waterSource: parts[1] || 'Deep Well',
          toilet: parts[2] || 'Water Sealed',
          // Map backend members to UI rows
          members: (data.members || []).map((m: any, index: number) => ({
            id: Date.now() + index, // Unique row ID
            member_id: m.record_id,
            name: `${m.last_name}, ${m.first_name}`,
            relation: 'Other', 
            age: m.dob ? (new Date().getFullYear() - new Date(m.dob).getFullYear()).toString() : ''
          }))
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingData();
  }, [initialData]);

  const safeHeadName = formData.headName || "";
  const filteredHead = residentList.filter(r => (r.name || "").toLowerCase().includes(safeHeadName.toLowerCase()));

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (headDropdownRef.current && !headDropdownRef.current.contains(e.target as Node)) setIsHeadDropdownOpen(false);
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  const updateForm = (field: keyof IHouseholdForm, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const updateMember = (id: number, field: keyof IMemberForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };
  const removeMember = (id: number) => setFormData(prev => ({ ...prev, members: prev.members.filter(m => m.id !== id) }));

  // 3. SAVE HANDLER (Handles both Create & Update)
  const handleSave = async () => {
    if (!formData.head_id) return alert("Please select a Family Head from the list.");
    setIsLoading(true);

    const isEdit = !!initialData;
    const url = isEdit ? `${HOUSEHOLDS_API}/${initialData.id}` : HOUSEHOLDS_API;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const payload = {
        head_id: formData.head_id,
        zone: formData.addressZone || 'Unassigned',
        address: `Tenure: ${formData.ownership} | Water: ${formData.waterSource} | Toilet: ${formData.toilet}`,
        // Send the correct key based on the router
        [isEdit ? 'current_members' : 'initial_members']: formData.members.map(m => m.member_id).filter(id => id !== '')
      };

      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save household.");
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="HP_MODAL_OVERLAY">
      <div className="HP_MODAL_CARD">
        <div className="HP_MODAL_HEADER">
          <h2 className="HP_MODAL_TITLE">{initialData ? 'Edit Household Profile' : 'New Household Profile'}</h2>
          <button className="HP_MODAL_CLOSE_X" onClick={onClose}>&times;</button>
        </div>
        
        {isLoading && initialData && formData.head_id === '' ? (
            <div style={{padding: '3rem', textAlign: 'center', color: '#64748b'}}>Loading household data...</div>
        ) : (
        <div className="HP_MODAL_SCROLL_BODY">
          <div className="HP_FORM_SECTION">
            <div className="HP_SECTION_INDICATOR">1. Family Head</div>
            <div className="HP_FORM_GRID">
              <div className="HP_FORM_GROUP HP_GRID_FULL" ref={headDropdownRef}>
                <label className="HP_FORM_LABEL">Full Name</label>
                <div className="HP_COMBOBOX_WRAP">
                  <input className="HP_FORM_INPUT" placeholder="Search..." value={safeHeadName} onFocus={() => setIsHeadDropdownOpen(true)}
                    onChange={(e) => { 
                      updateForm('headName', e.target.value); 
                      updateForm('head_id', ''); 
                    }} 
                  />
                  {formData.headAge && <span className="HP_INPUT_AGE_BADGE">{formData.headAge} yrs old</span>}
                  {isHeadDropdownOpen && safeHeadName && (
                    <div className="HP_DROP_RESULTS">
                      {filteredHead.slice(0, 5).map(res => (
                        <div key={res.id} className="HP_DROP_ITEM" onClick={() => { 
                          updateForm('head_id', res.id); 
                          updateForm('headName', res.name);
                          updateForm('headAge', res.age.toString());
                          updateForm('addressZone', res.zone); 
                          setIsHeadDropdownOpen(false); 
                        }}>
                          <span className="HP_DROP_NAME">{res.name}</span>
                          <span className="HP_DROP_SUB">{res.zone || "No Zone"} • {res.age}yo</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="HP_FORM_GROUP">
                <label className="HP_FORM_LABEL">Address Zone</label>
                <div className="HP_STATIC_FIELD">{formData.addressZone || "Auto-detected"}</div>
              </div>
              <div className="HP_FORM_GROUP">
                <label className="HP_FORM_LABEL">Tenurial Status</label>
                <select className="HP_FORM_SELECT" value={formData.ownership} onChange={(e) => updateForm('ownership', e.target.value)}>
                  <option>Owned</option><option>Rented</option><option>Relatives</option>
                </select>
              </div>
            </div>
          </div>
          <div className="HP_FORM_SECTION">
            <div className="HP_SECTION_INDICATOR">2. Family Members</div>
            <table className="HP_MEMBERS_TABLE">
              <tbody className="HP_MEMBERS_BODY">
                {formData.members.map(m => (
                  <MemberRow key={m.id} member={m} residents={residentList} onUpdate={updateMember} onRemove={removeMember} />
                ))}
              </tbody>
            </table>
            <button className="HP_ADD_ROW_TRIGGER" onClick={() => setFormData(prev => ({
              ...prev, members: [...prev.members, { id: Date.now(), member_id: '', name: '', relation: '', age: '' }]
            }))}>+ Add Member Row</button>
          </div>
        </div>
        )}

        <div className="HP_MODAL_FOOTER">
          <button className="HP_CANCEL_BTN" onClick={onClose}>Cancel</button>
          <button className="HP_SAVE_BTN" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}