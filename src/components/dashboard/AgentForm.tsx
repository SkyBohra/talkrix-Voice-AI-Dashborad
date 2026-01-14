import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createAgent, updateAgent, fetchVoices } from '../../lib/agentApi';
import { fetchUserTools, Tool } from '../../lib/toolApi';
import { Button } from '../ui/button';
import { Phone, PhoneCall, Voicemail, Search, Music, PhoneOff, Wrench, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

interface Voice {
  voiceId: string;
  name: string;
  description: string;
  primaryLanguage: string | null;
  previewUrl: string;
  provider: string;
}

// Built-in tools (same as ToolsSection)
const BUILT_IN_TOOLS: Tool[] = [
  {
    talkrixToolId: "builtin-warm-transfer",
    name: "warmTransfer",
    ownership: "public",
    definition: {
      modelToolName: "warmTransfer",
      description: "Transfer the call with a warm handoff.",
    },
  },
  {
    talkrixToolId: "builtin-cold-transfer",
    name: "coldTransfer",
    ownership: "public",
    definition: {
      modelToolName: "coldTransfer",
      description: "Transfer the call immediately (cold transfer).",
    },
  },
  {
    talkrixToolId: "builtin-leave-voicemail",
    name: "leaveVoicemail",
    ownership: "public",
    definition: {
      modelToolName: "leaveVoicemail",
      description: "Allow the caller to leave a voicemail message.",
    },
  },
  {
    talkrixToolId: "builtin-query-corpus",
    name: "queryCorpus",
    ownership: "public",
    definition: {
      modelToolName: "queryCorpus",
      description: "Search through a knowledge base or document corpus.",
    },
  },
  {
    talkrixToolId: "builtin-play-dtmf",
    name: "playDtmfSounds",
    ownership: "public",
    definition: {
      modelToolName: "playDtmfSounds",
      description: "Play DTMF (touch-tone) sounds during the call.",
    },
  },
  {
    talkrixToolId: "builtin-hang-up",
    name: "hangUp",
    ownership: "public",
    definition: {
      modelToolName: "hangUp",
      description: "End the current call.",
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

interface AgentFormProps {
  userId: string;
  agent?: any;
  onSuccess: () => void;
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

export const AgentForm: React.FC<AgentFormProps> = ({ userId, agent, onSuccess }) => {
  const [name, setName] = useState(agent?.name || '');
  const [loading, setLoading] = useState(false);
  
  // Voice selector state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  
  // Tools selector state
  const [customTools, setCustomTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [toolsTab, setToolsTab] = useState<'builtin' | 'custom'>('builtin');
  
  // Debounced search term for API calls
  const debouncedSearch = useDebounce(voiceSearch, 300);

  // Fetch custom tools
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

  // Load custom tools on mount
  useEffect(() => {
    loadCustomTools();
  }, [loadCustomTools]);

  // Parse existing agent's selectedTools for edit mode
  useEffect(() => {
    const agentSelectedTools = agent?.callTemplate?.selectedTools || agent?.selectedTools;
    if (agentSelectedTools && agentSelectedTools.length > 0) {
      // Map agent's selectedTools to our Tool format
      const existingTools: Tool[] = agentSelectedTools.map((st: any) => {
        // Check if it's a built-in tool
        const builtIn = BUILT_IN_TOOLS.find(t => t.definition.modelToolName === st.toolName);
        if (builtIn) return builtIn;
        
        // Otherwise it's a custom tool - find it or create placeholder
        const custom = customTools.find(t => t.talkrixToolId === st.toolId);
        if (custom) return custom;
        
        // Placeholder for unknown tool
        return {
          talkrixToolId: st.toolId,
          name: st.toolName || st.toolId,
          ownership: 'private',
          definition: { modelToolName: st.toolName || '' },
        } as Tool;
      });
      setSelectedTools(existingTools);
    }
  }, [agent?.callTemplate?.selectedTools, agent?.selectedTools, customTools]);

  // Fetch voices when search changes (server-side search)

  // Fetch voices when search changes (server-side search)
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

  // Load initial voices and handle pre-selection for edit mode
  useEffect(() => {
    const initVoices = async () => {
      await loadVoices();
      // If editing agent with existing voice, search for it
      const agentVoice = agent?.callTemplate?.voice || agent?.voice;
      if (agentVoice) {
        const res = await fetchVoices(agentVoice);
        if (res.success && res.data?.results) {
          const existingVoice = res.data.results.find(
            (v: Voice) => v.voiceId === agentVoice || v.name === agentVoice
          );
          if (existingVoice) {
            setSelectedVoice(existingVoice);
            setVoiceSearch(existingVoice.name);
          }
        }
      }
    };
    initVoices();
  }, [agent?.callTemplate?.voice, agent?.voice, loadVoices]);

  // Server-side search when debounced search changes
  useEffect(() => {
    // Only search if dropdown is open and we have a search term
    if (isVoiceDropdownOpen) {
      loadVoices(debouncedSearch || undefined);
    }
  }, [debouncedSearch, isVoiceDropdownOpen, loadVoices]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
    setVoiceSearch(voice.name);
    setIsVoiceDropdownOpen(false);
  };

  // Tool selection handlers
  const isToolSelected = (tool: Tool) => {
    return selectedTools.some(t => 
      (t.talkrixToolId && t.talkrixToolId === tool.talkrixToolId) ||
      (t._id && t._id === tool._id)
    );
  };

  const toggleToolSelection = (tool: Tool) => {
    if (isToolSelected(tool)) {
      setSelectedTools(prev => prev.filter(t => 
        !((t.talkrixToolId && t.talkrixToolId === tool.talkrixToolId) ||
          (t._id && t._id === tool._id))
      ));
    } else {
      setSelectedTools(prev => [...prev, tool]);
    }
  };

  const removeSelectedTool = (tool: Tool) => {
    setSelectedTools(prev => prev.filter(t => 
      !((t.talkrixToolId && t.talkrixToolId === tool.talkrixToolId) ||
        (t._id && t._id === tool._id))
    ));
  };

  // Format selectedTools for API (Ultravox format)
  const formatSelectedToolsForApi = () => {
    return selectedTools.map(tool => {
      // For built-in tools, use toolName
      if (tool.ownership === 'public') {
        return {
          toolName: tool.definition.modelToolName,
        };
      }
      // For custom tools, use toolId
      return {
        toolId: tool.talkrixToolId,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const agentData: any = {
      name,
      callTemplate: {},
    };

    // Add voice to callTemplate if selected
    if (selectedVoice?.voiceId || selectedVoice?.name) {
      agentData.callTemplate.voice = selectedVoice.voiceId || selectedVoice.name;
    }

    // Add selectedTools to callTemplate if any are selected
    if (selectedTools.length > 0) {
      agentData.callTemplate.selectedTools = formatSelectedToolsForApi();
    }

    // Remove empty callTemplate
    if (Object.keys(agentData.callTemplate).length === 0) {
      delete agentData.callTemplate;
    }
    
    if (agent) {
      await updateAgent(agent._id, agentData);
    } else {
      await createAgent(userId, agentData);
    }
    setLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter agent name"
          required
          className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Voice Selector */}
      <div ref={dropdownRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
        <div className="relative">
          <input
            type="text"
            value={voiceSearch}
            onChange={e => {
              setVoiceSearch(e.target.value);
              setIsVoiceDropdownOpen(true);
              if (!e.target.value) setSelectedVoice(null);
            }}
            onFocus={() => {
              setIsVoiceDropdownOpen(true);
              if (!voices.length) loadVoices();
            }}
            placeholder="Search and select a voice"
            className="w-full border p-2 rounded pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {voicesLoading ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isVoiceDropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isVoiceDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {voicesLoading ? (
              <div className="p-3 text-gray-500 text-center">Searching voices...</div>
            ) : voices.length === 0 ? (
              <div className="p-3 text-gray-500 text-center">No voices found</div>
            ) : (
              voices.map(voice => (
                <button
                  key={voice.voiceId}
                  type="button"
                  onClick={() => handleVoiceSelect(voice)}
                  className={`w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0 flex items-center justify-between ${
                    selectedVoice?.voiceId === voice.voiceId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{voice.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {voice.description || 'No description'}
                      {voice.primaryLanguage && (
                        <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                          {voice.primaryLanguage}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{voice.provider}</div>
                  </div>
                  {voice.previewUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const audio = new Audio(voice.previewUrl);
                        audio.play();
                      }}
                      className="ml-2 p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded"
                      title="Preview voice"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected voice preview */}
        {selectedVoice && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm flex items-center justify-between">
            <div>
              <span className="font-medium">{selectedVoice.name}</span>
              <span className="text-gray-500 ml-2">({selectedVoice.provider})</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedVoice(null);
                setVoiceSearch('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Tools Selector */}
      <div ref={toolsDropdownRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tools <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        
        {/* Selected tools display */}
        {selectedTools.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTools.map(tool => (
              <div
                key={tool.talkrixToolId || tool._id}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                  tool.ownership === 'public' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {tool.ownership === 'public' && builtInToolIcons[tool.name] && (
                  <span className="opacity-70">{builtInToolIcons[tool.name]}</span>
                )}
                {tool.ownership !== 'public' && <Wrench size={14} className="opacity-70" />}
                <span>{tool.name}</span>
                <button
                  type="button"
                  onClick={() => removeSelectedTool(tool)}
                  className="ml-1 hover:opacity-70"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown trigger */}
        <button
          type="button"
          onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
          className="w-full border p-2 rounded flex items-center justify-between text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <span className="text-gray-500">
            {selectedTools.length === 0 
              ? 'Select tools for this agent...' 
              : `${selectedTools.length} tool${selectedTools.length > 1 ? 's' : ''} selected`}
          </span>
          {isToolsDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {/* Tools Dropdown */}
        {isToolsDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setToolsTab('builtin')}
                className={`flex-1 py-2 px-4 text-sm font-medium ${
                  toolsTab === 'builtin'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Built-in Tools
              </button>
              <button
                type="button"
                onClick={() => setToolsTab('custom')}
                className={`flex-1 py-2 px-4 text-sm font-medium ${
                  toolsTab === 'custom'
                    ? 'border-b-2 border-purple-500 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Custom Tools
              </button>
            </div>

            {/* Tools list */}
            <div className="max-h-60 overflow-y-auto">
              {toolsTab === 'builtin' ? (
                BUILT_IN_TOOLS.map(tool => (
                  <button
                    key={tool.talkrixToolId}
                    type="button"
                    onClick={() => toggleToolSelection(tool)}
                    className={`w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-3 ${
                      isToolSelected(tool) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isToolSelected(tool) ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {isToolSelected(tool) ? <Check size={16} /> : builtInToolIcons[tool.name] || <Wrench size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{tool.name}</div>
                      <div className="text-sm text-gray-500 truncate">{tool.definition.description}</div>
                    </div>
                    {isToolSelected(tool) && (
                      <Check size={16} className="text-blue-500" />
                    )}
                  </button>
                ))
              ) : (
                toolsLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading custom tools...</div>
                ) : customTools.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No custom tools created yet.
                    <br />
                    <span className="text-sm">Go to Tools section to create one.</span>
                  </div>
                ) : (
                  customTools.map(tool => (
                    <button
                      key={tool._id || tool.talkrixToolId}
                      type="button"
                      onClick={() => toggleToolSelection(tool)}
                      className={`w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-3 ${
                        isToolSelected(tool) ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isToolSelected(tool) ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {isToolSelected(tool) ? <Check size={16} /> : <Wrench size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{tool.name}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {tool.definition.description || 'No description'}
                        </div>
                      </div>
                      {isToolSelected(tool) && (
                        <Check size={16} className="text-purple-500" />
                      )}
                    </button>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
      </Button>
    </form>
  );
};
