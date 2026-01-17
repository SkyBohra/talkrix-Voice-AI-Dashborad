"use client";

import { useState, useEffect } from "react";
import { Wrench, Plus, Pencil, Trash2, X, Save, Code, Globe, Database, Zap, Loader2, AlertCircle, RefreshCw, Phone, PhoneOff, Voicemail, Search, Music, PhoneCall } from "lucide-react";
import { fetchUserTools, createTool, updateTool, deleteTool, Tool, ToolDefinition, DynamicParameter } from "@/lib/toolApi";
import { useToast } from "@/components/ui/toast";

// Tool type mapping for Talkrix tools
type ToolType = "http" | "client" | "dataConnection" | "staticResponse";

const getToolType = (definition: ToolDefinition): ToolType => {
    if (definition.http?.baseUrlPattern) return "http";
    if (definition.client && Object.keys(definition.client).length > 0) return "client";
    if (definition.dataConnection && Object.keys(definition.dataConnection).length > 0) return "dataConnection";
    if (definition.staticResponse?.responseText) return "staticResponse";
    return "http"; // default
};

const toolTypeConfig = {
    http: { icon: <Globe size={20} />, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "HTTP" },
    client: { icon: <Code size={20} />, color: "#7800FF", bg: "rgba(120, 0, 255, 0.1)", label: "Client" },
    dataConnection: { icon: <Database size={20} />, color: "#00C8FF", bg: "rgba(0, 200, 255, 0.1)", label: "Data" },
    staticResponse: { icon: <Zap size={20} />, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Static" },
};

const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const parameterLocations = [
    { value: "PARAMETER_LOCATION_QUERY", label: "Query" },
    { value: "PARAMETER_LOCATION_PATH", label: "Path" },
    { value: "PARAMETER_LOCATION_HEADER", label: "Header" },
    { value: "PARAMETER_LOCATION_BODY", label: "Body" },
];

// Hardcoded built-in Talkrix tools
const BUILT_IN_TOOLS: Tool[] = [
    {
        talkrixToolId: "builtin-warm-transfer",
        name: "warmTransfer",
        ownership: "public",
        definition: {
            modelToolName: "warmTransfer",
            description: "Transfer the call to another agent or phone number with a warm handoff. The AI will stay on the line and introduce the caller before transferring.",
            dynamicParameters: [
                { name: "phoneNumber", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "The phone number to transfer to (E.164 format)" }, required: true },
                { name: "introMessage", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "Introduction message to speak before transferring" }, required: false },
            ],
        },
    },
    {
        talkrixToolId: "builtin-cold-transfer",
        name: "coldTransfer",
        ownership: "public",
        definition: {
            modelToolName: "coldTransfer",
            description: "Transfer the call to another agent or phone number immediately (cold transfer). The AI will disconnect after initiating the transfer.",
            dynamicParameters: [
                { name: "phoneNumber", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "The phone number to transfer to (E.164 format)" }, required: true },
            ],
        },
    },
    {
        talkrixToolId: "builtin-leave-voicemail",
        name: "leaveVoicemail",
        ownership: "public",
        definition: {
            modelToolName: "leaveVoicemail",
            description: "Allow the caller to leave a voicemail message. Records the caller's message for later retrieval.",
            dynamicParameters: [
                { name: "maxDuration", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "Maximum recording duration (e.g., '60s')" }, required: false },
                { name: "beepEnabled", location: "PARAMETER_LOCATION_BODY", schema: { type: "boolean", description: "Play a beep before recording starts" }, required: false },
            ],
        },
    },
    {
        talkrixToolId: "builtin-query-corpus",
        name: "queryCorpus",
        ownership: "public",
        definition: {
            modelToolName: "queryCorpus",
            description: "Search through a knowledge base or document corpus to find relevant information. Use this to answer questions based on uploaded documents.",
            dynamicParameters: [
                { name: "query", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "The search query to find relevant information" }, required: true },
                { name: "corpusId", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "ID of the corpus to search (optional if only one corpus)" }, required: false },
                { name: "maxResults", location: "PARAMETER_LOCATION_BODY", schema: { type: "integer", description: "Maximum number of results to return" }, required: false },
            ],
        },
    },
    {
        talkrixToolId: "builtin-play-dtmf",
        name: "playDtmfSounds",
        ownership: "public",
        definition: {
            modelToolName: "playDtmfSounds",
            description: "Play DTMF (touch-tone) sounds during the call. Useful for navigating phone menus or entering PIN codes.",
            dynamicParameters: [
                { name: "digits", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "The DTMF digits to play (0-9, *, #)" }, required: true },
                { name: "duration", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "Duration of each tone (e.g., '200ms')" }, required: false },
            ],
        },
    },
    {
        talkrixToolId: "builtin-hang-up",
        name: "hangUp",
        ownership: "public",
        definition: {
            modelToolName: "hangUp",
            description: "End the current call. Use this when the conversation is complete or the caller requests to hang up.",
            dynamicParameters: [
                { name: "reason", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", description: "Reason for ending the call (for logging)" }, required: false },
            ],
        },
    },
];

// Icon mapping for built-in tools
const builtInToolIcons: Record<string, React.ReactNode> = {
    warmTransfer: <PhoneCall size={20} />,
    coldTransfer: <Phone size={20} />,
    leaveVoicemail: <Voicemail size={20} />,
    queryCorpus: <Search size={20} />,
    playDtmfSounds: <Music size={20} />,
    hangUp: <PhoneOff size={20} />,
};

interface FormData {
    name: string;
    modelToolName: string;
    description: string;
    type: ToolType;
    baseUrlPattern: string;
    httpMethod: string;
    timeout: string;
    dynamicParameters: DynamicParameter[];
    staticResponseText: string;
}

const emptyFormData: FormData = {
    name: "",
    modelToolName: "",
    description: "",
    type: "http",
    baseUrlPattern: "",
    httpMethod: "GET",
    timeout: "",
    dynamicParameters: [],
    staticResponseText: "",
};

// Tab type
type TabType = "builtin" | "custom";

export default function ToolsSection() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>("builtin");
    const [customTools, setCustomTools] = useState<Tool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [selectedBuiltInTool, setSelectedBuiltInTool] = useState<Tool | null>(null);

    // Load custom tools on mount
    useEffect(() => {
        loadCustomTools();
    }, []);

    const loadCustomTools = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetchUserTools();
            if (response.success) {
                // Filter out built-in tools (only keep custom/private tools)
                const userTools = (response.data || []).filter((t: Tool) => t.ownership !== "public");
                setCustomTools(userTools);
            } else {
                setError(response.message || "Failed to load tools");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load tools");
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTool(null);
        setFormData(emptyFormData);
        setIsModalOpen(true);
    };

    const openEditModal = (tool: Tool) => {
        setEditingTool(tool);
        const def = tool.definition;
        setFormData({
            name: tool.name,
            modelToolName: def.modelToolName || "",
            description: def.description || "",
            type: getToolType(def),
            baseUrlPattern: def.http?.baseUrlPattern || "",
            httpMethod: def.http?.httpMethod || "GET",
            timeout: def.timeout || "",
            dynamicParameters: def.dynamicParameters || [],
            staticResponseText: def.staticResponse?.responseText || "",
        });
        setIsModalOpen(true);
    };

    // Sanitize modelToolName to match pattern: ^[a-zA-Z0-9_-]{1,64}$
    const sanitizeModelToolName = (name: string): string => {
        if (!name) return "tool";
        return name
            .replace(/\s+/g, "_")           // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9_-]/g, "") // Remove invalid characters
            .substring(0, 64)               // Limit to 64 characters
            || "tool";
    };

    const buildToolPayload = () => {
        // Sanitize the model tool name
        const rawModelToolName = formData.modelToolName || formData.name || "tool";
        const sanitizedModelToolName = sanitizeModelToolName(rawModelToolName);

        const definition: ToolDefinition = {
            modelToolName: sanitizedModelToolName,
            description: formData.description,
        };

        // Add dynamic parameters if any
        if (formData.dynamicParameters.length > 0) {
            definition.dynamicParameters = formData.dynamicParameters;
        }

        // Add timeout if specified
        if (formData.timeout) {
            definition.timeout = formData.timeout;
        }

        // Add implementation based on type
        if (formData.type === "http") {
            definition.http = {
                baseUrlPattern: formData.baseUrlPattern,
                httpMethod: formData.httpMethod,
            };
        } else if (formData.type === "client") {
            definition.client = {};
        } else if (formData.type === "staticResponse") {
            definition.staticResponse = {
                responseText: formData.staticResponseText,
            };
        }

        return {
            name: formData.name,
            definition,
        };
    };

    // Validate tool name matches pattern
    const isValidToolName = (name: string): boolean => {
        return /^[a-zA-Z0-9_-]{1,40}$/.test(name);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("Validation Error", "Tool name is required");
            return;
        }

        if (!isValidToolName(formData.name.trim())) {
            toast.error("Validation Error", "Tool name can only contain letters, numbers, underscores, and hyphens (max 40 chars)");
            return;
        }

        if (formData.type === "http" && !formData.baseUrlPattern.trim()) {
            toast.error("Validation Error", "Base URL is required for HTTP tools");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const payload = buildToolPayload();

            if (editingTool) {
                const response = await updateTool(editingTool._id!, payload);
                if (response.success) {
                    await loadCustomTools();
                    setIsModalOpen(false);
                    toast.success("Tool Updated", `"${formData.name}" has been updated successfully.`);
                } else {
                    toast.error("Update Failed", response.message || "Failed to update tool");
                }
            } else {
                const response = await createTool(payload);
                if (response.success) {
                    await loadCustomTools();
                    setIsModalOpen(false);
                    setActiveTab("custom"); // Switch to custom tab after creating
                    toast.success("Tool Created", `"${formData.name}" has been created successfully.`);
                } else {
                    toast.error("Creation Failed", response.message || "Failed to create tool");
                }
            }
        } catch (err: any) {
            toast.error("Error", err.response?.data?.message || err.message || "Failed to save tool");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const toolToDelete = customTools.find(t => t._id === id);
            const response = await deleteTool(id);
            if (response.success) {
                setCustomTools(customTools.filter(t => t._id !== id));
                setDeleteConfirmId(null);
                toast.success("Tool Deleted", `"${toolToDelete?.name || 'Tool'}" has been deleted successfully.`);
            } else {
                toast.error("Delete Failed", response.message || "Failed to delete tool");
            }
        } catch (err: any) {
            toast.error("Error", err.message || "Failed to delete tool");
        }
    };

    const addDynamicParameter = () => {
        setFormData({
            ...formData,
            dynamicParameters: [
                ...formData.dynamicParameters,
                { name: "", location: "PARAMETER_LOCATION_QUERY", schema: { type: "string" }, required: false },
            ],
        });
    };

    const updateDynamicParameter = (index: number, updates: Partial<DynamicParameter>) => {
        const newParams = [...formData.dynamicParameters];
        newParams[index] = { ...newParams[index], ...updates };
        setFormData({ ...formData, dynamicParameters: newParams });
    };

    const removeDynamicParameter = (index: number) => {
        setFormData({
            ...formData,
            dynamicParameters: formData.dynamicParameters.filter((_, i) => i !== index),
        });
    };

    // Loading state
    if (isLoading) {
        return (
            <div style={{ padding: "32px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <Loader2 size={32} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
                <style jsx>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div 
            style={{ 
                padding: "32px 40px", 
                maxWidth: "1400px", 
                margin: "0 auto",
                boxSizing: "border-box",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "8px" }}>
                        Tools
                    </h1>
                    <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
                        Configure tools for your voice AI agents.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 24px",
                        borderRadius: "12px",
                        border: "none",
                        background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                    }}
                >
                    <Plus size={18} />
                    Create Custom Tool
                </button>
            </div>

            {/* Tabs */}
            <div style={{ 
                display: "flex", 
                gap: "4px", 
                marginBottom: "24px",
                background: "rgba(255, 255, 255, 0.03)",
                padding: "4px",
                borderRadius: "12px",
                width: "fit-content",
            }}>
                <button
                    onClick={() => setActiveTab("builtin")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: "none",
                        background: activeTab === "builtin" 
                            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)" 
                            : "transparent",
                        color: activeTab === "builtin" ? "#818cf8" : "rgba(255, 255, 255, 0.5)",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                >
                    <Zap size={16} />
                    Built-in Tools
                    <span style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: activeTab === "builtin" ? "rgba(99, 102, 241, 0.3)" : "rgba(255, 255, 255, 0.1)",
                        color: activeTab === "builtin" ? "#a5b4fc" : "rgba(255, 255, 255, 0.4)",
                    }}>
                        {BUILT_IN_TOOLS.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("custom")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: "none",
                        background: activeTab === "custom" 
                            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)" 
                            : "transparent",
                        color: activeTab === "custom" ? "#22c55e" : "rgba(255, 255, 255, 0.5)",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                >
                    <Wrench size={16} />
                    My Custom Tools
                    <span style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: activeTab === "custom" ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 255, 255, 0.1)",
                        color: activeTab === "custom" ? "#86efac" : "rgba(255, 255, 255, 0.4)",
                    }}>
                        {customTools.length}
                    </span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    background: "rgba(255, 60, 100, 0.1)",
                    border: "1px solid rgba(255, 60, 100, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}>
                    <AlertCircle size={20} style={{ color: "#FF3C64" }} />
                    <span style={{ color: "#FF3C64", fontSize: "14px" }}>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#FF3C64", cursor: "pointer" }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Built-in Tools Tab */}
            {activeTab === "builtin" && (
                <>
                    {/* Info Banner */}
                    <div style={{
                        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        borderRadius: "12px",
                        padding: "16px 20px",
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "rgba(99, 102, 241, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <Zap size={18} style={{ color: "#818cf8" }} />
                        </div>
                        <div>
                            <p style={{ fontSize: "14px", fontWeight: "600", color: "#a5b4fc", margin: 0 }}>
                                Built-in Talkrix Tools
                            </p>
                            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", margin: 0, marginTop: "2px" }}>
                                These system tools are provided by Talkrix and ready to use with any agent.
                            </p>
                        </div>
                    </div>

                    {/* Built-in Tools Grid */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                            gap: "20px",
                        }}
                    >
                        {BUILT_IN_TOOLS.map((tool, index) => {
                            const accentColors = [
                                { primary: "#6366f1", secondary: "#8b5cf6" },
                                { primary: "#8b5cf6", secondary: "#a855f7" },
                                { primary: "#7c3aed", secondary: "#6366f1" },
                                { primary: "#a855f7", secondary: "#7c3aed" },
                                { primary: "#818cf8", secondary: "#a78bfa" },
                                { primary: "#6366f1", secondary: "#818cf8" },
                            ];
                            const accent = accentColors[index % 6];
                            const icon = builtInToolIcons[tool.name] || <Zap size={20} />;
                            
                            return (
                                <div
                                    key={tool.talkrixToolId}
                                    onClick={() => setSelectedBuiltInTool(tool)}
                                    style={{
                                        background: "rgba(255, 255, 255, 0.03)",
                                        border: "1px solid rgba(99, 102, 241, 0.2)",
                                        borderRadius: "12px",
                                        overflow: "hidden",
                                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                                        e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.35)";
                                        e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                                        e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.3)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                                        e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)";
                                        e.currentTarget.style.transform = "scale(1)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <div style={{ padding: "20px" }}>
                                        {/* Header */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                                                <div
                                                    style={{
                                                        width: "40px",
                                                        height: "40px",
                                                        borderRadius: "10px",
                                                        background: `linear-gradient(135deg, ${accent.primary}20 0%, ${accent.secondary}20 100%)`,
                                                        border: `1px solid ${accent.primary}30`,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: accent.primary,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {icon}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <h3 style={{ 
                                                        fontSize: "15px", 
                                                        fontWeight: "600", 
                                                        color: "white", 
                                                        margin: 0,
                                                    }}>
                                                        {tool.name}
                                                    </h3>
                                                    <p style={{ 
                                                        fontSize: "11px", 
                                                        color: "rgba(255, 255, 255, 0.4)", 
                                                        margin: 0,
                                                        marginTop: "2px",
                                                        fontFamily: "monospace",
                                                    }}>
                                                        {tool.definition.modelToolName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    padding: "4px 8px",
                                                    borderRadius: "6px",
                                                    fontSize: "10px",
                                                    fontWeight: "600",
                                                    background: "rgba(99, 102, 241, 0.12)",
                                                    color: "#818cf8",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <div style={{ 
                                                    width: "5px", 
                                                    height: "5px", 
                                                    borderRadius: "50%", 
                                                    background: "#818cf8" 
                                                }} />
                                                System
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p style={{ 
                                            fontSize: "13px", 
                                            color: "rgba(255, 255, 255, 0.6)", 
                                            margin: 0,
                                            lineHeight: "1.5",
                                            marginBottom: "12px",
                                        }}>
                                            {tool.definition.description}
                                        </p>

                                        {/* Parameters info */}
                                        {tool.definition.dynamicParameters && tool.definition.dynamicParameters.length > 0 && (
                                            <div style={{ 
                                                display: "flex", 
                                                flexWrap: "wrap",
                                                gap: "6px", 
                                                marginBottom: "12px",
                                            }}>
                                                {tool.definition.dynamicParameters.map((param, pIndex) => (
                                                    <div 
                                                        key={pIndex}
                                                        style={{ 
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            background: param.required ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 255, 255, 0.05)",
                                                            border: `1px solid ${param.required ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.08)"}`,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                        }}
                                                    >
                                                        <code style={{ 
                                                            fontSize: "11px", 
                                                            color: param.required ? "#f59e0b" : "rgba(255, 255, 255, 0.6)", 
                                                            fontFamily: "monospace",
                                                        }}>
                                                            {param.name}
                                                        </code>
                                                        {param.required && (
                                                            <span style={{ fontSize: "9px", color: "#f59e0b" }}>*</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Ready to use indicator */}
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "6px",
                                            padding: "10px 16px",
                                            borderRadius: "8px",
                                            background: "rgba(34, 197, 94, 0.08)",
                                            border: "1px solid rgba(34, 197, 94, 0.15)",
                                        }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#22c55e" }}>
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            <span style={{ 
                                                fontSize: "13px", 
                                                color: "#22c55e",
                                                fontWeight: "600",
                                            }}>
                                                Ready to Use
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Custom Tools Tab */}
            {activeTab === "custom" && (
                <>
                    {/* Empty State for Custom Tools */}
                    {customTools.length === 0 && !error && (
                        <div style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(0, 200, 255, 0.15)",
                            borderRadius: "16px",
                            padding: "48px",
                            textAlign: "center",
                        }}>
                            <Wrench size={48} style={{ color: "rgba(255, 255, 255, 0.2)", marginBottom: "16px" }} />
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", marginBottom: "8px" }}>
                                No custom tools yet
                            </h3>
                            <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "24px" }}>
                                Create your first custom tool to extend your agent&apos;s capabilities with external APIs.
                            </p>
                            <button
                                onClick={openCreateModal}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "12px 24px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                }}
                            >
                                <Plus size={18} />
                                Create Custom Tool
                            </button>
                        </div>
                    )}

                    {/* Custom Tools Grid */}
                    {customTools.length > 0 && (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                                gap: "20px",
                            }}
                        >
                            {customTools.map((tool, index) => {
                                const toolType = getToolType(tool.definition);
                                const config = toolTypeConfig[toolType];
                                
                                // Same accent colors as agent cards
                                const accentColors = [
                                    { primary: "#00C8FF", secondary: "#7800FF", glow: "rgba(0, 200, 255, 0.15)" },
                                    { primary: "#7800FF", secondary: "#FF3C64", glow: "rgba(120, 0, 255, 0.15)" },
                                    { primary: "#22c55e", secondary: "#00C8FF", glow: "rgba(34, 197, 94, 0.15)" },
                                    { primary: "#f59e0b", secondary: "#FF3C64", glow: "rgba(245, 158, 11, 0.15)" },
                                ];
                                const accent = accentColors[index % 4];
                                
                                return (
                                    <div
                                        key={tool._id || tool.talkrixToolId}
                                        style={{
                                            background: "rgba(255, 255, 255, 0.03)",
                                            border: "1px solid rgba(0, 200, 255, 0.15)",
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "rgba(0, 200, 255, 0.15)";
                                            e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                                            e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                                            e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.3)";
                                        }}
                                        onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                                    e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                <div style={{ padding: "20px" }}>
                                    {/* Header */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                                            <div
                                                style={{
                                                    width: "40px",
                                                    height: "40px",
                                                    borderRadius: "10px",
                                                    background: `linear-gradient(135deg, ${accent.primary}20 0%, ${accent.secondary}20 100%)`,
                                                    border: `1px solid ${accent.primary}30`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: accent.primary,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {config.icon}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <h3 style={{ 
                                                    fontSize: "15px", 
                                                    fontWeight: "600", 
                                                    color: "white", 
                                                    margin: 0,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}>
                                                    {tool.name}
                                                </h3>
                                                <p style={{ 
                                                    fontSize: "12px", 
                                                    color: "rgba(255, 255, 255, 0.4)", 
                                                    margin: 0,
                                                    marginTop: "2px",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}>
                                                    {tool.definition.description || "No description"}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Status badge - matching agent card style */}
                                        <div
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: "6px",
                                                fontSize: "10px",
                                                fontWeight: "600",
                                                background: "rgba(34, 197, 94, 0.12)",
                                                color: "#22c55e",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <div style={{ 
                                                width: "5px", 
                                                height: "5px", 
                                                borderRadius: "50%", 
                                                background: "#22c55e" 
                                            }} />
                                            Custom
                                        </div>
                                    </div>

                                    {/* Info chips */}
                                    <div style={{ 
                                        display: "flex", 
                                        flexWrap: "wrap",
                                        gap: "8px", 
                                        marginBottom: "16px",
                                    }}>
                                        {/* Tool Type chip */}
                                        <div style={{ 
                                            padding: "6px 10px",
                                            borderRadius: "6px",
                                            background: "rgba(255, 255, 255, 0.04)",
                                            border: "1px solid rgba(255, 255, 255, 0.06)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}>
                                            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>🔧</span>
                                            <span style={{ fontSize: "12px", color: accent.primary, fontWeight: "500" }}>
                                                {config.label}
                                            </span>
                                        </div>
                                        {tool.definition.http?.httpMethod && (
                                            <div style={{ 
                                                padding: "6px 10px",
                                                borderRadius: "6px",
                                                background: "rgba(255, 255, 255, 0.04)",
                                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}>
                                                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>📡</span>
                                                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", fontWeight: "500" }}>
                                                    {tool.definition.http.httpMethod.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {tool.definition.dynamicParameters && tool.definition.dynamicParameters.length > 0 && (
                                            <div style={{ 
                                                padding: "6px 10px",
                                                borderRadius: "6px",
                                                background: "rgba(255, 255, 255, 0.04)",
                                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}>
                                                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>📥</span>
                                                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", fontWeight: "500" }}>
                                                    {tool.definition.dynamicParameters.length} params
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* URL Display */}
                                    {tool.definition.http?.baseUrlPattern && (
                                        <div style={{
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            background: "rgba(0, 0, 0, 0.2)",
                                            marginBottom: "16px",
                                            overflow: "hidden",
                                        }}>
                                            <p style={{ 
                                                fontSize: "11px", 
                                                color: "rgba(255, 255, 255, 0.4)", 
                                                margin: 0,
                                                fontFamily: "monospace",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>
                                                {tool.definition.http.baseUrlPattern}
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            onClick={() => openEditModal(tool)}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "6px",
                                                padding: "10px 16px",
                                                borderRadius: "8px",
                                                border: "none",
                                                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.secondary} 100%)`,
                                                color: "white",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.opacity = "0.9";
                                                e.currentTarget.style.transform = "scale(1.01)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.opacity = "1";
                                                e.currentTarget.style.transform = "scale(1)";
                                            }}
                                        >
                                            <Pencil size={14} />
                                            Configure
                                        </button>
                                        <button
                                            onClick={() => deleteConfirmId === tool._id ? handleDelete(tool._id!) : setDeleteConfirmId(tool._id!)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "10px",
                                                borderRadius: "8px",
                                                border: "1px solid rgba(255, 60, 100, 0.2)",
                                                background: deleteConfirmId === tool._id ? "#FF3C64" : "rgba(255, 60, 100, 0.08)",
                                                color: deleteConfirmId === tool._id ? "white" : "#FF3C64",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (deleteConfirmId !== tool._id) {
                                                    e.currentTarget.style.background = "rgba(255, 60, 100, 0.15)";
                                                    e.currentTarget.style.borderColor = "rgba(255, 60, 100, 0.35)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (deleteConfirmId !== tool._id) {
                                                    e.currentTarget.style.background = "rgba(255, 60, 100, 0.08)";
                                                    e.currentTarget.style.borderColor = "rgba(255, 60, 100, 0.2)";
                                                }
                                            }}
                                            title={deleteConfirmId === tool._id ? "Click again to confirm delete" : "Delete tool"}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 100,
                        padding: "20px",
                    }}
                    onClick={() => !isSaving && setIsModalOpen(false)}
                >
                    <div
                        style={{
                            background: "rgba(15, 15, 20, 0.95)",
                            backdropFilter: "blur(20px)",
                            border: "1px solid rgba(0, 200, 255, 0.1)",
                            borderRadius: "20px",
                            padding: "32px",
                            width: "100%",
                            maxWidth: "600px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>
                                {editingTool ? "Edit Tool" : "Create New Tool"}
                            </h2>
                            <button
                                onClick={() => !isSaving && setIsModalOpen(false)}
                                disabled={isSaving}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "rgba(255, 255, 255, 0.5)",
                                    cursor: isSaving ? "not-allowed" : "pointer",
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Tool Name */}
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Tool Name <span style={{ color: "#FF3C64" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., get_weather"
                                    maxLength={40}
                                    disabled={isSaving}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(0, 200, 255, 0.1)",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        color: "white",
                                        fontSize: "14px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe what this tool does..."
                                    rows={3}
                                    disabled={isSaving}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(0, 200, 255, 0.1)",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        color: "white",
                                        fontSize: "14px",
                                        outline: "none",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            {/* Tool Type */}
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Tool Type
                                </label>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {(Object.keys(toolTypeConfig) as ToolType[]).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFormData({ ...formData, type })}
                                            disabled={isSaving}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "10px 16px",
                                                borderRadius: "8px",
                                                border: formData.type === type
                                                    ? `2px solid ${toolTypeConfig[type].color}`
                                                    : "1px solid rgba(255, 255, 255, 0.1)",
                                                background: formData.type === type
                                                    ? toolTypeConfig[type].bg
                                                    : "rgba(255, 255, 255, 0.03)",
                                                color: formData.type === type
                                                    ? toolTypeConfig[type].color
                                                    : "rgba(255, 255, 255, 0.5)",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {toolTypeConfig[type].icon}
                                            {toolTypeConfig[type].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* HTTP Configuration */}
                            {formData.type === "http" && (
                                <>
                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <div style={{ width: "120px" }}>
                                            <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                                Method
                                            </label>
                                            <select
                                                value={formData.httpMethod}
                                                onChange={(e) => setFormData({ ...formData, httpMethod: e.target.value })}
                                                disabled={isSaving}
                                                style={{
                                                    width: "100%",
                                                    padding: "12px 16px",
                                                    borderRadius: "10px",
                                                    border: "1px solid rgba(0, 200, 255, 0.1)",
                                                    background: "rgba(255, 255, 255, 0.05)",
                                                    color: "white",
                                                    fontSize: "14px",
                                                    outline: "none",
                                                }}
                                            >
                                                {httpMethods.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                                Base URL Pattern <span style={{ color: "#FF3C64" }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.baseUrlPattern}
                                                onChange={(e) => setFormData({ ...formData, baseUrlPattern: e.target.value })}
                                                placeholder="https://api.example.com/v1/endpoint"
                                                disabled={isSaving}
                                                style={{
                                                    width: "100%",
                                                    padding: "12px 16px",
                                                    borderRadius: "10px",
                                                    border: "1px solid rgba(0, 200, 255, 0.1)",
                                                    background: "rgba(255, 255, 255, 0.05)",
                                                    color: "white",
                                                    fontSize: "14px",
                                                    fontFamily: "monospace",
                                                    outline: "none",
                                                    boxSizing: "border-box",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Timeout */}
                                    <div>
                                        <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                            Timeout (e.g., &quot;30s&quot;)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.timeout}
                                            onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
                                            placeholder="30s"
                                            disabled={isSaving}
                                            style={{
                                                width: "100%",
                                                padding: "12px 16px",
                                                borderRadius: "10px",
                                                border: "1px solid rgba(0, 200, 255, 0.1)",
                                                background: "rgba(255, 255, 255, 0.05)",
                                                color: "white",
                                                fontSize: "14px",
                                                outline: "none",
                                                boxSizing: "border-box",
                                            }}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Static Response */}
                            {formData.type === "staticResponse" && (
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                        Static Response Text
                                    </label>
                                    <textarea
                                        value={formData.staticResponseText}
                                        onChange={(e) => setFormData({ ...formData, staticResponseText: e.target.value })}
                                        placeholder="The response text to return..."
                                        rows={4}
                                        disabled={isSaving}
                                        style={{
                                            width: "100%",
                                            padding: "12px 16px",
                                            borderRadius: "10px",
                                            border: "1px solid rgba(0, 200, 255, 0.1)",
                                            background: "rgba(255, 255, 255, 0.05)",
                                            color: "white",
                                            fontSize: "14px",
                                            outline: "none",
                                            resize: "vertical",
                                            fontFamily: "inherit",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                </div>
                            )}

                            {/* Dynamic Parameters */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <label style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>
                                        Dynamic Parameters
                                    </label>
                                    <button
                                        onClick={addDynamicParameter}
                                        disabled={isSaving}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid rgba(0, 200, 255, 0.3)",
                                            background: "rgba(0, 200, 255, 0.1)",
                                            color: "#00C8FF",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <Plus size={14} />
                                        Add Parameter
                                    </button>
                                </div>

                                {formData.dynamicParameters.length === 0 ? (
                                    <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.3)", textAlign: "center", padding: "16px" }}>
                                        No parameters defined. Add parameters that users can provide during the call.
                                    </p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {formData.dynamicParameters.map((param, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    background: "rgba(255, 255, 255, 0.03)",
                                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                                    borderRadius: "10px",
                                                    padding: "12px",
                                                }}
                                            >
                                                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                                                    <input
                                                        type="text"
                                                        value={param.name}
                                                        onChange={(e) => updateDynamicParameter(index, { name: e.target.value })}
                                                        placeholder="Parameter name"
                                                        disabled={isSaving}
                                                        style={{
                                                            flex: 1,
                                                            padding: "8px 12px",
                                                            borderRadius: "6px",
                                                            border: "1px solid rgba(0, 200, 255, 0.1)",
                                                            background: "rgba(0, 0, 0, 0.2)",
                                                            color: "white",
                                                            fontSize: "13px",
                                                            outline: "none",
                                                        }}
                                                    />
                                                    <select
                                                        value={param.location || "PARAMETER_LOCATION_QUERY"}
                                                        onChange={(e) => updateDynamicParameter(index, { location: e.target.value })}
                                                        disabled={isSaving}
                                                        style={{
                                                            padding: "8px 12px",
                                                            borderRadius: "6px",
                                                            border: "1px solid rgba(0, 200, 255, 0.1)",
                                                            background: "rgba(0, 0, 0, 0.2)",
                                                            color: "white",
                                                            fontSize: "13px",
                                                            outline: "none",
                                                        }}
                                                    >
                                                        {parameterLocations.map(loc => (
                                                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => removeDynamicParameter(index)}
                                                        disabled={isSaving}
                                                        style={{
                                                            padding: "8px",
                                                            borderRadius: "6px",
                                                            border: "1px solid rgba(255, 60, 100, 0.3)",
                                                            background: "rgba(255, 60, 100, 0.1)",
                                                            color: "#FF3C64",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <label style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    fontSize: "12px",
                                                    color: "rgba(255, 255, 255, 0.5)",
                                                    cursor: "pointer",
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={param.required || false}
                                                        onChange={(e) => updateDynamicParameter(index, { required: e.target.checked })}
                                                        disabled={isSaving}
                                                    />
                                                    Required parameter
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "14px 24px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: isSaving
                                        ? "rgba(120, 0, 255, 0.5)"
                                        : "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: isSaving ? "not-allowed" : "pointer",
                                    marginTop: "8px",
                                }}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        {editingTool ? "Save Changes" : "Create Tool"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Built-in Tool Detail Modal */}
            {selectedBuiltInTool && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 100,
                        padding: "20px",
                    }}
                    onClick={() => setSelectedBuiltInTool(null)}
                >
                    <div
                        style={{
                            background: "rgba(15, 15, 20, 0.95)",
                            backdropFilter: "blur(20px)",
                            border: "1px solid rgba(99, 102, 241, 0.2)",
                            borderRadius: "20px",
                            padding: "0",
                            width: "100%",
                            maxWidth: "500px",
                            overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with gradient */}
                        <div style={{
                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)",
                            padding: "24px",
                            borderBottom: "1px solid rgba(99, 102, 241, 0.15)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div
                                        style={{
                                            width: "56px",
                                            height: "56px",
                                            borderRadius: "14px",
                                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)",
                                            border: "1px solid rgba(99, 102, 241, 0.4)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#818cf8",
                                        }}
                                    >
                                        {builtInToolIcons[selectedBuiltInTool.name] || <Zap size={28} />}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "white", margin: 0 }}>
                                            {selectedBuiltInTool.name}
                                        </h2>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                                            <span
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "6px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: "rgba(99, 102, 241, 0.2)",
                                                    color: "#a5b4fc",
                                                }}
                                            >
                                                System Tool
                                            </span>
                                            <span
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "6px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: "rgba(34, 197, 94, 0.15)",
                                                    color: "#22c55e",
                                                }}
                                            >
                                                Ready to Use
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedBuiltInTool(null)}
                                    style={{
                                        background: "rgba(255, 255, 255, 0.1)",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "8px",
                                        cursor: "pointer",
                                        color: "rgba(255, 255, 255, 0.6)",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                                        e.currentTarget.style.color = "white";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: "24px", maxHeight: "60vh", overflowY: "auto" }}>
                            {/* Description */}
                            <div style={{ marginBottom: "24px" }}>
                                <h3 style={{ 
                                    fontSize: "12px", 
                                    fontWeight: "600", 
                                    color: "rgba(255, 255, 255, 0.5)", 
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    marginBottom: "8px",
                                }}>
                                    Description
                                </h3>
                                <p style={{ 
                                    fontSize: "14px", 
                                    color: "rgba(255, 255, 255, 0.8)", 
                                    lineHeight: "1.6",
                                    margin: 0,
                                }}>
                                    {selectedBuiltInTool.definition.description}
                                </p>
                            </div>

                            {/* Parameters */}
                            {selectedBuiltInTool.definition.dynamicParameters && selectedBuiltInTool.definition.dynamicParameters.length > 0 && (
                                <div style={{ marginBottom: "24px" }}>
                                    <h3 style={{ 
                                        fontSize: "12px", 
                                        fontWeight: "600", 
                                        color: "rgba(255, 255, 255, 0.5)", 
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        marginBottom: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}>
                                        Parameters
                                        <span style={{
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            fontSize: "10px",
                                            background: "rgba(99, 102, 241, 0.2)",
                                            color: "#a5b4fc",
                                        }}>
                                            {selectedBuiltInTool.definition.dynamicParameters.length}
                                        </span>
                                    </h3>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {selectedBuiltInTool.definition.dynamicParameters.map((param, index) => (
                                            <div 
                                                key={index}
                                                style={{
                                                    padding: "12px 16px",
                                                    borderRadius: "8px",
                                                    background: "rgba(0, 0, 0, 0.2)",
                                                    border: `1px solid ${param.required ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.06)"}`,
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                    <code style={{ 
                                                        fontSize: "13px", 
                                                        color: param.required ? "#f59e0b" : "#818cf8", 
                                                        fontFamily: "monospace",
                                                        fontWeight: "600",
                                                    }}>
                                                        {param.name}
                                                    </code>
                                                    <span style={{
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        fontSize: "9px",
                                                        fontWeight: "600",
                                                        textTransform: "uppercase",
                                                        background: param.required ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                                        color: param.required ? "#f59e0b" : "rgba(255, 255, 255, 0.5)",
                                                    }}>
                                                        {param.required ? "Required" : "Optional"}
                                                    </span>
                                                    {param.schema?.type && (
                                                        <span style={{
                                                            padding: "2px 6px",
                                                            borderRadius: "4px",
                                                            fontSize: "9px",
                                                            fontWeight: "500",
                                                            background: "rgba(99, 102, 241, 0.1)",
                                                            color: "#a5b4fc",
                                                            fontFamily: "monospace",
                                                        }}>
                                                            {param.schema.type}
                                                        </span>
                                                    )}
                                                </div>
                                                {param.schema?.description && (
                                                    <p style={{ 
                                                        fontSize: "12px", 
                                                        color: "rgba(255, 255, 255, 0.5)", 
                                                        margin: 0,
                                                        lineHeight: "1.4",
                                                    }}>
                                                        {param.schema.description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tool Identifier */}
                            <div style={{ marginBottom: "24px" }}>
                                <h3 style={{ 
                                    fontSize: "12px", 
                                    fontWeight: "600", 
                                    color: "rgba(255, 255, 255, 0.5)", 
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    marginBottom: "8px",
                                }}>
                                    Tool Identifier
                                </h3>
                                <div style={{
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    background: "rgba(0, 0, 0, 0.3)",
                                    border: "1px solid rgba(255, 255, 255, 0.06)",
                                }}>
                                    <code style={{ 
                                        fontSize: "14px", 
                                        color: "#818cf8", 
                                        fontFamily: "monospace",
                                    }}>
                                        {selectedBuiltInTool.definition.modelToolName}
                                    </code>
                                </div>
                            </div>

                            {/* Usage Info */}
                            <div style={{
                                padding: "16px",
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(0, 200, 255, 0.05) 100%)",
                                border: "1px solid rgba(34, 197, 94, 0.15)",
                            }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                    <div style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "8px",
                                        background: "rgba(34, 197, 94, 0.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M12 16v-4"></path>
                                            <path d="M12 8h.01"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#22c55e", margin: 0, marginBottom: "4px" }}>
                                            How to Use
                                        </h4>
                                        <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: "1.5" }}>
                                            This tool is automatically available to all your agents. Simply reference it in your agent&apos;s system prompt or it will be invoked automatically when needed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: "16px 24px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                            display: "flex",
                            justifyContent: "flex-end",
                        }}>
                            <button
                                onClick={() => setSelectedBuiltInTool(null)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "10px 20px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                }}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
