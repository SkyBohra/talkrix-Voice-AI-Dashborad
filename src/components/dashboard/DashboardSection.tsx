"use client";

import { Phone, PhoneCall, PhoneOff, Clock, TrendingUp, Users } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
}

function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
    return (
        <div
            style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(0, 200, 255, 0.15)",
                borderRadius: "12px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 200, 255, 0.15)";
                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
                        boxShadow: "0 0 15px rgba(0, 200, 255, 0.2)",
                    }}
                >
                    {icon}
                </div>
                {trend && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: trendUp ? "#22c55e" : "#ef4444",
                            background: trendUp ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            padding: "4px 8px",
                            borderRadius: "20px",
                        }}
                    >
                        <TrendingUp size={12} style={{ transform: trendUp ? "none" : "rotate(180deg)" }} />
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>
                    {title}
                </p>
                <p style={{ fontSize: "32px", fontWeight: "700", color: "white", letterSpacing: "-1px" }}>
                    {value}
                </p>
            </div>
        </div>
    );
}

interface RecentCallProps {
    caller: string;
    duration: string;
    time: string;
    status: "completed" | "missed" | "ongoing";
}

function RecentCallItem({ caller, duration, time, status }: RecentCallProps) {
    const statusColors = {
        completed: { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e" },
        missed: { bg: "rgba(255, 60, 100, 0.1)", color: "#FF3C64" },
        ongoing: { bg: "rgba(0, 200, 255, 0.1)", color: "#00C8FF" },
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(5, 15, 30, 0.5)",
                border: "1px solid rgba(0, 200, 255, 0.1)",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: statusColors[status].bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: statusColors[status].color,
                    }}
                >
                    {status === "completed" ? (
                        <PhoneCall size={18} />
                    ) : status === "missed" ? (
                        <PhoneOff size={18} />
                    ) : (
                        <Phone size={18} />
                    )}
                </div>
                <div>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "white" }}>{caller}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>{time}</p>
                </div>
            </div>
            <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "white" }}>{duration}</p>
                <p
                    style={{
                        fontSize: "12px",
                        color: statusColors[status].color,
                        textTransform: "capitalize",
                    }}
                >
                    {status}
                </p>
            </div>
        </div>
    );
}

export default function DashboardSection() {
    const stats = [
        { title: "Total Calls", value: "1,284", icon: <Phone size={24} />, trend: "+12.5%", trendUp: true },
        { title: "Connected Calls", value: "1,156", icon: <PhoneCall size={24} />, trend: "+8.2%", trendUp: true },
        { title: "Missed Calls", value: "128", icon: <PhoneOff size={24} />, trend: "-3.1%", trendUp: true },
        { title: "Avg. Duration", value: "4:32", icon: <Clock size={24} />, trend: "+0.8%", trendUp: true },
        { title: "Active Agents", value: "12", icon: <Users size={24} /> },
        { title: "Success Rate", value: "90%", icon: <TrendingUp size={24} />, trend: "+2.3%", trendUp: true },
    ];

    const recentCalls: RecentCallProps[] = [
        { caller: "John Smith", duration: "5:23", time: "2 mins ago", status: "completed" },
        { caller: "Sarah Johnson", duration: "0:00", time: "15 mins ago", status: "missed" },
        { caller: "Mike Wilson", duration: "3:45", time: "32 mins ago", status: "completed" },
        { caller: "Emily Davis", duration: "8:12", time: "1 hour ago", status: "completed" },
        { caller: "Active User", duration: "2:15", time: "Now", status: "ongoing" },
    ];

    return (
        <div style={{ 
            padding: "32px", 
            maxWidth: "1400px",
            boxSizing: "border-box",
        }}>
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "8px" }}>
                    Dashboard
                </h1>
                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
                    Welcome back! Here's your overview.
                </p>
            </div>

            {/* Stats Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "20px",
                    marginBottom: "32px",
                }}
            >
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>

            {/* Recent Calls Section */}
            <div
                style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(0, 200, 255, 0.15)",
                    borderRadius: "12px",
                    padding: "24px",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "600", color: "white" }}>Recent Calls</h2>
                    <button
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#00C8FF",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                        }}
                    >
                        View All
                    </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {recentCalls.map((call, index) => (
                        <RecentCallItem key={index} {...call} />
                    ))}
                </div>
            </div>
        </div>
    );
}
