"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader, Save } from "lucide-react";
import { BillingProfile, fetchBillingProfile, saveBillingProfile } from "@/lib/billingApi";
import { useToast } from "@/components/ui/toast";

const panel: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(0, 200, 255, 0.15)",
    borderRadius: "16px",
    padding: "clamp(16px, 3vw, 24px)",
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
    fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: "8px",
};

/** What is printed on this organization's invoices. The GSTIN also decides the tax on a top-up. */
export default function BillingProfileCard({ canEdit, onSaved }: { canEdit: boolean; onSaved: () => void }) {
    const toast = useToast();
    const [profile, setProfile] = useState<BillingProfile | null>(null);
    const [draft, setDraft] = useState({ legalName: "", gstin: "", address: "", email: "", phone: "" });
    const [saving, setSaving] = useState(false);

    const showError = toast.error;
    const load = useCallback(async () => {
        const res = await fetchBillingProfile();
        if (res.success && res.data) {
            setProfile(res.data);
            setDraft({
                legalName: res.data.name ?? "",
                gstin: res.data.gstin ?? "",
                address: res.data.address ?? "",
                email: res.data.email ?? "",
                phone: res.data.phone ?? "",
            });
        } else {
            showError("Could not load your invoice details", res.message);
        }
    }, [showError]);

    useEffect(() => {
        void load();
    }, [load]);

    if (!profile) return null;

    const save = async () => {
        setSaving(true);
        const res = await saveBillingProfile(draft);
        setSaving(false);
        if (!res.success) {
            toast.error("Not saved", res.message);
            return;
        }
        toast.success("Invoice details saved", "They appear on your next invoice.");
        await load();
        onSaved();
    };

    return (
        <div style={panel}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <Building2 size={18} style={{ color: "#a855f7" }} />
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: 0 }}>Invoice details</h2>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.45)", margin: "0 0 16px", lineHeight: 1.6 }}>
                Printed on every invoice. With a GSTIN your business can claim input credit, and the tax is
                worked out for your state.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <div>
                    <label htmlFor="bp-name" style={labelStyle}>Registered name</label>
                    <input id="bp-name" value={draft.legalName} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} style={inputStyle} placeholder="Acme Private Limited" />
                </div>
                <div>
                    <label htmlFor="bp-gstin" style={labelStyle}>GSTIN (optional)</label>
                    <input id="bp-gstin" value={draft.gstin} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, gstin: e.target.value.toUpperCase() })} style={{ ...inputStyle, letterSpacing: "0.04em" }} placeholder="27AAACW1234A1ZX" maxLength={15} />
                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", margin: "6px 0 0" }}>
                        {profile.stateName ? `Place of supply: ${profile.stateName}` : "15 characters, from your GST certificate"}
                    </p>
                </div>
                <div>
                    <label htmlFor="bp-email" style={labelStyle}>Billing email</label>
                    <input id="bp-email" type="email" value={draft.email} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, email: e.target.value })} style={inputStyle} placeholder="accounts@example.in" />
                </div>
                <div>
                    <label htmlFor="bp-phone" style={labelStyle}>Phone (optional)</label>
                    <input id="bp-phone" value={draft.phone} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} style={inputStyle} placeholder="+91 98765 43210" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="bp-address" style={labelStyle}>Registered address</label>
                    <textarea id="bp-address" rows={2} value={draft.address} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, address: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} placeholder="Street, city, PIN" />
                </div>
            </div>

            {canEdit && (
                <button
                    onClick={save}
                    disabled={saving}
                    style={{
                        marginTop: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 200, 255, 0.3)",
                        background: "transparent",
                        color: "#00C8FF",
                        fontSize: "14px",
                        cursor: saving ? "not-allowed" : "pointer",
                    }}
                >
                    {saving ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                    Save details
                </button>
            )}
        </div>
    );
}
