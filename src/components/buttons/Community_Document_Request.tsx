import { useState, useEffect } from 'react';
import './styles/Community_Document_Request.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  residentName: string;
  residentId: string;
}

// Defining the shape of the document data we expect from the backend
interface DocumentType {
  id: string; // The database ID (e.g., 'doc_01')
  label: string; // e.g., 'Barangay Clearance'
  price: number; // e.g., 50
  icon: string; // e.g., 'fa-file-certificate' (or you can assign icons dynamically on the frontend based on the label if the DB doesn't store them)
}

const PURPOSES = [
  'Employment Requirement',
  'School / Scholarship',
  'Business Requirement',
  'Other'
];

export default function Community_Document_Request({ isOpen, onClose, onSuccess, residentName, residentId }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New State for Dynamic Documents
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const [formData, setFormData] = useState({
    docTypeId: '', // Stores the selected ID
    purpose: '',
    otherPurpose: ''
  });

  // --- FETCH DOCUMENT TYPES FROM DATABASE ---
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      
      const fetchDocumentTypes = async () => {
        setIsLoadingDocs(true);
        try {
          // IMPORTANT: Replace this with your actual backend endpoint that serves the document list/prices
          // const res = await fetch('http://localhost:8000/api/document-types');
          // const data = await res.json();
          // setDocumentTypes(data);
          
          // --- TEMPORARY MOCK DATA (Remove this when your backend is ready) ---
          // Simulating a database response so the UI still works right now.
          setTimeout(() => {
            const mockDbData: DocumentType[] = [
              { id: 'brgy_clearance', label: 'Barangay Clearance', price: 50, icon: 'fa-file-certificate' },
              { id: 'cert_residency', label: 'Certificate of Residency', price: 75, icon: 'fa-home' },
              { id: 'cert_indigency', label: 'Certificate of Indigency', price: 0, icon: 'fa-hand-holding-heart' },
              { id: 'biz_permit', label: 'Business Permit', price: 500, icon: 'fa-store' },
              { id: 'good_moral', label: 'Certificate of Good Moral', price: 50, icon: 'fa-user-check' },
            ];
            setDocumentTypes(mockDbData);
            
            // Auto-select the first document once they load
            if (mockDbData.length > 0) {
                setFormData(prev => ({ ...prev, docTypeId: mockDbData[0].id }));
            }
            setIsLoadingDocs(false);
          }, 500); // Simulated network delay
          // ------------------------------------------------------------------

        } catch (error) {
          console.error("Failed to fetch document types:", error);
          setIsLoadingDocs(false);
        }
      };

      fetchDocumentTypes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Find the full document object based on the selected ID
  const selectedDoc = documentTypes.find(d => d.id === formData.docTypeId) || documentTypes[0];
  const totalPrice = selectedDoc ? selectedDoc.price : 0;

  // --- FINAL SUBMISSION ---
  const handleFinalSubmit = async () => {
    if (!residentId) return alert("System Error: Account ID missing.");
    if (!selectedDoc) return alert("System Error: No document selected.");
    
    setIsSubmitting(true);
    const finalPurpose = formData.purpose === 'Other' ? formData.otherPurpose : formData.purpose;

    const payload = {
        resident_id: residentId, 
        resident_name: residentName, 
        type: selectedDoc.label, 
        purpose: finalPurpose.toUpperCase(), 
        price: selectedDoc.price, 
        date_requested: new Date().toISOString(),
        reference_no: `REF-${Date.now()}`
    };

    try {
        const res = await fetch('http://localhost:8000/api/documents/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            onSuccess();
            onClose();
            alert(`Request Submitted! Your Reference Number: ${payload.reference_no}`);
        } else {
            const errData = await res.json();
            alert(`Failed: ${errData.error || 'Server error'}`);
        }
    } catch (err) {
        alert('Network error. Ensure the server is online.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="DOC_MODAL_OVERLAY">
      <div className="DOC_MODAL_CARD">
        <div className="DOC_MODAL_HEADER">
          <div className="DOC_HEADER_TEXT">
            <h3>{step === 3 ? 'Confirm Request' : 'Request Document'}</h3>
            <p>Step {step} of 3</p>
          </div>
          <button className="DOC_CLOSE_BTN" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>

        <div className="DOC_PROGRESS_BAR">
            <div className={`DOC_PROGRESS_FILL STEP_${step}`} style={{width: step === 3 ? '100%' : step === 2 ? '66%' : '33%'}}></div>
        </div>

        <div className="DOC_MODAL_BODY">
          {step === 1 && (
            <div className="DOC_STEP_CONTAINER">
              <div className="DOC_FORM_GROUP">
                <label>Select Document Type</label>
                
                {isLoadingDocs ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                    <p>Loading document prices...</p>
                  </div>
                ) : (
                  <div className="DOC_GRID_SELECT">
                    {documentTypes.map((doc) => (
                      <div 
                        key={doc.id} 
                        className={`DOC_SELECT_CARD ${formData.docTypeId === doc.id ? 'SELECTED' : ''}`}
                        onClick={() => setFormData({ ...formData, docTypeId: doc.id })}
                      >
                        <div className="DOC_ICON"><i className={`fas ${doc.icon || 'fa-file-alt'}`}></i></div>
                        <div className="DOC_INFO">
                          <span>{doc.label}</span>
                          <small>{doc.price === 0 ? 'walk in payment' : `₱${doc.price.toFixed(2)}`}</small>
                        </div>
                        {formData.docTypeId === doc.id && <i className="fas fa-check-circle DOC_CHECK"></i>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="DOC_FORM_GROUP">
                <label>Purpose of Request</label>
                <select 
                  value={formData.purpose} 
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="DOC_INPUT"
                >
                  <option value="" disabled>Select a purpose...</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {formData.purpose === 'Other' && (
                <div className="DOC_FORM_GROUP">
                    <label>Specify Purpose</label>
                    <input 
                        type="text" 
                        className="DOC_INPUT" 
                        placeholder="Please specify..."
                        value={formData.otherPurpose}
                        onChange={(e) => setFormData({...formData, otherPurpose: e.target.value})}
                    />
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedDoc && (
            <div className="DOC_STEP_CONTAINER">
              <div className="DOC_INFO_BOX">
                <i className="fas fa-shield-alt"></i>
                <span>Review your request details below.</span>
              </div>
              <div className="DOC_SUMMARY_CARD">
                <div className="DOC_SUMMARY_HEADER"><span>Request Summary</span></div>
                <div className="DOC_SUMMARY_BODY">
                    <div className="DOC_LINE_ITEM">
                        <span>Document Type</span>
                        <strong style={{color: '#1e293b'}}>{selectedDoc.label}</strong>
                    </div>
                    <div className="DOC_LINE_ITEM">
                        <span>Purpose</span>
                        <span style={{textTransform: 'uppercase'}}>{formData.purpose === 'Other' ? formData.otherPurpose : formData.purpose}</span>
                    </div>
                    <div className="DOC_LINE_DIVIDER"></div>
                     <div className="DOC_LINE_ITEM TOTAL">
                        <span>Total Price</span>
                        <span>₱{totalPrice.toFixed(2)}</span>
                    </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && selectedDoc && (
            <div className="DOC_STEP_CONTAINER" style={{textAlign: 'center', padding: '1rem 0'}}>
               <div style={{
                  width: '80px', height: '80px', background: '#eff6ff', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto',
                  color: '#2563eb', fontSize: '2.5rem'
               }}>
                  <i className="fas fa-clipboard-check"></i>
               </div>
               <h3 style={{color: '#1e293b', marginBottom: '0.5rem'}}>Confirm Submission?</h3>
               <p style={{color: '#64748b', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto'}}>
                  By submitting, you are requesting a <strong>{selectedDoc.label}</strong> for <strong>{residentName}</strong>. 
               </p>
            </div>
          )}
        </div>

        <div className="DOC_MODAL_FOOTER">
          {step === 2 && <button className="DOC_BTN_SECONDARY" onClick={() => setStep(1)} disabled={isSubmitting}>Back</button>}
          {step === 3 && <button className="DOC_BTN_SECONDARY" onClick={() => setStep(2)} disabled={isSubmitting}>Edit Details</button>}

          {step === 1 && (
            <button className="DOC_BTN_PRIMARY" onClick={() => setStep(2)} disabled={isLoadingDocs || !formData.docTypeId || !formData.purpose || (formData.purpose === 'Other' && !formData.otherPurpose)}>
                Next Step <i className="fas fa-arrow-right"></i>
            </button>
          )}

          {step === 2 && <button className="DOC_BTN_PRIMARY" onClick={() => setStep(3)}>Review</button>}

          {step === 3 && (
            <button className="DOC_BTN_PRIMARY" onClick={handleFinalSubmit} disabled={isSubmitting} style={{background: '#10b981'}}>
              {isSubmitting ? 'Submitting...' : `Submit Request`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}