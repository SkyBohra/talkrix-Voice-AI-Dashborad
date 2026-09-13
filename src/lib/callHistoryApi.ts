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

export interface TranscriptLine {
  speaker: 'agent' | 'customer';
  text: string;
  /** Seconds from the start of the call */
  startSec: number | null;
  endSec: number | null;
}

export interface CallTranscript {
  lines: TranscriptLine[];
  available: boolean;
  /** Why there is nothing to show, in words */
  reason: string | null;
}

/**
 * Who said what on a call. Read from the voice platform when asked, so it can take a moment.
 */
export const fetchCallTranscript = async (id: string): Promise<ApiResponse<CallTranscript>> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${id}/transcript`, { headers: getAuthHeaders() }));
};

/**
 * A call's recording, as a URL the page's own <audio> element can play.
 *
 * An <audio src> cannot send the sign-in token, so the audio is fetched with it and handed to the
 * player as a local object URL. Revoke it (URL.revokeObjectURL) when the player goes away.
 */
export const fetchCallRecording = async (
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string; status: number }> => {
  try {
    const res = await fetch(`${API_BASE}/${id}/recording`, {
      headers: getAuthHeaders() as Record<string, string>,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      return {
        ok: false,
        status: res.status,
        message:
          res.status === 403
            ? "Your role can't play recordings. Ask your organization's admin."
            : body?.message || 'The recording could not be loaded.',
      };
    }
    return { ok: true, url: URL.createObjectURL(await res.blob()) };
  } catch {
    return { ok: false, status: 0, message: "Can't reach Talkrix. Check your connection and try again." };
  }
};

/** 83.4 → "1:23" */
export const formatOffset = (sec: number | null): string => {
  if (sec === null || !Number.isFinite(sec)) return '';
  const whole = Math.floor(sec);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
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
    customerName?: string;
    customerPhone?: string;
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
 * Tell the server a call has ended. Duration and status come from Ultravox on the server.
 */
export const endCall = async (
  agentId: string,
  callHistoryId: string,
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.put(
      `${process.env.NEXT_PUBLIC_API_URL}/agents/${agentId}/call/${callHistoryId}/end`,
      {},
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
