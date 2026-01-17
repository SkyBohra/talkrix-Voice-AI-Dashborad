import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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
export const getSettings = async (): Promise<ApiResponse<UserSettings>> => {
  return safeApiCall(() => axios.get(`${API_BASE}/settings`, { headers: getAuthHeaders() }));
};

/**
 * Update general settings (maxConcurrentCalls, maxRagDocuments, maxAgents)
 */
export const updateGeneralSettings = async (
  settings: Partial<GeneralSettings>
): Promise<ApiResponse<GeneralSettings>> => {
  return safeApiCall(() => axios.put(`${API_BASE}/settings/general`, settings, { headers: getAuthHeaders() }));
};

/**
 * Update telephony settings (provider credentials)
 */
export const updateTelephonySettings = async (
  settings: Partial<TelephonySettings>
): Promise<ApiResponse> => {
  return safeApiCall(() => axios.put(`${API_BASE}/settings/telephony`, settings, { headers: getAuthHeaders() }));
};

/**
 * Regenerate API key
 */
export const regenerateApiKey = async (): Promise<ApiResponse<{ apiKey: string }>> => {
  return safeApiCall(() => axios.put(`${API_BASE}/settings/regenerate-api-key`, {}, { headers: getAuthHeaders() }));
};

/**
 * Get full API key
 */
export const getApiKey = async (): Promise<ApiResponse<{ apiKey: string }>> => {
  return safeApiCall(() => axios.get(`${API_BASE}/settings/api-key`, { headers: getAuthHeaders() }));
};

/**
 * Phone number with provider info
 */
export interface PhoneNumberOption {
  provider: TelephonyProvider;
  phoneNumber: string;
  isConfigured: boolean;
}

export interface AvailablePhoneNumbers {
  phoneNumbers: PhoneNumberOption[];
  configuredProviders: TelephonyProvider[];
  totalNumbers: number;
  autoSelect: PhoneNumberOption | null;
}

/**
 * Get available phone numbers for outbound calls
 */
export const getAvailablePhoneNumbers = async (): Promise<ApiResponse<AvailablePhoneNumbers>> => {
  return safeApiCall(() => axios.get(`${API_BASE}/settings/phone-numbers`, { headers: getAuthHeaders() }));
};
