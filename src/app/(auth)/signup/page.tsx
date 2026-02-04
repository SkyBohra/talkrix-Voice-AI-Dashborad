"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, Loader2 } from "lucide-react";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();

    // Check mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (!res.ok || data.statusCode >= 400) {
                throw new Error(data.error || data.message || "Signup failed");
            }
            localStorage.setItem("token", data.data.access_token);
            // Decode JWT to get userId
            const tokenPayload = JSON.parse(atob(data.data.access_token.split('.')[1]));
            localStorage.setItem("userId", tokenPayload.sub);
            localStorage.setItem("userName", data.data.name || "");
            localStorage.setItem("userEmail", data.data.email || "");
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
                Start Converting More
            </h2>
            <p style={{ 
                color: 'rgba(255, 255, 255, 0.5)', 
                fontSize: '14px', 
                textAlign: 'center', 
                marginBottom: '32px' 
            }}>
                Create your account & go live in 48 hours 🚀
            </p>
            <form onSubmit={handleSignup}>
                <div style={{ position: 'relative', marginBottom: '18px', width: '100%' }}>
                    <User style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#00C8FF', zIndex: 1 }} />
                    <Input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        disabled={isLoading} 
                        placeholder="Full name"
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
                    <Mail style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#00C8FF', zIndex: 1 }} />
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
                <div style={{ position: 'relative', marginBottom: '28px', width: '100%' }}>
                    <Lock style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#00C8FF', zIndex: 1 }} />
                    <Input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        disabled={isLoading} 
                        placeholder="Create password"
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
                        {isLoading ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : "Sign Up"}
                    </Button>
                </div>
                <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Already have an account? <Link href="/login" style={{ color: '#00C8FF', fontWeight: 600 }}>Sign in</Link>
                </p>
            </form>
        </div>
    );
}
