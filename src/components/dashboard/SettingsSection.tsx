"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { User, Bell, Shield, Key, Palette, Save, Check, Phone, Server, Eye, EyeOff, Plus, Trash2, Lock, LogOut, Loader2 } from "lucide-react";
import { getSettings, updateTelephonySettings, TelephonyProvider } from "@/lib/settingsApi";
import { useToast } from "@/components/ui/toast";
import ApiKeysCard from "./ApiKeysCard";
import { usePermissions } from "@/lib/useMe";
import { logoutEverywhere } from "@/lib/orgApi";
import { clearSession } from "@/lib/session";

interface SettingsState {
    profile: {
        name: string;
        email: string;
        company: string;
    };
    notifications: {
        emailAlerts: boolean;
        callSummaries: boolean;
        weeklyReports: boolean;
        agentErrors: boolean;
    };
    security: {
        twoFactorEnabled: boolean;
        sessionTimeout: string;
    };
    preferences: {
        language: string;
        timezone: string;
        theme: string;
    };
    general: {
        maxConcurrentCalls: number;
        maxRagDocuments: number;
        maxAgents: number;
        maxCorpora: number;
        maxSeats: number;
    };
    telephony: {
        provider: TelephonyProvider;
        plivoAuthId: string;
        plivoAuthToken: string;
        plivoPhoneNumbers: string[];
        twilioAccountSid: string;
        twilioAuthToken: string;
        twilioPhoneNumbers: string[];
        telnyxApiKey: string;
        telnyxPhoneNumbers: string[];
        telnyxConnectionId: string;
        telnyxPublicKey: string;
    };
}

export default function SettingsSection() {
    const toast = useToast();
    const searchParams = useSearchParams();
    const { can, known } = usePermissions();
    const canManageTelephony = can("telephony.manage");
    const canManageKeys = can("apikeys.manage");
    const [activeTab, setActiveTab] = useState("profile");
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showTelephonySecrets, setShowTelephonySecrets] = useState(false);
    const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);

    // Set active tab from URL query parameter
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && ["profile", "telephony", "limits", "notifications", "security", "preferences"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);
    const [settings, setSettings] = useState<SettingsState>({
        profile: {
            name: "",
            email: "",
            company: "",
        },
        notifications: {
            emailAlerts: true,
            callSummaries: true,
            weeklyReports: false,
            agentErrors: true,
        },
        security: {
            twoFactorEnabled: false,
            sessionTimeout: "30",
        },
        preferences: {
            language: "English",
            timezone: "UTC+5:30",
            theme: "dark",
        },
        general: {
            maxConcurrentCalls: 0,
            maxRagDocuments: 0,
            maxAgents: 0,
            maxCorpora: 0,
            maxSeats: 0,
        },
        telephony: {
            provider: "none",
            plivoAuthId: "",
            plivoAuthToken: "",
            plivoPhoneNumbers: [""],
            twilioAccountSid: "",
            twilioAuthToken: "",
            twilioPhoneNumbers: [""],
            telnyxApiKey: "",
            telnyxPhoneNumbers: [""],
            telnyxConnectionId: "",
            telnyxPublicKey: "",
        },
    });
    // Identifiers as loaded (masked, e.g. "AC12****cdef"); sent back only when someone types a new one
    const [loadedIds, setLoadedIds] = useState({ plivoAuthId: "", twilioAccountSid: "" });

    // Load settings from API
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await getSettings();
                if (res.success && res.data) {
                    // Parse phone numbers - could be array or single string
                    const parsePhoneNumbers = (data: any): string[] => {
                        if (Array.isArray(data)) return data.length > 0 ? data : [""];
                        if (typeof data === "string" && data) return [data];
                        return [""];
                    };

                    setLoadedIds({
                        plivoAuthId: res.data!.telephony.plivoAuthId || "",
                        twilioAccountSid: res.data!.telephony.twilioAccountSid || "",
                    });
                    setSettings(prev => ({
                        ...prev,
                        general: {
                            maxConcurrentCalls: res.data!.general.maxConcurrentCalls,
                            maxRagDocuments: res.data!.general.maxRagDocuments,
                            maxAgents: res.data!.general.maxAgents,
                            maxCorpora: res.data!.general.maxCorpora ?? res.data!.maxCorpusLimit ?? 0,
                            maxSeats: res.data!.general.maxSeats ?? 0,
                        },
                        telephony: {
                            provider: res.data!.telephony.provider,
                            plivoAuthId: res.data!.telephony.plivoAuthId || "",
                            plivoAuthToken: "",
                            plivoPhoneNumbers: parsePhoneNumbers(res.data!.telephony.plivoPhoneNumbers || res.data!.telephony.plivoPhoneNumber),
                            twilioAccountSid: res.data!.telephony.twilioAccountSid || "",
                            twilioAuthToken: "",
                            twilioPhoneNumbers: parsePhoneNumbers(res.data!.telephony.twilioPhoneNumbers || res.data!.telephony.twilioPhoneNumber),
                            telnyxApiKey: "",
                            telnyxPhoneNumbers: parsePhoneNumbers(res.data!.telephony.telnyxPhoneNumbers || res.data!.telephony.telnyxPhoneNumber),
                            telnyxConnectionId: res.data!.telephony.telnyxConnectionId || "",
                            telnyxPublicKey: res.data!.telephony.telnyxPublicKey || "",
                        },
                        profile: {
                            ...prev.profile,
                            name: localStorage.getItem("userName") || "",
                            email: localStorage.getItem("userEmail") || "",
                            company: localStorage.getItem("orgName") || "",
                        },
                    }));
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const tabs = [
        { id: "profile", label: "Profile", icon: <User size={18} /> },
        { id: "telephony", label: "Telephony", icon: <Phone size={18} /> },
        { id: "limits", label: "Limits & API", icon: <Server size={18} /> },
        { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
        { id: "security", label: "Security", icon: <Shield size={18} /> },
        { id: "preferences", label: "Preferences", icon: <Palette size={18} /> },
    ];

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeTab === "telephony") {
                const telephonyData: any = {
                    provider: settings.telephony.provider,
                };
                
                // Filter out empty phone numbers
                const filterPhones = (phones: string[]) => phones.filter(p => p.trim() !== "");

                // Only include non-empty values; identifiers are shown masked, so send them only when retyped
                const changedId = (value: string, loaded: string) => value && value !== loaded;
                if (changedId(settings.telephony.plivoAuthId, loadedIds.plivoAuthId)) telephonyData.plivoAuthId = settings.telephony.plivoAuthId;
                if (settings.telephony.plivoAuthToken) telephonyData.plivoAuthToken = settings.telephony.plivoAuthToken;
                const plivoPhones = filterPhones(settings.telephony.plivoPhoneNumbers);
                if (plivoPhones.length > 0) telephonyData.plivoPhoneNumbers = plivoPhones;

                if (changedId(settings.telephony.twilioAccountSid, loadedIds.twilioAccountSid)) telephonyData.twilioAccountSid = settings.telephony.twilioAccountSid;
                if (settings.telephony.twilioAuthToken) telephonyData.twilioAuthToken = settings.telephony.twilioAuthToken;
                const twilioPhones = filterPhones(settings.telephony.twilioPhoneNumbers);
                if (twilioPhones.length > 0) telephonyData.twilioPhoneNumbers = twilioPhones;

                if (settings.telephony.telnyxApiKey) telephonyData.telnyxApiKey = settings.telephony.telnyxApiKey;
                const telnyxPhones = filterPhones(settings.telephony.telnyxPhoneNumbers);
                if (telnyxPhones.length > 0) telephonyData.telnyxPhoneNumbers = telnyxPhones;
                if (settings.telephony.telnyxConnectionId) telephonyData.telnyxConnectionId = settings.telephony.telnyxConnectionId;
                if (settings.telephony.telnyxPublicKey.trim()) telephonyData.telnyxPublicKey = settings.telephony.telnyxPublicKey.trim();

                const res = await updateTelephonySettings(telephonyData);
                if (res.success) {
                    toast.success("Settings Saved", "Telephony settings updated successfully.");
                    setLoadedIds({
                        plivoAuthId: telephonyData.plivoAuthId ?? loadedIds.plivoAuthId,
                        twilioAccountSid: telephonyData.twilioAccountSid ?? loadedIds.twilioAccountSid,
                    });
                } else {
                    toast.error("Save Failed", res.message || "Failed to update telephony settings.");
                    return;
                }
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err: any) {
            console.error("Failed to save settings:", err);
            toast.error("Error", err?.message || "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoutEverywhere = async () => {
        if (!confirm("Sign out of Talkrix on every device, including this one?")) return;
        setSigningOutEverywhere(true);
        const res = await logoutEverywhere();
        if (res.success) {
            clearSession();
            window.location.href = "/login";
            return;
        }
        toast.error("Couldn't sign out everywhere", res.message);
        setSigningOutEverywhere(false);
    };

    // Phone number management helpers
    const addPhoneNumber = (provider: 'plivo' | 'twilio' | 'telnyx') => {
        const key = `${provider}PhoneNumbers` as keyof typeof settings.telephony;
        setSettings(prev => ({
            ...prev,
            telephony: {
                ...prev.telephony,
                [key]: [...(prev.telephony[key] as string[]), ""],
            },
        }));
    };

    const removePhoneNumber = (provider: 'plivo' | 'twilio' | 'telnyx', index: number) => {
        const key = `${provider}PhoneNumbers` as keyof typeof settings.telephony;
        setSettings(prev => ({
            ...prev,
            telephony: {
                ...prev.telephony,
                [key]: (prev.telephony[key] as string[]).filter((_, i) => i !== index),
            },
        }));
    };

    const updatePhoneNumber = (provider: 'plivo' | 'twilio' | 'telnyx', index: number, value: string) => {
        const key = `${provider}PhoneNumbers` as keyof typeof settings.telephony;
        setSettings(prev => ({
            ...prev,
            telephony: {
                ...prev.telephony,
                [key]: (prev.telephony[key] as string[]).map((p, i) => i === index ? value : p),
            },
        }));
    };

    const renderProfileTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                    Full Name
                </label>
                <input
                    type="text"
                    value={settings.profile.name}
                    onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, name: e.target.value } })}
                    style={{
                        width: "100%",
                        maxWidth: "400px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "white",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                />
            </div>
            <div>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                    Email Address
                </label>
                <input
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, email: e.target.value } })}
                    style={{
                        width: "100%",
                        maxWidth: "400px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "white",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                />
            </div>
            <div>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                    Company
                </label>
                <input
                    type="text"
                    value={settings.profile.company}
                    onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, company: e.target.value } })}
                    style={{
                        width: "100%",
                        maxWidth: "400px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "white",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                />
            </div>
        </div>
    );

    const renderNotificationsTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
                { key: "emailAlerts", label: "Email Alerts", description: "Receive email notifications for important events" },
                { key: "callSummaries", label: "Call Summaries", description: "Get summaries after each call session" },
                { key: "weeklyReports", label: "Weekly Reports", description: "Receive weekly analytics reports" },
                { key: "agentErrors", label: "Agent Errors", description: "Get notified when an agent encounters an error" },
            ].map((item) => (
                <div
                    key={item.key}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(0, 200, 255, 0.15)",
                        borderRadius: "12px",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 200, 255, 0.1)";
                        e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                    }}
                >
                    <div>
                        <p style={{ fontSize: "14px", fontWeight: "500", color: "white", marginBottom: "4px" }}>{item.label}</p>
                        <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>{item.description}</p>
                    </div>
                    <button
                        onClick={() => setSettings({
                            ...settings,
                            notifications: {
                                ...settings.notifications,
                                [item.key]: !settings.notifications[item.key as keyof typeof settings.notifications]
                            }
                        })}
                        style={{
                            width: "48px",
                            height: "26px",
                            borderRadius: "13px",
                            border: "none",
                            background: settings.notifications[item.key as keyof typeof settings.notifications]
                                ? "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)"
                                : "rgba(0, 200, 255, 0.1)",
                            cursor: "pointer",
                            position: "relative",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <div
                            style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "white",
                                position: "absolute",
                                top: "3px",
                                left: settings.notifications[item.key as keyof typeof settings.notifications] ? "25px" : "3px",
                                transition: "all 0.2s ease",
                            }}
                        />
                    </button>
                </div>
            ))}
        </div>
    );

    const renderSecurityTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                    padding: "20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(0, 200, 255, 0.15)",
                    borderRadius: "12px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                        style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            background: "rgba(0, 200, 255, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#00C8FF",
                            flexShrink: 0,
                        }}
                    >
                        <LogOut size={20} />
                    </div>
                    <div>
                        <p style={{ fontSize: "14px", fontWeight: "500", color: "white", marginBottom: "4px" }}>Sign out everywhere</p>
                        <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                            Ends every session on every device. Use it if you lost a device or shared your password.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLogoutEverywhere}
                    disabled={signingOutEverywhere}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 60, 100, 0.3)",
                        background: "rgba(255, 60, 100, 0.1)",
                        color: "#FF3C64",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: signingOutEverywhere ? "default" : "pointer",
                    }}
                >
                    {signingOutEverywhere && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                    Sign out everywhere
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(0, 200, 255, 0.15)",
                    borderRadius: "12px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0, 200, 255, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                        style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            background: "rgba(0, 200, 255, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#00C8FF",
                        }}
                    >
                        <Key size={20} />
                    </div>
                    <div>
                        <p style={{ fontSize: "14px", fontWeight: "500", color: "white", marginBottom: "4px" }}>Two-Factor Authentication</p>
                        <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>Add an extra layer of security to your account</p>
                    </div>
                </div>
                <button
                    onClick={() => setSettings({
                        ...settings,
                        security: { ...settings.security, twoFactorEnabled: !settings.security.twoFactorEnabled }
                    })}
                    style={{
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: settings.security.twoFactorEnabled ? "1px solid rgba(255, 60, 100, 0.3)" : "none",
                        background: settings.security.twoFactorEnabled ? "rgba(255, 60, 100, 0.1)" : "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                        color: settings.security.twoFactorEnabled ? "#FF3C64" : "white",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: "pointer",
                    }}
                >
                    {settings.security.twoFactorEnabled ? "Disable" : "Enable"}
                </button>
            </div>

            <div>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                    Session Timeout (minutes)
                </label>
                <select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, security: { ...settings.security, sessionTimeout: e.target.value } })}
                    style={{
                        width: "100%",
                        maxWidth: "200px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "white",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                </select>
            </div>

            <button
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 60, 100, 0.3)",
                    background: "rgba(255, 60, 100, 0.1)",
                    color: "#FF3C64",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    width: "fit-content",
                }}
            >
                Change Password
            </button>
        </div>
    );

    const renderPreferencesTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                    Language
                </label>
                <select
                    value={settings.preferences.language}
                    onChange={(e) => setSettings({ ...settings, preferences: { ...settings.preferences, language: e.target.value } })}
                    style={{
                        width: "100%",
                        maxWidth: "300px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "white",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                </select>
            </div>

            <div>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                    Timezone
                </label>
                <select
                    value={settings.preferences.timezone}
                    onChange={(e) => setSettings({ ...settings, preferences: { ...settings.preferences, timezone: e.target.value } })}
                    style={{
                        width: "100%",
                        maxWidth: "300px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "white",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                >
                    <option value="UTC-8">Pacific Time (UTC-8)</option>
                    <option value="UTC-5">Eastern Time (UTC-5)</option>
                    <option value="UTC+0">UTC</option>
                    <option value="UTC+1">Central European (UTC+1)</option>
                    <option value="UTC+5:30">India Standard Time (UTC+5:30)</option>
                </select>
            </div>

            <div>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "12px" }}>
                    Theme
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                    {["dark", "light", "system"].map((theme) => (
                        <button
                            key={theme}
                            onClick={() => setSettings({ ...settings, preferences: { ...settings.preferences, theme } })}
                            style={{
                                padding: "12px 24px",
                                borderRadius: "10px",
                                border: settings.preferences.theme === theme
                                    ? "1px solid #00C8FF"
                                    : "1px solid rgba(0, 200, 255, 0.1)",
                                background: settings.preferences.theme === theme
                                    ? "rgba(0, 200, 255, 0.1)"
                                    : "rgba(255, 255, 255, 0.02)",
                                color: settings.preferences.theme === theme ? "#00C8FF" : "rgba(255, 255, 255, 0.6)",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                textTransform: "capitalize",
                            }}
                        >
                            {theme}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderTelephonyTab = () => {
        const inputStyle = {
            width: "100%",
            maxWidth: "400px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(0, 200, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.05)",
            color: "white",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box" as const,
        };

        const renderPhoneNumbers = (provider: 'plivo' | 'twilio' | 'telnyx', phones: string[]) => (
            <div>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px", maxWidth: "400px" }}>
                    <span>Phone Numbers</span>
                    <button
                        type="button"
                        onClick={() => addPhoneNumber(provider)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid rgba(0, 200, 255, 0.3)",
                            background: "rgba(0, 200, 255, 0.1)",
                            color: "#00C8FF",
                            fontSize: "12px",
                            cursor: "pointer",
                        }}
                    >
                        <Plus size={14} /> Add
                    </button>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {phones.map((phone, index) => (
                        <div key={index} style={{ display: "flex", gap: "8px", maxWidth: "400px" }}>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => updatePhoneNumber(provider, index, e.target.value)}
                                placeholder={`+1234567890 (Phone ${index + 1})`}
                                style={{ ...inputStyle, flex: 1, maxWidth: "unset" }}
                            />
                            {phones.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removePhoneNumber(provider, index)}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(255, 60, 100, 0.3)",
                                        background: "rgba(255, 60, 100, 0.1)",
                                        color: "#FF3C64",
                                        cursor: "pointer",
                                    }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "8px" }}>
                    Add multiple phone numbers to use for outbound calls
                </p>
            </div>
        );

        return (
            // Only people who manage telephony can change it; everyone else sees it read-only
            <fieldset disabled={!canManageTelephony} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {known && !canManageTelephony && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", background: "rgba(0, 200, 255, 0.06)", border: "1px solid rgba(0, 200, 255, 0.2)" }}>
                        <Lock size={16} style={{ color: "#00C8FF", flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: "13px", color: "rgba(255, 255, 255, 0.7)" }}>
                            Only owners and admins can change telephony. You can see the provider and numbers.
                        </p>
                    </div>
                )}
                {/* Provider Selection */}
                <div>
                    <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                        Telephony Provider
                    </label>
                    <select
                        value={settings.telephony.provider}
                        onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, provider: e.target.value as TelephonyProvider } })}
                        style={{
                            width: "100%",
                            maxWidth: "300px",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "1px solid rgba(0, 200, 255, 0.1)",
                            background: "#1a1a2e",
                            color: "white",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                            cursor: "pointer",
                        }}
                    >
                        <option value="none" style={{ background: "#1a1a2e", color: "white" }}>None</option>
                        <option value="plivo" style={{ background: "#1a1a2e", color: "white" }}>Plivo</option>
                        <option value="twilio" style={{ background: "#1a1a2e", color: "white" }}>Twilio</option>
                        <option value="telnyx" style={{ background: "#1a1a2e", color: "white" }}>Telnyx</option>
                    </select>
                </div>

                {/* Plivo Settings */}
                {settings.telephony.provider === "plivo" && (
                    <div style={{ 
                        padding: "20px", 
                        background: "rgba(255, 255, 255, 0.03)", 
                        border: "1px solid rgba(0, 200, 255, 0.15)", 
                        borderRadius: "12px" 
                    }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Phone size={18} style={{ color: "#00C8FF" }} /> Plivo Configuration
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Auth ID
                                </label>
                                <input
                                    type="text"
                                    value={settings.telephony.plivoAuthId}
                                    onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, plivoAuthId: e.target.value } })}
                                    placeholder="Enter Plivo Auth ID"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Auth Token
                                </label>
                                <div style={{ display: "flex", gap: "8px", maxWidth: "400px" }}>
                                    <input
                                        type={showTelephonySecrets ? "text" : "password"}
                                        value={settings.telephony.plivoAuthToken}
                                        onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, plivoAuthToken: e.target.value } })}
                                        placeholder="Enter Plivo Auth Token"
                                        style={{ ...inputStyle, flex: 1, maxWidth: "unset" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowTelephonySecrets(!showTelephonySecrets)}
                                        style={{
                                            padding: "12px",
                                            borderRadius: "10px",
                                            border: "1px solid rgba(0, 200, 255, 0.1)",
                                            background: "rgba(255, 255, 255, 0.05)",
                                            color: "rgba(255, 255, 255, 0.6)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {showTelephonySecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {renderPhoneNumbers('plivo', settings.telephony.plivoPhoneNumbers)}
                        </div>
                    </div>
                )}

                {/* Twilio Settings */}
                {settings.telephony.provider === "twilio" && (
                    <div style={{ 
                        padding: "20px", 
                        background: "rgba(255, 255, 255, 0.03)", 
                        border: "1px solid rgba(0, 200, 255, 0.15)", 
                        borderRadius: "12px" 
                    }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Phone size={18} style={{ color: "#00C8FF" }} /> Twilio Configuration
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Account SID
                                </label>
                                <input
                                    type="text"
                                    value={settings.telephony.twilioAccountSid}
                                    onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, twilioAccountSid: e.target.value } })}
                                    placeholder="Enter Twilio Account SID"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Auth Token
                                </label>
                                <div style={{ display: "flex", gap: "8px", maxWidth: "400px" }}>
                                    <input
                                        type={showTelephonySecrets ? "text" : "password"}
                                        value={settings.telephony.twilioAuthToken}
                                        onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, twilioAuthToken: e.target.value } })}
                                        placeholder="Enter Twilio Auth Token"
                                        style={{ ...inputStyle, flex: 1, maxWidth: "unset" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowTelephonySecrets(!showTelephonySecrets)}
                                        style={{
                                            padding: "12px",
                                            borderRadius: "10px",
                                            border: "1px solid rgba(0, 200, 255, 0.1)",
                                            background: "rgba(255, 255, 255, 0.05)",
                                            color: "rgba(255, 255, 255, 0.6)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {showTelephonySecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {renderPhoneNumbers('twilio', settings.telephony.twilioPhoneNumbers)}
                        </div>
                    </div>
                )}

                {/* Telnyx Settings */}
                {settings.telephony.provider === "telnyx" && (
                    <div style={{ 
                        padding: "20px", 
                        background: "rgba(255, 255, 255, 0.03)", 
                        border: "1px solid rgba(0, 200, 255, 0.15)", 
                        borderRadius: "12px" 
                    }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Phone size={18} style={{ color: "#00C8FF" }} /> Telnyx Configuration
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    API Key
                                </label>
                                <div style={{ display: "flex", gap: "8px", maxWidth: "400px" }}>
                                    <input
                                        type={showTelephonySecrets ? "text" : "password"}
                                        value={settings.telephony.telnyxApiKey}
                                        onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, telnyxApiKey: e.target.value } })}
                                        placeholder="Enter Telnyx API Key"
                                        style={{ ...inputStyle, flex: 1, maxWidth: "unset" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowTelephonySecrets(!showTelephonySecrets)}
                                        style={{
                                            padding: "12px",
                                            borderRadius: "10px",
                                            border: "1px solid rgba(0, 200, 255, 0.1)",
                                            background: "rgba(255, 255, 255, 0.05)",
                                            color: "rgba(255, 255, 255, 0.6)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {showTelephonySecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {renderPhoneNumbers('telnyx', settings.telephony.telnyxPhoneNumbers)}
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Connection ID
                                </label>
                                <input
                                    type="text"
                                    value={settings.telephony.telnyxConnectionId}
                                    onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, telnyxConnectionId: e.target.value } })}
                                    placeholder="Enter Telnyx Connection ID"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Public Key
                                </label>
                                <input
                                    type="text"
                                    value={settings.telephony.telnyxPublicKey}
                                    onChange={(e) => setSettings({ ...settings, telephony: { ...settings.telephony, telnyxPublicKey: e.target.value } })}
                                    placeholder="From Telnyx Mission Control → Keys & Credentials"
                                    style={inputStyle}
                                />
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "8px", maxWidth: "400px" }}>
                                    Talkrix uses it to check that call updates really come from Telnyx. Without it, Telnyx call statuses are rejected.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </fieldset>
        );
    };

    const renderLimitsTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* API keys belong to the organization; owners and admins manage them */}
            {canManageKeys ? (
                <ApiKeysCard />
            ) : known ? (
                <div style={{
                    padding: "20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(0, 200, 255, 0.15)",
                    borderRadius: "12px"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Key size={18} style={{ color: "#00C8FF" }} /> API keys
                    </h3>
                    <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.55)", margin: 0 }}>
                        Owners and admins create and revoke this organization&apos;s API keys.
                    </p>
                </div>
            ) : null}

            {/* Limits Section */}
            <div style={{ 
                padding: "20px", 
                background: "rgba(255, 255, 255, 0.03)", 
                border: "1px solid rgba(0, 200, 255, 0.15)", 
                borderRadius: "12px" 
            }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Server size={18} style={{ color: "#00C8FF" }} /> Usage Limits
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                        { label: "Concurrent calls", value: settings.general.maxConcurrentCalls, hint: "Calls that can be live at the same time, across all campaigns" },
                        { label: "Agents", value: settings.general.maxAgents, hint: "Agents your organization can create" },
                        { label: "Knowledge bases", value: settings.general.maxCorpora, hint: "RAG knowledge bases" },
                        { label: "RAG documents", value: settings.general.maxRagDocuments, hint: "Documents per knowledge base" },
                        { label: "Team seats", value: settings.general.maxSeats, hint: "Members plus pending invitations" },
                    ].map((limit) => (
                        <div
                            key={limit.label}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "16px",
                                padding: "12px 16px",
                                borderRadius: "10px",
                                border: "1px solid rgba(0, 200, 255, 0.1)",
                                background: "rgba(255, 255, 255, 0.03)",
                            }}
                        >
                            <div>
                                <div style={{ fontSize: "14px", color: "white" }}>{limit.label}</div>
                                <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", marginTop: "2px" }}>{limit.hint}</div>
                            </div>
                            <div style={{ fontSize: "18px", fontWeight: 600, color: "#00C8FF", fontVariantNumeric: "tabular-nums" }}>
                                {limit.value}
                            </div>
                        </div>
                    ))}
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", margin: "4px 0 0" }}>
                        Limits come with your Talkrix plan. To change them, contact support.
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ 
            padding: "clamp(16px, 4vw, 40px)",
            width: "100%",
            boxSizing: "border-box",
        }}>
            <style>{`
                @media (max-width: 900px) {
                    .settings-layout {
                        flex-direction: column !important;
                        gap: 20px !important;
                    }
                    .settings-tabs {
                        flex-direction: row !important;
                        overflow-x: auto !important;
                        min-width: 100% !important;
                        gap: 4px !important;
                        padding: 4px !important;
                        background: rgba(255, 255, 255, 0.03) !important;
                        border-radius: 12px !important;
                    }
                    .settings-tabs button {
                        flex-shrink: 0;
                        padding: 10px 16px !important;
                        white-space: nowrap;
                    }
                    .settings-tabs button span {
                        display: none;
                    }
                    .settings-content {
                        padding: 20px !important;
                    }
                }
                @media (max-width: 600px) {
                    .settings-tabs button {
                        padding: 10px 12px !important;
                    }
                    .settings-input-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .settings-toggle-row {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                    }
                }
            `}</style>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "700", color: "white", marginBottom: "8px" }}>
                    Settings
                </h1>
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>
                    Manage your account settings and preferences.
                </p>
            </div>

            <div className="settings-layout" style={{ display: "flex", gap: "32px" }}>
                {/* Tabs - Fixed sidebar */}
                <div
                    className="settings-tabs"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        minWidth: "200px",
                        flexShrink: 0,
                    }}
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                borderRadius: "10px",
                                border: "none",
                                background: activeTab === tab.id
                                    ? "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.2) 100%)"
                                    : "transparent",
                                color: activeTab === tab.id ? "#00C8FF" : "rgba(255, 255, 255, 0.6)",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                textAlign: "left",
                            }}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content area */}
                <div
                    className="settings-content"
                    style={{
                        flex: 1,
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(0, 200, 255, 0.15)",
                        borderRadius: "12px",
                        padding: "clamp(16px, 3vw, 32px)",
                        minWidth: 0,
                    }}
                >
                    {loading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
                            <p style={{ color: "rgba(255, 255, 255, 0.5)" }}>Loading settings...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === "profile" && renderProfileTab()}
                            {activeTab === "telephony" && renderTelephonyTab()}
                            {activeTab === "limits" && renderLimitsTab()}
                            {activeTab === "notifications" && renderNotificationsTab()}
                            {activeTab === "security" && renderSecurityTab()}
                            {activeTab === "preferences" && renderPreferencesTab()}

                            {/* Save Button - Only show for tabs that save to backend */}
                            {activeTab === "telephony" && canManageTelephony && (
                                <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "12px 20px",
                                            borderRadius: "10px",
                                            border: "none",
                                            background: saved
                                                ? "rgba(34, 197, 94, 0.2)"
                                                : saving
                                                    ? "rgba(0, 200, 255, 0.3)"
                                                    : "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                            color: saved ? "#22c55e" : "white",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            cursor: saving ? "not-allowed" : "pointer",
                                            transition: "all 0.2s ease",
                                            opacity: saving ? 0.7 : 1,
                                            width: "100%",
                                            maxWidth: "200px",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {saved ? <Check size={16} /> : <Save size={16} />}
                                        {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
