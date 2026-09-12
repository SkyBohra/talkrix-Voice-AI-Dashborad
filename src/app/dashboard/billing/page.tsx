"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import SectionGate from "@/components/dashboard/SectionGate";
import BillingSection from "@/components/dashboard/BillingSection";
import { clearSession } from "@/lib/session";

export default function BillingPage() {
    const router = useRouter();

    useEffect(() => {
        if (!localStorage.getItem("token")) router.push("/login");
    }, [router]);

    const handleLogout = () => {
        clearSession();
        router.push("/login");
    };

    return (
        <div className="dashboard-container">
            <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", zIndex: 1 }} />
            <Sidebar
                activeSection="billing"
                onSectionChange={(section) => router.push(section === "dashboard" ? "/dashboard" : `/dashboard/${section}`)}
                onLogout={handleLogout}
            />
            <main className="dashboard-main">
                <SectionGate section="billing">
                    <BillingSection />
                </SectionGate>
            </main>
        </div>
    );
}
