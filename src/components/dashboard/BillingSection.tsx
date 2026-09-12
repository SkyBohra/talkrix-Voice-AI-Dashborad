"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, Info, Loader, Phone, Save, Wallet } from "lucide-react";
import {
    BillingSummary,
    LedgerType,
    Transaction,
    UsageReport,
    downloadBillingFile,
    fetchBilling,
    fetchTransactions,
    fetchUsage,
    updateLowBalanceAlert,
} from "@/lib/billingApi";
import TopUpCard from "./TopUpCard";
import BillingProfileCard from "./BillingProfileCard";
import InvoicesCard from "./InvoicesCard";
import { formatDuration, formatInr, formatRate, paiseFromRupees } from "@/lib/money";
import { usePermissions } from "@/lib/useMe";
import { useToast } from "@/components/ui/toast";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 25;

const TYPE_LABELS: Record<LedgerType, string> = {
    opening: "Opening credits",
    topup: "Credits added",
    call_charge: "Call",
    promo: "Promo credits",
    adjustment: "Adjustment",
    refund: "Refund",
    reversal: "Reversal",
    expiry: "Credits expired",
};

const panel: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(0, 200, 255, 0.15)",
    borderRadius: "16px",
    padding: "clamp(16px, 3vw, 24px)",
};
const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: "12px",
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
    padding: "14px 16px",
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: "14px",
    whiteSpace: "nowrap",
};
const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 200, 255, 0.2)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
};

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function monthStart(): string {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/** Credits, what calls cost, and where the money went. */
export default function BillingSection() {
    const toast = useToast();
    const { can } = usePermissions();
    const canManage = can("billing.manage");

    const [summary, setSummary] = useState<BillingSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [txTotal, setTxTotal] = useState(0);
    const [txPages, setTxPages] = useState(1);
    const [txPage, setTxPage] = useState(1);
    const [usage, setUsage] = useState<UsageReport | null>(null);
    const [from, setFrom] = useState(monthStart);
    const [to, setTo] = useState(today);
    const [alertInput, setAlertInput] = useState("");
    const [savingAlert, setSavingAlert] = useState(false);
    // Bumped after a payment so the invoices and transactions reload
    const [paidAt, setPaidAt] = useState(0);

    const showError = toast.error;

    const loadSummary = useCallback(async () => {
        const res = await fetchBilling();
        if (res.success && res.data) {
            setSummary(res.data);
            setAlertInput((res.data.lowBalancePaise / 100).toFixed(2));
        } else {
            showError("Could not load your credits", res.message);
        }
        setLoading(false);
    }, [showError]);

    const loadTransactions = useCallback(async (page: number) => {
        const res = await fetchTransactions(page, PAGE_SIZE);
        if (res.success && res.data) {
            setTransactions(res.data.entries);
            setTxTotal(res.data.total);
            setTxPages(Math.max(res.data.pages, 1));
        }
    }, []);

    const loadUsage = useCallback(async (start: string, end: string) => {
        const res = await fetchUsage(start, end);
        if (res.success && res.data) setUsage(res.data);
    }, []);

    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        void loadTransactions(txPage);
    }, [txPage, paidAt, loadTransactions]);

    useEffect(() => {
        void loadUsage(from, to);
    }, [from, to, loadUsage]);

    const afterPayment = useCallback(() => {
        setPaidAt(Date.now());
        void loadSummary();
    }, [loadSummary]);

    const downloadCsv = async (path: string, filename: string) => {
        const problem = await downloadBillingFile(path, filename);
        if (problem) toast.error("Could not download the file", problem);
    };

    const saveAlert = async () => {
        const paise = paiseFromRupees(alertInput);
        if (paise === null || paise < 0) {
            toast.error("Enter an amount", "For example 500 for ₹500.");
            return;
        }
        setSavingAlert(true);
        const res = await updateLowBalanceAlert(paise);
        setSavingAlert(false);
        if (!res.success) {
            toast.error("Not saved", res.message);
            return;
        }
        toast.success("Warning updated", `You'll be warned below ${formatInr(paise)}.`);
        await loadSummary();
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <Loader size={32} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    if (!summary) {
        return (
            <div style={{ padding: "clamp(16px, 4vw, 32px)" }}>
                <div style={{ ...panel, textAlign: "center" }}>
                    <AlertCircle size={32} style={{ color: "#FF3C64", marginBottom: "12px" }} />
                    <p style={{ color: "rgba(255, 255, 255, 0.7)", margin: 0 }}>Credits are not available right now.</p>
                </div>
            </div>
        );
    }

    const empty = summary.availablePaise <= 0;
    // Staff decide whether customers see what a minute costs; the API simply leaves the rates out
    const rates = summary.showRates ? summary.plan.rates : undefined;

    return (
        <div style={{ padding: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "white", margin: 0 }}>Billing</h1>
                <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "13px" }}>
                    Your credits, your talk time, and where the money went
                </p>
            </div>

            {!summary.charging && (
                <div style={{ ...panel, marginBottom: "20px", display: "flex", gap: "10px", alignItems: "flex-start", borderColor: "rgba(0, 200, 255, 0.25)" }}>
                    <Info size={18} style={{ color: "#00C8FF", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.75)", fontSize: "14px", lineHeight: 1.6 }}>
                        Calls aren&apos;t being charged yet. Your credits stay where they are until charging
                        starts.{rates ? " Every call is still priced, so you can see what it would cost." : ""}
                    </p>
                </div>
            )}

            {summary.charging && (empty || summary.low) && (
                <div
                    style={{
                        ...panel,
                        marginBottom: "20px",
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        background: empty ? "rgba(255, 60, 100, 0.08)" : "rgba(251, 191, 36, 0.08)",
                        borderColor: empty ? "rgba(255, 60, 100, 0.3)" : "rgba(251, 191, 36, 0.3)",
                    }}
                >
                    <AlertCircle size={18} style={{ color: empty ? "#FF3C64" : "#fbbf24", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ margin: 0, color: empty ? "#FF3C64" : "#fbbf24", fontSize: "14px", lineHeight: 1.6 }}>
                        {empty
                            ? "Your credits have run out. Calls are refused and campaigns are paused until credits are added — ask the Talkrix team for a top-up."
                            : `Only ${formatInr(summary.availablePaise)} left. Top up before your campaigns stop.`}
                    </p>
                </div>
            )}

            {/* Wallet */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div style={{ ...panel, borderColor: empty ? "rgba(255, 60, 100, 0.3)" : "rgba(0, 200, 255, 0.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#00C8FF", marginBottom: "10px" }}>
                        <Wallet size={18} />
                        <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Available credits
                        </span>
                    </div>
                    <p style={{ fontSize: "28px", fontWeight: 700, color: empty ? "#FF3C64" : "white", margin: 0 }}>
                        {formatInr(summary.availablePaise)}
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", margin: "8px 0 0", lineHeight: 1.6 }}>
                        Balance {formatInr(summary.balancePaise)}
                        {summary.heldPaise > 0 && <> · {formatInr(summary.heldPaise)} held by calls running now</>}
                        {summary.creditLimitPaise > 0 && <> · {formatInr(summary.creditLimitPaise)} credit limit</>}
                    </p>
                </div>

                <div style={panel}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a855f7", marginBottom: "10px" }}>
                        <Phone size={18} />
                        <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Talk time left
                        </span>
                    </div>
                    <p style={{ fontSize: "28px", fontWeight: 700, color: "white", margin: 0 }}>
                        {summary.minutesLeft === null ? "Unlimited" : `${summary.minutesLeft.toLocaleString("en-IN")} min`}
                    </p>
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", margin: "8px 0 0" }}>
                        {rates ? <>At {formatRate(rates.outbound)} for outbound calls</> : "On outbound calls"}
                    </p>
                </div>

                {rates && (
                    <div style={panel}>
                        <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Your rates
                        </span>
                        <p style={{ fontSize: "15px", color: "white", margin: "10px 0 0", lineHeight: 1.8 }}>
                            Outbound <strong>{formatRate(rates.outbound)}</strong>
                            <br />
                            Inbound <strong>{formatRate(rates.inbound)}</strong> · Web <strong>{formatRate(rates.web)}</strong>
                        </p>
                        <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", margin: "8px 0 0", lineHeight: 1.6 }}>
                            {summary.plan.custom ? "Your own rates" : summary.plan.name} ·{" "}
                            {summary.plan.pulseSec === 60 ? "charged per minute" : `charged every ${summary.plan.pulseSec}s`}
                            {summary.plan.minBillableSec > 0 && ` · minimum ${summary.plan.minBillableSec}s`}
                        </p>
                    </div>
                )}

                <div style={panel}>
                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Warn me below
                    </span>
                    {canManage ? (
                        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                            <div style={{ position: "relative", flex: 1 }}>
                                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)" }}>₹</span>
                                <input
                                    aria-label="Low balance warning amount in rupees"
                                    inputMode="decimal"
                                    value={alertInput}
                                    onChange={(e) => setAlertInput(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: "26px", width: "100%" }}
                                />
                            </div>
                            <button
                                onClick={saveAlert}
                                disabled={savingAlert}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    cursor: savingAlert ? "not-allowed" : "pointer",
                                }}
                            >
                                {savingAlert ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
                                Save
                            </button>
                        </div>
                    ) : (
                        <p style={{ fontSize: "20px", fontWeight: 600, color: "white", margin: "12px 0 0" }}>
                            {formatInr(summary.lowBalancePaise)}
                        </p>
                    )}
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", margin: "10px 0 0", lineHeight: 1.6 }}>
                        You&apos;re warned by email and here in the app before the credits run out.
                    </p>
                </div>
            </div>

            {canManage && (
                <div style={{ marginBottom: "24px" }}>
                    <TopUpCard onPaid={afterPayment} orgName={summary.plan.name} />
                </div>
            )}

            <div style={{ marginBottom: "24px" }}>
                <BillingProfileCard canEdit={canManage} onSaved={afterPayment} />
            </div>

            <div style={{ marginBottom: "24px" }}>
                <InvoicesCard refreshKey={paidAt} />
            </div>

            {/* Usage */}
            <div style={{ ...panel, marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: 0 }}>Usage</h2>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <input aria-label="From date" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
                        <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>to</span>
                        <input aria-label="To date" type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
                        <button
                            onClick={() => downloadCsv(`/usage.csv?from=${from}&to=${to}`, `talkrix-usage-${from}-to-${to}.csv`)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.3)", background: "transparent", color: "#00C8FF", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                            <Download size={14} />
                            CSV
                        </button>
                    </div>
                </div>
                {usage && usage.days.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                    <th style={thStyle}>Day</th>
                                    <th style={thStyle}>Calls</th>
                                    <th style={thStyle}>Answered</th>
                                    <th style={thStyle}>Talk time</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usage.days.map((day) => (
                                    <tr key={day.day} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                                        <td style={{ ...tdStyle, color: "white" }}>{new Date(day.day).toLocaleDateString()}</td>
                                        <td style={tdStyle}>{day.calls}</td>
                                        <td style={tdStyle}>{day.answeredCalls}</td>
                                        <td style={tdStyle}>{formatDuration(day.billableSec)}</td>
                                        <td style={{ ...tdStyle, textAlign: "right", color: "white" }}>{formatInr(day.amountPaise)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td style={{ ...tdStyle, color: "white", fontWeight: 600 }}>Total</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{usage.totals.calls}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{usage.totals.answeredCalls}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{formatDuration(usage.totals.billableSec)}</td>
                                    <td style={{ ...tdStyle, textAlign: "right", color: "white", fontWeight: 700 }}>
                                        {formatInr(usage.totals.amountPaise)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "14px", margin: 0 }}>No calls in these dates yet.</p>
                )}
            </div>

            {/* Transactions */}
            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: 0 }}>
                        Transactions {txTotal > 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>({txTotal})</span>}
                    </h2>
                    {transactions.length > 0 && (
                        <button
                            onClick={() => downloadCsv("/transactions.csv", `talkrix-transactions-${today()}.csv`)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.3)", background: "transparent", color: "#00C8FF", fontSize: "13px", cursor: "pointer" }}
                        >
                            <Download size={14} />
                            CSV
                        </button>
                    )}
                </div>
                {transactions.length > 0 ? (
                    <>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                        <th style={thStyle}>When</th>
                                        <th style={thStyle}>What</th>
                                        <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                                        <th style={{ ...thStyle, textAlign: "right" }}>Balance after</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((entry) => (
                                        <tr key={entry.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                                            <td style={tdStyle}>{new Date(entry.createdAt).toLocaleString()}</td>
                                            <td style={{ ...tdStyle, whiteSpace: "normal" }}>
                                                <span style={{ color: "white" }}>{TYPE_LABELS[entry.type] ?? entry.type}</span>
                                                {entry.reason && (
                                                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", marginTop: "2px" }}>
                                                        {entry.reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    ...tdStyle,
                                                    textAlign: "right",
                                                    color: entry.amountPaise >= 0 ? "#22c55e" : "#FF3C64",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {entry.amountPaise >= 0 ? "+" : "−"}
                                                {formatInr(Math.abs(entry.amountPaise))}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: "right" }}>
                                                {entry.balanceAfterPaise === null ? "—" : formatInr(entry.balanceAfterPaise)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={txPage}
                            totalPages={txPages}
                            totalItems={txTotal}
                            itemsPerPage={PAGE_SIZE}
                            onPageChange={setTxPage}
                            itemLabel="transactions"
                        />
                    </>
                ) : (
                    <p style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "14px", margin: 0 }}>
                        Nothing yet. Credits added by the Talkrix team and the cost of each call appear here.
                    </p>
                )}
            </div>
        </div>
    );
}
