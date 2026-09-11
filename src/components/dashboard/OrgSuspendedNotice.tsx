"use client";

import { useState } from "react";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { switchToOrganization, useMe } from "@/lib/useMe";
import { clearSession, roleLabel } from "@/lib/session";

/** Covers the dashboard while the current organization is suspended; offers the person's other organizations. */
export default function OrgSuspendedNotice() {
    const { me } = useMe();
    const [switchingTo, setSwitchingTo] = useState<string | null>(null);
    const [error, setError] = useState("");

    if (!me || me.organization?.status === "active") return null;

    const others = me.memberships.filter((m) => m.orgId !== me.organization.id && m.status === "active");

    const choose = async (orgId: string) => {
        setError("");
        setSwitchingTo(orgId);
        const failure = await switchToOrganization(orgId);
        if (failure) {
            setError(failure);
            setSwitchingTo(null);
        }
    };

    const signOut = () => {
        clearSession();
        window.location.href = "/login";
    };

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="org-suspended-title"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "rgba(3, 7, 18, 0.88)",
                backdropFilter: "blur(8px)",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "440px",
                    padding: "28px",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 165, 0, 0.3)",
                    background: "linear-gradient(135deg, rgba(5, 15, 30, 0.98) 0%, rgba(10, 20, 40, 0.98) 100%)",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
                }}
            >
                <div
                    style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(255, 165, 0, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "16px",
                    }}
                >
                    <ShieldAlert size={24} color="#FFA500" />
                </div>
                <h2 id="org-suspended-title" style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 8px" }}>
                    {me.organization.name} is suspended
                </h2>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255, 255, 255, 0.6)", margin: "0 0 20px" }}>
                    Calls, campaigns and everything else in this organization are paused. Contact Talkrix support to restore access.
                </p>

                {others.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", marginBottom: "8px" }}>
                            Continue in another organization
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {others.map((m) => (
                                <button
                                    key={m.orgId}
                                    type="button"
                                    disabled={!!switchingTo}
                                    onClick={() => choose(m.orgId)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "12px",
                                        padding: "12px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(0, 200, 255, 0.25)",
                                        background: "rgba(0, 200, 255, 0.06)",
                                        color: "white",
                                        fontSize: "14px",
                                        cursor: switchingTo ? "default" : "pointer",
                                        textAlign: "left",
                                    }}
                                >
                                    <span>
                                        {m.name}
                                        <span style={{ marginLeft: "8px", fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" }}>
                                            {roleLabel(m.role)}
                                        </span>
                                    </span>
                                    {switchingTo === m.orgId && (
                                        <Loader2 size={16} color="#00C8FF" style={{ animation: "spin 1s linear infinite" }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {error && (
                    <p role="alert" style={{ fontSize: "13px", color: "#FF3C64", margin: "0 0 12px" }}>
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={signOut}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 60, 100, 0.3)",
                        background: "rgba(255, 60, 100, 0.1)",
                        color: "#FF3C64",
                        fontSize: "14px",
                        cursor: "pointer",
                    }}
                >
                    <LogOut size={16} /> Sign out
                </button>
            </div>
        </div>
    );
}
