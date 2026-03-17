// Api.ts

// --- THE HANDSHAKE HELPER ---
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  let role = localStorage.getItem('user_role');
  
  // Protect against the "undefined" spam crash
  if (!role || role === 'undefined' || role === 'null') {
    role = 'admin'; 
    localStorage.setItem('user_role', 'admin'); 
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-user-role': role
  };
};

// --- FETCH RESIDENTS (WITH HANDSHAKE) ---
export const fetchResidentsAPI = async () => {
  const res = await fetch('http://localhost:8000/api/residents', {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch residents');
  return await res.json();
};

// --- FETCH OFFICIALS (WITH HANDSHAKE) ---
export const fetchOfficialsAPI = async () => {
  const res = await fetch('http://localhost:8000/api/officials', {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch officials');
  return await res.json();
};

// --- SAVE / UPDATE BLOTTER (WITH HANDSHAKE) ---
export const saveBlotterAPI = async (id: string | null, submissionData: any) => {
  const url = `http://localhost:8000/api/blotter${id ? `/${id}` : ''}`;
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(submissionData),
  });

  if (res.status === 403) throw new Error("Access Denied: Insufficient permissions.");
  if (res.status === 401) throw new Error("Session expired. Please log in again.");
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Server Error');
  }
  
  return await res.json();
};