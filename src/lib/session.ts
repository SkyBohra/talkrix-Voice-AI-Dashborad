// The signed-in person and their current organization, as remembered in the browser.
// Tokens name one organization; switching organizations swaps the token.

export type OrgRole = 'owner' | 'admin' | 'billing' | 'manager' | 'operator' | 'viewer';
export type Role = OrgRole | 'integration' | 'read_only';
export type OrgStatus = 'active' | 'suspended' | 'closed';

export interface Membership {
    orgId: string;
    name: string;
    slug?: string;
    status: OrgStatus;
    role: OrgRole;
}

/** What /auth/login, /auth/register, /auth/switch-org and invitation accept return. */
export interface SessionPayload {
    access_token: string;
    name?: string;
    email?: string;
    hasCompletedTour?: boolean;
    organization?: { id: string; name?: string };
    role?: Role | null;
    memberships?: Membership[];
}

const SESSION_KEYS = [
    'token',
    'userId',
    'userName',
    'userEmail',
    'orgId',
    'orgName',
    'orgRole',
    'orgPermissions',
];

export const ROLE_LABELS: Record<Role, string> = {
    owner: 'Owner',
    admin: 'Admin',
    billing: 'Billing',
    manager: 'Manager',
    operator: 'Operator',
    viewer: 'Viewer',
    integration: 'Integration',
    read_only: 'Read-only',
};

export function roleLabel(role?: string | null): string {
    return (role && ROLE_LABELS[role as Role]) || '';
}

export function tokenClaims(token: string | null): { sub?: string; org?: string; exp?: number } | null {
    if (!token) return null;
    try {
        const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(part));
    } catch {
        return null;
    }
}

/** A stored token that hasn't expired yet (doesn't prove the server still accepts it). */
export function hasLiveToken(): boolean {
    if (typeof window === 'undefined') return false;
    const claims = tokenClaims(localStorage.getItem('token'));
    return !!claims?.exp && claims.exp * 1000 > Date.now();
}

export function saveSession(data: SessionPayload) {
    localStorage.setItem('token', data.access_token);
    const claims = tokenClaims(data.access_token);
    if (claims?.sub) localStorage.setItem('userId', claims.sub);
    localStorage.setItem('userName', data.name || '');
    localStorage.setItem('userEmail', data.email || '');
    const orgId = data.organization?.id || claims?.org;
    if (orgId) localStorage.setItem('orgId', orgId);
    localStorage.setItem('orgName', data.organization?.name || '');
    if (data.role) localStorage.setItem('orgRole', data.role);
    else localStorage.removeItem('orgRole');
    // Permissions belong to the organization; they are re-read for the new one
    localStorage.removeItem('orgPermissions');
    resetMeCache();
}

export function clearSession() {
    if (typeof window === 'undefined') return;
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    resetMeCache();
}

// ---- /auth/me cache shared by every component on the page ----

type Listener = (value: unknown) => void;
let meCache: unknown = null;
const listeners = new Set<Listener>();

export function getCachedMe<T>(): T | null {
    return meCache as T | null;
}

export function setCachedMe(value: unknown) {
    meCache = value;
    listeners.forEach((listener) => listener(value));
}

export function subscribeMe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function resetMeCache() {
    meCache = null;
}
