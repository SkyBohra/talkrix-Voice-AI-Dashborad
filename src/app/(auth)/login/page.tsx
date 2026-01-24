"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, Loader2, Check, AlertCircle } from "lucide-react";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [sessionExpired, setSessionExpired] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Check if session expired
    useEffect(() => {
        if (searchParams.get('expired') === 'true') {
            setSessionExpired(true);
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSessionExpired(false);
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok || data.statusCode >= 400) {
                throw new Error(data.error || data.message || "Invalid credentials");
            }
            localStorage.setItem("token", data.data.access_token);
            // Decode JWT to get userId
            const tokenPayload = JSON.parse(atob(data.data.access_token.split('.')[1]));
            localStorage.setItem("userId", tokenPayload.sub);
            localStorage.setItem("userName", data.data.name || "");
            localStorage.setItem("userEmail", data.data.email || "");
            // Use backend value for tour completion status
            if (!data.data.hasCompletedTour) {
                localStorage.setItem("isFirstLogin", "true");
            } else {
                localStorage.setItem("dashboardTourCompleted", "true");
            }
            
            // Check for redirect path after session expiry
            const redirectPath = sessionStorage.getItem('redirectAfterLogin');
            if (redirectPath) {
                sessionStorage.removeItem('redirectAfterLogin');
                router.push(redirectPath);
            } else {
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Login failed.";
            setError(errorMessage);
            setIsLoading(false);
        }
    };

    return (
        <div style={{ 
            background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.9) 0%, rgba(10, 20, 40, 0.95) 100%)',
            borderRadius: '20px',
            padding: '40px',
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
                Welcome Back
            </h2>
            <p style={{ 
                color: 'rgba(255, 255, 255, 0.5)', 
                fontSize: '14px', 
                textAlign: 'center', 
                marginBottom: '32px' 
            }}>
                Sign in to unleash your AI voice agents ✨
            </p>
            <form onSubmit={handleLogin}>
                <div style={{ position: 'relative', marginBottom: '18px', width: '100%' }}>
                    <User style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#00C8FF', zIndex: 1 }} />
                    <Input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        disabled={isLoading} 
                        placeholder="Email address"
                        style={{ 
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
                        }} 
                    />
                </div>
                <div style={{ position: 'relative', marginBottom: '18px', width: '100%' }}>
                    <Lock style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#00C8FF', zIndex: 1 }} />
                    <Input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        disabled={isLoading} 
                        placeholder="Password"
                        style={{ 
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
                        }} 
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <div onClick={() => setRememberMe(!rememberMe)} style={{ 
                            width: '18px', 
                            height: '18px', 
                            borderRadius: '4px', 
                            border: rememberMe ? 'none' : '2px solid rgba(0, 200, 255, 0.5)', 
                            background: rememberMe ? 'linear-gradient(135deg, #00C8FF, #7800FF)' : 'transparent', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            boxShadow: rememberMe ? '0 0 10px rgba(0, 200, 255, 0.5)' : 'none'
                        }}>
                            {rememberMe && <Check style={{ width: '10px', height: '10px', color: 'white' }} />}
                        </div>
                        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>Remember me</span>
                    </label>
                    <Link href="#" style={{ fontSize: '13px', color: '#00C8FF', textDecoration: 'none' }}>Forgot password?</Link>
                </div>
                {sessionExpired && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '12px 16px', 
                        background: 'rgba(255, 165, 0, 0.1)', 
                        border: '1px solid rgba(255, 165, 0, 0.3)', 
                        borderRadius: '10px', 
                        marginBottom: '18px' 
                    }}>
                        <AlertCircle style={{ width: '18px', height: '18px', color: '#FFA500', flexShrink: 0 }} />
                        <p style={{ color: '#FFA500', fontSize: '13px', margin: 0 }}>Your session has expired. Please login again.</p>
                    </div>
                )}
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
                        {isLoading ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : "Login"}
                    </Button>
                </div>
                <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Don't have an account? <Link href="/signup" style={{ color: '#00C8FF', fontWeight: 600 }}>Sign up</Link>
                </p>
            </form>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{ 
                background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.9) 0%, rgba(10, 20, 40, 0.95) 100%)',
                borderRadius: '20px',
                padding: '40px',
                border: '1px solid rgba(0, 200, 255, 0.2)',
                boxShadow: '0 0 40px rgba(0, 200, 255, 0.1), inset 0 0 60px rgba(0, 200, 255, 0.03)',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#00C8FF', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
