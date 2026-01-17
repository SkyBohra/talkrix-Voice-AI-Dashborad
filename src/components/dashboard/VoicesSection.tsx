"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Mic, Search, Play, Pause, Globe, Loader2 } from "lucide-react";
import { fetchVoices } from "../../lib/agentApi";

interface Voice {
    voiceId: string;
    name: string;
    description: string;
    primaryLanguage: string | null;
    previewUrl: string;
    provider: string;
    ownership: string;
    billingStyle: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function VoicesSection() {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
    const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
    const [total, setTotal] = useState(0);

    const debouncedSearch = useDebounce(searchQuery, 300);

    const loadVoices = useCallback(async (search?: string) => {
        setLoading(true);
        try {
            const res = await fetchVoices(search);
            if (res.success && res.data?.results) {
                setVoices(res.data.results);
                setTotal(res.data.total || res.data.results.length);
            }
        } catch (error) {
            console.error("Failed to fetch voices:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadVoices();
    }, [loadVoices]);

    // Search when debounced value changes
    useEffect(() => {
        loadVoices(debouncedSearch || undefined);
    }, [debouncedSearch, loadVoices]);

    const handlePlayPreview = (voice: Voice) => {
        // Stop current audio if playing
        if (audioRef) {
            audioRef.pause();
            audioRef.currentTime = 0;
        }

        if (playingVoiceId === voice.voiceId) {
            setPlayingVoiceId(null);
            setAudioRef(null);
            return;
        }

        const audio = new Audio(voice.previewUrl);
        audio.onended = () => {
            setPlayingVoiceId(null);
            setAudioRef(null);
        };
        audio.onerror = () => {
            setPlayingVoiceId(null);
            setAudioRef(null);
        };
        audio.play();
        setAudioRef(audio);
        setPlayingVoiceId(voice.voiceId);
    };

    const getProviderColor = (provider: string) => {
        const colors: Record<string, { color: string; bg: string }> = {
            "Eleven Labs": { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
            "Cartesia": { color: "#7800FF", bg: "rgba(120, 0, 255, 0.1)" },
            "Inworld": { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
            "Google": { color: "#4285f4", bg: "rgba(66, 133, 244, 0.1)" },
            "LMNT": { color: "#00C8FF", bg: "rgba(0, 200, 255, 0.1)" },
        };
        return colors[provider] || { color: "#9ca3af", bg: "rgba(156, 163, 175, 0.1)" };
    };

    // Country code mapping for flag images (works on all platforms including Windows)
    const getCountryCode = (lang: string | null): string | null => {
        if (!lang) return null;
        const langToCountry: Record<string, string> = {
            "en": "us",
            "en-US": "us",
            "en-GB": "gb",
            "en-IN": "in",
            "en-NZ": "nz",
            "en-NG": "ng",
            "es": "es",
            "es-ES": "es",
            "fr": "fr",
            "de": "de",
            "it": "it",
            "pt": "pt",
            "pt-BR": "br",
            "pt-PT": "pt",
            "nl": "nl",
            "pl": "pl",
            "ru": "ru",
            "ja": "jp",
            "ko": "kr",
            "zh": "cn",
            "ar": "sa",
            "ar-EG": "eg",
            "ar-KW": "kw",
            "el": "gr",
            "ua": "ua",
            "vi": "vn",
            "ta": "in",
            "hi": "in",
            "sk": "sk",
            "ro": "ro",
            "fi": "fi",
            "bg": "bg",
            "hu": "hu",
            "da": "dk",
            "cs": "cz",
        };
        return langToCountry[lang] || null;
    };

    // Flag component that uses CDN images for cross-platform compatibility
    const FlagIcon = ({ lang }: { lang: string | null }) => {
        const countryCode = getCountryCode(lang);
        if (!countryCode) {
            return <Globe size={16} style={{ color: "rgba(255,255,255,0.5)" }} />;
        }
        return (
            <img
                src={`https://flagcdn.com/w20/${countryCode}.png`}
                srcSet={`https://flagcdn.com/w40/${countryCode}.png 2x`}
                width="20"
                height="15"
                alt={lang || ""}
                style={{ 
                    borderRadius: "2px",
                    objectFit: "cover",
                }}
                onError={(e) => {
                    // Fallback to globe icon if image fails to load
                    e.currentTarget.style.display = "none";
                }}
            />
        );
    };

    return (
        <div 
            style={{ 
                padding: "32px 40px", 
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #ec4899 0%, #00C8FF 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Mic size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", margin: 0 }}>
                            Voices
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "14px" }}>
                            Browse and preview available AI voices ({total} total)
                        </p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: "24px" }}>
                <div
                    style={{
                        position: "relative",
                        maxWidth: "400px",
                    }}
                >
                    <Search
                        size={18}
                        style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "rgba(255,255,255,0.4)",
                        }}
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search voices by name, language, or description..."
                        style={{
                            width: "100%",
                            padding: "12px 14px 12px 44px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(0, 200, 255, 0.1)",
                            borderRadius: "10px",
                            color: "white",
                            fontSize: "14px",
                            outline: "none",
                            transition: "all 0.2s ease",
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = "rgba(0, 200, 255, 0.5)";
                            e.target.style.background = "rgba(0, 200, 255, 0.15)";
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = "rgba(0, 200, 255, 0.1)";
                            e.target.style.background = "rgba(255,255,255,0.05)";
                        }}
                    />
                    {loading && (
                        <Loader2
                            size={18}
                            style={{
                                position: "absolute",
                                right: "14px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "rgba(0, 200, 255, 0.8)",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Voices Grid */}
            {loading && voices.length === 0 ? (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "80px 0",
                        color: "rgba(255,255,255,0.5)",
                    }}
                >
                    <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginRight: "12px" }} />
                    Loading voices...
                </div>
            ) : voices.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "80px 0",
                        color: "rgba(255,255,255,0.5)",
                    }}
                >
                    <Mic size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
                    <p>No voices found matching your search.</p>
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "16px",
                    }}
                >
                    {voices.map((voice) => {
                        const providerStyle = getProviderColor(voice.provider);
                        const isPlaying = playingVoiceId === voice.voiceId;
                        const isSelected = selectedVoiceId === voice.voiceId;

                        return (
                            <div
                                key={voice.voiceId}
                                onClick={() => setSelectedVoiceId(voice.voiceId)}
                                className="voice-card"
                                style={{
                                    background: isSelected 
                                        ? "rgba(0, 200, 255, 0.15)" 
                                        : "rgba(255,255,255,0.03)",
                                    border: isSelected 
                                        ? "1px solid rgba(0, 200, 255, 0.5)" 
                                        : "1px solid rgba(0, 200, 255, 0.15)",
                                    borderRadius: "12px",
                                    padding: "14px",
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    cursor: "pointer",
                                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                                    boxShadow: isSelected 
                                        ? "0 8px 32px rgba(0, 200, 255, 0.25), 0 0 0 1px rgba(0, 200, 255, 0.1)" 
                                        : "none",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = "rgba(0, 200, 255, 0.15)";
                                        e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                                        e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                                        e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.3)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                        e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                    } else {
                                        e.currentTarget.style.transform = "scale(1.02)";
                                        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 200, 255, 0.25), 0 0 0 1px rgba(0, 200, 255, 0.1)";
                                    }
                                }}
                            >
                                {/* Header */}
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                            <FlagIcon lang={voice.primaryLanguage} />
                                            <h3
                                                style={{
                                                    fontSize: "14px",
                                                    fontWeight: "600",
                                                    color: "white",
                                                    margin: 0,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {voice.name}
                                            </h3>
                                        </div>
                                        {voice.primaryLanguage && (
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "rgba(255,255,255,0.4)",
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                {voice.primaryLanguage}
                                            </span>
                                        )}
                                    </div>

                                    {/* Play Button */}
                                    <button
                                        onClick={() => handlePlayPreview(voice)}
                                        disabled={!voice.previewUrl}
                                        style={{
                                            width: "34px",
                                            height: "34px",
                                            borderRadius: "50%",
                                            background: isPlaying
                                                ? "linear-gradient(135deg, #ec4899 0%, #00C8FF 100%)"
                                                : "rgba(0, 200, 255, 0.2)",
                                            border: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: voice.previewUrl ? "pointer" : "not-allowed",
                                            opacity: voice.previewUrl ? 1 : 0.5,
                                            transition: "all 0.2s ease",
                                            flexShrink: 0,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (voice.previewUrl && !isPlaying) {
                                                e.currentTarget.style.background = "rgba(0, 200, 255, 0.4)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isPlaying) {
                                                e.currentTarget.style.background = "rgba(0, 200, 255, 0.2)";
                                            }
                                        }}
                                    >
                                        {isPlaying ? (
                                            <Pause size={18} color="white" />
                                        ) : (
                                            <Play size={18} color="white" style={{ marginLeft: "2px" }} />
                                        )}
                                    </button>
                                </div>

                                {/* Description */}
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "rgba(255,255,255,0.5)",
                                        margin: "0 0 10px 0",
                                        lineHeight: "1.4",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                    }}
                                >
                                    {voice.description || "No description available"}
                                </p>

                                {/* Footer - Provider Badge */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span
                                        style={{
                                            padding: "3px 8px",
                                            borderRadius: "5px",
                                            fontSize: "11px",
                                            fontWeight: "500",
                                            color: providerStyle.color,
                                            background: providerStyle.bg,
                                        }}
                                    >
                                        {voice.provider}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            color: "rgba(255,255,255,0.3)",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {voice.ownership}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CSS for spin animation */}
            <style jsx global>{`
                @keyframes spin {
                    from {
                        transform: translateY(-50%) rotate(0deg);
                    }
                    to {
                        transform: translateY(-50%) rotate(360deg);
                    }
                }
                
                .voice-card {
                    animation: fadeInUp 0.4s ease-out;
                    animation-fill-mode: both;
                }
                
                .voice-card:nth-child(1) { animation-delay: 0.05s; }
                .voice-card:nth-child(2) { animation-delay: 0.1s; }
                .voice-card:nth-child(3) { animation-delay: 0.15s; }
                .voice-card:nth-child(4) { animation-delay: 0.2s; }
                .voice-card:nth-child(5) { animation-delay: 0.25s; }
                .voice-card:nth-child(6) { animation-delay: 0.3s; }
                .voice-card:nth-child(7) { animation-delay: 0.35s; }
                .voice-card:nth-child(8) { animation-delay: 0.4s; }
                .voice-card:nth-child(9) { animation-delay: 0.45s; }
                .voice-card:nth-child(10) { animation-delay: 0.5s; }
                .voice-card:nth-child(n+11) { animation-delay: 0.55s; }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .voice-card:active {
                    transform: scale(0.98) !important;
                }

                /* Custom scrollbar for voices section */
                .voices-scroll-container {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 200, 255, 0.3) transparent;
                }
                
                .voices-scroll-container::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                
                .voices-scroll-container::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .voices-scroll-container::-webkit-scrollbar-thumb {
                    background-color: rgba(0, 200, 255, 0.3);
                    border-radius: 4px;
                }
                
                .voices-scroll-container::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(0, 200, 255, 0.5);
                }
            `}</style>
        </div>
    );
}
