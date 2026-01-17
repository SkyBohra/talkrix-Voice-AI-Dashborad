"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Bot,
    Wrench,
    Database,
    Settings,
    LogOut,
    Mic,
    Phone,
    Megaphone,
} from "lucide-react";

type SidebarItem = {
    id: string;
    label: string;
    icon: React.ReactNode;
};

const sidebarItems: SidebarItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "campaign", label: "Campaign", icon: <Megaphone size={20} /> },
    { id: "call-history", label: "Call History", icon: <Phone size={20} /> },
    { id: "agents", label: "Agents", icon: <Bot size={20} /> },
    { id: "voices", label: "Voices", icon: <Mic size={20} /> },
    { id: "tools", label: "Tools", icon: <Wrench size={20} /> },
    { id: "rag", label: "RAG", icon: <Database size={20} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
];

interface SidebarProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
    onLogout: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, onLogout }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(() => {
        // Initialize from localStorage if available
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarCollapsed');
            return saved === 'true';
        }
        return false;
    });

    // Persist collapsed state to localStorage
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(collapsed));
    }, [collapsed]);

    // Set CSS variable for sidebar width so other components can use it
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', collapsed ? '80px' : '260px');
    }, [collapsed]);

    return (
        <aside
            style={{
                width: collapsed ? "80px" : "260px",
                height: "100vh",
                background: "linear-gradient(180deg, rgba(5, 15, 30, 0.95) 0%, rgba(10, 20, 40, 0.9) 50%, rgba(5, 15, 35, 0.95) 100%)",
                borderRight: "1px solid rgba(0, 200, 255, 0.15)",
                boxShadow: "4px 0 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 200, 255, 0.05)",
                display: "flex",
                flexDirection: "column",
                padding: "24px 16px",
                transition: "width 0.3s ease",
                position: "relative",
                zIndex: 10,
                backdropFilter: "blur(20px)",
            }}
        >
            {/* Logo */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "40px",
                    paddingLeft: "8px",
                }}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 0 20px rgba(0, 200, 255, 0.4)",
                    }}
                >
                    <Bot size={22} color="white" />
                </div>
                {!collapsed && (
                    <span
                        style={{
                            fontWeight: "800",
                            fontSize: "20px",
                            background: "linear-gradient(135deg, #00C8FF, #7800FF)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            letterSpacing: "-0.5px",
                        }}
                    >
                        TALKRIX
                    </span>
                )}
            </div>

            {/* Collapse Toggle - Animated Arrow Pill */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    position: "absolute",
                    right: "-16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "32px",
                    height: "64px",
                    borderRadius: "0 16px 16px 0",
                    background: "linear-gradient(180deg, rgba(0, 200, 255, 0.15) 0%, rgba(120, 0, 255, 0.12) 100%)",
                    border: "1px solid rgba(0, 200, 255, 0.3)",
                    borderLeft: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: 10,
                    backdropFilter: "blur(12px)",
                    boxShadow: "4px 0 20px rgba(0, 200, 255, 0.15)",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(180deg, rgba(0, 200, 255, 0.28) 0%, rgba(120, 0, 255, 0.22) 100%)";
                    e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.5)";
                    e.currentTarget.style.boxShadow = "4px 0 30px rgba(0, 200, 255, 0.35)";
                    e.currentTarget.style.width = "36px";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(180deg, rgba(0, 200, 255, 0.15) 0%, rgba(120, 0, 255, 0.12) 100%)";
                    e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                    e.currentTarget.style.boxShadow = "4px 0 20px rgba(0, 200, 255, 0.15)";
                    e.currentTarget.style.width = "32px";
                }}
            >
                {/* Top chevron line */}
                <div
                    style={{
                        width: "10px",
                        height: "2.5px",
                        background: "linear-gradient(90deg, #00C8FF, #7800FF)",
                        borderRadius: "2px",
                        transform: collapsed ? "rotate(45deg) translateX(2px)" : "rotate(-45deg) translateX(-2px)",
                        transformOrigin: "center",
                        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: "0 0 8px rgba(0, 200, 255, 0.5)",
                    }}
                />
                {/* Bottom chevron line */}
                <div
                    style={{
                        width: "10px",
                        height: "2.5px",
                        background: "linear-gradient(90deg, #00C8FF, #7800FF)",
                        borderRadius: "2px",
                        transform: collapsed ? "rotate(-45deg) translateX(2px)" : "rotate(45deg) translateX(-2px)",
                        transformOrigin: "center",
                        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: "0 0 8px rgba(0, 200, 255, 0.5)",
                    }}
                />
            </button>

            {/* Navigation Items */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
                {sidebarItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: collapsed ? "14px" : "14px 16px",
                            borderRadius: "12px",
                            border: activeSection === item.id ? "1px solid rgba(0, 200, 255, 0.3)" : "1px solid transparent",
                            background:
                                activeSection === item.id
                                    ? "linear-gradient(135deg, rgba(0, 200, 255, 0.15) 0%, rgba(120, 0, 255, 0.1) 100%)"
                                    : "transparent",
                            color: activeSection === item.id ? "#00C8FF" : "rgba(255, 255, 255, 0.6)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            justifyContent: collapsed ? "center" : "flex-start",
                            position: "relative",
                            boxShadow: activeSection === item.id ? "0 0 20px rgba(0, 200, 255, 0.15)" : "none",
                        }}
                        onMouseEnter={(e) => {
                            if (activeSection !== item.id) {
                                e.currentTarget.style.background = "rgba(0, 200, 255, 0.08)";
                                e.currentTarget.style.color = "#00C8FF";
                                e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.2)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeSection !== item.id) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                                e.currentTarget.style.borderColor = "transparent";
                            }
                        }}
                    >
                        {activeSection === item.id && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    width: "3px",
                                    height: "24px",
                                    background: "linear-gradient(180deg, #00C8FF 0%, #7800FF 100%)",
                                    borderRadius: "0 4px 4px 0",
                                    boxShadow: "0 0 10px rgba(0, 200, 255, 0.5)",
                                }}
                            />
                        )}
                        {item.icon}
                        {!collapsed && (
                            <span style={{ fontSize: "14px", fontWeight: "500" }}>{item.label}</span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Logout Button */}
            <button
                onClick={onLogout}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: collapsed ? "14px" : "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 60, 100, 0.3)",
                    background: "rgba(255, 60, 100, 0.1)",
                    color: "#FF3C64",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    justifyContent: collapsed ? "center" : "flex-start",
                    marginTop: "16px",
                    flexShrink: 0,
                    boxShadow: "0 0 15px rgba(255, 60, 100, 0.1)",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 60, 100, 0.2)";
                    e.currentTarget.style.boxShadow = "0 0 25px rgba(255, 60, 100, 0.2)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 60, 100, 0.1)";
                    e.currentTarget.style.boxShadow = "0 0 15px rgba(255, 60, 100, 0.1)";
                }}
            >
                <LogOut size={20} />
                {!collapsed && <span style={{ fontSize: "14px", fontWeight: "500" }}>Logout</span>}
            </button>
        </aside>
    );
}
