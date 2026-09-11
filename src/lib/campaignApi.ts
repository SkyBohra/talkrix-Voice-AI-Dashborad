import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/campaigns`;

// Campaign interfaces
export interface CampaignContact {
  _id?: string;
  name: string;
  phoneNumber: string;
  callStatus: 'pending' | 'completed' | 'failed' | 'in-progress' | 'no-answer';
  callId?: string;
  calledAt?: string;
  callDuration?: number;
  callNotes?: string;
  endReason?: string; // e.g. "do_not_call", "invalid_number", "no_answer"
  attempts?: number; // calls made so far (retries included)
  nextAttemptAt?: string; // a pending contact is dialed once this has passed
  isLocked?: boolean; // When true, contact cannot be updated or deleted
}

export interface CampaignSchedule {
  scheduledDate: string;
  scheduledTime: string;
  endTime: string; // End time in HH:mm format (required)
  timezone: string;
}

export type RetryOutcome = 'no_answer' | 'busy' | 'failed';

// Call a contact again when a call doesn't connect
export interface CampaignRetry {
  maxAttempts: number; // total calls per contact, 1 = no retry
  retryAfterMinutes: number;
  retryOn: RetryOutcome[];
}

export interface ContactStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  noAnswer: number;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'scheduled' | 'paused-time-window';

export interface Campaign {
  _id: string;
  name: string;
  userId: string;
  type: 'outbound' | 'inbound' | 'ondemand';
  agentId: string;
  agentName?: string;
  status: CampaignStatus;
  pausedReason?: string | null; // "manual", "end-time-reached", or why dialing stopped
  contacts: CampaignContact[]; // the first 500 only; page through fetchCampaignContacts
  contactStats?: ContactStats;
  contactsTruncated?: boolean;
  schedule?: CampaignSchedule;
  retry?: CampaignRetry | null;
  maxLines?: number | null;
  description?: string;
  totalContacts: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  startedAt?: string;
  completedAt?: string;
  inboundPhoneNumber?: string;
  outboundProvider?: 'twilio' | 'plivo' | 'telnyx';
  outboundPhoneNumber?: string;
  apiTriggerEnabled?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignData {
  name: string;
  type: 'outbound' | 'inbound' | 'ondemand';
  agentId: string;
  description?: string;
  schedule?: CampaignSchedule;
  retry?: CampaignRetry;
  contacts?: { name: string; phoneNumber: string }[];
  outboundProvider?: 'twilio' | 'plivo' | 'telnyx';
  outboundPhoneNumber?: string;
  apiTriggerEnabled?: boolean;
}

export interface ContactsPage {
  contacts: CampaignContact[];
  total: number;
  page: number;
  totalPages: number;
}

// Lines are shared by every call of the organization (test calls, campaigns, API calls)
export interface OrgCallState {
  activeCalls: number;
  maxConcurrentCalls: number;
  activeCampaigns: string[];
}

export interface PaginatedCampaigns {
  campaigns: Campaign[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// Fetch all campaigns for current user with pagination
export const fetchCampaigns = async (options?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const url = `${API_BASE}${params.toString() ? '?' + params.toString() : ''}`;
  return safeApiCall(() => axios.get(url, { headers: getAuthHeaders() }));
};

// Fetch campaigns by user ID with pagination
export const fetchCampaignsByUser = async (userId: string, options?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const url = `${API_BASE}/user/${userId}${params.toString() ? '?' + params.toString() : ''}`;
  return safeApiCall(() => axios.get(url, { headers: getAuthHeaders() }));
};

// Fetch a single campaign by ID
export const fetchCampaign = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};

// Create a new campaign
export const createCampaign = async (campaignData: CreateCampaignData): Promise<ApiResponse> => {
  return safeApiCall(() => axios.post(API_BASE, campaignData, { headers: getAuthHeaders() }));
};

// Update a campaign
export const updateCampaign = async (id: string, campaignData: Partial<Campaign>): Promise<ApiResponse> => {
  return safeApiCall(() => axios.put(`${API_BASE}/${id}`, campaignData, { headers: getAuthHeaders() }));
};

// Update campaign status
export const updateCampaignStatus = async (
  id: string,
  status: Campaign['status']
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.put(`${API_BASE}/${id}/status`, { status }, { headers: getAuthHeaders() })
  );
};

// Delete a campaign
export const deleteCampaign = async (id: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() }));
};

// Get contacts for a campaign with pagination (search matches name or number)
export const fetchCampaignContacts = async (
  campaignId: string,
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<ApiResponse<ContactsPage>> => {
  return safeApiCall(() =>
    axios.get(`${API_BASE}/${campaignId}/contacts`, {
      headers: getAuthHeaders(),
      params: { page, limit, ...(search ? { search } : {}) },
    })
  );
};

// Lines in use across the organization
export const fetchOrgCallState = async (): Promise<ApiResponse<OrgCallState>> => {
  return safeApiCall(() => axios.get(`${API_BASE}/call-state`, { headers: getAuthHeaders() }));
};

// Add contacts to a campaign
export const addCampaignContacts = async (
  campaignId: string,
  contacts: { name: string; phoneNumber: string }[]
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${campaignId}/contacts`, { contacts }, { headers: getAuthHeaders() })
  );
};

// Update a single contact
export const updateCampaignContact = async (
  campaignId: string,
  contactId: string,
  contactData: Partial<CampaignContact>
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.put(`${API_BASE}/${campaignId}/contacts/${contactId}`, contactData, { headers: getAuthHeaders() })
  );
};

// Delete a contact from a campaign
export const deleteCampaignContact = async (
  campaignId: string,
  contactId: string
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.delete(`${API_BASE}/${campaignId}/contacts/${contactId}`, { headers: getAuthHeaders() })
  );
};

// Upload Excel file with contacts
export const uploadCampaignContacts = async (
  campaignId: string,
  file: File
): Promise<ApiResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return safeApiCall(() => 
    axios.post(`${API_BASE}/${campaignId}/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    })
  );
};

// Get campaign statistics
export const fetchCampaignStats = async (campaignId: string): Promise<ApiResponse> => {
  return safeApiCall(() => axios.get(`${API_BASE}/${campaignId}/stats`, { headers: getAuthHeaders() }));
};

// Update contact call status
export const updateContactCallStatus = async (
  campaignId: string,
  contactId: string,
  data: {
    callStatus: CampaignContact['callStatus'];
    callId?: string;
    callDuration?: number;
    callNotes?: string;
  }
): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.put(`${API_BASE}/${campaignId}/contacts/${contactId}/call-status`, data, { headers: getAuthHeaders() })
  );
};

// Trigger call result interface
export interface TriggerCallResult {
  contactId: string;
  contactName: string;
  phoneNumber: string;
  success: boolean;
  callId?: string;
  joinUrl?: string;
  error?: string;
  code?: string; // e.g. LINES_BUSY, DO_NOT_CALL, INVALID_NUMBER
}

export interface TriggerCallsResponse {
  results: TriggerCallResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// Trigger calls for on-demand campaign contacts
export const triggerCampaignCalls = async (
  campaignId: string,
  contactIds: string[]
): Promise<ApiResponse<TriggerCallsResponse>> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${campaignId}/trigger-calls`, { contactIds }, { headers: getAuthHeaders() })
  );
};

// Campaign state interface for real-time tracking
export interface CampaignState {
  campaignId: string;
  status: Campaign['status'];
  activeCalls: number; // the organization's lines in use (all its calls)
  maxConcurrentCalls: number;
  campaignActiveCalls: number; // this campaign's contacts on a call now
  isActive: boolean;
  contactStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number; // failed + no answer
  };
}

// Start a scheduled/draft outbound campaign immediately
export const startCampaign = async (campaignId: string): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${campaignId}/start`, {}, { headers: getAuthHeaders() })
  );
};

// Pause an active campaign
export const pauseCampaign = async (campaignId: string): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${campaignId}/pause`, {}, { headers: getAuthHeaders() })
  );
};

// Resume a paused campaign
export const resumeCampaign = async (campaignId: string): Promise<ApiResponse> => {
  return safeApiCall(() => 
    axios.post(`${API_BASE}/${campaignId}/resume`, {}, { headers: getAuthHeaders() })
  );
};

// Get real-time campaign state (active calls, etc.)
export const fetchCampaignState = async (campaignId: string): Promise<ApiResponse<CampaignState>> => {
  return safeApiCall(() => 
    axios.get(`${API_BASE}/${campaignId}/state`, { headers: getAuthHeaders() })
  );
};
