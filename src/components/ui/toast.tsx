"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

const toastConfig: Record<ToastType, { icon: React.ElementType; bgColor: string; borderColor: string; iconColor: string; progressColor: string }> = {
    success: {
        icon: CheckCircle,
        bgColor: "rgba(16, 40, 28, 0.95)",
        borderColor: "rgba(34, 197, 94, 0.5)",
        iconColor: "#22c55e",
        progressColor: "#22c55e",
    },
    error: {
        icon: XCircle,
        bgColor: "rgba(50, 20, 20, 0.95)",
        borderColor: "rgba(239, 68, 68, 0.5)",
        iconColor: "#ef4444",
        progressColor: "#ef4444",
    },
    warning: {
        icon: AlertTriangle,
        bgColor: "rgba(50, 40, 15, 0.95)",
        borderColor: "rgba(245, 158, 11, 0.5)",
        iconColor: "#f59e0b",
        progressColor: "#f59e0b",
    },
    info: {
        icon: Info,
        bgColor: "rgba(15, 35, 50, 0.95)",
        borderColor: "rgba(0, 200, 255, 0.5)",
        iconColor: "#00C8FF",
        progressColor: "#00C8FF",
    },
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
    const config = toastConfig[toast.type];
    const Icon = config.icon;

    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove();
        }, toast.duration || 5000);

        return () => clearTimeout(timer);
    }, [toast.duration, onRemove]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${config.borderColor}`,
                minWidth: '320px',
                maxWidth: '420px',
                overflow: 'hidden',
                backdropFilter: 'blur(16px)',
            }}
        >
            {/* Progress bar */}
            <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: (toast.duration || 5000) / 1000, ease: "linear" }}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    backgroundColor: config.progressColor,
                }}
            />

            <div style={{ flexShrink: 0, color: config.iconColor }}>
                <Icon size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                <h4 style={{ 
                    fontWeight: 600, 
                    color: 'white', 
                    fontSize: '14px', 
                    lineHeight: 1.3,
                    margin: 0,
                }}>
                    {toast.title}
                </h4>
                {toast.message && (
                    <p style={{ 
                        marginTop: '4px', 
                        fontSize: '12px', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        lineHeight: 1.4,
                        margin: '4px 0 0 0',
                    }}>
                        {toast.message}
                    </p>
                )}
            </div>

            <button
                onClick={onRemove}
                style={{
                    flexShrink: 0,
                    padding: '4px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                }}
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).substring(2, 11);
        setToasts((prev) => [...prev, { ...toast, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: "success", title, message, duration: 4000 });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: "error", title, message, duration: 6000 });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: "warning", title, message, duration: 5000 });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: "info", title, message, duration: 4000 });
    }, [addToast]);

    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const toastContainer = (
        <div 
            style={{
                position: 'fixed',
                top: '16px',
                right: '16px',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none',
            }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} style={{ pointerEvents: 'auto' }}>
                        <ToastItem
                            toast={toast}
                            onRemove={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            {/* Render toast container using portal to ensure it's at the top of DOM */}
            {mounted && typeof document !== 'undefined' && createPortal(toastContainer, document.body)}
        </ToastContext.Provider>
    );
};
