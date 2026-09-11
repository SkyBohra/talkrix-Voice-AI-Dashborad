"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import SectionGate from "@/components/dashboard/SectionGate";
import { clearSession } from "@/lib/session";
import CallHistorySection from "@/components/dashboard/CallHistorySection";

export default function CallHistoryPage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        clearSession();
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
                activeSection="call-history"
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
                <SectionGate section="call-history">
                    <CallHistorySection />
                </SectionGate>
            </main>
        </div>
    );
}
