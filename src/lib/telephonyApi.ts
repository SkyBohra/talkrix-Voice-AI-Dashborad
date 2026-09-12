import axios from 'axios';
import { getAuthHeaders, safeApiCall, ApiResponse } from './apiHelper';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/org/telephony`;

export type Provider = 'twilio' | 'plivo' | 'telnyx';

export interface ProviderField {
    key: string;
    label: string;
    hint?: string;
    secret: boolean;
    required: boolean;
}

export interface ProviderInfo {
    provider: Provider;
    name: string;
    fields: ProviderField[];
}

export interface Connection {
    id: string;
    provider: Provider;
    name: string;
    label?: string;
    accountId?: string;
    accountName?: string;
    status: 'active' | 'invalid' | 'disabled';
    lastVerifiedAt?: string;
    verifyError?: string;
    meta: Record<string, string>;
    createdAt?: string;
}

export interface OrgNumber {
    id: string;
    provider: Provider;
    e164: string;
    label?: string;
    inboundAgentId: string | null;
    inboundAgentName: string | null;
    outboundEnabled: boolean;
    status: string;
    webhook: { configured: boolean; configuredAt?: string; error?: string };
}

export interface AvailableNumber {
    e164: string;
    providerId: string;
    label?: string;
    voice: boolean;
    imported: boolean;
}

export const fetchConnections = async (): Promise<
    ApiResponse<{ connections: Connection[]; providers: ProviderInfo[] }>
> => safeApiCall(() => axios.get(`${API_BASE}/connections`, { headers: getAuthHeaders() }));

export const connectProvider = async (body: {
    provider: Provider;
    accountId?: string;
    secret: string;
    meta?: Record<string, string>;
}): Promise<ApiResponse<Connection>> =>
    safeApiCall(() => axios.post(`${API_BASE}/connections`, body, { headers: getAuthHeaders() }));

export const verifyConnection = async (provider: Provider): Promise<ApiResponse<Connection>> =>
    safeApiCall(() =>
        axios.post(`${API_BASE}/connections/${provider}/verify`, {}, { headers: getAuthHeaders() }),
    );

export const disconnectProvider = async (provider: Provider): Promise<ApiResponse<null>> =>
    safeApiCall(() => axios.delete(`${API_BASE}/connections/${provider}`, { headers: getAuthHeaders() }));

export const fetchNumbers = async (): Promise<ApiResponse<{ numbers: OrgNumber[] }>> =>
    safeApiCall(() => axios.get(`${API_BASE}/numbers`, { headers: getAuthHeaders() }));

export const fetchAvailableNumbers = async (
    provider: Provider,
): Promise<ApiResponse<{ numbers: AvailableNumber[] }>> =>
    safeApiCall(() =>
        axios.get(`${API_BASE}/numbers/available`, { headers: getAuthHeaders(), params: { provider } }),
    );

export const importNumbers = async (
    provider: Provider,
    numbers: string[],
): Promise<ApiResponse<{ imported: OrgNumber[]; failed: { e164: string; reason: string }[] }>> =>
    safeApiCall(() =>
        axios.post(`${API_BASE}/numbers`, { provider, numbers }, { headers: getAuthHeaders() }),
    );

export const updateNumber = async (
    id: string,
    patch: { inboundAgentId?: string | null; outboundEnabled?: boolean; label?: string },
): Promise<ApiResponse<OrgNumber>> =>
    safeApiCall(() => axios.patch(`${API_BASE}/numbers/${id}`, patch, { headers: getAuthHeaders() }));

export const releaseNumber = async (id: string): Promise<ApiResponse<null>> =>
    safeApiCall(() => axios.delete(`${API_BASE}/numbers/${id}`, { headers: getAuthHeaders() }));
