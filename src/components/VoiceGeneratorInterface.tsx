import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Mic, Square, Play, Pause, Repeat, Download, Upload, Settings2, Edit2, Check, Trash2, X, Sparkles, SlidersHorizontal, ArrowLeftToLine, ArrowRightToLine, ChevronDown, ChevronUp, Undo, Music, Activity, Plus, Wand2 } from 'lucide-react';
import * as Tone from 'tone';
import { logTransaction } from '../lib/costTracker';
import { resolveModelForRequest, AITask } from '../lib/modelRegistry';

import { Effect, DEFAULT_EFFECTS, EFFECT_CONFIG, detectAudioKey } from '../lib/effects';

const PRELOADED_SAMPLES = [
  { label: 'Sample 1', url: '/Sample 1.wav' },
  { label: 'Sample 2', url: '/Sample 2.wav' },
  { label: 'Sample 3', url: '/Sample 3.wav' },
  { label: 'Sample 4', url: '/Sample 4.wav' },
  { label: 'Sample 5', url: '/Sample 5.wav' },
  { label: 'Sample 6', url: '/Sample 6.mp3' },
  { label: 'Sample 7', url: '/Sample 7.wav' },
  { label: 'Sample 8', url: '/Sample 8.mp3' },
  { label: 'Sample 9', url: '/Sample 9.mp3' },
];

const VOICE_PROFILES = [
  { id: 'neutral', name: 'Neutral / Raw', icon: '👤', description: 'Clean processing basis', setup: [] },
  { id: 'donald_trump', name: 'Donald Trump', icon: '👱‍♂️', description: 'Raspy, dynamic high-mid presence', setup: ['vocal_presence', 'compressor'] },
  { id: 'barak_obama', name: 'Barak Obama', icon: '🎙️', description: 'Gravelly, resonant baritone orator', setup: ['bass_boost', 'vocal_presence', 'compressor'] },
  { id: 'morgan_freeman', name: 'Morgan Freeman', icon: '🌌', description: 'Deep, warm god-like cinematic echo', setup: ['sub_bass', 'bass_boost', 'vocal_presence', 'reverb'] },
  { id: 'island_boy', name: 'Franky Venegas (Island Boy)', icon: '🌴', description: 'Hyper-tuned slapback flex voice', setup: ['autotune_hard', 'slapback', 'treble_boost'] },
  { id: 'arnold_schwarzenegger', name: 'Arnold Schwarzenegger', icon: '🦾', description: 'Heavy, saturated action hero rumble', setup: ['pitch', 'bass_boost', 'saturation', 'compressor'] },
  { id: 'samuel_jackson', name: 'Samuel L. Jackson', icon: '🗣️', description: 'Highly compressed fast loud speaker', setup: ['vocal_presence', 'maximizer', 'overdrive'] },
  { id: 'michael_jackson', name: 'Michael Jackson', icon: '🎩', description: 'Sizzling presence with signature plates', setup: ['autotune_hard', 'treble_boost', 'plate', 'chorus'] },
  { id: 'tupac_shakur', name: 'Tupac Shakur', icon: '🎤', description: 'Warm 90s tape deck vocal presence', setup: ['tape', 'vocal_presence', 'compressor', 'limiter'] },
  { id: 'mr_rogers', name: 'Mr. Rogers', icon: '🧥', description: 'Quiet neighbor vibe with high frequency roll-off', setup: ['eq_lowpass', 'compressor'] },
  { id: 'bill_cosby', name: 'Bill Cosby', icon: '👴', description: 'Quirky bouncy delivery & mid-range shift', setup: ['slapback', 'vocal_presence'] },
  { id: 'santa', name: 'Santa', icon: '🎅', description: 'Deep room booming jolly laughter', setup: ['bass_boost', 'reverb', 'hall'] },
  { id: 'dr_phil', name: 'Dr. Phil', icon: '👨‍🦲', description: 'Dry advice speaker compression profile', setup: ['compressor', 'telephone'] },
  { id: 'james_earl_jones', name: 'James Earl Jones', icon: '🦁', description: 'Ultimate deep theatrical voice of power', setup: ['octave_down', 'sub_bass', 'bass_boost'] },
  { id: 'jeff_goldblum', name: 'Jeff Goldblum', icon: '🦖', description: 'Quirky hesitation speech stutter presence', setup: ['stutter', 'slapback', 'vocal_presence'] },
  { id: 'william_shatner', name: 'William Shatner', icon: '🚀', description: 'Dramatic starfleet echo delays', setup: ['stutter', 'echo'] },
  { id: 'chris_tucker', name: 'Chris Tucker', icon: '⚡', description: 'High-pitched ultra fast hyper active', setup: ['pitch', 'treble_boost', 'auto_pan'] },
];

// Helper to generate dynamic voice biometrics characteristics matching active profile
const getAcousticSpec = (profileId: string, customProfiles: any[] = []) => {
  const allP = [...VOICE_PROFILES, ...customProfiles];
  const prof = allP.find(p => p.id === profileId);
  const name = (prof?.name || "Neutral").toLowerCase();
  
  let pitch = "115–130 Hz";
  let voiceClass = "Baritone / Orator";
  let resonance = "Balanced Pharyngeal & Chest";
  let articulation = "High precision oratorical";
  let jitter = "Low (< 0.22%)";
  let shimmer = "Warm dynamic < 1.8%";

  if (name.includes("trump")) {
    pitch = "135–150 Hz";
    voiceClass = "Tenor / Raspy Mid";
    resonance = "High Nasal & Oral";
    articulation = "Informal colloquial";
    jitter = "Moderate (0.35%)";
    shimmer = "Saturated texture (2.8%)";
  } else if (name.includes("obama")) {
    pitch = "110–120 Hz";
    voiceClass = "Resonant Baritone";
    resonance = "Deep Chest / Oral";
    articulation = "Stately rhetorical";
    jitter = "Ultra-low (0.12%)";
    shimmer = "Smooth polish (1.1%)";
  } else if (name.includes("freeman") || name.includes("jones")) {
    pitch = "75–90 Hz";
    voiceClass = "Gravitational Bass";
    resonance = "Deep Subchestal / Pharyngeal";
    articulation = "Slow cinematic cadence";
    jitter = "Ultra-low (0.08%)";
    shimmer = "Warm grain < 0.95%";
  } else if (name.includes("island") || name.includes("tucker") || name.includes("spongebob")) {
    pitch = "210–245 Hz";
    voiceClass = "High Tenor / Sopral";
    resonance = "Nasal & Cranial Cavity";
    articulation = "Fast staccato syncopation";
    jitter = "Erratic (0.64%)";
    shimmer = "Sharp sizzle (3.25%)";
  } else if (name.includes("jackson")) {
    pitch = "140–165 Hz";
    voiceClass = "Mid-High Tenor";
    resonance = "Brilliant Oral / Pharyngeal";
    articulation = "Highly emphatic explosive";
    jitter = "Low (0.19%)";
    shimmer = "Saturated plate (2.1%)";
  } else if (name.includes("santa")) {
    pitch = "85–100 Hz";
    voiceClass = "Deep Chest Bass";
    resonance = "Resonant Hollow Room / Chest";
    articulation = "Jolly booming bellows";
    jitter = "Warm (0.32%)";
    shimmer = "Rich flutter (2.6%)";
  } else if (name.includes("shatner") || name.includes("goldblum")) {
    pitch = "120–135 Hz";
    voiceClass = "Baritone / Quirky";
    resonance = "High Pharyngeal";
    articulation = "Syncopated staccato hesitation";
    jitter = "Dynamic (0.28%)";
    shimmer = "Flutter (2.3%)";
  } else if (name.includes("puck")) {
    pitch = "175–195 Hz";
    voiceClass = "Youthful Tenor";
    resonance = "Bright Oral Frame";
    articulation = "Crisp, fast mid-high";
    jitter = "Low (< 0.18%)";
    shimmer = "Mild bright shimmer";
  } else if (name.includes("charon")) {
    pitch = "80-90 Hz";
    voiceClass = "Authoritative Bass";
    resonance = "Heavy Throat resonance";
    articulation = "Stately dark style";
    jitter = "Low (< 0.20%)";
    shimmer = "Tight grain (1.2%)";
  } else if (name.includes("kore") || name.includes("aoede")) {
    pitch = "200-220 Hz";
    voiceClass = "Expressive Soprano";
    resonance = "Warm cranial resonance";
    articulation = "Theatrical expressive";
    jitter = "Stable (< 0.15%)";
    shimmer = "Silky texture (0.8%)";
  }

  return { pitch, voiceClass, resonance, articulation, jitter, shimmer };
};

export function VoiceGeneratorInterface({ onBack }: { onBack: () => void }) {
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState<string>("Kore");
  const [isGenerating, setIsGenerating] = useState(false);

  const [customProfiles, setCustomProfiles] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('custom_voice_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCustomProfiles = (profiles: any[]) => {
    setCustomProfiles(profiles);
    localStorage.setItem('custom_voice_profiles', JSON.stringify(profiles));
  };

  const [isEditProfilesMode, setIsEditProfilesMode] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileCharacter, setNewProfileCharacter] = useState("");
  const [newProfileStatus, setNewProfileStatus] = useState<string | null>(null);
  const [lastGeneratedText, setLastGeneratedText] = useState("");
  const shouldAutoPlayRef = useRef(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<'None' | 'Standard' | 'Deep'>('None');
  const cleanupEnabled = cleanupMode !== 'None';
  const cleanupAmount = cleanupMode === 'Standard' ? 50 : (cleanupMode === 'Deep' ? 85 : 0);
  const [waveformBuffer, setWaveformBuffer] = useState<Float32Array | null>(null);
  const [fileName, setFileName] = useState<string>("vocal_sample_01.wav");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  
  const [effects, setEffects] = useState<Effect[]>(DEFAULT_EFFECTS);
  const [activeProfileId, setActiveProfileId] = useState<string>('neutral');
  
  const [isCreativeEffectsExpanded, setIsCreativeEffectsExpanded] = useState(false);
  const [isCleanupExpanded, setIsCleanupExpanded] = useState(false);
  const [isActiveMenuExpanded, setIsActiveMenuExpanded] = useState(false);
  
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const positionOffsetRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const [bufferHistory, setBufferHistory] = useState<Tone.ToneAudioBuffer[]>([]);

  const [playbackBpm, setPlaybackBpm] = useState<number>(120);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [detectedKey, setDetectedKey] = useState<{ key: string, confidence: number } | null>(null);

  const [hasApiKey, setHasApiKey] = useState(false);
  useEffect(() => {
    const activeKeyId = localStorage.getItem('producer_lyria_selected_key_id') || '';
    const savedKeysStr = localStorage.getItem('producer_lyria_api_keys') || '[]';
    let savedKeys: any[] = [];
    try {
      savedKeys = JSON.parse(savedKeysStr);
    } catch {}
    setHasApiKey(savedKeys.some((k: any) => k.id === activeKeyId && k.apiKey));
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const stopPlayback = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
      setCursorPosition(0);
      positionOffsetRef.current = 0;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  };

  const simulateKeyDetection = async () => {
    if (!playerRef.current || !playerRef.current.buffer) return;
    try {
      const audioBuffer = playerRef.current.buffer.get();
      if (!audioBuffer) return;
      const resultJson = await detectAudioKey(audioBuffer, { profile: 'Krumhansl-Schmuckler' });
      const result = JSON.parse(resultJson);
      setDetectedKey({ key: `${result.detectedKey} ${result.scale}`, confidence: Math.round(result.confidence * 100) });
    } catch (e) {
      console.error("Key detection failed", e);
    }
  };

  const exportToWav = async () => {
    if (!playerRef.current || !playerRef.current.buffer) return;
    try {
      const offlineCtx = new Tone.OfflineContext(
        playerRef.current.buffer.numberOfChannels,
        playerRef.current.buffer.duration,
        playerRef.current.buffer.sampleRate
      );

      const offlinePlayer = new Tone.GrainPlayer(playerRef.current.buffer);
      offlinePlayer.playbackRate = playbackBpm / 120; // Default baseline 120
      
      let offlineChain: any[] = [];
      
      if (cleanupEnabled) {
          const offlineFilter = new Tone.Filter({ type: "highpass", frequency: cleanupAmount * 2 + 50 });
          const offlineEq = new Tone.EQ3({ low: -cleanupAmount * 0.1, high: cleanupAmount * 0.05 });
          const offlineComp = new Tone.Compressor({ threshold: -20, ratio: 3 + (cleanupAmount/50) });
          offlineChain.push(offlineFilter, offlineEq, offlineComp);
      }

      effects.forEach(eff => {
          if (eff.enabled) {
              const conf = EFFECT_CONFIG[eff.id as keyof typeof EFFECT_CONFIG];
              if (conf) {
                  const newNodes = conf.create();
                  conf.update(newNodes, eff.params);
                  offlineChain.push(...newNodes);
              }
          }
      });

      if (offlineChain.length > 0) {
          offlinePlayer.chain(...offlineChain, offlineCtx.destination);
      } else {
          offlinePlayer.connect(offlineCtx.destination);
      }

      offlinePlayer.start(0);
      const renderedBuffer = await offlineCtx.render();
      
      // Convert AudioBuffer to WAV blob
      const numChannels = renderedBuffer.numberOfChannels;
      const length = renderedBuffer.length;
      const wavBuffer = new ArrayBuffer(44 + length * numChannels * 2);
      const view = new DataView(wavBuffer);
      
      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + length * numChannels * 2, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, renderedBuffer.sampleRate, true);
      view.setUint32(28, renderedBuffer.sampleRate * numChannels * 2, true);
      view.setUint16(32, numChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, length * numChannels * 2, true);
      
      let offset = 44;
      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const channelData = renderedBuffer.getChannelData(channel);
          let s = Math.max(-1, Math.min(1, channelData[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          offset += 2;
        }
      }
      
      const blob = new Blob([view], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName.replace(/\.[^/.]+$/, "") + "_fx.wav";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleSplitLeft = () => {
    if (!playerRef.current || !playerRef.current.buffer || !isAudioLoaded) return;
    try {
      if (isPlaying) {
        playerRef.current.stop();
        setIsPlaying(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      }
      
      const originalBuffer = playerRef.current.buffer;
      setBufferHistory(prev => [...prev, originalBuffer]);
      
      const splitIndex = Math.floor((cursorPosition / 100) * originalBuffer.length);
      const newLength = originalBuffer.length - splitIndex;
      if (newLength <= 0) return;
      
      const audioCtx = Tone.getContext().rawContext;
      const newAudioBuffer = audioCtx.createBuffer(originalBuffer.numberOfChannels, newLength, originalBuffer.sampleRate);
      
      for (let c = 0; c < originalBuffer.numberOfChannels; c++) {
        const oldData = originalBuffer.getChannelData(c);
        const newData = newAudioBuffer.getChannelData(c);
        for (let i = 0; i < newLength; i++) {
          newData[i] = oldData[splitIndex + i];
        }
      }
      
      playerRef.current.buffer = new Tone.ToneAudioBuffer(newAudioBuffer);
      setCursorPosition(0);
      setAudioUrl(prev => prev ? (prev.includes('?') ? prev.split('?')[0] + '?t=' + Date.now() : prev + '?t=' + Date.now()) : null);
    } catch (e) {
      console.error("Failed to split buffer left", e);
    }
  };

  const handleSplitRight = () => {
    if (!playerRef.current || !playerRef.current.buffer || !isAudioLoaded) return;
    try {
      if (isPlaying) {
        playerRef.current.stop();
        setIsPlaying(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      }
      
      const originalBuffer = playerRef.current.buffer;
      setBufferHistory(prev => [...prev, originalBuffer]);
      
      const splitIndex = Math.floor((cursorPosition / 100) * originalBuffer.length);
      const newLength = splitIndex;
      if (newLength <= 0) return;
      
      const audioCtx = Tone.getContext().rawContext;
      const newAudioBuffer = audioCtx.createBuffer(originalBuffer.numberOfChannels, newLength, originalBuffer.sampleRate);
      
      for (let c = 0; c < originalBuffer.numberOfChannels; c++) {
        const oldData = originalBuffer.getChannelData(c);
        const newData = newAudioBuffer.getChannelData(c);
        for (let i = 0; i < newLength; i++) {
          newData[i] = oldData[i];
        }
      }
      
      playerRef.current.buffer = new Tone.ToneAudioBuffer(newAudioBuffer);
      setCursorPosition(100);
      setAudioUrl(prev => prev ? (prev.includes('?') ? prev.split('?')[0] + '?t=' + Date.now() : prev + '?t=' + Date.now()) : null);
    } catch (e) {
      console.error("Failed to split buffer right", e);
    }
  };

  const handleUndoBuffer = () => {
    if (bufferHistory.length === 0 || !playerRef.current || !isAudioLoaded) return;
    try {
      if (isPlaying) {
        playerRef.current.stop();
        setIsPlaying(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
      }
      
      const previousBuffer = bufferHistory[bufferHistory.length - 1];
      playerRef.current.buffer = previousBuffer;
      setBufferHistory(prev => prev.slice(0, -1));
      setCursorPosition(0);
      setAudioUrl(prev => prev ? (prev.includes('?') ? prev.split('?')[0] + '?t=' + Date.now() : prev + '?t=' + Date.now()) : null);
    } catch (e) {
      console.error("Failed to undo buffer change", e);
    }
  };
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playerRef = useRef<Tone.GrainPlayer | null>(null);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eqRef = useRef<Tone.EQ3 | null>(null);
  const compRef = useRef<Tone.Compressor | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const fxNodesRef = useRef<{ [key: string]: any[] }>({});
  
  // Cleanup audio objects on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      if (playerRef.current) {
        playerRef.current.dispose();
      }
      if (eqRef.current) {
        eqRef.current.dispose();
      }
      if (compRef.current) {
        compRef.current.dispose();
      }
      if (filterRef.current) {
        filterRef.current.dispose();
      }
      Object.values(fxNodesRef.current).forEach(nodes => {
        nodes.forEach(n => {
            try { n.dispose(); } catch (e) {}
        });
      });
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  // Set up effects chain
  useEffect(() => {
    if (!eqRef.current) {
      eqRef.current = new Tone.EQ3({
        low: 0,
        mid: 0,
        high: 0,
        lowFrequency: 200,
        highFrequency: 2500
      });
      compRef.current = new Tone.Compressor({
        threshold: -24,
        ratio: 4,
        attack: 0.005,
        release: 0.1
      });
      filterRef.current = new Tone.Filter({
        type: "highpass",
        frequency: 80,
      });
      
      filterRef.current.connect(eqRef.current);
      eqRef.current.connect(compRef.current);
      compRef.current.toDestination();
    }
  }, []);

  const enabledEffectsCsv = effects.filter(e => e.enabled).map(e => e.id).join(',');

  // Apply routing
  useEffect(() => {
    if (!playerRef.current || !isAudioLoaded) return;
    
    // Disconnect all
    playerRef.current.disconnect();
    if (filterRef.current) filterRef.current.disconnect();
    if (eqRef.current) eqRef.current.disconnect();
    if (compRef.current) compRef.current.disconnect();
    
    Object.values(fxNodesRef.current).forEach(nodes => {
      nodes.forEach(n => {
          try { n.disconnect(); } catch (e) {}
      });
    });

    let chain: any[] = [playerRef.current];

    // Build creative effects chain
    effects.forEach(eff => {
      if (eff.enabled) {
        if (!fxNodesRef.current[eff.id]) {
            fxNodesRef.current[eff.id] = EFFECT_CONFIG[eff.id as keyof typeof EFFECT_CONFIG].create();
        }
        chain.push(...fxNodesRef.current[eff.id]);
      }
    });

    // Build cleanup chain at the end
    if (cleanupEnabled && filterRef.current && eqRef.current && compRef.current) {
      chain.push(filterRef.current, eqRef.current, compRef.current);
    }
    
    // Connect them up
    for (let i = 0; i < chain.length - 1; i++) {
        chain[i].connect(chain[i + 1]);
    }
    chain[chain.length - 1].toDestination();
    
  }, [enabledEffectsCsv, cleanupEnabled, isAudioLoaded]);

  // Stop playback when cleanup is toggled to prevent loud transient split/routing noises
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      try {
        playerRef.current.stop();
      } catch (e) {}
      setIsPlaying(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    }
  }, [cleanupEnabled]);

  // Update parameters without rebuilding the chain
  useEffect(() => {
    if (!playerRef.current || !isAudioLoaded) return;
    
    effects.forEach(eff => {
       if (eff.enabled && fxNodesRef.current[eff.id]) {
          const conf = EFFECT_CONFIG[eff.id as keyof typeof EFFECT_CONFIG];
          if (conf) conf.update(fxNodesRef.current[eff.id], eff.params);
       }
    });
    
    // Update cleanup params
    if (eqRef.current && compRef.current && filterRef.current) {
        const amount = cleanupAmount / 100;
        eqRef.current.low.value = amount * -6;
        eqRef.current.high.value = amount * 3;
        compRef.current.threshold.value = -10 - (amount * 14);
        compRef.current.ratio.value = 1 + (amount * 3);
        filterRef.current.frequency.value = 20 + (amount * 100);
    }
  }, [effects, cleanupAmount, isAudioLoaded]);

  // Re-calculate waveform offline when audio or effects change
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.loaded) return;
    
    let isCancelled = false;
    const renderOffline = async () => {
      try {
        const duration = playerRef.current!.buffer.duration;
        const rendered = await Tone.Offline(() => {
          const offlinePlayer = new Tone.GrainPlayer(playerRef.current!.buffer).toDestination();
          
          if (cleanupEnabled && cleanupAmount > 0) {
             const amount = cleanupAmount / 100;
             const offlineEq = new Tone.EQ3({
               low: amount * -6,
               mid: 0,
               high: amount * 3,
               lowFrequency: 200,
               highFrequency: 2500
             });
             const offlineComp = new Tone.Compressor({
               threshold: -10 - (amount * 14),
               ratio: 1 + (amount * 3),
               attack: 0.005,
               release: 0.1
             });
             const offlineFilter = new Tone.Filter({
               type: "highpass",
               frequency: 20 + (amount * 100),
             });
             
             offlinePlayer.disconnect();
             offlinePlayer.chain(offlineFilter, offlineEq, offlineComp, Tone.Destination);
          }
          offlinePlayer.start(0);
        }, duration);

        if (isCancelled) return;

        const channelData = rendered.getChannelData(0);
        
        // Downsample for rendering
        const samples = 150;
        const blockSize = Math.max(1, Math.floor(channelData.length / samples));
        const downsampled = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < Math.min(blockSize, channelData.length - i*blockSize); j++) {
             sum += Math.abs(channelData[i * blockSize + j]);
          }
          downsampled[i] = sum / blockSize;
        }
        
        setWaveformBuffer(downsampled);
      } catch (err) {
        console.error("Offline render error", err);
      }
    };
    
    renderOffline();
    
    return () => { isCancelled = true; };
  }, [audioUrl, isAudioLoaded, cleanupAmount, cleanupEnabled]);

  const handleGenerateTTS = async (profileIdToUse?: string, textToUse?: string) => {
    const targetProfileId = profileIdToUse || activeProfileId;
    const finalTxt = textToUse !== undefined ? textToUse : ttsText;
    if (!finalTxt.trim()) return;
    setIsGenerating(true);
    
    // Retrieve Client Selected API Key and Provider
    const activeKeyId = localStorage.getItem('producer_lyria_selected_key_id') || '';
    const savedKeysStr = localStorage.getItem('producer_lyria_api_keys') || '[]';
    let savedKeys: any[] = [];
    try {
      savedKeys = JSON.parse(savedKeysStr);
    } catch {}
    const activeKeyObj = savedKeys.find((k: any) => k.id === activeKeyId);
    const clientApiKey = activeKeyObj ? activeKeyObj.apiKey : '';
    const clientProvider = activeKeyObj ? activeKeyObj.provider : '';
    const requestedModel = activeKeyObj?.selectedModel || localStorage.getItem('producer_lyria_selected_model_id') || 'auto';
    // Registry-driven: for TTS task pick the best (TTS-specific for google)
    const resolvedModelId = resolveModelForRequest(requestedModel, clientProvider, 'tts' as AITask);

    const allP = [...VOICE_PROFILES, ...customProfiles];
    const customProfileObj = allP.find(p => p.id === targetProfileId);
    const isCustom = targetProfileId.startsWith('custom_');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text: finalTxt, 
          voice: isCustom ? customProfileObj?.voice : ttsVoice,
          clientApiKey,
          clientProvider,
          modelId: resolvedModelId,
          activeProfileId: targetProfileId,
          customSystemInstruction: isCustom ? customProfileObj?.systemInstruction : undefined,
          customVoice: isCustom ? customProfileObj?.voice : undefined
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to generate audio');
      }

      const data = await response.json();
      if (data.audio) {
        setLastGeneratedText(finalTxt);
        
        logTransaction({
          modelId: resolvedModelId,
          type: 'Text-to-Speech Generation',
          promptText: finalTxt,
          responseText: '[Audio Waveform Binary]',
          success: true,
          usageMetadata: data.usageMetadata
        });

        // Convert the returned PCM 16-bit 24kHz base64 to a WAVE blob
        const sampleRate = 24000;
        const binaryString = atob(data.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const dataSize = bytes.length;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + dataSize, true); // file length
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666D7420, false); // "fmt "
        view.setUint32(16, 16, true); // chunk length
        view.setUint16(20, 1, true); // sample format
        view.setUint16(22, 1, true); // channels
        view.setUint32(24, sampleRate, true); // sample rate
        view.setUint32(28, sampleRate * 2, true); // byte rate
        view.setUint16(32, 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true); // data chunk length
        
        const dataView = new Uint8Array(buffer, 44);
        dataView.set(bytes);
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        setAudioUrl(url);
        setFileName(`TTS_Generated_${Date.now().toString().slice(-4)}.wav`);
        loadAudioIntoPlayer(url);
      }
    } catch (err: any) {
      console.error("TTS generation error", err);
      logTransaction({
        modelId: resolvedModelId,
        type: 'Text-to-Speech Generation',
        promptText: finalTxt,
        success: false
      });
      alert(err?.message || 'Failed to generate TTS audio. Please verify your selected API Key under the "API Keys" manager in the header.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      await Tone.start();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        console.log("Audio blob size:", audioBlob.size, "type:", audioBlob.type);
        if (audioBlob.size === 0) {
          alert('Recording failed: Empty audio data received from microphone.');
          return;
        }
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        loadAudioIntoPlayer(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      loadAudioIntoPlayer(url);
    }
  };

  const loadAudioIntoPlayer = async (url: string) => {
    setIsAudioLoaded(false);
    setBufferHistory([]);
    if (playerRef.current) {
      playerRef.current.dispose();
    }
    
    await Tone.start();
    playerRef.current = new Tone.GrainPlayer({
      url,
      onload: () => {
        setIsAudioLoaded(true);
        if (shouldAutoPlayRef.current) {
          shouldAutoPlayRef.current = false;
          setTimeout(() => {
            togglePlayback();
          }, 80);
        }
      },
      onerror: (err) => {
        console.error("Error loading audio buffer:", err);
        alert("Failed to load audio. Please try another file.");
      }
    });
    playerRef.current.volume.value = 0;
  };

  const togglePlayback = async () => {
    if (!playerRef.current || !playerRef.current.loaded) return;
    
    await Tone.start();
    
    if (isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    } else {
      const duration = playerRef.current.buffer.duration;
      let startOffset = (cursorPosition / 100) * duration;
      if (cursorPosition >= 99.9) {
          startOffset = 0;
      }
      
      playerRef.current.playbackRate = playbackBpm / 120;
      playerRef.current.loop = isLooping;
      playerRef.current.start(0, startOffset);
      setIsPlaying(true);
      playbackStartTimeRef.current = Tone.now();
      positionOffsetRef.current = startOffset;
      
      const updateCursor = () => {
         if (!playerRef.current) return;
         const elapsed = (Tone.now() - playbackStartTimeRef.current!) * (playbackBpm / 120);
         let currentSec = positionOffsetRef.current + elapsed;
         if (currentSec >= duration) {
            if (playerRef.current.loop) {
               currentSec = currentSec % duration;
               playbackStartTimeRef.current = Tone.now();
               positionOffsetRef.current = currentSec;
            } else {
               setIsPlaying(false);
               setCursorPosition(0);
               return;
            }
         }
         setCursorPosition((currentSec / duration) * 100);
         requestRef.current = requestAnimationFrame(updateCursor);
      };
      
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(updateCursor);
    }
  };

  const resetSample = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.dispose();
      playerRef.current = null;
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }
    setIsPlaying(false);
    setIsAudioLoaded(false);
    setAudioUrl(null);
    setWaveformBuffer(null);
    setCleanupMode('None');
    setEffects(DEFAULT_EFFECTS.map(eff => ({ ...eff, params: { ...eff.params } })));
    setCursorPosition(0);
    setBufferHistory([]);
  };

  const applyProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    const profile = [...VOICE_PROFILES, ...customProfiles].find(p => p.id === profileId);
    if (!profile) return;
    
    setEffects(prev => prev.map(eff => ({
      ...eff,
      enabled: (profile.setup || []).includes(eff.id)
    })));

    // Once the speech is generated, choosing a different profile will change the voice
    // to whatever the new profile selection is
    if (audioUrl && lastGeneratedText) {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      setIsPlaying(false);
      shouldAutoPlayRef.current = true;
      handleGenerateTTS(profileId, lastGeneratedText);
    }
  };

  const handleDeleteProfile = (profileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const filtered = customProfiles.filter(p => p.id !== profileId);
    saveCustomProfiles(filtered);
    if (activeProfileId === profileId) {
      setActiveProfileId('neutral');
    }
  };

  const handleGenerateVoiceProfile = async () => {
    if (!newProfileCharacter.trim()) return;
    setNewProfileStatus("Conducting Acoustic Field Research...");

    const activeKeyId = localStorage.getItem('producer_lyria_selected_key_id') || '';
    const savedKeysStr = localStorage.getItem('producer_lyria_api_keys') || '[]';
    let savedKeys: any[] = [];
    try {
      savedKeys = JSON.parse(savedKeysStr);
    } catch {}
    const activeKeyObj = savedKeys.find((k: any) => k.id === activeKeyId);
    const clientApiKey = activeKeyObj ? activeKeyObj.apiKey : '';
    const clientProvider = activeKeyObj ? activeKeyObj.provider : '';
    const requestedModel = activeKeyObj?.selectedModel || localStorage.getItem('producer_lyria_selected_model_id') || 'auto';
    // Use voice-profile best model when auto
    const resolvedModelId = resolveModelForRequest(requestedModel, clientProvider, 'voice-profile' as AITask);

    try {
      setNewProfileStatus("Generating Voice Biometrics...");
      const response = await fetch('/api/generate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newProfileCharacter,
          clientApiKey,
          clientProvider,
          modelId: resolvedModelId
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error ?? 'Failed to generate voice profile');
      }

      setNewProfileStatus("Configuring Harmonic Parameters...");
      const profileData = await response.json();

      logTransaction({
        modelId: resolvedModelId,
        type: 'Voice Biometric Profile Generation',
        promptText: newProfileCharacter,
        responseText: JSON.stringify(profileData),
        success: true,
        usageMetadata: profileData.usageMetadata
      });

      const newId = `custom_${Date.now()}`;
      const newProfile = {
        id: newId,
        name: profileData.name || newProfileCharacter,
        icon: profileData.icon || "🎙️",
        description: `Custom AI Acoustic Profile (Base: ${profileData.voice || 'Kore'})`,
        voice: profileData.voice || 'Kore',
        systemInstruction: profileData.systemInstruction,
        setup: ['vocal_presence', 'compressor']
      };

      const updatedCustom = [...customProfiles, newProfile];
      saveCustomProfiles(updatedCustom);
      
      // Apply immediately
      setIsEditProfilesMode(false);
      setActiveProfileId(newId);
      setEffects(prev => prev.map(eff => ({
        ...eff,
        enabled: newProfile.setup.includes(eff.id)
      })));

      // If speech is currently generated, update it in realtime too!
      if (audioUrl && lastGeneratedText) {
        if (playerRef.current) {
          playerRef.current.stop();
        }
        setIsPlaying(false);
        shouldAutoPlayRef.current = true;
        handleGenerateTTS(newId, lastGeneratedText);
      }

      // Close modal
      setIsCreatingProfile(false);
      setNewProfileCharacter("");
      setNewProfileStatus(null);
    } catch (err: any) {
      console.error(err);
      logTransaction({
        modelId: resolvedModelId,
        type: 'Voice Biometric Profile Generation',
        promptText: newProfileCharacter,
        success: false
      });
      alert(err.message || "Failed to generate voice profile. Please ensure you have configured a valid API Key.");
      setNewProfileStatus(null);
    }
  };

  const toggleEffect = (id: string) => {
    setEffects(prev => prev.map(e => {
        if (e.id === id) {
           return { ...e, enabled: !e.enabled };
        }
        return e;
    }));
  };
  
  const updateEffectParam = (id: string, paramKey: string, value: number) => {
      setEffects(prev => prev.map(e => {
          if (e.id === id) {
              return { ...e, params: { ...e.params, [paramKey]: value } };
          }
          return e;
      }));
  };

  const resetEffectParams = (id: string) => {
      const defaultEff = DEFAULT_EFFECTS.find(e => e.id === id);
      if (!defaultEff) return;
      setEffects(prev => prev.map(e => {
          if (e.id === id) {
              return { ...e, params: { ...defaultEff.params } };
          }
          return e;
      }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0 mb-8 font-sans">
      <div className="mb-4">
        <button onClick={onBack} className="text-text3 hover:text-text font-black uppercase text-[10px] bg-bg3 border border-border px-3 py-1.5 rounded-lg flex gap-2 items-center transition-colors">
          <ArrowLeft size={12}/> Back Launchpad
        </button>
      </div>

      <div className="p-3 sm:p-6 bg-bg2 text-text rounded-xl shadow-2xl border border-border relative">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wider text-accent">Text-to-Speech Tool</h2>
        </header>

        <div className="flex flex-col gap-6">
          {/* Input Section */}
          {!audioUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
              {/* Left Column: TTS Input */}
              <div className="lg:col-span-5 bg-bg3 border border-border rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles size={16} />
                  <span className="text-sm font-black uppercase tracking-wider">Input Source</span>
                </div>
                
                <textarea 
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Enter text to synthesize a new voice track..."
                  className="w-full bg-bg/50 border border-border rounded-lg p-4 text-sm min-h-[160px] outline-none focus:border-accent text-text resize-y leading-relaxed font-sans placeholder:text-text3/50"
                />

                <div className="text-[10px] bg-bg/40 border border-border/40 p-3 rounded-lg text-text2 font-mono flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-text3">SPEAKER PROFILE:</span>
                    <span className="text-accent font-bold uppercase">
                      {[...VOICE_PROFILES, ...customProfiles].find(p => p.id === activeProfileId)?.name || 'Neutral / Raw'}
                    </span>
                  </div>
                  <div className="text-text3 text-[9px] mt-1 italic leading-tight text-left">
                    {[...VOICE_PROFILES, ...customProfiles].find(p => p.id === activeProfileId)?.description}
                  </div>
                </div>

                <button 
                  onClick={() => handleGenerateTTS()}
                  disabled={!ttsText.trim() || isGenerating || !hasApiKey}
                  className="flex items-center justify-center w-full gap-2 px-6 py-4 bg-accent disabled:bg-accent/40 disabled:cursor-not-allowed hover:opacity-90 text-[var(--bg)] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg active:scale-95"
                >
                  {isGenerating ? (
                    <span className="animate-pulse">Synthesizing Voice...</span>
                  ) : !hasApiKey ? (
                    <>
                      <Settings2 size={18} /> API Key Required (Configure in header)
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Generate Voice
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Voice Profiles Selection */}
              <div className="lg:col-span-7 bg-bg3 border border-border rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent">
                    <Sparkles size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Select Voice Profile</span>
                  </div>
                  <button 
                    onClick={() => setIsEditProfilesMode(!isEditProfilesMode)}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                      isEditProfilesMode 
                        ? 'bg-red-500/10 border-red-500/35 text-red-400 hover:bg-red-500/20' 
                        : 'bg-bg/60 border-border/60 text-text3 hover:text-accent hover:border-accent/40'
                    }`}
                  >
                    <Settings2 size={11} />
                    {isEditProfilesMode ? 'Done' : 'Edit Profiles'}
                  </button>
                </div>
                
                <p className="text-xs text-text3/80 font-medium leading-relaxed mb-1">
                  Choose an acoustic baseline. The system configures dedicated generative instructions matching specific speaker characteristics.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[385px] pr-1">
                  {[...VOICE_PROFILES, ...customProfiles].map(profile => {
                    const isActive = activeProfileId === profile.id;
                    return (
                      <div key={profile.id} className="relative group/profile">
                        <button
                          onClick={() => applyProfile(profile.id)}
                          className={`w-full flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all cursor-pointer ${
                            isActive 
                              ? 'border-accent bg-accent/10 shadow-[0_4px_15px_rgba(var(--accent-rgb),0.12)]' 
                              : 'border-border/50 bg-bg/40 hover:border-accent/40 hover:bg-white/5'
                          }`}
                        >
                          <span className={`text-2xl transition-transform duration-350 ${isActive ? 'scale-110' : 'group-hover/profile:scale-110 group-hover/profile:-rotate-6'}`}>
                            {profile.icon}
                          </span>
                          <div className="text-center w-full min-w-0">
                            <span className={`block text-[10px] font-black uppercase tracking-widest truncate w-full ${isActive ? 'text-accent' : 'text-text'}`}>
                              {profile.name}
                            </span>
                          </div>
                        </button>
                        {isEditProfilesMode && profile.id.startsWith('custom_') && (
                          <button
                            onClick={(e) => handleDeleteProfile(profile.id, e)}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 z-10 shadow-md cursor-pointer"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setIsCreatingProfile(true)}
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent rounded-xl transition-all cursor-pointer group/add"
                  >
                    <Plus size={20} className="text-accent transition-transform group-hover/add:scale-110" />
                    <div className="text-center w-full min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-accent truncate w-full">
                        New Profile
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Processing Section */}
          {audioUrl && (
            <div className="bg-bg3 border border-border rounded-xl p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                <h3 className="text-[10px] font-black uppercase text-text3 tracking-wider">Vocal deck & FX Processing</h3>
                <button
                  onClick={resetSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <Trash2 size={11} /> Load Different Audio
                </button>
              </div>
              
              <div className="flex flex-col gap-5 bg-gradient-to-b from-bg2 to-neutral-900/60 p-5 rounded-xl border border-accent/20 shadow-[0_10px_35px_rgba(0,0,0,0.4)] relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-3 w-full">
                  <div className="flex flex-col gap-1 w-full md:max-w-[40%]">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          onBlur={() => setIsEditingName(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setIsEditingName(false);
                          }}
                          className="bg-neutral-900 border border-accent/40 text-xs font-black text-accent uppercase tracking-widest px-2 py-1 rounded outline-none focus:border-accent w-full font-mono"
                          autoFocus
                        />
                        <button 
                          onClick={() => setIsEditingName(false)}
                          className="text-success hover:text-white transition-colors"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                        <span className="text-xs font-black uppercase text-accent tracking-widest truncate max-w-[200px] hover:text-accent-hover">
                          {fileName}
                        </span>
                        <Edit2 size={11} className="text-text3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                    <span className="text-[9px] font-mono text-text3 mt-0.5">High Accuracy Sample Visualization</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 shrink-1 md:shrink-0 w-full md:w-auto">
                    <div className="flex items-center bg-neutral-900 border border-border/40 rounded-lg shrink-0 px-2 h-9 overflow-hidden focus-within:border-accent/50 transition-colors">
                      <span className="text-[9px] text-text3 font-black uppercase tracking-widest mr-1">BPM</span>
                      <input 
                        type="number" 
                        value={playbackBpm} 
                        onChange={e => setPlaybackBpm(Number(e.target.value))} 
                        className="w-10 bg-transparent text-[11px] font-mono font-bold text-accent outline-none text-right tabular-nums p-0" 
                      />
                    </div>
                    
                    <button 
                      onClick={simulateKeyDetection}
                      className="flex items-center gap-1.5 h-9 px-3 bg-neutral-900 border border-border/40 hover:border-accent2/40 hover:bg-neutral-800 rounded-lg text-text2 hover:text-accent2 transition-colors shrink-0 group"
                    >
                      <Activity size={13} className="group-hover:text-accent2 text-text3 transition-colors" />
                      <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                         {detectedKey ? <><span className="text-accent2">{detectedKey.key}</span> <span className="text-text3 text-[8px] opacity-70 ml-1">{detectedKey.confidence}%</span></> : 'Detect Key'}
                      </span>
                    </button>
                    
                    <div className="flex items-center h-9 bg-neutral-900 border border-border/40 rounded-lg p-0.5">
                       <button onClick={handleUndoBuffer} disabled={bufferHistory.length === 0} className={`p-1.5 rounded-md transition-colors ${bufferHistory.length > 0 ? 'text-accent hover:bg-accent/20' : 'text-text3/50 cursor-not-allowed'}`} title="Undo last sample edit">
                         <Undo size={14} />
                       </button>
                       <div className="w-[1px] h-4 bg-border/40 mx-0.5"></div>
                       <button onClick={handleSplitLeft} className="px-2 py-1 flex items-center h-full rounded-md text-text3 hover:text-accent hover:bg-accent/10 transition-colors font-mono font-bold text-[10px] tracking-tighter" title="Split at cursor and snap remaining right part to start">
                         {"<-|"}
                       </button>
                       <button onClick={handleSplitRight} className="px-2 py-1 flex items-center h-full rounded-md text-text3 hover:text-accent hover:bg-accent/10 transition-colors font-mono font-bold text-[10px] tracking-tighter" title="Split at cursor and delete right side">
                         {"|->"}
                       </button>
                    </div>
                    
                    <button 
                      onClick={exportToWav}
                      disabled={!audioUrl || !isAudioLoaded}
                      className="flex items-center gap-1.5 h-9 px-3 bg-accent/10 border border-accent/30 hover:border-accent/60 hover:bg-accent/20 rounded-lg text-accent transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <Download size={13} className="text-accent/80 group-hover:text-accent transition-colors" />
                      <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Export WAV</span>
                    </button>

                    <div className="flex items-center h-9 bg-neutral-900 border border-border/40 rounded-lg p-0.5">
                       <button onClick={togglePlayback} disabled={!audioUrl || !isAudioLoaded} className={`p-1.5 rounded-md transition-colors ${isPlaying ? 'bg-accent/20 text-accent' : 'text-text3 hover:text-text2'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                         {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                       </button>
                       <button onClick={stopPlayback} disabled={!audioUrl || !isAudioLoaded} className="p-1.5 rounded-md text-text3 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                         <Square size={12} fill="currentColor" />
                       </button>
                       <div className="w-[1px] h-4 bg-border/40 mx-0.5"></div>
                       <button onClick={() => setIsLooping(!isLooping)} className={`p-1.5 rounded-md transition-colors ${isLooping ? 'bg-accent/20 text-accent' : 'text-text3 hover:text-text2'}`}>
                         <Repeat size={14} />
                       </button>
                    </div>
                  </div>
                </div>
                
                {/* Dynamic Voice Identity & Interactive Transcript Deck */}
                {audioUrl ? (
                  <div className="flex flex-col gap-5 relative w-full">
                    <style>{`
                      @keyframes voice-pulse-ring {
                        0% { transform: scale(0.95); opacity: 0.25; }
                        50% { transform: scale(1.18); opacity: 0.55; }
                        100% { transform: scale(0.95); opacity: 0.25; }
                      }
                      @keyframes voice-orb-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                      @keyframes speech-glow-pulse {
                        0%, 100% { filter: drop-shadow(0 0 10px var(--accent)); opacity: 0.85; }
                        50% { filter: drop-shadow(0 0 22px var(--accent2)); opacity: 1; }
                      }
                    `}</style>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                      {/* Left/Top: Voice Assistant Living Orb */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-bg2/40 border border-border/40 rounded-xl relative overflow-hidden min-h-[160px]">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:12px_12px] opacity-40 pointer-events-none" />
                        
                        {/* Dynamic Voice Concentric Waves */}
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          {/* Outer Ring */}
                          <div 
                            className={`absolute inset-0 border border-dashed border-accent/30 rounded-full ${isPlaying ? 'animate-[voice-orb-spin_12s_linear_infinite]' : 'opacity-40'}`} 
                          />
                          {/* Mid Ring */}
                          <div 
                            className="absolute w-[80%] h-[80%] rounded-full border border-accent2/25 flex items-center justify-center"
                            style={{
                              animation: isPlaying ? 'voice-pulse-ring 2.5s ease-in-out infinite' : 'none'
                            }}
                          />
                          {/* Core Speaking Orb */}
                          <div 
                            className={`w-14 h-14 rounded-full bg-gradient-to-br from-accent via-accent2 to-accent/80 flex items-center justify-center shadow-lg relative ${isPlaying ? 'animate-[speech-glow-pulse_2s_ease-in-out_infinite]' : 'shadow-accent/20 border border-white/15'}`}
                          >
                            <div className="absolute inset-1 rounded-full bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center">
                              {isPlaying ? (
                                <Activity className="text-accent2 animate-pulse" size={20} />
                              ) : (
                                <Mic className="text-text3" size={18} />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-center z-10">
                          <span className="text-[9px] font-mono font-black uppercase tracking-wider text-text3 block">Vocal Profile Simulation</span>
                          <span className="text-xs font-black uppercase tracking-widest text-accent mt-0.5 block">
                            {[...VOICE_PROFILES, ...customProfiles].find(p => p.id === activeProfileId)?.name || 'Neutral / Raw'} Activated
                          </span>
                        </div>
                      </div>

                      {/* Right/Bottom: Acoustic biometric signature specs */}
                      <div className="md:col-span-7 flex flex-col justify-between p-4 bg-bg2/20 border border-border/40 rounded-xl">
                        <div className="flex flex-col gap-2.5">
                          <span className="text-[10px] font-black uppercase text-accent tracking-widest border-b border-border/40 pb-1.5 block text-left">Acoustic Signature Metrics</span>
                          
                          {(() => {
                            const spec = getAcousticSpec(activeProfileId, customProfiles);
                            return (
                              <div className="grid grid-cols-2 gap-3 text-left">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-mono text-text3 uppercase tracking-wider">Estimated Pitch (F0)</span>
                                  <span className="text-xs font-bold text-text font-mono mt-0.5">{spec.pitch}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-mono text-text3 uppercase tracking-wider">Phonation Class</span>
                                  <span className="text-xs font-bold text-text uppercase tracking-widest mt-0.5">{spec.voiceClass}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-mono text-text3 uppercase tracking-wider">Vocal Resonance</span>
                                  <span className="text-xs font-bold text-text uppercase tracking-widest mt-0.5">{spec.resonance}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-mono text-text3 uppercase tracking-wider">Vowel Space / Artic</span>
                                  <span className="text-xs font-bold text-text uppercase tracking-widest mt-0.5">{spec.articulation}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-mono text-text3 uppercase tracking-wider">Pitch Volatility (Jitter)</span>
                                  <span className="text-xs font-bold text-success font-mono mt-0.5">{spec.jitter}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-mono text-text3 uppercase tracking-wider">Amplitude Shimmer</span>
                                  <span className="text-xs font-bold text-success font-mono mt-0.5">{spec.shimmer}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Living Speech Transcript Card with Live Highlight Readout */}
                    <div className="flex flex-col gap-2 bg-neutral-900/90 border border-border/60 p-4 rounded-xl text-left">
                      <div className="flex items-center justify-between border-b border-border/45 pb-1.5">
                        <span className="text-[8px] font-mono text-text3 uppercase tracking-wider font-semibold">Active Speech Script / Text Readout</span>
                        <span className="text-[8px] font-mono text-accent2 uppercase tracking-wider font-black">AI Speech Generator</span>
                      </div>
                      
                      <div className="text-xs md:text-sm font-medium leading-relaxed text-text/90 italic py-2 max-h-[110px] overflow-y-auto font-sans pr-1">
                        {(() => {
                          const textToDisplay = lastGeneratedText || ttsText || "No text entered yet.";
                          const words = textToDisplay.split(" ");
                          const highlightedIndex = Math.floor((cursorPosition / 100) * words.length);
                          
                          return words.map((word, index) => {
                            const isCurrentWord = index === highlightedIndex && isPlaying;
                            const isPassedWord = index < highlightedIndex && isPlaying;
                            
                            return (
                              <span 
                                key={index} 
                                className={`inline-block mr-1.5 transition-all duration-150 ${
                                  isCurrentWord 
                                    ? 'text-accent2 font-bold scale-105 shadow-[0_0_8px_rgba(217,70,239,0.3)] px-1 rounded bg-accent2/10' 
                                    : isPassedWord 
                                      ? 'text-accent font-semibold' 
                                      : 'text-text/75'
                                }`}
                              >
                                {word}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Seek and Control Progress bar */}
                    <div className="relative w-full mt-2">
                      <div className="w-full h-2 bg-neutral-900 border border-border/80 rounded-full relative overflow-hidden group">
                        {/* Progress fill */}
                        <div 
                          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-accent to-accent2 transition-all duration-75 relative"
                          style={{ width: `${cursorPosition}%` }}
                        >
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white]" />
                        </div>
                        
                        {/* Interactive Drag Overlay */}
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          step="0.01"
                          value={cursorPosition}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setCursorPosition(val);
                            if (isPlaying && playerRef.current) {
                              playerRef.current.stop();
                              const dur = playerRef.current.buffer.duration;
                              const off = (val / 100) * dur;
                              playerRef.current.start(0, off);
                              playbackStartTimeRef.current = Tone.now();
                              positionOffsetRef.current = off;
                              if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
                              playbackTimeoutRef.current = setTimeout(() => {
                                setIsPlaying(false);
                                setCursorPosition(0);
                                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                              }, (dur - off) * 1000);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0"
                        />
                      </div>

                      {/* Studio Timeline Info Bar */}
                      <div className="flex justify-between items-center mt-2 px-0.5 text-[9px] font-mono font-black text-text3 tracking-wider select-none">
                        <span>{playerRef.current?.buffer.duration ? `0:${((cursorPosition / 100) * playerRef.current.buffer.duration).toFixed(2)}` : '0:00.00'}</span>
                        {isPlaying ? (
                          <span className="text-accent2 bg-accent2/10 px-2.5 py-0.5 rounded border border-accent2/20 uppercase tracking-widest text-[8px] animate-pulse">
                            SIMULATING TARGET ACOUSTICS
                          </span>
                        ) : (
                          <div className="flex gap-4 items-center">
                            <span className="text-text2/50 tracking-wide font-sans">CLICK & DRAG TO SEEK TRANSCRIPT</span>
                          </div>
                        )}
                        <span>
                          {playerRef.current?.buffer.duration 
                            ? `0:${playerRef.current.buffer.duration.toFixed(2)}` 
                            : '0:00.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-28 bg-neutral-950/40 rounded-xl border border-dashed border-border/30 flex items-center justify-center text-text3 text-xs italic font-mono select-none">
                    No vocal sample analyzed yet
                  </div>
                )}
              </div>
  
              <div className="flex flex-col gap-4">
                <div 
                  className="flex items-center justify-between cursor-pointer group hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors select-none"
                  onClick={() => setIsCleanupExpanded(!isCleanupExpanded)}
                >
                  <div className="flex items-center gap-2 text-accent2">
                    <Settings2 size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Clean Up Audio</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {cleanupMode !== 'None' && (
                      <span className="text-[9px] font-mono font-black uppercase text-accent2 tracking-widest bg-accent2/10 px-2.5 py-0.5 rounded border border-accent2/20 animate-pulse">
                        ● AI ENABLED
                      </span>
                    )}
                    {isCleanupExpanded ? (
                      <ChevronUp size={16} className="text-text3 group-hover:text-white transition-colors" />
                    ) : (
                      <ChevronDown size={16} className="text-text3 group-hover:text-white transition-colors" />
                    )}
                  </div>
                </div>

                {isCleanupExpanded && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCleanupMode(cleanupMode === 'Standard' ? 'None' : 'Standard')}
                      title="Clean up artifacts using Standard model"
                      className={`flex items-center justify-between p-2 px-3 rounded-lg border transition-all cursor-pointer group text-left relative overflow-hidden ${
                        cleanupMode === 'Standard'
                          ? 'bg-accent/15 border-accent text-accent'
                          : 'bg-neutral-900/50 border-strong text-text2 hover:border-accent hover:bg-accent/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Wand2 size={13} className={cleanupMode === 'Standard' ? 'animate-bounce text-accent' : 'text-text3 group-hover:text-accent'} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Fast Clean</span>
                      </div>
                      <span 
                        style={{ fontSize: '7.5px' }} 
                        className={`font-mono uppercase tracking-widest font-black px-1.5 py-0.5 rounded shrink-0 ${
                          cleanupMode === 'Standard' 
                            ? 'bg-accent text-neutral-950' 
                            : 'bg-neutral-800 text-text3 group-hover:bg-accent2/15 group-hover:text-accent2'
                        }`}
                      >
                        Standard
                      </span>
                    </button>

                    <button
                      onClick={() => setCleanupMode(cleanupMode === 'Deep' ? 'None' : 'Deep')}
                      title="Professional enhanced clean up using Deep model"
                      className={`flex items-center justify-between p-2 px-3 rounded-lg border transition-all cursor-pointer group text-left relative overflow-hidden ${
                        cleanupMode === 'Deep'
                          ? 'bg-accent/15 border-accent text-accent'
                          : 'bg-neutral-900/50 border-strong text-text2 hover:border-accent hover:bg-accent/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={13} className={cleanupMode === 'Deep' ? 'animate-bounce text-accent' : 'text-text3 group-hover:text-accent'} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Enhanced Clean</span>
                      </div>
                      <span 
                        style={{ fontSize: '7.5px' }} 
                        className={`font-mono uppercase tracking-widest font-black px-1.5 py-0.5 rounded shrink-0 ${
                          cleanupMode === 'Deep' 
                            ? 'bg-accent text-neutral-950' 
                            : 'bg-neutral-800 text-text3 group-hover:bg-accent/15 group-hover:text-accent'
                        }`}
                      >
                        Deep Clean
                      </span>
                    </button>
                  </div>
                )}
              </div>
              
                            {/* Voice Profiles */}
              <div className="flex flex-col gap-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent">
                    <Sparkles size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Voice Profiles</span>
                  </div>
                  <button 
                    onClick={() => setIsEditProfilesMode(!isEditProfilesMode)}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
                      isEditProfilesMode 
                        ? 'bg-red-500/10 border-red-500/35 text-red-400 hover:bg-red-500/20' 
                        : 'bg-bg/60 border-border/60 text-text3 hover:text-accent hover:border-accent/40'
                    }`}
                  >
                    <Settings2 size={11} />
                    {isEditProfilesMode ? 'Done' : 'Edit Profiles'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {[...VOICE_PROFILES, ...customProfiles].map(profile => {
                    const isActive = activeProfileId === profile.id;
                    return (
                      <div key={profile.id} className="relative group/profile">
                        <button
                          onClick={() => applyProfile(profile.id)}
                          className={`w-full flex flex-col items-center justify-center gap-2 p-4 border rounded-xl transition-all cursor-pointer ${
                            isActive 
                              ? 'border-accent bg-accent/10 shadow-[0_4px_15px_rgba(var(--accent-rgb),0.1)]' 
                              : 'border-border/50 bg-bg/40 hover:border-accent/40 hover:bg-white/5'
                          }`}
                        >
                          <span className={`text-3xl transition-transform ${isActive ? 'scale-110' : 'group-hover/profile:scale-110 group-hover/profile:-rotate-3'}`}>
                            {profile.icon}
                          </span>
                          <div className="text-center w-full min-w-0">
                            <span className={`block text-[10px] font-black uppercase tracking-widest truncate w-full ${isActive ? 'text-accent' : 'text-text'}`}>
                              {profile.name}
                            </span>
                          </div>
                        </button>
                        {isEditProfilesMode && profile.id.startsWith('custom_') && (
                          <button
                            onClick={(e) => handleDeleteProfile(profile.id, e)}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 z-10 shadow-md cursor-pointer"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setIsCreatingProfile(true)}
                    className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent rounded-xl transition-all cursor-pointer group/add"
                  >
                    <Plus size={24} className="text-accent transition-transform group-hover/add:scale-110" />
                    <div className="text-center w-full min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-accent truncate w-full">
                        New Profile
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreatingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-bg3 border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative flex flex-col p-6 animate-in zoom-in-95 duration-200 text-left">
            <button 
              onClick={() => {
                setIsCreatingProfile(false);
                setNewProfileCharacter("");
                setNewProfileStatus(null);
              }}
              className="absolute top-4 right-4 text-text3 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-2 text-accent mb-1 border-b border-border/45 pb-3">
              <Sparkles size={18} className="animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-wider">AI Voice Biometrics Lab</h4>
            </div>
            
            <p className="text-[10px] text-text3/80 font-mono uppercase tracking-wider mt-4 mb-2">Subject Name or Vocal Character Description</p>
            
            <input
              type="text"
              value={newProfileCharacter}
              onChange={(e) => setNewProfileCharacter(e.target.value)}
              placeholder="e.g. SpongeBob, voice of deep industrial diesel machine, smooth radio host..."
              className="w-full bg-bg/60 border border-border/80 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-accent text-text placeholder:text-text3/40 font-semibold"
              disabled={!!newProfileStatus}
            />
            
            <p className="text-[9px] text-text3 mt-2 leading-relaxed font-sans">
              Upon click, Gemini AI conducts deep bio-analysis to map fundamental frequency, glottal source shape, formants path, and prosodic accent matching your requested target strictly following the standard **VOICE BIOMETRIC & ACOUSTIC PROFILE** report standard.
            </p>

            {newProfileStatus && (
              <div className="mt-4 p-4 rounded-xl border border-accent/20 bg-accent/5 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 font-black uppercase text-accent font-mono text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping mr-2" />
                  {newProfileStatus}
                </div>
                <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-accent animate-pulse w-[85%]" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-border/45 pt-4">
              <button
                onClick={() => {
                  setIsCreatingProfile(false);
                  setNewProfileCharacter("");
                  setNewProfileStatus(null);
                }}
                className="px-4 py-2 rounded-lg bg-bg2 text-text3 hover:text-text hover:bg-neutral-800 text-[10px] font-black uppercase tracking-widest border border-border/40 transition-colors cursor-pointer"
                disabled={!!newProfileStatus}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateVoiceProfile}
                disabled={!newProfileCharacter.trim() || !!newProfileStatus}
                className="px-4 py-2 rounded-lg bg-accent text-neutral-950 hover:bg-accent-hover text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={12} />
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
