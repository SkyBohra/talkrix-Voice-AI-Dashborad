"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, Crown, Link2, Loader2, LogOut, Mail, Pencil, UserPlus, Users, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { usePermissions } from "@/lib/useMe";
import { clearSession, roleLabel, saveSession, type OrgRole } from "@/lib/session";
import {
    changeMemberRole,
    getMembers,
    inviteMember,
    removeMember,
    renameOrganization,
    switchOrg,
    transferOwnership,
    withdrawInvitation,
    type Member,
    type PendingInvitation,
} from "@/lib/orgApi";

const INVITABLE_ROLES: OrgRole[] = ["admin", "manager", "operator", "viewer", "billing"];

const ROLE_SUMMARIES: Record<OrgRole, string> = {
    owner: "Everything, including transferring ownership.",
    admin: "Everything except transferring ownership: team, API keys, telephony and billing.",
    manager: "Builds agents, tools, knowledge bases and campaigns, and runs calls.",
    operator: "Runs campaigns and calls with the agents others have built.",
    viewer: "Read-only: dashboards, call history, agents and campaigns.",
    billing: "Usage, billing and invoices. Doesn't run calls or change agents.",
};

// Mirrors the server's role permissions (backend src/auth/permissions.ts)
const CAPABILITIES: { label: string; roles: OrgRole[] }[] = [
    { label: "See dashboards and call history", roles: ["owner", "admin", "billing", "manager", "operator", "viewer"] },
    { label: "Play call recordings", roles: ["owner", "admin", "manager", "operator"] },
    { label: "Run campaigns and calls", roles: ["owner", "admin", "manager", "operator"] },
    { label: "Build agents, tools and knowledge bases", roles: ["owner", "admin", "manager"] },
    { label: "Manage telephony and API keys", roles: ["owner", "admin"] },
    { label: "Billing and invoices", roles: ["owner", "admin", "billing"] },
    { label: "Invite and manage members", roles: ["owner", "admin"] },
    { label: "Transfer ownership", roles: ["owner"] },
];
const MATRIX_ROLES: OrgRole[] = ["owner", "admin", "manager", "operator", "viewer", "billing"];

const card: React.CSSProperties = {
    padding: "20px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(0, 200, 255, 0.15)",
    borderRadius: "12px",
};
const cardTitle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    color: "white",
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
};
const input: React.CSSProperties = {
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(0, 200, 255, 0.15)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
};
const select: React.CSSProperties = { ...input, background: "#0d1628", cursor: "pointer" };
const primaryButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "11px 18px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
};
const ghostButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 200, 255, 0.2)",
    background: "transparent",
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: "13px",
    cursor: "pointer",
    whiteSpace: "nowrap",
};
const dangerButton: React.CSSProperties = {
    ...ghostButton,
    border: "1px solid rgba(255, 60, 100, 0.3)",
    color: "#FF3C64",
};
const muted: React.CSSProperties = { fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" };

function timeAgo(value: string | null): string {
    if (!value) return "Never";
    const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function expiresIn(value: string): string {
    const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
    if (days <= 0) return "Expires today";
    return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function RoleBadge({ role }: { role: string }) {
    const owner = role === "owner";
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 500,
                color: owner ? "#FFC857" : "#00C8FF",
                background: owner ? "rgba(255, 200, 87, 0.1)" : "rgba(0, 200, 255, 0.08)",
                border: `1px solid ${owner ? "rgba(255, 200, 87, 0.3)" : "rgba(0, 200, 255, 0.2)"}`,
            }}
        >
            {owner && <Crown size={12} />}
            {roleLabel(role)}
        </span>
    );
}

export default function TeamSection() {
    const toast = useToast();
    const { me, can, refresh } = usePermissions();

    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<OrgRole>("operator");
    const [inviting, setInviting] = useState(false);
    const [lastInvite, setLastInvite] = useState<{ email: string; role: OrgRole; url: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState("");
    const [savingName, setSavingName] = useState(false);

    const [busy, setBusy] = useState<string | null>(null);
    const [showRoles, setShowRoles] = useState(false);

    const canManage = can("members.manage");
    const canTransfer = can("org.transfer");
    const canRename = can("org.update");
    const myUserId = me?.id ? String(me.id) : "";
    const orgName = me?.organization?.name ?? "";
    const maxSeats = me?.organization?.limits?.maxSeats ?? 0;
    const seatsUsed = members.filter((m) => m.status === "active").length + invitations.length;
    const seatsFull = maxSeats > 0 && seatsUsed >= maxSeats;

    const load = useCallback(async () => {
        const res = await getMembers();
        if (res.success && res.data) {
            setMembers(res.data.members);
            setInvitations(res.data.invitations);
            setLoadError("");
        } else {
            setLoadError(res.message || "Couldn't load the team.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const sortedMembers = useMemo(() => {
        const rank = (m: Member) => (m.role === "owner" ? 0 : m.userId === myUserId ? 1 : 2);
        return [...members].filter((m) => m.status === "active").sort((a, b) => rank(a) - rank(b));
    }, [members, myUserId]);

    const copyLink = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Couldn't copy", "Select the link and copy it by hand.");
        }
    };

    const sendInvite = async (email: string, role: OrgRole) => {
        const res = await inviteMember(email, role);
        if (!res.success || !res.data) {
            toast.error("Invitation not sent", res.message);
            return false;
        }
        setLastInvite({ email: res.data.invitation.email, role: res.data.invitation.role, url: res.data.inviteUrl });
        setCopied(false);
        await load();
        return true;
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setInviting(true);
        const ok = await sendInvite(inviteEmail.trim(), inviteRole);
        if (ok) setInviteEmail("");
        setInviting(false);
    };

    const handleNewLink = async (inv: PendingInvitation) => {
        setBusy(`link:${inv.id}`);
        const ok = await sendInvite(inv.email, inv.role);
        if (ok) toast.success("New link ready", "The previous link for this person no longer works.");
        setBusy(null);
    };

    const handleWithdraw = async (inv: PendingInvitation) => {
        if (!confirm(`Withdraw the invitation for ${inv.email}? Their link will stop working.`)) return;
        setBusy(`withdraw:${inv.id}`);
        const res = await withdrawInvitation(inv.id);
        if (res.success) {
            if (lastInvite?.email === inv.email) setLastInvite(null);
            await load();
        } else {
            toast.error("Couldn't withdraw", res.message);
        }
        setBusy(null);
    };

    const handleRoleChange = async (member: Member, role: OrgRole) => {
        if (role === member.role) return;
        setBusy(`role:${member.userId}`);
        const res = await changeMemberRole(member.userId, role);
        if (res.success) {
            toast.success("Role updated", `${member.name || member.email} is now ${roleLabel(role)}. It applies right away.`);
            await load();
        } else {
            toast.error("Role not changed", res.message);
        }
        setBusy(null);
    };

    const handleRemove = async (member: Member) => {
        const who = member.name || member.email;
        if (!confirm(`Remove ${who} from ${orgName}? They lose access immediately.`)) return;
        setBusy(`remove:${member.userId}`);
        const res = await removeMember(member.userId);
        if (res.success) {
            toast.success("Member removed", `${who} no longer has access.`);
            await load();
        } else {
            toast.error("Couldn't remove", res.message);
        }
        setBusy(null);
    };

    const handleTransfer = async (member: Member) => {
        const who = member.name || member.email;
        if (!confirm(`Make ${who} the owner of ${orgName}? You'll become an Admin, and only they can transfer ownership again.`)) return;
        setBusy(`transfer:${member.userId}`);
        const res = await transferOwnership(member.userId);
        if (res.success) {
            toast.success("Ownership transferred", `${who} is now the owner.`);
            await refresh();
            await load();
        } else {
            toast.error("Ownership not transferred", res.message);
        }
        setBusy(null);
    };

    const handleLeave = async () => {
        if (!me) return;
        if (!confirm(`Leave ${orgName}? You'll lose access to its agents, campaigns and calls.`)) return;
        setBusy("leave");
        const currentToken = localStorage.getItem("token") ?? undefined;
        const next = me.memberships.find((m) => m.orgId !== me.organization.id && m.status === "active");
        if (next) {
            // Get into another organization first: the current session ends the moment you leave
            const switched = await switchOrg(next.orgId);
            if (!switched.success || !switched.data) {
                toast.error("Couldn't leave", switched.message);
                setBusy(null);
                return;
            }
            const left = await removeMember(myUserId, currentToken);
            if (!left.success) {
                toast.error("Couldn't leave", left.message);
                setBusy(null);
                return;
            }
            saveSession(switched.data);
            window.location.href = "/dashboard";
            return;
        }
        const left = await removeMember(myUserId);
        if (!left.success) {
            toast.error("Couldn't leave", left.message);
            setBusy(null);
            return;
        }
        clearSession();
        window.location.href = "/login";
    };

    const saveName = async () => {
        const name = nameDraft.trim();
        if (!name || name === orgName) {
            setEditingName(false);
            return;
        }
        setSavingName(true);
        const res = await renameOrganization(name);
        if (res.success) {
            localStorage.setItem("orgName", name);
            await refresh();
            setEditingName(false);
        } else {
            toast.error("Name not saved", res.message);
        }
        setSavingName(false);
    };

    const myRole = me?.role ?? "";

    return (
        <div style={{ padding: "clamp(16px, 4vw, 40px)", width: "100%", boxSizing: "border-box" }}>
            <style>{`
                .team-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(120px, 1fr) minmax(100px, 0.9fr) 236px; gap: 16px; align-items: center; }
                .team-invite-form { display: flex; gap: 10px; flex-wrap: wrap; }
                .team-matrix th, .team-matrix td { padding: 8px 10px; text-align: center; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .team-matrix th:first-child, .team-matrix td:first-child { text-align: left; }
                @media (max-width: 760px) {
                    .team-row { grid-template-columns: 1fr; gap: 8px; }
                    .team-row-head { display: none !important; }
                }
            `}</style>

            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, color: "white", margin: "0 0 8px" }}>Team</h1>
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", margin: 0 }}>
                    Who works in {orgName || "this organization"}, and what each person can do.
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1040px" }}>
                {/* Organization */}
                <div style={{ ...card, display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                        <div style={muted}>Organization</div>
                        {editingName ? (
                            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                                <input
                                    autoFocus
                                    value={nameDraft}
                                    maxLength={120}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void saveName();
                                        if (e.key === "Escape") setEditingName(false);
                                    }}
                                    aria-label="Organization name"
                                    style={{ ...input, flex: "1 1 220px" }}
                                />
                                <button type="button" onClick={saveName} disabled={savingName} style={{ ...primaryButton, padding: "10px 14px" }}>
                                    {savingName ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={15} />} Save
                                </button>
                                <button type="button" onClick={() => setEditingName(false)} style={ghostButton} aria-label="Cancel">
                                    <X size={15} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "20px", fontWeight: 700, color: "white", overflowWrap: "anywhere" }}>{orgName || "—"}</span>
                                {canRename && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNameDraft(orgName);
                                            setEditingName(true);
                                        }}
                                        style={{ ...ghostButton, padding: "5px 10px", fontSize: "12px" }}
                                    >
                                        <Pencil size={13} /> Rename
                                    </button>
                                )}
                            </div>
                        )}
                        {myRole && (
                            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", ...muted }}>
                                Your role <RoleBadge role={myRole} />
                            </div>
                        )}
                    </div>
                    {maxSeats > 0 && (
                        <div style={{ flex: "0 1 240px", minWidth: "200px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", ...muted, marginBottom: "8px" }}>
                                <span>Seats</span>
                                <span style={{ color: seatsFull ? "#FFA500" : "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>
                                    {seatsUsed} of {maxSeats} used
                                </span>
                            </div>
                            <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
                                <div
                                    style={{
                                        width: `${Math.min(100, (seatsUsed / maxSeats) * 100)}%`,
                                        height: "100%",
                                        background: seatsFull ? "#FFA500" : "linear-gradient(90deg, #00C8FF, #7800FF)",
                                    }}
                                />
                            </div>
                            <div style={{ ...muted, marginTop: "6px" }}>Pending invitations count as seats.</div>
                        </div>
                    )}
                </div>

                {/* Invite */}
                {canManage && (
                    <div style={card}>
                        <h3 style={cardTitle}>
                            <UserPlus size={18} color="#00C8FF" /> Invite a teammate
                        </h3>
                        <form className="team-invite-form" onSubmit={handleInvite}>
                            <div style={{ position: "relative", flex: "2 1 260px" }}>
                                <Mail size={16} color="rgba(255,255,255,0.4)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    aria-label="Email address"
                                    disabled={seatsFull}
                                    style={{ ...input, width: "100%", paddingLeft: "36px" }}
                                />
                            </div>
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                                aria-label="Role"
                                disabled={seatsFull}
                                style={{ ...select, flex: "1 1 150px" }}
                            >
                                {INVITABLE_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                        {roleLabel(role)}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" disabled={inviting || seatsFull} style={{ ...primaryButton, opacity: inviting || seatsFull ? 0.6 : 1 }}>
                                {inviting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={16} />}
                                Create invite link
                            </button>
                        </form>
                        <p style={{ ...muted, margin: "10px 0 0" }}>
                            <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{roleLabel(inviteRole)}:</strong> {ROLE_SUMMARIES[inviteRole]}
                        </p>
                        {seatsFull && (
                            <p style={{ fontSize: "13px", color: "#FFA500", margin: "10px 0 0" }}>
                                All {maxSeats} seats are in use. Remove someone or withdraw an invitation, or contact Talkrix for more seats.
                            </p>
                        )}

                        {lastInvite && (
                            <div
                                style={{
                                    marginTop: "16px",
                                    padding: "14px 16px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(0, 255, 136, 0.25)",
                                    background: "rgba(0, 255, 136, 0.05)",
                                }}
                            >
                                <div style={{ fontSize: "13px", color: "white", marginBottom: "8px" }}>
                                    Invite link for <strong>{lastInvite.email}</strong> as {roleLabel(lastInvite.role)}
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <code
                                        style={{
                                            flex: "1 1 260px",
                                            minWidth: 0,
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            background: "rgba(0, 0, 0, 0.3)",
                                            color: "#7fe9ff",
                                            fontSize: "12px",
                                            overflowWrap: "anywhere",
                                        }}
                                    >
                                        {lastInvite.url}
                                    </code>
                                    <button type="button" onClick={() => copyLink(lastInvite.url)} style={{ ...ghostButton, color: copied ? "#00FF88" : ghostButton.color }}>
                                        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
                                    </button>
                                </div>
                                <div style={{ ...muted, marginTop: "8px", lineHeight: 1.5 }}>
                                    Talkrix doesn&apos;t email invitations yet, so send this link yourself. It works once, only for {lastInvite.email}, and expires in 7 days.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Members */}
                <div style={card}>
                    <h3 style={cardTitle}>
                        <Users size={18} color="#00C8FF" /> Members {sortedMembers.length > 0 && <span style={muted}>({sortedMembers.length})</span>}
                    </h3>
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                            <Loader2 size={22} color="#00C8FF" style={{ animation: "spin 1s linear infinite" }} />
                        </div>
                    ) : loadError ? (
                        <p style={{ fontSize: "14px", color: "#FF3C64", margin: 0 }}>{loadError}</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div className="team-row team-row-head" style={{ ...muted, padding: "0 4px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <span>Person</span>
                                <span>Role</span>
                                <span>Last active</span>
                                <span />
                            </div>
                            {sortedMembers.map((m) => {
                                const isMe = m.userId === myUserId;
                                const isOwner = m.role === "owner";
                                const editable = canManage && !isMe && !isOwner;
                                return (
                                    <div key={m.userId} className="team-row" style={{ padding: "14px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: "14px", color: "white", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                                <span style={{ overflowWrap: "anywhere" }}>{m.name || m.email}</span>
                                                {isMe && <span style={{ ...muted, color: "#00C8FF" }}>You</span>}
                                            </div>
                                            {m.name && <div style={{ ...muted, overflowWrap: "anywhere", marginTop: "2px" }}>{m.email}</div>}
                                        </div>
                                        <div>
                                            {editable ? (
                                                <select
                                                    value={m.role}
                                                    disabled={busy === `role:${m.userId}`}
                                                    onChange={(e) => handleRoleChange(m, e.target.value as OrgRole)}
                                                    aria-label={`Role for ${m.name || m.email}`}
                                                    style={{ ...select, padding: "7px 10px", fontSize: "13px" }}
                                                >
                                                    {INVITABLE_ROLES.map((role) => (
                                                        <option key={role} value={role}>
                                                            {roleLabel(role)}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <RoleBadge role={m.role} />
                                            )}
                                        </div>
                                        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{timeAgo(m.lastLoginAt)}</div>
                                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                            {canTransfer && !isMe && !isOwner && (
                                                <button type="button" onClick={() => handleTransfer(m)} disabled={!!busy} style={ghostButton}>
                                                    {busy === `transfer:${m.userId}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Crown size={14} />} Make owner
                                                </button>
                                            )}
                                            {editable && (
                                                <button type="button" onClick={() => handleRemove(m)} disabled={!!busy} style={dangerButton}>
                                                    {busy === `remove:${m.userId}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <X size={14} />} Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pending invitations */}
                {!loading && invitations.length > 0 && (
                    <div style={card}>
                        <h3 style={cardTitle}>
                            <Link2 size={18} color="#00C8FF" /> Pending invitations <span style={muted}>({invitations.length})</span>
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {invitations.map((inv) => (
                                <div key={inv.id} className="team-row" style={{ padding: "12px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                    <div style={{ fontSize: "14px", color: "white", overflowWrap: "anywhere" }}>{inv.email}</div>
                                    <div>
                                        <RoleBadge role={inv.role} />
                                    </div>
                                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{expiresIn(inv.expiresAt)}</div>
                                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                        {canManage && (
                                            <>
                                                <button type="button" onClick={() => handleNewLink(inv)} disabled={!!busy} style={ghostButton} title="Replaces the old link">
                                                    {busy === `link:${inv.id}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={14} />} New link
                                                </button>
                                                <button type="button" onClick={() => handleWithdraw(inv)} disabled={!!busy} style={dangerButton}>
                                                    {busy === `withdraw:${inv.id}` ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <X size={14} />} Withdraw
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Roles */}
                <div style={card}>
                    <button
                        type="button"
                        onClick={() => setShowRoles((v) => !v)}
                        aria-expanded={showRoles}
                        style={{ ...cardTitle, margin: 0, width: "100%", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                        <span>What can each role do?</span>
                        <ChevronDown size={18} color="rgba(255,255,255,0.5)" style={{ transform: showRoles ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </button>
                    {showRoles && (
                        <div style={{ overflowX: "auto", marginTop: "16px" }}>
                            <table className="team-matrix" style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
                                <thead>
                                    <tr style={{ color: "rgba(255,255,255,0.5)" }}>
                                        <th style={{ fontWeight: 500 }} />
                                        {MATRIX_ROLES.map((role) => (
                                            <th key={role} style={{ fontWeight: 500, color: role === myRole ? "#00C8FF" : undefined }}>
                                                {roleLabel(role)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {CAPABILITIES.map((capability) => (
                                        <tr key={capability.label} style={{ color: "rgba(255,255,255,0.8)" }}>
                                            <td>{capability.label}</td>
                                            {MATRIX_ROLES.map((role) => (
                                                <td key={role}>
                                                    {capability.roles.includes(role) ? (
                                                        <Check size={15} color="#00C8FF" aria-label="Yes" />
                                                    ) : (
                                                        <span style={{ color: "rgba(255,255,255,0.2)" }} aria-label="No">
                                                            –
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Leave */}
                {me && myRole !== "owner" && me.via === "jwt" && (
                    <div style={{ ...card, borderColor: "rgba(255, 60, 100, 0.2)", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontSize: "14px", color: "white" }}>Leave {orgName}</div>
                            <div style={{ ...muted, marginTop: "4px" }}>You&apos;ll need a new invitation to come back.</div>
                        </div>
                        <button type="button" onClick={handleLeave} disabled={!!busy} style={dangerButton}>
                            {busy === "leave" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <LogOut size={14} />} Leave organization
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
