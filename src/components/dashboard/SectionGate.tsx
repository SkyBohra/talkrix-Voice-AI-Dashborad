"use client";

import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { usePermissions } from "@/lib/useMe";
import { roleLabel } from "@/lib/session";

// What each dashboard section needs. Sections not listed are open to every member.
export const SECTION_PERMISSIONS: Record<string, string> = {
    dashboard: "dashboard.read",
    campaign: "campaigns.read",
    "call-history": "calls.read",
    agents: "agents.read",
    voices: "agents.read",
    tools: "agents.read",
    rag: "knowledge.read",
    team: "members.read",
};

const SECTION_NAMES: Record<string, string> = {
    dashboard: "the dashboard",
    campaign: "campaigns",
    "call-history": "call history",
    agents: "agents",
    voices: "voices",
    tools: "tools",
    rag: "knowledge bases",
    team: "the team",
};

/**
 * Renders a section only for roles that may open it, so it never fires requests the server will
 * refuse. Decides on this page load's /auth/me (a role may have changed since last time); only if
 * that fails does it fall back to the permissions remembered in this browser.
 */
export default function SectionGate({ section, children }: { section: string; children: React.ReactNode }) {
    const { me, can, known, settled } = usePermissions();
    const permission = SECTION_PERMISSIONS[section];

    if (!me && !settled) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <Loader2 size={28} color="#00C8FF" style={{ animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    // A suspended organization gets a notice over the whole dashboard (see OrgSuspendedNotice)
    if (me && me.organization?.status !== "active") return null;

    if (!permission || !known) return <>{children}</>;

    if (!can(permission)) {
        const role = roleLabel(me?.role ?? (typeof window !== "undefined" ? localStorage.getItem("orgRole") : null));
        const orgName = me?.organization?.name;
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: "24px" }}>
                <div
                    style={{
                        maxWidth: "420px",
                        textAlign: "center",
                        padding: "32px",
                        borderRadius: "16px",
                        border: "1px solid rgba(0, 200, 255, 0.15)",
                        background: "rgba(255, 255, 255, 0.03)",
                    }}
                >
                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            margin: "0 auto 16px",
                            borderRadius: "12px",
                            background: "rgba(0, 200, 255, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Lock size={22} color="#00C8FF" />
                    </div>
                    <h2 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: "0 0 8px" }}>
                        You don&apos;t have access to {SECTION_NAMES[section] ?? "this page"}
                    </h2>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255, 255, 255, 0.55)", margin: "0 0 20px" }}>
                        {role
                            ? `Your role${orgName ? ` in ${orgName}` : ""} is ${role}, which doesn't include this.`
                            : "Your role doesn't include this."}{" "}
                        Ask an owner or admin if you need it.
                    </p>
                    <Link
                        href="/dashboard/team"
                        style={{
                            display: "inline-block",
                            padding: "10px 18px",
                            borderRadius: "10px",
                            border: "1px solid rgba(0, 200, 255, 0.3)",
                            color: "#00C8FF",
                            fontSize: "14px",
                            textDecoration: "none",
                        }}
                    >
                        See who can help
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
