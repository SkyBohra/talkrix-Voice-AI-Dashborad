import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createAgent, updateAgent, fetchVoices } from '../../lib/agentApi';
import { Button } from '../ui/button';

interface Voice {
  voiceId: string;
  name: string;
  description: string;
  primaryLanguage: string | null;
  previewUrl: string;
  provider: string;
}

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
  
  // Debounced search term for API calls
  const debouncedSearch = useDebounce(voiceSearch, 300);

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
      if (agent?.voice) {
        const res = await fetchVoices(agent.voice);
        if (res.success && res.data?.results) {
          const existingVoice = res.data.results.find(
            (v: Voice) => v.voiceId === agent.voice || v.name === agent.voice
          );
          if (existingVoice) {
            setSelectedVoice(existingVoice);
            setVoiceSearch(existingVoice.name);
          }
        }
      }
    };
    initVoices();
  }, [agent?.voice, loadVoices]);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
    setVoiceSearch(voice.name);
    setIsVoiceDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const agentData = {
      name,
      voice: selectedVoice?.voiceId || selectedVoice?.name,
    };
    
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

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
      </Button>
    </form>
  );
};
