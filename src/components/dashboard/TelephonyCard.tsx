"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle, Check, Link2, Loader, Phone, PhoneIncoming, Plus, RefreshCw, ShieldCheck, Trash2, X,
} from "lucide-react";
import {
    AvailableNumber, Connection, OrgNumber, Provider, ProviderInfo,
    connectProvider, disconnectProvider, fetchAvailableNumbers, fetchConnections, fetchNumbers,
    importNumbers, releaseNumber, updateNumber, verifyConnection,
} from "@/lib/telephonyApi";
import { fetchAgentsByUser } from "@/lib/agentApi";
import { useToast } from "@/components/ui/toast";

interface Agent {
    _id: string;
    name: string;
}

const card: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(0, 200, 255, 0.15)",
    borderRadius: "14px",
    padding: "18px 20px",
};
const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 200, 255, 0.2)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
};
const primaryButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
    color: "white",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
};
const quietButton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    background: "transparent",
    color: "#D1D5DB",
    fontSize: "13px",
    cursor: "pointer",
};
const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
    padding: "12px",
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: "14px",
};

function since(value?: string): string {
    if (!value) return "not checked yet";
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (days <= 0) return "checked today";
    if (days === 1) return "checked yesterday";
    return `checked ${days} days ago`;
}

/** Connect your own Twilio, Plivo or Telnyx account, and put your numbers to work. */
export default function TelephonyCard({ canManage, canAssign }: { canManage: boolean; canAssign: boolean }) {
    const toast = useToast();
    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [numbers, setNumbers] = useState<OrgNumber[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const [connecting, setConnecting] = useState<Provider | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState<Provider | null>(null);
    const [available, setAvailable] = useState<AvailableNumber[] | null>(null);
    const [picked, setPicked] = useState<Set<string>>(new Set());

    const showError = toast.error;
    const load = useCallback(async () => {
        const [connectionsRes, numbersRes] = await Promise.all([fetchConnections(), fetchNumbers()]);
        if (connectionsRes.success && connectionsRes.data) {
            setConnections(connectionsRes.data.connections);
            setProviders(connectionsRes.data.providers);
        } else {
            showError("Could not load your providers", connectionsRes.message);
        }
        if (numbersRes.success && numbersRes.data) setNumbers(numbersRes.data.numbers);
        setLoading(false);
    }, [showError]);

    useEffect(() => {
        void load();
        const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
        if (userId) {
            void fetchAgentsByUser(userId).then((res) => {
                if (res.success) setAgents((res.data as Agent[]) ?? []);
            });
        }
    }, [load]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <Loader size={24} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    const connectionFor = (provider: Provider) => connections.find((c) => c.provider === provider);

    const submitConnection = async (info: ProviderInfo) => {
        const missing = info.fields.filter((field) => field.required && !form[field.key]?.trim());
        if (missing.length) {
            toast.error("Fill everything in", `${missing[0].label} is needed to connect ${info.name}.`);
            return;
        }
        setBusy(info.provider);
        const meta: Record<string, string> = {};
        for (const field of info.fields) {
            if (field.key !== "accountId" && field.key !== "secret" && form[field.key]?.trim()) {
                meta[field.key] = form[field.key].trim();
            }
        }
        const res = await connectProvider({
            provider: info.provider,
            accountId: form.accountId?.trim(),
            secret: form.secret?.trim() ?? "",
            meta,
        });
        setBusy(null);
        if (!res.success) {
            toast.error(`${info.name} not connected`, res.message);
            return;
        }
        toast.success(`${info.name} connected`, `Talkrix checked the details with ${info.name}.`);
        setConnecting(null);
        setForm({});
        await load();
    };

    const check = async (provider: Provider) => {
        setBusy(provider);
        const res = await verifyConnection(provider);
        setBusy(null);
        if (!res.success) {
            toast.error("Could not check", res.message);
        } else if (res.data?.status === "active") {
            toast.success("Still working", `${res.data.accountName ?? "The account"} answered.`);
        } else {
            toast.warning("Needs attention", res.data?.verifyError ?? "The provider refused these details.");
        }
        await load();
    };

    const disconnect = async (info: ProviderInfo) => {
        if (!confirm(`Disconnect ${info.name}? Numbers from this account stop taking calls.`)) return;
        setBusy(info.provider);
        const res = await disconnectProvider(info.provider);
        setBusy(null);
        if (!res.success) {
            toast.error("Not disconnected", res.message);
            return;
        }
        toast.success(`${info.name} disconnected`);
        await load();
    };

    const openImport = async (provider: Provider) => {
        setImporting(provider);
        setAvailable(null);
        setPicked(new Set());
        const res = await fetchAvailableNumbers(provider);
        if (!res.success || !res.data) {
            toast.error("Could not read the numbers", res.message);
            setImporting(null);
            return;
        }
        setAvailable(res.data.numbers);
    };

    const runImport = async () => {
        if (!importing || picked.size === 0) return;
        setBusy("import");
        const res = await importNumbers(importing, Array.from(picked));
        setBusy(null);
        if (!res.success || !res.data) {
            toast.error("Could not import", res.message);
            return;
        }
        const { imported, failed } = res.data;
        if (imported.length) {
            toast.success(
                `${imported.length} number${imported.length === 1 ? "" : "s"} imported`,
                "Incoming calls now come to Talkrix. Pick the agent that answers them below.",
            );
        }
        if (failed.length) toast.warning(`${failed.length} skipped`, failed[0].reason);
        setImporting(null);
        setAvailable(null);
        await load();
    };

    const assign = async (number: OrgNumber, agentId: string) => {
        const res = await updateNumber(number.id, { inboundAgentId: agentId || null });
        if (!res.success) {
            toast.error("Not saved", res.message);
            return;
        }
        toast.success(
            agentId ? "Agent set" : "Agent removed",
            agentId ? `${number.e164} is answered by ${res.data?.inboundAgentName ?? "your agent"}.` : `${number.e164} won't be answered.`,
        );
        await load();
    };

    const toggleOutbound = async (number: OrgNumber) => {
        const res = await updateNumber(number.id, { outboundEnabled: !number.outboundEnabled });
        if (!res.success) toast.error("Not saved", res.message);
        await load();
    };

    const release = async (number: OrgNumber) => {
        if (!confirm(`Stop using ${number.e164}? Its calls go back to your provider settings.`)) return;
        setBusy(number.id);
        const res = await releaseNumber(number.id);
        setBusy(null);
        if (!res.success) {
            toast.error("Not released", res.message);
            return;
        }
        toast.success(`${number.e164} released`);
        await load();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: "0 0 6px" }}>
                    Your provider accounts
                </h3>
                <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
                    Talkrix places calls through your own Twilio, Plivo or Telnyx account, so your telecom
                    relationship stays yours. Tokens are checked with the provider and stored encrypted — they are
                    never shown again.
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {providers.map((info) => {
                    const connection = connectionFor(info.provider);
                    const broken = connection?.status === "invalid";
                    return (
                        <div key={info.provider} style={{ ...card, borderColor: broken ? "rgba(251, 191, 36, 0.35)" : card.border as string }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 600 }}>
                                    <Phone size={16} style={{ color: "#00C8FF" }} />
                                    {info.name}
                                </span>
                                {connection && (
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            fontSize: "12px",
                                            padding: "3px 10px",
                                            borderRadius: "999px",
                                            background: broken ? "rgba(251, 191, 36, 0.15)" : "rgba(34, 197, 94, 0.15)",
                                            color: broken ? "#fbbf24" : "#22c55e",
                                        }}
                                    >
                                        {broken ? <AlertCircle size={12} /> : <ShieldCheck size={12} />}
                                        {broken ? "Needs attention" : "Connected"}
                                    </span>
                                )}
                            </div>

                            {connection && connecting !== info.provider ? (
                                <>
                                    <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", margin: "0 0 4px" }}>
                                        {connection.accountName ?? "Account connected"}
                                    </p>
                                    <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "12px", margin: 0 }}>
                                        {connection.accountId ? `${connection.accountId} · ` : ""}
                                        {since(connection.lastVerifiedAt)}
                                    </p>
                                    {broken && connection.verifyError && (
                                        <p style={{ color: "#fbbf24", fontSize: "12px", margin: "8px 0 0", lineHeight: 1.5 }}>
                                            {connection.verifyError}
                                        </p>
                                    )}
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                                        {canManage && (
                                            <button onClick={() => void check(info.provider)} style={quietButton} disabled={busy === info.provider}>
                                                {busy === info.provider ? <Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />}
                                                Check now
                                            </button>
                                        )}
                                        {canManage && (
                                            <button onClick={() => void openImport(info.provider)} style={quietButton}>
                                                <Plus size={13} /> Import numbers
                                            </button>
                                        )}
                                        {canManage && (
                                            <button
                                                onClick={() => {
                                                    setForm({});
                                                    setConnecting(info.provider);
                                                }}
                                                style={quietButton}
                                            >
                                                <Link2 size={13} /> Replace
                                            </button>
                                        )}
                                        {canManage && (
                                            <button onClick={() => void disconnect(info)} style={{ ...quietButton, color: "#FF3C64", borderColor: "rgba(255, 60, 100, 0.3)" }}>
                                                <Trash2 size={13} /> Disconnect
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : connecting === info.provider ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {info.fields.map((field) => (
                                        <div key={field.key}>
                                            <label htmlFor={`${info.provider}-${field.key}`} style={{ display: "block", fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "6px" }}>
                                                {field.label}
                                                {!field.required && <span style={{ color: "rgba(255,255,255,0.35)" }}> (optional)</span>}
                                            </label>
                                            <input
                                                id={`${info.provider}-${field.key}`}
                                                type={field.secret ? "password" : "text"}
                                                autoComplete="off"
                                                value={form[field.key] ?? ""}
                                                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                                                style={inputStyle}
                                            />
                                            {field.hint && (
                                                <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "11px", margin: "5px 0 0", lineHeight: 1.5 }}>{field.hint}</p>
                                            )}
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button onClick={() => void submitConnection(info)} disabled={busy === info.provider} style={primaryButton}>
                                            {busy === info.provider ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                                            Connect
                                        </button>
                                        <button onClick={() => { setConnecting(null); setForm({}); }} style={quietButton}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "13px", margin: "0 0 14px", lineHeight: 1.6 }}>
                                        Not connected. {canManage ? `Paste your ${info.name} details to place and take calls on your own numbers.` : "Ask an owner or admin to connect it."}
                                    </p>
                                    {canManage && (
                                        <button onClick={() => { setForm({}); setConnecting(info.provider); }} style={primaryButton}>
                                            <Link2 size={14} /> Connect {info.name}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Numbers */}
            <div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: "0 0 6px" }}>Your numbers</h3>
                <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "13px", margin: "0 0 14px", lineHeight: 1.6 }}>
                    Imported numbers take incoming calls through Talkrix and can be used to dial out from campaigns.
                </p>

                {numbers.length === 0 ? (
                    <div style={{ ...card, textAlign: "center", padding: "32px 20px" }}>
                        <PhoneIncoming size={28} style={{ color: "rgba(0, 200, 255, 0.35)", marginBottom: "10px" }} />
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px", margin: 0 }}>
                            No numbers yet. Connect a provider above, then use <strong>Import numbers</strong>.
                        </p>
                    </div>
                ) : (
                    <div style={{ ...card, padding: 0, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                    <th style={thStyle}>Number</th>
                                    <th style={thStyle}>Answered by</th>
                                    <th style={thStyle}>Dial out</th>
                                    <th style={thStyle}>Incoming calls</th>
                                    {canManage && <th style={{ ...thStyle, textAlign: "right" }}>Release</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {numbers.map((number) => (
                                    <tr key={number.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                                        <td style={{ ...tdStyle, color: "white", whiteSpace: "nowrap" }}>
                                            {number.e164}
                                            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>
                                                {number.provider}
                                                {number.label ? ` · ${number.label}` : ""}
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <select
                                                aria-label={`Agent answering ${number.e164}`}
                                                value={number.inboundAgentId ?? ""}
                                                disabled={!canAssign}
                                                onChange={(e) => void assign(number, e.target.value)}
                                                style={{ ...inputStyle, maxWidth: "220px", cursor: canAssign ? "pointer" : "default" }}
                                            >
                                                <option value="">Nobody yet</option>
                                                {agents.map((agent) => (
                                                    <option key={agent._id} value={agent._id} style={{ background: "#1A1A2E" }}>
                                                        {agent.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={tdStyle}>
                                            <button
                                                onClick={() => canAssign && void toggleOutbound(number)}
                                                aria-pressed={number.outboundEnabled}
                                                disabled={!canAssign}
                                                style={{
                                                    ...quietButton,
                                                    color: number.outboundEnabled ? "#22c55e" : "rgba(255,255,255,0.5)",
                                                    borderColor: number.outboundEnabled ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.15)",
                                                    cursor: canAssign ? "pointer" : "default",
                                                }}
                                            >
                                                {number.outboundEnabled ? <Check size={13} /> : <X size={13} />}
                                                {number.outboundEnabled ? "Allowed" : "Off"}
                                            </button>
                                        </td>
                                        <td style={tdStyle}>
                                            {number.webhook.configured ? (
                                                <span style={{ color: "#22c55e", fontSize: "13px" }}>Coming to Talkrix</span>
                                            ) : (
                                                <span style={{ color: "#fbbf24", fontSize: "13px" }} title={number.webhook.error}>
                                                    Not set up at the provider
                                                </span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td style={{ ...tdStyle, textAlign: "right" }}>
                                                <button
                                                    onClick={() => void release(number)}
                                                    disabled={busy === number.id}
                                                    aria-label={`Release ${number.e164}`}
                                                    style={{ ...quietButton, color: "#FF3C64", borderColor: "rgba(255, 60, 100, 0.3)" }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Import picker */}
            {importing && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }} onClick={() => setImporting(null)}>
                    <div style={{ background: "#1a1a2e", border: "1px solid rgba(0, 200, 255, 0.2)", borderRadius: "16px", padding: "24px", width: "min(520px, 100%)", maxHeight: "80vh", overflowY: "auto", boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <h3 style={{ fontSize: "17px", fontWeight: 600, color: "white", margin: 0 }}>
                                Import numbers
                            </h3>
                            <button onClick={() => setImporting(null)} aria-label="Close" style={{ ...quietButton, padding: "6px 10px" }}>
                                <X size={14} />
                            </button>
                        </div>
                        <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "13px", margin: "0 0 16px", lineHeight: 1.6 }}>
                            Talkrix will point these numbers&apos; incoming calls at itself, inside your own account.
                        </p>

                        {available === null ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                                <Loader size={20} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
                            </div>
                        ) : available.length === 0 ? (
                            <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}>
                                There are no voice numbers in this account yet. Buy one in your provider&apos;s console first.
                            </p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {available.map((number) => (
                                    <label
                                        key={number.e164}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            padding: "10px 12px",
                                            borderRadius: "10px",
                                            border: "1px solid rgba(255, 255, 255, 0.08)",
                                            background: number.imported ? "rgba(255,255,255,0.02)" : "transparent",
                                            cursor: number.imported ? "default" : "pointer",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            disabled={number.imported}
                                            checked={picked.has(number.e164)}
                                            onChange={() => {
                                                const next = new Set(picked);
                                                if (next.has(number.e164)) next.delete(number.e164);
                                                else next.add(number.e164);
                                                setPicked(next);
                                            }}
                                            style={{ width: "16px", height: "16px", accentColor: "#00C8FF" }}
                                        />
                                        <span style={{ color: "white", fontSize: "14px" }}>{number.e164}</span>
                                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                                            {number.imported ? "already imported" : (number.label ?? "")}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                            <button onClick={() => void runImport()} disabled={picked.size === 0 || busy === "import"} style={{ ...primaryButton, opacity: picked.size === 0 ? 0.5 : 1, cursor: picked.size === 0 ? "not-allowed" : "pointer" }}>
                                {busy === "import" ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
                                Import {picked.size > 0 ? `${picked.size} number${picked.size === 1 ? "" : "s"}` : ""}
                            </button>
                            <button onClick={() => setImporting(null)} style={quietButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
