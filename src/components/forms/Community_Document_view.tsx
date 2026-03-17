import React from 'react';
import './styles/Community_Document_view.css'; // Import the specific CSS

interface DocItem {
  id: string;
  type: string;
  date: string;
  status: string;
  details: string;
  price: string;
}

interface Props {
  data: DocItem[];
  onSelect: (item: DocItem) => void;
}

const Community_Document_view: React.FC<Props> = ({ data, onSelect }) => {
  if (data.length === 0) return null;

  return (
    <>
      <div className="DOC_SECTION_LABEL">Document Requests</div>
      {data.map((req) => (
        <div key={req.id} className="DOC_CARD_ITEM" onClick={() => onSelect(req)}>
          
          <div className="DOC_HEADER">
            <div className="DOC_ID_GROUP">
                <strong>{req.type}</strong>
                <span className="DOC_REF">{req.id}</span>
            </div>
            <div className={`DOC_STATUS ${req.status.toUpperCase()}`}>
                {req.status.toUpperCase()}
            </div>
          </div>

          <div className="DOC_BODY">
            <div className="DOC_ICON_BOX">
                <i className="fas fa-file-alt"></i>
            </div>
            <div className="DOC_INFO">
              <h4>{req.type}</h4>
              <p className="DOC_DESC">{req.details}</p>
              <p className="DOC_DATE">{req.date}</p>
            </div>
            <div className="DOC_PRICE_TAG">{req.price}</div>
          </div>

          <div className="DOC_FOOTER">
             <span className="DOC_TOTAL">Total: <b>{req.price}</b></span>
             <button className="DOC_BTN_VIEW">View Details</button>
          </div>

        </div>
      ))}
    </>
  );
};

export default Community_Document_view;