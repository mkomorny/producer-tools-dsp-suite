import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Key, Trash2, Plus, Eye, EyeOff, Check, X, Volume2 } from 'lucide-react';
import * as Tone from 'tone';
import ThemeSelector from './ThemeSelector';
import { CostTrackerDashboard } from './CostTrackerDashboard';
import { PROVIDERS, getDefaultModelsForProvider } from '../lib/modelRegistry';

const THEMES = [
  { id: 'default', name: 'Default Dark', bg: '#0a0a0c', accent: '#6366f1' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: '#05000a', accent: '#ff007f' },
  { id: 'Arcade', name: 'Arcade', bg: '#050708', accent: '#db2777' },
  { id: 'wildfire', name: 'Wildfire Flame', bg: '#070301', accent: '#ea580c' },
  { id: 'synthwave', name: 'Synthwave Night', bg: '#04010a', accent: '#ff007f' },
  { id: 'electric-lime', name: 'Electric Lime', bg: '#020202', accent: '#a3e635' },
  { id: 'solar-storm', name: 'Solar Storm', bg: '#07050b', accent: '#f97316' },
  { id: 'magma', name: 'Magma Core', bg: '#050000', accent: '#ef4444' },
  { id: 'laser-tag', name: 'Laser Tag Arena', bg: '#050708', accent: '#db2777' },
  { id: 'acid', name: 'Acid', bg: '#020412', accent: '#eab308' },
  { id: 'jazz', name: 'Acid Jazz Gold', bg: '#020412', accent: '#eab308' },
  { id: 'crimson-void', name: 'Crimson Void', bg: '#030000', accent: '#ff0000' },
  { id: 'toxic-waste', name: 'Toxic Chemical', bg: '#010502', accent: '#ccff00' },
  { id: 'ocean-breeze', name: 'Ocean Breeze', bg: '#010c14', accent: '#3b82f6' },
  { id: 'forest-harmony', name: 'Forest Harmony', bg: '#020d09', accent: '#10b981' },
  { id: 'aurora-dream', name: 'Aurora Dream', bg: '#04020a', accent: '#a855f7' },
  { id: 'cozy-amber', name: 'Cozy Amber', bg: '#0a0501', accent: '#d97706' },
  { id: 'lavender-haze', name: 'Lavender Haze', bg: '#07050d', accent: '#c084fc' },
  { id: 'slate-minimal', name: 'Slate Minimal', bg: '#0b0f19', accent: '#475569' },
  { id: 'desert-dusk', name: 'Desert Dusk', bg: '#0d0603', accent: '#f97316' },
  { id: 'rose-gold', name: 'Rose Gold Metallic', bg: '#0d040a', accent: '#be185d' },
  { id: 'mint-chocolate', name: 'Mint Cocoa', bg: '#0c0806', accent: '#020d09' },
  { id: 'glacier-hush', name: 'Glacier Cushioned', bg: '#f0f7ff', accent: '#38bdf8' },
  { id: 'candy-noir', name: 'Candy Noir Fizz', bg: '#050308', accent: '#ec4899' },
  { id: 'tropical', name: 'Tropical Island', bg: '#020b0a', accent: '#f97316' },
  { id: 'aurora', name: 'Aurora Borealis', bg: '#040814', accent: '#a855f7' },
  { id: 'solarpunk', name: 'Solarpunk Green', bg: '#060802', accent: '#eab308' },
  { id: 'vapor', name: 'Vaporwave Sunset', bg: '#0a0314', accent: '#38bdf8' },
  { id: 'ocean', name: 'Deep Sea Abyss', bg: '#010510', accent: '#06b6d4' },
  { id: 'cyber-jade', name: 'Cyber Jade Slate', bg: '#020606', accent: '#10b981' },
  { id: 'blossom', name: 'Cherry Blossom', bg: '#fff5f8', accent: '#db2777' },
  { id: 'infrared', name: 'Thermal Vector', bg: '#070000', accent: '#ff2b00' },
  { id: 'psychedelic', name: 'Psychedelic Dream', bg: '#0a0110', accent: '#f43f5e' },
  { id: 'cyan-crimson', name: 'Cyan Crimson Edge', bg: '#040810', accent: '#00ffff' },
  { id: 'sundial', name: 'Golden Sundial', bg: '#fffbf5', accent: '#2563eb' },
  { id: 'ethereal', name: 'Ethereal Fog', bg: '#fafafc', accent: '#a855f7' },
  { id: 'midnight-abyss', name: 'Midnight Abyss', bg: '#020205', accent: '#7c3aed' },
  { id: 'coal-dust', name: 'Coal Dust Dark', bg: '#0d0d0d', accent: '#525252' },
  { id: 'punk', name: 'Punk', bg: '#05000a', accent: '#ff007f' },
  { id: 'wild', name: 'Wild', bg: '#070301', accent: '#ea580c' },
  { id: 'synth', name: 'Synth', bg: '#04010a', accent: '#ff007f' },
  { id: 'lime', name: 'Lime', bg: '#020202', accent: '#a3e635' },
  { id: 'pastel-dream', name: 'Pastel Dream', bg: '#0d0b14', accent: '#c084fc' },
  { id: 'sweet-peach', name: 'Sweet Peach', bg: '#120c0a', accent: '#fdba74' },
  { id: 'crimson-cerulean', name: 'Crimson & Cerulean', bg: '#050a12', accent: '#007acc' },
  { id: 'amber-blue', name: 'Amber Blue', bg: '#030815', accent: '#ff9800' },
  { id: 'amethyst-sun', name: 'Amethyst Sun', bg: '#0d021a', accent: '#c084fc' }
];

// Providers & model lists now come from the central registry (src/lib/modelRegistry.ts)

interface SavedKey {
  id: string;
  name: string;
  apiKey: string;
  provider: string;
  createdAt: number;
  selectedModel?: string;
}

interface HeaderProps {
  theme: string;
  setTheme: (theme: string) => void;
}

// getDefaultModelsForProvider is now imported from the central registry.

export function Header({ theme, setTheme }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global Volume State (Percentage, 100 = normal, 1000 = very loud)
  const [globalVolume, setGlobalVolume] = useState(() => {
    try {
      const stored = localStorage.getItem('producer_global_volume');
      return stored ? parseFloat(stored) : 250;
    } catch {
      return 250;
    }
  });

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setGlobalVolume(v);
    try {
      localStorage.setItem('producer_global_volume', String(v));
    } catch (err) {
      console.warn("Saving volume failed", err);
    }
    
    // In Tone.js, the destination volume is a Decibels value, so we convert from amplitude percentage to dB.
    // 100% = 1 amplitude = 0 dB
    // 200% = 2 amplitude = ~6 dB
    const amplitude = v / 100;
    // Guard against log of 0
    const db = amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
    
    try {
      Tone.getDestination().volume.rampTo(db, 0.1);
    } catch(err) {
      console.warn("Volume adjustment failed", err);
    }
  };

  // Sync volume with Tone.js on mount/change
  useEffect(() => {
    const amplitude = globalVolume / 100;
    const db = amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
    try {
      Tone.getDestination().volume.value = db;
    } catch (err) {
      console.warn("Volume initialization failed", err);
    }
  }, [globalVolume]);

  // States for API key management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>(() => {
    try {
      const stored = localStorage.getItem('producer_lyria_api_keys');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedKeyId, setSelectedKeyId] = useState<string>(() => {
    return localStorage.getItem('producer_lyria_selected_key_id') || '';
  });

  // Form States
  const [customName, setCustomName] = useState('');
  const [apiKeyVal, setApiKeyVal] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('google');
  const [showKeyVal, setShowKeyVal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [keyIdConfirmDelete, setKeyIdConfirmDelete] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'keys' | 'cost'>('keys');

  // Model selection states
  const [availableModels, setAvailableModels] = useState<{name: string, displayName: string, description?: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Update models list when provider changes. Default to 'auto' for smart task-based selection.
  useEffect(() => {
    const defaults = getDefaultModelsForProvider(selectedProvider);
    setAvailableModels(defaults);
    setSelectedModel('auto');
  }, [selectedProvider]);

  // Fetch models for entered API Key
  const fetchModelsForApiKey = async (key: string, provider: string) => {
    if (!key || key.trim().length < 10) return;
    setIsLoadingModels(true);
    try {
      const response = await fetch('/api/list-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientApiKey: key.trim(), clientProvider: provider })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch available models');
      }
      const data = await response.json();
      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        // Set selected model to first returned if current is not in the list
        if (!data.models.some((m: any) => m.name === selectedModel)) {
          setSelectedModel(data.models[0].name);
        }
      }
    } catch (err: any) {
      console.warn("Could not list models:", err.message);
      const defaults = getDefaultModelsForProvider(provider);
      setAvailableModels(defaults);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Dynamic fetch when API key is typed with debounce
  useEffect(() => {
    if (apiKeyVal.trim().length <= 20) {
      return;
    }
    const timer = setTimeout(() => {
      fetchModelsForApiKey(apiKeyVal, selectedProvider);
    }, 800);
    return () => clearTimeout(timer);
  }, [apiKeyVal, selectedProvider]);

  const handleUpdateKeyModel = (keyId: string, model: string) => {
    const updated = savedKeys.map(k => {
      if (k.id === keyId) {
        return { ...k, selectedModel: model };
      }
      return k;
    });
    setSavedKeys(updated);
    if (keyId === selectedKeyId) {
      localStorage.setItem('producer_lyria_selected_model_id', model);
      window.dispatchEvent(new Event('storage'));
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync API Keys list to local storage
  useEffect(() => {
    localStorage.setItem('producer_lyria_api_keys', JSON.stringify(savedKeys));
  }, [savedKeys]);

  // Sync selected API key ID and selected model to local storage
  useEffect(() => {
    localStorage.setItem('producer_lyria_selected_key_id', selectedKeyId);
    const activeKey = savedKeys.find(k => k.id === selectedKeyId);
    if (activeKey) {
      const modelToSet = activeKey.selectedModel || 'auto';
      localStorage.setItem('producer_lyria_selected_model_id', modelToSet);
      window.dispatchEvent(new Event('storage'));
    }
  }, [selectedKeyId, savedKeys]);

  // Maintain valid selected active API key fallback
  useEffect(() => {
    if (savedKeys.length > 0) {
      const exists = savedKeys.some(k => k.id === selectedKeyId);
      if (!exists) {
        setSelectedKeyId(savedKeys[0].id);
      }
    } else {
      setSelectedKeyId('');
    }
  }, [savedKeys, selectedKeyId]);

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customName.trim()) {
      setFormError('Please enter a custom name for your API key.');
      return;
    }
    if (!apiKeyVal.trim()) {
      setFormError('Please enter your API Key.');
      return;
    }

    const newKey: SavedKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: customName.trim(),
      apiKey: apiKeyVal.trim(),
      provider: selectedProvider,
      createdAt: Date.now(),
      selectedModel: selectedModel
    };

    const nextKeys = [...savedKeys, newKey];
    setSavedKeys(nextKeys);
    setSelectedKeyId(newKey.id);

    // Reset inputs
    setCustomName('');
    setApiKeyVal('');
    setSelectedProvider('google');
    setShowKeyVal(false);
    setFormError(null);
  };

  const handleDeleteKey = (idToDelete: string) => {
    if (keyIdConfirmDelete === idToDelete) {
      const nextKeys = savedKeys.filter(k => k.id !== idToDelete);
      setSavedKeys(nextKeys);
      if (selectedKeyId === idToDelete) {
        setSelectedKeyId(nextKeys.length > 0 ? nextKeys[0].id : '');
      }
      setKeyIdConfirmDelete(null);
    } else {
      setKeyIdConfirmDelete(idToDelete);
      // Auto-reset delete confirmation after 4 seconds
      setTimeout(() => {
        setKeyIdConfirmDelete(prev => prev === idToDelete ? null : prev);
      }, 4000);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  return (
    <>
      <header className="bg-bg2/95 border-b border-border fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-3 sm:px-6 backdrop-blur">
        {/* Title & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] rounded-lg flex items-center justify-center font-display text-base sm:text-xl font-black shadow-lg shadow-[var(--accent-glow)] flex-shrink-0">
            🎧
          </div>
          <div>
            <h1 
              className="font-display tracking-wide text-accent leading-none mb-0.5 sm:mb-1 text-xl xs:text-2xl sm:text-[32px]"
              style={{ fontWeight: 'normal' }}
            >
              PRODUCER TOOLS
            </h1>
            <p className="text-[10px] sm:text-[11px] font-mono tracking-normal text-text2 font-bold hidden xs:block">PREMIUM ENGINE</p>
          </div>
        </div>

        {/* Control Actions Panel */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Global Volume Slider */}
          <div className="hidden sm:flex items-center gap-2 bg-bg3/50 px-3 py-1.5 rounded-lg border border-border/50 h-[34px]" title={`Master Volume: ${globalVolume}%`}>
            <Volume2 size={14} className="text-text3" />
            <input 
              type="range" 
              min="0" 
              max="1000" 
              step="1"
              value={globalVolume} 
              onChange={handleVolumeChange}
              className="w-16 accent-[var(--accent)] h-1 bg-bg/50 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* API Keys Button with Active Key Nickname Status underneath */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            {/* Optional Button to manage API keys */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 bg-bg3 hover:opacity-85 border border-border px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all text-xs font-bold text-text active:scale-95 cursor-pointer shrink-0"
              title="Manage Lyria API Keys"
            >
              <Key size={12} className="text-accent shrink-0" />
              <span style={{ fontSize: '9px' }} className="tracking-wide uppercase font-mono text-text2 hidden xs:inline">API Keys (AI)</span>
            </button>
            {savedKeys.find(k => k.id === selectedKeyId) && (
              <span 
                style={{ fontSize: '8px' }} 
                className="font-mono font-black uppercase text-emerald-400 select-none tracking-wider flex items-center gap-1 mt-0.5 animate-pulse" 
                title="Active Key Nickname"
              >
                ● {savedKeys.find(k => k.id === selectedKeyId)?.name}
              </span>
            )}
          </div>

          {/* Compact Theme Icons Selector */}
          <ThemeSelector
            currentTheme={theme}
            onThemeChange={(t) => {
              setTheme(t);
            }}
          />
        </div>
      </header>

      {/* Lyria API Keys Setup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-bg2 border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 text-text custom-scroll"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2.5">
                <Key className="text-accent" size={20} />
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-normal uppercase text-accent tracking-wide leading-tight">
                    API SETUP & COST TRACKER
                  </h2>
                  <p 
                    style={{ fontFamily: 'system-ui' }}
                    className="text-[10px] sm:text-[11px] text-text3 font-mono"
                  >
                    SECURE SYSTEM CREDENTIALS & BILLING DASHBOARD
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text3 hover:text-text hover:bg-bg3 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Selectors */}
            <div className="flex flex-wrap border-b border-border/60 mb-5 gap-2" id="modal-tabs-bar">
              <button
                id="modal-tab-keys-trigger"
                onClick={() => setModalTab('keys')}
                style={{ fontFamily: 'system-ui', fontWeight: 'normal', fontSize: '12px' }}
                className={`pb-2 px-3 text-[10px] font-black uppercase font-mono tracking-widest border-b-2 cursor-pointer transition-all ${
                  modalTab === 'keys'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text3 hover:text-text'
                }`}
              >
                🔑 Credentials Setup
              </button>
              <button
                id="modal-tab-cost-trigger"
                onClick={() => setModalTab('cost')}
                style={{ fontFamily: 'system-ui', fontWeight: 'normal', fontSize: '12px' }}
                className={`pb-2 px-3 text-[10px] font-black uppercase font-mono tracking-widest border-b-2 cursor-pointer transition-all ${
                  modalTab === 'cost'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text3 hover:text-text'
                }`}
              >
                📊 Cost & Usage Metrics
              </button>
            </div>

            {modalTab === 'cost' ? (
              <CostTrackerDashboard />
            ) : (
              <>
                {/* List of Saved Keys */}
                <div className="mb-6">
                  <h3 
                    style={{ fontFamily: 'system-ui', fontWeight: 'normal', fontSize: '12px' }}
                    className="text-[10px] font-black uppercase tracking-wider text-text3 font-mono mb-2.5"
                  >
                    Saved API Keys ({savedKeys.length})
                  </h3>
                  {savedKeys.length === 0 ? (
                    <div className="p-4 bg-bg3/60 border border-border/80 border-dashed rounded-xl text-center text-xs text-text3 font-mono">
                      No saved keys found. Register a key below to begin.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1.5 custom-scroll">
                      {savedKeys.map((k) => {
                        const isActive = k.id === selectedKeyId;
                        const providerObj = PROVIDERS.find(p => p.id === k.provider);
                        const modelToUse = k.selectedModel || 'auto';
                        return (
                          <div 
                            key={k.id}
                            className={`flex flex-col p-3 rounded-xl border transition-all ${
                              isActive 
                                ? 'bg-accent/10 border-accent/40 shadow-sm' 
                                : 'bg-bg3/40 border-border/50 hover:border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs sm:text-sm text-text truncate">
                                    {k.name}
                                  </span>
                                  {isActive && (
                                    <span className="text-[9px] font-mono font-black uppercase text-accent bg-accent/20 px-1.5 py-0.5 rounded-full animate-pulse">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-text3 font-mono truncate">
                                  {providerObj?.name || k.provider}
                                </p>
                                <p className="text-[10px] text-accent2/85 font-mono select-none mt-0.5">
                                  {k.apiKey.substring(0, 4)}••••••••{k.apiKey.substring(k.apiKey.length - 4)}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {!isActive && (
                                  <button
                                    onClick={() => setSelectedKeyId(k.id)}
                                    className="text-[10px] font-bold uppercase font-mono px-2 py-1 rounded bg-bg3 hover:bg-neutral-800 transition-colors text-text2 cursor-pointer active:scale-95"
                                  >
                                    Select
                                  </button>
                                )}
                                {isActive && (
                                  <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                                    <Check size={11} strokeWidth={3} />
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeleteKey(k.id)}
                                  className={`p-1.5 rounded-md transition-all duration-250 cursor-pointer flex items-center gap-1.5 ${
                                    keyIdConfirmDelete === k.id
                                      ? 'text-red-400 bg-red-500/10 border border-red-500/30 px-2'
                                      : 'text-text3 hover:text-danger hover:bg-danger/15'
                                  }`}
                                  title={keyIdConfirmDelete === k.id ? "Click again to confirm deletion" : "Delete Key Profile"}
                                >
                                  {keyIdConfirmDelete === k.id && (
                                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase animate-pulse">Confirm?</span>
                                  )}
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Active Model Customizer Dropdown for each saved key */}
                            <div 
                              style={{ fontFamily: 'system-ui' }}
                              className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-4"
                            >
                              <span 
                                style={{ fontFamily: 'system-ui', fontSize: '10px' }}
                                className="text-[9px] font-mono uppercase text-text3 tracking-wider shrink-0 flex items-center gap-1"
                              >
                                🤖 Selected Model:
                              </span>
                              <div className="relative flex-1 max-w-[240px]">
                                <select
                                  value={modelToUse}
                                  onChange={(e) => handleUpdateKeyModel(k.id, e.target.value)}
                                  style={{ fontFamily: 'system-ui', fontSize: '11px' }}
                                  className="w-full bg-bg3 border border-border/80 rounded-lg pl-2 pr-7 py-0.5 text-[10px] font-mono text-text hover:border-accent focus:outline-none transition-colors appearance-none cursor-pointer"
                                >
                                  <option value="auto">Auto (Task Based)</option>
                                  {modelToUse !== 'auto' && (
                                    <option value={modelToUse} disabled>{modelToUse.split('/').pop() || modelToUse}</option>
                                  )}
                                  {getDefaultModelsForProvider(k.provider)
                                    .filter(item => item.name !== modelToUse && item.name !== 'auto')
                                    .map(item => (
                                      <option key={item.name} value={item.name}>
                                        {item.displayName}
                                      </option>
                                    ))
                                  }
                                </select>
                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSaveKey} className="border-t border-border/85 pt-5 font-sans">
                  <h3 
                    style={{ fontFamily: 'system-ui', fontWeight: 'normal', fontSize: '12px' }}
                    className="text-[10px] font-black uppercase tracking-wider text-text3 font-mono mb-2"
                  >
                    Register New Key profile
                  </h3>

                  {formError && (
                    <div className="mb-3 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-[11px] text-red-400 font-medium">
                      ⚠️ {formError}
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {/* Provider Selection */}
                    <div>
                      <label 
                        htmlFor="provider-select" 
                        style={{ fontFamily: 'system-ui' }}
                        className="block text-[10px] font-mono tracking-wider uppercase text-text3 mb-1"
                      >
                        API Provider
                      </label>
                      <div className="relative">
                        <select
                          id="provider-select"
                          value={selectedProvider}
                          onChange={(e) => setSelectedProvider(e.target.value)}
                          className="w-full bg-bg3 border border-border rounded-xl px-3 py-2 text-xs font-sans text-text focus:outline-none focus:border-accent transition-colors appearance-none"
                        >
                          {PROVIDERS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
                      </div>
                    </div>

                    {/* Custom Name */}
                    <div>
                      <label 
                        htmlFor="custom-name-input" 
                        style={{ fontFamily: 'system-ui' }}
                        className="block text-[10px] font-mono tracking-wider uppercase text-text3 mb-1"
                      >
                        Custom Name
                      </label>
                      <input
                        id="custom-name-input"
                        type="text"
                        required
                        placeholder="e.g. My Studio Key, Secondary Key"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full bg-bg3 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent transition-colors placeholder:text-text3/60 font-sans"
                      />
                    </div>

                    {/* API Key Input */}
                    <div>
                      <label 
                        htmlFor="api-key-input" 
                        style={{ fontFamily: 'system-ui' }}
                        className="block text-[10px] font-mono tracking-wider uppercase text-text3 mb-1"
                      >
                        API Key Value
                      </label>
                      <div className="relative">
                        <input
                          id="api-key-input"
                          type={showKeyVal ? 'text' : 'password'}
                          required
                          placeholder="Insert secret API key here"
                          value={apiKeyVal}
                          onChange={(e) => setApiKeyVal(e.target.value)}
                          style={{ fontFamily: 'system-ui' }}
                          className="w-full bg-bg3 border border-border rounded-xl pl-3 pr-10 py-2 text-xs font-mono focus:outline-none focus:border-accent transition-colors placeholder:text-text3/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeyVal(!showKeyVal)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text p-1 transition-colors cursor-pointer"
                          title={showKeyVal ? 'Hide Key' : 'Reveal Key'}
                        >
                          {showKeyVal ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Model Chooser */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label 
                          htmlFor="model-select-input" 
                          style={{ fontFamily: 'system-ui' }}
                          className="block text-[10px] font-mono tracking-wider uppercase text-text3"
                        >
                          Select Active Model
                        </label>
                        {isLoadingModels && (
                          <span className="text-[9px] font-mono text-accent animate-pulse">
                            Fetching available models...
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          id="model-select-input"
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full bg-bg3 border border-border rounded-xl px-3 py-2 text-xs font-sans text-text focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                        >
                          <option value="auto">Auto (best model for each task)</option>
                          {availableModels.map((m) => (
                            <option key={m.name} value={m.name} title={m.description}>
                              {m.displayName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] hover:opacity-90 active:scale-[0.98] text-[var(--bg)] text-[11px] font-bold uppercase tracking-wide py-2.5 rounded-xl transition-all shadow-md shadow-[var(--accent-glow)] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Save Key
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
