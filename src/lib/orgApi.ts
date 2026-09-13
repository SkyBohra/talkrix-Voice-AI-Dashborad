import axios from 'axios';
import { getAuthHeaders, safeApiCall, extractErrorMessage, normalizeResponse, ApiResponse } from './apiHelper';
import type { Membership, OrgRole, OrgStatus, Role, SessionPayload } from './session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export type LimitKey = 'maxConcurrentCalls' | 'maxAgents' | 'maxSeats' | 'maxCorpora' | 'maxRagDocuments';

export type EffectiveLimits = Record<LimitKey, number> & {
    overridden: Partial<Record<LimitKey, boolean>>;
};

export interface OrgSummary {
    id: string;
    name: string;
    slug: string;
    status: OrgStatus;
    ownerUserId: string | null;
    limits: EffectiveLimits;
    seats: { used: number; max: number };
}

export interface Me {
    id: string;
    email: string;
    name: string;
    hasCompletedTour: boolean;
    via: 'jwt' | 'api_key';
    role: Role;
    permissions: string[];
    organization: OrgSummary;
    memberships: Membership[];
    maxCorpusLimit: number;
}

export interface Member {
    userId: string;
    name: string;
    email: string;
    role: OrgRole;
    status: string;
    joinedAt: string;
    lastLoginAt: string | null;
}

/** Whether an invitation reached the person's inbox; null for ones sent before email was set up. */
export type InvitationDelivery = 'sent' | 'failed' | 'not_configured';

export interface PendingInvitation {
    id: string;
    email: string;
    role: OrgRole;
    expiresAt: string;
    invitedBy: string;
    createdAt: string;
    delivery: InvitationDelivery | null;
    emailedAt: string | null;
}

export interface InvitationPreview {
    orgName: string;
    email: string;
    role: OrgRole;
    status: 'pending' | 'accepted' | 'revoked' | 'expired';
    /** Revoked because a newer invitation was sent to the same person, whose link is the one to use */
    replaced?: boolean;
}

export type ApiKeyRole = 'integration' | 'read_only';

export interface ApiKeyInfo {
    id: string;
    name: string;
    prefix: string;
    role: ApiKeyRole;
    createdBy: string;
    createdAt: string;
    lastUsedAt: string | null;
}

// ---- Session ----

export const getMe = async (): Promise<ApiResponse<Me>> =>
    safeApiCall(() => axios.get(`${API_BASE}/auth/me`, { headers: getAuthHeaders() }));

export const switchOrg = async (orgId: string): Promise<ApiResponse<SessionPayload>> =>
    safeApiCall(() => axios.post(`${API_BASE}/auth/switch-org`, { orgId }, { headers: getAuthHeaders() }));

export const logoutEverywhere = async (): Promise<ApiResponse> =>
    safeApiCall(() => axios.post(`${API_BASE}/auth/logout-everywhere`, {}, { headers: getAuthHeaders() }));

// ---- Invitations (the invite link) ----

/** Works signed out: what an invite link is for. */
export const previewInvitation = async (token: string): Promise<ApiResponse<InvitationPreview>> => {
    try {
        const response = await axios.get(`${API_BASE}/auth/invitations/${encodeURIComponent(token)}`);
        return normalizeResponse<InvitationPreview>(response);
    } catch (error) {
        const message = extractErrorMessage(error);
        return { success: false, data: null, message, error: message };
    }
};

export const acceptInvitation = async (token: string): Promise<ApiResponse<SessionPayload>> =>
    safeApiCall(() =>
        axios.post(`${API_BASE}/auth/invitations/${encodeURIComponent(token)}/accept`, {}, { headers: getAuthHeaders() }),
    );

// ---- Organization ----

export const getOrganization = async (): Promise<ApiResponse<OrgSummary>> =>
    safeApiCall(() => axios.get(`${API_BASE}/org`, { headers: getAuthHeaders() }));

export const renameOrganization = async (name: string): Promise<ApiResponse<{ id: string; name: string }>> =>
    safeApiCall(() => axios.patch(`${API_BASE}/org`, { name }, { headers: getAuthHeaders() }));

export const getMembers = async (): Promise<ApiResponse<{ members: Member[]; invitations: PendingInvitation[] }>> =>
    safeApiCall(() => axios.get(`${API_BASE}/org/members`, { headers: getAuthHeaders() }));

export const inviteMember = async (
    email: string,
    role: OrgRole,
): Promise<ApiResponse<{ invitation: { id: string; email: string; role: OrgRole; expiresAt: string }; inviteUrl: string; delivery: InvitationDelivery }>> =>
    safeApiCall(() => axios.post(`${API_BASE}/org/invitations`, { email, role }, { headers: getAuthHeaders() }));

export const withdrawInvitation = async (id: string): Promise<ApiResponse> =>
    safeApiCall(() => axios.delete(`${API_BASE}/org/invitations/${id}`, { headers: getAuthHeaders() }));

export const changeMemberRole = async (userId: string, role: OrgRole): Promise<ApiResponse<{ userId: string; role: OrgRole }>> =>
    safeApiCall(() => axios.patch(`${API_BASE}/org/members/${userId}`, { role }, { headers: getAuthHeaders() }));

/** Remove a member, or leave the organization when userId is your own. */
export const removeMember = async (userId: string, token?: string): Promise<ApiResponse> =>
    safeApiCall(() =>
        axios.delete(`${API_BASE}/org/members/${userId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : getAuthHeaders(),
        }),
    );

export const transferOwnership = async (userId: string): Promise<ApiResponse> =>
    safeApiCall(() => axios.post(`${API_BASE}/org/transfer-ownership`, { userId }, { headers: getAuthHeaders() }));

// ---- API keys ----

export const listApiKeys = async (): Promise<ApiResponse<ApiKeyInfo[]>> =>
    safeApiCall(() => axios.get(`${API_BASE}/org/api-keys`, { headers: getAuthHeaders() }));

/** The full key is in the response exactly once. */
export const createApiKey = async (name: string, role: ApiKeyRole): Promise<ApiResponse<{ key: string; apiKey: ApiKeyInfo }>> =>
    safeApiCall(() => axios.post(`${API_BASE}/org/api-keys`, { name, role }, { headers: getAuthHeaders() }));

export const revokeApiKey = async (id: string): Promise<ApiResponse> =>
    safeApiCall(() => axios.delete(`${API_BASE}/org/api-keys/${id}`, { headers: getAuthHeaders() }));
