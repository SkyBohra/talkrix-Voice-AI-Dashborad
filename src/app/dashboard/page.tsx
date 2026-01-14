"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardSection from "@/components/dashboard/DashboardSection";
import AgentsSection from "@/components/dashboard/AgentsSection";
import VoicesSection from "@/components/dashboard/VoicesSection";
import ToolsSection from "@/components/dashboard/ToolsSection";
import RAGSection from "@/components/dashboard/RAGSection";
import SettingsSection from "@/components/dashboard/SettingsSection";

export default function Dashboard() {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState("dashboard");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        router.push("/login");
    };

    const renderSection = () => {
        switch (activeSection) {
            case "dashboard":
                return <DashboardSection />;
            case "agents":
                return <AgentsSection />;
            case "voices":
                return <VoicesSection />;
            case "tools":
                return <ToolsSection />;
            case "rag":
                return <RAGSection />;
            case "settings":
                return <SettingsSection />;
            default:
                return <DashboardSection />;
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", position: "relative" }}>
            {/* Dot Pattern Overlay */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Sidebar */}
            <Sidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <main
                style={{
                    flex: 1,
                    position: "relative",
                    zIndex: 1,
                    overflow: "hidden",
                    height: "100vh",
                }}
            >
                <div style={{ height: "100%", overflowY: "auto", position: "relative" }}>
                    {renderSection()}
                </div>
            </main>
        </div>
    );
}
