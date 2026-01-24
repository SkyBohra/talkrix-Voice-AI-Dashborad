"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
    Mic, Save, Loader2, Search, Play, Pause, X, 
    MessageSquare, Settings, Clock, Sparkles, 
    ChevronDown, Bot, 
    Database, Wrench, Copy, Check,
    Phone, Plus, Trash2, Sliders, Globe, Zap, AlertCircle,
    PhoneCall, Voicemail, Music, PhoneOff, ChevronUp
} from "lucide-react";
import { fetchVoices } from "../../lib/agentApi";
import { fetchUserTools, Tool } from "../../lib/toolApi";
import { listCorpora, Corpus } from "../../lib/corpusApi";

// Sanitize agent name to match Ultravox pattern: ^[a-zA-Z0-9_-]{1,64}$
function sanitizeAgentName(name: string): string {
    if (!name) return '';
    return name
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9_-]/g, '') // Remove invalid characters
        .substring(0, 64);              // Limit to 64 characters
}

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

interface VADSettings {
    turnEndpointDelay: string;
    minimumTurnDuration: string;
    minimumInterruptionDuration: string;
    frameActivationThreshold: number;
}

interface FormData {
    name: string;
    systemPrompt: string;
    temperature: number;
    voice: string;
    corpusId?: string; // RAG Knowledge Base
    firstSpeaker: 'agent' | 'user';
    firstSpeakerText: string;
    firstSpeakerUninterruptible: boolean;
    firstSpeakerDelay: string;
    userFallbackDelay: string;
    userFallbackText: string;
    joinTimeout: string;
    maxDuration: string;
    recordingEnabled: boolean;
    inactivityMessages: InactivityMessage[];
    // Tools
    selectedTools: Tool[];
    // Advanced settings
    languageHint: string;
    timeExceededMessage: string;
    initialOutputMedium: string;
    vadSettings: VADSettings;
}

// Extended Tool interface for built-in tools
interface ExtendedTool extends Tool {
    isComingSoon?: boolean;
    requiresRag?: boolean;
    displayName?: string;
}

// Built-in tools
const BUILT_IN_TOOLS: ExtendedTool[] = [
    {
        talkrixToolId: "builtin-hang-up",
        name: "hangUp",
        displayName: "Hang Up",
        ownership: "public",
        definition: {
            modelToolName: "hangUp",
            description: "End the current call.",
        },
    },
    {
        talkrixToolId: "builtin-leave-voicemail",
        name: "leaveVoicemail",
        displayName: "Leave a Voicemail",
        ownership: "public",
        definition: {
            modelToolName: "leaveVoicemail",
            description: "Allow the caller to leave a voicemail message.",
        },
    },
    {
        talkrixToolId: "builtin-query-corpus",
        name: "queryCorpus",
        displayName: "Query Corpus",
        ownership: "public",
        requiresRag: true,
        definition: {
            modelToolName: "queryCorpus",
            description: "Search through a knowledge base or document corpus.",
        },
    },
    {
        talkrixToolId: "builtin-play-dtmf",
        name: "playDtmfSounds",
        displayName: "Play DTMF",
        ownership: "public",
        definition: {
            modelToolName: "playDtmfSounds",
            description: "Play DTMF (touch-tone) sounds during the call.",
        },
    },
    {
        talkrixToolId: "builtin-warm-transfer",
        name: "warmTransfer",
        displayName: "Warm Transfer",
        ownership: "public",
        isComingSoon: true,
        definition: {
            modelToolName: "warmTransfer",
            description: "Transfer the call with a warm handoff.",
        },
    },
    {
        talkrixToolId: "builtin-cold-transfer",
        name: "coldTransfer",
        displayName: "Cold Transfer",
        ownership: "public",
        isComingSoon: true,
        definition: {
            modelToolName: "coldTransfer",
            description: "Transfer the call immediately (cold transfer).",
        },
    },
];

// Icon mapping for built-in tools
const builtInToolIcons: Record<string, React.ReactNode> = {
    warmTransfer: <PhoneCall size={16} />,
    coldTransfer: <Phone size={16} />,
    leaveVoicemail: <Voicemail size={16} />,
    queryCorpus: <Search size={16} />,
    playDtmfSounds: <Music size={16} />,
    hangUp: <PhoneOff size={16} />,
};

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

type TabType = 'prompt' | 'greeting' | 'tools' | 'inactivity' | 'settings' | 'advanced';

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
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);
    
    // Tools state
    const [customTools, setCustomTools] = useState<Tool[]>([]);
    const [toolsLoading, setToolsLoading] = useState(false);
    const [toolsTab, setToolsTab] = useState<'builtin' | 'custom'>('builtin');
    const [hoveredTool, setHoveredTool] = useState<string | null>(null);
    const [showRagRequiredMessage, setShowRagRequiredMessage] = useState(false);
    
    // RAG (Corpus) state
    const [corpora, setCorpora] = useState<Corpus[]>([]);
    const [corporaLoading, setCorporaLoading] = useState(false);
    const [selectedCorpus, setSelectedCorpus] = useState<Corpus | null>(null);
    const [corpusSearch, setCorpusSearch] = useState('');
    const [isCorpusDropdownOpen, setIsCorpusDropdownOpen] = useState(false);
    
    const voiceDropdownRef = useRef<HTMLDivElement>(null);
    const corpusDropdownRef = useRef<HTMLDivElement>(null);
    const debouncedVoiceSearch = useDebounce(voiceSearch, 300);
    const debouncedCorpusSearch = useDebounce(corpusSearch, 300);

    // Load custom tools
    const loadCustomTools = useCallback(async () => {
        setToolsLoading(true);
        try {
            const res = await fetchUserTools();
            if (res.success && res.data) {
                setCustomTools(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch custom tools:', error);
        } finally {
            setToolsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCustomTools();
    }, [loadCustomTools]);

    // Load corpora (RAG knowledge bases)
    const loadCorpora = useCallback(async () => {
        setCorporaLoading(true);
        try {
            const res = await listCorpora();
            if (res.success && res.data) {
                setCorpora(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch corpora:', error);
        } finally {
            setCorporaLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCorpora();
    }, [loadCorpora]);

    // Load existing corpus for edit mode
    useEffect(() => {
        if (formData.corpusId && corpora.length > 0) {
            const existingCorpus = corpora.find(c => c.talkrixCorpusId === formData.corpusId || c._id === formData.corpusId);
            if (existingCorpus) {
                setSelectedCorpus(existingCorpus);
                setCorpusSearch(existingCorpus.name);
            }
        } else if (!formData.corpusId) {
            // Reset when no corpusId in formData
            setSelectedCorpus(null);
            setCorpusSearch('');
        }
    }, [formData.corpusId, corpora]);

    // Filter corpora based on search
    const filteredCorpora = corpora.filter(corpus => 
        corpus.name.toLowerCase().includes(debouncedCorpusSearch.toLowerCase()) ||
        (corpus.description && corpus.description.toLowerCase().includes(debouncedCorpusSearch.toLowerCase()))
    );

    // Corpus selection handler
    const handleCorpusSelect = (corpus: Corpus) => {
        setSelectedCorpus(corpus);
        setCorpusSearch(corpus.name);
        setFormData({ ...formData, corpusId: corpus.talkrixCorpusId });
        setIsCorpusDropdownOpen(false);
    };

    // Tool selection helpers
    const isToolSelected = (tool: Tool) => {
        const selectedTools = formData.selectedTools || [];
        return selectedTools.some(t => {
            // For built-in tools, compare by talkrixToolId
            if (tool.talkrixToolId && t.talkrixToolId) {
                return t.talkrixToolId === tool.talkrixToolId;
            }
            // For custom tools, compare by _id
            if (tool._id && t._id) {
                return t._id === tool._id;
            }
            // Fallback: compare by name
            return t.name === tool.name;
        });
    };

    const toggleToolSelection = (tool: Tool) => {
        const currentTools = formData.selectedTools || [];
        if (isToolSelected(tool)) {
            // Remove tool
            setFormData({
                ...formData,
                selectedTools: currentTools.filter(t => {
                    if (tool.talkrixToolId && t.talkrixToolId) {
                        return t.talkrixToolId !== tool.talkrixToolId;
                    }
                    if (tool._id && t._id) {
                        return t._id !== tool._id;
                    }
                    return t.name !== tool.name;
                })
            });
        } else {
            // Add tool
            setFormData({
                ...formData,
                selectedTools: [...currentTools, tool]
            });
        }
    };

    const removeSelectedTool = (tool: Tool) => {
        const currentTools = formData.selectedTools || [];
        setFormData({
            ...formData,
            selectedTools: currentTools.filter(t => {
                if (tool.talkrixToolId && t.talkrixToolId) {
                    return t.talkrixToolId !== tool.talkrixToolId;
                }
                if (tool._id && t._id) {
                    return t._id !== tool._id;
                }
                return t.name !== tool.name;
            })
        });
    };

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
            if (corpusDropdownRef.current && !corpusDropdownRef.current.contains(event.target as Node)) {
                setIsCorpusDropdownOpen(false);
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
        { id: 'tools', label: 'Tools', icon: <Wrench size={16} /> },
        { id: 'inactivity', label: 'Inactivity', icon: <Clock size={16} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
        { id: 'advanced', label: 'Advanced', icon: <Sliders size={16} /> },
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
            position: 'fixed',
            top: 0,
            left: 'var(--sidebar-width, 260px)',
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(5, 10, 20, 0.99) 0%, rgba(8, 15, 30, 0.99) 100%)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
            transition: 'left 0.3s ease',
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
                            onChange={(e) => setFormData({ ...formData, name: sanitizeAgentName(e.target.value) })}
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

                    {/* RAG Dropdown */}
                    <div ref={corpusDropdownRef} style={{ position: 'relative' }}>
                        <button 
                            onClick={() => setIsCorpusDropdownOpen(!isCorpusDropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                background: selectedCorpus ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                border: selectedCorpus ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: selectedCorpus ? '#22c55e' : 'rgba(255, 255, 255, 0.6)',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            <Database size={16} />
                            <span>{selectedCorpus ? selectedCorpus.name : 'RAG'}</span>
                            {selectedCorpus && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCorpus(null);
                                        setCorpusSearch('');
                                        setFormData({ ...formData, corpusId: undefined });
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                >
                                    <X size={10} color="white" />
                                </span>
                            )}
                            <ChevronDown size={14} style={{ transform: isCorpusDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>

                        {/* RAG Dropdown Menu */}
                        {isCorpusDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: 0,
                                minWidth: '320px',
                                background: 'linear-gradient(180deg, rgba(20, 30, 50, 0.98) 0%, rgba(10, 15, 30, 0.98) 100%)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: '12px',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                                zIndex: 1000,
                                overflow: 'hidden',
                            }}>
                                {/* Search Input */}
                                <div style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
                                        <input
                                            type="text"
                                            value={corpusSearch}
                                            onChange={(e) => setCorpusSearch(e.target.value)}
                                            placeholder="Search knowledge bases..."
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px 10px 36px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Corpus List */}
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {corporaLoading ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                            <p style={{ marginTop: '8px', fontSize: '14px' }}>Loading knowledge bases...</p>
                                        </div>
                                    ) : filteredCorpora.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            <Database size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                            <p style={{ fontSize: '14px' }}>
                                                {corpora.length === 0 ? 'No knowledge bases created yet.' : 'No matching knowledge bases.'}
                                            </p>
                                            {corpora.length === 0 && (
                                                <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Go to RAG section to create one.</p>
                                            )}
                                        </div>
                                    ) : (
                                        filteredCorpora.map((corpus) => (
                                            <button
                                                key={corpus._id}
                                                onClick={() => handleCorpusSelect(corpus)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    background: selectedCorpus?._id === corpus._id ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    textAlign: 'left',
                                                    transition: 'background 0.2s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = selectedCorpus?._id === corpus._id ? 'rgba(34, 197, 94, 0.15)' : 'transparent'}
                                            >
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    background: selectedCorpus?._id === corpus._id ? '#22c55e' : 'rgba(34, 197, 94, 0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    {selectedCorpus?._id === corpus._id ? (
                                                        <Check size={16} color="white" />
                                                    ) : (
                                                        <Database size={16} color="#22c55e" />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                                                        {corpus.name}
                                                    </div>
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {corpus.description || 'No description'}
                                                    </div>
                                                    {corpus.stats && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                            <span style={{
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '10px',
                                                                fontWeight: 500,
                                                                background: corpus.stats.status === 'CORPUS_STATUS_READY' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                                color: corpus.stats.status === 'CORPUS_STATUS_READY' ? '#22c55e' : '#f59e0b',
                                                            }}>
                                                                {corpus.stats.status === 'CORPUS_STATUS_READY' ? 'Ready' : 'Processing'}
                                                            </span>
                                                            {corpus.stats.numDocs !== undefined && (
                                                                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                                                    {corpus.stats.numDocs} docs
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedCorpus?._id === corpus._id && (
                                                    <Check size={16} color="#22c55e" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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
                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {activeTab === 'prompt' && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                                        flex: 1,
                                        minHeight: '300px',
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
                                {/* First Speaker Toggle */}
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>
                                        Who Speaks First?
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '16px' }}>
                                        Choose whether the agent or user initiates the conversation.
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, firstSpeaker: 'agent' })}
                                            style={{
                                                flex: 1,
                                                padding: '16px 20px',
                                                borderRadius: '12px',
                                                border: formData.firstSpeaker === 'agent' ? '2px solid #00C8FF' : '1px solid rgba(255, 255, 255, 0.1)',
                                                background: formData.firstSpeaker === 'agent' ? 'rgba(0, 200, 255, 0.15)' : 'rgba(5, 10, 20, 0.5)',
                                                color: formData.firstSpeaker === 'agent' ? '#00C8FF' : 'rgba(255, 255, 255, 0.6)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <Bot size={24} />
                                            <span style={{ fontWeight: '600', fontSize: '14px' }}>Agent Speaks First</span>
                                            <span style={{ fontSize: '11px', opacity: 0.7 }}>Agent greets the user</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, firstSpeaker: 'user' })}
                                            style={{
                                                flex: 1,
                                                padding: '16px 20px',
                                                borderRadius: '12px',
                                                border: formData.firstSpeaker === 'user' ? '2px solid #7800FF' : '1px solid rgba(255, 255, 255, 0.1)',
                                                background: formData.firstSpeaker === 'user' ? 'rgba(120, 0, 255, 0.15)' : 'rgba(5, 10, 20, 0.5)',
                                                color: formData.firstSpeaker === 'user' ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <MessageSquare size={24} />
                                            <span style={{ fontWeight: '600', fontSize: '14px' }}>User Speaks First</span>
                                            <span style={{ fontSize: '11px', opacity: 0.7 }}>Wait for user to speak</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Agent Speaks First Settings */}
                                {formData.firstSpeaker === 'agent' && (
                                    <div style={{ 
                                        padding: '20px', 
                                        background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.08), rgba(0, 200, 255, 0.02))', 
                                        borderRadius: '12px', 
                                        border: '1px solid rgba(0, 200, 255, 0.15)',
                                        marginBottom: '16px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                            <Bot size={18} color="#00C8FF" />
                                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>Agent Greeting Message</h4>
                                        </div>
                                        <textarea
                                            value={formData.firstSpeakerText}
                                            onChange={(e) => setFormData({ ...formData, firstSpeakerText: e.target.value })}
                                            placeholder="Hello! Thank you for calling. How can I help you today?"
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '14px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                borderRadius: '10px',
                                                color: 'white',
                                                fontSize: '14px',
                                                lineHeight: '1.6',
                                                outline: 'none',
                                                resize: 'vertical',
                                                fontFamily: 'inherit',
                                                boxSizing: 'border-box',
                                                marginBottom: '12px',
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input
                                                type="checkbox"
                                                id="agentUninterruptible"
                                                checked={formData.firstSpeakerUninterruptible}
                                                onChange={(e) => setFormData({ ...formData, firstSpeakerUninterruptible: e.target.checked })}
                                                style={{ width: '16px', height: '16px', accentColor: '#00C8FF' }}
                                            />
                                            <label htmlFor="agentUninterruptible" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                                Make greeting uninterruptible
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* User Speaks First Settings */}
                                {formData.firstSpeaker === 'user' && (
                                    <div style={{ 
                                        padding: '20px', 
                                        background: 'linear-gradient(135deg, rgba(120, 0, 255, 0.08), rgba(120, 0, 255, 0.02))', 
                                        borderRadius: '12px', 
                                        border: '1px solid rgba(120, 0, 255, 0.15)',
                                        marginBottom: '16px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                            <MessageSquare size={18} color="#a78bfa" />
                                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>Fallback Message</h4>
                                        </div>
                                        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                                            If the user doesn't speak within the delay time, the agent will say this message.
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px' }}>
                                                    Wait Time
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.userFallbackDelay || '5s'}
                                                    onChange={(e) => setFormData({ ...formData, userFallbackDelay: e.target.value })}
                                                    placeholder="5s"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        background: 'rgba(0, 0, 0, 0.3)',
                                                        border: '1px solid rgba(120, 0, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '6px' }}>
                                                    Fallback Message
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.userFallbackText || ''}
                                                    onChange={(e) => setFormData({ ...formData, userFallbackText: e.target.value })}
                                                    placeholder="Hello? Are you there? How can I help you?"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        background: 'rgba(0, 0, 0, 0.3)',
                                                        border: '1px solid rgba(120, 0, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Info Box */}
                                <div style={{ 
                                    padding: '14px 16px', 
                                    background: 'rgba(245, 158, 11, 0.1)', 
                                    borderRadius: '10px',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                }}>
                                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5' }}>
                                        💡 <strong style={{ color: '#fbbf24' }}>Tip:</strong> {formData.firstSpeaker === 'agent' 
                                            ? 'Agent speaks first is ideal for outbound calls or when you want to immediately greet callers.'
                                            : 'User speaks first is great for inbound calls where you want to listen to the caller\'s intent first.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Tools Tab */}
                        {activeTab === 'tools' && (
                            <div>
                                {/* Selected Tools Display */}
                                {(formData.selectedTools || []).length > 0 && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {(formData.selectedTools || []).map(tool => (
                                                <div
                                                    key={tool.talkrixToolId || tool._id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        background: tool.ownership === 'public' 
                                                            ? 'rgba(0, 200, 255, 0.15)' 
                                                            : 'rgba(120, 0, 255, 0.15)',
                                                        border: `1px solid ${tool.ownership === 'public' ? 'rgba(0, 200, 255, 0.3)' : 'rgba(120, 0, 255, 0.3)'}`,
                                                        color: tool.ownership === 'public' ? '#00C8FF' : '#a78bfa',
                                                        fontSize: '13px',
                                                    }}
                                                >
                                                    {tool.ownership === 'public' && builtInToolIcons[tool.name] && (
                                                        <span style={{ opacity: 0.8 }}>{builtInToolIcons[tool.name]}</span>
                                                    )}
                                                    {tool.ownership !== 'public' && <Wrench size={14} style={{ opacity: 0.8 }} />}
                                                    <span>{tool.name}</span>
                                                    <button
                                                        onClick={() => removeSelectedTool(tool)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '2px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            color: 'inherit',
                                                            opacity: 0.7,
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tools Selection Tabs */}
                                <div style={{ 
                                    display: 'flex', 
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
                                    marginBottom: '16px' 
                                }}>
                                    <button
                                        onClick={() => setToolsTab('builtin')}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: toolsTab === 'builtin' ? '#00C8FF' : 'rgba(255, 255, 255, 0.5)',
                                            borderBottom: toolsTab === 'builtin' ? '2px solid #00C8FF' : '2px solid transparent',
                                            marginBottom: '-1px',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Built-in Tools
                                    </button>
                                    <button
                                        onClick={() => setToolsTab('custom')}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: toolsTab === 'custom' ? '#a78bfa' : 'rgba(255, 255, 255, 0.5)',
                                            borderBottom: toolsTab === 'custom' ? '2px solid #a78bfa' : '2px solid transparent',
                                            marginBottom: '-1px',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        My Custom Tools
                                    </button>
                                </div>

                                {/* RAG Required Info Message */}
                                {showRagRequiredMessage && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 16px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        borderRadius: '10px',
                                        marginBottom: '16px',
                                    }}>
                                        <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                        <span style={{ fontSize: '13px', color: '#f59e0b' }}>
                                            Please select a RAG Knowledge Base in the Settings tab before choosing this tool.
                                        </span>
                                    </div>
                                )}

                                {/* Tools List */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                    gap: '12px' 
                                }}>
                                    {toolsTab === 'builtin' ? (
                                        BUILT_IN_TOOLS.map(tool => {
                                            const selected = isToolSelected(tool);
                                            const isHovered = hoveredTool === tool.talkrixToolId;
                                            const isComingSoon = tool.isComingSoon;
                                            const requiresRag = tool.requiresRag && !formData.corpusId;
                                            const isDisabled = isComingSoon || requiresRag;
                                            
                                            const handleClick = () => {
                                                if (isComingSoon) {
                                                    // Coming soon tools are not clickable
                                                    return;
                                                }
                                                if (requiresRag) {
                                                    // Show info message when trying to select queryCorpus without RAG
                                                    setShowRagRequiredMessage(true);
                                                    setTimeout(() => setShowRagRequiredMessage(false), 3000);
                                                    return;
                                                }
                                                toggleToolSelection(tool);
                                            };
                                            
                                            return (
                                                <button
                                                    key={tool.talkrixToolId}
                                                    type="button"
                                                    onClick={handleClick}
                                                    onMouseEnter={() => setHoveredTool(tool.talkrixToolId || null)}
                                                    onMouseLeave={() => setHoveredTool(null)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '16px',
                                                        background: isDisabled
                                                            ? 'rgba(255, 255, 255, 0.02)'
                                                            : selected 
                                                                ? 'rgba(0, 200, 255, 0.15)' 
                                                                : isHovered 
                                                                    ? 'rgba(0, 200, 255, 0.08)' 
                                                                    : 'rgba(255, 255, 255, 0.03)',
                                                        border: `1px solid ${isDisabled
                                                            ? 'rgba(255, 255, 255, 0.08)'
                                                            : selected 
                                                                ? 'rgba(0, 200, 255, 0.5)' 
                                                                : isHovered 
                                                                    ? 'rgba(0, 200, 255, 0.3)' 
                                                                    : 'rgba(255, 255, 255, 0.1)'}`,
                                                        borderRadius: '12px',
                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.2s ease',
                                                        transform: !isDisabled && isHovered && !selected ? 'translateY(-2px)' : 'translateY(0)',
                                                        boxShadow: isDisabled 
                                                            ? 'none'
                                                            : selected 
                                                                ? '0 0 20px rgba(0, 200, 255, 0.2)' 
                                                                : isHovered 
                                                                    ? '0 4px 12px rgba(0, 200, 255, 0.15)' 
                                                                    : 'none',
                                                        opacity: isDisabled ? 0.5 : 1,
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: isDisabled
                                                            ? 'rgba(255, 255, 255, 0.1)'
                                                            : selected 
                                                                ? '#00C8FF' 
                                                                : isHovered 
                                                                    ? 'rgba(0, 200, 255, 0.25)' 
                                                                    : 'rgba(0, 200, 255, 0.15)',
                                                        color: isDisabled ? 'rgba(255, 255, 255, 0.4)' : selected ? '#000' : '#00C8FF',
                                                        flexShrink: 0,
                                                        transition: 'all 0.2s ease',
                                                    }}>
                                                        {selected ? <Check size={18} /> : (builtInToolIcons[tool.name] || <Wrench size={18} />)}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ 
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            fontWeight: '500', 
                                                            color: isDisabled ? 'rgba(255, 255, 255, 0.5)' : selected || isHovered ? 'white' : 'rgba(255, 255, 255, 0.9)', 
                                                            fontSize: '14px',
                                                            marginBottom: '4px',
                                                            transition: 'color 0.2s ease',
                                                        }}>
                                                            {(tool as ExtendedTool).displayName || tool.name}
                                                            {isComingSoon && (
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                                    color: '#f59e0b',
                                                                    fontWeight: '500',
                                                                }}>
                                                                    Coming Soon
                                                                </span>
                                                            )}
                                                            {requiresRag && !isComingSoon && (
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                                    color: '#f59e0b',
                                                                    fontWeight: '500',
                                                                }}>
                                                                    Requires RAG
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ 
                                                            fontSize: '12px', 
                                                            color: isDisabled ? 'rgba(255, 255, 255, 0.3)' : selected || isHovered ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            transition: 'color 0.2s ease',
                                                        }}>
                                                            {tool.definition.description}
                                                        </div>
                                                    </div>
                                                    {selected && (
                                                        <Check size={16} style={{ color: '#00C8FF', flexShrink: 0 }} />
                                                    )}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        toolsLoading ? (
                                            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                                                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                                                <div>Loading custom tools...</div>
                                            </div>
                                        ) : customTools.length === 0 ? (
                                            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
                                                <Wrench size={32} style={{ color: 'rgba(255, 255, 255, 0.3)', marginBottom: '12px' }} />
                                                <div style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>No custom tools created yet</div>
                                                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.3)' }}>Go to Tools section to create one</div>
                                            </div>
                                        ) : (
                                            customTools.map(tool => {
                                                const selected = isToolSelected(tool);
                                                const toolKey = tool._id || tool.talkrixToolId || '';
                                                const isHovered = hoveredTool === toolKey;
                                                return (
                                                    <button
                                                        key={toolKey}
                                                        type="button"
                                                        onClick={() => toggleToolSelection(tool)}
                                                        onMouseEnter={() => setHoveredTool(toolKey)}
                                                        onMouseLeave={() => setHoveredTool(null)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '16px',
                                                            background: selected 
                                                                ? 'rgba(120, 0, 255, 0.15)' 
                                                                : isHovered 
                                                                    ? 'rgba(120, 0, 255, 0.08)' 
                                                                    : 'rgba(255, 255, 255, 0.03)',
                                                            border: `1px solid ${selected 
                                                                ? 'rgba(120, 0, 255, 0.5)' 
                                                                : isHovered 
                                                                    ? 'rgba(120, 0, 255, 0.3)' 
                                                                    : 'rgba(255, 255, 255, 0.1)'}`,
                                                            borderRadius: '12px',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            transition: 'all 0.2s ease',
                                                            transform: isHovered && !selected ? 'translateY(-2px)' : 'translateY(0)',
                                                            boxShadow: selected 
                                                                ? '0 0 20px rgba(120, 0, 255, 0.2)' 
                                                                : isHovered 
                                                                    ? '0 4px 12px rgba(120, 0, 255, 0.15)' 
                                                                    : 'none',
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: selected 
                                                                ? '#7800FF' 
                                                                : isHovered 
                                                                    ? 'rgba(120, 0, 255, 0.25)' 
                                                                    : 'rgba(120, 0, 255, 0.15)',
                                                            color: selected ? '#fff' : '#a78bfa',
                                                            flexShrink: 0,
                                                            transition: 'all 0.2s ease',
                                                        }}>
                                                            {selected ? <Check size={18} /> : <Wrench size={18} />}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ 
                                                                fontWeight: '500', 
                                                                color: selected || isHovered ? 'white' : 'rgba(255, 255, 255, 0.9)', 
                                                                fontSize: '14px',
                                                                marginBottom: '4px',
                                                                transition: 'color 0.2s ease',
                                                            }}>
                                                                {tool.name}
                                                            </div>
                                                            <div style={{ 
                                                                fontSize: '12px', 
                                                                color: selected || isHovered ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                transition: 'color 0.2s ease',
                                                            }}>
                                                                {tool.definition?.description || 'No description'}
                                                            </div>
                                                        </div>
                                                        {selected && (
                                                            <Check size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )
                                    )}
                                </div>

                                {/* Tip */}
                                <div style={{
                                    marginTop: '24px',
                                    padding: '16px',
                                    background: 'rgba(0, 200, 255, 0.05)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(0, 200, 255, 0.1)',
                                }}>
                                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5' }}>
                                        💡 <strong style={{ color: '#00C8FF' }}>Tip:</strong> Tools give your agent superpowers! Built-in tools include call transfer, voicemail, and more. Create custom tools to integrate with your APIs.
                                    </p>
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

                        {activeTab === 'advanced' && (
                            <div>
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sliders size={18} color="#00C8FF" />
                                        Advanced Settings
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                        Fine-tune your agent's behavior with advanced configuration options.
                                    </p>
                                </div>

                                {/* Language & Output Section */}
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#00C8FF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Globe size={14} />
                                        Language & Output
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div style={{ padding: '16px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                                Language Hint
                                            </label>
                                            <select
                                                value={formData.languageHint || ''}
                                                onChange={(e) => setFormData({ ...formData, languageHint: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(0, 200, 255, 0.1)',
                                                    borderRadius: '8px',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <option value="">Auto Detect</option>
                                                <option value="en">English</option>
                                                <option value="es">Spanish</option>
                                                <option value="fr">French</option>
                                                <option value="de">German</option>
                                                <option value="it">Italian</option>
                                                <option value="pt">Portuguese</option>
                                                <option value="zh">Chinese</option>
                                                <option value="ja">Japanese</option>
                                                <option value="ko">Korean</option>
                                                <option value="hi">Hindi</option>
                                                <option value="ar">Arabic</option>
                                            </select>
                                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                                Hint for speech recognition language
                                            </p>
                                        </div>
                                        <div style={{ padding: '16px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                                Initial Output Medium
                                            </label>
                                            <select
                                                value={formData.initialOutputMedium || 'MESSAGE_MEDIUM_VOICE'}
                                                onChange={(e) => setFormData({ ...formData, initialOutputMedium: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(0, 200, 255, 0.1)',
                                                    borderRadius: '8px',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <option value="MESSAGE_MEDIUM_VOICE">Voice</option>
                                                <option value="MESSAGE_MEDIUM_TEXT">Text</option>
                                                <option value="MESSAGE_MEDIUM_UNSPECIFIED">Unspecified</option>
                                            </select>
                                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                                How the agent initially communicates
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Time Exceeded Message */}
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#00C8FF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={14} />
                                        Time Limit Message
                                    </h4>
                                    <div style={{ padding: '16px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                            Time Exceeded Message
                                        </label>
                                        <textarea
                                            value={formData.timeExceededMessage || ''}
                                            onChange={(e) => setFormData({ ...formData, timeExceededMessage: e.target.value })}
                                            placeholder="I apologize, but we've reached our time limit. Thank you for your call. Goodbye!"
                                            rows={2}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '13px',
                                                outline: 'none',
                                                resize: 'vertical',
                                                fontFamily: 'inherit',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                            Message spoken when max call duration is reached
                                        </p>
                                    </div>
                                </div>

                                {/* VAD Settings Section */}
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#00C8FF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Zap size={14} />
                                        Voice Activity Detection (VAD)
                                    </h4>
                                    <div style={{ 
                                        padding: '20px', 
                                        background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.05), rgba(120, 0, 255, 0.05))', 
                                        borderRadius: '12px', 
                                        border: '1px solid rgba(0, 200, 255, 0.15)' 
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                                    Turn Endpoint Delay
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.vadSettings?.turnEndpointDelay || ''}
                                                    onChange={(e) => setFormData({ 
                                                        ...formData, 
                                                        vadSettings: { ...formData.vadSettings, turnEndpointDelay: e.target.value } 
                                                    })}
                                                    placeholder="0.5s"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid rgba(0, 200, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                                    Delay before considering speech ended
                                                </p>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                                    Minimum Turn Duration
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.vadSettings?.minimumTurnDuration || ''}
                                                    onChange={(e) => setFormData({ 
                                                        ...formData, 
                                                        vadSettings: { ...formData.vadSettings, minimumTurnDuration: e.target.value } 
                                                    })}
                                                    placeholder="0.3s"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid rgba(0, 200, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                                    Minimum speech duration to register
                                                </p>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                                    Min Interruption Duration
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.vadSettings?.minimumInterruptionDuration || ''}
                                                    onChange={(e) => setFormData({ 
                                                        ...formData, 
                                                        vadSettings: { ...formData.vadSettings, minimumInterruptionDuration: e.target.value } 
                                                    })}
                                                    placeholder="0.2s"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid rgba(0, 200, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                                    Min duration to interrupt agent
                                                </p>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                                    Activation Threshold
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={formData.vadSettings?.frameActivationThreshold || ''}
                                                    onChange={(e) => setFormData({ 
                                                        ...formData, 
                                                        vadSettings: { ...formData.vadSettings, frameActivationThreshold: parseInt(e.target.value) || 0 } 
                                                    })}
                                                    placeholder="50"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid rgba(0, 200, 255, 0.1)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                                    Frame activation threshold (0-100)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* First Speaker Delay */}
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#00C8FF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={14} />
                                        Greeting Timing
                                    </h4>
                                    <div style={{ padding: '16px', background: 'rgba(5, 10, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                            First Speaker Delay
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.firstSpeakerDelay || ''}
                                            onChange={(e) => setFormData({ ...formData, firstSpeakerDelay: e.target.value })}
                                            placeholder="0s"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(0, 200, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '13px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                            Delay before agent speaks the greeting message
                                        </p>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div style={{ 
                                    padding: '16px', 
                                    background: 'rgba(120, 0, 255, 0.1)', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(120, 0, 255, 0.2)',
                                }}>
                                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                                        💡 <strong style={{ color: 'white' }}>Pro Tips:</strong> Lower VAD thresholds make the agent more sensitive to speech. 
                                        Adjust turn endpoint delay to control how quickly the agent responds after you stop speaking. 
                                        Use language hints to improve transcription accuracy for non-English conversations.
                                    </p>
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
