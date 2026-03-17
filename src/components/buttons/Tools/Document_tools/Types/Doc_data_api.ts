import { useState, useEffect } from 'react';
// Corrected Named Imports from your central api.ts
import { 
  RESIDENTS_API, 
  OFFICIALS_API, 
  DOCUMENTS_API, 
  getAuthHeaders 
} from '../../../../UI/api'; // Adjust path if necessary

// --- INTERFACES ---
export interface IResident {
  record_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  current_address?: string;
  purok?: string;
}

export interface IOfficial {
  id: string;
  full_name: string;
  position: string;
  status: string;
}

/**
 * Hook to handle API interactions with RBAC Handshake.
 */
export const useDocumentDataAPI = (initialResidentName: string, initialResidentId?: string) => {
  const [residents, setResidents] = useState<IResident[]>([]);
  const [captainName, setCaptainName] = useState('HON. AMADO M. FELIZARDO');
  const [autoFilledAddress, setAutoFilledAddress] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAuthHeaders();

        // Use the imported endpoint constants
        const [resResidents, resOfficials] = await Promise.all([
          fetch(RESIDENTS_API, { headers }),
          fetch(OFFICIALS_API, { headers })
        ]);

        if (resResidents.status === 403 || resResidents.status === 401) {
          console.error("RBAC: Unauthorized access to residents list.");
          return;
        }

        if (resResidents.ok) {
          const residentList: IResident[] = await resResidents.json();
          setResidents(Array.isArray(residentList) ? residentList : []);

          if (initialResidentName || initialResidentId) {
            const matched = residentList.find((r: IResident) => {
              if (r.record_id === initialResidentId) return true;
              const fName = r.first_name || '';
              const lName = r.last_name || '';
              const dbFullName = `${fName} ${lName}`.trim().toLowerCase();
              const searchName = (initialResidentName || '').trim().toLowerCase();
              return dbFullName.includes(searchName);
            });

            if (matched) {
              const addrParts = [];
              if (matched.current_address && matched.current_address.toLowerCase() !== 'n/a') addrParts.push(matched.current_address);
              if (matched.purok) addrParts.push(matched.purok);
              setAutoFilledAddress(addrParts.join(', '));
            }
          }
        }

        if (resOfficials.ok) {
          const officialsData: IOfficial[] = await resOfficials.json();
          const activeCaptain = officialsData.find(o => 
            o.position.toLowerCase().includes('captain') && o.status === 'Active'
          );
          if (activeCaptain) {
            setCaptainName(`HON. ${activeCaptain.full_name.toUpperCase()}`);
          }
        }
      } catch (err) {
        console.error("API Fetch Error:", err);
      }
    };

    fetchData();
  }, [initialResidentName, initialResidentId]);

  return { residents, captainName, autoFilledAddress };
};

/**
 * Save document record using central DOCUMENTS_API
 */
export const saveDocumentRecord = async (payload: any, customHeaders?: any) => {
  // Use shared getAuthHeaders if no custom headers are provided
  const headers = customHeaders || getAuthHeaders();

  // Your endpoint logic expects /save at the end
  const res = await fetch(`${DOCUMENTS_API}/save`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (res.status === 403) throw new Error('RBAC_DENIED');
  if (!res.ok) throw new Error('Database save failed');
  
  return await res.json();
};