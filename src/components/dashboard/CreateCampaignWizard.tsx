'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Bot, 
  Calendar, 
  Phone, 
  Upload, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Clock,
  Globe,
  Loader2,
  Zap,
  Target,
  PhoneCall,
  PhoneIncoming,
  MousePointer,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { TelephonyProvider, PhoneNumberOption } from '@/lib/settingsApi';

// Type alias for campaign types
type CampaignType = 'outbound' | 'inbound' | 'ondemand';

interface Agent {
  _id: string;
  name: string;
  [key: string]: unknown;
}

interface FormData {
  name: string;
  type: CampaignType;
  agentId: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  outboundProvider: TelephonyProvider | '';
  outboundPhoneNumber: string;
}

interface CreateCampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
  agents: Agent[];
  phoneNumbers: PhoneNumberOption[];
  configuredProviders: TelephonyProvider[];
  loadingPhones: boolean;
  creating: boolean;
  uploadingFile: boolean;
  selectedFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  timezones: string[];
}

const STEPS = [
  { id: 1, title: 'Basics', icon: Sparkles, description: 'Name your campaign' },
  { id: 2, title: 'Type', icon: Target, description: 'Choose campaign type' },
  { id: 3, title: 'Agent', icon: Bot, description: 'Select AI agent' },
  { id: 4, title: 'Settings', icon: Phone, description: 'Configure details' },
  { id: 5, title: 'Contacts', icon: Upload, description: 'Import contacts' },
];

const CAMPAIGN_TYPES = [
  {
    type: 'outbound' as CampaignType,
    title: 'Outbound',
    description: 'AI makes calls to your contacts at scheduled times',
    icon: PhoneCall,
    gradient: 'linear-gradient(135deg, #00C8FF 0%, #0066FF 100%)',
    features: ['Scheduled calling', 'Bulk campaigns', 'Auto-dial']
  },
  {
    type: 'inbound' as CampaignType,
    title: 'Inbound',
    description: 'AI handles incoming calls from customers',
    icon: PhoneIncoming,
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    features: ['24/7 availability', 'Call routing', 'Queue management']
  },
  {
    type: 'ondemand' as CampaignType,
    title: 'On-Demand',
    description: 'Trigger AI calls instantly via API or dashboard',
    icon: MousePointer,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    features: ['API triggered', 'Real-time calls', 'Instant connect']
  }
];

export default function CreateCampaignWizard({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  agents,
  phoneNumbers,
  configuredProviders,
  loadingPhones,
  creating,
  uploadingFile,
  selectedFile,
  onFileChange,
  error,
  timezones
}: CreateCampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [animationDirection, setAnimationDirection] = useState<'next' | 'prev'>('next');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const goToNextStep = () => {
    if (currentStep < STEPS.length) {
      setAnimationDirection('next');
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setAnimationDirection('prev');
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return true;
      case 3:
        return formData.agentId !== '';
      case 4:
        if (formData.type === 'outbound') {
          if (!formData.scheduledDate || !formData.scheduledTime) {
            return false;
          }
          if (phoneNumbers.length > 0 && !formData.outboundPhoneNumber) {
            return false;
          }
          return true;
        }
        if (formData.type === 'ondemand' && phoneNumbers.length > 0) {
          return formData.outboundPhoneNumber !== '';
        }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return { title: 'Name Your Campaign', subtitle: 'Give your AI campaign a memorable name' };
      case 2:
        return { title: 'Select Campaign Type', subtitle: 'Choose how your AI will engage with contacts' };
      case 3:
        return { title: 'Choose Your AI Agent', subtitle: 'Select the AI that will power this campaign' };
      case 4:
        return { title: 'Configure Settings', subtitle: formData.type === 'outbound' ? 'Set up scheduling and phone settings' : 'Configure phone settings' };
      case 5:
        return { title: 'Import Contacts', subtitle: 'Upload your contact list to get started' };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const { title, subtitle } = getStepTitle(currentStep);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .wizard-content {
          animation: ${animationDirection === 'next' ? 'slideInFromRight' : 'slideInFromLeft'} 0.4s ease-out;
        }
        .type-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .agent-card:hover {
          border-color: rgba(0, 200, 255, 0.5) !important;
          background: rgba(0, 200, 255, 0.1) !important;
        }
        .glow-border {
          position: relative;
        }
        .glow-border::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, #00C8FF, #7800FF, #00C8FF);
          border-radius: 18px;
          z-index: -1;
          opacity: 0.5;
          animation: shimmer 3s infinite linear;
          background-size: 200% 100%;
        }
      `}</style>

      {/* Main Container */}
      <div style={{
        background: 'linear-gradient(180deg, #0f0f1e 0%, #1a1a2e 100%)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 0 100px rgba(0, 200, 255, 0.1), 0 0 40px rgba(120, 0, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header with gradient accent */}
        <div style={{
          position: 'relative',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(180deg, rgba(0, 200, 255, 0.05) 0%, transparent 100%)'
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <X size={18} color="#9CA3AF" />
          </button>

          {/* Wizard header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={20} color="white" />
            </div>
            <div>
              <h2 style={{ 
                color: '#FFFFFF', 
                fontWeight: '700', 
                margin: 0,
                fontSize: '20px',
                letterSpacing: '-0.02em'
              }}>
                Create AI Campaign
              </h2>
              <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>
                Launch your intelligent voice campaign in minutes
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div style={{
          padding: '20px 32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: isCompleted ? 'pointer' : 'default',
                      opacity: isActive || isCompleted ? 1 : 0.4,
                      transition: 'all 0.3s'
                    }}
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: isCompleted 
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : isActive 
                          ? 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                      border: isActive || isCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isActive ? '0 0 20px rgba(0, 200, 255, 0.3)' : 'none'
                    }}>
                      {isCompleted ? (
                        <Check size={20} color="white" strokeWidth={3} />
                      ) : (
                        <StepIcon size={20} color={isActive ? 'white' : '#6B7280'} />
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: isActive ? '600' : '500',
                      color: isActive ? '#00C8FF' : isCompleted ? '#22c55e' : '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {step.title}
                    </span>
                  </div>
                  
                  {index < STEPS.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      background: isCompleted 
                        ? 'linear-gradient(90deg, #22c55e 0%, #22c55e 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                      margin: '0 8px',
                      marginBottom: '24px',
                      transition: 'background 0.3s'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px',
        }}>
          {/* Step Title */}
          <div key={currentStep} className="wizard-content" style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'white',
              margin: 0,
              marginBottom: '8px',
              letterSpacing: '-0.02em'
            }}>
              {title}
            </h3>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
              {subtitle}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '24px',
              color: '#EF4444',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#EF4444',
                flexShrink: 0
              }} />
              {error}
            </div>
          )}

          {/* Step 1: Campaign Name */}
          {currentStep === 1 && (
            <div key="step1" className="wizard-content">
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <label style={{ 
                  display: 'block', 
                  color: '#9CA3AF', 
                  fontSize: '13px', 
                  fontWeight: '500',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Q1 Customer Outreach"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 200, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '18px',
                    fontWeight: '500',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 200, 255, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(0, 200, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0, 200, 255, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <p style={{ 
                  color: '#6B7280', 
                  fontSize: '13px', 
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Sparkles size={14} />
                  Choose a descriptive name that helps you identify this campaign
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Campaign Type */}
          {currentStep === 2 && (
            <div key="step2" className="wizard-content">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                {CAMPAIGN_TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  const isSelected = formData.type === type.type;
                  
                  return (
                    <div
                      key={type.type}
                      className="type-card"
                      onClick={() => setFormData({ ...formData, type: type.type })}
                      style={{
                        background: isSelected 
                          ? 'rgba(0, 200, 255, 0.05)'
                          : 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: isSelected 
                          ? '2px solid rgba(0, 200, 255, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={14} color="white" strokeWidth={3} />
                        </div>
                      )}

                      {/* Icon */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: type.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        boxShadow: isSelected ? `0 8px 24px ${type.type === 'outbound' ? 'rgba(0, 200, 255, 0.3)' : type.type === 'inbound' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}` : 'none'
                      }}>
                        <TypeIcon size={28} color="white" />
                      </div>

                      {/* Title */}
                      <h4 style={{
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: 0,
                        marginBottom: '8px'
                      }}>
                        {type.title}
                      </h4>

                      {/* Description */}
                      <p style={{
                        color: '#9CA3AF',
                        fontSize: '13px',
                        margin: 0,
                        marginBottom: '16px',
                        lineHeight: '1.5'
                      }}>
                        {type.description}
                      </p>

                      {/* Features */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {type.features.map((feature, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#6B7280'
                          }}>
                            <div style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: isSelected ? '#00C8FF' : '#6B7280'
                            }} />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Agent Selection */}
          {currentStep === 3 && (
            <div key="step3" className="wizard-content">
              {agents.length === 0 ? (
                <div style={{
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '16px',
                  padding: '32px',
                  textAlign: 'center'
                }}>
                  <Bot size={48} color="#fbbf24" style={{ marginBottom: '16px' }} />
                  <h4 style={{ color: '#fbbf24', fontSize: '18px', margin: 0, marginBottom: '8px' }}>
                    No Agents Available
                  </h4>
                  <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>
                    Please create an AI agent first before setting up a campaign.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {agents.map((agent) => {
                    const isSelected = formData.agentId === agent._id;
                    
                    return (
                      <div
                        key={agent._id}
                        className="agent-card"
                        onClick={() => setFormData({ ...formData, agentId: agent._id })}
                        style={{
                          background: isSelected 
                            ? 'rgba(0, 200, 255, 0.1)'
                            : 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '14px',
                          padding: '20px',
                          border: isSelected 
                            ? '2px solid rgba(0, 200, 255, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px'
                        }}
                      >
                        {/* Agent Avatar */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: isSelected 
                            ? 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)'
                            : 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Bot size={24} color={isSelected ? 'white' : '#6B7280'} />
                        </div>

                        {/* Agent Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: '600',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {agent.name}
                          </h4>
                          <p style={{
                            color: '#6B7280',
                            fontSize: '12px',
                            margin: 0,
                            marginTop: '4px'
                          }}>
                            AI Voice Agent
                          </p>
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Check size={14} color="white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Settings (Schedule + Phone) */}
          {currentStep === 4 && (
            <div key="step4" className="wizard-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Schedule Section (Only for Outbound) */}
                {formData.type === 'outbound' && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #00C8FF 0%, #0066FF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Calendar size={18} color="white" />
                      </div>
                      <div>
                        <h4 style={{ color: 'white', fontSize: '15px', fontWeight: '600', margin: 0 }}>
                          Schedule Campaign
                        </h4>
                        <p style={{ color: '#6B7280', fontSize: '12px', margin: 0, marginTop: '2px' }}>
                          When should AI start calling?
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          color: '#9CA3AF', 
                          fontSize: '12px', 
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          <Calendar size={12} />
                          Date
                        </label>
                        <input
                          type="date"
                          value={formData.scheduledDate}
                          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          color: '#9CA3AF', 
                          fontSize: '12px', 
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          <Clock size={12} />
                          Time
                        </label>
                        <input
                          type="time"
                          value={formData.scheduledTime}
                          onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        color: '#9CA3AF', 
                        fontSize: '12px', 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        <Globe size={12} />
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz} style={{ background: '#1A1A2E' }}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Phone Number Section */}
                {(formData.type === 'outbound' || formData.type === 'ondemand') && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Phone size={18} color="white" />
                      </div>
                      <div>
                        <h4 style={{ color: 'white', fontSize: '15px', fontWeight: '600', margin: 0 }}>
                          Phone Settings
                        </h4>
                        <p style={{ color: '#6B7280', fontSize: '12px', margin: 0, marginTop: '2px' }}>
                          Select outbound phone number
                        </p>
                      </div>
                    </div>

                    {loadingPhones ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '20px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '12px',
                        color: '#9CA3AF'
                      }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        Loading phone numbers...
                      </div>
                    ) : phoneNumbers.length === 0 ? (
                      <div style={{
                        padding: '20px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '12px',
                        color: '#fbbf24',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <Phone size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>No phone numbers configured. Please add phone numbers in Settings → Telephony to make outbound calls.</span>
                      </div>
                    ) : phoneNumbers.length === 1 ? (
                      <div style={{
                        padding: '16px 20px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px',
                        color: '#22c55e',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <CheckCircle2 size={20} />
                        <div>
                          <div style={{ fontWeight: '600' }}>{phoneNumbers[0].phoneNumber}</div>
                          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px', textTransform: 'capitalize' }}>
                            {phoneNumbers[0].provider} • Auto-selected
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {configuredProviders.length > 1 && (
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ 
                              display: 'block',
                              color: '#6B7280', 
                              fontSize: '12px', 
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              Provider
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {configuredProviders.map((provider) => (
                                <button
                                  key={provider}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ 
                                      ...formData, 
                                      outboundProvider: provider,
                                      outboundPhoneNumber: '' 
                                    });
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: formData.outboundProvider === provider
                                      ? 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)'
                                      : 'rgba(0, 0, 0, 0.3)',
                                    border: formData.outboundProvider === provider
                                      ? 'none'
                                      : '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '10px',
                                    color: '#FFFFFF',
                                    fontSize: '13px',
                                    fontWeight: formData.outboundProvider === provider ? '600' : '400',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {provider}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <select
                          value={formData.outboundPhoneNumber}
                          onChange={(e) => {
                            const selectedPhone = phoneNumbers.find(p => p.phoneNumber === e.target.value);
                            setFormData({ 
                              ...formData, 
                              outboundPhoneNumber: e.target.value,
                              outboundProvider: selectedPhone?.provider || formData.outboundProvider
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="" style={{ background: '#1A1A2E' }}>Select a phone number</option>
                          {phoneNumbers
                            .filter(p => !formData.outboundProvider || p.provider === formData.outboundProvider)
                            .map((phone, idx) => (
                              <option 
                                key={`${phone.provider}-${phone.phoneNumber}-${idx}`} 
                                value={phone.phoneNumber} 
                                style={{ background: '#1A1A2E' }}
                              >
                                {phone.phoneNumber} ({phone.provider})
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Inbound info */}
                {formData.type === 'inbound' && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.05)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <PhoneIncoming size={22} color="white" />
                      </div>
                      <div>
                        <h4 style={{ color: '#22c55e', fontSize: '15px', fontWeight: '600', margin: 0, marginBottom: '8px' }}>
                          Inbound Campaign Ready
                        </h4>
                        <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                          Your AI agent will handle all incoming calls to your configured phone numbers. 
                          Make sure your telephony settings are configured in Settings → Telephony.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: File Upload */}
          {currentStep === 5 && (
            <div key="step5" className="wizard-content">
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  padding: '48px 32px',
                  border: '2px dashed rgba(0, 200, 255, 0.2)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.4)';
                  e.currentTarget.style.background = 'rgba(0, 200, 255, 0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 200, 255, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                }}
              >
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '20px',
                  background: selectedFile 
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : 'rgba(0, 200, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  transition: 'all 0.3s'
                }}>
                  {selectedFile ? (
                    <CheckCircle2 size={36} color="white" />
                  ) : (
                    <FileSpreadsheet size={36} color="#00C8FF" />
                  )}
                </div>
                
                <h4 style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: 0,
                  marginBottom: '8px'
                }}>
                  {selectedFile ? selectedFile.name : 'Upload Contact List'}
                </h4>
                <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
                  {selectedFile 
                    ? 'Click to replace file'
                    : 'Click or drag & drop your Excel file here'
                  }
                </p>
                <p style={{ color: '#4B5563', fontSize: '12px', margin: '12px 0 0' }}>
                  Supports .xlsx and .xls files with name and phone number columns
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                style={{ display: 'none' }}
              />

              <p style={{ 
                color: '#6B7280', 
                fontSize: '13px', 
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Sparkles size={16} color="#00C8FF" />
                This step is optional. You can always add contacts later from the campaign details page.
              </p>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Back button */}
          <button
            onClick={goToPrevStep}
            disabled={currentStep === 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: currentStep === 1 ? '#4B5563' : '#9CA3AF',
              fontSize: '14px',
              fontWeight: '500',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: currentStep === 1 ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (currentStep !== 1) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Step indicator */}
          <span style={{ color: '#6B7280', fontSize: '13px' }}>
            Step {currentStep} of {STEPS.length}
          </span>

          {/* Next/Submit button */}
          {currentStep < STEPS.length ? (
            <button
              onClick={goToNextStep}
              disabled={!canProceed()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: canProceed()
                  ? 'linear-gradient(135deg, #00C8FF 0%, #7800FF 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: canProceed() ? 1 : 0.5,
                boxShadow: canProceed() ? '0 4px 20px rgba(0, 200, 255, 0.3)' : 'none'
              }}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={creating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                background: creating
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: creating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: creating ? 'none' : '0 4px 20px rgba(34, 197, 94, 0.3)'
              }}
            >
              {creating ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {uploadingFile ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Launch Campaign
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
