"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Loader, Plus, Search, Trash2 } from "lucide-react";
import { addDncNumbers, DncNumber, fetchDncNumbers, removeDncNumber } from "@/lib/dncApi";
import { usePermissions } from "@/lib/useMe";
import { useToast } from "@/components/ui/toast";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 50;
const MAX_PER_ADD = 5000;

const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", whiteSpace: "nowrap" };
const panel: React.CSSProperties = { background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "16px", padding: "clamp(16px, 3vw, 24px)" };

function splitNumbers(text: string): string[] {
    return text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
}

/** The organization's do-not-call list: numbers no campaign, test call or API call will ever dial. */
export default function DoNotCallSection() {
    const router = useRouter();
    const toast = useToast();
    const { can } = usePermissions();
    const canEdit = can("campaigns.write");

    const [numbers, setNumbers] = useState<DncNumber[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const [draft, setDraft] = useState("");
    const [reason, setReason] = useState("");
    const [adding, setAdding] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<DncNumber | null>(null);
    const [removing, setRemoving] = useState(false);

    // The toast functions are stable; the toast object itself changes with every toast shown
    const showError = toast.error;
    const load = useCallback(async (p: number, s: string) => {
        setLoading(true);
        const res = await fetchDncNumbers(p, PAGE_SIZE, s || undefined);
        if (res.success && res.data) {
            setNumbers(res.data.numbers);
            setTotal(res.data.total);
            setPages(Math.max(res.data.pages, 1));
        } else {
            showError("Could not load the list", res.message);
        }
        setLoading(false);
    }, [showError]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        void load(page, search);
    }, [page, search, load]);

    const pending = splitNumbers(draft);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pending.length === 0) return;
        if (pending.length > MAX_PER_ADD) {
            toast.error("Too many numbers", `Add at most ${MAX_PER_ADD.toLocaleString()} at a time.`);
            return;
        }
        setAdding(true);
        const res = await addDncNumbers(pending, reason.trim());
        setAdding(false);
        if (!res.success || !res.data) {
            toast.error("Numbers not added", res.message);
            return;
        }
        const { added, alreadyListed, invalid } = res.data;
        const extra = [
            alreadyListed ? `${alreadyListed} already on the list` : null,
            invalid ? `${invalid} couldn't be read (include the country code)` : null,
        ].filter(Boolean).join(", ");
        toast.success(`${added} number${added === 1 ? "" : "s"} added`, extra || undefined);
        setDraft("");
        setReason("");
        setPage(1);
        await load(1, search);
    };

    const handleRemove = async (entry: DncNumber) => {
        setRemoving(true);
        const res = await removeDncNumber(entry.id);
        setRemoving(false);
        setConfirmRemove(null);
        if (!res.success) {
            toast.error("Number not removed", res.message);
            return;
        }
        toast.success(`${entry.phoneNumber} can be called again`);
        await load(page, search);
    };

    return (
        <div style={{ padding: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}>
            <button onClick={() => router.push("/dashboard/campaign")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "rgba(255, 255, 255, 0.7)", cursor: "pointer", marginBottom: "20px" }}>
                <ArrowLeft size={18} />Back to Campaigns
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255, 60, 100, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF3C64", flexShrink: 0 }}>
                    <Ban size={22} />
                </div>
                <div>
                    <h1 style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "white", margin: 0 }}>Do-not-call list</h1>
                    <p style={{ color: "#9CA3AF", margin: "4px 0 0", fontSize: "13px", lineHeight: 1.5 }}>
                        These numbers are never dialed: not by campaigns, test calls or API calls. Contacts on the list are marked as not called.
                    </p>
                </div>
            </div>

            {canEdit && (
                <form onSubmit={handleAdd} style={{ ...panel, marginBottom: "24px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: "0 0 16px" }}>Add numbers</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", alignItems: "start" }}>
                        <div>
                            <label htmlFor="dnc-numbers" style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>Phone numbers</label>
                            <textarea id="dnc-numbers" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder={"+91 98765 43210\n+1 415 555 0100"} style={{ ...inputStyle, resize: "vertical", minHeight: "96px" }} />
                            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", margin: "6px 0 0" }}>One per line, or separated by commas. Include the country code.</p>
                        </div>
                        <div>
                            <label htmlFor="dnc-reason" style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>Reason (optional)</label>
                            <input id="dnc-reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Asked not to be called" style={inputStyle} />
                            <button type="submit" disabled={adding || pending.length === 0} style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px 18px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", fontWeight: 600, fontSize: "14px", cursor: adding || pending.length === 0 ? "not-allowed" : "pointer", opacity: adding || pending.length === 0 ? 0.5 : 1 }}>
                                {adding ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
                                {pending.length > 1 ? `Add ${pending.length} numbers` : "Add number"}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div style={panel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: 0 }}>Blocked numbers ({total})</h2>
                    <div style={{ position: "relative" }}>
                        <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255, 255, 255, 0.4)" }} />
                        <input type="text" inputMode="tel" placeholder="Search a number" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ ...inputStyle, padding: "10px 12px 10px 40px", width: "220px" }} />
                    </div>
                </div>

                {numbers.length > 0 ? (
                    <>
                        <div style={{ overflowX: "auto", opacity: loading ? 0.5 : 1, transition: "opacity 0.15s" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                        <th style={thStyle}>Number</th>
                                        <th style={thStyle}>Reason</th>
                                        <th style={thStyle}>Added</th>
                                        {canEdit && <th style={{ ...thStyle, textAlign: "right" }}>Remove</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {numbers.map((entry) => (
                                        <tr key={entry.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                                            <td style={{ padding: "14px 16px", color: "white", fontWeight: 500, whiteSpace: "nowrap" }}>{entry.phoneNumber}</td>
                                            <td style={{ padding: "14px 16px", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>{entry.reason || "-"}</td>
                                            <td style={{ padding: "14px 16px", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px", whiteSpace: "nowrap" }}>{new Date(entry.createdAt).toLocaleDateString()}</td>
                                            {canEdit && (
                                                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                                    <button onClick={() => setConfirmRemove(entry)} title="Remove from the list" aria-label={`Remove ${entry.phoneNumber}`} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid rgba(255, 60, 100, 0.3)", background: "transparent", color: "#FF3C64", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={page} totalPages={pages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} itemLabel="numbers" />
                    </>
                ) : loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "48px 20px" }}>
                        <Loader size={24} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "48px 20px" }}>
                        <Ban size={40} style={{ color: "rgba(255, 60, 100, 0.3)", marginBottom: "12px" }} />
                        <h3 style={{ fontSize: "15px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 6px" }}>{search ? "No matching numbers" : "The list is empty"}</h3>
                        <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.45)", margin: 0 }}>
                            {search ? "Try fewer digits" : "Add anyone who asked not to be called."}
                        </p>
                    </div>
                )}
            </div>

            {confirmRemove && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setConfirmRemove(null)}>
                    <div style={{ background: "#1a1a2e", border: "1px solid rgba(255, 60, 100, 0.3)", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%", boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: "0 0 12px" }}>Remove {confirmRemove.phoneNumber}?</h3>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", margin: "0 0 24px", lineHeight: 1.5 }}>Campaigns, test calls and API calls will be able to call this number again.</p>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button onClick={() => setConfirmRemove(null)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "white", cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => handleRemove(confirmRemove)} disabled={removing} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "#FF3C64", color: "white", cursor: removing ? "not-allowed" : "pointer" }}>
                                {removing ? "Removing…" : "Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
