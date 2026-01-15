"use client";

import { useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Calendar, Search, Filter, Download, Play, Pause } from "lucide-react";

interface CallRecord {
    id: string;
    phoneNumber: string;
    direction: "inbound" | "outbound";
    status: "completed" | "missed" | "failed";
    duration: string;
    agentName: string;
    timestamp: string;
    recording?: string;
}

// Mock data for demonstration
const mockCalls: CallRecord[] = [
    { id: "1", phoneNumber: "+1 (555) 123-4567", direction: "inbound", status: "completed", duration: "5:32", agentName: "Sales Agent", timestamp: "2026-01-15 10:30 AM" },
    { id: "2", phoneNumber: "+1 (555) 987-6543", direction: "outbound", status: "completed", duration: "3:15", agentName: "Support Bot", timestamp: "2026-01-15 10:15 AM" },
    { id: "3", phoneNumber: "+1 (555) 456-7890", direction: "inbound", status: "missed", duration: "0:00", agentName: "Sales Agent", timestamp: "2026-01-15 09:45 AM" },
    { id: "4", phoneNumber: "+1 (555) 321-6547", direction: "outbound", status: "failed", duration: "0:00", agentName: "Booking Assistant", timestamp: "2026-01-15 09:30 AM" },
    { id: "5", phoneNumber: "+1 (555) 789-0123", direction: "inbound", status: "completed", duration: "8:47", agentName: "Support Bot", timestamp: "2026-01-15 09:00 AM" },
];

export default function CallHistorySection() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [playingId, setPlayingId] = useState<string | null>(null);

    const filteredCalls = mockCalls.filter((call) => {
        const matchesSearch = call.phoneNumber.includes(searchQuery) || call.agentName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === "all" || call.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusIcon = (direction: string, status: string) => {
        if (status === "missed") return <PhoneMissed size={18} />;
        if (direction === "inbound") return <PhoneIncoming size={18} />;
        return <PhoneOutgoing size={18} />;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "rgba(34, 197, 94, 0.3)" };
            case "missed": return { bg: "rgba(255, 60, 100, 0.15)", color: "#FF3C64", border: "rgba(255, 60, 100, 0.3)" };
            case "failed": return { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "rgba(239, 68, 68, 0.3)" };
            default: return { bg: "rgba(0, 200, 255, 0.15)", color: "#00C8FF", border: "rgba(0, 200, 255, 0.3)" };
        }
    };

    return (
        <div
            style={{
                padding: "32px",
                height: "100%",
                overflowY: "auto",
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
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

            {/* Stats Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                    marginBottom: "32px",
                }}
            >
                {[
                    { label: "Total Calls", value: "1,234", icon: <Phone size={20} /> },
                    { label: "Completed", value: "1,089", icon: <PhoneIncoming size={20} /> },
                    { label: "Missed", value: "98", icon: <PhoneMissed size={20} /> },
                    { label: "Avg Duration", value: "4:32", icon: <Clock size={20} /> },
                ].map((stat, index) => (
                    <div
                        key={index}
                        style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(0, 200, 255, 0.15)",
                            borderRadius: "12px",
                            padding: "20px",
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
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <div
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "10px",
                                    background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.15) 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#00C8FF",
                                }}
                            >
                                {stat.icon}
                            </div>
                        </div>
                        <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>{stat.label}</p>
                        <p style={{ fontSize: "24px", fontWeight: "700", color: "white" }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div
                style={{
                    display: "flex",
                    gap: "16px",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                }}
            >
                {/* Search */}
                <div
                    style={{
                        flex: "1",
                        minWidth: "250px",
                        position: "relative",
                    }}
                >
                    <Search
                        size={18}
                        style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "rgba(255, 255, 255, 0.4)",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search by phone number or agent..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px 16px 12px 44px",
                            borderRadius: "10px",
                            border: "1px solid rgba(0, 200, 255, 0.2)",
                            background: "rgba(5, 15, 30, 0.8)",
                            color: "white",
                            fontSize: "14px",
                            outline: "none",
                        }}
                    />
                </div>

                {/* Filter Dropdown */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.2)",
                        background: "rgba(5, 15, 30, 0.8)",
                        color: "white",
                        fontSize: "14px",
                        cursor: "pointer",
                        outline: "none",
                        minWidth: "150px",
                    }}
                >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="failed">Failed</option>
                </select>

                {/* Export Button */}
                <button
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 20px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.3)",
                        background: "linear-gradient(135deg, rgba(0, 200, 255, 0.15) 0%, rgba(120, 0, 255, 0.1) 100%)",
                        color: "#00C8FF",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
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
                        gridTemplateColumns: "1fr 1fr 120px 100px 150px 80px",
                        padding: "16px 24px",
                        background: "rgba(0, 200, 255, 0.05)",
                        borderBottom: "1px solid rgba(0, 200, 255, 0.1)",
                        gap: "16px",
                    }}
                >
                    {["Phone Number", "Agent", "Status", "Duration", "Date & Time", "Audio"].map((header) => (
                        <span key={header} style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {header}
                        </span>
                    ))}
                </div>

                {/* Table Body */}
                {filteredCalls.map((call) => {
                    const statusStyle = getStatusColor(call.status);
                    return (
                        <div
                            key={call.id}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 120px 100px 150px 80px",
                                padding: "16px 24px",
                                borderBottom: "1px solid rgba(0, 200, 255, 0.08)",
                                alignItems: "center",
                                gap: "16px",
                                transition: "background 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(0, 200, 255, 0.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            {/* Phone Number */}
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
                                    {getStatusIcon(call.direction, call.status)}
                                </div>
                                <span style={{ color: "white", fontWeight: "500" }}>{call.phoneNumber}</span>
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
                                {call.duration}
                            </span>

                            {/* Timestamp */}
                            <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "13px" }}>{call.timestamp}</span>

                            {/* Audio Control */}
                            {call.status === "completed" ? (
                                <button
                                    onClick={() => setPlayingId(playingId === call.id ? null : call.id)}
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        border: "1px solid rgba(0, 200, 255, 0.3)",
                                        background: playingId === call.id ? "rgba(0, 200, 255, 0.2)" : "transparent",
                                        color: "#00C8FF",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {playingId === call.id ? <Pause size={16} /> : <Play size={16} />}
                                </button>
                            ) : (
                                <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "12px" }}>—</span>
                            )}
                        </div>
                    );
                })}

                {filteredCalls.length === 0 && (
                    <div style={{ padding: "48px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}>
                        No calls found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
