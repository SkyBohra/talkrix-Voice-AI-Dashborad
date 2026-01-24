"use client";

import { useState, useEffect, useCallback } from "react";
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
    Menu,
    X,
} from "lucide-react";

type SidebarItem = {
    id: string;
    label: string;
    icon: React.ReactNode;
    mobileIcon?: React.ReactNode;
};

const sidebarItems: SidebarItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, mobileIcon: <LayoutDashboard size={22} /> },
    { id: "campaign", label: "Campaign", icon: <Megaphone size={20} />, mobileIcon: <Megaphone size={22} /> },
    { id: "call-history", label: "Call History", icon: <Phone size={20} />, mobileIcon: <Phone size={22} /> },
    { id: "agents", label: "Agents", icon: <Bot size={20} />, mobileIcon: <Bot size={22} /> },
    { id: "voices", label: "Voices", icon: <Mic size={20} />, mobileIcon: <Mic size={22} /> },
    { id: "tools", label: "Tools", icon: <Wrench size={20} />, mobileIcon: <Wrench size={22} /> },
    { id: "rag", label: "RAG", icon: <Database size={20} />, mobileIcon: <Database size={22} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} />, mobileIcon: <Settings size={22} /> },
];

// Bottom nav items - show only 5 most important
const mobileNavItems = sidebarItems.filter(item => 
    ["dashboard", "agents", "campaign", "call-history", "settings"].includes(item.id)
);

interface SidebarProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
    onLogout: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, onLogout }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Check if we're on mobile
    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth <= 768);
    }, []);

    // Hydration-safe: load from localStorage after mount
    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved === 'true') {
            setCollapsed(true);
        }
        setMounted(true);
        checkMobile();
        
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [checkMobile]);

    // Persist collapsed state to localStorage
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('sidebarCollapsed', String(collapsed));
        }
    }, [collapsed, mounted]);

    // Set CSS variable for sidebar width so other components can use it
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', collapsed ? '80px' : '260px');
    }, [collapsed]);

    // Close mobile menu when clicking outside or changing section
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const handleSectionChange = (section: string) => {
        onSectionChange(section);
        setMobileMenuOpen(false);
    };

    // Mobile Bottom Navigation
    const MobileBottomNav = () => (
        <nav className="mobile-bottom-nav">
            <div className="mobile-bottom-nav-inner">
                {mobileNavItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleSectionChange(item.id)}
                        className={`mobile-nav-item ${activeSection === item.id ? 'active' : ''}`}
                        style={{
                            color: activeSection === item.id ? '#00C8FF' : 'rgba(255, 255, 255, 0.5)',
                            background: activeSection === item.id ? 'rgba(0, 200, 255, 0.1)' : 'transparent',
                        }}
                    >
                        {item.mobileIcon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );

    // Mobile Hamburger Menu Button
    const MobileMenuButton = () => (
        <button
            className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
        >
            {mobileMenuOpen ? <X size={24} color="#00C8FF" /> : <Menu size={24} color="#00C8FF" />}
        </button>
    );

    // Mobile Menu Overlay
    const MobileMenuOverlay = () => (
        <div 
            className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
            style={{ display: mobileMenuOpen ? 'block' : 'none' }}
        />
    );

    // Mobile Header
    const MobileHeader = () => (
        <header
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '64px',
                background: 'linear-gradient(180deg, rgba(5, 15, 30, 0.98) 0%, rgba(10, 20, 40, 0.95) 100%)',
                borderBottom: '1px solid rgba(0, 200, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                zIndex: 997,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 15px rgba(0, 200, 255, 0.4)',
                    }}
                >
                    <Bot size={20} color="white" />
                </div>
                <span
                    style={{
                        fontWeight: '800',
                        fontSize: '18px',
                        background: 'linear-gradient(135deg, #00C8FF, #7800FF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px',
                    }}
                >
                    TALKRIX
                </span>
            </div>
        </header>
    );

    return (
        <>
            {/* Mobile Elements */}
            {isMobile && (
                <>
                    <MobileHeader />
                    <MobileMenuButton />
                    <MobileMenuOverlay />
                    <MobileBottomNav />
                </>
            )}

            {/* Desktop/Mobile Sidebar */}
            <aside
                className={`dashboard-sidebar sidebar-desktop ${mobileMenuOpen ? 'open' : ''}`}
                style={{
                    width: isMobile ? "280px" : (collapsed ? "80px" : "260px"),
                    height: "100vh",
                    background: "linear-gradient(180deg, rgba(5, 15, 30, 0.98) 0%, rgba(10, 20, 40, 0.95) 50%, rgba(5, 15, 35, 0.98) 100%)",
                    borderRight: "1px solid rgba(0, 200, 255, 0.15)",
                    boxShadow: isMobile 
                        ? "4px 0 40px rgba(0, 0, 0, 0.8)" 
                        : "4px 0 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 200, 255, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    padding: isMobile ? "80px 16px 24px" : "24px 16px",
                    transition: isMobile ? "left 0.3s ease" : "width 0.3s ease",
                    position: isMobile ? "fixed" : "relative",
                    left: isMobile ? (mobileMenuOpen ? "0" : "-280px") : "auto",
                    top: 0,
                    zIndex: isMobile ? 999 : 10,
                    backdropFilter: "blur(20px)",
                }}
            >
                {/* Logo - Hidden on mobile since we have header */}
                {!isMobile && (
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
                )}

                {/* Collapse Toggle - Hidden on mobile */}
                {!isMobile && (
                    <button
                        className="sidebar-collapse-toggle"
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
                )}

                {/* Navigation Items */}
                <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSectionChange(item.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: (collapsed && !isMobile) ? "14px" : "14px 16px",
                                borderRadius: "12px",
                                border: activeSection === item.id ? "1px solid rgba(0, 200, 255, 0.3)" : "1px solid transparent",
                                background:
                                    activeSection === item.id
                                        ? "linear-gradient(135deg, rgba(0, 200, 255, 0.15) 0%, rgba(120, 0, 255, 0.1) 100%)"
                                        : "transparent",
                                color: activeSection === item.id ? "#00C8FF" : "rgba(255, 255, 255, 0.6)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                justifyContent: (collapsed && !isMobile) ? "center" : "flex-start",
                                position: "relative",
                                boxShadow: activeSection === item.id ? "0 0 20px rgba(0, 200, 255, 0.15)" : "none",
                                minHeight: isMobile ? "48px" : "auto",
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
                            {((!collapsed || isMobile)) && (
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
                        padding: (collapsed && !isMobile) ? "14px" : "14px 16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 60, 100, 0.3)",
                        background: "rgba(255, 60, 100, 0.1)",
                        color: "#FF3C64",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        justifyContent: (collapsed && !isMobile) ? "center" : "flex-start",
                        marginTop: "16px",
                        flexShrink: 0,
                        boxShadow: "0 0 15px rgba(255, 60, 100, 0.1)",
                        minHeight: isMobile ? "48px" : "auto",
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
                    {((!collapsed || isMobile)) && <span style={{ fontSize: "14px", fontWeight: "500" }}>Logout</span>}
                </button>
            </aside>
        </>
    );
}
