"use client";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ minHeight: '100vh', width: '100%', display: 'flex' }}>
            {/* Left Panel - Cyberpunk animated background */}
            <div style={{ 
                display: 'flex',
                width: '55%', 
                position: 'relative', 
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #030812 0%, #0a1628 50%, #051020 100%)'
            }}>
                {/* Animated Orbs - Cyan & Purple */}
                <div style={{ 
                    position: 'absolute', 
                    top: '10%', 
                    left: '10%', 
                    width: '350px', 
                    height: '350px', 
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 200, 255, 0.35) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'drift 20s ease-in-out infinite'
                }} />
                <div style={{ 
                    position: 'absolute', 
                    bottom: '15%', 
                    right: '5%', 
                    width: '300px', 
                    height: '300px', 
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(120, 0, 255, 0.35) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'drift 15s ease-in-out infinite reverse'
                }} />
                <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    width: '250px', 
                    height: '250px', 
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 60, 100, 0.25) 0%, transparent 70%)',
                    filter: 'blur(70px)',
                    animation: 'drift 18s ease-in-out infinite'
                }} />

                {/* Cyber Grid Pattern */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(0, 200, 255, 0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 200, 255, 0.08) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                    maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)'
                }} />

                {/* Aurora Effect */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-50%',
                    width: '200%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.1), rgba(120, 0, 255, 0.1), transparent)',
                    animation: 'aurora 8s ease-in-out infinite',
                    opacity: 0.6
                }} />

                {/* Floating particles - Cyberpunk colors */}
                <div style={{ position: 'absolute', top: '20%', left: '20%', width: '6px', height: '6px', backgroundColor: '#00C8FF', borderRadius: '50%', opacity: 0.8, animation: 'float 6s ease-in-out infinite', boxShadow: '0 0 10px #00C8FF' }} />
                <div style={{ position: 'absolute', top: '40%', left: '60%', width: '4px', height: '4px', backgroundColor: '#7800FF', borderRadius: '50%', opacity: 0.8, animation: 'float 8s ease-in-out infinite', boxShadow: '0 0 8px #7800FF' }} />
                <div style={{ position: 'absolute', top: '70%', left: '30%', width: '5px', height: '5px', backgroundColor: '#FF3C64', borderRadius: '50%', opacity: 0.8, animation: 'float 7s ease-in-out infinite', boxShadow: '0 0 10px #FF3C64' }} />
                <div style={{ position: 'absolute', top: '30%', left: '80%', width: '4px', height: '4px', backgroundColor: '#00C8FF', borderRadius: '50%', opacity: 0.8, animation: 'float 9s ease-in-out infinite', boxShadow: '0 0 8px #00C8FF' }} />
                <div style={{ position: 'absolute', top: '80%', left: '70%', width: '6px', height: '6px', backgroundColor: '#7800FF', borderRadius: '50%', opacity: 0.8, animation: 'float 5s ease-in-out infinite', boxShadow: '0 0 10px #7800FF' }} />
                <div style={{ position: 'absolute', top: '15%', left: '45%', width: '3px', height: '3px', backgroundColor: '#FF3C64', borderRadius: '50%', opacity: 0.7, animation: 'float 10s ease-in-out infinite', boxShadow: '0 0 6px #FF3C64' }} />
                <div style={{ position: 'absolute', top: '60%', left: '85%', width: '5px', height: '5px', backgroundColor: '#00C8FF', borderRadius: '50%', opacity: 0.7, animation: 'float 7s ease-in-out infinite', boxShadow: '0 0 8px #00C8FF' }} />
                
                {/* Text Content */}
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 64px' }}>
                    <div style={{ 
                        width: '60px', 
                        height: '60px', 
                        marginBottom: '24px',
                        borderRadius: '16px', 
                        background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(0, 200, 255, 0.5), 0 0 60px rgba(120, 0, 255, 0.3)',
                        border: '1px solid rgba(0, 200, 255, 0.3)'
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                    </div>
                    <p style={{ color: '#00C8FF', fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
                        Welcome to the Future
                    </p>
                    <h1 style={{ fontSize: '52px', fontWeight: 'bold', color: 'white', marginBottom: '20px', lineHeight: 1.1 }}>
                        <span style={{ background: 'linear-gradient(135deg, #00C8FF, #7800FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Voice AI</span>
                        <br />
                        <span style={{ fontSize: '36px', color: 'rgba(255,255,255,0.9)' }}>Command Center</span>
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '17px', lineHeight: 1.9, maxWidth: '420px', marginBottom: '8px' }}>
                        🚀 Build intelligent voice agents that speak, listen, and understand. Transform your business with AI that feels human.
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.7, maxWidth: '420px' }}>
                        No code required. Deploy in minutes. Scale infinitely.
                    </p>
                    
                    {/* Feature badges - Cyberpunk style */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap' }}>
                        <div style={{ padding: '10px 18px', backgroundColor: 'rgba(0, 200, 255, 0.15)', borderRadius: '8px', border: '1px solid rgba(0, 200, 255, 0.4)', fontSize: '13px', color: '#00C8FF', boxShadow: '0 0 15px rgba(0, 200, 255, 0.2)' }}>
                            🎙️ 24/7 Voice Agents
                        </div>
                        <div style={{ padding: '10px 18px', backgroundColor: 'rgba(120, 0, 255, 0.15)', borderRadius: '8px', border: '1px solid rgba(120, 0, 255, 0.4)', fontSize: '13px', color: '#a78bfa', boxShadow: '0 0 15px rgba(120, 0, 255, 0.2)' }}>
                            🧠 GPT-4 Powered
                        </div>
                        <div style={{ padding: '10px 18px', backgroundColor: 'rgba(255, 60, 100, 0.15)', borderRadius: '8px', border: '1px solid rgba(255, 60, 100, 0.4)', fontSize: '13px', color: '#FF3C64', boxShadow: '0 0 15px rgba(255, 60, 100, 0.2)' }}>
                            ⚡ &lt;1s Response
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '40px', marginTop: '40px' }}>
                        <div>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#00C8FF', marginBottom: '4px' }}>10K+</p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agents Created</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#7800FF', marginBottom: '4px' }}>1M+</p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Conversations</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF3C64', marginBottom: '4px' }}>99.9%</p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Uptime</p>
                        </div>
                    </div>
                </div>

                {/* Scan line effect */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 200, 255, 0.02) 2px, rgba(0, 200, 255, 0.02) 4px)',
                    pointerEvents: 'none'
                }} />
            </div>

            {/* Right Panel - Dark cyberpunk form area */}
            <div style={{ 
                width: '45%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #0a1628 0%, #051020 100%)',
                padding: '48px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Subtle glow on right panel */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 200, 255, 0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                }} />
                <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 10 }}>
                    {children}
                </div>
            </div>

            <style jsx global>{`
                @keyframes drift {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(30px, -30px); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); opacity: 0.8; }
                    50% { transform: translateY(-15px); opacity: 1; }
                }
                @keyframes aurora {
                    0%, 100% { transform: translateX(-30%); }
                    50% { transform: translateX(30%); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(0, 200, 255, 0.4), 0 0 40px rgba(120, 0, 255, 0.2); }
                    50% { box-shadow: 0 0 30px rgba(0, 200, 255, 0.6), 0 0 60px rgba(120, 0, 255, 0.3); }
                }
            `}</style>
        </div>
    );
}
