"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Search, Download, Play, Pause, RefreshCw, User, TestTube, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { 
    fetchCallHistory, 
    fetchCallStats, 
    CallHistoryRecord, 
    CallStats, 
    formatDuration, 
    formatCallDate,
    getCallDisplayDate 
} from "@/lib/callHistoryApi";
import Pagination from "@/components/ui/Pagination";

export default function CallHistorySection() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterCallType, setFilterCallType] = useState<string>("all");
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [calls, setCalls] = useState<CallHistoryRecord[]>([]);
    const [stats, setStats] = useState<CallStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 20;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [callsRes, statsRes] = await Promise.all([
                fetchCallHistory({
                    page,
                    limit: itemsPerPage,
                    status: filterStatus !== "all" ? filterStatus : undefined,
                    callType: filterCallType !== "all" ? filterCallType : undefined,
                }),
                fetchCallStats(),
            ]);

            if (callsRes.success && callsRes.data) {
                setCalls(callsRes.data.calls || []);
                setTotalPages(callsRes.data.pages || 1);
                setTotalItems(callsRes.data.total || 0);
            }

            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
        } catch (err) {
            console.error("Error loading call history:", err);
        } finally {
            setLoading(false);
        }
    }, [page, filterStatus, filterCallType]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter calls by search query (client-side for quick filtering)
    const filteredCalls = calls.filter((call) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesPhone = call.customerPhone?.includes(searchQuery);
        const matchesName = call.customerName?.toLowerCase().includes(searchLower);
        const matchesAgent = call.agentName?.toLowerCase().includes(searchLower);
        return !searchQuery || matchesPhone || matchesName || matchesAgent;
    });

    const getStatusIcon = (callType: string, status: string) => {
        if (status === "missed") return <PhoneMissed size={18} />;
        if (callType === "test") return <TestTube size={18} />;
        if (callType === "inbound") return <PhoneIncoming size={18} />;
        return <PhoneOutgoing size={18} />;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "rgba(34, 197, 94, 0.3)" };
            case "in-progress": return { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" };
            case "initiated": return { bg: "rgba(234, 179, 8, 0.15)", color: "#eab308", border: "rgba(234, 179, 8, 0.3)" };
            case "missed": return { bg: "rgba(255, 60, 100, 0.15)", color: "#FF3C64", border: "rgba(255, 60, 100, 0.3)" };
            case "failed": return { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" };
            default: return { bg: "rgba(0, 200, 255, 0.15)", color: "#00C8FF", border: "rgba(0, 200, 255, 0.3)" };
        }
    };

    const getCallTypeLabel = (callType: string) => {
        switch (callType) {
            case "test": return "Test Call";
            case "inbound": return "Inbound";
            case "outbound": return "Outbound";
            default: return callType;
        }
    };

    const getEndReasonLabel = (endReason?: string) => {
        switch (endReason) {
            case "hangup": return "User hung up";
            case "agent_hangup": return "Agent hung up";
            case "timeout": return "Call timed out";
            case "connection_error": return "Connection error";
            case "system_error": return "System error";
            case "unjoined": return "Never joined";
            default: return endReason || "—";
        }
    };

    const getBillingStatusLabel = (billingStatus?: string) => {
        if (!billingStatus) return "—";
        switch (billingStatus) {
            case "BILLING_STATUS_FREE_MINUTES": return "Free Minutes";
            case "BILLING_STATUS_BILLED": return "Billed";
            case "BILLING_STATUS_PENDING": return "Pending";
            case "BILLING_STATUS_FAILED": return "Failed";
            case "billed": return "Billed";
            case "free": return "Free";
            case "pending": return "Pending";
            default:
                // Handle any other format - convert BILLING_STATUS_X to readable format
                if (billingStatus.startsWith("BILLING_STATUS_")) {
                    return billingStatus.replace("BILLING_STATUS_", "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                }
                return billingStatus;
        }
    };

    const getBillingStatusColor = (billingStatus?: string) => {
        if (!billingStatus) return "rgba(255, 255, 255, 0.7)";
        switch (billingStatus) {
            case "BILLING_STATUS_FREE_MINUTES":
            case "free":
                return "rgba(59, 130, 246, 0.9)"; // Blue for free
            case "BILLING_STATUS_BILLED":
            case "billed":
                return "rgba(34, 197, 94, 0.9)"; // Green for billed
            case "BILLING_STATUS_PENDING":
            case "pending":
                return "rgba(251, 191, 36, 0.9)"; // Yellow for pending
            case "BILLING_STATUS_FAILED":
            case "failed":
                return "rgba(239, 68, 68, 0.9)"; // Red for failed
            default:
                return "rgba(255, 255, 255, 0.7)";
        }
    };

    const handleExport = () => {
        // Export calls as CSV
        const headers = ["Date", "Customer Name", "Phone", "Agent", "Type", "Status", "Duration", "Billed Duration", "End Reason", "Short Summary", "Summary"];
        const rows = filteredCalls.map(call => [
            formatCallDate(getCallDisplayDate(call)),
            call.customerName || "-",
            call.customerPhone || "-",
            call.agentName,
            getCallTypeLabel(call.callType),
            call.status,
            formatDuration(call.durationSeconds),
            call.billedDuration || "-",
            call.endReason ? getEndReasonLabel(call.endReason) : "-",
            call.shortSummary || "-",
            call.summary || "-",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `call-history-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            style={{
                padding: "32px 40px",
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <h1
                        style={{
                            fontSize: "28px",
                            fontWeight: "700",
                            background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            marginBottom: "8px",
                        }}
                    >
                        Call History
                    </h1>
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}>
                        View and manage all your voice AI call records
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 200, 255, 0.3)",
                        background: "transparent",
                        color: "#00C8FF",
                        fontSize: "14px",
                        cursor: "pointer",
                        opacity: loading ? 0.5 : 1,
                    }}
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "16px",
                    marginBottom: "24px",
                }}
            >
                {[
                    { label: "Total Calls", value: stats?.totalCalls?.toLocaleString() || "0", icon: <Phone size={18} /> },
                    { label: "Completed", value: stats?.completedCalls?.toLocaleString() || "0", icon: <PhoneIncoming size={18} /> },
                    { label: "Missed", value: stats?.missedCalls?.toLocaleString() || "0", icon: <PhoneMissed size={18} /> },
                    { label: "Avg Duration", value: stats ? formatDuration(stats.averageDurationSeconds) : "0:00", icon: <Clock size={18} /> },
                ].map((stat, index) => (
                    <div
                        key={index}
                        style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(0, 200, 255, 0.15)",
                            borderRadius: "10px",
                            padding: "16px",
                            transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(0, 200, 255, 0.08)";
                            e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                            e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <div
                                style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.15) 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#00C8FF",
                                }}
                            >
                                {stat.icon}
                            </div>
                            <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", margin: 0 }}>{stat.label}</p>
                        </div>
                        <p style={{ fontSize: "20px", fontWeight: "700", color: "white", margin: 0 }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "20px",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                {/* Search */}
                <div
                    style={{
                        flex: "1 1 300px",
                        minWidth: "200px",
                        maxWidth: "400px",
                        position: "relative",
                    }}
                >
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "rgba(255, 255, 255, 0.4)",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search by phone, customer name, or agent..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 14px 10px 38px",
                            borderRadius: "8px",
                            border: "1px solid rgba(0, 200, 255, 0.2)",
                            background: "rgba(5, 15, 30, 0.8)",
                            color: "white",
                            fontSize: "13px",
                            outline: "none",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(1);
                    }}
                    style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 200, 255, 0.2)",
                        background: "rgba(5, 15, 30, 0.8)",
                        color: "white",
                        fontSize: "13px",
                        cursor: "pointer",
                        outline: "none",
                        minWidth: "120px",
                        flexShrink: 0,
                    }}
                >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="missed">Missed</option>
                    <option value="failed">Failed</option>
                </select>

                {/* Call Type Filter */}
                <select
                    value={filterCallType}
                    onChange={(e) => {
                        setFilterCallType(e.target.value);
                        setPage(1);
                    }}
                    style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 200, 255, 0.2)",
                        background: "rgba(5, 15, 30, 0.8)",
                        color: "white",
                        fontSize: "13px",
                        cursor: "pointer",
                        outline: "none",
                        minWidth: "120px",
                        flexShrink: 0,
                    }}
                >
                    <option value="all">All Types</option>
                    <option value="test">Test Calls</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                </select>

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 200, 255, 0.3)",
                        background: "linear-gradient(135deg, rgba(0, 200, 255, 0.15) 0%, rgba(120, 0, 255, 0.1) 100%)",
                        color: "#00C8FF",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 200, 255, 0.25) 0%, rgba(120, 0, 255, 0.2) 100%)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 200, 255, 0.15) 0%, rgba(120, 0, 255, 0.1) 100%)";
                    }}
                >
                    <Download size={16} />
                    Export
                </button>
            </div>

            {/* Call History Table */}
            <div
                style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(0, 200, 255, 0.15)",
                    borderRadius: "16px",
                    overflow: "hidden",
                }}
            >
                {/* Table Header */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 100px 100px 150px 80px",
                        padding: "16px 24px",
                        background: "rgba(0, 200, 255, 0.05)",
                        borderBottom: "1px solid rgba(0, 200, 255, 0.1)",
                        gap: "16px",
                    }}
                >
                    {["Customer", "Phone / Type", "Agent", "Status", "Duration", "Date & Time", "Audio"].map((header) => (
                        <span key={header} style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {header}
                        </span>
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div style={{ padding: "48px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}>
                        Loading call history...
                    </div>
                )}

                {/* Table Body */}
                {!loading && filteredCalls.map((call) => {
                    const statusStyle = getStatusColor(call.status);
                    const isExpanded = expandedId === call._id;
                    const hasSummary = call.summary || call.shortSummary;
                    return (
                        <div key={call._id}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr 1fr 100px 100px 150px 80px",
                                    padding: "16px 24px",
                                    borderBottom: isExpanded ? "none" : "1px solid rgba(0, 200, 255, 0.08)",
                                    alignItems: "center",
                                    gap: "16px",
                                    transition: "background 0.2s ease",
                                    cursor: hasSummary ? "pointer" : "default",
                                    background: isExpanded ? "rgba(0, 200, 255, 0.05)" : "transparent",
                                }}
                                onClick={() => hasSummary && setExpandedId(isExpanded ? null : call._id)}
                                onMouseEnter={(e) => {
                                    if (!isExpanded) e.currentTarget.style.background = "rgba(0, 200, 255, 0.05)";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isExpanded) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                {/* Customer Name */}
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "8px",
                                            background: statusStyle.bg,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: statusStyle.color,
                                        }}
                                    >
                                        {call.customerName ? <User size={18} /> : getStatusIcon(call.callType, call.status)}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <span style={{ color: "white", fontWeight: "500" }}>
                                            {call.customerName || (call.callType === "test" ? "Test Call" : "Unknown")}
                                        </span>
                                        {hasSummary && (
                                            <span style={{ fontSize: "11px", color: "rgba(0, 200, 255, 0.6)", display: "flex", alignItems: "center", gap: "4px" }}>
                                                <FileText size={10} />
                                                {isExpanded ? "Hide summary" : "View summary"}
                                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Phone Number / Call Type */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                                        {call.customerPhone || "—"}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            color: "rgba(255, 255, 255, 0.4)",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {getCallTypeLabel(call.callType)}
                                    </span>
                                </div>

                                {/* Agent Name */}
                                <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{call.agentName}</span>

                                {/* Status Badge */}
                                <span
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        background: statusStyle.bg,
                                        color: statusStyle.color,
                                        border: `1px solid ${statusStyle.border}`,
                                        textTransform: "capitalize",
                                        width: "fit-content",
                                    }}
                                >
                                    {call.status}
                                </span>

                                {/* Duration */}
                                <span style={{ color: "rgba(255, 255, 255, 0.7)", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Clock size={14} style={{ opacity: 0.5 }} />
                                    {formatDuration(call.durationSeconds)}
                                </span>

                                {/* Timestamp */}
                                <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "13px" }}>
                                    {formatCallDate(getCallDisplayDate(call))}
                                </span>

                                {/* Audio Control */}
                                {call.status === "completed" && call.recordingUrl ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPlayingId(playingId === call._id ? null : call._id);
                                        }}
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            border: "1px solid rgba(0, 200, 255, 0.3)",
                                            background: playingId === call._id ? "rgba(0, 200, 255, 0.2)" : "transparent",
                                            color: "#00C8FF",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        {playingId === call._id ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                ) : (
                                    <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "12px" }}>—</span>
                                )}
                            </div>

                            {/* Expanded Summary Section */}
                            {isExpanded && (
                                <div
                                    style={{
                                        padding: "16px 24px 20px 72px",
                                        background: "rgba(0, 200, 255, 0.03)",
                                        borderBottom: "1px solid rgba(0, 200, 255, 0.08)",
                                    }}
                                >
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                        {/* Left Column - Summary */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                            {call.shortSummary && (
                                                <div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase", marginBottom: "4px" }}>
                                                        Short Summary
                                                    </div>
                                                    <div style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "14px", lineHeight: "1.5" }}>
                                                        {call.shortSummary}
                                                    </div>
                                                </div>
                                            )}
                                            {call.summary && (
                                                <div>
                                                    <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase", marginBottom: "4px" }}>
                                                        Full Summary
                                                    </div>
                                                    <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px", lineHeight: "1.6" }}>
                                                        {call.summary}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column - Billing & Technical Details */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {call.endReason && (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", minWidth: "100px" }}>End Reason:</span>
                                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}>{getEndReasonLabel(call.endReason)}</span>
                                                </div>
                                            )}
                                            {/* Hidden for now - uncomment to show billing info
                                            {call.billedDuration && (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", minWidth: "100px" }}>Billed Duration:</span>
                                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}>{call.billedDuration}</span>
                                                </div>
                                            )}
                                            {call.billingStatus && (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", minWidth: "100px" }}>Billing Status:</span>
                                                    <span style={{ 
                                                        fontSize: "12px", 
                                                        color: getBillingStatusColor(call.billingStatus),
                                                    }}>
                                                        {getBillingStatusLabel(call.billingStatus)}
                                                    </span>
                                                </div>
                                            )}
                                            */}
                                            {call.talkrixCallId && (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", minWidth: "100px" }}>Call ID:</span>
                                                    <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", fontFamily: "monospace" }}>{call.talkrixCallId}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Empty State */}
                {!loading && filteredCalls.length === 0 && (
                    <div style={{ padding: "48px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}>
                        {calls.length === 0 
                            ? "No calls yet. Test your agents to see call history here."
                            : "No calls found matching your criteria."}
                    </div>
                )}
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setPage}
                itemLabel="calls"
            />
        </div>
    );
}
