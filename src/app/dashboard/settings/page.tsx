"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import SettingsSection from "@/components/dashboard/SettingsSection";
import { Loader2 } from "lucide-react";

function SettingsContent() {
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
        <div className="dashboard-container">
            {/* Dot Pattern Overlay */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                    pointerEvents: "none",
                    zIndex: 1,
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
            <main className="dashboard-main">
                <SettingsSection />
            </main>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                width: '100%',
                background: '#030712'
            }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#00C8FF', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}
