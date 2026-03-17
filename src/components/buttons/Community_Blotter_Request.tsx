import { useState, useEffect, useCallback } from 'react';
import './styles/Community_Blotter_Request.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BLOTTER_TYPES = [
  'Noise Complaint',
  'Physical Injury',
  'Theft',
  'Harassment / Threats',
  'Property Damage',
  'Vandalism',
  'Unjust Vexation',
  'Others'
];

export default function Community_Blotter_Request({ isOpen, onClose, onSuccess }: ModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    respondent: '',
    purok: 'Purok 1',
    type: 'Noise Complaint',
    dateFiled: new Date().toISOString().split('T')[0],
    timeFiled: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    narrative: '',
  });

  // --- 1. CORE FORMATTER: "Ranni L. Carian" ---
  const formatToProperName = useCallback((first: string = '', middle: string = '', last: string = '') => {
    const toTitleCase = (str: string) => 
      str.toLowerCase().trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const fName = toTitleCase(first);
    const lName = toTitleCase(last);
    const mInit = middle.trim() ? `${middle.trim().charAt(0).toUpperCase()}. ` : '';

    return `${fName} ${mInit}${lName}`.trim();
  }, []);

  // 2. AUTO-DETECT USER ON OPEN (Aligned with new record_id schema)
  useEffect(() => {
    if (isOpen) {
      const session = localStorage.getItem('resident_session');
      if (session) {
        const parsed = JSON.parse(session);
        // Supports data.profile from ResidentsRecordRouter or fallback
        const profile = parsed.profile || parsed.residents || parsed; 
        
        const formatted = formatToProperName(
          profile.first_name, 
          profile.middle_name, 
          profile.last_name
        );

        setCurrentUser({ ...profile, formattedName: formatted });
      }
      setStep(1); 
    }
  }, [isOpen, formatToProperName]);

  if (!isOpen) return null;

  // --- 3. SUBMISSION LOGIC ---
  const handleSubmit = async () => {
    if (!currentUser?.record_id) return alert("System Error: Resident ID missing.");
    setIsSubmitting(true);

    try {
      // A. GET LATEST COUNT FOR CASE NUMBER
      const countRes = await fetch('http://localhost:8000/api/blotter');
      const blotterList = await countRes.json();
      
      const year = new Date().getFullYear();
      const nextNum = (blotterList.length + 1).toString().padStart(4, '0');
      const generatedCaseNum = `BLTR-${year}-${nextNum}`;

      // B. PREPARE PAYLOAD (Strict snake_case mapping for SQL)
      const payload = {
        case_number: generatedCaseNum,
        complainant_id: currentUser.record_id, // Aligned to UUID record_id
        complainant_name: currentUser.formattedName, // Professional format: Ranni L. Carian
        respondent: formData.respondent.toUpperCase(), // Auto Caplock Respondent
        incident_type: formData.type,
        narrative: `[LOCATION: ${formData.purok}] ${formData.narrative}`,
        date_filed: formData.dateFiled,
        time_filed: formData.timeFiled
      };

      const res = await fetch('http://localhost:8000/api/blotter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Complaint submitted successfully! An official will review your case.');
        onSuccess(); 
        onClose();   
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error || 'Check database constraints.'}`);
      }
    } catch (err) {
      alert("Network error. Ensure the backend server is active.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="CBR_OVERLAY">
      <div className="CBR_MODAL">
        
        {/* HEADER */}
        <div className="CBR_HEADER">
          <div className="CBR_HEADER_TEXT">
              <h3>File Blotter Report</h3>
              <p>Step {step} of 3: {step === 1 ? 'Parties Involved' : step === 2 ? 'Incident Details' : 'Review & Submit'}</p>
          </div>
          <button className="CBR_CLOSE_BTN" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>

        {/* PROGRESS BAR */}
        <div className="CBR_PROGRESS">
           <div className={`CBR_FILL STEP_${step}`}></div>
        </div>

        {/* BODY */}
        <div className="CBR_BODY">
           {step === 1 && (
             <div className="CBR_STEP_CONTENT">
                <div className="CBR_FORM_GROUP">
                  <label>Complainant (You)</label>
                  <div className="CBR_READONLY_FIELD">
                      <i className="fas fa-user-circle"></i>
                      <span>{currentUser?.formattedName || 'Loading...'}</span>
                  </div>
                </div>

                <div className="CBR_FORM_GROUP">
                  <label>Who are you complaining against? (Respondent)</label>
                  <input 
                    className="CBR_INPUT"
                    type="text" 
                    placeholder="Enter full name" 
                    value={formData.respondent}
                    onChange={e => setFormData({...formData, respondent: e.target.value})}
                  />
                </div>

                <div className="CBR_FORM_GROUP">
                  <label>Nature of Complaint</label>
                  <select 
                    className="CBR_SELECT"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    {BLOTTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
             </div>
           )}

           {step === 2 && (
             <div className="CBR_STEP_CONTENT">
                <div className="CBR_ROW">
                   <div className="CBR_FORM_GROUP">
                      <label>Date of Incident</label>
                      <input className="CBR_INPUT" type="date" value={formData.dateFiled} onChange={e => setFormData({...formData, dateFiled: e.target.value})} />
                   </div>
                   <div className="CBR_FORM_GROUP">
                      <label>Location (Purok)</label>
                      <select className="CBR_SELECT" value={formData.purok} onChange={e => setFormData({...formData, purok: e.target.value})} >
                        {[1,2,3,4,5,6,7].map(num => <option key={num} value={`Purok ${num}`}>Purok {num}</option>)}
                      </select>
                   </div>
                </div>
                <div className="CBR_FORM_GROUP">
                  <label>Statement of Facts (Narrative)</label>
                  <textarea className="CBR_TEXTAREA" rows={6} placeholder="Describe the incident objectively..." value={formData.narrative} onChange={e => setFormData({...formData, narrative: e.target.value})} />
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="CBR_STEP_CONTENT">
                <div className="CBR_REVIEW_CARD">
                   <div className="CBR_REVIEW_HEADER">Case Summary</div>
                   <div className="CBR_REVIEW_BODY">
                      <div className="CBR_REVIEW_ITEM"><span>Complainant:</span> <strong>{currentUser?.formattedName}</strong></div>
                      <div className="CBR_REVIEW_ITEM"><span>Respondent:</span> <strong>{formData.respondent.toUpperCase()}</strong></div>
                      <div className="CBR_REVIEW_ITEM"><span>Case Type:</span> <span className="CBR_TAG">{formData.type}</span></div>
                      <div className="CBR_REVIEW_DIVIDER"></div>
                      <div className="CBR_REVIEW_ITEM VERTICAL"><span>Narrative:</span> <p>"{formData.narrative}"</p></div>
                   </div>
                </div>
                <div className="CBR_DISCLAIMER">
                   <input type="checkbox" id="certify" checked readOnly />
                   <label htmlFor="certify">I certify that the information provided is true and correct.</label>
                </div>
             </div>
           )}
        </div>

        {/* FOOTER */}
        <div className="CBR_FOOTER">
           {step > 1 && (
             <button className="CBR_BTN_SECONDARY" onClick={() => setStep(prev => (prev - 1) as any)} disabled={isSubmitting}>Back</button>
           )}

           {step < 3 ? (
             <button className="CBR_BTN_PRIMARY" onClick={() => setStep(prev => (prev + 1) as any)} disabled={!formData.respondent || (step === 2 && !formData.narrative)}>
               Next Step <i className="fas fa-arrow-right"></i>
             </button>
           ) : (
             <button className="CBR_BTN_PRIMARY SUBMIT" onClick={handleSubmit} disabled={isSubmitting}>
               {isSubmitting ? 'Submitting...' : 'Submit Report'}
             </button>
           )}
        </div>

      </div>
    </div>
  );
}