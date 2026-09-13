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

/** Where the value for one of an agent's {{placeholders}} comes from. */
export type AgentVariableSource = 'customer' | 'campaign' | 'automatic' | 'custom';

export interface AgentVariable {
  /** What a value is matched by, e.g. "loan_amount" */
  name: string;
  /** Every spelling of it in the prompt: "LOAN_AMOUNT", "loanAmount" */
  placeholders: string[];
  source: AgentVariableSource;
}

export interface AgentVariables {
  variables: AgentVariable[];
  /** Placeholders no value can ever fill, like {{2nd_line}} */
  unusable: string[];
}

/** The {{placeholders}} an agent's prompt uses, so a test call can ask for their values. */
export const fetchAgentVariables = async (agentId: string): Promise<ApiResponse<AgentVariables>> => {
  return safeApiCall(() =>
    axios.get(`${API_BASE}/${agentId}/variables`, { headers: getAuthHeaders() })
  );
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
  /** Values for the prompt's other {{placeholders}}, keyed by name: { loan_amount: "45000" } */
  metadata?: Record<string, string>;
}): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${agentId}/call`, options || {}, { headers: getAuthHeaders() })
  );
};

/**
 * Tell the server a test call has ended. Duration, status and summary come from Ultravox on the
 * server; the browser no longer reports them.
 */
export const endAgentCall = async (
  agentId: string,
  callHistoryId: string,
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.put(
      `${API_BASE}/${agentId}/call/${callHistoryId}/end`,
      {},
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
