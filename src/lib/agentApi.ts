import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/agents`;

export interface PaginatedAgents {
  agents: any[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export const fetchAgentsByUser = async (userId: string, options?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const url = `${API_BASE}/user/${userId}${params.toString() ? '?' + params.toString() : ''}`;
  return safeApiCall(() => axios.get(url, { headers: getAuthHeaders() }));
};

export const createAgent = async (userId: string, agentData: any): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/ultravox/${userId}`, agentData, { headers: getAuthHeaders() })
  );
};

export const updateAgent = async (id: string, agentData: any): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.put(`${API_BASE}/${id}`, agentData, { headers: getAuthHeaders() })
  );
};

export const deleteAgent = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
  );
};

export const fetchVoices = async (search?: string): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  const url = `${API_BASE}/voices${params.toString() ? '?' + params.toString() : ''}`;
  return safeApiCall(() => axios.get(url, { headers: getAuthHeaders() }));
};

/**
 * Create a call to test an agent
 * Returns joinUrl that can be used with the Voice Client SDK
 */
export const createAgentCall = async (agentId: string, options?: {
  maxDuration?: string;
  recordingEnabled?: boolean;
  callType?: 'test' | 'inbound' | 'outbound';
  customerName?: string;
  customerPhone?: string;
}): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${agentId}/call`, options || {}, { headers: getAuthHeaders() })
  );
};

/**
 * End a call and update its status
 */
export const endAgentCall = async (
  agentId: string,
  callHistoryId: string,
  data: {
    status?: 'completed' | 'missed' | 'failed';
    durationSeconds?: number;
    recordingUrl?: string;
  }
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.put(
      `${API_BASE}/${agentId}/call/${callHistoryId}/end`,
      data,
      { headers: getAuthHeaders() }
    )
  );
};

/**
 * Create an outbound call with customer information
 */
export const createOutboundCall = async (
  agentId: string,
  data: {
    customerName?: string;
    customerPhone: string;
    maxDuration?: string;
    recordingEnabled?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${agentId}/outbound-call`, data, { headers: getAuthHeaders() })
  );
};
