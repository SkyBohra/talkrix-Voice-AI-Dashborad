import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  maxCorpusLimit: number;
}

/**
 * Get current user info including limits
 */
export const getUserInfo = async (): Promise<ApiResponse<UserInfo>> => {
  return safeApiCall(() => axios.get(`${API_BASE}/auth/me`, { headers: getAuthHeaders() }));
};
