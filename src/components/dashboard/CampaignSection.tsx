"use client";

import { useState } from "react";
import { Megaphone, Plus, Play, Pause, Edit, Trash2, Users, Phone, Calendar, Clock, BarChart3, CheckCircle, XCircle, Loader } from "lucide-react";

interface Campaign {
    id: string;
    name: string;
    status: "active" | "paused" | "completed" | "draft";
    agentName: string;
    totalContacts: number;
    completedCalls: number;
    successRate: number;
    startDate: string;
    endDate?: string;
}

// Mock data for demonstration
const mockCampaigns: Campaign[] = [
    { id: "1", name: "Q1 Sales Outreach", status: "active", agentName: "Sales Agent", totalContacts: 500, completedCalls: 234, successRate: 78, startDate: "2026-01-01", endDate: "2026-03-31" },
    { id: "2", name: "Customer Satisfaction Survey", status: "active", agentName: "Survey Bot", totalContacts: 1000, completedCalls: 650, successRate: 92, startDate: "2026-01-10" },
    { id: "3", name: "Product Launch Announcement", status: "paused", agentName: "Marketing AI", totalContacts: 2500, completedCalls: 800, successRate: 65, startDate: "2025-12-15" },
    { id: "4", name: "Appointment Reminders", status: "completed", agentName: "Booking Assistant", totalContacts: 300, completedCalls: 300, successRate: 95, startDate: "2025-12-01", endDate: "2025-12-31" },
    { id: "5", name: "New Feature Beta Invite", status: "draft", agentName: "Support Bot", totalContacts: 150, completedCalls: 0, successRate: 0, startDate: "2026-01-20" },
];

export default function CampaignSection() {
    const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "active": return { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "rgba(34, 197, 94, 0.3)", icon: <Play size={14} /> };
            case "paused": return { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", border: "rgba(251, 191, 36, 0.3)", icon: <Pause size={14} /> };
            case "completed": return { bg: "rgba(0, 200, 255, 0.15)", color: "#00C8FF", border: "rgba(0, 200, 255, 0.3)", icon: <CheckCircle size={14} /> };
            case "draft": return { bg: "rgba(255, 255, 255, 0.1)", color: "rgba(255, 255, 255, 0.6)", border: "rgba(255, 255, 255, 0.2)", icon: <Edit size={14} /> };
            default: return { bg: "rgba(0, 200, 255, 0.15)", color: "#00C8FF", border: "rgba(0, 200, 255, 0.3)", icon: null };
        }
    };

    const toggleCampaignStatus = (id: string) => {
        setCampaigns(campaigns.map(c => {
            if (c.id === id) {
                if (c.status === "active") return { ...c, status: "paused" as const };
                if (c.status === "paused") return { ...c, status: "active" as const };
            }
            return c;
        }));
    };

    return (
        <div
            style={{
                padding: "32px",
                boxSizing: "border-box",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
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
                        Campaigns
                    </h1>
                    <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}>
                        Create and manage your voice AI outreach campaigns
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 24px",
                        borderRadius: "12px",
                        border: "none",
                        background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 20px rgba(0, 200, 255, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 25px rgba(0, 200, 255, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 200, 255, 0.3)";
                    }}
                >
                    <Plus size={18} />
                    New Campaign
                </button>
            </div>

            {/* Stats Overview */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                    marginBottom: "32px",
                }}
            >
                {[
                    { label: "Active Campaigns", value: campaigns.filter(c => c.status === "active").length, icon: <Megaphone size={20} /> },
                    { label: "Total Contacts", value: campaigns.reduce((sum, c) => sum + c.totalContacts, 0).toLocaleString(), icon: <Users size={20} /> },
                    { label: "Calls Completed", value: campaigns.reduce((sum, c) => sum + c.completedCalls, 0).toLocaleString(), icon: <Phone size={20} /> },
                    { label: "Avg Success Rate", value: `${Math.round(campaigns.filter(c => c.completedCalls > 0).reduce((sum, c) => sum + c.successRate, 0) / campaigns.filter(c => c.completedCalls > 0).length || 0)}%`, icon: <BarChart3 size={20} /> },
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

            {/* Campaign Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {campaigns.map((campaign) => {
                    const statusStyle = getStatusStyle(campaign.status);
                    const progress = campaign.totalContacts > 0 ? (campaign.completedCalls / campaign.totalContacts) * 100 : 0;

                    return (
                        <div
                            key={campaign.id}
                            style={{
                                background: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(0, 200, 255, 0.15)",
                                borderRadius: "16px",
                                padding: "24px",
                                transition: "all 0.3s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(0, 200, 255, 0.05)";
                                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.25)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                            }}
                        >
                            {/* Campaign Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div
                                        style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "12px",
                                            background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.15) 100%)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#00C8FF",
                                        }}
                                    >
                                        <Megaphone size={22} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", marginBottom: "4px" }}>{campaign.name}</h3>
                                        <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>Agent: {campaign.agentName}</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    {/* Status Badge */}
                                    <span
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "6px 14px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "500",
                                            background: statusStyle.bg,
                                            color: statusStyle.color,
                                            border: `1px solid ${statusStyle.border}`,
                                            textTransform: "capitalize",
                                        }}
                                    >
                                        {statusStyle.icon}
                                        {campaign.status}
                                    </span>

                                    {/* Action Buttons */}
                                    {(campaign.status === "active" || campaign.status === "paused") && (
                                        <button
                                            onClick={() => toggleCampaignStatus(campaign.id)}
                                            style={{
                                                width: "36px",
                                                height: "36px",
                                                borderRadius: "8px",
                                                border: "1px solid rgba(0, 200, 255, 0.3)",
                                                background: "transparent",
                                                color: "#00C8FF",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                            }}
                                            title={campaign.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                                        >
                                            {campaign.status === "active" ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                    )}
                                    <button
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "8px",
                                            border: "1px solid rgba(255, 255, 255, 0.2)",
                                            background: "transparent",
                                            color: "rgba(255, 255, 255, 0.6)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                        title="Edit Campaign"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "8px",
                                            border: "1px solid rgba(255, 60, 100, 0.3)",
                                            background: "transparent",
                                            color: "#FF3C64",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                        title="Delete Campaign"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>Progress</span>
                                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}>{campaign.completedCalls} / {campaign.totalContacts} calls</span>
                                </div>
                                <div
                                    style={{
                                        height: "6px",
                                        background: "rgba(255, 255, 255, 0.1)",
                                        borderRadius: "3px",
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${progress}%`,
                                            height: "100%",
                                            background: "linear-gradient(90deg, #00C8FF 0%, #7800FF 100%)",
                                            borderRadius: "3px",
                                            transition: "width 0.5s ease",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Campaign Stats */}
                            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Users size={14} style={{ color: "rgba(255, 255, 255, 0.4)" }} />
                                    <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>{campaign.totalContacts} contacts</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <BarChart3 size={14} style={{ color: "rgba(255, 255, 255, 0.4)" }} />
                                    <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>{campaign.successRate}% success rate</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Calendar size={14} style={{ color: "rgba(255, 255, 255, 0.4)" }} />
                                    <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>Started: {campaign.startDate}</span>
                                </div>
                                {campaign.endDate && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Clock size={14} style={{ color: "rgba(255, 255, 255, 0.4)" }} />
                                        <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>Ends: {campaign.endDate}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {campaigns.length === 0 && (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px 20px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px dashed rgba(0, 200, 255, 0.2)",
                        borderRadius: "16px",
                    }}
                >
                    <Megaphone size={48} style={{ color: "rgba(0, 200, 255, 0.3)", marginBottom: "16px" }} />
                    <h3 style={{ fontSize: "18px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>No campaigns yet</h3>
                    <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "20px" }}>Create your first campaign to start reaching out to contacts</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 24px",
                            borderRadius: "12px",
                            border: "none",
                            background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                        }}
                    >
                        <Plus size={18} />
                        Create Campaign
                    </button>
                </div>
            )}
        </div>
    );
}
