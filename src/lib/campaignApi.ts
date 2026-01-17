import axios from 'axios';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/campaigns`;

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
}

export interface CampaignSchedule {
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
}

export interface Campaign {
  _id: string;
  name: string;
  userId: string;
  type: 'outbound' | 'inbound' | 'ondemand';
  agentId: string;
  agentName?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';
  contacts: CampaignContact[];
  schedule?: CampaignSchedule;
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
  contacts?: { name: string; phoneNumber: string }[];
  outboundProvider?: 'twilio' | 'plivo' | 'telnyx';
  outboundPhoneNumber?: string;
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
}) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const url = `${API_BASE}${params.toString() ? '?' + params.toString() : ''}`;
  const res = await axios.get(url, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

// Fetch campaigns by user ID with pagination
export const fetchCampaignsByUser = async (userId: string, options?: {
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const url = `${API_BASE}/user/${userId}${params.toString() ? '?' + params.toString() : ''}`;
  const res = await axios.get(url, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

// Fetch a single campaign by ID
export const fetchCampaign = async (id: string) => {
  const res = await axios.get(`${API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

// Create a new campaign
export const createCampaign = async (campaignData: CreateCampaignData) => {
  const res = await axios.post(API_BASE, campaignData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

// Update a campaign
export const updateCampaign = async (id: string, campaignData: Partial<Campaign>) => {
  const res = await axios.put(`${API_BASE}/${id}`, campaignData, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

// Update campaign status
export const updateCampaignStatus = async (
  id: string,
  status: Campaign['status']
) => {
  const res = await axios.put(
    `${API_BASE}/${id}/status`,
    { status },
    {
      headers: getAuthHeaders(),
    }
  );
  return normalizeResponse(res);
};

// Delete a campaign
export const deleteCampaign = async (id: string) => {
  const res = await axios.delete(`${API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
};

// Get contacts for a campaign with pagination
export const fetchCampaignContacts = async (
  campaignId: string,
  page: number = 1,
  limit: number = 50
) => {
  const res = await axios.get(`${API_BASE}/${campaignId}/contacts`, {
    headers: getAuthHeaders(),
    params: { page, limit },
  });
  return normalizeResponse(res);
};

// Add contacts to a campaign
export const addCampaignContacts = async (
  campaignId: string,
  contacts: { name: string; phoneNumber: string }[]
) => {
  const res = await axios.post(
    `${API_BASE}/${campaignId}/contacts`,
    { contacts },
    {
      headers: getAuthHeaders(),
    }
  );
  return normalizeResponse(res);
};

// Update a single contact
export const updateCampaignContact = async (
  campaignId: string,
  contactId: string,
  contactData: Partial<CampaignContact>
) => {
  const res = await axios.put(
    `${API_BASE}/${campaignId}/contacts/${contactId}`,
    contactData,
    {
      headers: getAuthHeaders(),
    }
  );
  return normalizeResponse(res);
};

// Delete a contact from a campaign
export const deleteCampaignContact = async (
  campaignId: string,
  contactId: string
) => {
  const res = await axios.delete(
    `${API_BASE}/${campaignId}/contacts/${contactId}`,
    {
      headers: getAuthHeaders(),
    }
  );
  return normalizeResponse(res);
};

// Upload Excel file with contacts
export const uploadCampaignContacts = async (
  campaignId: string,
  file: File
) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axios.post(`${API_BASE}/${campaignId}/upload`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    },
  });
  return normalizeResponse(res);
};

// Get campaign statistics
export const fetchCampaignStats = async (campaignId: string) => {
  const res = await axios.get(`${API_BASE}/${campaignId}/stats`, {
    headers: getAuthHeaders(),
  });
  return normalizeResponse(res);
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
) => {
  const res = await axios.put(
    `${API_BASE}/${campaignId}/contacts/${contactId}/call-status`,
    data,
    {
      headers: getAuthHeaders(),
    }
  );
  return normalizeResponse(res);
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
): Promise<{ success: boolean; data?: TriggerCallsResponse; message?: string; error?: string }> => {
  try {
    const res = await axios.post(
      `${API_BASE}/${campaignId}/trigger-calls`,
      { contactIds },
      {
        headers: getAuthHeaders(),
      }
    );
    return normalizeResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Failed to trigger calls',
    };
  }
};
