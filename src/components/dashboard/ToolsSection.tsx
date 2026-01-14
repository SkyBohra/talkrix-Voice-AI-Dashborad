"use client";

import { useState } from "react";
import { Wrench, Plus, Pencil, Trash2, X, Save, Code, Globe, Database, Zap } from "lucide-react";

interface Tool {
    id: string;
    name: string;
    description: string;
    type: "api" | "function" | "webhook" | "database";
    endpoint?: string;
    isEnabled: boolean;
    createdAt: string;
}

const initialTools: Tool[] = [
    {
        id: "1",
        name: "CRM Integration",
        description: "Connect to your CRM to fetch customer data",
        type: "api",
        endpoint: "https://api.crm.com/v1",
        isEnabled: true,
        createdAt: "2024-01-10",
    },
    {
        id: "2",
        name: "Weather API",
        description: "Get real-time weather information",
        type: "api",
        endpoint: "https://api.weather.com",
        isEnabled: true,
        createdAt: "2024-01-08",
    },
    {
        id: "3",
        name: "Order Lookup",
        description: "Search and retrieve order information",
        type: "function",
        isEnabled: false,
        createdAt: "2024-01-05",
    },
    {
        id: "4",
        name: "Appointment Scheduler",
        description: "Schedule and manage appointments",
        type: "webhook",
        endpoint: "https://calendar.example.com/webhook",
        isEnabled: true,
        createdAt: "2024-01-03",
    },
];

const toolTypeConfig = {
    api: { icon: <Globe size={20} />, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
    function: { icon: <Code size={20} />, color: "#7800FF", bg: "rgba(120, 0, 255, 0.1)" },
    webhook: { icon: <Zap size={20} />, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    database: { icon: <Database size={20} />, color: "#00C8FF", bg: "rgba(0, 200, 255, 0.1)" },
};

export default function ToolsSection() {
    const [tools, setTools] = useState<Tool[]>(initialTools);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        type: "api" as Tool["type"],
        endpoint: "",
    });

    const openCreateModal = () => {
        setEditingTool(null);
        setFormData({ name: "", description: "", type: "api", endpoint: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (tool: Tool) => {
        setEditingTool(tool);
        setFormData({
            name: tool.name,
            description: tool.description,
            type: tool.type,
            endpoint: tool.endpoint || "",
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;

        if (editingTool) {
            setTools(tools.map(t => 
                t.id === editingTool.id 
                    ? { ...t, ...formData }
                    : t
            ));
        } else {
            const newTool: Tool = {
                id: Date.now().toString(),
                ...formData,
                isEnabled: false,
                createdAt: new Date().toISOString().split("T")[0],
            };
            setTools([...tools, newTool]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        setTools(tools.filter(t => t.id !== id));
    };

    const toggleEnabled = (id: string) => {
        setTools(tools.map(t => 
            t.id === id 
                ? { ...t, isEnabled: !t.isEnabled }
                : t
        ));
    };

    return (
        <div style={{ padding: "32px", maxWidth: "1400px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "8px" }}>
                        Tools
                    </h1>
                    <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
                        Configure external integrations and custom functions for your agents.
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
                        transition: "all 0.2s ease",
                    }}
                >
                    <Plus size={18} />
                    Add Tool
                </button>
            </div>

            {/* Tools List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {tools.map(tool => (
                    <div
                        key={tool.id}
                        style={{
                            background: "linear-gradient(135deg, rgba(5, 15, 30, 0.8) 0%, rgba(10, 20, 40, 0.7) 100%)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(0, 200, 255, 0.15)",
                            borderRadius: "16px",
                            padding: "20px 24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                            <div
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "12px",
                                    background: toolTypeConfig[tool.type].bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: toolTypeConfig[tool.type].color,
                                }}
                            >
                                {toolTypeConfig[tool.type].icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>
                                        {tool.name}
                                    </h3>
                                    <span
                                        style={{
                                            padding: "2px 10px",
                                            borderRadius: "20px",
                                            fontSize: "11px",
                                            fontWeight: "500",
                                            textTransform: "uppercase",
                                            background: toolTypeConfig[tool.type].bg,
                                            color: toolTypeConfig[tool.type].color,
                                        }}
                                    >
                                        {tool.type}
                                    </span>
                                </div>
                                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>
                                    {tool.description}
                                </p>
                                {tool.endpoint && (
                                    <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.3)", marginTop: "4px", fontFamily: "monospace" }}>
                                        {tool.endpoint}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {/* Toggle Switch */}
                            <button
                                onClick={() => toggleEnabled(tool.id)}
                                style={{
                                    width: "48px",
                                    height: "26px",
                                    borderRadius: "13px",
                                    border: "none",
                                    background: tool.isEnabled 
                                        ? "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)" 
                                        : "rgba(0, 200, 255, 0.1)",
                                    cursor: "pointer",
                                    position: "relative",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <div
                                    style={{
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "50%",
                                        background: "white",
                                        position: "absolute",
                                        top: "3px",
                                        left: tool.isEnabled ? "25px" : "3px",
                                        transition: "all 0.2s ease",
                                    }}
                                />
                            </button>
                            <button
                                onClick={() => openEditModal(tool)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(0, 200, 255, 0.3)",
                                    background: "rgba(0, 200, 255, 0.1)",
                                    color: "#00C8FF",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(tool.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(255, 60, 100, 0.3)",
                                    background: "rgba(255, 60, 100, 0.1)",
                                    color: "#FF3C64",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

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
                    }}
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        style={{
                            background: "rgba(15, 15, 20, 0.95)",
                            backdropFilter: "blur(20px)",
                            border: "1px solid rgba(0, 200, 255, 0.1)",
                            borderRadius: "20px",
                            padding: "32px",
                            width: "100%",
                            maxWidth: "480px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>
                                {editingTool ? "Edit Tool" : "Add New Tool"}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "rgba(255, 255, 255, 0.5)",
                                    cursor: "pointer",
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Tool Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter tool name..."
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

                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe what this tool does..."
                                    rows={3}
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

                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Tool["type"] })}
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
                                >
                                    <option value="api">API</option>
                                    <option value="function">Function</option>
                                    <option value="webhook">Webhook</option>
                                    <option value="database">Database</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                    Endpoint URL (optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.endpoint}
                                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                                    placeholder="https://api.example.com/v1"
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(0, 200, 255, 0.1)",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        color: "white",
                                        fontSize: "14px",
                                        outline: "none",
                                        fontFamily: "monospace",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "14px 24px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    marginTop: "8px",
                                }}
                            >
                                <Save size={16} />
                                {editingTool ? "Save Changes" : "Add Tool"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
