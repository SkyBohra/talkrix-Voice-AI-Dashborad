"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createApiKey, listApiKeys, revokeApiKey, type ApiKeyInfo, type ApiKeyRole } from "@/lib/orgApi";

const ACCESS: Record<ApiKeyRole, { label: string; hint: string }> = {
    integration: { label: "Full integration", hint: "Runs calls and campaigns, and manages agents and knowledge bases." },
    read_only: { label: "Read-only", hint: "Reads calls, agents, campaigns and usage. Changes nothing." },
};

const field: React.CSSProperties = {
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(0, 200, 255, 0.15)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
};
const smallButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 200, 255, 0.25)",
    background: "rgba(0, 200, 255, 0.08)",
    color: "#00C8FF",
    fontSize: "13px",
    cursor: "pointer",
    whiteSpace: "nowrap",
};
const muted: React.CSSProperties = { fontSize: "12px", color: "rgba(255, 255, 255, 0.45)" };

function shortDate(value: string | null): string {
    if (!value) return "never";
    return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** The organization's API keys. A key's secret is shown once, right after it is created. */
export default function ApiKeysCard() {
    const toast = useToast();
    const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [role, setRole] = useState<ApiKeyRole>("integration");
    const [creating, setCreating] = useState(false);
    const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [loadError, setLoadError] = useState("");

    const load = useCallback(async () => {
        const res = await listApiKeys();
        if (res.success && res.data) {
            setKeys(res.data);
            setLoadError("");
        } else {
            setLoadError(res.message || "Couldn't load API keys.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        const res = await createApiKey(name.trim() || "API key", role);
        if (res.success && res.data) {
            setNewKey({ key: res.data.key, name: res.data.apiKey.name });
            setCopied(false);
            setShowForm(false);
            setName("");
            setRole("integration");
            await load();
        } else {
            toast.error("Key not created", res.message);
        }
        setCreating(false);
    };

    const copy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Couldn't copy", "Select the key and copy it by hand.");
        }
    };

    const revoke = async (key: ApiKeyInfo) => {
        if (!confirm(`Revoke "${key.name}" (${key.prefix}…)? Anything using it stops working immediately.`)) return;
        setRevoking(key.id);
        const res = await revokeApiKey(key.id);
        if (res.success) {
            toast.success("API key revoked", `${key.name} no longer works.`);
            await load();
        } else {
            toast.error("Key not revoked", res.message);
        }
        setRevoking(null);
    };

    return (
        <div style={{ padding: "20px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Key size={18} style={{ color: "#00C8FF" }} /> API keys
                </h3>
                {!showForm && (
                    <button type="button" onClick={() => setShowForm(true)} style={smallButton}>
                        <Plus size={14} /> New key
                    </button>
                )}
            </div>
            <p style={{ ...muted, margin: "0 0 16px", lineHeight: 1.5 }}>
                Keys let your CRM or scripts call the Talkrix API for this organization. Send one in the{" "}
                <code style={{ color: "rgba(255,255,255,0.7)" }}>X-API-Key</code> header. Each key is shown only once.
            </p>

            {newKey && (
                <div style={{ marginBottom: "16px", padding: "14px 16px", borderRadius: "10px", border: "1px solid rgba(0, 255, 136, 0.3)", background: "rgba(0, 255, 136, 0.05)" }}>
                    <div style={{ fontSize: "13px", color: "white", marginBottom: "8px" }}>
                        Copy <strong>{newKey.name}</strong> now — you won&apos;t be able to see it again.
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <code style={{ flex: "1 1 260px", minWidth: 0, padding: "9px 12px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.3)", color: "#7fe9ff", fontSize: "13px", overflowWrap: "anywhere" }}>
                            {newKey.key}
                        </code>
                        <button type="button" onClick={() => copy(newKey.key)} style={{ ...smallButton, color: copied ? "#00FF88" : smallButton.color }}>
                            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setNewKey(null)}
                        style={{ marginTop: "10px", background: "none", border: "none", padding: 0, color: "rgba(255,255,255,0.6)", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
                    >
                        I&apos;ve saved it
                    </button>
                </div>
            )}

            {showForm && (
                <form onSubmit={create} style={{ marginBottom: "16px", padding: "14px", borderRadius: "10px", border: "1px solid rgba(0, 200, 255, 0.15)", background: "rgba(0, 0, 0, 0.15)" }}>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={80}
                            placeholder="Name, e.g. CRM sync"
                            aria-label="Key name"
                            style={{ ...field, flex: "2 1 200px" }}
                        />
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as ApiKeyRole)}
                            aria-label="Access"
                            style={{ ...field, flex: "1 1 160px", background: "#0d1628", cursor: "pointer" }}
                        >
                            {(Object.keys(ACCESS) as ApiKeyRole[]).map((value) => (
                                <option key={value} value={value}>
                                    {ACCESS[value].label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={creating}
                            style={{ ...smallButton, border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", padding: "10px 16px" }}
                        >
                            {creating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />} Create key
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} style={{ ...smallButton, background: "transparent", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)" }}>
                            Cancel
                        </button>
                    </div>
                    <p style={{ ...muted, margin: "10px 0 0" }}>{ACCESS[role].hint} Keys never manage members, billing, telephony or other keys.</p>
                </form>
            )}

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
                    <Loader2 size={20} color="#00C8FF" style={{ animation: "spin 1s linear infinite" }} />
                </div>
            ) : loadError ? (
                <p style={{ fontSize: "13px", color: "#FF3C64", margin: 0 }}>{loadError}</p>
            ) : keys.length === 0 ? (
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.55)", margin: 0 }}>No API keys yet.</p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {keys.map((key) => (
                        <div
                            key={key.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                                padding: "12px 14px",
                                borderRadius: "10px",
                                border: "1px solid rgba(0, 200, 255, 0.1)",
                                background: "rgba(255, 255, 255, 0.03)",
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "14px", color: "white" }}>{key.name}</span>
                                    <code style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{key.prefix}…</code>
                                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", color: "#00C8FF", border: "1px solid rgba(0, 200, 255, 0.25)" }}>
                                        {ACCESS[key.role]?.label ?? key.role}
                                    </span>
                                </div>
                                <div style={{ ...muted, marginTop: "4px" }}>
                                    Created {shortDate(key.createdAt)} · Last used {shortDate(key.lastUsedAt)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => revoke(key)}
                                disabled={revoking === key.id}
                                style={{ ...smallButton, borderColor: "rgba(255, 60, 100, 0.3)", background: "rgba(255, 60, 100, 0.08)", color: "#FF3C64" }}
                            >
                                {revoking === key.id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />} Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
