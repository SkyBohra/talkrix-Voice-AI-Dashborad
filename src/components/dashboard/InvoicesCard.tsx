"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Loader } from "lucide-react";
import { InvoiceRow, downloadBillingFile, fetchInvoices } from "@/lib/billingApi";
import { formatInr } from "@/lib/money";
import { useToast } from "@/components/ui/toast";
import Pagination from "@/components/ui/Pagination";

const PAGE_SIZE = 25;

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

/** Tax invoices and credit notes, each downloadable as a PDF. */
export default function InvoicesCard({ refreshKey }: { refreshKey: number }) {
    const toast = useToast();
    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [downloading, setDownloading] = useState<string | null>(null);

    const load = useCallback(async (current: number) => {
        const res = await fetchInvoices(current);
        if (res.success && res.data) {
            setInvoices(res.data.invoices);
            setTotal(res.data.total);
            setPages(Math.max(res.data.pages, 1));
        }
    }, []);

    useEffect(() => {
        void load(page);
    }, [page, refreshKey, load]);

    const download = async (invoice: InvoiceRow) => {
        setDownloading(invoice.id);
        const problem = await downloadBillingFile(
            `/invoices/${invoice.id}/pdf`,
            `${invoice.number.replace(/\//g, "-")}.pdf`,
        );
        setDownloading(null);
        if (problem) toast.error("Could not download the invoice", problem);
    };

    return (
        <div style={panel}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <FileText size={18} style={{ color: "#22c55e" }} />
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: 0 }}>
                    Invoices {total > 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>({total})</span>}
                </h2>
            </div>

            {invoices.length === 0 ? (
                <p style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "14px", margin: 0 }}>
                    A tax invoice is issued for every payment, and appears here to download.
                </p>
            ) : (
                <>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                    <th style={thStyle}>Number</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Credits</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>GST</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                                    <th style={{ ...thStyle, textAlign: "right" }}>PDF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                                        <td style={{ ...tdStyle, color: "white" }}>
                                            {invoice.number}
                                            {invoice.kind === "credit_note" && (
                                                <span style={{ marginLeft: "8px", fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" }}>
                                                    Credit note
                                                </span>
                                            )}
                                            {invoice.reason && (
                                                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "2px", whiteSpace: "normal" }}>
                                                    {invoice.reason}
                                                </div>
                                            )}
                                        </td>
                                        <td style={tdStyle}>{new Date(invoice.issuedAt).toLocaleDateString()}</td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>{formatInr(invoice.subtotalPaise)}</td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>{formatInr(invoice.taxPaise)}</td>
                                        <td style={{ ...tdStyle, textAlign: "right", color: "white", fontWeight: 600 }}>
                                            {formatInr(invoice.totalPaise)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            <button
                                                onClick={() => download(invoice)}
                                                aria-label={`Download ${invoice.number}`}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid rgba(0, 200, 255, 0.3)",
                                                    background: "transparent",
                                                    color: "#00C8FF",
                                                    fontSize: "13px",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {downloading === invoice.id ? (
                                                    <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
                                                ) : (
                                                    <Download size={13} />
                                                )}
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={page} totalPages={pages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} itemLabel="invoices" />
                </>
            )}
        </div>
    );
}
