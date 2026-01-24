"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Bot,
    Wrench,
    Database,
    Settings,
    Mic,
    Phone,
    Megaphone,
    X,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    CheckCircle,
    PlayCircle,
    Plus,
    TestTube,
    History,
    Rocket,
} from "lucide-react";

interface TourStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    highlight: string;
    action?: string;
    actionLabel?: string;
    stepNumber?: string;
}

const tourSteps: TourStep[] = [
    {
        id: "welcome",
        title: "Welcome to Talkrix! 🎉",
        description: "Let's get you started with a guided workflow. We'll walk you through creating your first AI voice agent and making test calls. Follow these steps to master Talkrix!",
        icon: <Sparkles size={28} />,
        highlight: "dashboard",
    },
    {
        id: "step1-agents",
        title: "Step 1: Create Your First Agent",
        description: "Start by creating an AI voice agent. Click on 'Agents' in the sidebar, then click '+ Create Agent'. Define your agent's name, personality, voice, and the system prompt that guides its behavior.",
        icon: <Bot size={28} />,
        highlight: "agents",
        action: "agents",
        actionLabel: "Go to Agents",
        stepNumber: "1",
    },
    {
        id: "step2-voices",
        title: "Step 2: Choose a Voice",
        description: "Select a natural-sounding voice for your agent from our voice library. You can preview different voices to find the perfect match for your brand and use case.",
        icon: <Mic size={28} />,
        highlight: "voices",
        action: "voices",
        actionLabel: "Browse Voices",
        stepNumber: "2",
    },
    {
        id: "step3-tools",
        title: "Step 3: Add Tools (Optional)",
        description: "Enhance your agent with powerful tools. Connect APIs, databases, or custom functions that your agent can use during calls - like booking appointments, checking inventory, or transferring calls.",
        icon: <Wrench size={28} />,
        highlight: "tools",
        action: "tools",
        actionLabel: "View Tools",
        stepNumber: "3",
    },
    {
        id: "step4-rag",
        title: "Step 4: Add Knowledge Base (Optional)",
        description: "Upload documents, FAQs, or product information to create a knowledge base. Your agent will use this to provide accurate, contextual responses to caller questions.",
        icon: <Database size={28} />,
        highlight: "rag",
        action: "rag",
        actionLabel: "Setup Knowledge Base",
        stepNumber: "4",
    },
    {
        id: "step5-test",
        title: "Step 5: Test Your Agent",
        description: "Before going live, test your agent! Go back to Agents, select your agent and click 'Test Agent'. Have a conversation to ensure it responds correctly and handles various scenarios.",
        icon: <TestTube size={28} />,
        highlight: "agents",
        action: "agents",
        actionLabel: "Test Agent",
        stepNumber: "5",
    },
    {
        id: "step6-callhistory",
        title: "Step 6: Review Call History",
        description: "After testing, check the Call History to review your test calls. Listen to recordings, read transcriptions, and analyze how your agent performed. Use these insights to improve.",
        icon: <History size={28} />,
        highlight: "call-history",
        action: "call-history",
        actionLabel: "View Call History",
        stepNumber: "6",
    },
    {
        id: "step7-campaign",
        title: "Step 7: Create a Campaign",
        description: "Ready for real calls? Create a campaign! Go to Campaigns, click '+ Create Campaign', upload your contact list, select your agent, and schedule when calls should be made.",
        icon: <Megaphone size={28} />,
        highlight: "campaign",
        action: "campaign",
        actionLabel: "Create Campaign",
        stepNumber: "7",
    },
    {
        id: "step8-launch",
        title: "Step 8: Launch & Monitor",
        description: "Launch your campaign and monitor results in real-time from the Dashboard. Track call success rates, listen to recordings, and optimize your agent based on actual performance.",
        icon: <Rocket size={28} />,
        highlight: "dashboard",
        action: "dashboard",
        actionLabel: "Go to Dashboard",
        stepNumber: "8",
    },
    {
        id: "settings-info",
        title: "Pro Tip: Configure Settings",
        description: "Don't forget to configure your account settings! Set up webhooks for real-time notifications, manage API keys, and customize your preferences for the best experience.",
        icon: <Settings size={28} />,
        highlight: "settings",
        action: "settings",
        actionLabel: "Open Settings",
    },
    {
        id: "complete",
        title: "You're Ready to Go! 🚀",
        description: "You now know the complete workflow:\n\n1️⃣ Create Agent → 2️⃣ Choose Voice → 3️⃣ Add Tools → 4️⃣ Add Knowledge → 5️⃣ Test Agent → 6️⃣ Review Calls → 7️⃣ Create Campaign → 8️⃣ Launch!\n\nStart with Step 1 - Create your first agent!",
        icon: <CheckCircle size={28} />,
        highlight: "agents",
        action: "agents",
        actionLabel: "Start Creating Agent",
    },
];

interface DashboardTourProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    onNavigate?: (section: string) => void;
}

export default function DashboardTour({ isOpen, onClose, onComplete, onNavigate }: DashboardTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    // Debug log
    useEffect(() => {
        console.log("DashboardTour - isOpen:", isOpen);
    }, [isOpen]);

    const handleNext = useCallback(() => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    }, [currentStep]);

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        setIsExiting(true);
        localStorage.setItem("dashboardTourCompleted", "true");
        setTimeout(() => {
            onComplete();
        }, 300);
    };

    const handleSkip = () => {
        setIsExiting(true);
        localStorage.setItem("dashboardTourCompleted", "true");
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleAction = () => {
        const step = tourSteps[currentStep];
        if (step.action && onNavigate) {
            localStorage.setItem("dashboardTourCompleted", "true");
            onNavigate(step.action);
            onClose();
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "ArrowRight" || e.key === "Enter") {
                handleNext();
            } else if (e.key === "ArrowLeft") {
                handlePrev();
            } else if (e.key === "Escape") {
                handleSkip();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, currentStep, handleNext]);

    const step = tourSteps[currentStep];
    const progress = ((currentStep + 1) / tourSteps.length) * 100;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExiting ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0, 0, 0, 0.85)",
                            backdropFilter: "blur(8px)",
                        }}
                        onClick={handleSkip}
                    />

                    {/* Tour Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.9 : 1, y: isExiting ? 20 : 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: "520px",
                            background: "linear-gradient(135deg, rgba(5, 15, 30, 0.98) 0%, rgba(10, 20, 40, 0.98) 100%)",
                            borderRadius: "24px",
                            border: "1px solid rgba(0, 200, 255, 0.3)",
                            boxShadow: "0 0 60px rgba(0, 200, 255, 0.2), 0 25px 50px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 200, 255, 0.03)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Progress Bar */}
                        <div
                            style={{
                                height: "4px",
                                background: "rgba(255, 255, 255, 0.1)",
                                borderRadius: "4px 4px 0 0",
                            }}
                        >
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                style={{
                                    height: "100%",
                                    background: "linear-gradient(90deg, #00C8FF, #7800FF)",
                                    borderRadius: "4px",
                                }}
                            />
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={handleSkip}
                            style={{
                                position: "absolute",
                                top: "16px",
                                right: "16px",
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "rgba(255, 255, 255, 0.5)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.color = "white";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                            }}
                        >
                            <X size={18} />
                        </button>

                        {/* Content */}
                        <div style={{ padding: "40px 32px 32px" }}>
                            {/* Step Number Badge */}
                            {step.stepNumber && (
                                <motion.div
                                    key={`step-${step.id}`}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        display: "inline-block",
                                        padding: "4px 12px",
                                        borderRadius: "20px",
                                        background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.15) 100%)",
                                        border: "1px solid rgba(0, 200, 255, 0.3)",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#00C8FF",
                                        marginBottom: "16px",
                                    }}
                                >
                                    Step {step.stepNumber} of 8
                                </motion.div>
                            )}

                            {/* Icon */}
                            <motion.div
                                key={step.id}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    width: "72px",
                                    height: "72px",
                                    borderRadius: "20px",
                                    background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.15) 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#00C8FF",
                                    marginBottom: "24px",
                                    boxShadow: "0 0 30px rgba(0, 200, 255, 0.2)",
                                }}
                            >
                                {step.icon}
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                key={`title-${step.id}`}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                style={{
                                    fontSize: "24px",
                                    fontWeight: "700",
                                    color: "white",
                                    marginBottom: "12px",
                                }}
                            >
                                {step.title}
                            </motion.h2>

                            {/* Description */}
                            <motion.p
                                key={`desc-${step.id}`}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.15 }}
                                style={{
                                    fontSize: "15px",
                                    lineHeight: "1.7",
                                    color: "rgba(255, 255, 255, 0.6)",
                                    marginBottom: "32px",
                                    whiteSpace: "pre-line",
                                }}
                            >
                                {step.description}
                            </motion.p>

                            {/* Step Indicators */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    marginBottom: "28px",
                                    flexWrap: "wrap",
                                }}
                            >
                                {tourSteps.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentStep(index)}
                                        style={{
                                            width: index === currentStep ? "20px" : "8px",
                                            height: "8px",
                                            borderRadius: "4px",
                                            background: index === currentStep
                                                ? "linear-gradient(90deg, #00C8FF, #7800FF)"
                                                : index < currentStep
                                                ? "rgba(0, 200, 255, 0.4)"
                                                : "rgba(255, 255, 255, 0.15)",
                                            border: "none",
                                            cursor: "pointer",
                                            transition: "all 0.3s ease",
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Navigation Buttons */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                {currentStep > 0 && (
                                    <button
                                        onClick={handlePrev}
                                        style={{
                                            flex: "0 0 auto",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            padding: "14px 20px",
                                            borderRadius: "12px",
                                            background: "rgba(255, 255, 255, 0.05)",
                                            border: "1px solid rgba(255, 255, 255, 0.15)",
                                            color: "rgba(255, 255, 255, 0.7)",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                            e.currentTarget.style.color = "white";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                            e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                                        }}
                                    >
                                        <ArrowLeft size={16} />
                                        Back
                                    </button>
                                )}
                                
                                {/* Action Button - Go to section */}
                                {step.action && step.actionLabel && (
                                    <button
                                        onClick={handleAction}
                                        style={{
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            padding: "14px 20px",
                                            borderRadius: "12px",
                                            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                                            border: "none",
                                            color: "white",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            boxShadow: "0 0 20px rgba(34, 197, 94, 0.3)",
                                            transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = "0 0 30px rgba(34, 197, 94, 0.5)";
                                            e.currentTarget.style.transform = "translateY(-2px)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = "0 0 20px rgba(34, 197, 94, 0.3)";
                                            e.currentTarget.style.transform = "translateY(0)";
                                        }}
                                    >
                                        <PlayCircle size={16} />
                                        {step.actionLabel}
                                    </button>
                                )}

                                <button
                                    onClick={handleNext}
                                    style={{
                                        flex: step.action ? "0 0 auto" : 1,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        padding: "14px 20px",
                                        borderRadius: "12px",
                                        background: step.action 
                                            ? "rgba(255, 255, 255, 0.05)"
                                            : "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                        border: step.action ? "1px solid rgba(255, 255, 255, 0.15)" : "none",
                                        color: step.action ? "rgba(255, 255, 255, 0.7)" : "white",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        boxShadow: step.action ? "none" : "0 0 30px rgba(0, 200, 255, 0.3)",
                                        transition: "all 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (step.action) {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                            e.currentTarget.style.color = "white";
                                        } else {
                                            e.currentTarget.style.boxShadow = "0 0 40px rgba(0, 200, 255, 0.5)";
                                            e.currentTarget.style.transform = "translateY(-2px)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (step.action) {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                            e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                                        } else {
                                            e.currentTarget.style.boxShadow = "0 0 30px rgba(0, 200, 255, 0.3)";
                                            e.currentTarget.style.transform = "translateY(0)";
                                        }
                                    }}
                                >
                                    {currentStep === tourSteps.length - 1 ? "Finish Tour" : (step.action ? "Skip" : "Next")}
                                    <ArrowRight size={16} />
                                </button>
                            </div>

                            {/* Skip text */}
                            {currentStep < tourSteps.length - 1 && (
                                <p
                                    style={{
                                        textAlign: "center",
                                        marginTop: "16px",
                                        fontSize: "13px",
                                        color: "rgba(255, 255, 255, 0.4)",
                                    }}
                                >
                                    Press <span style={{ color: "#00C8FF" }}>Esc</span> to skip tour
                                </p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Helper function to mark tour as completed in backend
async function markTourCompletedInBackend() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/complete-tour`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });
    } catch (error) {
        console.error("Failed to mark tour as completed in backend:", error);
    }
}

// Hook to check if tour should be shown
export function useDashboardTour() {
    const [showTour, setShowTour] = useState(false);
    const [isFirstLogin, setIsFirstLogin] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        // Small delay to ensure localStorage is properly set after navigation
        const checkTour = () => {
            const tourCompleted = localStorage.getItem("dashboardTourCompleted");
            const isNewUser = localStorage.getItem("isFirstLogin");
            
            console.log("Tour check - isNewUser:", isNewUser, "tourCompleted:", tourCompleted);
            
            if (isNewUser === "true" && tourCompleted !== "true") {
                setShowTour(true);
                setIsFirstLogin(true);
                // Clear the first login flag
                localStorage.removeItem("isFirstLogin");
            }
            setIsChecked(true);
        };

        // Check immediately
        checkTour();
        
        // Also check after a small delay in case of race condition
        const timer = setTimeout(checkTour, 100);
        
        return () => clearTimeout(timer);
    }, []);

    const startTour = () => setShowTour(true);
    const closeTour = () => {
        setShowTour(false);
        localStorage.setItem("dashboardTourCompleted", "true");
        // Mark as completed in backend
        markTourCompletedInBackend();
    };
    const completeTour = () => {
        setShowTour(false);
        localStorage.setItem("dashboardTourCompleted", "true");
        // Mark as completed in backend
        markTourCompletedInBackend();
    };

    const resetTour = () => {
        localStorage.removeItem("dashboardTourCompleted");
        setShowTour(true);
    };

    return {
        showTour,
        isFirstLogin,
        isChecked,
        startTour,
        closeTour,
        completeTour,
        resetTour,
    };
}
