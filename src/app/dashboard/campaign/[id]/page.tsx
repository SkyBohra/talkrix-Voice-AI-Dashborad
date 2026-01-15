"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import {
    ArrowLeft, Users, Plus, Upload, Edit, Trash2, Phone, CheckCircle,
    XCircle, Clock, Search, Download, MoreHorizontal, Loader,
    PhoneOutgoing, PhoneIncoming, Zap, Calendar, Globe, Save, X,
    AlertCircle, PhoneMissed
} from "lucide-react";
import {
    Campaign, CampaignContact, fetchCampaign, updateCampaign,
    addCampaignContacts, updateCampaignContact, deleteCampaignContact,
    uploadCampaignContacts, fetchCampaignStats
} from "@/lib/campaignApi";

export default function CampaignDetailPage() {
    const router = useRouter();
    const params = useParams();
    const campaignId = params.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingContact, setEditingContact] = useState<CampaignContact | null>(null);
    const [newContact, setNewContact] = useState({ name: "", phoneNumber: "" });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [triggeringCalls, setTriggeringCalls] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }
        loadCampaign();
    }, [campaignId]);

    const loadCampaign = async () => {
        try {
            const [campaignRes, statsRes] = await Promise.all([
                fetchCampaign(campaignId),
                fetchCampaignStats(campaignId)
            ]);
            if (campaignRes.success) {
                setCampaign(campaignRes.data);
            }
            if (statsRes.success) {
                setStats(statsRes.data);
            }
        } catch (error) {
            console.error("Error loading campaign:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        router.push("/login");
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed": return <CheckCircle size={16} style={{ color: "#22c55e" }} />;
            case "failed": return <XCircle size={16} style={{ color: "#FF3C64" }} />;
            case "in-progress": return <Loader size={16} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />;
            case "no-answer": return <PhoneMissed size={16} style={{ color: "#fbbf24" }} />;
            case "pending":
            default: return <Clock size={16} style={{ color: "rgba(255, 255, 255, 0.5)" }} />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "completed": return { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "rgba(34, 197, 94, 0.3)" };
            case "failed": return { bg: "rgba(255, 60, 100, 0.15)", color: "#FF3C64", border: "rgba(255, 60, 100, 0.3)" };
            case "in-progress": return { bg: "rgba(0, 200, 255, 0.15)", color: "#00C8FF", border: "rgba(0, 200, 255, 0.3)" };
            case "no-answer": return { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" };
            case "pending":
            default: return { bg: "rgba(255, 255, 255, 0.1)", color: "rgba(255, 255, 255, 0.6)", border: "rgba(255, 255, 255, 0.2)" };
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "outbound": return <PhoneOutgoing size={18} />;
            case "inbound": return <PhoneIncoming size={18} />;
            case "ondemand": return <Zap size={18} />;
            default: return <Phone size={18} />;
        }
    };

    const filteredContacts = campaign?.contacts?.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phoneNumber.includes(searchQuery)
    ) || [];

    // Selection helpers for ondemand campaigns
    const isAllSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedContacts.has(c._id || ''));
    const isSomeSelected = selectedContacts.size > 0;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedContacts(new Set());
        } else {
            const newSelected = new Set<string>();
            filteredContacts.forEach(c => {
                if (c._id) newSelected.add(c._id);
            });
            setSelectedContacts(newSelected);
        }
    };

    const toggleSelectContact = (contactId: string) => {
        const newSelected = new Set(selectedContacts);
        if (newSelected.has(contactId)) {
            newSelected.delete(contactId);
        } else {
            newSelected.add(contactId);
        }
        setSelectedContacts(newSelected);
    };

    const handleTriggerCalls = async () => {
        if (selectedContacts.size === 0) {
            alert('Please select at least one contact');
            return;
        }

        setTriggeringCalls(true);
        try {
            // TODO: Implement actual call triggering API
            const contactIds = Array.from(selectedContacts);
            console.log('Triggering calls for contacts:', contactIds);
            
            // For now, show a placeholder alert
            alert(`Triggering calls for ${selectedContacts.size} contact(s)...`);
            
            // Clear selection after triggering
            setSelectedContacts(new Set());
        } catch (error) {
            console.error('Error triggering calls:', error);
            alert('Failed to trigger calls. Please try again.');
        } finally {
            setTriggeringCalls(false);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await addCampaignContacts(campaignId, [newContact]);
            if (res.success) {
                setCampaign(res.data);
                setNewContact({ name: "", phoneNumber: "" });
                setShowAddModal(false);
            }
        } catch (error) {
            console.error("Error adding contact:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleEditContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingContact?._id) return;
        setSaving(true);
        try {
            const res = await updateCampaignContact(campaignId, editingContact._id, {
                name: editingContact.name,
                phoneNumber: editingContact.phoneNumber
            });
            if (res.success) {
                setCampaign(res.data);
                setEditingContact(null);
                setShowEditModal(false);
            }
        } catch (error) {
            console.error("Error updating contact:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContact = async (contactId: string) => {
        try {
            const res = await deleteCampaignContact(campaignId, contactId);
            if (res.success) {
                setCampaign(res.data);
            }
        } catch (error) {
            console.error("Error deleting contact:", error);
        } finally {
            setDeleteConfirm(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
            alert("Please upload an Excel file (.xlsx, .xls) or CSV file");
            return;
        }

        setUploading(true);
        try {
            const res = await uploadCampaignContacts(campaignId, file);
            if (res.success) {
                await loadCampaign();
                alert(`Successfully imported ${res.data.importedCount} contacts!`);
            }
        } catch (error) {
            console.error("Error uploading contacts:", error);
            alert("Failed to upload contacts. Please check your file format.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const openEditModal = (contact: CampaignContact) => {
        setEditingContact({ ...contact });
        setShowEditModal(true);
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", zIndex: 1 }} />
                <Sidebar activeSection="campaign" onSectionChange={(section) => router.push(section === "dashboard" ? "/dashboard" : `/dashboard/${section}`)} onLogout={handleLogout} />
                <main className="dashboard-main">
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: "400px" }}>
                        <Loader size={32} style={{ color: "#00C8FF", animation: "spin 1s linear infinite" }} />
                    </div>
                </main>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="dashboard-container">
                <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", zIndex: 1 }} />
                <Sidebar activeSection="campaign" onSectionChange={(section) => router.push(section === "dashboard" ? "/dashboard" : `/dashboard/${section}`)} onLogout={handleLogout} />
                <main className="dashboard-main">
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", minHeight: "400px" }}>
                        <AlertCircle size={48} style={{ color: "#FF3C64", marginBottom: "16px" }} />
                        <h2 style={{ color: "white", marginBottom: "8px" }}>Campaign not found</h2>
                        <button onClick={() => router.push("/dashboard/campaign")} style={{ padding: "12px 24px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", cursor: "pointer" }}>
                            Back to Campaigns
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", zIndex: 1 }} />
            <Sidebar activeSection="campaign" onSectionChange={(section) => router.push(section === "dashboard" ? "/dashboard" : `/dashboard/${section}`)} onLogout={handleLogout} />
            
            <main className="dashboard-main">
                <div style={{ padding: "32px", boxSizing: "border-box" }}>
                    {/* Back Button & Header */}
                    <div style={{ marginBottom: "24px" }}>
                        <button onClick={() => router.push("/dashboard/campaign")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "rgba(255, 255, 255, 0.7)", cursor: "pointer", marginBottom: "20px" }}>
                            <ArrowLeft size={18} />Back to Campaigns
                        </button>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: campaign.type === "outbound" ? "rgba(0, 200, 255, 0.15)" : campaign.type === "inbound" ? "rgba(34, 197, 94, 0.15)" : "rgba(251, 191, 36, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: campaign.type === "outbound" ? "#00C8FF" : campaign.type === "inbound" ? "#22c55e" : "#fbbf24" }}>
                                    {getTypeIcon(campaign.type)}
                                </div>
                                <div>
                                    <h1 style={{ fontSize: "26px", fontWeight: "700", color: "white", marginBottom: "4px" }}>{campaign.name}</h1>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: campaign.type === "outbound" ? "rgba(0, 200, 255, 0.15)" : campaign.type === "inbound" ? "rgba(34, 197, 94, 0.15)" : "rgba(251, 191, 36, 0.15)", color: campaign.type === "outbound" ? "#00C8FF" : campaign.type === "inbound" ? "#22c55e" : "#fbbf24", textTransform: "capitalize" }}>{campaign.type}</span>
                                        <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>Agent: {campaign.agentName || "Not assigned"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                        {[
                            { label: "Total Contacts", value: stats?.totalContacts || campaign.totalContacts, icon: <Users size={18} /> },
                            { label: "Completed", value: stats?.completedCalls || campaign.completedCalls, icon: <CheckCircle size={18} />, color: "#22c55e" },
                            { label: "Successful", value: stats?.successfulCalls || campaign.successfulCalls, icon: <Phone size={18} />, color: "#00C8FF" },
                            { label: "Failed", value: stats?.failedCalls || campaign.failedCalls, icon: <XCircle size={18} />, color: "#FF3C64" },
                            { label: "Pending", value: stats?.pendingCalls || (campaign.totalContacts - campaign.completedCalls), icon: <Clock size={18} /> },
                            { label: "Success Rate", value: `${stats?.successRate || 0}%`, icon: <CheckCircle size={18} />, color: "#a855f7" },
                        ].map((stat, index) => (
                            <div key={index} style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "12px", padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: stat.color || "rgba(255, 255, 255, 0.5)" }}>
                                    {stat.icon}
                                </div>
                                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "2px" }}>{stat.label}</p>
                                <p style={{ fontSize: "20px", fontWeight: "700", color: stat.color || "white" }}>{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Schedule Info (for outbound) */}
                    {campaign.type === "outbound" && campaign.schedule && (
                        <div style={{ marginBottom: "24px", padding: "16px 20px", background: "rgba(0, 200, 255, 0.05)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Calendar size={16} style={{ color: "#00C8FF" }} /><span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Scheduled: {new Date(campaign.schedule.scheduledDate).toLocaleDateString()}</span></div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={16} style={{ color: "#00C8FF" }} /><span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{campaign.schedule.scheduledTime}</span></div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Globe size={16} style={{ color: "#00C8FF" }} /><span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{campaign.schedule.timezone}</span></div>
                        </div>
                    )}

                    {/* Contacts Section */}
                    <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(0, 200, 255, 0.15)", borderRadius: "16px", padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <h2 style={{ fontSize: "18px", fontWeight: "600", color: "white" }}>Contacts ({campaign.contacts?.length || 0})</h2>
                                {campaign.type === "ondemand" && selectedContacts.size > 0 && (
                                    <span style={{ fontSize: "13px", color: "#00C8FF", background: "rgba(0, 200, 255, 0.1)", padding: "4px 12px", borderRadius: "20px" }}>
                                        {selectedContacts.size} selected
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <div style={{ position: "relative" }}>
                                    <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255, 255, 255, 0.4)" }} />
                                    <input type="text" placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "white", fontSize: "14px", outline: "none", width: "200px" }} />
                                </div>
                                {campaign.type === "ondemand" && (
                                    <button onClick={handleTriggerCalls} disabled={triggeringCalls || selectedContacts.size === 0} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px", border: "none", background: selectedContacts.size === 0 ? "rgba(251, 191, 36, 0.3)" : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: selectedContacts.size === 0 ? "rgba(255, 255, 255, 0.5)" : "#000", cursor: selectedContacts.size === 0 ? "not-allowed" : "pointer", fontWeight: "600" }}>
                                        {triggeringCalls ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={16} />}
                                        Trigger Call{selectedContacts.size > 1 ? 's' : ''}
                                    </button>
                                )}
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.3)", background: "transparent", color: "#00C8FF", cursor: "pointer" }}>
                                    {uploading ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
                                    Upload Excel
                                </button>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
                                <button onClick={() => setShowAddModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", cursor: "pointer" }}>
                                    <Plus size={16} />Add Contact
                                </button>
                            </div>
                        </div>

                        {/* Contacts Table */}
                        {filteredContacts.length > 0 ? (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            {campaign.type === "ondemand" && (
                                                <th style={{ width: "48px", padding: "12px 16px", textAlign: "center" }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isAllSelected} 
                                                        onChange={toggleSelectAll}
                                                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#00C8FF" }}
                                                    />
                                                </th>
                                            )}
                                            <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>Name</th>
                                            <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>Phone Number</th>
                                            <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>Status</th>
                                            <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>Called At</th>
                                            <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>Duration</th>
                                            <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredContacts.map((contact) => {
                                            const statusStyle = getStatusStyle(contact.callStatus);
                                            return (
                                                <tr key={contact._id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", background: selectedContacts.has(contact._id || '') ? "rgba(0, 200, 255, 0.05)" : "transparent" }}>
                                                    {campaign.type === "ondemand" && (
                                                        <td style={{ width: "48px", padding: "16px", textAlign: "center" }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedContacts.has(contact._id || '')} 
                                                                onChange={() => toggleSelectContact(contact._id || '')}
                                                                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#00C8FF" }}
                                                            />
                                                        </td>
                                                    )}
                                                    <td style={{ padding: "16px", color: "white", fontWeight: "500" }}>{contact.name}</td>
                                                    <td style={{ padding: "16px", color: "rgba(255, 255, 255, 0.7)" }}>{contact.phoneNumber}</td>
                                                    <td style={{ padding: "16px" }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, textTransform: "capitalize" }}>
                                                            {getStatusIcon(contact.callStatus)}{contact.callStatus}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "16px", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>
                                                        {contact.calledAt ? new Date(contact.calledAt).toLocaleString() : "-"}
                                                    </td>
                                                    <td style={{ padding: "16px", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>
                                                        {contact.callDuration ? `${Math.floor(contact.callDuration / 60)}:${(contact.callDuration % 60).toString().padStart(2, '0')}` : "-"}
                                                    </td>
                                                    <td style={{ padding: "16px", textAlign: "right" }}>
                                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                                            <button onClick={() => openEditModal(contact)} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "rgba(255, 255, 255, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Edit">
                                                                <Edit size={14} />
                                                            </button>
                                                            <button onClick={() => setDeleteConfirm(contact._id || "")} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid rgba(255, 60, 100, 0.3)", background: "transparent", color: "#FF3C64", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Delete">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", padding: "60px 20px" }}>
                                <Users size={48} style={{ color: "rgba(0, 200, 255, 0.3)", marginBottom: "16px" }} />
                                <h3 style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>
                                    {searchQuery ? "No contacts found" : "No contacts yet"}
                                </h3>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "20px" }}>
                                    {searchQuery ? "Try a different search term" : "Add contacts manually or upload an Excel file"}
                                </p>
                                {!searchQuery && (
                                    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                                        <button onClick={() => fileInputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.3)", background: "transparent", color: "#00C8FF", cursor: "pointer" }}>
                                            <Upload size={16} />Upload Excel
                                        </button>
                                        <button onClick={() => setShowAddModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", cursor: "pointer" }}>
                                            <Plus size={16} />Add Contact
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowAddModal(false)}>
                    <div style={{ background: "#1a1a2e", border: "1px solid rgba(0, 200, 255, 0.2)", borderRadius: "16px", padding: "32px", maxWidth: "450px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white" }}>Add Contact</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "rgba(255, 255, 255, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAddContact}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>Name *</label>
                                <input type="text" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} required placeholder="Enter contact name" style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div style={{ marginBottom: "24px" }}>
                                <label style={{ display: "block", fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>Phone Number *</label>
                                <input type="text" value={newContact.phoneNumber} onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })} required placeholder="+1234567890" style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                                <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", marginTop: "6px" }}>Include country code (e.g., +1 for US, +91 for India)</p>
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "white", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    {saving ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Contact Modal */}
            {showEditModal && editingContact && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowEditModal(false); setEditingContact(null); }}>
                    <div style={{ background: "#1a1a2e", border: "1px solid rgba(0, 200, 255, 0.2)", borderRadius: "16px", padding: "32px", maxWidth: "450px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white" }}>Edit Contact</h3>
                            <button onClick={() => { setShowEditModal(false); setEditingContact(null); }} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "rgba(255, 255, 255, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleEditContact}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>Name *</label>
                                <input type="text" value={editingContact.name} onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })} required style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div style={{ marginBottom: "24px" }}>
                                <label style={{ display: "block", fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>Phone Number *</label>
                                <input type="text" value={editingContact.phoneNumber} onChange={(e) => setEditingContact({ ...editingContact, phoneNumber: e.target.value })} required style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(0, 200, 255, 0.2)", background: "rgba(255, 255, 255, 0.05)", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => { setShowEditModal(false); setEditingContact(null); }} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "white", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)", color: "white", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    {saving ? <Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setDeleteConfirm(null)}>
                    <div style={{ background: "#1a1a2e", border: "1px solid rgba(255, 60, 100, 0.3)", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", marginBottom: "16px" }}>Delete Contact?</h3>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", marginBottom: "24px" }}>This action cannot be undone.</p>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "transparent", color: "white", cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => handleDeleteContact(deleteConfirm)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "#FF3C64", color: "white", cursor: "pointer" }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
