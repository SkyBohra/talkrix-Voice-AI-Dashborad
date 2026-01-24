"use client";

import { useState, useEffect } from "react";
import { 
    Database, Plus, Pencil, Trash2, X, Save, FileText, Upload, RefreshCw, 
    Globe, Search, AlertCircle, Loader2, ChevronRight, ArrowLeft, Link, 
    File, Check, ExternalLink
} from "lucide-react";
import {
    listCorpora, createCorpus, updateCorpus, deleteCorpus, queryCorpus,
    listSources, createCrawlSource, createUploadSource, deleteSource,
    listDocuments, createFileUpload, uploadFileToPresignedUrl, syncCorpora,
    Corpus, CorpusSource, QueryResult
} from "@/lib/corpusApi";
import { getUserInfo } from "@/lib/userApi";
import { useToast } from "@/components/ui/toast";

type ViewMode = "list" | "detail" | "sources" | "documents" | "query";

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    CORPUS_STATUS_UNSPECIFIED: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Pending" },
    CORPUS_STATUS_READY: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "Ready" },
    CORPUS_STATUS_LOADING: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Loading" },
    CORPUS_STATUS_ERROR: { color: "#FF3C64", bg: "rgba(255, 60, 100, 0.1)", label: "Error" },
    SOURCE_STATUS_UNSPECIFIED: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Pending" },
    SOURCE_STATUS_READY: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "Ready" },
    SOURCE_STATUS_LOADING: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Loading" },
    SOURCE_STATUS_ERROR: { color: "#FF3C64", bg: "rgba(255, 60, 100, 0.1)", label: "Error" },
    ready: { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", label: "Ready" },
    processing: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Processing" },
    error: { color: "#FF3C64", bg: "rgba(255, 60, 100, 0.1)", label: "Error" },
};

const getStatus = (status: string | undefined) => {
    return statusConfig[status || "CORPUS_STATUS_UNSPECIFIED"] || statusConfig.CORPUS_STATUS_UNSPECIFIED;
};

export default function RAGSection() {
    const toast = useToast();
    // State
    const [corpora, setCorpora] = useState<Corpus[]>([]);
    const [selectedCorpus, setSelectedCorpus] = useState<Corpus | null>(null);
    const [sources, setSources] = useState<CorpusSource[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"corpus" | "crawl" | "upload">("corpus");
    const [editingCorpus, setEditingCorpus] = useState<Corpus | null>(null);
    const [selectedSource, setSelectedSource] = useState<CorpusSource | null>(null);
    
    // Form data
    const [corpusForm, setCorpusForm] = useState({ name: "", description: "" });
    const [crawlForm, setCrawlForm] = useState({ name: "", description: "", startUrls: "", maxDocuments: "", maxDepth: "" });
    const [queryText, setQueryText] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    // User limit state
    const [maxCorpusLimit, setMaxCorpusLimit] = useState<number>(1);
    const [isLimitReached, setIsLimitReached] = useState(false);

    // Load corpora and user info on mount
    useEffect(() => {
        loadCorpora();
        loadUserInfo();
    }, []);

    // Check if limit is reached whenever corpora or limit changes
    useEffect(() => {
        setIsLimitReached(corpora.length >= maxCorpusLimit);
    }, [corpora, maxCorpusLimit]);

    const loadUserInfo = async () => {
        try {
            const res = await getUserInfo();
            if (res.success && res.data) {
                setMaxCorpusLimit(res.data.maxCorpusLimit);
            }
        } catch (err: any) {
            console.error("Failed to load user info", err);
        }
    };

    const loadCorpora = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await listCorpora();
            if (res.success) {
                setCorpora(res.data || []);
            } else {
                setError(res.error || "Failed to load corpora");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load corpora");
        } finally {
            setLoading(false);
        }
    };

    const loadSources = async (corpusId: string) => {
        setActionLoading(true);
        try {
            const res = await listSources(corpusId);
            if (res.success) {
                setSources(res.data || []);
            }
        } catch (err: any) {
            console.error("Failed to load sources", err);
        } finally {
            setActionLoading(false);
        }
    };

    const loadDocuments = async (corpusId: string, sourceId: string) => {
        setActionLoading(true);
        try {
            const res = await listDocuments(corpusId, sourceId);
            if (res.success) {
                setDocuments(res.data || []);
            }
        } catch (err: any) {
            console.error("Failed to load documents", err);
        } finally {
            setActionLoading(false);
        }
    };

    // Handlers
    const openCreateCorpusModal = () => {
        setEditingCorpus(null);
        setCorpusForm({ name: "", description: "" });
        setModalType("corpus");
        setIsModalOpen(true);
    };

    const openEditCorpusModal = (corpus: Corpus) => {
        setEditingCorpus(corpus);
        setCorpusForm({ name: corpus.name, description: corpus.description || "" });
        setModalType("corpus");
        setIsModalOpen(true);
    };

    const openCrawlModal = () => {
        setCrawlForm({ name: "", description: "", startUrls: "", maxDocuments: "", maxDepth: "" });
        setModalType("crawl");
        setIsModalOpen(true);
    };

    const openUploadModal = () => {
        setUploadFile(null);
        setModalType("upload");
        setIsModalOpen(true);
    };

    const handleSaveCorpus = async () => {
        if (!corpusForm.name.trim()) {
            toast.error("Validation Error", "Name is required");
            return;
        }
        setActionLoading(true);
        try {
            if (editingCorpus) {
                const res = await updateCorpus(editingCorpus._id, corpusForm);
                if (res.success) {
                    await loadCorpora();
                    setIsModalOpen(false);
                    toast.success("Knowledge Base Updated", `"${corpusForm.name}" has been updated.`);
                } else {
                    toast.error("Update Failed", res.error || "Failed to update knowledge base");
                }
            } else {
                const res = await createCorpus(corpusForm);
                if (res.success) {
                    await loadCorpora();
                    setIsModalOpen(false);
                    toast.success("Knowledge Base Created", `"${corpusForm.name}" has been created.`);
                } else {
                    toast.error("Creation Failed", res.error || "Failed to create knowledge base");
                }
            }
        } catch (err: any) {
            toast.error("Error", err.message || "Failed to save knowledge base");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCorpus = async (id: string) => {
        if (!confirm("Are you sure you want to delete this knowledge base? This will also delete all sources and documents.")) return;
        setActionLoading(true);
        try {
            const corpusToDelete = corpora.find(c => c._id === id);
            const res = await deleteCorpus(id);
            if (res.success) {
                await loadCorpora();
                if (selectedCorpus?._id === id) {
                    setSelectedCorpus(null);
                    setViewMode("list");
                }
                toast.success("Knowledge Base Deleted", `"${corpusToDelete?.name || 'Item'}" has been deleted.`);
            } else {
                toast.error("Delete Failed", res.error || "Failed to delete knowledge base");
            }
        } catch (err: any) {
            toast.error("Error", err.message || "Failed to delete knowledge base");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateCrawlSource = async () => {
        if (!selectedCorpus || !crawlForm.name.trim() || !crawlForm.startUrls.trim()) {
            toast.error("Validation Error", "Name and URLs are required");
            return;
        }
        setActionLoading(true);
        try {
            const urls = crawlForm.startUrls.split("\n").map(u => u.trim()).filter(Boolean);
            const res = await createCrawlSource(selectedCorpus._id, {
                name: crawlForm.name,
                description: crawlForm.description,
                startUrls: urls,
                maxDocuments: crawlForm.maxDocuments ? parseInt(crawlForm.maxDocuments) : undefined,
                maxDepth: crawlForm.maxDepth ? parseInt(crawlForm.maxDepth) : undefined,
            });
            if (res.success) {
                await loadSources(selectedCorpus._id);
                setIsModalOpen(false);
                toast.success("Web Crawler Created", `"${crawlForm.name}" source has been created.`);
            } else {
                toast.error("Creation Failed", res.error || "Failed to create web crawler");
            }
        } catch (err: any) {
            toast.error("Error", err.message || "Failed to create web crawler");
        } finally {
            setActionLoading(false);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedCorpus || !uploadFile) {
            toast.error("Validation Error", "Please select a file to upload");
            return;
        }
        setActionLoading(true);
        try {
            // Get presigned URL
            const uploadRes = await createFileUpload(selectedCorpus._id, {
                mimeType: uploadFile.type,
                fileName: uploadFile.name,
            });
            
            if (!uploadRes.success) {
                toast.error("Upload Failed", uploadRes.error || "Failed to get upload URL");
                return;
            }

            // Upload to presigned URL
            const uploaded = await uploadFileToPresignedUrl(uploadRes.data.presignedUrl, uploadFile);
            if (uploaded) {
                // Create upload source with the document
                await createUploadSource(selectedCorpus._id, {
                    name: uploadFile.name,
                    description: `Uploaded file: ${uploadFile.name}`,
                    documentIds: [uploadRes.data.documentId],
                });
                await loadSources(selectedCorpus._id);
                setIsModalOpen(false);
                toast.success("File Uploaded", `"${uploadFile.name}" has been uploaded successfully.`);
            } else {
                toast.error("Upload Failed", "Failed to upload file to storage");
            }
        } catch (err: any) {
            toast.error("Error", err.message || "Failed to upload file");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
        if (!selectedCorpus || !confirm("Are you sure you want to delete this source?")) return;
        setActionLoading(true);
        try {
            const sourceToDelete = sources.find(s => s._id === sourceId);
            const res = await deleteSource(selectedCorpus._id, sourceId);
            if (res.success) {
                await loadSources(selectedCorpus._id);
                toast.success("Source Deleted", `"${sourceToDelete?.name || 'Source'}" has been deleted.`);
            } else {
                toast.error("Delete Failed", res.error || "Failed to delete source");
            }
        } catch (err: any) {
            toast.error("Error", err.message || "Failed to delete source");
        } finally {
            setActionLoading(false);
        }
    };

    const handleQuery = async () => {
        if (!selectedCorpus || !queryText.trim()) return;
        setActionLoading(true);
        setQueryResults([]);
        try {
            const res = await queryCorpus(selectedCorpus._id, queryText, 5);
            if (res.success) {
                setQueryResults(res.data || []);
            } else {
                setError(res.error || "Query failed");
            }
        } catch (err: any) {
            setError(err.message || "Query failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSync = async () => {
        setActionLoading(true);
        try {
            const res = await syncCorpora();
            if (res.success) {
                await loadCorpora();
            }
        } catch (err: any) {
            setError(err.message || "Sync failed");
        } finally {
            setActionLoading(false);
        }
    };

    const viewCorpusDetail = async (corpus: Corpus) => {
        setSelectedCorpus(corpus);
        setViewMode("sources");
        await loadSources(corpus._id);
    };

    const viewSourceDocuments = async (source: CorpusSource) => {
        if (!selectedCorpus) return;
        setSelectedSource(source);
        setViewMode("documents");
        await loadDocuments(selectedCorpus._id, source._id);
    };

    // Render helpers
    const renderHeader = () => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {viewMode !== "list" && (
                    <button
                        onClick={() => {
                            if (viewMode === "documents") {
                                setViewMode("sources");
                                setSelectedSource(null);
                            } else {
                                setViewMode("list");
                                setSelectedCorpus(null);
                            }
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            border: "1px solid rgba(0, 200, 255, 0.2)",
                            background: "rgba(0, 200, 255, 0.1)",
                            color: "#00C8FF",
                            cursor: "pointer",
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", marginBottom: "8px" }}>
                        {viewMode === "list" && "RAG Knowledge Bases"}
                        {viewMode === "sources" && selectedCorpus?.name}
                        {viewMode === "documents" && selectedSource?.name}
                        {viewMode === "query" && `Query: ${selectedCorpus?.name}`}
                    </h1>
                    <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
                        {viewMode === "list" && "Manage your knowledge bases for retrieval-augmented generation."}
                        {viewMode === "sources" && "Manage sources for this knowledge base."}
                        {viewMode === "documents" && "Documents in this source."}
                        {viewMode === "query" && "Test RAG queries against this knowledge base."}
                    </p>
                </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
                {viewMode === "list" && (
                    <>
                        <button
                            onClick={handleSync}
                            disabled={actionLoading}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 20px",
                                borderRadius: "12px",
                                border: "1px solid rgba(0, 200, 255, 0.2)",
                                background: "rgba(0, 200, 255, 0.1)",
                                color: "#00C8FF",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                            }}
                        >
                            <RefreshCw size={16} className={actionLoading ? "animate-spin" : ""} />
                            Sync
                        </button>
                        <div style={{ position: "relative" }} className="create-kb-btn-wrapper">
                            <button
                                onClick={isLimitReached ? undefined : openCreateCorpusModal}
                                disabled={isLimitReached}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "12px 24px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: isLimitReached 
                                        ? "rgba(128, 128, 128, 0.5)" 
                                        : "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                                    color: isLimitReached ? "rgba(255, 255, 255, 0.5)" : "white",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: isLimitReached ? "not-allowed" : "pointer",
                                    opacity: isLimitReached ? 0.7 : 1,
                                }}
                                title={isLimitReached ? `You have reached your limit of ${maxCorpusLimit} knowledge base(s). Contact Talkrix team to increase your limit.` : undefined}
                            >
                                <Plus size={18} />
                                Create Knowledge Base
                            </button>
                            {isLimitReached && (
                                <div 
                                    className="limit-tooltip"
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        right: 0,
                                        marginTop: "8px",
                                        padding: "12px 16px",
                                        background: "rgba(30, 30, 40, 0.98)",
                                        border: "1px solid rgba(255, 60, 100, 0.3)",
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                        color: "rgba(255, 255, 255, 0.9)",
                                        whiteSpace: "nowrap",
                                        zIndex: 100,
                                        display: "none",
                                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <AlertCircle size={16} style={{ color: "#FF3C64" }} />
                                        <span>Limit reached ({corpora.length}/{maxCorpusLimit}). <a href="mailto:support@talkrix.com" style={{ color: "#00C8FF", textDecoration: "underline" }}>Contact Talkrix team</a></span>
                                    </div>
                                </div>
                            )}
                            <style jsx>{`
                                .create-kb-btn-wrapper:hover .limit-tooltip {
                                    display: block !important;
                                }
                            `}</style>
                        </div>
                    </>
                )}
                {viewMode === "sources" && (
                    <>
                        <button
                            onClick={() => setViewMode("query")}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 20px",
                                borderRadius: "12px",
                                border: "1px solid rgba(0, 200, 255, 0.2)",
                                background: "rgba(0, 200, 255, 0.1)",
                                color: "#00C8FF",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                            }}
                        >
                            <Search size={16} />
                            Test Query
                        </button>
                        <button
                            onClick={openCrawlModal}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 20px",
                                borderRadius: "12px",
                                border: "1px solid rgba(0, 200, 255, 0.2)",
                                background: "rgba(0, 200, 255, 0.1)",
                                color: "#00C8FF",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                            }}
                        >
                            <Globe size={16} />
                            Add Website
                        </button>
                        <button
                            onClick={openUploadModal}
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
                            <Upload size={18} />
                            Upload File
                        </button>
                    </>
                )}
                {viewMode === "query" && (
                    <button
                        onClick={() => setViewMode("sources")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 20px",
                            borderRadius: "12px",
                            border: "1px solid rgba(0, 200, 255, 0.2)",
                            background: "rgba(0, 200, 255, 0.1)",
                            color: "#00C8FF",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                        }}
                    >
                        <Database size={16} />
                        View Sources
                    </button>
                )}
            </div>
        </div>
    );

    const renderCorporaList = () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "20px" }}>
            {corpora.length === 0 && !loading && (
                <div style={{ 
                    gridColumn: "1 / -1", 
                    textAlign: "center", 
                    padding: "60px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "16px",
                    border: "1px dashed rgba(0, 200, 255, 0.2)",
                }}>
                    <Database size={48} style={{ color: "rgba(255, 255, 255, 0.2)", marginBottom: "16px" }} />
                    <p style={{ color: "rgba(255, 255, 255, 0.5)", marginBottom: "16px" }}>No knowledge bases yet</p>
                    <button
                        onClick={openCreateCorpusModal}
                        style={{
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
                        Create Your First Knowledge Base
                    </button>
                </div>
            )}
            {corpora.map(corpus => {
                const status = getStatus(corpus.stats?.status);
                return (
                    <div
                        key={corpus._id}
                        style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(0, 200, 255, 0.15)",
                            borderRadius: "12px",
                            padding: "24px",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            cursor: "pointer",
                        }}
                        onClick={() => viewCorpusDetail(corpus)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(0, 200, 255, 0.15)";
                            e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.3)";
                            e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                            e.currentTarget.style.borderColor = "rgba(0, 200, 255, 0.15)";
                            e.currentTarget.style.transform = "scale(1)";
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
                                    background: status.bg,
                                    color: status.color,
                                }}
                            >
                                {status.label === "Loading" && <RefreshCw size={12} className="animate-spin" />}
                                {status.label}
                            </div>
                        </div>

                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", marginBottom: "8px" }}>
                            {corpus.name}
                        </h3>
                        <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "20px", lineHeight: "1.5" }}>
                            {corpus.description || "No description"}
                        </p>

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
                                <p style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>{corpus.stats?.numDocs || 0}</p>
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Documents</p>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>{corpus.stats?.numChunks || 0}</p>
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Chunks</p>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>{corpus.stats?.numVectors || 0}</p>
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Vectors</p>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => viewCorpusDetail(corpus)}
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
                                }}
                            >
                                <ChevronRight size={14} />
                                View Sources
                            </button>
                            <button
                                onClick={() => openEditCorpusModal(corpus)}
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
                                }}
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => handleDeleteCorpus(corpus._id)}
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
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderSourcesList = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {sources.length === 0 && !actionLoading && (
                <div style={{ 
                    textAlign: "center", 
                    padding: "60px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "16px",
                    border: "1px dashed rgba(0, 200, 255, 0.2)",
                }}>
                    <FileText size={48} style={{ color: "rgba(255, 255, 255, 0.2)", marginBottom: "16px" }} />
                    <p style={{ color: "rgba(255, 255, 255, 0.5)", marginBottom: "16px" }}>No sources yet</p>
                    <p style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "13px" }}>
                        Add a website to crawl or upload documents to get started.
                    </p>
                </div>
            )}
            {sources.map(source => {
                const status = getStatus(source.stats?.status);
                const isCrawl = !!source.crawl?.startUrls?.length;
                return (
                    <div
                        key={source._id}
                        style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(0, 200, 255, 0.15)",
                            borderRadius: "12px",
                            padding: "20px",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div
                                    style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "10px",
                                        background: isCrawl ? "rgba(34, 197, 94, 0.1)" : "rgba(120, 0, 255, 0.1)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: isCrawl ? "#22c55e" : "#7800FF",
                                    }}
                                >
                                    {isCrawl ? <Globe size={20} /> : <File size={20} />}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "4px" }}>
                                        {source.name}
                                    </h4>
                                    <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)" }}>
                                        {source.description || (isCrawl ? source.crawl?.startUrls?.join(", ") : "Uploaded file")}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span
                                    style={{
                                        padding: "4px 12px",
                                        borderRadius: "20px",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        background: status.bg,
                                        color: status.color,
                                    }}
                                >
                                    {source.stats?.numDocs || 0} docs
                                </span>
                                <button
                                    onClick={() => viewSourceDocuments(source)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "8px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(0, 200, 255, 0.3)",
                                        background: "rgba(0, 200, 255, 0.1)",
                                        color: "#00C8FF",
                                        cursor: "pointer",
                                    }}
                                >
                                    <FileText size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteSource(source._id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "8px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(255, 60, 100, 0.3)",
                                        background: "rgba(255, 60, 100, 0.1)",
                                        color: "#FF3C64",
                                        cursor: "pointer",
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderDocumentsList = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {documents.length === 0 && !actionLoading && (
                <div style={{ 
                    textAlign: "center", 
                    padding: "40px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "16px",
                }}>
                    <p style={{ color: "rgba(255, 255, 255, 0.5)" }}>No documents found</p>
                </div>
            )}
            {documents.map((doc, index) => (
                <div
                    key={doc.documentId || index}
                    style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(0, 200, 255, 0.1)",
                        borderRadius: "10px",
                        padding: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <File size={20} style={{ color: "#7800FF" }} />
                        <div>
                            <p style={{ fontSize: "14px", fontWeight: "500", color: "white" }}>
                                {doc.metadata?.title || doc.fileName || "Document"}
                            </p>
                            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)" }}>
                                {doc.mimeType || "Unknown type"} • {doc.sizeBytes ? `${(parseInt(doc.sizeBytes) / 1024).toFixed(1)} KB` : ""}
                            </p>
                        </div>
                    </div>
                    {doc.metadata?.publicUrl && (
                        <a
                            href={doc.metadata.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                color: "#00C8FF",
                                fontSize: "13px",
                                textDecoration: "none",
                            }}
                        >
                            <ExternalLink size={14} />
                            View
                        </a>
                    )}
                </div>
            ))}
        </div>
    );

    const renderQueryView = () => (
        <div style={{ maxWidth: "800px" }}>
            <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                    <input
                        type="text"
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                        placeholder="Enter your query..."
                        style={{
                            flex: 1,
                            padding: "14px 18px",
                            borderRadius: "12px",
                            border: "1px solid rgba(0, 200, 255, 0.2)",
                            background: "rgba(255, 255, 255, 0.05)",
                            color: "white",
                            fontSize: "15px",
                            outline: "none",
                        }}
                    />
                    <button
                        onClick={handleQuery}
                        disabled={actionLoading || !queryText.trim()}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "14px 24px",
                            borderRadius: "12px",
                            border: "none",
                            background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            opacity: actionLoading ? 0.7 : 1,
                        }}
                    >
                        {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Search
                    </button>
                </div>
            </div>

            {queryResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>
                        Results ({queryResults.length})
                    </h3>
                    {queryResults.map((result, index) => (
                        <div
                            key={index}
                            style={{
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid rgba(0, 200, 255, 0.15)",
                                borderRadius: "12px",
                                padding: "20px",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                <span style={{ 
                                    fontSize: "12px", 
                                    color: "#00C8FF",
                                    background: "rgba(0, 200, 255, 0.1)",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                }}>
                                    Score: {result.score?.toFixed(3)}
                                </span>
                                {result.citation?.publicUrl && (
                                    <a
                                        href={result.citation.publicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "#00C8FF", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}
                                    >
                                        <ExternalLink size={12} />
                                        Source
                                    </a>
                                )}
                            </div>
                            <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.8)", lineHeight: "1.6" }}>
                                {result.content}
                            </p>
                            {result.citation?.title && (
                                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", marginTop: "12px" }}>
                                    From: {result.citation.title}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderModal = () => {
        if (!isModalOpen) return null;

        return (
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
                        maxWidth: "520px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "white" }}>
                            {modalType === "corpus" && (editingCorpus ? "Edit Knowledge Base" : "Create Knowledge Base")}
                            {modalType === "crawl" && "Add Website Source"}
                            {modalType === "upload" && "Upload Document"}
                        </h2>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{ background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.5)", cursor: "pointer" }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {modalType === "corpus" && (
                            <>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={corpusForm.name}
                                        onChange={(e) => setCorpusForm({ ...corpusForm, name: e.target.value })}
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
                                        value={corpusForm.description}
                                        onChange={(e) => setCorpusForm({ ...corpusForm, description: e.target.value })}
                                        placeholder="Describe the content..."
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
                                <button
                                    onClick={handleSaveCorpus}
                                    disabled={actionLoading || !corpusForm.name.trim()}
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
                                        opacity: actionLoading ? 0.7 : 1,
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {editingCorpus ? "Save Changes" : "Create Knowledge Base"}
                                </button>
                            </>
                        )}

                        {modalType === "crawl" && (
                            <>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                        Source Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={crawlForm.name}
                                        onChange={(e) => setCrawlForm({ ...crawlForm, name: e.target.value })}
                                        placeholder="e.g., Company Website"
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
                                        URLs to Crawl * (one per line)
                                    </label>
                                    <textarea
                                        value={crawlForm.startUrls}
                                        onChange={(e) => setCrawlForm({ ...crawlForm, startUrls: e.target.value })}
                                        placeholder="https://example.com/docs&#10;https://example.com/faq"
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
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "8px" }}>
                                            Max Documents
                                        </label>
                                        <input
                                            type="number"
                                            value={crawlForm.maxDocuments}
                                            onChange={(e) => setCrawlForm({ ...crawlForm, maxDocuments: e.target.value })}
                                            placeholder="200"
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
                                            Max Depth
                                        </label>
                                        <input
                                            type="number"
                                            value={crawlForm.maxDepth}
                                            onChange={(e) => setCrawlForm({ ...crawlForm, maxDepth: e.target.value })}
                                            placeholder="3"
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
                                </div>
                                <button
                                    onClick={handleCreateCrawlSource}
                                    disabled={actionLoading || !crawlForm.name.trim() || !crawlForm.startUrls.trim()}
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
                                        opacity: actionLoading ? 0.7 : 1,
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                                    Start Crawling
                                </button>
                            </>
                        )}

                        {modalType === "upload" && (
                            <>
                                <div
                                    style={{
                                        border: "2px dashed rgba(0, 200, 255, 0.3)",
                                        borderRadius: "12px",
                                        padding: "40px",
                                        textAlign: "center",
                                        cursor: "pointer",
                                        background: uploadFile ? "rgba(34, 197, 94, 0.05)" : "rgba(0, 200, 255, 0.05)",
                                    }}
                                    onClick={() => document.getElementById("file-upload")?.click()}
                                >
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt,.md,.epub,.pptx"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        style={{ display: "none" }}
                                    />
                                    {uploadFile ? (
                                        <>
                                            <Check size={32} style={{ color: "#22c55e", marginBottom: "12px" }} />
                                            <p style={{ color: "white", fontWeight: "500" }}>{uploadFile.name}</p>
                                            <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "13px" }}>
                                                {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={32} style={{ color: "#00C8FF", marginBottom: "12px" }} />
                                            <p style={{ color: "white", fontWeight: "500" }}>Click to upload a file</p>
                                            <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "13px" }}>
                                                PDF, DOC, TXT, MD, EPUB, PPTX (max 10MB)
                                            </p>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={handleFileUpload}
                                    disabled={actionLoading || !uploadFile}
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
                                        opacity: actionLoading || !uploadFile ? 0.7 : 1,
                                    }}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    Upload Document
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Main render
    if (loading) {
        return (
            <div style={{ padding: "32px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <Loader2 size={40} className="animate-spin" style={{ color: "#00C8FF" }} />
            </div>
        );
    }

    return (
        <div style={{ 
            padding: "clamp(16px, 4vw, 40px)", 
            width: "100%",
            boxSizing: "border-box",
        }}>
            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
            <style>{`
                @media (max-width: 768px) {
                    .rag-header {
                        flex-direction: column !important;
                        gap: 16px !important;
                        align-items: flex-start !important;
                    }
                    .rag-header-actions {
                        width: 100%;
                        flex-direction: column !important;
                        gap: 8px !important;
                    }
                    .rag-header-actions button {
                        width: 100%;
                        justify-content: center;
                    }
                    .corpora-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .corpus-card {
                        padding: 16px !important;
                    }
                    .source-card {
                        flex-direction: column !important;
                        gap: 12px !important;
                    }
                    .document-item {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                    }
                }
            `}</style>
            {error && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px",
                        background: "rgba(255, 60, 100, 0.1)",
                        border: "1px solid rgba(255, 60, 100, 0.3)",
                        borderRadius: "12px",
                        marginBottom: "24px",
                        color: "#FF3C64",
                        fontSize: "13px",
                    }}
                >
                    <AlertCircle size={18} />
                    <span style={{ flex: 1 }}>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#FF3C64", cursor: "pointer", padding: "4px" }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {renderHeader()}

            {viewMode === "list" && renderCorporaList()}
            {viewMode === "sources" && renderSourcesList()}
            {viewMode === "documents" && renderDocumentsList()}
            {viewMode === "query" && renderQueryView()}

            {actionLoading && viewMode !== "list" && (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: "#00C8FF" }} />
                </div>
            )}

            {renderModal()}
        </div>
    );
}
