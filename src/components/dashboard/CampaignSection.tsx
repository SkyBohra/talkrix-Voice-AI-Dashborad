'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Calendar, Clock, Globe, Users, Phone, ChevronRight, X, Loader2 } from 'lucide-react';
import {
  Campaign,
  CreateCampaignData,
  fetchCampaigns,
  createCampaign,
  uploadCampaignContacts
} from '@/lib/campaignApi';
import { fetchAgentsByUser } from '@/lib/agentApi';
import Pagination from '@/components/ui/Pagination';

// Type alias for campaign types
type CampaignType = 'outbound' | 'inbound' | 'ondemand';

// Agent interface
interface Agent {
  _id: string;
  name: string;
  [key: string]: unknown;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland'
];

export default function CampaignSection() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    type: CampaignType;
    agentId: string;
    scheduledDate: string;
    scheduledTime: string;
    timezone: string;
  }>({
    name: '',
    type: 'outbound',
    agentId: '',
    scheduledDate: '',
    scheduledTime: '',
    timezone: 'UTC'
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userId') || '';
    }
    return '';
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      
      const [campaignsRes, agentsRes] = await Promise.all([
        fetchCampaigns({ page, limit: itemsPerPage }),
        fetchAgentsByUser(userId)
      ]);
      
      if (campaignsRes.success && campaignsRes.data) {
        setCampaigns(campaignsRes.data.campaigns || []);
        setTotalPages(campaignsRes.data.pages || 1);
        setTotalItems(campaignsRes.data.total || 0);
      }
      if (agentsRes.success) {
        setAgents(agentsRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCampaign = async () => {
    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (!formData.agentId) {
      setError('Please select an agent');
      return;
    }
    if (formData.type === 'outbound') {
      if (!formData.scheduledDate || !formData.scheduledTime) {
        setError('Schedule is required for outbound campaigns');
        return;
      }
    }

    try {
      setCreating(true);
      setError(null);

      const createData: CreateCampaignData = {
        name: formData.name,
        type: formData.type,
        agentId: formData.agentId,
      };

      if (formData.type === 'outbound') {
        createData.schedule = {
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          timezone: formData.timezone
        };
      }

      const response = await createCampaign(createData);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create campaign');
      }
      
      const newCampaign = response.data;

      // If file is selected, upload contacts
      if (selectedFile && newCampaign?._id) {
        setUploadingFile(true);
        await uploadCampaignContacts(newCampaign._id, selectedFile);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        type: 'outbound',
        agentId: '',
        scheduledDate: '',
        scheduledTime: '',
        timezone: 'UTC'
      });
      setSelectedFile(null);
      setShowCreateModal(false);

      // Reload campaigns
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to create campaign:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(errorMessage);
    } finally {
      setCreating(false);
      setUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#6B7280';
      case 'scheduled':
        return '#F59E0B';
      case 'paused':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getTypeLabel = (type: CampaignType) => {
    switch (type) {
      case 'outbound':
        return 'Outbound';
      case 'inbound':
        return 'Inbound';
      case 'ondemand':
        return 'On-Demand';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px'
      }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} color="#00C8FF" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            margin: 0
          }}>
            Campaigns
          </h1>
          <p style={{ color: '#9CA3AF', marginTop: '4px' }}>
            Manage your voice campaigns
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
        >
          <Plus size={18} />
          Create Campaign
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Campaigns', value: campaigns.length, icon: Users },
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, icon: Phone },
          { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, icon: Calendar },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, icon: Clock }
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <stat.icon size={20} color="#00C8FF" />
              </div>
              <div>
                <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>{stat.label}</p>
                <p style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns List */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
      }}>
        {campaigns.length === 0 ? (
          <div style={{
            padding: '60px',
            textAlign: 'center'
          }}>
            <Users size={48} color="#6B7280" style={{ marginBottom: '16px' }} />
            <p style={{ color: '#9CA3AF', fontSize: '16px' }}>No campaigns yet</p>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>Create your first campaign to get started</p>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign._id}
              onClick={() => router.push(`/dashboard/campaign/${campaign._id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Phone size={24} color="#00C8FF" />
                </div>
                <div>
                  <h3 style={{ color: '#FFFFFF', fontWeight: '600', margin: 0 }}>{campaign.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(0, 200, 255, 0.2)',
                      color: '#00C8FF'
                    }}>
                      {getTypeLabel(campaign.type)}
                    </span>
                    <span style={{ color: '#9CA3AF', fontSize: '14px' }}>
                      {campaign.totalContacts || 0} contacts
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: `${getStatusColor(campaign.status)}20`,
                  color: getStatusColor(campaign.status),
                  textTransform: 'capitalize'
                }}>
                  {campaign.status}
                </span>
                <ChevronRight size={20} color="#6B7280" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setPage}
        itemLabel="campaigns"
      />

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1A1A2E',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ color: '#FFFFFF', fontWeight: '600', margin: 0 }}>Create Campaign</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} color="#9CA3AF" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  color: '#EF4444',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              {/* Campaign Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#9CA3AF', fontSize: '14px', marginBottom: '8px' }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter campaign name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Campaign Type */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#9CA3AF', fontSize: '14px', marginBottom: '8px' }}>
                  Campaign Type *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['outbound', 'inbound', 'ondemand'] as CampaignType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: formData.type === type
                          ? 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: formData.type === type
                          ? 'none'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: formData.type === type ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {getTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#9CA3AF', fontSize: '14px', marginBottom: '8px' }}>
                  Select Agent *
                </label>
                <select
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ background: '#1A1A2E' }}>Select an agent</option>
                  {agents.map((agent) => (
                    <option key={agent._id} value={agent._id} style={{ background: '#1A1A2E' }}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule (Only for Outbound) */}
              {formData.type === 'outbound' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#9CA3AF', fontSize: '14px', marginBottom: '8px' }}>
                    Schedule *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Calendar size={14} color="#9CA3AF" />
                        <span style={{ color: '#6B7280', fontSize: '12px' }}>Date</span>
                      </div>
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Clock size={14} color="#9CA3AF" />
                        <span style={{ color: '#6B7280', fontSize: '12px' }}>Time</span>
                      </div>
                      <input
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Globe size={14} color="#9CA3AF" />
                      <span style={{ color: '#6B7280', fontSize: '12px' }}>Timezone</span>
                    </div>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz} style={{ background: '#1A1A2E' }}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#9CA3AF', fontSize: '14px', marginBottom: '8px' }}>
                  Upload Contacts (Optional)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '24px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '2px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <Upload size={24} color="#9CA3AF" style={{ marginBottom: '8px' }} />
                  <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>
                    {selectedFile ? selectedFile.name : 'Click to upload Excel file'}
                  </p>
                  <p style={{ color: '#6B7280', fontSize: '12px', margin: '4px 0 0' }}>
                    Excel file with name and phone number columns
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleCreateCampaign}
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: creating
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {creating && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
                {creating ? (uploadingFile ? 'Uploading contacts...' : 'Creating...') : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
