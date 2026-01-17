'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Phone, ChevronRight, Loader2, Calendar, Clock } from 'lucide-react';
import {
  Campaign,
  CreateCampaignData,
  fetchCampaigns,
  createCampaign,
  uploadCampaignContacts
} from '@/lib/campaignApi';
import { fetchAgentsByUser } from '@/lib/agentApi';
import { getAvailablePhoneNumbers, PhoneNumberOption, TelephonyProvider } from '@/lib/settingsApi';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/toast';
import CreateCampaignWizard from './CreateCampaignWizard';

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
  const toast = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Phone number state
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberOption[]>([]);
  const [configuredProviders, setConfiguredProviders] = useState<TelephonyProvider[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(false);

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
    endTime: string;
    timezone: string;
    outboundProvider: TelephonyProvider | '';
    outboundPhoneNumber: string;
  }>({
    name: '',
    type: 'outbound',
    agentId: '',
    scheduledDate: '',
    scheduledTime: '',
    endTime: '',
    timezone: 'Asia/Kolkata',
    outboundProvider: '',
    outboundPhoneNumber: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userId') || '';
    }
    return '';
  };

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  };

  // Check authentication on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Load available phone numbers
  const loadPhoneNumbers = useCallback(async () => {
    try {
      setLoadingPhones(true);
      const res = await getAvailablePhoneNumbers();
      if (res.success && res.data) {
        setPhoneNumbers(res.data.phoneNumbers || []);
        setConfiguredProviders(res.data.configuredProviders || []);
        
        // Auto-select if only one phone number is available
        if (res.data.autoSelect) {
          setFormData(prev => ({
            ...prev,
            outboundProvider: res.data!.autoSelect!.provider,
            outboundPhoneNumber: res.data!.autoSelect!.phoneNumber
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load phone numbers:', err);
    } finally {
      setLoadingPhones(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = getUserId();
      const token = getToken();
      
      // Don't make API calls if not authenticated
      if (!token) {
        router.push('/login');
        return;
      }
      
      const [campaignsRes, agentsRes] = await Promise.all([
        fetchCampaigns({ page, limit: itemsPerPage }).catch(err => {
          console.error('Failed to fetch campaigns:', err);
          // Check if it's a 401 error
          if (err?.response?.status === 401) {
            router.push('/login');
          }
          return { success: false, data: null, error: err?.response?.data?.error };
        }),
        fetchAgentsByUser(userId).catch(err => {
          console.error('Failed to fetch agents:', err);
          if (err?.response?.status === 401) {
            router.push('/login');
          }
          return { success: false, data: null };
        })
      ]);
      
      if (campaignsRes.success && campaignsRes.data) {
        setCampaigns(campaignsRes.data.campaigns || []);
        setTotalPages(campaignsRes.data.pages || 1);
        setTotalItems(campaignsRes.data.total || 0);
      } else if (!campaignsRes.success) {
        if (campaignsRes.error === 'Unauthorized') {
          router.push('/login');
          return;
        }
        setError('Failed to load campaigns. Please check if the server is running.');
      }
      if (agentsRes.success) {
        setAgents(agentsRes.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      if (err?.response?.status === 401) {
        router.push('/login');
        return;
      }
      setError('Failed to load campaigns. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load phone numbers separately (non-blocking)
  useEffect(() => {
    loadPhoneNumbers();
  }, [loadPhoneNumbers]);

  const handleCreateCampaign = async () => {
    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Campaign name is required');
      return;
    }
    if (!formData.agentId) {
      toast.error('Validation Error', 'Please select an agent');
      return;
    }
    if (formData.type === 'outbound') {
      if (!formData.scheduledDate || !formData.scheduledTime || !formData.endTime) {
        toast.error('Validation Error', 'Schedule date, start time, and end time are required for outbound campaigns');
        return;
      }
    }
    // Validate phone number selection for outbound/ondemand campaigns
    if ((formData.type === 'outbound' || formData.type === 'ondemand') && phoneNumbers.length > 0) {
      if (!formData.outboundPhoneNumber) {
        toast.error('Validation Error', 'Please select an outbound phone number');
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
          endTime: formData.endTime, // Required end time
          timezone: formData.timezone
        };
      }

      // Add outbound phone number if selected
      if (formData.outboundProvider && formData.outboundPhoneNumber) {
        createData.outboundProvider = formData.outboundProvider as 'twilio' | 'plivo' | 'telnyx';
        createData.outboundPhoneNumber = formData.outboundPhoneNumber;
      }

      const response = await createCampaign(createData);
      
      if (!response.success) {
        toast.error('Creation Failed', response.message || 'Failed to create campaign');
        return;
      }
      
      const newCampaign = response.data;

      // If file is selected, upload contacts
      if (selectedFile && newCampaign?._id) {
        setUploadingFile(true);
        const uploadRes = await uploadCampaignContacts(newCampaign._id, selectedFile);
        if (!uploadRes.success) {
          toast.warning('Campaign Created', 'Campaign created but failed to upload contacts');
        }
      }

      // Reset form and close modal
      setFormData({
        name: '',
        type: 'outbound',
        agentId: '',
        scheduledDate: '',
        scheduledTime: '',
        endTime: '',
        timezone: 'Asia/Kolkata',
        outboundProvider: '',
        outboundPhoneNumber: ''
      });
      setSelectedFile(null);
      setShowCreateModal(false);

      toast.success('Campaign Created', `"${formData.name}" has been created successfully.`);

      // Reload campaigns
      await loadData();
      // Reload phone numbers in case auto-select is needed for next campaign
      await loadPhoneNumbers();
    } catch (err: unknown) {
      console.error('Failed to create campaign:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      toast.error('Error', errorMessage);
    } finally {
      setCreating(false);
      setUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setError('Please upload a CSV or Excel file (.csv, .xlsx or .xls)');
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
    <div style={{ padding: '32px 40px', width: '100%', boxSizing: 'border-box' }}>
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

      {/* Create Campaign Wizard */}
      <CreateCampaignWizard
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError(null);
        }}
        onSubmit={handleCreateCampaign}
        formData={formData}
        setFormData={setFormData}
        agents={agents}
        phoneNumbers={phoneNumbers}
        configuredProviders={configuredProviders}
        loadingPhones={loadingPhones}
        creating={creating}
        uploadingFile={uploadingFile}
        selectedFile={selectedFile}
        onFileChange={handleFileChange}
        error={error}
        timezones={TIMEZONES}
      />
    </div>
  );
}
