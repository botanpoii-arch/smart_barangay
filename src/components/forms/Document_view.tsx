import { useState } from 'react';
import './styles/Document_view.css'; 

// 1. WE MOVED THE INTERFACE HERE!
// Now this component is self-contained and knows exactly what data it needs.
export interface IDocRequest {
  id: string;
  referenceNo: string;
  residentName: string;
  dateRequested: string;
  type: string;
  price: number;
  purpose: string;
  otherPurpose?: string;
  // UPDATE THIS LINE BELOW:
  status: 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Rejected'; 
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onGenerate?: (data: IDocRequest) => void; 
  data: IDocRequest;
}

const API_URL = 'http://localhost:8000/api/documents';

export default function Document_view({ isOpen, onClose, onUpdate, onGenerate, data }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const updateStatus = async (newStatus: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/${data.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        onUpdate(); 
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      alert('Network Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return '#f59e0b';
      case 'Processing': return '#3b82f6';
      case 'Ready': return '#a855f7';
      case 'Completed': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <div className="DOC_VIEW_OVERLAY">
      <div className="DOC_VIEW_MODAL">
        
        {/* HEADER */}
        <div className="DOC_VIEW_HEADER">
          <div>
            <span className="DOC_VIEW_REF">{data.referenceNo}</span>
            <h3>Request Details</h3>
          </div>
          <button className="DOC_VIEW_CLOSE" onClick={onClose}>&times;</button>
        </div>

        {/* BODY */}
        <div className="DOC_VIEW_BODY">
          <div className="DOC_VIEW_STATUS_BAR" style={{borderColor: getStatusColor(data.status)}}>
            <span style={{color: getStatusColor(data.status)}}>CURRENT STATUS</span>
            <strong style={{color: getStatusColor(data.status)}}>{data.status.toUpperCase()}</strong>
          </div>

          <div className="DOC_VIEW_GRID">
            <div className="DOC_VIEW_FIELD">
              <label>Resident Name</label>
              <input type="text" value={data.residentName} readOnly />
            </div>
            <div className="DOC_VIEW_FIELD">
              <label>Date Requested</label>
              <input type="text" value={new Date(data.dateRequested).toLocaleDateString()} readOnly />
            </div>
          </div>

          <div className="DOC_VIEW_GRID">
            <div className="DOC_VIEW_FIELD">
              <label>Document Type</label>
              <input type="text" value={data.type} readOnly />
            </div>
            <div className="DOC_VIEW_FIELD">
              <label>Amount Due</label>
              <input type="text" value={data.price > 0 ? `₱${data.price.toFixed(2)}` : 'FREE'} readOnly className="PRICE_INPUT" />
            </div>
          </div>

          <div className="DOC_VIEW_FIELD">
            <label>Purpose</label>
            <textarea readOnly value={data.purpose === 'Other' ? data.otherPurpose : data.purpose} rows={3}></textarea>
          </div>
        </div>

        {/* ACTION FOOTER */}
        <div className="DOC_VIEW_FOOTER">
          {data.status === 'Pending' && (
            <>
              <button className="BTN_ACT REJECT" onClick={() => updateStatus('Rejected')} disabled={isProcessing}>Reject</button>
              <button className="BTN_ACT APPROVE" onClick={() => updateStatus('Processing')} disabled={isProcessing}>Approve Request</button>
            </>
          )}

          {data.status === 'Processing' && (
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button 
                className="BTN_ACT GENERATE" 
                onClick={() => {
                  if (onGenerate) onGenerate(data);
                  onClose(); 
                }} 
                style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white' }}
                disabled={isProcessing}
              >
                <i className="fas fa-file-pdf"></i> Generate Document
              </button>
              
              <button 
                className="BTN_ACT READY" 
                onClick={() => updateStatus('Ready')} 
                style={{ flex: 1, backgroundColor: '#a855f7', color: 'white' }}
                disabled={isProcessing}
              >
                <i className="fas fa-print"></i> Mark Printed & Ready
              </button>
            </div>
          )}

          {data.status === 'Ready' && (
            <button className="BTN_ACT COMPLETE" onClick={() => updateStatus('Completed')} disabled={isProcessing}>
              <i className="fas fa-check-circle"></i> Release Document
            </button>
          )}

          {(data.status === 'Completed' || data.status === 'Rejected') && (
            <div className="DOC_VIEW_ARCHIVED">
              <i className="fas fa-archive"></i> This record is archived.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}