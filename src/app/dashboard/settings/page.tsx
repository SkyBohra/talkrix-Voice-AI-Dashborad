"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import SettingsSection from "@/components/dashboard/SettingsSection";

export default function SettingsPage() {
    const router = useRouter();

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
                activeSection="settings"
                onSectionChange={(section) => {
                    if (section === "dashboard") {
                        router.push("/dashboard");
                    } else {
                        router.push(`/dashboard/${section}`);
                    }
                }}
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
                <SettingsSection />
            </main>
        </div>
    );
}
