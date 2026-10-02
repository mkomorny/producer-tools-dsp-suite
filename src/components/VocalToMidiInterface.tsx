import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { PianoRoll, PianoRollNote } from './PianoRoll';
import { processAudioBuffer, cleanMidiSequence } from '../lib/dsp';
import { exportRawMidi } from '../lib/midi';
import { Mic, Square, Play, Download, ArrowLeft, Sparkles, Magnet } from 'lucide-react';
import { InstrumentSelect } from './InstrumentSelect';
import { GM_MAP } from '../lib/gm_map';
import { logTransaction } from '../lib/costTracker';
import { resolveModelForRequest, AITask } from '../lib/modelRegistry';

export function VocalToMidiInterface({ onBack }: { onBack: () => void }) {
  const [notes, setNotes] = useState<PianoRollNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'normal' | 'ai' | null>(null);
  const [aiModelId, setAiModelId] = useState(() => localStorage.getItem('producer_lyria_selected_model_id') || 'lyria-3-clip-preview');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [instrument, setInstrument] = useState('Grand Piano');
  const [showCustom, setShowCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [adsr, setAdsr] = useState({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.2 });
  const [aiApiKeyName, setAiApiKeyName] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const samplers = useRef<Record<string, any>>({});
  const isPlaybackActiveRef = useRef(false);

  useEffect(() => {
    const updateActiveKeyName = () => {
      const activeKeyId = localStorage.getItem('producer_lyria_selected_key_id') || '';
      const savedKeysStr = localStorage.getItem('producer_lyria_api_keys') || '[]';
      try {
        const savedKeys = JSON.parse(savedKeysStr);
        const activeKeyObj = savedKeys.find((k: any) => k.id === activeKeyId);
        setAiApiKeyName(activeKeyObj ? activeKeyObj.name : '');

        const activeModel = localStorage.getItem('producer_lyria_selected_model_id');
        if (activeModel) {
          setAiModelId(activeModel);
        }
      } catch {
        setAiApiKeyName('');
      }
    };

    updateActiveKeyName();
    const interval = setInterval(updateActiveKeyName, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDawValue = (key: string, val: number) => {
    if (key === 'attack' || key === 'decay') {
      return val < 1.0 ? `${Math.round(val * 1000)} ms` : `${val.toFixed(2)} s`;
    }
    if (key === 'sustain') {
      return `${Math.round(val * 100)}%`;
    }
    if (key === 'release') {
      return val < 1.0 ? `${Math.round(val * 1000)} ms` : `${val.toFixed(2)} s`;
    }
    return val.toString();
  };

  const applyAdsr = useCallback((inst: any, customAdsr = adsr) => {
    if (!inst) return;
    try {
      if (inst.envelope) {
        inst.envelope.attack = customAdsr.attack;
        inst.envelope.decay = customAdsr.decay;
        inst.envelope.sustain = customAdsr.sustain;
        inst.envelope.release = customAdsr.release;
      }
      if (inst.attack !== undefined) inst.attack = customAdsr.attack;
      if (inst.release !== undefined) inst.release = customAdsr.release;
    } catch (err) {
      console.warn("Failed to apply ADSR", err);
    }
  }, [adsr]);

  useEffect(() => {
    Object.values(samplers.current).forEach(inst => applyAdsr(inst));
  }, [adsr, applyAdsr]);

  const loadInstrument = async (name: string) => {
    const gmId = GM_MAP[name];
    if (!gmId || samplers.current[name]) return;
    setLoading(true);
    
    return new Promise((resolve) => {
      const sampler = new Tone.Sampler({
          urls: { "C3": "C3.mp3", "C4": "C4.mp3", "C5": "C5.mp3" },
          baseUrl: `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/${gmId}-mp3/`,
          onload: () => {
            samplers.current[name] = sampler.toDestination();
            applyAdsr(sampler);
            setLoading(false);
            resolve(true);
          },
          onerror: () => { 
            setLoading(false); 
            resolve(false);
          }
      });
    });
  };

  const playSound = useCallback(async (midiNotes: number[], time: number) => {
    if (GM_MAP[instrument] && !samplers.current[instrument]) {
      await loadInstrument(instrument);
    }
    const freqNotes = midiNotes.map(n => Tone.Frequency(n, 'midi').toNote());
    try {
      if (samplers.current[instrument] && samplers.current[instrument].loaded) {
          samplers.current[instrument].triggerAttackRelease(freqNotes, '2n', time);
      }
    } catch (e) {
      console.warn("Audio buffer not loaded yet", e);
    }
  }, [instrument]);

  const startRecording = async (mode: 'normal' | 'ai') => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];
    
    mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
    mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        
        // Offline processing
        setLoading(true);
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const processedNotes = await processAudioBuffer(audioBuffer);
          const rawMidi = cleanMidiSequence(processedNotes);

          if (mode === 'ai') {
            const activeKeyId = localStorage.getItem('producer_lyria_selected_key_id') || '';
            const savedKeysStr = localStorage.getItem('producer_lyria_api_keys') || '[]';
            let savedKeys: any[] = [];
            try {
              savedKeys = JSON.parse(savedKeysStr);
            } catch {}
            const activeKeyObj = savedKeys.find((k: any) => k.id === activeKeyId);
            const apiKey = activeKeyObj ? activeKeyObj.apiKey : '';
            const provider = activeKeyObj ? activeKeyObj.provider : 'google';
            const requestedModel = activeKeyObj?.selectedModel || aiModelId || 'auto';
            const modelId = resolveModelForRequest(requestedModel, provider, 'music-structure' as AITask);
            const actualModelToCall = (provider === 'google' && (modelId.toLowerCase().includes('lyria') || modelId.toLowerCase().includes('music')))
              ? 'models/gemini-2.5-flash' : modelId;

            if (apiKey && modelId && rawMidi.length > 0) {
              let promptText = '';
              try {
                promptText = `
                  We have ran a local YIN pitch detector on a vocal audio recording.
                  It produced the following sequence of midi notes (note numbers, startTimes, and durations):
                  ${JSON.stringify(rawMidi)}
                  
                  Please perform high-level musical correction of this melody.
                  - Remove fast micro-shivers (multiple short overlapping notes of slightly different pitch representing vibrato/jitter).
                  - Merge adjacent notes that have identical or very close pitches if their onset is contiguous.
                  - Smooth out octave tracking errors (jumps of 12 semitones that revert instantly).
                  - Return STRICTLY a valid JSON object matching this schema, raw text only without triple backtick markdown wrapper blocks:
                  {
                    "notes": [
                      { "note": MIDI_NUMBER, "startTime": START_TIME_IN_SECONDS, "duration": DURATION_IN_SECONDS }
                    ]
                  }
                `;

                const response = await fetch(`/api/generate-text`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    promptText,
                    clientApiKey: apiKey,
                    clientProvider: provider,
                    modelId: modelId
                  })
                });

                if (response.ok) {
                  const resData = await response.json();
                  let replyText = resData.text;
                  if (replyText) {
                    if (replyText.includes("```")) {
                      replyText = replyText.replace(/```json/g, "").replace(/```/g, "").trim();
                    }
                    const parsed = JSON.parse(replyText);
                    if (parsed && Array.isArray(parsed.notes)) {
                      logTransaction({
                        modelId: modelId,
                        type: 'Vocal MIDI Alignment',
                        promptText: promptText,
                        responseText: replyText,
                        usageMetadata: resData?.usageMetadata,
                        success: true
                      });
                      const polished = parsed.notes.map((n: any) => ({
                        note: Number(n.note),
                        startTime: Number(n.startTime),
                        duration: Number(n.duration) || 0.25,
                        id: `vocal_ai_${Math.random().toString(36).substr(2, 6)}`
                      }));
                      setNotes(polished);
                      setLoading(false);
                      setRecordingMode(null);
                      return;
                    }
                  }
                } else {
                  logTransaction({
                    modelId: modelId,
                    type: 'Vocal MIDI Alignment',
                    promptText: promptText,
                    success: false
                  });
                }
              } catch (err) {
                console.warn("Vocal AI post-processing failed, using fallback clean algorithm", err);
                logTransaction({
                  modelId: modelId,
                  type: 'Vocal MIDI Alignment',
                  promptText: promptText,
                  success: false
                });
              }
            }

            // High-quality local algorithmic AI correction fallback
            const filtered = rawMidi.filter(n => n.duration > 0.08);
            const snappedAndDeduped: PianoRollNote[] = [];
            for (const n of filtered) {
              const prev = snappedAndDeduped[snappedAndDeduped.length - 1];
              const snappedMidi = Math.round(n.note);
              const roundedStart = Math.round(n.startTime * 8) / 8;
              const roundedDur = Math.max(0.125, Math.round(n.duration * 4) / 4);

              if (prev && Math.abs(prev.note - snappedMidi) <= 1 && (roundedStart - prev.startTime - prev.duration) < 0.1) {
                prev.duration = (roundedStart + roundedDur) - prev.startTime;
              } else {
                snappedAndDeduped.push({
                  id: n.id,
                  note: snappedMidi,
                  startTime: roundedStart,
                  duration: roundedDur
                });
              }
            }
            setNotes(snappedAndDeduped);
          } else {
            setNotes(rawMidi);
          }
        } catch (err) {
          console.error("Recording processing failed", err);
        }
        setLoading(false);
        setRecordingMode(null);
    };
    
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordingMode(mode);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  const playAudio = async () => {
    if (!recordedAudio || isPlaying) return;
    setIsPlaying(true);
    await Tone.start();
    
    const url = URL.createObjectURL(recordedAudio);
    const player = new Tone.Player(url, () => {
      player.start();
    }).toDestination();
    player.volume.value = 0;
    
    player.onstop = () => {
      setIsPlaying(false);
      player.dispose();
      URL.revokeObjectURL(url);
    };
  };

  const exportMidi = () => {
    const blob = exportRawMidi(notes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocal_capture.mid';
    a.click();
    URL.revokeObjectURL(url);
  };

  const snapToMidi = () => {
    if (notes.length === 0) return;
    const filtered = notes.filter(n => n.duration > 0.08);
    const snapped = filtered.map(n => {
      const snappedMidi = Math.round(n.note);
      const roundedStart = Math.round(n.startTime * 8) / 8;
      const roundedDur = Math.max(0.125, Math.round(n.duration * 4) / 4);
      return {
        ...n,
        note: snappedMidi,
        exactPitch: snappedMidi,
        startTime: roundedStart,
        duration: roundedDur
      };
    });
    setNotes(snapped);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setNotes(prev => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0 mb-8 font-sans">
      <div className="mb-4">
        <button onClick={onBack} className="text-text3 hover:text-text font-black uppercase text-[10px] bg-bg3 border border-border px-3 py-1.5 rounded-lg flex gap-2 items-center transition-colors">
          <ArrowLeft size={12}/> Back Launchpad
        </button>
      </div>
      <div className="p-3 sm:p-6 bg-bg2 text-text rounded-xl shadow-2xl border border-border relative">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wider text-accent2">Vocal To MIDI</h2>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Lyria Model Selector Slider */}
            <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[200px] max-w-xs bg-bg/80 border border-border/60 py-1.5 px-3 rounded-xl">
                <span className="text-[10px] font-black uppercase text-text3 tracking-wider text-center">Generation Model</span>
                <div className="relative w-full h-[22px] flex items-center bg-bg rounded p-0.5 border border-bg2">
                  <div 
                    className="absolute h-4 bg-accent2/30 rounded-sm transition-all duration-300 ease-in-out border border-accent2/40" 
                    style={{ 
                      width: '50%', 
                      left: aiModelId === 'lyria-3-clip-preview' ? '0%' : '50%'
                    }} 
                  />
                  <button 
                    onClick={() => setAiModelId('lyria-3-clip-preview')}
                    className={`flex-1 z-10 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${aiModelId === 'lyria-3-clip-preview' ? 'text-white' : 'text-text2 hover:text-accent2'}`}
                  >
                    Lyria 3
                  </button>
                  <button 
                    onClick={() => setAiModelId('lyria-3-pro-preview')}
                    className={`flex-1 z-10 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${aiModelId === 'lyria-3-pro-preview' ? 'text-white' : 'text-text2 hover:text-accent2'}`}
                  >
                    Lyria 3 Pro
                  </button>
                </div>
            </div>

            <InstrumentSelect 
              current={instrument}
              onSelect={async (val) => {
                  if (val === 'CUSTOM') setShowCustom(true);
                  else { 
                    setInstrument(val); 
                    setShowCustom(false); 
                    setAdsr({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.2 });
                    await loadInstrument(val); 
                  }
              }}
              showCustom={showCustom}
              customVal={customVal}
              onCustomChange={setCustomVal}
              onCustomSubmit={() => { 
                setInstrument(customVal); 
                setShowCustom(false); 
                setCustomVal(''); 
                setAdsr({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.2 });
              }}
              loading={loading}
            />

            {/* Standard pitch record button */}
            <button 
              onClick={isRecording ? stopRecording : () => startRecording('normal')} 
              disabled={isRecording && recordingMode !== 'normal'}
              className={`px-4 py-2 rounded-lg font-black uppercase text-xs flex gap-2 items-center transition-all cursor-pointer ${
                isRecording && recordingMode === 'normal' 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-bg2 hover:bg-bg3 text-white border border border-border/80'
              }`}
            >
              {isRecording && recordingMode === 'normal' ? <Square size={14}/> : <Mic size={14}/>} 
              {isRecording && recordingMode === 'normal' ? 'STOP' : 'Record'}
            </button>

            {/* AI assisted pitch record button */}
            <button 
              onClick={isRecording ? stopRecording : () => startRecording('ai')} 
              disabled={isRecording && recordingMode !== 'ai'}
              className={`px-4 py-2 rounded-lg font-black uppercase text-xs flex gap-2 items-center transition-all cursor-pointer border ${
                isRecording && recordingMode === 'ai' 
                  ? 'bg-red-500 border-red-600 text-white animate-pulse' 
                  : 'bg-accent/15 border border-accent/40 hover:bg-accent/25 text-accent hover:scale-[1.02]'
              }`}
            >
              {isRecording && recordingMode === 'ai' ? <Square size={14}/> : <Sparkles size={14} className="text-accent" />} 
              {isRecording && recordingMode === 'ai' ? 'STOP' : 'Record AI'}
            </button>

            <button onClick={playAudio} disabled={!recordedAudio || isPlaying} className="px-4 py-2 bg-bg2 rounded-lg font-black uppercase text-xs flex gap-2 items-center disabled:opacity-50">
                <Play size={14}/> {isPlaying ? 'PLAYING...' : 'PLAYBACK'}
            </button>
            <button onClick={snapToMidi} disabled={notes.length === 0} className="px-4 py-2 bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25 rounded-lg font-black uppercase text-xs flex gap-2 items-center disabled:opacity-50 cursor-pointer">
                <Magnet size={14}/> SNAP TO MIDI
            </button>
            <button onClick={exportMidi} disabled={notes.length === 0} className="px-4 py-2 bg-bg2 rounded-lg font-black uppercase text-xs flex gap-2 items-center disabled:opacity-50">
                <Download size={14}/> EXPORT MIDI
            </button>
          </div>
      </header>

      {/* ADSR Controls */}
      <div className="mb-4 pt-2 border-b border-border/50 pb-4">
        <div className="flex justify-between items-center mb-1 px-0.5">
          <span className="text-[10px] font-black uppercase text-text tracking-wider">Envelope Controls</span>
          <button onClick={() => setAdsr({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.2 })} className="text-[9px] font-mono text-text2 hover:text-white uppercase tracking-widest cursor-pointer">Reset</button>
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 gap-2 bg-bg p-2 border border-bg rounded-xl max-w-sm">
          {[ 
            { label: 'Attack', key: 'attack', min: 0.01, max: 2, step: 0.01 },
            { label: 'Decay', key: 'decay', min: 0.01, max: 2, step: 0.01 },
            { label: 'Sustain', key: 'sustain', min: 0, max: 1, step: 0.01 },
            { label: 'Release', key: 'release', min: 0.1, max: 5, step: 0.1 }
          ].map(param => (
            <div key={param.key} className="flex flex-col items-center gap-1 group bg-bg/60 p-1.5 rounded-lg border border-bg2/40 text-center">
              <span className="text-[8px] font-black text-text group-hover:text-accent transition-colors uppercase tracking-wider leading-none mb-0.5">{param.label}</span>
              <span className="text-[8px] font-mono text-accent font-extrabold leading-none mb-1.5 select-none">{formatDawValue(param.key, (adsr as any)[param.key])}</span>
              <input 
                type="range" 
                min={param.min} 
                max={param.max} 
                step={param.step}
                value={(adsr as any)[param.key]}
                onChange={(e) => setAdsr(prev => ({ ...prev, [param.key]: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-bg2 rounded-full appearance-none cursor-pointer accent-accent hover:opacity-90 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <PianoRoll 
        notes={notes} 
        setNotes={setNotes} 
        onUndo={() => setNotes(notes.slice(0, -1))}
        playSound={playSound}
        isRecording={isRecording}
        setIsRecording={() => {}}
        isPlaybackActiveRef={isPlaybackActiveRef}
      />
    </div>
    </div>
  );
}
