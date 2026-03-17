import React, { useState, useEffect } from 'react';
import './styles/Resident_modal.css';

export interface IResident {
  id?: string;
  lastName: string;
  firstName: string;
  middleName: string;
  sex: 'Male' | 'Female';
  genderIdentity: 'Men' | 'Women' | 'LGBTQ+';
  dob: string; 
  birthPlace: string;
  nationality: string;
  contact_number: string; 
  email: string;
  currentAddress: string;
  purok: string;
  civilStatus: string;
  religion: string;
  education: string;
  employment: string;
  occupation: string;
  monthlyIncome: string;
  housingType: string;
  activityStatus: 'Active' | 'Inactive' | 'Leave';
  isVoter: boolean;
  isPWD: boolean;
  is4Ps: boolean;
  isSoloParent: boolean;
  isSeniorCitizen: boolean;
  isIP: boolean;
  pwdIdNumber?: string;
  soloParentIdNumber?: string;
  seniorIdNumber?: string;
  fourPsIdNumber?: string;
}

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  residentData: IResident | null;
}

const initialState: IResident = {
  lastName: '', firstName: '', middleName: '',
  sex: 'Male', genderIdentity: 'Men', dob: '', birthPlace: '', nationality: 'Filipino',
  contact_number: '09', email: '', currentAddress: '', purok: '',
  civilStatus: 'Single', religion: '',
  education: 'None', employment: 'Unemployed', occupation: '', monthlyIncome: 'Below ₱5,000',
  housingType: 'Owned House', activityStatus: 'Active',
  isVoter: false, isPWD: false, is4Ps: false, isSoloParent: false, isSeniorCitizen: false, isIP: false,
  pwdIdNumber: '', soloParentIdNumber: '', seniorIdNumber: '', fourPsIdNumber: ''
};

export const ResidentModal: React.FC<ResidentModalProps> = ({ 
  isOpen, onClose, onSuccess, residentData 
}) => {
  const [formData, setFormData] = useState<IResident>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = 'http://localhost:8000/api/residents';

  // --- HANDSHAKE HELPER ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role') || 'guest';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-role': role
    };
  };

  useEffect(() => {
    if (isOpen) {
      if (residentData) {
        const formattedDob = residentData.dob ? new Date(residentData.dob).toISOString().split('T')[0] : '';
        setFormData({ ...residentData, dob: formattedDob });
      } else {
        setFormData(initialState);
      }
    }
  }, [isOpen, residentData]);

  const handleChange = (field: keyof IResident, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['lastName', 'firstName', 'dob', 'currentAddress', 'purok'];
    if (required.some(key => !formData[key as keyof IResident])) return alert("Please fill in required fields.");
    
    setIsLoading(true);
    try {
      // ==========================================
      // STRICT DATABASE MAPPING (ALIGNED WITH SQL)
      // ==========================================
      const dbPayload: Record<string, any> = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName,
        sex: formData.sex,
        gender_identity: formData.genderIdentity,
        dob: formData.dob,
        birth_place: formData.birthPlace,      // Mapped to snake_case birth_place
        nationality: formData.nationality,
        religion: formData.religion,
        contact_number: formData.contact_number, 
        email: formData.email,
        current_address: formData.currentAddress,
        purok: formData.purok,
        civilStatus: formData.civilStatus,    // Quoted Case-Sensitive column in SQL
        education: formData.education,
        employment: formData.employment,      // Custom column required in SQL
        occupation: formData.occupation,
        monthly_income: formData.monthlyIncome,
        housing_type: formData.housingType,
        activity_status: formData.activityStatus,
        is_voter: formData.isVoter,
        is_pwd: formData.isPWD,
        is_4ps: formData.is4Ps,
        is_solo_parent: formData.isSoloParent,
        is_senior_citizen: formData.isSeniorCitizen,
        is_ip: formData.isIP,
        pwd_id_number: formData.pwdIdNumber,
        solo_parent_id_number: formData.soloParentIdNumber,
        senior_id_number: formData.seniorIdNumber,
        four_ps_id_number: formData.fourPsIdNumber
      };

      // Cleaning undefined to prevent Postgres errors
      Object.keys(dbPayload).forEach(key => {
        if (dbPayload[key] === undefined) delete dbPayload[key];
      });

      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `${API_URL}/${formData.id}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(dbPayload) 
      });
      
      const result = await res.json();
      
      if (res.status === 403) return alert("Access Denied: Insufficient permissions.");
      if (res.status === 401) return alert("Session expired. Please log in again.");
      if (res.status === 409) return alert(`Conflict: ${result.error}`);
      if (!res.ok) throw new Error(result.error || 'Server Error');

      if (method === 'POST' && result.account) {
        const cleanFName = formData.firstName.toLowerCase().replace(/\s/g, '');
        const generatedPassword = `${cleanFName}123456`;
        
        // NEW DOMAIN FORMAT APPLIED: residents.eng-hill.brg.ph
        const displayUsername = result.account.username.split('@')[0] + '@residents.eng-hill.brg.ph';

        alert(`
          Resident Registered Successfully!
          
          SYSTEM AUTO-GENERATED ACCOUNT:
          -----------------------------------
          Username: ${displayUsername}
          Password: ${generatedPassword} 
          -----------------------------------
          Please provide these credentials to the resident.
        `);
      } else {
        alert(formData.id ? 'Profile updated successfully.' : 'Resident registered successfully.');
      }

      onSuccess(); 
      onClose();
    } catch (err: any) { 
      alert(`Error: ${err.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="RMS_OVERLAY" onClick={onClose}>
      <div className="RMS_CARD" onClick={e => e.stopPropagation()}>
        <div className="RMS_HEADER">
          <h2>{residentData ? 'Update Resident Profile' : 'Resident Registration'}</h2>
          <button className="RMS_CLOSE_X" onClick={onClose}>&times;</button>
        </div>

        <form className="RMS_FORM" onSubmit={handleSubmit}>
          <div className="RMS_BODY">
            
            {/* SECTION 1: PERSONAL IDENTITY */}
            <div className="RMS_SECTION">
              <div className="RMS_SEC_TITLE">Personal Identity</div>
              <div className="RMS_GRID">
                <div className="RMS_GROUP"><label className="RMS_LABEL">Last Name *</label>
                  <input className="RMS_INPUT" value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} required />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">First Name *</label>
                  <input className="RMS_INPUT" value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} required />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Middle Name</label>
                  <input className="RMS_INPUT" value={formData.middleName} onChange={e => handleChange('middleName', e.target.value)} />
                </div>
                
                <div className="RMS_GROUP"><label className="RMS_LABEL">Sex at Birth *</label>
                  <select className="RMS_INPUT" value={formData.sex} onChange={e => handleChange('sex', e.target.value)}>
                    <option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Gender Identity *</label>
                  <select className="RMS_INPUT" value={formData.genderIdentity} onChange={e => handleChange('genderIdentity', e.target.value)}>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="LGBTQ+">LGBTQ+</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Date of Birth *</label>
                  <input type="date" className="RMS_INPUT" value={formData.dob} onChange={e => handleChange('dob', e.target.value)} required />
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Place of Birth</label>
                  <input className="RMS_INPUT" value={formData.birthPlace} onChange={e => handleChange('birthPlace', e.target.value)} placeholder="City/Province" />
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Civil Status</label>
                  <select className="RMS_INPUT" value={formData.civilStatus} onChange={e => handleChange('civilStatus', e.target.value)}>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Religion</label>
                  <input className="RMS_INPUT" value={formData.religion} onChange={e => handleChange('religion', e.target.value)} />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Nationality</label>
                  <input className="RMS_INPUT" value={formData.nationality} onChange={e => handleChange('nationality', e.target.value)} />
                </div>
              </div>
            </div>

            {/* SECTION 2: SOCIO-ECONOMIC PROFILE */}
            <div className="RMS_SECTION">
              <div className="RMS_SEC_TITLE">Socio-Economic Profile</div>
              <div className="RMS_GRID">
                <div className="RMS_GROUP"><label className="RMS_LABEL">Highest Education</label>
                  <select className="RMS_INPUT" value={formData.education} onChange={e => handleChange('education', e.target.value)}>
                    <option value="None">None</option>
                    <option value="Elementary">Elementary</option>
                    <option value="High School">High School</option>
                    <option value="Vocational">Vocational</option>
                    <option value="College">College</option>
                    <option value="Post-Graduate">Post-Graduate</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Employment Status</label>
                  <select className="RMS_INPUT" value={formData.employment} onChange={e => handleChange('employment', e.target.value)}>
                    <option value="Employed">Employed</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Student">Student</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Occupation</label>
                  <input className="RMS_INPUT" value={formData.occupation} onChange={e => handleChange('occupation', e.target.value)} placeholder="e.g. Driver, Teacher" />
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Monthly Income</label>
                  <select className="RMS_INPUT" value={formData.monthlyIncome} onChange={e => handleChange('monthlyIncome', e.target.value)}>
                    <option value="Below ₱5,000">Below ₱5,000</option>
                    <option value="₱5,000 - ₱10,000">₱5,000 - ₱10,000</option>
                    <option value="₱10,000 - ₱20,000">₱10,000 - ₱20,000</option>
                    <option value="Above ₱20,000">Above ₱20,000</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Housing Type</label>
                  <select className="RMS_INPUT" value={formData.housingType} onChange={e => handleChange('housingType', e.target.value)}>
                    <option value="Owned House">Owned House</option>
                    <option value="Rented">Rented</option>
                    <option value="Living with Relatives">Living with Relatives</option>
                    <option value="Informal Settler">Informal Settler</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Activity Status</label>
                  <select className="RMS_INPUT" value={formData.activityStatus} onChange={e => handleChange('activityStatus', e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: CLASSIFICATIONS & IDS */}
            <div className="RMS_SECTION">
              <div className="RMS_SEC_TITLE">Classifications & IDs</div>
              <div className="RMS_CHECK_GRID">
                {[
                  {k:'isVoter', l:'Voter'}, {k:'isPWD', l:'PWD'}, {k:'is4Ps', l:'4Ps'}, 
                  {k:'isSoloParent', l:'Solo Parent'}, {k:'isSeniorCitizen', l:'Senior Citizen'}, {k:'isIP', l:'IP'}
                ].map(item => (
                  <label key={item.k} className="RMS_CHECK_ITEM">
                    <input type="checkbox" checked={!!formData[item.k as keyof IResident]} onChange={e => handleChange(item.k as keyof IResident, e.target.checked)} />
                    <span>{item.l}</span>
                  </label>
                ))}
              </div>

              {(formData.isPWD || formData.isSoloParent || formData.isSeniorCitizen || formData.is4Ps) && (
                <div className="RMS_ID_CONTAINER">
                  {formData.isPWD && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">PWD ID Number *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.pwdIdNumber} onChange={e => handleChange('pwdIdNumber', e.target.value)} />
                    </div>
                  )}
                  {formData.isSoloParent && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">Solo Parent ID *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.soloParentIdNumber} onChange={e => handleChange('soloParentIdNumber', e.target.value)} />
                    </div>
                  )}
                  {formData.isSeniorCitizen && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">Senior Citizen ID *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.seniorIdNumber} onChange={e => handleChange('seniorIdNumber', e.target.value)} />
                    </div>
                  )}
                  {formData.is4Ps && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">4Ps ID Number *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.fourPsIdNumber} onChange={e => handleChange('fourPsIdNumber', e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 4: RESIDENCE & CONTACT */}
            <div className="RMS_SECTION">
              <div className="RMS_SEC_TITLE">Residence & Contact</div>
              <div className="RMS_GRID">
                <div className="RMS_GROUP RMS_SPAN2"><label className="RMS_LABEL">Current Address *</label>
                  <input className="RMS_INPUT" value={formData.currentAddress} onChange={e => handleChange('currentAddress', e.target.value)} required />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Purok *</label>
                  <select className="RMS_INPUT" value={formData.purok} onChange={e => handleChange('purok', e.target.value)} required>
                    <option value="">Select Purok</option>{[1,2,3,4,5,6,7].map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}
                  </select>
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Contact Number</label>
                  <input className="RMS_INPUT" value={formData.contact_number} onChange={e => handleChange('contact_number', e.target.value)} />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Email Address</label>
                  <input type="email" className="RMS_INPUT" value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="email@example.com" />
                </div>
              </div>
            </div>
          </div>

          <div className="RMS_FOOTER">
            <button type="button" className="RMS_BTN_CANCEL" onClick={onClose}>Cancel</button>
            <button type="submit" className="RMS_BTN_SUBMIT" disabled={isLoading}>{isLoading ? 'Saving...' : 'Confirm Registration'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};