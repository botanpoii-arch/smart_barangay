import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// NEW CSS ARCHITECTURE
import './styles/Document_Frame.css'; 
import './styles/Document_Format.css';

// Import API Logic
import { useDocumentDataAPI, saveDocumentRecord, type IResident } from './Types/Doc_data_api';

// Import modular templates
import { getBarangayClearanceTemplate } from './Doc_type/Barangay_clearance';
import { getCertificateOfIndigencyTemplate } from './Doc_type/Barangay_Indegency';
import { getCertificateOfResidencyTemplate } from './Doc_type/Barangay_Residency';

// Asset Icons
import baguioLogo from './icons/Baguio_city.png'; 
import brgyLogo from './icons/Barangay_eng-hill.png'; 

// --- TYPES ---
interface IDocRequest {
  id?: string;
  referenceNo: string;
  residentName: string;
  type: string;
  purpose: string;
  dateRequested: string;
  status: string;
  price: number;
  resident_id?: string;
}

interface FileProps {
  onClose: () => void;
  onSuccess: () => void;
  data: IDocRequest;
  officials?: { position: string; full_name: string }[]; 
}

export const Document_File: React.FC<FileProps> = ({ onClose, onSuccess, data, officials }) => {
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role') || 'guest';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-role': role
    };
  }, []);

  const { residents, captainName: apiCaptainName, autoFilledAddress } = useDocumentDataAPI(data.residentName, data.resident_id);

  const [isSaving, setIsSaving] = useState(false);
  const [filteredResidents, setFilteredResidents] = useState<IResident[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(data.resident_id || null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const [content, setContent] = useState({
    residentName: data.residentName || '',
    type: data.type || 'Barangay Clearance',
    purpose: data.purpose || '',
    dateIssued: new Date().toISOString().split('T')[0], 
    address: '',
    ctcNo: '',
    orNo: '',
    feesPaid: data.price?.toString() || '200.00'
  });

  const previewRef = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const pdfTargetRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (autoFilledAddress) {
      setContent(prev => ({ ...prev, address: autoFilledAddress }));
    }
  }, [autoFilledAddress]);

  const formatToProperName = useCallback((first: string = '', middle: string = '', last: string = '') => {
    const capitalize = (str: string) => 
      str.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const fName = capitalize(first);
    const lName = capitalize(last);
    const mInit = middle.trim() ? `${middle.trim().charAt(0).toUpperCase()}. ` : '';
    return `${fName} ${mInit}${lName}`.trim();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setContent(prev => ({ ...prev, residentName: input }));
    setSelectedResidentId(null);

    if (input.length > 0) {
      const filtered = residents.filter(r => {
        const rawFullName = `${r.first_name} ${r.last_name}`.toLowerCase();
        return rawFullName.includes(input.toLowerCase());
      });
      setFilteredResidents(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectResident = (r: IResident) => {
    const formattedName = formatToProperName(r.first_name, r.middle_name, r.last_name);
    const addrParts: string[] = []; 
    if (r.current_address && r.current_address.toLowerCase() !== 'n/a') addrParts.push(r.current_address);
    if (r.purok) addrParts.push(r.purok);

    setContent(prev => ({ 
      ...prev, 
      residentName: formattedName,
      address: addrParts.join(', ') 
    }));
    setSelectedResidentId(r.record_id); 
    setShowDropdown(false);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    const priceMap: Record<string, string> = {
      'Barangay Clearance': '200.00',
      'Certificate of Indigency': '200.00',
      'Business Permit': '200.00',
      'Certificate of Residency': '200.00',
      'Barangay ID': '200.00'
    };
    setContent(prev => ({ 
      ...prev, 
      type: newType,
      feesPaid: priceMap[newType] || '0.00'
    }));
  };

  const getTemplateContent = () => {
    const { residentName, address, purpose, dateIssued, type } = content;
    const templateProps = { name: residentName || "_________________", address, purpose, dateIssued };

    switch(type) {
      case 'Barangay Clearance': return getBarangayClearanceTemplate(templateProps);
      case 'Certificate of Indigency': return getCertificateOfIndigencyTemplate(templateProps);
      case 'Certificate of Residency': return getCertificateOfResidencyTemplate(templateProps);
      default: return `<p style="text-align: justify; font-size: 12pt; line-height: 1.6;">This is to certify that <b>${templateProps.name}</b> is a resident of this Barangay.</p>`;
    }
  };

  const handleSaveAndDownload = async () => {
    if (!content.residentName) return alert("Please enter a Requestor Name.");
    setIsSaving(true);
    
    try {
      const canvas = await html2canvas(pdfTargetRef.current!, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`${content.type.replace(/\s+/g, '_')}_${content.residentName}.pdf`);

      await saveDocumentRecord({
        ...(data.id ? { id: data.id } : {}),
        resident_id: selectedResidentId || 'MANUAL_ENTRY',
        resident_name: content.residentName,
        type: content.type,
        purpose: content.purpose,
        price: parseFloat(content.feesPaid),
        status: 'Completed',
        reference_no: data.referenceNo || `REF-${Date.now()}`,
        date_requested: new Date().toISOString() 
      }, getAuthHeaders()); 

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Save Error:", error);
      alert("Error processing document.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeOfficial = officials?.find(o => 
    o.position.toLowerCase().includes('captain') || o.position.toLowerCase().includes('punong')
  ) || officials?.[0];

  const displayCaptainName = activeOfficial?.full_name || apiCaptainName || "HON. AMADO M. FELIZARDO";
  const displayCaptainPosition = activeOfficial?.position || "Punong Barangay";

  const isResidency = content.type === 'Certificate of Residency';

  return (
    <div className="DOC_GEN_OVERLAY" onClick={(e) => e.stopPropagation()}>
      <div className="DOC_GEN_TOOLBAR">
        <div className="DOC_GEN_TOOL_GROUP">
          <button className={isBold ? 'active' : ''} onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); setIsBold(!isBold); }}><b>B</b></button>
          <button className={isItalic ? 'active' : ''} onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); setIsItalic(!isItalic); }}><i>I</i></button>
          <button className={isUnderline ? 'active' : ''} onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); setIsUnderline(!isUnderline); }}><u>U</u></button>
        </div>
        <div className="DOC_GEN_TOOL_ACTIONS">
          <button className="DOC_GEN_BTN_CANCEL" onClick={onClose}>Close</button>
          <button className="DOC_GEN_BTN_SAVE" onClick={handleSaveAndDownload} disabled={isSaving}>
            {isSaving ? 'Processing...' : 'Print / Download'}
          </button>
        </div>
      </div>

      <div className="DOC_GEN_BODY">
        <div className="DOC_GEN_SIDE_PANEL">
          <div className="DOC_GEN_PANEL_HEADER">Document Details</div>
          
          <div className="DOC_GEN_INPUT_GROUP RELATIVE" ref={searchWrapperRef}>
            <label>Requestor Name</label>
            <div className="DOC_GEN_SEARCH_WRAPPER">
              <input type="text" value={content.residentName} onChange={handleNameChange} onFocus={() => setShowDropdown(true)} />
              <i className="fas fa-search"></i>
            </div>
            {showDropdown && filteredResidents.length > 0 && (
              <ul className="DOC_GEN_DROPDOWN">
                {filteredResidents.map(r => (
                  <li key={r.record_id} onClick={() => selectResident(r)}>
                    <span className="DOC_GEN_RES_NAME">{formatToProperName(r.first_name, r.middle_name, r.last_name)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="DOC_GEN_INPUT_GROUP">
            <label>Document Type</label>
            <select value={content.type} onChange={handleTypeChange} className="DOC_GEN_SELECT">
              <option value="Barangay Clearance">Barangay Clearance</option>
              <option value="Certificate of Indigency">Certificate of Indigency</option>
              <option value="Certificate of Residency">Certificate of Residency</option>
              <option value="Business Permit">Business Permit</option>
            </select>
          </div>

          {!isResidency && (
            <>
              <div className="DOC_GEN_INPUT_GROUP">
                <label>CTC No.</label>
                <input type="text" value={content.ctcNo} placeholder="Enter CTC" onChange={e => setContent(prev => ({...prev, ctcNo: e.target.value}))} />
              </div>
              <div className="DOC_GEN_INPUT_GROUP">
                <label>O.R. No.</label>
                <input type="text" value={content.orNo} placeholder="Enter O.R." onChange={e => setContent(prev => ({...prev, orNo: e.target.value}))} />
              </div>
              <div className="DOC_GEN_INPUT_GROUP">
                <label>Fees Paid</label>
                <input type="text" value={content.feesPaid} onChange={e => setContent(prev => ({...prev, feesPaid: e.target.value}))} />
              </div>
            </>
          )}

          <div className="DOC_GEN_INPUT_GROUP">
            <label>Address</label>
            <input value={content.address} onChange={e => setContent(prev => ({...prev, address: e.target.value}))} />
          </div>

          <div className="DOC_GEN_INPUT_GROUP">
            <label>Purpose</label>
            <input value={content.purpose} onChange={e => setContent(prev => ({...prev, purpose: e.target.value}))} />
          </div>
        </div>

        <div className="DOC_GEN_PREVIEW_AREA">
          <div className="DOC_GEN_A4_PAGE" ref={pdfTargetRef}>
            
            <img src={brgyLogo} alt="Seal" className="DOC_WATERMARK" />

            <div className="DOC_HEADER_ROW">
              <div className="DOC_LOGO_BOX"><img src={brgyLogo} alt="Brgy" className="DOC_LOGO_IMG" /></div>
              <div className="DOC_BANNER_GREEN">
                <p>REPUBLIC OF THE PHILIPPINES</p>
                <p>CITY OF BAGUIO</p>
                <p className="BANNER_BRGY_NAME">ENGINEER'S HILL BARANGAY</p>
              </div>
              <div className="DOC_LOGO_BOX"><img src={baguioLogo} alt="Baguio" className="DOC_LOGO_IMG" /></div>
            </div>

            {isResidency && (
              <div style={{textAlign: 'center', fontWeight: 800, fontSize: '14pt', margin: '10px 0 5px 0'}}>
                OFFICE OF THE PUNONG BARANGAY
              </div>
            )}

            <h1 className="DOC_TITLE_TEXT">{content.type.toUpperCase()}</h1>

            <div 
                className="DOC_RICH_CONTENT"
                contentEditable
                ref={previewRef}
                suppressContentEditableWarning={true}
                dangerouslySetInnerHTML={{ __html: getTemplateContent() }}
            ></div>

            <div className="DOC_SIG_SECTION">
              {!isResidency && (
                 <div className="DOC_SIG_LEFT"><div className="SIG_UNDERLINE"></div><p>Signature</p></div>
              )}
              <div className="DOC_SIG_RIGHT">
                <p className="OFFICIAL_NAME">{displayCaptainName.toUpperCase()}</p>
                <p className="OFFICIAL_POSITION">{displayCaptainPosition}</p>
              </div>
            </div>

            {isResidency && (
              <div className="DOC_STAMP_BOX">
                <div className="STAMP_TITLE">"DOCUMENTARY STAMP TAX PAID"</div>
                <div className="STAMP_LINES">
                  <div className="STAMP_LINE">GOR Serial Number</div>
                  <div className="STAMP_LINE">Date of Payment</div>
                </div>
              </div>
            )}

            {!isResidency && (
              <div className="DOC_BOTTOM_METADATA">
                <div className="META_COL">
                  <div className="META_INPUT_ROW">
                    CTC NO: <input 
                      type="text" 
                      className="FORM_LINE_INPUT" 
                      value={content.ctcNo} 
                      onChange={e => setContent(prev => ({...prev, ctcNo: e.target.value}))} 
                      placeholder="________________________" 
                    />
                  </div>
                  <p>Issued At: <b>Engineer's Hill, Baguio City</b></p>
                  <p>Issued On: <b>{new Date(content.dateIssued).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b></p>
                </div>
                <div className="META_COL RIGHT_ALIGN">
                  <div className="META_INPUT_ROW">
                    Fees Paid: ₱<input 
                      type="text" 
                      className="FORM_LINE_INPUT" 
                      style={{ width: '80px' }}
                      value={content.feesPaid} 
                      onChange={e => setContent(prev => ({...prev, feesPaid: e.target.value}))} 
                      placeholder="____________" 
                    />
                  </div>
                  <div className="META_INPUT_ROW">
                    O.R. No.: <input 
                      type="text" 
                      className="FORM_LINE_INPUT" 
                      value={content.orNo} 
                      onChange={e => setContent(prev => ({...prev, orNo: e.target.value}))} 
                      placeholder="________________________" 
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="DOC_GREEN_FOOTER">
              <div className="FOOTER_DIVIDER"></div>
              <div className="FOOTER_CONTACT_INFO">
                <span><i className="fas fa-envelope"></i> enrqshill2600@gmail.com</span>
                <span><i className="fas fa-phone"></i> 074-422-8228</span>
              </div>
              <p className="FOOTER_ADDRESS">Engineer's Hill Barangay, Baguio City</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};