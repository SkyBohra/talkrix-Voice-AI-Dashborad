"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { acceptInvitation, previewInvitation, type InvitationPreview } from "@/lib/orgApi";
import { clearSession, hasLiveToken, roleLabel, saveSession } from "@/lib/session";

const cardStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(5, 15, 30, 0.9) 0%, rgba(10, 20, 40, 0.95) 100%)",
    borderRadius: "20px",
    padding: "clamp(24px, 5vw, 40px)",
    border: "1px solid rgba(0, 200, 255, 0.2)",
    boxShadow: "0 0 40px rgba(0, 200, 255, 0.1), inset 0 0 60px rgba(0, 200, 255, 0.03)",
    width: "100%",
    boxSizing: "border-box",
};

const primaryLink: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "52px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
    color: "white",
    fontWeight: 600,
    fontSize: "15px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 0 30px rgba(0, 200, 255, 0.35)",
    boxSizing: "border-box",
};

const secondaryLink: React.CSSProperties = {
    ...primaryLink,
    background: "transparent",
    border: "1px solid rgba(0, 200, 255, 0.35)",
    color: "#00C8FF",
    boxShadow: "none",
};

const UNUSABLE: Record<Exclude<InvitationPreview["status"], "pending">, { title: string; body: string }> = {
    accepted: { title: "This invitation has already been used", body: "If you accepted it, sign in to continue." },
    revoked: { title: "This invitation was withdrawn", body: "Ask the person who invited you for a new link." },
    expired: { title: "This invitation has expired", body: "Invitations last 7 days. Ask the person who invited you for a new link." },
};

export default function InvitePage() {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? "";

    const [preview, setPreview] = useState<InvitationPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [invalid, setInvalid] = useState(false);
    const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        setSignedInEmail(hasLiveToken() ? localStorage.getItem("userEmail") || "" : null);
        let cancelled = false;
        previewInvitation(token).then((res) => {
            if (cancelled) return;
            if (res.success && res.data) setPreview(res.data);
            else setInvalid(true);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [token]);

    const accept = async () => {
        setError("");
        setAccepting(true);
        const res = await acceptInvitation(token);
        if (res.success && res.data) {
            saveSession(res.data);
            // A full load, so nothing from the previous organization lingers
            window.location.href = "/dashboard";
            return;
        }
        setError(res.message || "Couldn't accept the invitation.");
        setAccepting(false);
        // The session may have ended (e.g. signed out everywhere)
        if (!hasLiveToken()) setSignedInEmail(null);
    };

    const switchAccount = () => {
        clearSession();
        setSignedInEmail(null);
        setError("");
    };

    if (loading) {
        return (
            <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px" }}>
                <Loader2 style={{ width: "32px", height: "32px", color: "#00C8FF", animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    if (invalid || !preview) {
        return (
            <Notice title="This invite link isn't valid" body="Check that you copied the whole link, or ask the person who invited you for a new one." />
        );
    }

    if (preview.status === "revoked" && preview.replaced) {
        return (
            <Notice
                title="This link was replaced"
                body={`A newer invitation to ${preview.orgName || "this organization"} was sent to ${preview.email}. Use the link from the latest invitation — or ask for it to be sent again.`}
            />
        );
    }

    if (preview.status !== "pending") {
        const { title, body } = UNUSABLE[preview.status];
        return <Notice title={title} body={body} />;
    }

    const role = roleLabel(preview.role);
    const inviteQuery = `?invite=${encodeURIComponent(token)}`;
    const wrongAccount = signedInEmail !== null && signedInEmail.toLowerCase() !== preview.email.toLowerCase();

    return (
        <div style={cardStyle}>
            <div
                style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    margin: "0 auto 18px",
                    background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2), rgba(120, 0, 255, 0.2))",
                    border: "1px solid rgba(0, 200, 255, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Users size={24} color="#00C8FF" />
            </div>
            <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255, 255, 255, 0.55)", margin: "0 0 6px" }}>
                You&apos;re invited to join
            </p>
            <h2
                style={{
                    textAlign: "center",
                    fontSize: "26px",
                    fontWeight: 700,
                    margin: "0 0 10px",
                    background: "linear-gradient(135deg, #00C8FF, #7800FF)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    overflowWrap: "anywhere",
                }}
            >
                {preview.orgName || "an organization"}
            </h2>
            <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 28px" }}>
                as <strong style={{ color: "white" }}>{role}</strong> · for {preview.email}
            </p>

            {signedInEmail !== null && !wrongAccount && (
                <button type="button" onClick={accept} disabled={accepting} style={{ ...primaryLink, opacity: accepting ? 0.7 : 1 }}>
                    {accepting ? <Loader2 style={{ width: "20px", height: "20px", animation: "spin 1s linear infinite" }} /> : `Join ${preview.orgName || "organization"}`}
                </button>
            )}

            {wrongAccount && (
                <>
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            background: "rgba(255, 165, 0, 0.08)",
                            border: "1px solid rgba(255, 165, 0, 0.3)",
                            marginBottom: "16px",
                        }}
                    >
                        <AlertCircle size={18} color="#FFA500" style={{ flexShrink: 0, marginTop: "1px" }} />
                        <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "#FFC46B" }}>
                            You&apos;re signed in as {signedInEmail || "another account"}. This invitation is for {preview.email} — sign in with that address to accept it.
                        </p>
                    </div>
                    <button type="button" onClick={switchAccount} style={primaryLink}>
                        Use a different account
                    </button>
                </>
            )}

            {signedInEmail === null && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Link href={`/signup${inviteQuery}`} style={primaryLink}>
                        Create your account
                    </Link>
                    <Link href={`/login${inviteQuery}`} style={secondaryLink}>
                        I already have an account
                    </Link>
                </div>
            )}

            {error && (
                <p role="alert" style={{ color: "#FF3C64", textAlign: "center", fontSize: "14px", margin: "16px 0 0" }}>
                    {error}
                </p>
            )}
        </div>
    );
}

function Notice({ title, body }: { title: string; body: string }) {
    return (
        <div style={{ ...cardStyle, textAlign: "center" }}>
            <div
                style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    margin: "0 auto 18px",
                    background: "rgba(255, 165, 0, 0.1)",
                    border: "1px solid rgba(255, 165, 0, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <AlertCircle size={24} color="#FFA500" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 10px" }}>{title}</h2>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255, 255, 255, 0.6)", margin: "0 0 24px" }}>{body}</p>
            <Link href="/login" style={secondaryLink}>
                Go to sign in
            </Link>
        </div>
    );
}
