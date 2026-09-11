"use client";

import { useCallback, useEffect, useState } from "react";
import { getMe, switchOrg, type Me } from "./orgApi";
import { getCachedMe, saveSession, setCachedMe, subscribeMe } from "./session";

let inflight: Promise<Me | null> | null = null;
let fetchedAt = 0;
// Moving between pages re-checks the role at most this often
const ME_MAX_AGE_MS = 60_000;

/** Fetches /auth/me and shares the answer with every component; re-fetched when older than a minute. */
export function loadMe(force = false): Promise<Me | null> {
    const cached = getCachedMe<Me>();
    if (cached && !force && Date.now() - fetchedAt < ME_MAX_AGE_MS) return Promise.resolve(cached);
    if (inflight && !force) return inflight;

    const request = getMe()
        .then((res) => {
            const me = res.success && res.data ? res.data : null;
            if (me) {
                localStorage.setItem("orgPermissions", JSON.stringify(me.permissions));
                localStorage.setItem("orgRole", me.role);
                localStorage.setItem("orgName", me.organization?.name ?? "");
                fetchedAt = Date.now();
                setCachedMe(me);
            }
            return me;
        })
        .finally(() => {
            if (inflight === request) inflight = null;
        });
    inflight = request;
    return request;
}

export function useMe() {
    const [me, setMe] = useState<Me | null>(() => getCachedMe<Me>());
    // True once /auth/me has answered (or failed) for this page load
    const [settled, setSettled] = useState(() => getCachedMe<Me>() !== null);

    useEffect(() => {
        const unsubscribe = subscribeMe((value) => setMe(value as Me | null));
        if (localStorage.getItem("token")) {
            void loadMe().then((value) => {
                if (value) setMe(value);
                setSettled(true);
            });
        } else {
            setSettled(true);
        }
        return unsubscribe;
    }, []);

    const refresh = useCallback(() => loadMe(true), []);
    return { me, refresh, settled };
}

function storedPermissions(): string[] | null {
    try {
        const raw = localStorage.getItem("orgPermissions");
        return raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
        return null;
    }
}

/**
 * What the signed-in person may do in the current organization. The server enforces every
 * permission; this only decides what to show. Until /auth/me answers, the last known
 * permissions (from this browser) are used.
 */
export function usePermissions() {
    const { me, refresh, settled } = useMe();
    const [stored, setStored] = useState<string[] | null>(null);

    useEffect(() => {
        setStored(storedPermissions());
    }, []);

    const permissions = me?.permissions ?? stored;
    const can = useCallback((permission: string) => !!permissions?.includes(permission), [permissions]);
    return { me, can, known: permissions !== null, settled, refresh };
}

/** Swap the session for one in another organization and start over on its dashboard. */
export async function switchToOrganization(orgId: string): Promise<string | null> {
    const res = await switchOrg(orgId);
    if (!res.success || !res.data) return res.message || "Could not switch organization";
    saveSession(res.data);
    window.location.href = "/dashboard";
    return null;
}
