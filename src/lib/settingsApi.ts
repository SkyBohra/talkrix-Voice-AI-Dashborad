import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Types
export type TelephonyProvider = 'plivo' | 'twilio' | 'telnyx' | 'none';

// The organization's limits; set by Talkrix, read-only here
export interface GeneralSettings {
  maxConcurrentCalls: number;
  maxRagDocuments: number;
  maxAgents: number;
  maxCorpora: number;
  maxSeats: number;
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
  telnyxPublicKey?: string | null; // verifies Telnyx call-status webhooks
}

export interface UserSettings {
  general: GeneralSettings;
  telephony: TelephonySettings;
  apiKey: string | null; // newest key's prefix only; keys are managed under /org/api-keys
  maxCorpusLimit: number;
}

/**
 * Get all user settings
 */
export const getSettings = async (): Promise<ApiResponse<UserSettings>> => {
  return safeApiCall(() => axios.get(`${API_BASE}/settings`, { headers: getAuthHeaders() }));
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
