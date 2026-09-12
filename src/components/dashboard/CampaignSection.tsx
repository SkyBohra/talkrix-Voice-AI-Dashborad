'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Phone, ChevronRight, Loader2, Calendar, Clock, Activity, Ban, Wallet } from 'lucide-react';
import { usePermissions } from '@/lib/useMe';
import {
  Campaign,
  CreateCampaignData,
  OrgCallState,
  RetryOutcome,
  fetchCampaigns,
  fetchOrgCallState,
  createCampaign,
  uploadCampaignContacts
} from '@/lib/campaignApi';
import { campaignStatusColor, campaignStatusLabel, DEFAULT_RETRY } from '@/lib/campaignStatus';
import { BillingSummary, fetchBilling } from '@/lib/billingApi';
import { formatInr } from '@/lib/money';
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
  const { can } = usePermissions();

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

  // Lines in use across the organization
  const [callState, setCallState] = useState<OrgCallState | null>(null);
  // Credits, for the people allowed to see them
  const [billing, setBilling] = useState<BillingSummary | null>(null);

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
    apiTriggerEnabled: boolean;
    retryEnabled: boolean;
    retryMaxAttempts: number;
    retryAfterMinutes: number;
    retryOn: RetryOutcome[];
  }>({
    name: '',
    type: 'outbound',
    agentId: '',
    scheduledDate: '',
    scheduledTime: '',
    endTime: '',
    timezone: 'Asia/Kolkata',
    outboundProvider: '',
    outboundPhoneNumber: '',
    apiTriggerEnabled: false,
    retryEnabled: true,
    retryMaxAttempts: DEFAULT_RETRY.maxAttempts,
    retryAfterMinutes: DEFAULT_RETRY.retryAfterMinutes,
    retryOn: DEFAULT_RETRY.retryOn
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

  // Lines in use: refreshed while anything is dialing
  const loadCallState = useCallback(async () => {
    const res = await fetchOrgCallState();
    if (res.success && res.data) setCallState(res.data);
  }, []);

  useEffect(() => {
    void loadCallState();
  }, [loadCallState]);

  const canReadBilling = can('billing.read');
  useEffect(() => {
    if (!canReadBilling) return;
    void fetchBilling().then((res) => {
      if (res.success && res.data?.charging) setBilling(res.data);
    });
  }, [canReadBilling]);

  const dialing = !!callState && (callState.activeCalls > 0 || callState.activeCampaigns.length > 0);
  useEffect(() => {
    if (!dialing) return;
    const timer = setInterval(loadCallState, 5000);
    return () => clearInterval(timer);
  }, [dialing, loadCallState]);

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
        apiTriggerEnabled: formData.apiTriggerEnabled,
      };

      if (formData.type === 'outbound') {
        createData.schedule = {
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          endTime: formData.endTime, // Required end time
          timezone: formData.timezone
        };
        createData.retry = formData.retryEnabled && formData.retryOn.length > 0
          ? { maxAttempts: formData.retryMaxAttempts, retryAfterMinutes: formData.retryAfterMinutes, retryOn: formData.retryOn }
          : { maxAttempts: 1, retryAfterMinutes: DEFAULT_RETRY.retryAfterMinutes, retryOn: [] };
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

      // If file is selected, upload contacts (an outbound campaign is scheduled once it has them)
      let uploadProblem: string | null = null;
      if (selectedFile && newCampaign?._id) {
        setUploadingFile(true);
        const uploadRes = await uploadCampaignContacts(newCampaign._id, selectedFile);
        if (!uploadRes.success) {
          uploadProblem = uploadRes.message || 'The contacts file could not be imported';
        } else if (uploadRes.data?.invalidCount) {
          toast.warning(
            'Some contacts skipped',
            `${uploadRes.data.invalidCount} numbers couldn't be read. Include the country code.`
          );
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
        outboundPhoneNumber: '',
        apiTriggerEnabled: false,
        retryEnabled: true,
        retryMaxAttempts: DEFAULT_RETRY.maxAttempts,
        retryAfterMinutes: DEFAULT_RETRY.retryAfterMinutes,
        retryOn: DEFAULT_RETRY.retryOn
      });
      setSelectedFile(null);
      setShowCreateModal(false);

      if (uploadProblem && formData.type === 'outbound') {
        toast.warning('Campaign saved as a draft', `${uploadProblem}. Upload contacts from the campaign page to schedule it.`);
      } else if (uploadProblem) {
        toast.warning('Campaign created without contacts', `${uploadProblem}. Upload them from the campaign page.`);
      } else {
        toast.success('Campaign Created', `"${formData.name}" has been created successfully.`);
      }

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
    <div style={{ padding: 'clamp(16px, 4vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .campaign-header {
            flex-direction: column !important;
            gap: 16px !important;
            align-items: flex-start !important;
          }
          .campaign-header-actions {
            width: 100%;
          }
          .campaign-header-actions > * {
            flex: 1 1 auto;
            justify-content: center;
          }
          .campaign-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .campaign-card {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .campaign-card-actions {
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .campaign-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="campaign-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(20px, 4vw, 24px)',
            fontWeight: 'bold',
            color: '#FFFFFF',
            margin: 0
          }}>
            Campaigns
          </h1>
          <p style={{ color: '#9CA3AF', marginTop: '4px', fontSize: '13px' }}>
            Manage your voice campaigns
          </p>
        </div>
        <div className="campaign-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {callState && (
            <div
              title="Every call in your organization (campaigns, test calls, API calls) uses one of these lines"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#9CA3AF',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}
            >
              <Activity size={15} color={callState.activeCalls > 0 ? '#10B981' : '#6B7280'} />
              Lines in use
              <strong style={{ color: '#FFFFFF' }}>{callState.activeCalls} / {callState.maxConcurrentCalls}</strong>
            </div>
          )}
          {billing && (
            <button
              onClick={() => router.push('/dashboard/billing')}
              title={
                billing.availablePaise <= 0
                  ? 'Your credits have run out: calls are refused until they are topped up'
                  : 'Credits available for calls'
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '8px',
                border: `1px solid ${billing.low ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                background: billing.low ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                color: billing.availablePaise <= 0 ? '#FF3C64' : billing.low ? '#fbbf24' : '#9CA3AF',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Wallet size={15} />
              Credits
              <strong style={{ color: billing.availablePaise <= 0 ? '#FF3C64' : '#FFFFFF' }}>
                {formatInr(billing.availablePaise)}
              </strong>
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard/campaign/do-not-call')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 14px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#D1D5DB',
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Ban size={15} />
            Do-not-call list
          </button>
          {can('campaigns.write') && (
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
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="campaign-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Campaigns', value: totalItems, icon: Users },
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, icon: Phone },
          { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, icon: Calendar },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, icon: Clock }
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: 'clamp(12px, 2vw, 20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.2) 0%, rgba(120, 0, 255, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <stat.icon size={18} color="#00C8FF" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#9CA3AF', fontSize: '12px', margin: 0 }}>{stat.label}</p>
                <p style={{ color: '#FFFFFF', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 'bold', margin: 0 }}>{stat.value}</p>
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
                  background: `${campaignStatusColor(campaign.status)}20`,
                  color: campaignStatusColor(campaign.status),
                  whiteSpace: 'nowrap'
                }}>
                  {campaignStatusLabel(campaign.status)}
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
