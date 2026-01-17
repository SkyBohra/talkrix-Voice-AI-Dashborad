import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/call-history`;

export interface CallHistoryRecord {
  _id: string;
  agentId: string;
  userId: string;
  talkrixCallId: string;
  callType: 'test' | 'inbound' | 'outbound';
  status: 'initiated' | 'in-progress' | 'completed' | 'missed' | 'failed';
  agentName: string;
  customerName?: string;
  customerPhone?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds: number;
  billedDuration?: string;
  billingStatus?: string;
  summary?: string;
  shortSummary?: string;
  endReason?: 'unjoined' | 'hangup' | 'agent_hangup' | 'timeout' | 'connection_error' | 'system_error';
  recordingEnabled: boolean;
  recordingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallStats {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  failedCalls: number;
  averageDurationSeconds: number;
}

export interface PaginatedCallHistory {
  calls: CallHistoryRecord[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Fetch all call history for the current user
 */
export const fetchCallHistory = async (options?: {
  page?: number;
  limit?: number;
  status?: string;
  callType?: string;
  agentId?: string;
}): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.status) params.append('status', options.status);
  if (options?.callType) params.append('callType', options.callType);
  if (options?.agentId) params.append('agentId', options.agentId);

  const url = `${API_BASE}${params.toString() ? '?' + params.toString() : ''}`;
  return safeApiCall(() => axios.get(url, { headers: getAuthHeaders() }));
};

/**
 * Fetch call statistics for the current user
 */
export const fetchCallStats = async (): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/stats`, { headers: getAuthHeaders() }));
};

/**
 * Fetch call history for a specific agent
 */
export const fetchAgentCallHistory = async (
  agentId: string,
  options?: { page?: number; limit?: number }
): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const url = `${API_BASE}/agent/${agentId}${params.toString() ? '?' + params.toString() : ''}`;
  return safeApiCall(() => axios.get(url, { headers: getAuthHeaders() }));
};

/**
 * Fetch call statistics for a specific agent
 */
export const fetchAgentCallStats = async (agentId: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/agent/${agentId}/stats`, { headers: getAuthHeaders() }));
};

/**
 * Get a single call history record
 */
export const fetchCallHistoryById = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};

/**
 * Update a call history record
 */
export const updateCallHistory = async (
  id: string,
  data: {
    status?: string;
    durationSeconds?: number;
    recordingUrl?: string;
  }
): Promise<ApiResponse> => {
  return safeApiCall(() => axios.put(`${API_BASE}/${id}`, data, { headers: getAuthHeaders() }));
};

/**
 * Delete a call history record
 */
export const deleteCallHistory = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};

/**
 * End a call and update its status
 */
export const endCall = async (
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
      `${process.env.NEXT_PUBLIC_API_URL}/agents/${agentId}/call/${callHistoryId}/end`,
      data,
      { headers: getAuthHeaders() }
    )
  );
};

/**
 * Format duration in seconds to mm:ss format
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format date for display
 */
export const formatCallDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date with time only
 */
export const formatCallTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/**
 * Get the best date to display for a call (startedAt > createdAt)
 */
export const getCallDisplayDate = (call: CallHistoryRecord): string => {
  // Use startedAt if available (when call actually started), otherwise fall back to createdAt
  return call.startedAt || call.createdAt;
};
