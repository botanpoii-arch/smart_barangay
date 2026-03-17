import React from 'react';
import './styles/Community_Blotter_view.css'; // Import the new CSS file

interface BlotterItem {
  id: string;
  type: string;
  date: string;
  status: string;
  details: string;
  price: string;
}

interface Props {
  data: BlotterItem[];
  onSelect: (item: BlotterItem) => void;
}

const Community_Blotter_view: React.FC<Props> = ({ data, onSelect }) => {
  if (data.length === 0) return null;

  return (
    <>
      <div className="BLOTTER_SECTION_LABEL">Blotter Reports</div>
      {data.map((req) => (
        <div key={req.id} className="BLOTTER_CARD_ITEM" onClick={() => onSelect(req)}>
          
          <div className="BLOTTER_HEADER">
            <div className="BLOTTER_ID_GROUP">
                <strong>{req.type}</strong>
                <span className="BLOTTER_REF">{req.id}</span>
            </div>
            <div className={`BLOTTER_STATUS ${req.status.toUpperCase()}`}>
                {req.status.toUpperCase()}
            </div>
          </div>

          <div className="BLOTTER_BODY">
            <div className="BLOTTER_ICON_BOX">
                <i className="fas fa-gavel"></i>
            </div>
            <div className="BLOTTER_INFO">
              <h4>{req.type}</h4>
              <p className="BLOTTER_DESC">{req.details}</p>
              <p className="BLOTTER_DATE">{req.date}</p>
            </div>
            <div className="BLOTTER_PRICE_TAG">{req.price}</div>
          </div>

          <div className="BLOTTER_FOOTER">
             <span className="BLOTTER_TOTAL">Total: <b>{req.price}</b></span>
             <button className="BLOTTER_BTN_VIEW">View Details</button>
          </div>

        </div>
      ))}
    </>
  );
};

export default Community_Blotter_view;