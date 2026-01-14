"use client";

import { useState } from "react";
import { Database, Plus, Pencil, Trash2, X, Save, FileText, Upload, RefreshCw } from "lucide-react";

interface KnowledgeBase {
    id: string;
    name: string;
    description: string;
    documentCount: number;
    totalSize: string;
    lastUpdated: string;
    status: "ready" | "processing" | "error";
}

const initialKnowledgeBases: KnowledgeBase[] = [
    {
        id: "1",
        name: "Product Documentation",
        description: "Technical documentation and user guides for all products",
        documentCount: 156,
        totalSize: "24.5 MB",
        lastUpdated: "2024-01-10",
        status: "ready",
    },
    {
        id: "2",
        name: "FAQ Database",
        description: "Frequently asked questions and answers",
        documentCount: 89,
        totalSize: "8.2 MB",
        lastUpdated: "2024-01-08",
        status: "ready",
    },
    {
        id: "3",
        name: "Support Articles",
        description: "Troubleshooting guides and how-to articles",
        documentCount: 234,
        totalSize: "45.1 MB",
        lastUpdated: "2024-01-05",
        status: "processing",
    },
];

const statusConfig = {
    ready: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "Ready" },
    processing: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Processing" },
    error: { color: "#FF3C64", bg: "rgba(255, 60, 100, 0.1)", label: "Error" },
};

export default function RAGSection() {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(initialKnowledgeBases);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKB, setEditingKB] = useState<KnowledgeBase | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });

    const openCreateModal = () => {
        setEditingKB(null);
        setFormData({ name: "", description: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (kb: KnowledgeBase) => {
        setEditingKB(kb);
        setFormData({
            name: kb.name,
            description: kb.description,
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;

        if (editingKB) {
            setKnowledgeBases(knowledgeBases.map(kb => 
                kb.id === editingKB.id 
                    ? { ...kb, ...formData }
                    : kb
            ));
        } else {
            const newKB: KnowledgeBase = {
                id: Date.now().toString(),
                ...formData,
                documentCount: 0,
                totalSize: "0 MB",
                lastUpdated: new Date().toISOString().split("T")[0],
                status: "ready",
            };
            setKnowledgeBases([...knowledgeBases, newKB]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        setKnowledgeBases(knowledgeBases.filter(kb => kb.id !== id));
    };

    return (
        <div style={{ padding: "32px", maxWidth: "1400px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "8px" }}>
                        RAG Knowledge Bases
                    </h1>
                    <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
                        Manage your knowledge bases for retrieval-augmented generation.
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
                    Create Knowledge Base
                </button>
            </div>

            {/* Knowledge Bases Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                    gap: "20px",
                }}
            >
                {knowledgeBases.map(kb => (
                    <div
                        key={kb.id}
                        style={{
                            background: "linear-gradient(135deg, rgba(5, 15, 30, 0.8) 0%, rgba(10, 20, 40, 0.7) 100%)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(0, 200, 255, 0.15)",
                            borderRadius: "16px",
                            padding: "24px",
                            transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <div
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "12px",
                                    background: "linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.2) 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#00C8FF",
                                }}
                            >
                                <Database size={24} />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "4px 12px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    background: statusConfig[kb.status].bg,
                                    color: statusConfig[kb.status].color,
                                }}
                            >
                                {kb.status === "processing" && (
                                    <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
                                )}
                                {statusConfig[kb.status].label}
                            </div>
                        </div>

                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", marginBottom: "8px" }}>
                            {kb.name}
                        </h3>
                        <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "20px", lineHeight: "1.5" }}>
                            {kb.description}
                        </p>

                        {/* Stats */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                gap: "16px",
                                padding: "16px",
                                background: "rgba(255, 255, 255, 0.02)",
                                borderRadius: "12px",
                                marginBottom: "20px",
                            }}
                        >
                            <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>{kb.documentCount}</p>
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Documents</p>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>{kb.totalSize}</p>
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Total Size</p>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "14px", fontWeight: "600", color: "white" }}>{kb.lastUpdated}</p>
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Updated</p>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(0, 200, 255, 0.1)",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    color: "white",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <Upload size={14} />
                                Upload
                            </button>
                            <button
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(0, 200, 255, 0.1)",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    color: "white",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                <FileText size={14} />
                                View Docs
                            </button>
                            <button
                                onClick={() => openEditModal(kb)}
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
                                onClick={() => handleDelete(kb.id)}
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
                                {editingKB ? "Edit Knowledge Base" : "Create Knowledge Base"}
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
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter knowledge base name..."
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
                                    placeholder="Describe the content of this knowledge base..."
                                    rows={4}
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
                                {editingKB ? "Save Changes" : "Create Knowledge Base"}
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
