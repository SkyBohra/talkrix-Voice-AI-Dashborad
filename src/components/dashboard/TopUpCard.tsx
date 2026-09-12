"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Info, Loader, Plus } from "lucide-react";
import {
    TopupOptions,
    confirmTopup,
    fetchTopupOptions,
    startTopup,
} from "@/lib/billingApi";
import { formatInr, paiseFromRupees } from "@/lib/money";
import { useToast } from "@/components/ui/toast";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

type RazorpayInstance = { open: () => void; on: (event: string, handler: (payload: unknown) => void) => void };

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
    }
}

/** Razorpay's Checkout window is loaded only when someone actually wants to pay. */
function loadCheckout(): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (window.Razorpay) return Promise.resolve(true);
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = CHECKOUT_SCRIPT;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

const panel: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(0, 200, 255, 0.15)",
    borderRadius: "16px",
    padding: "clamp(16px, 3vw, 24px)",
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

/** Buy credits: pick an amount, see the GST, pay, and the credits land straight away. */
export default function TopUpCard({ onPaid, orgName }: { onPaid: () => void; orgName?: string }) {
    const toast = useToast();
    const [options, setOptions] = useState<TopupOptions | null>(null);
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const showError = toast.error;
    const load = useCallback(
        async (creditsPaise?: number) => {
            const res = await fetchTopupOptions(creditsPaise);
            if (res.success && res.data) {
                setOptions(res.data);
                if (!creditsPaise) setAmount(String(res.data.quote.creditsPaise / 100));
            } else {
                showError("Could not load the top-up options", res.message);
            }
            setLoading(false);
        },
        [showError],
    );

    useEffect(() => {
        void load();
    }, [load]);

    // Re-price whenever the amount settles
    const creditsPaise = paiseFromRupees(amount);
    useEffect(() => {
        if (creditsPaise === null || creditsPaise <= 0) return;
        const timer = setTimeout(() => void load(creditsPaise), 400);
        return () => clearTimeout(timer);
    }, [creditsPaise, load]);

    if (loading) {
        return (
            <div style={{ ...panel, display: "flex", justifyContent: "center" }}>
                <Loader size={20} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
            </div>
        );
    }
    if (!options) return null;

    const quote = options.quote;
    const tooSmall = creditsPaise !== null && creditsPaise < options.minPaise;
    const tooBig = creditsPaise !== null && creditsPaise > options.maxPaise;
    const canPay = options.online && creditsPaise !== null && !tooSmall && !tooBig;

    const pay = async () => {
        if (creditsPaise === null) return;
        setBusy(true);
        const ready = await loadCheckout();
        if (!ready) {
            setBusy(false);
            toast.error("Could not open the payment window", "Check your connection and try again.");
            return;
        }
        const started = await startTopup(creditsPaise);
        if (!started.success || !started.data) {
            setBusy(false);
            toast.error("Could not start the payment", started.message);
            return;
        }
        const order = started.data;
        const checkout = new window.Razorpay!({
            key: order.keyId,
            order_id: order.orderId,
            amount: order.amountPaise,
            currency: "INR",
            name: "Talkrix",
            description: `${formatInr(order.quote.creditsPaise)} of calling credits`,
            notes: { organization: orgName ?? "" },
            theme: { color: "#00C8FF" },
            modal: { ondismiss: () => setBusy(false) },
            handler: async (response: RazorpaySuccess) => {
                const confirmed = await confirmTopup({
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                });
                setBusy(false);
                if (!confirmed.success) {
                    toast.warning(
                        "Payment received",
                        "We're confirming it with Razorpay; your credits appear within a minute.",
                    );
                } else {
                    toast.success(
                        "Credits added",
                        `${formatInr(order.quote.creditsPaise)} is in your wallet. The invoice is below.`,
                    );
                }
                onPaid();
            },
        });
        checkout.on("payment.failed", () => {
            setBusy(false);
            toast.error("The payment didn't go through", "Nothing was charged. You can try again.");
        });
        checkout.open();
    };

    return (
        <div style={panel}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <CreditCard size={18} style={{ color: "#00C8FF" }} />
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: 0 }}>Add credits</h2>
            </div>

            {!options.online ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <Info size={16} style={{ color: "#00C8FF", flexShrink: 0, marginTop: "2px" }} />
                    <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", lineHeight: 1.6 }}>
                        Online payments aren&apos;t switched on yet. Ask the Talkrix team to add credits — a tax
                        invoice is issued for every payment, and it shows up here.
                    </p>
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                        {options.presetsPaise.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => setAmount(String(preset / 100))}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: "999px",
                                    border:
                                        creditsPaise === preset
                                            ? "1px solid rgba(0, 200, 255, 0.5)"
                                            : "1px solid rgba(255, 255, 255, 0.12)",
                                    background: creditsPaise === preset ? "rgba(0, 200, 255, 0.12)" : "transparent",
                                    color: creditsPaise === preset ? "#00C8FF" : "#9CA3AF",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                }}
                            >
                                {formatInr(preset, { decimals: false })}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "start" }}>
                        <div>
                            <label htmlFor="topup-amount" style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>
                                Credits to add
                            </label>
                            <div style={{ position: "relative" }}>
                                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)" }}>₹</span>
                                <input
                                    id="topup-amount"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: "26px", width: "100%" }}
                                />
                            </div>
                            <p style={{ fontSize: "12px", color: tooSmall || tooBig ? "#fbbf24" : "rgba(255, 255, 255, 0.45)", margin: "6px 0 0" }}>
                                {tooSmall
                                    ? `The smallest top-up is ${formatInr(options.minPaise, { decimals: false })}`
                                    : tooBig
                                      ? `The largest is ${formatInr(options.maxPaise, { decimals: false })} at a time`
                                      : `From ${formatInr(options.minPaise, { decimals: false })}. Credits never expire.`}
                            </p>
                        </div>

                        <div style={{ background: "rgba(0, 0, 0, 0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255, 255, 255, 0.7)", fontSize: "14px" }}>
                                <span>Credits</span>
                                <span>{formatInr(quote.creditsPaise)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255, 255, 255, 0.55)", fontSize: "13px", marginTop: "6px" }}>
                                <span>
                                    GST {quote.ratePercent}%
                                    {quote.igstPaise > 0 ? " (IGST)" : quote.cgstPaise > 0 ? " (CGST + SGST)" : ""}
                                </span>
                                <span>{formatInr(quote.taxPaise)}</span>
                            </div>
                            <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.1)", margin: "10px 0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontWeight: 700 }}>
                                <span>To pay</span>
                                <span>{formatInr(quote.totalPaise)}</span>
                            </div>
                            <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", margin: "10px 0 0", lineHeight: 1.5 }}>
                                {quote.buyerGstin
                                    ? `Invoiced to ${quote.buyerGstin}${quote.placeOfSupply ? ` · ${quote.placeOfSupply}` : ""}`
                                    : "Add your GSTIN below to claim input credit on the invoice."}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={pay}
                        disabled={!canPay || busy}
                        style={{
                            marginTop: "16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 20px",
                            borderRadius: "8px",
                            border: "none",
                            background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                            color: "white",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: canPay && !busy ? "pointer" : "not-allowed",
                            opacity: canPay && !busy ? 1 : 0.5,
                        }}
                    >
                        {busy ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
                        Pay {formatInr(quote.totalPaise)}
                    </button>
                </>
            )}
        </div>
    );
}
