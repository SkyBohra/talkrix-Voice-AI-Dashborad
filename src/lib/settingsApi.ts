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

// Types
export type TelephonyProvider = 'plivo' | 'twilio' | 'telnyx' | 'none';

export interface GeneralSettings {
  maxConcurrentCalls: number;
  maxRagDocuments: number;
  maxAgents: number;
}

export interface TelephonySettings {
  provider: TelephonyProvider;
  // Plivo
  plivoAuthId: string | null;
  plivoAuthToken: string | null;
  plivoPhoneNumbers: string[];
  plivoPhoneNumber?: string | null; // backwards compatibility
  // Twilio
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumbers: string[];
  twilioPhoneNumber?: string | null; // backwards compatibility
  // Telnyx
  telnyxApiKey: string | null;
  telnyxPhoneNumbers: string[];
  telnyxPhoneNumber?: string | null; // backwards compatibility
  telnyxConnectionId: string | null;
}

export interface UserSettings {
  general: GeneralSettings;
  telephony: TelephonySettings;
  apiKey: string | null;
  maxCorpusLimit: number;
}

/**
 * Get all user settings
 */
export const getSettings = async (): Promise<{ success: boolean; data?: UserSettings; error?: string }> => {
  try {
    const res = await axios.get(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    return normalizeResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Failed to fetch settings',
    };
  }
};

/**
 * Update general settings (maxConcurrentCalls, maxRagDocuments, maxAgents)
 */
export const updateGeneralSettings = async (
  settings: Partial<GeneralSettings>
): Promise<{ success: boolean; data?: GeneralSettings; error?: string }> => {
  try {
    const res = await axios.put(`${API_BASE}/settings/general`, settings, {
      headers: getAuthHeaders(),
    });
    return normalizeResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Failed to update general settings',
    };
  }
};

/**
 * Update telephony settings (provider credentials)
 */
export const updateTelephonySettings = async (
  settings: Partial<TelephonySettings>
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const res = await axios.put(`${API_BASE}/settings/telephony`, settings, {
      headers: getAuthHeaders(),
    });
    return normalizeResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Failed to update telephony settings',
    };
  }
};

/**
 * Regenerate API key
 */
export const regenerateApiKey = async (): Promise<{ success: boolean; data?: { apiKey: string }; error?: string }> => {
  try {
    const res = await axios.put(`${API_BASE}/settings/regenerate-api-key`, {}, {
      headers: getAuthHeaders(),
    });
    return normalizeResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Failed to regenerate API key',
    };
  }
};

/**
 * Get full API key
 */
export const getApiKey = async (): Promise<{ success: boolean; data?: { apiKey: string }; error?: string }> => {
  try {
    const res = await axios.get(`${API_BASE}/settings/api-key`, {
      headers: getAuthHeaders(),
    });
    return normalizeResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Failed to fetch API key',
    };
  }
};
