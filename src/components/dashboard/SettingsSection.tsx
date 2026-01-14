"use client";

import { useState } from "react";
import { Settings, User, Bell, Shield, Key, Globe, Palette, Save, Check } from "lucide-react";

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
}

export default function SettingsSection() {
    const [activeTab, setActiveTab] = useState("profile");
    const [saved, setSaved] = useState(false);
    const [settings, setSettings] = useState<SettingsState>({
        profile: {
            name: "John Doe",
            email: "john@example.com",
            company: "Acme Inc",
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
            timezone: "UTC-5",
            theme: "dark",
        },
    });

    const tabs = [
        { id: "profile", label: "Profile", icon: <User size={18} /> },
        { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
        { id: "security", label: "Security", icon: <Shield size={18} /> },
        { id: "preferences", label: "Preferences", icon: <Palette size={18} /> },
    ];

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
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
                    padding: "20px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
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

    return (
        <div style={{ padding: "32px", maxWidth: "1400px" }}>
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "8px" }}>
                    Settings
                </h1>
                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
                    Manage your account settings and preferences.
                </p>
            </div>

            <div style={{ display: "flex", gap: "32px" }}>
                {/* Tabs */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        minWidth: "200px",
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
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        background: "linear-gradient(135deg, rgba(5, 15, 30, 0.8) 0%, rgba(10, 20, 40, 0.7) 100%)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(0, 200, 255, 0.15)",
                        borderRadius: "16px",
                        padding: "32px",
                    }}
                >
                    {activeTab === "profile" && renderProfileTab()}
                    {activeTab === "notifications" && renderNotificationsTab()}
                    {activeTab === "security" && renderSecurityTab()}
                    {activeTab === "preferences" && renderPreferencesTab()}

                    {/* Save Button */}
                    <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <button
                            onClick={handleSave}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 24px",
                                borderRadius: "10px",
                                border: "none",
                                background: saved
                                    ? "rgba(34, 197, 94, 0.2)"
                                    : "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                color: saved ? "#22c55e" : "white",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                        >
                            {saved ? <Check size={16} /> : <Save size={16} />}
                            {saved ? "Saved!" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
