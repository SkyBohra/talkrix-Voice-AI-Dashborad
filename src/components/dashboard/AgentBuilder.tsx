"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
    Mic, Save, Loader2, Search, Play, Pause, X, 
    MessageSquare, Settings, Clock, Sparkles, 
    ChevronDown, Volume2, Bot, 
    Wand2, Database, Wrench, Copy, Check,
    Phone, Plus, Trash2
} from "lucide-react";
import { fetchVoices } from "../../lib/agentApi";

interface Voice {
    voiceId: string;
    name: string;
    description: string;
    primaryLanguage: string | null;
    previewUrl: string;
    provider: string;
}

interface InactivityMessage {
    id: string;
    duration: string;
    text: string;
    endBehavior?: string;
}

interface FormData {
    name: string;
    systemPrompt: string;
    temperature: number;
    voice: string;
    firstSpeakerText: string;
    firstSpeakerUninterruptible: boolean;
    joinTimeout: string;
    maxDuration: string;
    recordingEnabled: boolean;
    inactivityMessages: InactivityMessage[];
}

interface AgentBuilderProps {
    formData: FormData;
    setFormData: (data: FormData) => void;
    onSave: () => void;
    onClose: () => void;
    loading: boolean;
    isEditing: boolean;
    agentId?: string;
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

type TabType = 'prompt' | 'greeting' | 'inactivity' | 'settings';

export default function AgentBuilder({ 
    formData, 
    setFormData, 
    onSave, 
    onClose, 
    loading, 
    isEditing,
    agentId
}: AgentBuilderProps) {
    const [activeTab, setActiveTab] = useState<TabType>('prompt');
    const [voices, setVoices] = useState<Voice[]>([]);
    const [voicesLoading, setVoicesLoading] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
    const [voiceSearch, setVoiceSearch] = useState(formData.voice || '');
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
    const [testMessages, setTestMessages] = useState<{role: 'user' | 'agent', text: string}[]>([]);
    const [testInput, setTestInput] = useState('');
    const [testMode, setTestMode] = useState<'voice' | 'text'>('text');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);
    
    const voiceDropdownRef = useRef<HTMLDivElement>(null);
    const debouncedVoiceSearch = useDebounce(voiceSearch, 300);

    // Load voices
    const loadVoices = useCallback(async (search?: string) => {
        setVoicesLoading(true);
        try {
            const res = await fetchVoices(search);
            if (res.success && res.data?.results) {
                setVoices(res.data.results);
            }
        } catch (error) {
            console.error('Failed to fetch voices:', error);
        } finally {
            setVoicesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isVoiceDropdownOpen) {
            loadVoices(debouncedVoiceSearch || undefined);
        }
    }, [debouncedVoiceSearch, isVoiceDropdownOpen, loadVoices]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
                setIsVoiceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePlayPreview = (voice: Voice) => {
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
        audio.play();
        setAudioRef(audio);
        setPlayingVoiceId(voice.voiceId);
    };

    const handleVoiceSelect = (voice: Voice) => {
        setSelectedVoice(voice);
        setVoiceSearch(voice.name);
        setFormData({ ...formData, voice: voice.voiceId });
        setIsVoiceDropdownOpen(false);
    };

    const getProviderColor = (provider: string) => {
        const colors: Record<string, { color: string; bg: string }> = {
            "Eleven Labs": { color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" },
            "Cartesia": { color: "#a78bfa", bg: "rgba(120, 0, 255, 0.15)" },
            "Google": { color: "#4285f4", bg: "rgba(66, 133, 244, 0.15)" },
            "LMNT": { color: "#00C8FF", bg: "rgba(0, 200, 255, 0.15)" },
        };
        return colors[provider] || { color: "#9ca3af", bg: "rgba(156, 163, 175, 0.15)" };
    };

    const handleSaveClick = () => {
        onSave();
        setLastSaved(new Date());
    };

    const handleTestSend = () => {
        if (!testInput.trim()) return;
        
        setTestMessages(prev => [...prev, { role: 'user', text: testInput }]);
        
        // Simulate agent response
        setTimeout(() => {
            setTestMessages(prev => [...prev, { 
                role: 'agent', 
                text: formData.firstSpeakerText || "Hello! How can I assist you today?" 
            }]);
        }, 1000);
        
        setTestInput('');
    };

    const copyAgentId = () => {
        if (agentId) {
            navigator.clipboard.writeText(agentId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Inactivity Messages handlers
    const addInactivityMessage = () => {
        const newId = String(Date.now());
        setFormData({
            ...formData,
            inactivityMessages: [
                ...formData.inactivityMessages,
                { id: newId, duration: '15s', text: '' }
            ]
        });
    };

    const updateInactivityMessage = (id: string, field: 'duration' | 'text' | 'endBehavior', value: string | undefined) => {
        setFormData({
            ...formData,
            inactivityMessages: formData.inactivityMessages.map(msg =>
                msg.id === id ? { ...msg, [field]: value } : msg
            )
        });
    };

    const deleteInactivityMessage = (id: string) => {
        if (formData.inactivityMessages.length <= 1) return;
        setFormData({
            ...formData,
            inactivityMessages: formData.inactivityMessages.filter(msg => msg.id !== id)
        });
    };

    const toggleEndBehavior = (id: string) => {
        setFormData({
            ...formData,
            inactivityMessages: formData.inactivityMessages.map(msg =>
                msg.id === id 
                    ? { ...msg, endBehavior: msg.endBehavior ? undefined : 'END_BEHAVIOR_HANG_UP_SOFT' }
                    : msg
            )
        });
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'prompt', label: 'Prompt', icon: <Sparkles size={16} /> },
        { id: 'greeting', label: 'Greeting', icon: <MessageSquare size={16} /> },
        { id: 'inactivity', label: 'Inactivity Messages', icon: <Clock size={16} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
    ];

    const getMessageGradient = (index: number, isLast: boolean) => {
        if (isLast) return 'linear-gradient(135deg, #FF3C64, #ef4444)';
        const gradients = [
            'linear-gradient(135deg, #00C8FF, #7800FF)',
            'linear-gradient(135deg, #7800FF, #FF3C64)',
            'linear-gradient(135deg, #22c55e, #10b981)',
            'linear-gradient(135deg, #f59e0b, #d97706)',
            'linear-gradient(135deg, #8b5cf6, #6366f1)',
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Top Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 24px',
                borderBottom: '1px solid rgba(0, 200, 255, 0.1)',
                background: 'rgba(10, 20, 40, 0.95)',
            }}>
                {/* Left Section - Agent Name & Voice */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.5)',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                        }}
                    >
                        <X size={20} />
                    </button>
                    
                    {/* Agent Name Input */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Agent_Name"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                padding: '8px 12px',
                                width: '180px',
                                outline: 'none',
                                borderBottom: '2px solid transparent',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.currentTarget.style.borderBottomColor = '#00C8FF'}
                            onBlur={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
                        />
                    </div>

                    <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />

                    {/* Voice Selector */}
                    <div ref={voiceDropdownRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => {
                                setIsVoiceDropdownOpen(!isVoiceDropdownOpen);
                                if (!voices.length) loadVoices();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                background: 'rgba(0, 200, 255, 0.1)',
                                border: '1px solid rgba(0, 200, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            <Mic size={16} color="#00C8FF" />
                            <span>{selectedVoice?.name || voiceSearch || 'Select Voice'}</span>
                            <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                        </button>

                        {isVoiceDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                marginTop: '8px',
                                width: '320px',
                                background: 'rgba(15, 20, 35, 0.98)',
                                border: '1px solid rgba(0, 200, 255, 0.2)',
                                borderRadius: '12px',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                zIndex: 200,
                                overflow: 'hidden',
                            }}>
                                <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={16} style={{
                                            position: 'absolute',
                                            left: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'rgba(255,255,255,0.4)',
                                        }} />
                                        <input
                                            type="text"
                                            value={voiceSearch}
                                            onChange={(e) => setVoiceSearch(e.target.value)}
                                            placeholder="Search voices..."
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px 10px 40px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {voicesLoading ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                        </div>
                                    ) : voices.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                            No voices found
                                        </div>
                                    ) : voices.map(voice => {
                                        const providerStyle = getProviderColor(voice.provider);
                                        const isPlaying = playingVoiceId === voice.voiceId;
                                        return (
                                            <div
                                                key={voice.voiceId}
                                                onClick={() => handleVoiceSelect(voice)}
                                                style={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 200, 255, 0.08)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: '500', color: 'white', fontSize: '14px', marginBottom: '4px' }}>
                                                        {voice.name}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            color: providerStyle.color,
                                                            background: providerStyle.bg,
                                                        }}>
                                                            {voice.provider}
                                                        </span>
                                                        {voice.primaryLanguage && (
                                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                                                {voice.primaryLanguage}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {voice.previewUrl && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePlayPreview(voice);
                                                        }}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: isPlaying 
                                                                ? 'linear-gradient(135deg, #00C8FF, #7800FF)' 
                                                                : 'rgba(0, 200, 255, 0.2)',
                                                            border: 'none',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {isPlaying ? <Pause size={14} color="white" /> : <Play size={14} color="white" style={{ marginLeft: '2px' }} />}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tools Button */}
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}>
                        <Wrench size={16} />
                        <span>Tools (0)</span>
                        <ChevronDown size={14} />
                    </button>

                    {/* RAG Button */}
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}>
                        <Database size={16} />
                        <span>RAG</span>
                        <ChevronDown size={14} />
                    </button>
                </div>

                {/* Right Section - Save */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {lastSaved && (
                        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={handleSaveClick}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: loading ? 'rgba(0, 200, 255, 0.5)' : 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            boxShadow: '0 0 20px rgba(0, 200, 255, 0.3)',
                        }}
                    >
                        {loading ? (
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Save size={16} />
                        )}
                        <span>{loading ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Panel - Editor */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0, 200, 255, 0.1)' }}>
                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '0',
                        padding: '0 24px',
                        background: 'rgba(10, 20, 40, 0.5)',
                        borderBottom: '1px solid rgba(0, 200, 255, 0.1)',
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '16px 20px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === tab.id ? '2px solid #00C8FF' : '2px solid transparent',
                                    color: activeTab === tab.id ? '#00C8FF' : 'rgba(255, 255, 255, 0.5)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: activeTab === tab.id ? '600' : '400',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                        {activeTab === 'prompt' && (
                            <div style={{ height: '100%' }}>
                                <textarea
                                    value={formData.systemPrompt}
                                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                                    placeholder="Enter your system prompt here...

Example: You are a helpful customer service agent for TechCorp. You assist customers with product inquiries, troubleshooting, and general support. Always be polite, professional, and thorough in your responses.

Key responsibilities:
• Answer product questions
• Help troubleshoot issues
• Provide order status updates
• Escalate complex issues when needed"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: '400px',
                                        padding: '20px',
                                        background: 'rgba(5, 10, 20, 0.5)',
                                        border: '1px solid rgba(0, 200, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '14px',
                                        lineHeight: '1.8',
                                        outline: 'none',
                                        resize: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.3)'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.1)'}
                                />
                            </div>
                        )}

                        {activeTab === 'greeting' && (
                            <div>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                                        First Message
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '16px' }}>
                                        This is what your agent will say when the call starts.
                                    </p>
                                    <textarea
                                        value={formData.firstSpeakerText}
                                        onChange={(e) => setFormData({ ...formData, firstSpeakerText: e.target.value })}
                                        placeholder="Hello! Thank you for calling. How can I help you today?"
                                        rows={4}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            background: 'rgba(5, 10, 20, 0.5)',
                                            border: '1px solid rgba(0, 200, 255, 0.1)',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontSize: '14px',
                                            lineHeight: '1.6',
                                            outline: 'none',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(0, 200, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                    <input
                                        type="checkbox"
                                        id="uninterruptible"
                                        checked={formData.firstSpeakerUninterruptible}
                                        onChange={(e) => setFormData({ ...formData, firstSpeakerUninterruptible: e.target.checked })}
                                        style={{ width: '18px', height: '18px', accentColor: '#00C8FF' }}
                                    />
                                    <label htmlFor="uninterruptible" style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                                        Make greeting uninterruptible (user cannot speak over it)
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'inactivity' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                                            Inactivity Messages
                                        </h3>
                                        <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            Messages sent when the user is silent for too long. Add as many as you need.
                                        </p>
                                    </div>
                                    <button
                                        onClick={addInactivityMessage}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '10px 16px',
                                            background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                        }}
                                    >
                                        <Plus size={16} />
                                        Add Message
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {formData.inactivityMessages.map((msg, index) => {
                                        const isLast = msg.endBehavior === 'END_BEHAVIOR_HANG_UP_SOFT';
                                        return (
                                            <div 
                                                key={msg.id} 
                                                style={{ 
                                                    padding: '20px', 
                                                    background: 'rgba(5, 10, 20, 0.5)', 
                                                    borderRadius: '12px', 
                                                    border: `1px solid ${isLast ? 'rgba(255, 60, 100, 0.3)' : 'rgba(0, 200, 255, 0.1)'}`,
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ 
                                                            width: '28px', 
                                                            height: '28px', 
                                                            borderRadius: '50%', 
                                                            background: getMessageGradient(index, isLast),
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center', 
                                                            fontSize: '12px', 
                                                            fontWeight: '600', 
                                                            color: 'white' 
                                                        }}>
                                                            {index + 1}
                                                        </div>
                                                        <span style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>
                                                            Message {index + 1}
                                                        </span>
                                                        {isLast && (
                                                            <span style={{ 
                                                                fontSize: '11px', 
                                                                padding: '3px 10px', 
                                                                background: 'rgba(255, 60, 100, 0.2)', 
                                                                color: '#FF3C64', 
                                                                borderRadius: '4px',
                                                                fontWeight: '500'
                                                            }}>
                                                                🔴 Ends Call
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={() => toggleEndBehavior(msg.id)}
                                                            title={isLast ? "Remove hang up behavior" : "Set as final message (hangs up)"}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                background: isLast ? 'rgba(255, 60, 100, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                                border: `1px solid ${isLast ? 'rgba(255, 60, 100, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                                borderRadius: '6px',
                                                                color: isLast ? '#FF3C64' : 'rgba(255, 255, 255, 0.5)',
                                                                cursor: 'pointer',
                                                                fontSize: '11px',
                                                            }}
                                                        >
                                                            <Phone size={12} />
                                                            {isLast ? 'Hang Up' : 'Set Hang Up'}
                                                        </button>
                                                        {formData.inactivityMessages.length > 1 && (
                                                            <button
                                                                onClick={() => deleteInactivityMessage(msg.id)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    background: 'rgba(255, 60, 100, 0.1)',
                                                                    border: '1px solid rgba(255, 60, 100, 0.2)',
                                                                    borderRadius: '6px',
                                                                    color: '#FF3C64',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                                                            Wait Time
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={msg.duration}
                                                            onChange={(e) => updateInactivityMessage(msg.id, 'duration', e.target.value)}
                                                            placeholder="30s"
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                background: 'rgba(0,0,0,0.3)',
                                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                                borderRadius: '8px',
                                                                color: 'white',
                                                                fontSize: '14px',
                                                                outline: 'none',
                                                                boxSizing: 'border-box',
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                                                            Message Text
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={msg.text}
                                                            onChange={(e) => updateInactivityMessage(msg.id, 'text', e.target.value)}
                                                            placeholder={index === 0 ? "Are you still there?" : "Enter your message..."}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                background: 'rgba(0,0,0,0.3)',
                                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                                borderRadius: '8px',
                                                                color: 'white',
                                                                fontSize: '14px',
                                                                outline: 'none',
                                                                boxSizing: 'border-box',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Helper Text */}
                                <div style={{ 
                                    marginTop: '20px', 
                                    padding: '16px', 
                                    background: 'rgba(0, 200, 255, 0.05)', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0, 200, 255, 0.1)',
                                }}>
                                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.6' }}>
                                        💡 <strong style={{ color: 'white' }}>Tip:</strong> Set one message as "Hang Up" to automatically end the call after that message plays. 
                                        Messages play in order when the user is silent for the specified duration.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '24px' }}>
                                    Call Settings
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ padding: '20px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                            Join Timeout
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.joinTimeout}
                                            onChange={(e) => setFormData({ ...formData, joinTimeout: e.target.value })}
                                            placeholder="30s"
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                                            Time to wait for user to join the call
                                        </p>
                                    </div>

                                    <div style={{ padding: '20px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                            Max Duration
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.maxDuration}
                                            onChange={(e) => setFormData({ ...formData, maxDuration: e.target.value })}
                                            placeholder="300s"
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                                            Maximum call duration (e.g., 300s = 5 minutes)
                                        </p>
                                    </div>

                                    <div style={{ padding: '20px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                            Temperature
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={formData.temperature}
                                            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                                            style={{
                                                width: '100%',
                                                accentColor: '#00C8FF',
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Focused (0)</span>
                                            <span style={{ fontSize: '14px', color: '#00C8FF', fontWeight: '600' }}>{formData.temperature}</span>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Creative (1)</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '20px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                                                    Call Recording
                                                </label>
                                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                                    Record all calls for quality assurance
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setFormData({ ...formData, recordingEnabled: !formData.recordingEnabled })}
                                                style={{
                                                    width: '52px',
                                                    height: '28px',
                                                    borderRadius: '14px',
                                                    background: formData.recordingEnabled 
                                                        ? 'linear-gradient(135deg, #00C8FF, #7800FF)' 
                                                        : 'rgba(255,255,255,0.1)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    position: 'absolute',
                                                    top: '3px',
                                                    left: formData.recordingEnabled ? '27px' : '3px',
                                                    transition: 'left 0.2s',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Info Bar */}
                    {agentId && (
                        <div style={{
                            padding: '12px 24px',
                            borderTop: '1px solid rgba(0, 200, 255, 0.1)',
                            background: 'rgba(10, 20, 40, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>Agent ID:</span>
                                <code style={{ 
                                    fontSize: '12px', 
                                    color: '#00C8FF', 
                                    background: 'rgba(0, 200, 255, 0.1)', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                }}>
                                    {agentId}
                                </code>
                                <button
                                    onClick={copyAgentId}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        color: copied ? '#22c55e' : 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                last saved: {lastSaved ? lastSaved.toLocaleTimeString() : 'Just now'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right Panel - Test Agent */}
                <div style={{
                    width: '420px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(5, 10, 20, 0.5)',
                }}>
                    {/* Test Panel Header */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(0, 200, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.2), rgba(120, 0, 255, 0.2))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Bot size={18} color="#00C8FF" />
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>New Chat</span>
                        </div>
                        <button style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '8px',
                            color: '#22c55e',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                        }}>
                            <Play size={14} />
                            Test Agent
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div style={{
                        flex: 1,
                        padding: '20px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }}>
                        {testMessages.length === 0 ? (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: '40px',
                            }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.1), rgba(120, 0, 255, 0.1))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px',
                                }}>
                                    <Wand2 size={28} color="#00C8FF" />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                                    Test Your Agent
                                </h3>
                                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: '1.6' }}>
                                    Click "Test Agent" or type a message below to start a conversation with your AI agent.
                                </p>
                            </div>
                        ) : (
                            testMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    <div style={{
                                        maxWidth: '80%',
                                        padding: '12px 16px',
                                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        background: msg.role === 'user' 
                                            ? 'linear-gradient(135deg, #00C8FF, #7800FF)' 
                                            : 'rgba(255, 255, 255, 0.08)',
                                        color: 'white',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Suggestions */}
                    {testMessages.length === 0 && (
                        <div style={{ padding: '0 20px 16px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Suggestions
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                {['Help me create an agent.', 'What can you do?', 'Tell me about yourself.'].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => {
                                            setTestInput(suggestion);
                                            handleTestSend();
                                        }}
                                        style={{
                                            padding: '8px 14px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '20px',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.3)';
                                            e.currentTarget.style.background = 'rgba(0, 200, 255, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div style={{
                        padding: '16px 20px',
                        borderTop: '1px solid rgba(0, 200, 255, 0.1)',
                        background: 'rgba(10, 20, 40, 0.8)',
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-end',
                        }}>
                            <div style={{ flex: 1 }}>
                                <textarea
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleTestSend();
                                        }
                                    }}
                                    placeholder="Type your message..."
                                    rows={1}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(0, 200, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '12px',
                        }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setTestMode('voice')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        background: testMode === 'voice' ? 'rgba(0, 200, 255, 0.2)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: testMode === 'voice' ? 'rgba(0, 200, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        color: testMode === 'voice' ? '#00C8FF' : 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Volume2 size={14} />
                                    Voice
                                </button>
                                <button
                                    onClick={() => setTestMode('text')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        background: testMode === 'text' ? 'rgba(0, 200, 255, 0.2)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: testMode === 'text' ? 'rgba(0, 200, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        color: testMode === 'text' ? '#00C8FF' : 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <MessageSquare size={14} />
                                    Text
                                </button>
                            </div>

                            <button
                                onClick={handleTestSend}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                <span>↵</span>
                                Enter to Submit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
