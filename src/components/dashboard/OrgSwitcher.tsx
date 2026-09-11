"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Loader2, Users } from "lucide-react";
import { switchToOrganization, useMe } from "@/lib/useMe";
import { roleLabel } from "@/lib/session";

function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

function OrgAvatar({ name, size = 36, muted = false }: { name: string; size?: number; muted?: boolean }) {
    return (
        <div
            aria-hidden
            style={{
                width: size,
                height: size,
                borderRadius: size > 30 ? "10px" : "8px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size > 30 ? "13px" : "11px",
                fontWeight: 700,
                color: "white",
                background: muted
                    ? "rgba(255, 255, 255, 0.08)"
                    : "linear-gradient(135deg, rgba(0, 200, 255, 0.55) 0%, rgba(120, 0, 255, 0.55) 100%)",
                border: "1px solid rgba(0, 200, 255, 0.25)",
            }}
        >
            {initials(name)}
        </div>
    );
}

/** Current organization and role; lets people who belong to several organizations switch. */
export default function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
    const { me } = useMe();
    const [open, setOpen] = useState(false);
    const [switchingTo, setSwitchingTo] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [fallback, setFallback] = useState({ name: "", role: "" });
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFallback({
            name: localStorage.getItem("orgName") || "",
            role: localStorage.getItem("orgRole") || "",
        });
    }, []);

    useEffect(() => {
        if (!open) return;
        const onPointer = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const orgName = me?.organization?.name || fallback.name || "Your organization";
    const role = roleLabel(me?.role || fallback.role);
    const currentId = me?.organization?.id;
    const memberships = me?.memberships ?? [];

    const choose = async (orgId: string) => {
        if (orgId === currentId || switchingTo) return;
        setError("");
        setSwitchingTo(orgId);
        const failure = await switchToOrganization(orgId);
        if (failure) {
            setError(failure);
            setSwitchingTo(null);
        }
    };

    return (
        <div ref={ref} style={{ position: "relative", marginBottom: "20px", flexShrink: 0 }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                title={collapsed ? `${orgName}${role ? ` · ${role}` : ""}` : undefined}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: "10px",
                    padding: collapsed ? "8px" : "10px 12px",
                    borderRadius: "12px",
                    border: `1px solid ${open ? "rgba(0, 200, 255, 0.35)" : "rgba(0, 200, 255, 0.15)"}`,
                    background: open ? "rgba(0, 200, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                }}
            >
                <OrgAvatar name={orgName} />
                {!collapsed && (
                    <>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                                style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "white",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {orgName}
                            </span>
                            {role && (
                                <span style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginTop: "2px" }}>
                                    {role}
                                </span>
                            )}
                        </span>
                        <ChevronsUpDown size={16} color="rgba(255, 255, 255, 0.45)" style={{ flexShrink: 0 }} />
                    </>
                )}
            </button>

            {open && (
                <div
                    role="listbox"
                    style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        width: collapsed ? "260px" : "100%",
                        minWidth: "228px",
                        zIndex: 50,
                        padding: "6px",
                        borderRadius: "12px",
                        border: "1px solid rgba(0, 200, 255, 0.25)",
                        background: "rgba(8, 16, 32, 0.98)",
                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
                        backdropFilter: "blur(20px)",
                    }}
                >
                    <div
                        style={{
                            padding: "8px 10px 6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "rgba(255, 255, 255, 0.4)",
                        }}
                    >
                        {memberships.length > 1 ? "Switch organization" : "Organization"}
                    </div>
                    {memberships.length === 0 && (
                        <div style={{ padding: "8px 10px", fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>
                            {orgName}
                        </div>
                    )}
                    {memberships.map((m) => {
                        const current = m.orgId === currentId;
                        const unavailable = m.status !== "active" && !current;
                        return (
                            <button
                                key={m.orgId}
                                type="button"
                                role="option"
                                aria-selected={current}
                                disabled={unavailable || !!switchingTo}
                                onClick={() => choose(m.orgId)}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "8px 10px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: current ? "rgba(0, 200, 255, 0.1)" : "transparent",
                                    cursor: current || unavailable ? "default" : "pointer",
                                    opacity: unavailable ? 0.45 : 1,
                                    textAlign: "left",
                                }}
                                onMouseEnter={(e) => {
                                    if (!current && !unavailable) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    if (!current) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <OrgAvatar name={m.name} size={28} muted={!current} />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: "block",
                                            fontSize: "13px",
                                            color: "white",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {m.name}
                                    </span>
                                    <span style={{ display: "block", fontSize: "11px", color: "rgba(255, 255, 255, 0.45)" }}>
                                        {m.status === "active" ? roleLabel(m.role) : "Suspended"}
                                    </span>
                                </span>
                                {switchingTo === m.orgId ? (
                                    <Loader2 size={15} color="#00C8FF" style={{ animation: "spin 1s linear infinite" }} />
                                ) : current ? (
                                    <Check size={15} color="#00C8FF" />
                                ) : null}
                            </button>
                        );
                    })}
                    {error && (
                        <div style={{ padding: "6px 10px", fontSize: "12px", color: "#FF3C64" }} role="alert">
                            {error}
                        </div>
                    )}
                    <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)", margin: "6px 4px" }} />
                    <Link
                        href="/dashboard/team"
                        onClick={() => setOpen(false)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            color: "rgba(255, 255, 255, 0.75)",
                            textDecoration: "none",
                        }}
                    >
                        <Users size={15} color="#00C8FF" /> Team &amp; invitations
                    </Link>
                </div>
            )}
        </div>
    );
}
