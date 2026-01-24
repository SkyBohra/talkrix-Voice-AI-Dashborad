"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneCall, PhoneOff, Clock, TrendingUp, Bot, RefreshCw, Loader2 } from "lucide-react";
import { 
    fetchDashboard, 
    DashboardResponse, 
    RecentCall,
    TrendData 
} from "@/lib/dashboardApi";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: TrendData;
    loading?: boolean;
}

function StatCard({ title, value, icon, trend, loading }: StatCardProps) {
    return (
        <div
            className="stat-card"
            style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(0, 200, 255, 0.15)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                minHeight: "120px",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 200, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.25)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div
                    className="stat-icon"
                    style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.15) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#00C8FF",
                        boxShadow: "0 0 15px rgba(0, 200, 255, 0.2)",
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </div>
                {trend && trend.change > 0 && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: "500",
                            color: trend.isUp ? "#22c55e" : "#ef4444",
                            background: trend.isUp ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            padding: "3px 6px",
                            borderRadius: "20px",
                        }}
                    >
                        <TrendingUp size={10} style={{ transform: trend.isUp ? "none" : "rotate(180deg)" }} />
                        {trend.change}%
                    </div>
                )}
            </div>
            <div>
                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>
                    {title}
                </p>
                {loading ? (
                    <div style={{ height: "32px", display: "flex", alignItems: "center" }}>
                        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#00C8FF" }} />
                    </div>
                ) : (
                    <p className="stat-value" style={{ fontSize: "24px", fontWeight: "700", color: "white", letterSpacing: "-0.5px" }}>
                        {value}
                    </p>
                )}
            </div>
        </div>
    );
}

function RecentCallItem({ call }: { call: RecentCall }) {
    const statusColors: Record<string, { bg: string; color: string }> = {
        completed: { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e" },
        missed: { bg: "rgba(255, 60, 100, 0.1)", color: "#FF3C64" },
        ongoing: { bg: "rgba(0, 200, 255, 0.1)", color: "#00C8FF" },
        failed: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444" },
    };

    const colors = statusColors[call.status] || statusColors.failed;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "10px",
                background: "rgba(5, 15, 30, 0.5)",
                border: "1px solid rgba(0, 200, 255, 0.08)",
                transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 200, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(5, 15, 30, 0.5)";
                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.08)";
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: colors.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: colors.color,
                    }}
                >
                    {call.status === "completed" ? (
                        <PhoneCall size={18} />
                    ) : call.status === "missed" ? (
                        <PhoneOff size={18} />
                    ) : (
                        <Phone size={18} />
                    )}
                </div>
                <div>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "white" }}>{call.caller}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>{call.time}</p>
                </div>
            </div>
            <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "14px", fontWeight: "500", color: "white" }}>{call.duration}</p>
                <p
                    style={{
                        fontSize: "12px",
                        color: colors.color,
                        textTransform: "capitalize",
                    }}
                >
                    {call.status}
                </p>
            </div>
        </div>
    );
}

export default function DashboardSection() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Default empty data for when API fails or returns no data
    const defaultData: DashboardResponse = {
        stats: {
            totalCalls: 0,
            completedCalls: 0,
            missedCalls: 0,
            failedCalls: 0,
            avgDurationSeconds: 0,
            avgDurationFormatted: '0:00',
            successRate: 0,
            totalAgents: 0,
            activeAgents: 0,
            totalCampaigns: 0,
            activeCampaigns: 0,
        },
        trends: {
            calls: { value: 0, change: 0, isUp: true },
            completed: { value: 0, change: 0, isUp: true },
            missed: { value: 0, change: 0, isUp: false },
            duration: { value: 0, change: 0, isUp: true },
            successRate: { value: 0, change: 0, isUp: true },
        },
        recentCalls: [],
        period: period,
    };

    const loadDashboard = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        
        setError(null);

        try {
            const result = await fetchDashboard(period);
            if (result.success && result.data) {
                setData(result.data);
            } else {
                // Use default data when API fails
                console.warn('Dashboard API failed, using defaults:', result.message);
                setData(defaultData);
            }
        } catch (err) {
            console.error('Dashboard load error:', err);
            // Use default data on error
            setData(defaultData);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const formatNumber = (num: number): string => num.toLocaleString();

    const stats = data?.stats;
    const trends = data?.trends;

    return (
        <div className="dashboard-section-content" style={{ 
            padding: "clamp(16px, 4vw, 40px)", 
            width: "100%",
            boxSizing: "border-box",
        }}>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .dashboard-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }
                    .dashboard-header-controls {
                        width: 100%;
                        flex-wrap: wrap;
                    }
                    .stat-card {
                        min-height: 100px !important;
                    }
                    .stat-value {
                        font-size: 20px !important;
                    }
                    .stat-icon {
                        width: 38px !important;
                        height: 38px !important;
                    }
                    .recent-call-item {
                        flex-direction: column !important;
                        gap: 12px !important;
                        align-items: flex-start !important;
                    }
                    .recent-call-item > div:last-child {
                        text-align: left !important;
                        width: 100%;
                        display: flex;
                        justify-content: space-between;
                    }
                }
                
                @media (max-width: 480px) {
                    .period-selector {
                        width: 100%;
                        justify-content: center;
                    }
                    .period-btn {
                        flex: 1;
                        text-align: center;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="dashboard-header" style={{ 
                marginBottom: "24px", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "16px",
            }}>
                <div>
                    <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "700", color: "white", marginBottom: "6px" }}>
                        Dashboard
                    </h1>
                    <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>
                        Welcome back! Here&apos;s your overview.
                    </p>
                </div>
                <div className="dashboard-header-controls" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Period Selector */}
                    <div className="period-selector" style={{ 
                        display: "flex", 
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "8px",
                        padding: "4px",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                    }}>
                        {(['today', 'week', 'month'] as const).map((p) => (
                            <button
                                key={p}
                                className="period-btn"
                                onClick={() => setPeriod(p)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: period === p ? "rgba(0, 200, 255, 0.15)" : "transparent",
                                    color: period === p ? "#00C8FF" : "rgba(255, 255, 255, 0.5)",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    textTransform: "capitalize",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    {/* Refresh Button */}
                    <button
                        onClick={() => loadDashboard(true)}
                        disabled={refreshing}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(0, 200, 255, 0.2)",
                            background: "transparent",
                            color: "#00C8FF",
                            fontSize: "13px",
                            cursor: refreshing ? "not-allowed" : "pointer",
                            opacity: refreshing ? 0.6 : 1,
                            minHeight: "36px",
                        }}
                    >
                        <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div style={{
                    padding: "16px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "10px",
                    marginBottom: "24px",
                    color: "#ef4444",
                    fontSize: "14px",
                }}>
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "12px",
                    marginBottom: "24px",
                }}
            >
                <StatCard 
                    title="Total Calls" 
                    value={stats ? formatNumber(stats.totalCalls) : "0"} 
                    icon={<Phone size={20} />} 
                    trend={trends?.calls}
                    loading={loading}
                />
                <StatCard 
                    title="Completed" 
                    value={stats ? formatNumber(stats.completedCalls) : "0"} 
                    icon={<PhoneCall size={20} />} 
                    trend={trends?.completed}
                    loading={loading}
                />
                <StatCard 
                    title="Missed" 
                    value={stats ? formatNumber(stats.missedCalls) : "0"} 
                    icon={<PhoneOff size={20} />} 
                    trend={trends?.missed}
                    loading={loading}
                />
                <StatCard 
                    title="Active Agents" 
                    value={stats ? `${stats.activeAgents}/${stats.totalAgents}` : "0/0"} 
                    icon={<Bot size={20} />}
                    loading={loading}
                />
                <StatCard 
                    title="Success Rate" 
                    value={stats ? `${stats.successRate}%` : "0%"} 
                    icon={<TrendingUp size={20} />} 
                    trend={trends?.successRate}
                    loading={loading}
                />
            </div>

            {/* Recent Calls Section */}
            <div
                style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(0, 200, 255, 0.15)",
                    borderRadius: "12px",
                    padding: "clamp(16px, 3vw, 24px)",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <h2 style={{ fontSize: "clamp(14px, 2.5vw, 17px)", fontWeight: "600", color: "white" }}>Recent Calls</h2>
                    <button
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#00C8FF",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: "pointer",
                            padding: "6px 12px",
                            borderRadius: "6px",
                        }}
                        onClick={() => window.location.href = '/dashboard/call-history'}
                    >
                        View All →
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#00C8FF" }} />
                    </div>
                ) : data?.recentCalls && data.recentCalls.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {data.recentCalls.map((call) => (
                            <RecentCallItem key={call.id} call={call} />
                        ))}
                    </div>
                ) : (
                    <div style={{ 
                        textAlign: "center", 
                        padding: "24px", 
                        color: "rgba(255, 255, 255, 0.4)",
                        fontSize: "13px",
                    }}>
                        <Phone size={28} style={{ marginBottom: "10px", opacity: 0.5 }} />
                        <p>No recent calls</p>
                    </div>
                )}
            </div>
        </div>
    );
}
