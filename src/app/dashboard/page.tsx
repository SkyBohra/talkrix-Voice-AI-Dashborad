"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import SectionGate from "@/components/dashboard/SectionGate";
import { clearSession } from "@/lib/session";
import { usePermissions } from "@/lib/useMe";
import DashboardSection from "@/components/dashboard/DashboardSection";
import DashboardTour, { useDashboardTour } from "@/components/dashboard/DashboardTour";

export default function Dashboard() {
    const router = useRouter();
    const { showTour, closeTour, completeTour } = useDashboardTour();
    // The tour walks through building agents and campaigns, so only people who can build see it
    const { can } = usePermissions();

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

    const handleTourNavigate = (section: string) => {
        if (section === "dashboard") {
            router.push("/dashboard");
        } else {
            router.push(`/dashboard/${section}`);
        }
    };

    return (
        <div className="dashboard-container">
            {/* Dashboard Tour */}
            <DashboardTour
                isOpen={showTour && can("agents.write")}
                onClose={closeTour}
                onComplete={completeTour}
                onNavigate={handleTourNavigate}
            />

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
                activeSection="dashboard"
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
                <SectionGate section="dashboard">
                    <DashboardSection />
                </SectionGate>
            </main>
        </div>
    );
}
