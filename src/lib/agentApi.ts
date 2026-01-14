import axios from 'axios';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/agents`;

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
};

// Helper to normalize backend response
const normalizeResponse = (response: any) => {
  const data = response.data;
  return {
    success: data.statusCode < 400,
    data: data.data,
    message: data.message,
    error: data.error,
  };
};

export const fetchAgentsByUser = async (userId: string) => {
  const res = await axios.get(`${API_BASE}/user/${userId}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

export const createAgent = async (userId: string, agentData: any) => {
  const res = await axios.post(`${API_BASE}/ultravox/${userId}`, agentData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

export const updateAgent = async (id: string, agentData: any) => {
  const res = await axios.put(`${API_BASE}/${id}`, agentData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

export const deleteAgent = async (id: string) => {
  const res = await axios.delete(`${API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

export const fetchVoices = async (search?: string) => {
  const params = new URLSearchParams();
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  const url = `${API_BASE}/voices${params.toString() ? '?' + params.toString() : ''}`;
  const res = await axios.get(url, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

/**
 * Create a call to test an agent
 * Returns joinUrl that can be used with Ultravox Client SDK
 */
export const createAgentCall = async (agentId: string, options?: {
  maxDuration?: string;
  recordingEnabled?: boolean;
}) => {
  const res = await axios.post(`${API_BASE}/${agentId}/call`, options || {}, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};
