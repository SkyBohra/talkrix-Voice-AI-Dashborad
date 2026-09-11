"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, Mail, Loader2, Building2, Users, AlertCircle } from "lucide-react";
import { previewInvitation, type InvitationPreview } from "@/lib/orgApi";
import { roleLabel, saveSession } from "@/lib/session";

const inputStyle: React.CSSProperties = {
    paddingLeft: '50px',
    height: '52px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 200, 255, 0.05)',
    border: '1px solid rgba(0, 200, 255, 0.2)',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    fontSize: '15px',
    color: 'white'
};

const iconStyle: React.CSSProperties = { position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#00C8FF', zIndex: 1 };

const INVITE_PROBLEMS: Record<string, string> = {
    accepted: "This invitation has already been used.",
    revoked: "This invitation was withdrawn.",
    expired: "This invitation has expired.",
};

function SignupForm() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [organizationName, setOrganizationName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [invite, setInvite] = useState<InvitationPreview | null>(null);
    const [inviteProblem, setInviteProblem] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get("invite");

    // Check mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Signing up from an invite link joins that organization instead of creating one
    useEffect(() => {
        if (!inviteToken) return;
        previewInvitation(inviteToken).then((res) => {
            if (!res.success || !res.data) {
                setInviteProblem("This invite link isn't valid.");
            } else if (res.data.status !== "pending") {
                setInviteProblem(INVITE_PROBLEMS[res.data.status] ?? "This invitation can't be used.");
            } else {
                setInvite(res.data);
                setEmail(res.data.email);
            }
        });
    }, [inviteToken]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const body: Record<string, string> = { name, email, password };
            if (invite && inviteToken) body.inviteToken = inviteToken;
            else if (organizationName.trim()) body.organizationName = organizationName.trim();

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || data.statusCode >= 400) {
                throw new Error(data.error || data.message || "Signup failed");
            }
            saveSession(data.data);
            // New users always see the tour - clear any old tour data and set first login
            localStorage.removeItem("dashboardTourCompleted");
            localStorage.setItem("isFirstLogin", "true");
            router.push("/dashboard");
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Signup failed.";
            setError(errorMessage);
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.9) 0%, rgba(10, 20, 40, 0.95) 100%)',
            borderRadius: isMobile ? '16px' : '20px',
            padding: isMobile ? '24px 20px' : '40px',
            border: '1px solid rgba(0, 200, 255, 0.2)',
            boxShadow: '0 0 40px rgba(0, 200, 255, 0.1), inset 0 0 60px rgba(0, 200, 255, 0.03)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            <h2 style={{
                background: 'linear-gradient(135deg, #00C8FF, #7800FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '24px',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '8px'
            }}>
                {invite ? `Join ${invite.orgName}` : "Start Converting More"}
            </h2>
            {invite ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    margin: '12px 0 28px',
                    borderRadius: '12px',
                    background: 'rgba(0, 200, 255, 0.06)',
                    border: '1px solid rgba(0, 200, 255, 0.25)',
                }}>
                    <Users style={{ width: '20px', height: '20px', color: '#00C8FF', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.75)' }}>
                        You&apos;ll join as <strong style={{ color: 'white' }}>{roleLabel(invite.role)}</strong>. Create a password for {invite.email}.
                    </p>
                </div>
            ) : (
                <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '14px',
                    textAlign: 'center',
                    marginBottom: '32px'
                }}>
                    Create your account & go live in 48 hours 🚀
                </p>
            )}
            {inviteProblem && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    marginBottom: '20px',
                    borderRadius: '10px',
                    background: 'rgba(255, 165, 0, 0.08)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                }}>
                    <AlertCircle style={{ width: '18px', height: '18px', color: '#FFA500', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: '#FFC46B' }}>
                        {inviteProblem} Ask for a new link, or create your own workspace below.
                    </p>
                </div>
            )}
            <form onSubmit={handleSignup}>
                <div style={{ position: 'relative', marginBottom: '18px', width: '100%' }}>
                    <User style={iconStyle} />
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Full name"
                        style={inputStyle}
                    />
                </div>
                <div style={{ position: 'relative', marginBottom: '18px', width: '100%' }}>
                    <Mail style={iconStyle} />
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        readOnly={!!invite}
                        placeholder="Email address"
                        style={{ ...inputStyle, opacity: invite ? 0.75 : 1 }}
                    />
                </div>
                {!invite && (
                    <div style={{ position: 'relative', marginBottom: '18px', width: '100%' }}>
                        <Building2 style={iconStyle} />
                        <Input
                            type="text"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            disabled={isLoading}
                            maxLength={120}
                            placeholder="Company name (optional)"
                            style={inputStyle}
                        />
                    </div>
                )}
                <div style={{ position: 'relative', marginBottom: '28px', width: '100%' }}>
                    <Lock style={iconStyle} />
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                        placeholder="Create password (8+ characters)"
                        style={inputStyle}
                    />
                </div>
                {error && <p style={{ color: '#FF3C64', textAlign: 'center', marginBottom: '18px', fontSize: '14px' }}>{error}</p>}
                <div style={{ textAlign: 'center' }}>
                    <Button type="submit" disabled={isLoading} style={{
                        width: '100%',
                        height: '52px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '15px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 0 30px rgba(0, 200, 255, 0.4), 0 0 60px rgba(120, 0, 255, 0.2)',
                        transition: 'all 0.3s ease'
                    }}>
                        {isLoading ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : invite ? "Join" : "Sign Up"}
                    </Button>
                </div>
                <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Already have an account? <Link href={invite && inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : "/login"} style={{ color: '#00C8FF', fontWeight: 600 }}>Sign in</Link>
                </p>
            </form>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div style={{
                background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.9) 0%, rgba(10, 20, 40, 0.95) 100%)',
                borderRadius: '20px',
                padding: '40px',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#00C8FF', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <SignupForm />
        </Suspense>
    );
}
