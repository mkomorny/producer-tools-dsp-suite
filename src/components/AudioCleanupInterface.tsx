import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Upload, Play, Pause, Square, Download, Activity, Mic, Settings2 } from 'lucide-react';
import * as Tone from 'tone';
import {
  applyDenoiseChain,
  applyDeclicker,
  applyDecrackler,
  applyDeclipper,
  applyAudioNoiseGate,
  applyHumRemoval,
  applyDeEsser,
  applyDeverb
} from '../lib/effects';

export function AudioCleanupInterface({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<Tone.ToneAudioBuffer | null>(null);
  const [waveformBuffer, setWaveformBuffer] = useState<Float32Array | null>(null);
  
  const playerRef = useRef<Tone.Player | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup Options State
  const [denoise, setDenoise] = useState({ enabled: false, amount: 50 });
  const [declick, setDeclick] = useState({ enabled: false, threshold: 0.1 });
  const [decrackle, setDecrackle] = useState({ enabled: false, sensitivity: 0.5 });
  const [declip, setDeclip] = useState({ enabled: false, threshold: -0.5 });
  const [noiseGate, setNoiseGate] = useState({ enabled: false, threshold: -40 });
  const [humRemoval, setHumRemoval] = useState({ enabled: false, freq: 0 }); // 0 = 60Hz, 1 = 50Hz
  const [deEsser, setDeEsser] = useState({ enabled: false, threshold: -20 });
  const [deverb, setDeverb] = useState({ enabled: false, amount: 50 });

  useEffect(() => {
    return () => stopPlayback();
  }, []);

  const updateProgress = useCallback(() => {
    if (playerRef.current && playerRef.current.state === 'started') {
      setCurrentTime(Tone.Transport.seconds);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const stopPlayback = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
      setCurrentTime(0);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  };

  const togglePlayback = async () => {
    if (!processedBuffer) return;
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    
    if (isPlaying && playerRef.current) {
      playerRef.current.stop();
      setIsPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      if (!playerRef.current) {
        playerRef.current = new Tone.Player(processedBuffer).toDestination();
      }
      playerRef.current.buffer = processedBuffer;
      playerRef.current.start();
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const loadAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
    const audioCtx = Tone.getContext().rawContext as BaseAudioContext;
    const buffer = await audioCtx.decodeAudioData(arrayBuffer);
    setOriginalBuffer(buffer);
    setProcessedBuffer(new Tone.ToneAudioBuffer(buffer));
    
    const channelData = buffer.getChannelData(0);
    const downsampled = new Float32Array(Math.min(200, channelData.length));
    const step = Math.floor(channelData.length / downsampled.length);
    for (let i = 0; i < downsampled.length; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += Math.abs(channelData[i * step + j]);
      }
      downsampled[i] = sum / step;
    }
    setWaveformBuffer(downsampled);
    stopPlayback();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const arrayBuffer = await f.arrayBuffer();
    await loadAudioBuffer(arrayBuffer);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          await loadAudioBuffer(arrayBuffer);
          setFile(new File([audioBlob], 'recorded_audio.webm', { type: 'audio/webm' }));
          stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Microphone access denied or error:", error);
        alert("Could not access microphone.");
      }
    }
  };

  const applyCleanup = async () => {
    if (!originalBuffer) return;
    setIsProcessing(true);
    stopPlayback();
    
    try {
      const audioCtx = Tone.getContext().rawContext as BaseAudioContext;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      let currentBuffer = originalBuffer;

      if (noiseGate.enabled) {
        currentBuffer = applyAudioNoiseGate(currentBuffer, { thresholdDb: noiseGate.threshold, ratio: 4, attackMs: 2, releaseMs: 150, makeupGainDb: 0, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }
      if (declick.enabled) {
        currentBuffer = applyDeclicker(currentBuffer, { threshold: declick.threshold, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }
      if (decrackle.enabled) {
        currentBuffer = applyDecrackler(currentBuffer, { sensitivity: decrackle.sensitivity, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }
      if (declip.enabled) {
        currentBuffer = applyDeclipper(currentBuffer, { threshold: declip.threshold, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }
      if (humRemoval.enabled) {
        const humTypeMap = ['60Hz (USA/Canada)', '50Hz (Europe/Asia)'];
        currentBuffer = applyHumRemoval(currentBuffer, { humType: humTypeMap[humRemoval.freq], customFrequency: humRemoval.freq === 0 ? 60 : 50, filterWidth: 3, reductionDepthDb: -30, includeHarmonics: true, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }
      if (denoise.enabled) {
        currentBuffer = applyDenoiseChain(currentBuffer, { amount: denoise.amount, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }
      if (deEsser.enabled) {
        currentBuffer = applyDeEsser(currentBuffer, { centerFrequency: 6000, bandwidth: 2000, threshold: deEsser.threshold, ratio: 5, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }
      if (deverb.enabled) {
        currentBuffer = applyDeverb(currentBuffer, { amount: deverb.amount, outputFormat: 'WAV' } as any, audioCtx) || currentBuffer;
      }

      setProcessedBuffer(new Tone.ToneAudioBuffer(currentBuffer));
      
      const channelData = currentBuffer.getChannelData(0);
      const downsampled = new Float32Array(Math.min(200, channelData.length));
      const step = Math.floor(channelData.length / downsampled.length);
      for (let i = 0; i < downsampled.length; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += Math.abs(channelData[i * step + j]);
        }
        downsampled[i] = sum / step;
      }
      setWaveformBuffer(downsampled);
      
    } catch (e) {
      console.error(e);
      alert('Error applying cleanup.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getWavArrayBuffer = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
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
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * numChannels * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        let s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }
    return wavBuffer;
  };

  const exportWav = () => {
    if (!processedBuffer) return;
    const wavBuffer = getWavArrayBuffer(processedBuffer.get()!);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (file?.name.replace(/\.[^/.]+$/, "") || "cleaned_audio") + "_repaired.wav";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-bg2 rounded-full transition-colors group">
          <ArrowLeft className="w-5 h-5 text-text2 group-hover:text-text" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-text tracking-tight flex items-center gap-3">
            <Activity className="w-6 h-6 text-[var(--accent)]" />
            Audio Cleanup & Repair
          </h1>
          <p className="text-text2 text-sm mt-1">Remove background noise, clicks, hum, and restore clipped audio.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
        {/* LEFT COLUMN - UPLOAD/RECORD AND WAVEFORM */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {!originalBuffer ? (
             <div className="flex flex-col gap-4">
                <label className="flex flex-col items-center justify-center h-48 sm:h-64 border-2 border-dashed border-border hover:border-[var(--accent)] rounded-xl bg-bg2 hover:bg-bg3 transition-colors cursor-pointer group">
                  <Upload className="w-10 h-10 text-text3 group-hover:text-[var(--accent)] mb-4 transition-colors" />
                  <span className="text-text group-hover:text-[var(--accent)] font-medium mb-1">Upload Audio File</span>
                  <span className="text-text3 text-sm">MP3, WAV, M4A, OGG</span>
                  <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                </label>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[1px] flex-1 bg-border/50"></div>
                  <span className="text-text3 text-xs uppercase tracking-widest font-bold">OR</span>
                  <div className="h-[1px] flex-1 bg-border/50"></div>
                </div>
                <button
                  onClick={toggleRecording}
                  className={`flex items-center justify-center gap-3 h-16 rounded-xl font-bold uppercase tracking-wider transition-colors ${
                    isRecording 
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50' 
                      : 'bg-bg2 text-text hover:bg-bg3 border border-border hover:border-[var(--accent)]'
                  }`}
                >
                  {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                  {isRecording ? 'Stop Recording' : 'Record Audio'}
                </button>
             </div>
          ) : (
            <div className="bg-bg2 rounded-xl p-6 border border-border flex flex-col gap-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <button
                     onClick={togglePlayback}
                     className="w-12 h-12 flex items-center justify-center bg-[var(--accent)] hover:brightness-110 text-white rounded-full transition-all"
                   >
                     {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                   </button>
                   <div>
                     <div className="font-medium text-text">{file?.name || 'recorded_audio.webm'}</div>
                     <div className="text-xs text-text3 font-mono">
                       {processedBuffer ? (processedBuffer.duration).toFixed(2) + 's' : '0.00s'}
                     </div>
                   </div>
                 </div>
                 <button
                   onClick={() => { setOriginalBuffer(null); setProcessedBuffer(null); setWaveformBuffer(null); stopPlayback(); }}
                   className="text-text3 hover:text-red-400 text-sm flex items-center gap-2 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                 >
                   <Square className="w-4 h-4" /> Discard
                 </button>
               </div>
               
               {/* Waveform */}
               <div className="h-32 bg-bg border border-border rounded-lg relative overflow-hidden flex items-end">
                 {waveformBuffer ? (
                   <div className="w-full h-full flex items-end gap-[1px] p-2">
                     {Array.from(waveformBuffer).map((val, i) => (
                       <div key={i} className="flex-1 bg-[var(--accent)] rounded-t-sm" style={{ height: `${Math.max(2, val * 100)}%`, opacity: 0.8 }} />
                     ))}
                   </div>
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-text3 text-sm">No waveform data</div>
                 )}
               </div>
               
               <div className="flex justify-end">
                  <button onClick={exportWav} className="flex items-center gap-2 px-4 py-2 bg-success/20 text-success hover:bg-success/30 rounded-lg font-bold text-sm tracking-wider uppercase transition-colors">
                    <Download className="w-4 h-4" /> Export WAV
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - CLEANUP MODULES */}
        <div className="flex flex-col bg-bg2 rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-bg/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
            <h3 className="font-bold text-text flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-text2" /> Repair Modules
            </h3>
            <button 
              onClick={applyCleanup}
              disabled={!originalBuffer || isProcessing}
              className="px-4 py-1.5 bg-[var(--accent)] hover:brightness-110 text-white rounded font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProcessing ? 'Processing...' : 'Apply Processing'}
            </button>
          </div>
          
          <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            {/* Denoise */}
            <div className={`p-4 rounded-lg border transition-colors ${denoise.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={denoise.enabled} onChange={e => setDenoise({...denoise, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">Denoise (Spectral)</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Amount</span>
                 <input type="range" min="0" max="100" value={denoise.amount} onChange={e => setDenoise({...denoise, amount: Number(e.target.value)})} className="flex-1 accent-[var(--accent)]" disabled={!denoise.enabled} />
                 <span className="text-xs font-mono text-text2 w-8 text-right">{denoise.amount}%</span>
               </div>
            </div>

            {/* Noise Gate */}
            <div className={`p-4 rounded-lg border transition-colors ${noiseGate.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={noiseGate.enabled} onChange={e => setNoiseGate({...noiseGate, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">Noise Gate</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Thresh</span>
                 <input type="range" min="-80" max="0" value={noiseGate.threshold} onChange={e => setNoiseGate({...noiseGate, threshold: Number(e.target.value)})} className="flex-1 accent-[var(--accent)]" disabled={!noiseGate.enabled} />
                 <span className="text-xs font-mono text-text2 w-8 text-right">{noiseGate.threshold}dB</span>
               </div>
            </div>

            {/* Declicker */}
            <div className={`p-4 rounded-lg border transition-colors ${declick.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={declick.enabled} onChange={e => setDeclick({...declick, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">Declicker</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Thresh</span>
                 <input type="range" min="0.01" max="0.5" step="0.01" value={declick.threshold} onChange={e => setDeclick({...declick, threshold: Number(e.target.value)})} className="flex-1 accent-[var(--accent)]" disabled={!declick.enabled} />
                 <span className="text-xs font-mono text-text2 w-8 text-right">{declick.threshold.toFixed(2)}</span>
               </div>
            </div>

            {/* Decrackler */}
            <div className={`p-4 rounded-lg border transition-colors ${decrackle.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={decrackle.enabled} onChange={e => setDecrackle({...decrackle, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">Decrackler</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Sens.</span>
                 <input type="range" min="0" max="1" step="0.05" value={decrackle.sensitivity} onChange={e => setDecrackle({...decrackle, sensitivity: Number(e.target.value)})} className="flex-1 accent-[var(--accent)]" disabled={!decrackle.enabled} />
                 <span className="text-xs font-mono text-text2 w-8 text-right">{decrackle.sensitivity.toFixed(2)}</span>
               </div>
            </div>

            {/* Declipper */}
            <div className={`p-4 rounded-lg border transition-colors ${declip.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={declip.enabled} onChange={e => setDeclip({...declip, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">Declipper</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Thresh</span>
                 <input type="range" min="-12" max="0" step="0.1" value={declip.threshold} onChange={e => setDeclip({...declip, threshold: Number(e.target.value)})} className="flex-1 accent-[var(--accent)]" disabled={!declip.enabled} />
                 <span className="text-xs font-mono text-text2 w-8 text-right">{declip.threshold.toFixed(1)}</span>
               </div>
            </div>

            {/* De-Esser */}
            <div className={`p-4 rounded-lg border transition-colors ${deEsser.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={deEsser.enabled} onChange={e => setDeEsser({...deEsser, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">De-Esser</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Thresh</span>
                 <input type="range" min="-40" max="0" value={deEsser.threshold} onChange={e => setDeEsser({...deEsser, threshold: Number(e.target.value)})} className="flex-1 accent-[var(--accent)]" disabled={!deEsser.enabled} />
                 <span className="text-xs font-mono text-text2 w-8 text-right">{deEsser.threshold}dB</span>
               </div>
            </div>

            {/* Deverb */}
            <div className={`p-4 rounded-lg border transition-colors ${deverb.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={deverb.enabled} onChange={e => setDeverb({...deverb, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">Deverb (De-Room)</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Amount</span>
                 <input type="range" min="0" max="100" value={deverb.amount} onChange={e => setDeverb({...deverb, amount: Number(e.target.value)})} className="flex-1 accent-[var(--accent)]" disabled={!deverb.enabled} />
                 <span className="text-xs font-mono text-text2 w-8 text-right">{deverb.amount}%</span>
               </div>
            </div>

            {/* Hum Removal */}
            <div className={`p-4 rounded-lg border transition-colors ${humRemoval.enabled ? 'bg-bg border-[var(--accent)]/50' : 'bg-bg/50 border-border/50 opacity-70'}`}>
               <div className="flex items-center justify-between mb-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={humRemoval.enabled} onChange={e => setHumRemoval({...humRemoval, enabled: e.target.checked})} className="accent-[var(--accent)] w-4 h-4" />
                   <span className="font-medium text-text">Hum Removal</span>
                 </label>
               </div>
               <div className="flex items-center gap-4">
                 <span className="text-xs text-text3 font-mono w-12">Freq</span>
                 <select 
                    value={humRemoval.freq} 
                    onChange={e => setHumRemoval({...humRemoval, freq: Number(e.target.value)})}
                    className="flex-1 bg-bg border border-border rounded px-2 py-1 text-sm text-text"
                    disabled={!humRemoval.enabled}
                 >
                   <option value={0}>60Hz (USA/Canada)</option>
                   <option value={1}>50Hz (Europe/Asia)</option>
                 </select>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
