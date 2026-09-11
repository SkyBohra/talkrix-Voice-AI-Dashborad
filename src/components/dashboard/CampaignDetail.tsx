"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Users, Plus, Upload, Edit, Trash2, Phone, CheckCircle, XCircle, Clock, Search,
    Loader, PhoneOutgoing, PhoneIncoming, Zap, Calendar, Globe, Save, X, AlertCircle, PhoneMissed,
    Code, Copy, Check, Play, Pause, RotateCcw, Repeat, Lock, Activity,
} from "lucide-react";
import {
    Campaign, CampaignContact, CampaignState, fetchCampaign, fetchCampaignState, fetchCampaignContacts,
    addCampaignContacts, updateCampaignContact, deleteCampaignContact, uploadCampaignContacts,
    triggerCampaignCalls, startCampaign, pauseCampaign, resumeCampaign, updateContactCallStatus,
} from "@/lib/campaignApi";
import {
    campaignStatusColor, campaignStatusLabel, CONTACT_STATUS_LABELS, endReasonLabel, pausedReasonText,
    retrySummary,
} from "@/lib/campaignStatus";
import { usePermissions } from "@/lib/useMe";
import { useToast } from "@/components/ui/toast";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 50;
// While calls are running, lines, counts and contacts refresh this often
const LIVE_POLL_MS = 4000;

const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", whiteSpace: "nowrap" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalStyle: React.CSSProperties = { background: "#1a1a2e", border: "1px solid rgba(0, 200, 255, 0.2)", borderRadius: "16px", padding: "32px", maxWidth: "450px", width: "90%", boxSizing: "border-box" };
const primaryButton: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap" };
const outlineButton: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.3)", background: "transparent", color: "#00C8FF", cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap" };
const ghostButton: React.CSSProperties = { flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "white", cursor: "pointer" };
const rowIconButton = (color: string, border: string): React.CSSProperties => ({ width: "32px", height: "32px", borderRadius: "6px", border: `1px solid ${border}`, background: "transparent", color, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 });

const CALLABLE = new Set(["pending", "failed", "no-answer"]);

function statusIcon(status: string) {
    switch (status) {
        case "completed": return <CheckCircle size={14} style={{ color: "#22c55e" }} />;
        case "failed": return <XCircle size={14} style={{ color: "#FF3C64" }} />;
        case "in-progress": return <Loader size={14} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />;
        case "no-answer": return <PhoneMissed size={14} style={{ color: "#fbbf24" }} />;
        default: return <Clock size={14} style={{ color: "rgba(255, 255, 255, 0.5)" }} />;
    }
}

function statusStyle(status: string) {
    switch (status) {
        case "completed": return { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "rgba(34, 197, 94, 0.3)" };
        case "failed": return { bg: "rgba(255, 60, 100, 0.15)", color: "#FF3C64", border: "rgba(255, 60, 100, 0.3)" };
        case "in-progress": return { bg: "rgba(0, 200, 255, 0.15)", color: "#00C8FF", border: "rgba(0, 200, 255, 0.3)" };
        case "no-answer": return { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" };
        default: return { bg: "rgba(255, 255, 255, 0.1)", color: "rgba(255, 255, 255, 0.6)", border: "rgba(255, 255, 255, 0.2)" };
    }
}

function typeColors(type: Campaign["type"]) {
    if (type === "outbound") return { bg: "rgba(0, 200, 255, 0.15)", color: "#00C8FF" };
    if (type === "inbound") return { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e" };
    return { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" };
}

function formatDuration(seconds?: number) {
    if (!seconds) return "-";
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function callingHours(schedule: NonNullable<Campaign["schedule"]>) {
    return schedule.scheduledTime === schedule.endTime ? "All day" : `${schedule.scheduledTime}–${schedule.endTime}`;
}

export default function CampaignDetail({ campaignId }: { campaignId: string }) {
    const router = useRouter();
    const toast = useToast();
    const { can } = usePermissions();
    const canRun = can("campaigns.run");
    const canEditContacts = can("contacts.write");

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [live, setLive] = useState<CampaignState | null>(null);
    const [controlBusy, setControlBusy] = useState(false);

    const [contacts, setContacts] = useState<CampaignContact[]>([]);
    const [contactsTotal, setContactsTotal] = useState(0);
    const [contactsPages, setContactsPages] = useState(1);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [contactsLoading, setContactsLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newContact, setNewContact] = useState({ name: "", phoneNumber: "" });
    const [editingContact, setEditingContact] = useState<CampaignContact | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<CampaignContact | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [triggering, setTriggering] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const apiTriggerUrl = `${process.env.NEXT_PUBLIC_API_URL || ""}/campaigns/${campaignId}/generate-instant-call`;

    // Latest page and search, for refreshes that aren't caused by paging or searching
    const view = useRef({ page: 1, search: "" });
    useEffect(() => {
        view.current = { page, search };
    }, [page, search]);

    const loadCampaign = useCallback(async () => {
        const res = await fetchCampaign(campaignId);
        if (res.success && res.data) setCampaign(res.data);
        return res.success;
    }, [campaignId]);

    const loadLive = useCallback(async () => {
        const res = await fetchCampaignState(campaignId);
        if (res.success && res.data) setLive(res.data);
        return res.success ? res.data : null;
    }, [campaignId]);

    const loadContacts = useCallback(async (p: number, s: string, quiet = false) => {
        if (!quiet) setContactsLoading(true);
        const res = await fetchCampaignContacts(campaignId, p, PAGE_SIZE, s || undefined);
        if (res.success && res.data) {
            setContacts(res.data.contacts);
            setContactsTotal(res.data.total);
            setContactsPages(Math.max(res.data.totalPages, 1));
        }
        if (!quiet) setContactsLoading(false);
    }, [campaignId]);

    const reloadContacts = useCallback(
        () => loadContacts(view.current.page, view.current.search, true),
        [loadContacts],
    );

    const refreshAll = useCallback(async () => {
        await Promise.all([loadCampaign(), loadLive(), reloadContacts()]);
    }, [loadCampaign, loadLive, reloadContacts]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.all([loadCampaign(), loadLive()]);
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [loadCampaign, loadLive]);

    // Debounced search; a new search starts from the first page
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        setSelected(new Set());
        void loadContacts(page, search);
    }, [page, search, loadContacts]);

    // Live refresh while the campaign is dialing or calls are still in progress
    const running = campaign?.status === "active" || (live?.contactStats.inProgress ?? 0) > 0;
    const campaignStatus = campaign?.status;
    useEffect(() => {
        if (!running) return;
        const timer = setInterval(async () => {
            const state = await loadLive();
            await reloadContacts();
            // The campaign finished, or its calling hours ended
            if (state && state.status !== campaignStatus) await loadCampaign();
        }, LIVE_POLL_MS);
        return () => clearInterval(timer);
    }, [running, campaignStatus, loadLive, reloadContacts, loadCampaign]);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        } catch {
            toast.error("Could not copy", "Copy the URL by hand.");
        }
    };

    const handleControl = async (action: "start" | "pause" | "resume") => {
        setControlBusy(true);
        const call = action === "start" ? startCampaign : action === "pause" ? pauseCampaign : resumeCampaign;
        const res = await call(campaignId);
        if (res.success) {
            toast.success(
                action === "pause" ? "Campaign paused" : "Campaign running",
                action === "pause" ? "Calls already in progress finish normally." : "Contacts are dialed as lines free up.",
            );
        } else {
            toast.error(action === "pause" ? "Could not pause" : "Could not start", res.message);
        }
        await refreshAll();
        setControlBusy(false);
    };

    const handleTriggerCalls = async () => {
        if (!campaign?.outboundProvider || !campaign?.outboundPhoneNumber) {
            toast.error("No outbound number", "Choose an outbound phone number for this campaign first.");
            return;
        }
        setTriggering(true);
        const res = await triggerCampaignCalls(campaignId, Array.from(selected));
        if (res.success && res.data) {
            const { results, summary } = res.data;
            const busy = results.filter((r) => r.code === "LINES_BUSY" || r.code === "PLATFORM_BUSY").length;
            const otherFailure = results.find((r) => !r.success && r.code !== "LINES_BUSY" && r.code !== "PLATFORM_BUSY");
            if (summary.failed === 0) {
                toast.success(`${summary.success} call${summary.success === 1 ? "" : "s"} started`);
            } else if (busy > 0) {
                toast.warning(
                    `${summary.success} started, ${busy} waiting for a line`,
                    "Every line is busy. Call the rest when a call ends.",
                );
            } else {
                toast.warning(`${summary.success} started, ${summary.failed} not called`, otherFailure?.error);
            }
            setSelected(new Set());
        } else {
            toast.error("Could not start calls", res.message);
        }
        await refreshAll();
        setTriggering(false);
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await addCampaignContacts(campaignId, [newContact]);
        setSaving(false);
        if (!res.success) {
            toast.error("Contact not added", res.message);
            return;
        }
        setNewContact({ name: "", phoneNumber: "" });
        setShowAddModal(false);
        toast.success("Contact added");
        await refreshAll();
    };

    const handleEditContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingContact?._id) return;
        setSaving(true);
        const res = await updateCampaignContact(campaignId, editingContact._id, {
            name: editingContact.name,
            phoneNumber: editingContact.phoneNumber,
        });
        setSaving(false);
        if (!res.success) {
            toast.error("Contact not saved", res.message);
            return;
        }
        setEditingContact(null);
        await reloadContacts();
    };

    const handleDeleteContact = async (contact: CampaignContact) => {
        const res = await deleteCampaignContact(campaignId, contact._id!);
        setDeleteConfirm(null);
        if (!res.success) {
            toast.error("Contact not deleted", res.message);
            return;
        }
        await refreshAll();
    };

    const handleCallAgain = async (contact: CampaignContact) => {
        const res = await updateContactCallStatus(campaignId, contact._id!, { callStatus: "pending" });
        if (!res.success) {
            toast.error("Could not queue the contact", res.message);
            return;
        }
        toast.success(
            `${contact.name} is queued again`,
            campaign?.status === "active" ? "They're called as soon as a line is free." : "They're called when the campaign runs.",
        );
        await refreshAll();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (!file) return;
        if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
            toast.error("Unsupported file", "Upload an Excel (.xlsx, .xls) or CSV file.");
            return;
        }
        setUploading(true);
        const res = await uploadCampaignContacts(campaignId, file);
        setUploading(false);
        if (!res.success) {
            toast.error("Upload failed", res.message);
            return;
        }
        const { importedCount, invalidCount } = res.data;
        toast.success(
            `${importedCount} contact${importedCount === 1 ? "" : "s"} imported`,
            invalidCount ? `${invalidCount} skipped: their numbers couldn't be read. Include the country code.` : undefined,
        );
        setPage(1);
        await refreshAll();
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <Loader size={32} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <AlertCircle size={48} style={{ color: "#FF3C64", marginBottom: "16px" }} />
                <h2 style={{ color: "white", marginBottom: "8px" }}>Campaign not found</h2>
                <button onClick={() => router.push("/dashboard/campaign")} style={{ ...primaryButton, padding: "12px 24px" }}>
                    Back to Campaigns
                </button>
            </div>
        );
    }

    const colors = typeColors(campaign.type);
    const dials = campaign.type === "outbound" || campaign.type === "ondemand";
    // Counts: live while running, otherwise from the campaign
    const counts = live?.contactStats ?? (campaign.contactStats
        ? { ...campaign.contactStats, failed: campaign.contactStats.failed + campaign.contactStats.noAnswer }
        : { total: campaign.totalContacts, pending: 0, inProgress: 0, completed: campaign.successfulCalls, failed: campaign.failedCalls });
    const finished = counts.completed + counts.failed;
    const successRate = finished > 0 ? Math.round((counts.completed / finished) * 100) : 0;
    const linesInUse = live?.activeCalls ?? 0;
    const lineLimit = live?.maxConcurrentCalls ?? 0;

    const selectable = contacts.filter((c) => c._id && CALLABLE.has(c.callStatus));
    const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c._id!));
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((c) => c._id!)));
    const toggleOne = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    // What the campaign is doing, in one sentence
    let notice: { tone: "info" | "warn"; text: string } | null = null;
    const hours = campaign.schedule ? `${callingHours(campaign.schedule)}, ${campaign.schedule.timezone}` : "";
    const pausedReason = pausedReasonText(campaign.status, campaign.pausedReason);
    if (campaign.type === "outbound") {
        if (campaign.status === "draft") {
            notice = { tone: "warn", text: counts.total === 0 ? "Add contacts to schedule this campaign. It starts dialing when its calling hours begin." : "This campaign is a draft. Start it to begin dialing." };
        } else if (campaign.status === "scheduled" && campaign.schedule) {
            notice = { tone: "info", text: `Starts on ${new Date(campaign.schedule.scheduledDate).toLocaleDateString()} (${hours}).${canRun ? " Use Start now to begin right away." : ""}` };
        } else if (campaign.status === "paused-time-window") {
            notice = { tone: "info", text: `Outside today's calling hours (${hours}). Dialing continues when they begin again${canRun ? ", or Resume to keep calling now" : ""}.` };
        } else if (campaign.status === "paused") {
            notice = pausedReason
                ? { tone: "warn", text: `Dialing stopped: ${pausedReason}${canRun ? " Fix it, then Resume." : ""}` }
                : { tone: "info", text: "Paused. Calls already in progress finish normally." };
        }
    }

    return (
        <div style={{ padding: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}>
            {/* Back Button & Header */}
            <div style={{ marginBottom: "24px" }}>
                <button onClick={() => router.push("/dashboard/campaign")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "rgba(255, 255, 255, 0.7)", cursor: "pointer", marginBottom: "20px" }}>
                    <ArrowLeft size={18} />Back to Campaigns
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                        <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.color, flexShrink: 0 }}>
                            {campaign.type === "outbound" ? <PhoneOutgoing size={18} /> : campaign.type === "inbound" ? <PhoneIncoming size={18} /> : <Zap size={18} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h1 style={{ fontSize: "26px", fontWeight: 700, color: "white", margin: "0 0 4px", overflowWrap: "anywhere" }}>{campaign.name}</h1>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: `${campaignStatusColor(campaign.status)}22`, color: campaignStatusColor(campaign.status), fontWeight: 600 }}>
                                    {campaignStatusLabel(campaign.status)}
                                </span>
                                <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: colors.bg, color: colors.color, textTransform: "capitalize" }}>{campaign.type}</span>
                                <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>Agent: {campaign.agentName || "Not assigned"}</span>
                                {dials && campaign.outboundPhoneNumber && (
                                    <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: "rgba(120, 0, 255, 0.15)", color: "#a855f7", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Phone size={12} />
                                        {campaign.outboundPhoneNumber} ({campaign.outboundProvider})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {campaign.type === "outbound" && canRun && campaign.status !== "completed" && (
                        <div style={{ display: "flex", gap: "10px" }}>
                            {campaign.status === "active" ? (
                                <button onClick={() => handleControl("pause")} disabled={controlBusy} style={{ ...outlineButton, borderColor: "rgba(239, 68, 68, 0.4)", color: "#F87171" }}>
                                    {controlBusy ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Pause size={16} />}
                                    Pause
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleControl(campaign.status === "paused" || campaign.status === "paused-time-window" ? "resume" : "start")}
                                    disabled={controlBusy || counts.pending === 0}
                                    title={counts.pending === 0 ? "No contacts are waiting to be called" : undefined}
                                    style={{ ...primaryButton, opacity: controlBusy || counts.pending === 0 ? 0.5 : 1, cursor: controlBusy || counts.pending === 0 ? "not-allowed" : "pointer" }}
                                >
                                    {controlBusy ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={16} />}
                                    {campaign.status === "paused" || campaign.status === "paused-time-window" ? "Resume" : "Start now"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {notice && (
                <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "12px", display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", lineHeight: 1.5, background: notice.tone === "warn" ? "rgba(251, 191, 36, 0.08)" : "rgba(0, 200, 255, 0.05)", border: `1px solid ${notice.tone === "warn" ? "rgba(251, 191, 36, 0.3)" : "rgba(0, 200, 255, 0.15)"}`, color: notice.tone === "warn" ? "#fbbf24" : "rgba(255, 255, 255, 0.75)" }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span>{notice.text}</span>
                </div>
            )}

            {/* Lines: shared by every call of the organization */}
            {dials && live && (
                <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(0, 200, 255, 0.15)", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Activity size={16} style={{ color: running ? "#22c55e" : "rgba(255, 255, 255, 0.4)" }} />
                        <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}>Lines in use</span>
                        <span style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>{linesInUse} / {lineLimit}</span>
                    </div>
                    <div style={{ display: "flex", gap: "4px", flex: "1 1 120px", maxWidth: "240px" }} aria-hidden>
                        {Array.from({ length: Math.min(lineLimit, 20) }, (_, i) => (
                            <div key={i} style={{ flex: 1, height: "8px", borderRadius: "2px", background: i < Math.round((linesInUse / Math.max(lineLimit, 1)) * Math.min(lineLimit, 20)) ? "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)" : "rgba(255, 255, 255, 0.1)" }} />
                        ))}
                    </div>
                    <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}>
                        On a call from this campaign: <strong style={{ color: "white" }}>{live.campaignActiveCalls}</strong>
                    </span>
                    <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "12px" }}>
                        All your calls share {lineLimit} line{lineLimit === 1 ? "" : "s"}; more contacts wait for a free one.
                    </span>
                </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                {[
                    { label: "Total Contacts", value: counts.total, icon: <Users size={18} /> },
                    { label: "Pending", value: counts.pending, icon: <Clock size={18} /> },
                    { label: "On a Call", value: counts.inProgress, icon: <Phone size={18} />, color: "#00C8FF" },
                    { label: "Completed", value: counts.completed, icon: <CheckCircle size={18} />, color: "#22c55e" },
                    { label: "Failed / No Answer", value: counts.failed, icon: <XCircle size={18} />, color: "#FF3C64" },
                    { label: "Success Rate", value: `${successRate}%`, icon: <CheckCircle size={18} />, color: "#a855f7" },
                ].map((stat) => (
                    <div key={stat.label} style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "12px", padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: stat.color || "rgba(255, 255, 255, 0.5)" }}>{stat.icon}</div>
                        <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", margin: "0 0 2px" }}>{stat.label}</p>
                        <p style={{ fontSize: "20px", fontWeight: 700, color: stat.color || "white", margin: 0 }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Schedule and retries (outbound) */}
            {campaign.type === "outbound" && campaign.schedule && (
                <div style={{ marginBottom: "24px", padding: "16px 20px", background: "rgba(0, 200, 255, 0.05)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px 24px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Calendar size={16} style={{ color: "#00C8FF" }} /><span style={{ color: "rgba(255, 255, 255, 0.7)" }}>From {new Date(campaign.schedule.scheduledDate).toLocaleDateString()}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={16} style={{ color: "#00C8FF" }} /><span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Calling hours: {callingHours(campaign.schedule)}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Globe size={16} style={{ color: "#00C8FF" }} /><span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{campaign.schedule.timezone}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Repeat size={16} style={{ color: "#00C8FF" }} /><span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{retrySummary(campaign.retry)}</span></div>
                </div>
            )}

            {/* API Integration Info */}
            {campaign.apiTriggerEnabled && dials && (
                <div style={{ marginBottom: "24px", padding: "20px", background: "rgba(120, 0, 255, 0.05)", border: "1px solid rgba(120, 0, 255, 0.2)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                        <Code size={18} style={{ color: "#a855f7" }} />
                        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#a855f7", margin: 0 }}>API Integration Enabled</h3>
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "16px" }}>
                        Use this endpoint to add a contact and call them right away. With every line busy it answers 429 with a Retry-After header.
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 280px", minWidth: 0, display: "flex", alignItems: "center", gap: "8px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "8px", padding: "12px 16px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                            <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "11px", background: "rgba(34, 197, 94, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>POST</span>
                            <code style={{ color: "#E5E7EB", fontSize: "13px", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apiTriggerUrl}</code>
                        </div>
                        <button onClick={() => copyToClipboard(apiTriggerUrl)} style={{ ...primaryButton, padding: "12px 20px", background: copiedUrl ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" : "linear-gradient(135deg, #7800FF 0%, #a855f7 100%)" }}>
                            {copiedUrl ? <><Check size={16} />Copied!</> : <><Copy size={16} />Copy URL</>}
                        </button>
                    </div>
                    <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "12px" }}>
                        Header: <code style={{ color: "#a855f7" }}>x-api-key: YOUR_API_KEY</code> &nbsp;|&nbsp;
                        Body: <code style={{ color: "#a855f7" }}>{`{"name": "...", "phoneNumber": "+91..."}`}</code>
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginTop: "8px" }}>
                        Create API keys in{" "}
                        <span onClick={() => router.push("/dashboard/settings?tab=limits")} style={{ color: "#a855f7", cursor: "pointer", textDecoration: "underline" }}>
                            Settings → Limits &amp; API
                        </span>
                    </p>
                </div>
            )}

            {/* Contacts Section */}
            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "16px", padding: "clamp(16px, 3vw, 24px)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: 0 }}>Contacts ({search ? contactsTotal : counts.total})</h2>
                        {selected.size > 0 && (
                            <span style={{ fontSize: "13px", color: "#00C8FF", background: "rgba(0, 200, 255, 0.1)", padding: "4px 12px", borderRadius: "20px" }}>{selected.size} selected</span>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ position: "relative" }}>
                            <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255, 255, 255, 0.4)" }} />
                            <input type="text" placeholder="Search name or number" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ ...inputStyle, padding: "10px 12px 10px 40px", width: "220px" }} />
                        </div>
                        {campaign.type === "ondemand" && canRun && (
                            <button onClick={handleTriggerCalls} disabled={triggering || selected.size === 0} style={{ ...primaryButton, background: selected.size === 0 ? "rgba(251, 191, 36, 0.3)" : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: selected.size === 0 ? "rgba(255, 255, 255, 0.5)" : "#000", cursor: selected.size === 0 ? "not-allowed" : "pointer" }}>
                                {triggering ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={16} />}
                                Call {selected.size > 1 ? `${selected.size} contacts` : "now"}
                            </button>
                        )}
                        {canEditContacts && (
                            <>
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={outlineButton}>
                                    {uploading ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
                                    Upload Excel
                                </button>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
                                <button onClick={() => setShowAddModal(true)} style={primaryButton}>
                                    <Plus size={16} />Add Contact
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {contacts.length > 0 ? (
                    <>
                        <div style={{ overflowX: "auto", opacity: contactsLoading ? 0.5 : 1, transition: "opacity 0.15s" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                        {campaign.type === "ondemand" && canRun && (
                                            <th style={{ width: "48px", padding: "12px 16px", textAlign: "center" }}>
                                                <input type="checkbox" aria-label="Select every callable contact on this page" checked={allSelected} disabled={selectable.length === 0} onChange={toggleAll} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#00C8FF" }} />
                                            </th>
                                        )}
                                        <th style={thStyle}>Name</th>
                                        <th style={thStyle}>Phone Number</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Called At</th>
                                        <th style={thStyle}>Duration</th>
                                        {canEditContacts && <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.map((contact) => {
                                        const style = statusStyle(contact.callStatus);
                                        const reason = contact.callStatus === "failed" || contact.callStatus === "no-answer" ? endReasonLabel(contact.endReason) : null;
                                        // A retry waiting for its turn
                                        const nextTry = contact.callStatus === "pending" && contact.nextAttemptAt && new Date(contact.nextAttemptAt).getTime() > Date.now()
                                            ? `Next call ${new Date(contact.nextAttemptAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                                            : null;
                                        const busy = contact.callStatus === "in-progress";
                                        const id = contact._id || "";
                                        return (
                                            <tr key={id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", background: selected.has(id) ? "rgba(0, 200, 255, 0.05)" : "transparent" }}>
                                                {campaign.type === "ondemand" && canRun && (
                                                    <td style={{ width: "48px", padding: "16px", textAlign: "center" }}>
                                                        <input type="checkbox" aria-label={`Select ${contact.name}`} checked={selected.has(id)} disabled={!CALLABLE.has(contact.callStatus)} onChange={() => toggleOne(id)} style={{ width: "18px", height: "18px", cursor: CALLABLE.has(contact.callStatus) ? "pointer" : "not-allowed", accentColor: "#00C8FF" }} />
                                                    </td>
                                                )}
                                                <td style={{ padding: "16px", color: "white", fontWeight: 500 }}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                                        {contact.name}
                                                        {contact.isLocked && (
                                                            <span title="Added by an API call; it can't be edited or deleted" style={{ display: "inline-flex" }}>
                                                                <Lock size={12} style={{ color: "rgba(255, 255, 255, 0.35)" }} />
                                                            </span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "16px", color: "rgba(255, 255, 255, 0.7)", whiteSpace: "nowrap" }}>{contact.phoneNumber}</td>
                                                <td style={{ padding: "16px" }}>
                                                    <span title={contact.callNotes || undefined} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", background: style.bg, color: style.color, border: `1px solid ${style.border}`, whiteSpace: "nowrap" }}>
                                                        {statusIcon(contact.callStatus)}{CONTACT_STATUS_LABELS[contact.callStatus] ?? contact.callStatus}
                                                    </span>
                                                    {(reason || nextTry || (contact.attempts ?? 0) > 1) && (
                                                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", marginTop: "6px", whiteSpace: "nowrap" }}>
                                                            {[reason, nextTry, (contact.attempts ?? 0) > 1 ? `${contact.attempts} calls` : null].filter(Boolean).join(" · ")}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "16px", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px", whiteSpace: "nowrap" }}>
                                                    {contact.calledAt ? new Date(contact.calledAt).toLocaleString() : "-"}
                                                </td>
                                                <td style={{ padding: "16px", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>{formatDuration(contact.callDuration)}</td>
                                                {canEditContacts && (
                                                    <td style={{ padding: "16px", textAlign: "right" }}>
                                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                                            {campaign.type === "outbound" && (contact.callStatus === "failed" || contact.callStatus === "no-answer") && (
                                                                <button onClick={() => handleCallAgain(contact)} style={rowIconButton("#00C8FF", "rgba(0, 200, 255, 0.3)")} title="Call again" aria-label={`Call ${contact.name} again`}>
                                                                    <RotateCcw size={14} />
                                                                </button>
                                                            )}
                                                            {!contact.isLocked && !busy && (
                                                                <>
                                                                    <button onClick={() => setEditingContact({ ...contact })} style={rowIconButton("rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0.2)")} title="Edit" aria-label={`Edit ${contact.name}`}>
                                                                        <Edit size={14} />
                                                                    </button>
                                                                    <button onClick={() => setDeleteConfirm(contact)} style={rowIconButton("#FF3C64", "rgba(255, 60, 100, 0.3)")} title="Delete" aria-label={`Delete ${contact.name}`}>
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={page} totalPages={contactsPages} totalItems={contactsTotal} itemsPerPage={PAGE_SIZE} onPageChange={setPage} itemLabel="contacts" />
                    </>
                ) : contactsLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px" }}>
                        <Loader size={24} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                        <Users size={48} style={{ color: "rgba(0, 200, 255, 0.3)", marginBottom: "16px" }} />
                        <h3 style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>{search ? "No contacts found" : "No contacts yet"}</h3>
                        <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "20px" }}>
                            {search ? "Try a different name or number" : canEditContacts ? "Add contacts one by one or upload an Excel file with name and phone columns" : "Contacts added to this campaign appear here"}
                        </p>
                        {!search && canEditContacts && (
                            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                                <button onClick={() => fileInputRef.current?.click()} style={{ ...outlineButton, padding: "12px 20px" }}><Upload size={16} />Upload Excel</button>
                                <button onClick={() => setShowAddModal(true)} style={{ ...primaryButton, padding: "12px 20px" }}><Plus size={16} />Add Contact</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div style={overlayStyle} onClick={() => setShowAddModal(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: 0 }}>Add Contact</h3>
                            <button onClick={() => setShowAddModal(false)} aria-label="Close" style={rowIconButton("rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0.2)")}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAddContact}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={labelStyle} htmlFor="new-contact-name">Name *</label>
                                <input id="new-contact-name" type="text" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} required placeholder="Contact name" style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: "24px" }}>
                                <label style={labelStyle} htmlFor="new-contact-phone">Phone Number *</label>
                                <input id="new-contact-phone" type="tel" value={newContact.phoneNumber} onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })} required placeholder="+91 98765 43210" style={inputStyle} />
                                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", marginTop: "6px" }}>Include the country code (+91 for India, +1 for the US)</p>
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={ghostButton}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ ...primaryButton, flex: 1, padding: "12px", cursor: saving ? "not-allowed" : "pointer" }}>
                                    {saving ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Contact Modal */}
            {editingContact && (
                <div style={overlayStyle} onClick={() => setEditingContact(null)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: 0 }}>Edit Contact</h3>
                            <button onClick={() => setEditingContact(null)} aria-label="Close" style={rowIconButton("rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0.2)")}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleEditContact}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={labelStyle} htmlFor="edit-contact-name">Name *</label>
                                <input id="edit-contact-name" type="text" value={editingContact.name} onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })} required style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: "24px" }}>
                                <label style={labelStyle} htmlFor="edit-contact-phone">Phone Number *</label>
                                <input id="edit-contact-phone" type="tel" value={editingContact.phoneNumber} onChange={(e) => setEditingContact({ ...editingContact, phoneNumber: e.target.value })} required style={inputStyle} />
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setEditingContact(null)} style={ghostButton}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ ...primaryButton, flex: 1, padding: "12px", cursor: saving ? "not-allowed" : "pointer" }}>
                                    {saving ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={overlayStyle} onClick={() => setDeleteConfirm(null)}>
                    <div style={{ ...modalStyle, maxWidth: "400px", borderColor: "rgba(255, 60, 100, 0.3)" }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: "0 0 16px" }}>Delete {deleteConfirm.name}?</h3>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", marginBottom: "24px" }}>They won&apos;t be called by this campaign. This can&apos;t be undone.</p>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button onClick={() => setDeleteConfirm(null)} style={ghostButton}>Cancel</button>
                            <button onClick={() => handleDeleteContact(deleteConfirm)} style={{ ...ghostButton, border: "none", background: "#FF3C64" }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
