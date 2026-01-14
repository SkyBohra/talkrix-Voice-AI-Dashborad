import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  maxCorpusLimit: number;
}

/**
 * Get current user info including limits
 */
export const getUserInfo = async (): Promise<{ success: boolean; data?: UserInfo; error?: string }> => {
  try {
    const res = await axios.get(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return normalizeResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Failed to fetch user info',
    };
  }
};
