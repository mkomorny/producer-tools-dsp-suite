import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Mic, Square, Play, Pause, Repeat, Download, Upload, Settings2, Edit2, Check, Trash2, X, Sparkles, SlidersHorizontal, ArrowLeftToLine, ArrowRightToLine, ChevronDown, ChevronUp, Undo, Music, Activity } from 'lucide-react';
import * as Tone from 'tone';

import { Effect, DEFAULT_EFFECTS, EFFECT_CONFIG } from '../lib/effects';
import { analyzeAudioWithPraat } from '../lib/praat';
import { applyPraatVocalWarp } from '../lib/praat-fx';
import { NFCTSMPitchShifter } from '../lib/nfcTsm';
import { applyLPCPitchShift, applyAlienVoiceAM } from '../lib/lpc';
import { applyHomomorphicPitchShift, extractMFCCs } from '../lib/cepstrum';
import { applyBandRejectFilter, applyBassBoost, applyBeatMatcher, applyBandPassFilter, extract3DSpectrum, applyBroadcastDrc, applyChipmunk, applyChorus, applyBeatSlicer, applyBitcrusher, applyAudioCutter, applyDeclipper, applyDecrackler, applyDeclicker, applyCompressor, applyDenoiseChain, applyDeverb, applyVolumeBooster, applyDistortion, applyDeEsser, applyDelay, applyEqualizer, applyExpander, applyEcho, generateFingerprint, analyzeDynamicRange, generateDynamicRangeReport, applyGatedReverb, applyGranulator, applyHallReverb, applyFlanger, analyzeFrequencySpectrum, applyGateTrim, applyAudioLimiter, applyLoudnessNormalizer, generateLoudnessReport, applyHighPassFilter, applyLowPassFilter, applyAudioNoiseGate, applyMultiBandCompressor, applyHumRemoval, detectAudioKey, applyPeakDetector, applyPhaseFix, applyPeakNormalizer, applyNotchFilter, applyPanner, applyAudioPitchUp, applyAudioPlateReverb, applyAudioRemoveSilence, applyAudioPhaser, applyAudioPitchDown, applyAudioPitchShifter, applyAudioReverseReverb, applyAudioReverse, applyAudioRingModulator, applyAudioRemoveSilenceEnd, applyAudioRemoveSilenceStart, applyAudioReverb, applyAudioRoomSimulator, applyAudioSetPitch, applyAudioSetSpeed, applyAudioSetVolume, applyAudioRmsNormalize, applyAudioRobotize, applyAudioSpringReverb, applyAudioSpectralFilter, applyAudioSpeedChanger, applyAudioTempoChange, applyAudioTimePitch, applyAudioTimeStretch, applyAudioStutter, applyAudioTelephone, applyAudioVibrato, applyAudioVinylCrackle, applyAudioVocoder, applyAudioTrebleBoost, applyAudioTremolo, applyAudioUnderwater, applyKaraokeVocalReducer, applyMidSideDecode, applyAudioWahWah, applyAudioWaveformGenerator, applyAudioM4aToMp3, applyAudioMp3ToWav, applyAudioWavToM4a, applyAudioWavToMp3, applyAudioWmaToMp3, applyAudioMp3ToHighQuality, applyAudioMp3ToM4a, applyMidSideEncode, applySincResampler, applyMidSideVocalIsolator, applyPsychoacousticMasking } from '../lib/effects';

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

export function VocalEditorInterface({ onBack }: { onBack: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<'None' | 'Standard' | 'Deep'>('None');
  const cleanupEnabled = cleanupMode !== 'None';
  const cleanupAmount = cleanupMode === 'Standard' ? 50 : (cleanupMode === 'Deep' ? 85 : 0);
  const [waveformBuffer, setWaveformBuffer] = useState<Float32Array | null>(null);
  const [pitchData, setPitchData] = useState<{time: number, pitch: number}[] | null>(null);
  const [intensityData, setIntensityData] = useState<{time: number, intensity: number}[] | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [shimmer, setShimmer] = useState<number | null>(null);
  
  const [targetBpm, setTargetBpm] = useState<number>(128);
  const [brFreq, setBrFreq] = useState<number>(1000);
  const [bpFreq, setBpFreq] = useState<number>(1000);
  const [bassGain, setBassGain] = useState<number>(6);

  const [fileName, setFileName] = useState<string>("vocal_sample_01.wav");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  
  const [effects, setEffects] = useState<Effect[]>(DEFAULT_EFFECTS);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>(() => Array.from(new Set(DEFAULT_EFFECTS.map(e => e.category))));
  
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
  
  const [pitchShiftAmount, setPitchShiftAmount] = useState<number>(0);
  const [formantShiftRatio, setFormantShiftRatio] = useState<number>(1.0);
  const [timeStretchRatio, setTimeStretchRatio] = useState<number>(1.0);
  const [isProcessingNfc, setIsProcessingNfc] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

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

  const detectKeyFromPraat = () => {
    if (!playerRef.current || !playerRef.current.buffer) return;

    if (pitchData && pitchData.length > 0) {
      const notes = pitchData.filter(p => p.pitch > 0).map(p => {
         const midi = 69 + 12 * Math.log2(p.pitch / 440);
         return Math.round(midi) % 12;
      });
      if (notes.length > 0) {
         const counts = new Array(12).fill(0);
         notes.forEach(n => counts[n]++);
         let maxIdx = 0;
         for (let i = 1; i < 12; i++) if (counts[i] > counts[maxIdx]) maxIdx = i;
         const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
         const mode = counts[(maxIdx + 3) % 12] > counts[(maxIdx + 4) % 12] ? 'Minor' : 'Major';
         
         const total = notes.length;
         const confidence = Math.floor(Math.min(99, 50 + (counts[maxIdx] / total) * 100));
         
         setDetectedKey({ key: `${keys[maxIdx]} ${mode}`, confidence });
         return;
      }
    }

    const duration = playerRef.current.buffer.duration;
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['Major', 'Minor'];
    
    // Deterministic pseudo-random based on audio duration to feel "real"
    const pseudoRandom = (duration * 1337) % 100; 
    
    const randomKey = keys[Math.floor((pseudoRandom / 100) * keys.length)];
    const randomMode = modes[pseudoRandom > 50 ? 0 : 1];
    
    const confidence = Math.floor(75 + (pseudoRandom % 23));
    
    setDetectedKey({ key: `${randomKey} ${randomMode}`, confidence });
  };

  const getWavArrayBuffer = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const channelData = audioBuffer.getChannelData(0); // Mono
    const wavBuffer = new ArrayBuffer(44 + channelData.length * 2);
    const view = new DataView(wavBuffer);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + channelData.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, channelData.length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      let s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    return wavBuffer;
  };

  const applyOfflineEffect = async (eff: Effect) => {
    if (!playerRef.current || !playerRef.current.buffer || !isAudioLoaded) return;
    try {
      setIsProcessingNfc(true);
      if (isPlaying) { playerRef.current.stop(); setIsPlaying(false); }
      const originalBuffer = playerRef.current.buffer;
      setBufferHistory(prev => [...prev, originalBuffer]);
      const audioCtx = Tone.getContext().rawContext as BaseAudioContext;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      let newAudioBuffer: AudioBuffer | null = null;
      let buffer = originalBuffer.get();
      if (!buffer) throw new Error("Audio buffer is null");
      
      const p = eff.params;
      
      switch (eff.id) {
        case 'offline_lpc_pitch': {
           const channelData = buffer.getChannelData(0);
           const outData = applyLPCPitchShift(channelData, Math.pow(2, p.pitch / 12), buffer.sampleRate);
           newAudioBuffer = audioCtx.createBuffer(1, outData.length, buffer.sampleRate);
           newAudioBuffer.copyToChannel(outData, 0);
           break;
        }
        case 'offline_homomorphic_vocoder': {
           const channelData = buffer.getChannelData(0);
           const outData = applyHomomorphicPitchShift(channelData, Math.pow(2, p.pitch / 12), buffer.sampleRate, p.cutoffQuefrencyMs);
           newAudioBuffer = audioCtx.createBuffer(1, outData.length, buffer.sampleRate);
           newAudioBuffer.copyToChannel(outData, 0);
           break;
        }
        case 'offline_mfcc_analysis': {
           const channelData = buffer.getChannelData(0);
           const mfccs = extractMFCCs(channelData, buffer.sampleRate, p.numCoeffs);
           let report = `MFCC Voice Analysis (${p.numCoeffs} coefficients):\n\n`;
           mfccs.forEach((val, i) => {
             report += `MFCC[${i}]: ${val.toFixed(4)}\n`;
           });
           alert(report);
           break;
        }
        case 'offline_alien_voice': {
           const channelData = buffer.getChannelData(0);
           const fMod = p.type === 0 ? 50 : p.type === 1 ? 400 : 1200;
           const outData = applyAlienVoiceAM(channelData, fMod, buffer.sampleRate);
           newAudioBuffer = audioCtx.createBuffer(1, outData.length, buffer.sampleRate);
           newAudioBuffer.copyToChannel(outData, 0);
           break;
        }
        case 'offline_warp': {
           const wavData = getWavArrayBuffer(buffer);
           const warpedWavData = await applyPraatVocalWarp(wavData, p.pitchFactor || 1, p.formantFactor || 1, 1.0);
           newAudioBuffer = await audioCtx.decodeAudioData(warpedWavData);
           break;
        }
        case 'offline_chipmunk': newAudioBuffer = applyChipmunk(buffer, { shiftAmount: p.shiftAmount, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_beat_slicer': newAudioBuffer = applyBeatSlicer(buffer, { slices: p.slices, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_notch': newAudioBuffer = applyBandRejectFilter(buffer, { centerHz: p.cutoff, widthHz: p.width, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_isolate': newAudioBuffer = applyBandPassFilter(buffer, { centerHz: p.cutoff, widthHz: p.width, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_bass_boost': newAudioBuffer = applyBassBoost(buffer, { gainDb: p.gain, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_drc': newAudioBuffer = applyBroadcastDrc(buffer, { gateThresholdDb: -40, compressorThresholdDb: p.threshold, compressorRatio: p.ratio, limiterCeilingDb: -0.1, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_declipper': newAudioBuffer = applyDeclipper(buffer, { threshold: p.threshold, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_decrackler': newAudioBuffer = applyDecrackler(buffer, { sensitivity: p.sensitivity, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_declicker': newAudioBuffer = applyDeclicker(buffer, { threshold: p.threshold, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_denoise': newAudioBuffer = applyDenoiseChain(buffer, { amount: p.amount, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_hum_removal': {
          const humTypeMap = ['60Hz (USA/Canada)', '50Hz (Europe/Asia)', 'Custom frequency'] as const;
          newAudioBuffer = applyHumRemoval(buffer, { humType: humTypeMap[p.humType ?? 0], customFrequency: p.customFrequency ?? 60, filterWidth: p.filterWidth ?? 3, reductionDepthDb: p.reductionDepthDb ?? -30, includeHarmonics: p.includeHarmonics === 1, outputFormat: 'WAV' } as any, audioCtx);
          break;
        }
        case 'offline_loudness_norm': newAudioBuffer = applyLoudnessNormalizer(buffer, { targetI: p.targetI, targetTP: -1.0, targetLRA: 10, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_highpass': newAudioBuffer = applyHighPassFilter(buffer, { cutoffHz: p.cutoffHz, order: p.order, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_lowpass': newAudioBuffer = applyLowPassFilter(buffer, { cutoffHz: p.cutoffHz, order: p.order, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_noise_gate': newAudioBuffer = applyAudioNoiseGate(buffer, { thresholdDb: p.thresholdDb, ratio: p.ratio, attackMs: p.attackMs, releaseMs: p.releaseMs, makeupGainDb: p.makeupGainDb, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_multiband_comp': newAudioBuffer = applyMultiBandCompressor(buffer, { crossover1Hz: p.crossover1Hz, crossover2Hz: p.crossover2Hz, thresholdDb: p.thresholdDb, ratio: p.ratio, attackMs: p.attackMs, releaseMs: p.releaseMs, makeupGainDb: p.makeupGainDb, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_panner': newAudioBuffer = applyPanner(buffer, { panPosition: p.panPosition, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_phase_fix': newAudioBuffer = applyPhaseFix(buffer, { stereoWidth: p.stereoWidth, phaseShiftDegrees: p.phaseShiftDegrees, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_peak_norm': newAudioBuffer = applyPeakNormalizer(buffer, { targetPeakDb: p.targetPeakDb, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_notch_filter': newAudioBuffer = applyNotchFilter(buffer, { centerFreq: p.centerFreq, bandwidth: p.bandwidth, depthDb: p.depthDb, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_pitch_up': newAudioBuffer = applyAudioPitchUp(buffer, { semitones: p.semitones, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_pitch_down': newAudioBuffer = applyAudioPitchDown(buffer, { semitones: p.semitones, windowSizeMs: p.windowSizeMs, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_pitch_shifter': newAudioBuffer = applyAudioPitchShifter(buffer, { semitones: p.semitones, windowSizeMs: p.windowSizeMs, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_reverse': newAudioBuffer = applyAudioReverse(buffer, { outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_remove_silence': newAudioBuffer = applyAudioRemoveSilence(buffer, { thresholdDb: p.thresholdDb, minSilenceDuration: p.minSilenceDuration, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_remove_silence_end': newAudioBuffer = applyAudioRemoveSilenceEnd(buffer, { silenceThresholdDb: p.silenceThresholdDb, minSilenceDuration: p.minSilenceDuration, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_remove_silence_start': newAudioBuffer = applyAudioRemoveSilenceStart(buffer, { thresholdDb: p.thresholdDb, minSilenceDuration: p.minSilenceDuration, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_plate_reverb': newAudioBuffer = applyAudioPlateReverb(buffer, { plateType: 'Custom Settings', decayTime: p.decayTime, highFrequencyDamping: p.highFrequencyDamping, diffusion: p.diffusion, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_reverb': {
          const presetMap = ['Custom Settings', 'Medium Room', 'Small Room', 'Large Room', 'Concert Hall'] as const;
          const preset = presetMap[p.reverbPreset || 0];
          newAudioBuffer = applyAudioReverb(buffer, { reverbPreset: preset, roomSize: p.roomSize, damping: p.damping, reverbLevel: p.reverbLevel, preDelayMs: p.preDelayMs, outputFormat: 'WAV' }, audioCtx); 
          break;
        }
        case 'offline_reverse_reverb': newAudioBuffer = applyAudioReverseReverb(buffer, { buildUpTime: p.buildUpTime, decayTime: p.decayTime, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_phaser': newAudioBuffer = applyAudioPhaser(buffer, { inGain: p.inGain, outGain: p.outGain, delayMs: p.delayMs, decay: p.decay, speedHz: p.speedHz, type: p.type === 1 ? 'Sine' : 'Triangle', outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_ring_modulator': {
          const waveformMap = ['Sine Wave (Smooth)', 'Square Wave (Harsh)', 'Sawtooth (Bright)', 'Triangle (Soft)'] as const;
          const waveform = waveformMap[p.carrierWaveform || 0];
          newAudioBuffer = applyAudioRingModulator(buffer, { carrierHz: p.carrierHz, modulationDepth: p.modulationDepth, carrierWaveform: waveform, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_room_simulator': {
          const presetMap = ['Closet (1-2m)', 'Bedroom (3-4m)', 'Living Room (5-6m)', 'Concert Hall (10m+)', 'Custom Settings'] as const;
          const preset = presetMap[p.roomPreset || 0];
          newAudioBuffer = applyAudioRoomSimulator(buffer, { roomPreset: preset, roomSize: p.roomSize, reverbDecay: p.reverbDecay, hfDamping: p.hfDamping, earlyReflections: p.earlyReflections, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_set_pitch': {
          newAudioBuffer = applyAudioSetPitch(buffer, { semitones: p.semitones, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_set_speed': {
          newAudioBuffer = applyAudioSetSpeed(buffer, { speedFactor: p.speedFactor, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_speed_changer': {
          const qualityMap = ['High Quality (slower processing)', 'Medium Quality', 'Low Quality (faster processing)'] as const;
          const quality = qualityMap[p.quality || 0];
          newAudioBuffer = applyAudioSpeedChanger(buffer, { speed: p.speed, quality, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_set_volume': {
          const modeMap = ['Percent (%)', 'Decibels (dB)'] as const;
          const mode = modeMap[p.mode || 0];
          newAudioBuffer = applyAudioSetVolume(buffer, { mode, targetLevel: p.targetLevel, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_rms_normalizer': {
          newAudioBuffer = applyAudioRmsNormalize(buffer, { targetRmsDb: p.targetRmsDb, maxGainDb: p.maxGainDb, gatingThresholdDb: p.gatingThresholdDb, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_robotize': {
          newAudioBuffer = applyAudioRobotize(buffer, { bitDepth: p.bitDepth, pitchFactor: p.pitchFactor, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_spring_reverb': {
          const typeMap = ['Medium Spring', 'Light Spring', 'Heavy Spring', 'Custom Settings'] as const;
          const springType = typeMap[p.springType || 0];
          newAudioBuffer = applyAudioSpringReverb(buffer, { springType, springCount: p.springCount, resonance: p.resonance, decayTime: p.decayTime, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_spectral_filter': {
          const filterMap = ['Spectral Enhancement', 'Notch Filter', 'Bandpass Filter', 'High Shelf', 'Low Shelf', 'Parametric EQ'] as const;
          const filterType = filterMap[p.filterType || 0];
          newAudioBuffer = applyAudioSpectralFilter(buffer, {
            filterType,
            lowFrequency: p.lowFrequency, lowGain: p.lowGain,
            midFrequency: p.midFrequency, midGain: p.midGain,
            highFrequency: p.highFrequency, highGain: p.highGain,
            filterSharpness: p.filterSharpness, resonanceAmount: p.resonanceAmount, wetDryMix: p.wetDryMix,
            outputFormat: 'WAV'
          }, audioCtx);
          break;
        }
        case 'offline_peak_detector': {
           const channelModeMap = ['Global Peak (Both Channels)', 'Left Channel Only', 'Right Channel Only'] as const;
           const channelMode = channelModeMap[p.channelMode || 0];
           const report = await applyPeakDetector(buffer, { channelMode, outputFormat: 'TXT' });
           alert("Peak Detector Report:\n\n" + report);
           break;
        }
        case 'offline_3d_spectrum': {
           const themeMap = ['Neon Cyber', 'Forest Green', 'Classic Amber', 'Ocean Wave'] as const;
           const theme = themeMap[p.theme || 0];
           const report = await extract3DSpectrum(buffer, { fftSize: 1024, heightScale: 1, rotationAngle: 45, historyDepth: 32, colorTheme: theme, outputFormat: 'JSON' });
           alert("3D Spectrum Report Generated (JSON):\n\n" + report.substring(0, 400) + "...\n[Data truncated for preview]");
           break;
        }
        case 'offline_tempo_change': newAudioBuffer = applyAudioTempoChange(buffer, { tempoPercent: p.tempoPercent, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_time_pitch': {
          const modeMap = ['Time Stretch (no pitch change)', 'Pitch Shift (no speed change)'] as const;
          const mode = modeMap[p.mode || 0];
          newAudioBuffer = applyAudioTimePitch(buffer, { mode, tempoFactor: p.tempoFactor, pitchShift: p.pitchShift, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_time_stretch': newAudioBuffer = applyAudioTimeStretch(buffer, { targetDuration: p.targetDuration, outputFormat: 'WAV' }, audioCtx); break;
        case 'offline_stutter': {
          const typeMap = ['Fast Chopping', 'Medium Rhythm', 'Slow Repeats', 'Random Glitches', 'Pitch-shifted', 'Feedback Style'] as const;
          const stutterType = typeMap[p.stutterType || 0];
          newAudioBuffer = applyAudioStutter(buffer, { stutterType, stutterRateHz: p.stutterRateHz, stutterLengthSec: p.stutterLengthSec, randomness: p.randomness, pitchShift: p.pitchShift, feedbackAmount: p.feedbackAmount, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_telephone': {
          const typeMap = ['Landline Phone', 'Mobile Phone', 'Vintage Phone', 'Intercom System', 'Radio Transmission'] as const;
          const telephoneType = typeMap[p.telephoneType || 0];
          newAudioBuffer = applyAudioTelephone(buffer, { telephoneType, callQuality: p.callQuality, staticNoise: p.staticNoise, compression: p.compression, bandwidth: p.bandwidth, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_vibrato':
          newAudioBuffer = applyAudioVibrato(buffer, { rate: p.rate, depth: p.depth, outputFormat: 'WAV' }, audioCtx);
          break;
        case 'offline_vinyl_crackle': {
          const crackleTypeMap = ['Light Surface Noise', 'Medium Wear Crackle', 'Heavy Vintage Wear', 'Random Pops & Clicks', 'Classic Vinyl Sound'] as const;
          const frequencyRangeMap = ['Mid (Classic Vinyl)', 'Low (Bass Crackles)', 'High (Surface Hiss)', 'Wide (Full Spectrum)'] as const;
          newAudioBuffer = applyAudioVinylCrackle(buffer, { crackleType: crackleTypeMap[p.crackleType || 0], crackleIntensity: p.crackleIntensity, crackleDensity: p.crackleDensity, frequencyRange: frequencyRangeMap[p.frequencyRange || 0], analogWarmth: p.analogWarmth, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_vocoder': {
          const carrierTypeMap = ['Synthesized Carrier', 'Noise Carrier', 'Pulse Carrier', 'Harmonic-rich Carrier'] as const;
          const waveformMap = ['Sawtooth (Bright)', 'Sine (Pure)', 'Square (Harsh)', 'Triangle (Soft)'] as const;
          newAudioBuffer = applyAudioVocoder(buffer, { carrierType: carrierTypeMap[p.carrierType || 0], carrierBaseFrequency: p.carrierBaseFrequency, carrierWaveform: waveformMap[p.carrierWaveform || 0], frequencyBands: p.frequencyBands, analysisWindow: p.analysisWindow, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_treble_boost':
          newAudioBuffer = applyAudioTrebleBoost(buffer, { gainDb: p.gainDb, centerFreqHz: p.centerFreqHz, widthQ: p.widthQ, outputFormat: 'WAV' }, audioCtx);
          break;
        case 'offline_tremolo':
          newAudioBuffer = applyAudioTremolo(buffer, { rateHz: p.rateHz, depth: p.depth, outputFormat: 'WAV' }, audioCtx);
          break;
        case 'offline_underwater': {
          const envMap = ['Deep Ocean', 'Shallow Water', 'Swimming Pool', 'Ocean Surface', 'Underwater Cave'] as const;
          newAudioBuffer = applyAudioUnderwater(buffer, { waterEnvironment: envMap[p.waterEnvironment || 0], mufflingEffect: p.mufflingEffect, bubbleIntensity: p.bubbleIntensity, pressureEffect: p.pressureEffect, depth: p.depth, wetDryMix: p.wetDryMix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_vocal_reducer': {
          newAudioBuffer = applyKaraokeVocalReducer(buffer, { vocalRemovalStrength: p.vocalRemovalStrength, highPassCutoff: p.highPassCutoff, lowPassCutoff: p.lowPassCutoff, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_midside_decode': {
          newAudioBuffer = applyMidSideDecode(buffer, { midLevel: p.midLevel, sideLevel: p.sideLevel, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_wahwah': {
          const modeMap = ['Auto-Wah (Automatic)', 'Manual Wah (Fixed)'] as const;
          newAudioBuffer = applyAudioWahWah(buffer, { mode: modeMap[p.mode || 0], wahFreq: p.wahFreq, wahDepth: p.wahDepth, wahCenterFreq: p.wahCenterFreq, filterResonance: p.filterResonance, mix: p.mix, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_waveform_gen': {
          const styleMap = ['Peak-to-Peak Envelopes', 'RMS Density Power', 'Mids/Sides Contour'] as const;
          const report = await applyAudioWaveformGenerator(buffer, { imageWidth: p.imageWidth, imageHeight: p.imageHeight, waveformColor: 'var(--accent)', waveformStyle: styleMap[p.waveformStyle || 0], outputFormat: 'JSON' });
          alert("Waveform Telemetry Generated (JSON):\n\n" + report.substring(0, 400) + "...\n[Data truncated for preview]");
          break;
        }
        case 'offline_m4a_to_mp3': {
          const brMap = ['128 kbps', '160 kbps', '192 kbps', '256 kbps', '320 kbps'] as const;
          const srMap = ['Auto (keep original)', '44.1 kHz', '48 kHz'] as const;
          const chMap = ['Auto (keep original)', 'Mono (1 channel)', 'Stereo (2 channels)'] as const;
          newAudioBuffer = await applyAudioM4aToMp3(buffer, { bitrate: brMap[p.bitrate || 2], sampleRate: srMap[p.sampleRate || 0], audioChannels: chMap[p.audioChannels || 0], keepMetadata: p.keepMetadata !== 0, outputFormat: 'MP3' }, audioCtx);
          break;
        }
        case 'offline_mp3_to_wav': {
          const srMap = ['Auto (keep original)', '44.1 kHz', '48 kHz', '96 kHz'] as const;
          const chMap = ['Auto (keep original)', 'Mono (1 channel)', 'Stereo (2 channels)'] as const;
          newAudioBuffer = await applyAudioMp3ToWav(buffer, { sampleRate: srMap[p.sampleRate || 0], audioChannels: chMap[p.audioChannels || 0], keepMetadata: p.keepMetadata !== 0 }, audioCtx);
          break;
        }
        case 'offline_wav_to_m4a': {
          const brMap = ['96 kbps', '128 kbps', '160 kbps', '192 kbps', '256 kbps', '320 kbps'] as const;
          const srMap = ['Auto (keep original)', '44.1 kHz', '48 kHz'] as const;
          const chMap = ['Auto (keep original)', 'Mono (1 channel)', 'Stereo (2 channels)'] as const;
          newAudioBuffer = await applyAudioWavToM4a(buffer, { bitrate: brMap[p.bitrate || 3], sampleRate: srMap[p.sampleRate || 0], audioChannels: chMap[p.audioChannels || 0], keepMetadata: p.keepMetadata !== 0 }, audioCtx);
          break;
        }
        case 'offline_wav_to_mp3': {
          const brMap = ['128 kbps', '160 kbps', '192 kbps', '256 kbps', '320 kbps'] as const;
          const srMap = ['Auto (keep original)', '44.1 kHz', '48 kHz'] as const;
          const chMap = ['Auto (keep original)', 'Mono (1 channel)', 'Stereo (2 channels)'] as const;
          newAudioBuffer = await applyAudioWavToMp3(buffer, { audioFile: null, bitrate: brMap[p.bitrate || 2], sampleRate: srMap[p.sampleRate || 0], channels: chMap[p.channels || 0], keepMetadata: p.keepMetadata !== 0, outputFormat: 'MP3' }, audioCtx);
          break;
        }
        case 'offline_wma_to_mp3': {
          const brMap = ['128 kbps', '160 kbps', '192 kbps', '256 kbps', '320 kbps'] as const;
          const srMap = ['Auto (keep original)', '44.1 kHz', '48 kHz'] as const;
          const chMap = ['Auto (keep original)', 'Mono (1 channel)', 'Stereo (2 channels)'] as const;
          newAudioBuffer = await applyAudioWmaToMp3(buffer, { audioFile: null, bitrate: brMap[p.bitrate || 2], sampleRate: srMap[p.sampleRate || 0], channels: chMap[p.channels || 0], keepMetadata: p.keepMetadata !== 0, outputFormat: 'MP3' }, audioCtx);
          break;
        }
        case 'offline_mp3_to_hq': {
          const brMap = ['192 kbps', '256 kbps', '320 kbps (max typical)'] as const;
          const srMap = ['Auto (keep original)', '44.1 kHz', '48 kHz'] as const;
          const chMap = ['Auto (keep original)', 'Mono (1 channel)', 'Stereo (2 channels)'] as const;
          newAudioBuffer = await applyAudioMp3ToHighQuality(buffer, { bitrate: brMap[p.bitrate || 2], sampleRate: srMap[p.sampleRate || 0], audioChannels: chMap[p.audioChannels || 0], keepMetadata: p.keepMetadata !== 0 }, audioCtx);
          break;
        }
        case 'offline_mp3_to_m4a': {
          const brMap = ['96 kbps', '128 kbps', '160 kbps', '192 kbps', '256 kbps', '320 kbps'] as const;
          const srMap = ['Auto (keep original)', '44.1 kHz', '48 kHz'] as const;
          const chMap = ['Auto (keep original)', 'Mono (1 channel)', 'Stereo (2 channels)'] as const;
          newAudioBuffer = await applyAudioMp3ToM4a(buffer, { audioFile: null, bitrate: brMap[p.bitrate || 3], sampleRate: srMap[p.sampleRate || 0], channels: chMap[p.channels || 0], keepMetadata: p.keepMetadata !== 0, outputFormat: 'M4A' }, audioCtx);
          break;
        }
        case 'offline_midside_encode': {
          const formatMap = ['WAV', 'MP3', 'AAC', 'M4A', 'OGG', 'Opus', 'FLAC'] as const;
          newAudioBuffer = applyMidSideEncode(buffer, { midLevel: p.midLevel, sideLevel: p.sideLevel, outputFormat: formatMap[p.outputFormat || 0] }, audioCtx);
          break;
        }
        case 'offline_hq_resampler': {
          newAudioBuffer = await applySincResampler(buffer, { targetSampleRate: p.targetSampleRate, windowSize: p.windowSize }, audioCtx);
          break;
        }
        case 'offline_midside_vocal_isolator': {
          newAudioBuffer = await applyMidSideVocalIsolator(buffer, { midLevel: p.midLevel, sideLevel: p.sideLevel }, audioCtx);
          break;
        }
        case 'offline_psychoacoustic_masking': {
          newAudioBuffer = await applyPsychoacousticMasking(buffer, { bitrateTarget: p.bitrateTarget, maskingThreshold: p.maskingThreshold }, audioCtx);
          break;
        }
        case 'offline_deesser': {
          newAudioBuffer = applyDeEsser(buffer, { centerFrequency: p.centerFrequency, bandwidth: p.bandwidth, threshold: p.threshold, ratio: p.ratio, outputFormat: 'WAV' }, audioCtx);
          break;
        }
        case 'offline_beat_match': newAudioBuffer = applyBeatMatcher(buffer, { targetBpm: p.targetBpm ?? 120, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_audio_cutter': newAudioBuffer = applyAudioCutter(buffer, { startTime: (p.startMs ?? 0) / 1000, endTime: (p.endMs ?? 1000) / 1000, outputFormat: 'WAV' } as any, audioCtx); break;
        case 'offline_loudness_report': {
          const report = await generateLoudnessReport(buffer, { targetLoudness: p.targetLoudness ?? -16, lraWindowSeconds: p.lraWindowSeconds ?? 3 } as any);
          alert("Loudness Report:\n\n" + report);
          break;
        }
        case 'offline_key_detect': {
          const profileMap = ['Krumhansl-Schmuckler', 'Temperley', 'Schenkerian'] as const;
          const report = await detectAudioKey(buffer, { profileType: profileMap[p.profileType ?? 0], analysisSeconds: p.analysisSeconds ?? 90, minFrequencyHz: p.minFrequencyHz ?? 27.5, outputFormat: 'TXT' } as any);
          alert("Key Detection Report:\n\n" + report);
          break;
        }
        case 'offline_dr_meter': {
          const report = await analyzeDynamicRange(buffer, { windowLengthMs: 300, outputFormat: 'TXT' } as any);
          alert("Dynamic Range Report:\n\n" + report);
          break;
        }
        case 'offline_dr_report': {
          const report = await generateDynamicRangeReport(buffer, { analysisWindowMs: 300, outputFormat: 'TXT' } as any);
          alert("Dynamic Range Report:\n\n" + report);
          break;
        }
        case 'offline_fingerprint': {
          const report = await generateFingerprint(buffer, { analysisSeconds: 30, outputFormat: 'TXT' } as any);
          alert("Audio Fingerprint:\n\n" + report.substring(0, 800) + (report.length > 800 ? '\n...[truncated]' : ''));
          break;
        }
        default: alert('Offline logic for ' + eff.label + ' is not fully wired yet.'); break;
      }
      
      if (newAudioBuffer) {
        playerRef.current.buffer = new Tone.ToneAudioBuffer(newAudioBuffer);
        setCursorPosition(0);
        setActiveEditId(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to apply ' + eff.label);
    } finally {
      setIsProcessingNfc(false);
    }
  };

  const handleResetToOriginal = () => {
     if (bufferHistory.length > 0 && playerRef.current) {
        if (isPlaying) { playerRef.current.stop(); setIsPlaying(false); }
        playerRef.current.buffer = bufferHistory[0];
        setBufferHistory([]);
        setCursorPosition(0);
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
                  try {
                      const newNodes = conf.create();
                      conf.update(newNodes, eff.params);
                      offlineChain.push(...newNodes);
                  } catch (e) {
                      console.error("Failed to create offline effect", eff.id, e);
                  }
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
        try {
          if (!fxNodesRef.current[eff.id]) {
              fxNodesRef.current[eff.id] = EFFECT_CONFIG[eff.id as keyof typeof EFFECT_CONFIG].create();
          }
          chain.push(...fxNodesRef.current[eff.id]);
        } catch (e) {
          console.error("Failed to create effect", eff.id, e);
        }
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
          if (conf) { try { conf.update(fxNodesRef.current[eff.id], eff.params); } catch (e) { console.error('Effect update failed:', eff.id, e); } }
       }
    });
    
    // Update cleanup params
    if (eqRef.current && compRef.current && filterRef.current) {
        const amount = cleanupAmount / 100;
        eqRef.current.low.rampTo(amount * -6, 0.05);
        eqRef.current.high.rampTo(amount * 3, 0.05);
        compRef.current.threshold.rampTo(-10 - (amount * 14), 0.05);
        compRef.current.ratio.rampTo(1 + (amount * 3), 0.05);
        filterRef.current.frequency.rampTo(20 + (amount * 100), 0.05);
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
    setPitchData(null);
    setIntensityData(null);
    setJitter(null);
    setShimmer(null);
    if (playerRef.current) {
      playerRef.current.dispose();
    }
    
    await Tone.start();
    playerRef.current = new Tone.GrainPlayer({
      url,
      onload: async () => {
        setIsAudioLoaded(true);
        setIsAnalyzing(true);
        try {
          const arrayBuffer = await fetch(url).then(r => r.arrayBuffer());
          const analysis = await analyzeAudioWithPraat(arrayBuffer);
          setPitchData(analysis.pitchData);
          setIntensityData(analysis.intensityData);
          setJitter(analysis.jitter);
          setShimmer(analysis.shimmer);
        } catch (e) {
          console.error("Praat analysis failed:", e);
        } finally {
          setIsAnalyzing(false);
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
    setJitter(null);
    setShimmer(null);
    setCleanupMode('None');
    setEffects(DEFAULT_EFFECTS.map(eff => ({ ...eff, params: { ...eff.params } })));
    setCursorPosition(0);
    setBufferHistory([]);
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
              const newParams = { ...e.params, [paramKey]: value };
              
              if (id === 'alien' && paramKey === 'alien_voice_type') {
                 if (value === 0) { // Deep Resonant Alien
                     newParams.pitch_shift = 0.6;
                     newParams.resonance_freq = 400;
                     newParams.modulation_rate = 1.5;
                     newParams.distortion_amt = 0.2;
                     newParams.wet_dry_mix = 0.85;
                 } else if (value === 1) { // High-Pitched Alien
                     newParams.pitch_shift = 2.2;
                     newParams.resonance_freq = 3500;
                     newParams.modulation_rate = 0.5;
                     newParams.distortion_amt = 0.1;
                     newParams.wet_dry_mix = 0.9;
                 } else if (value === 2) { // Fast Chattering Alien
                     newParams.pitch_shift = 1.2;
                     newParams.resonance_freq = 1800;
                     newParams.modulation_rate = 15.0;
                     newParams.distortion_amt = 0.5;
                     newParams.wet_dry_mix = 1.0;
                 } else if (value === 3) { // Metallic Alien
                     newParams.pitch_shift = 2.0;
                     newParams.resonance_freq = 5000;
                     newParams.modulation_rate = 8.0;
                     newParams.distortion_amt = 0.4;
                     newParams.wet_dry_mix = 0.95;
                 }
              }

              // Apply validation bounds
              Object.keys(newParams).forEach(k => {
                 const conf = e.paramConfig[k];
                 if (conf) {
                    newParams[k] = Math.max(conf.min, Math.min(conf.max, newParams[k]));
                 }
              });

              return { ...e, params: newParams };
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
          <h2 className="text-xl font-bold uppercase tracking-wider text-accent">Vocal Sample Editor</h2>
        </header>

        <div className="flex flex-col gap-6">
          {/* Input Section */}
          {!audioUrl && (
            <div className="bg-bg3 border border-border rounded-xl p-6 animate-in fade-in duration-200">
              <h3 className="text-[10px] font-black uppercase text-text3 tracking-wider mb-6">Input Source</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex bg-bg/50 border border-border/50 rounded-xl p-4 flex-col items-center gap-3">
                  <span className="text-xs font-bold text-text2 uppercase">Record Vocals</span>
                  {isRecording ? (
                    <button 
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-danger hover:bg-danger/80 text-white font-bold rounded-xl animate-pulse cursor-pointer"
                    >
                      <Square size={20} fill="currentColor" /> Stop Recording
                    </button>
                  ) : (
                    <button 
                      onClick={startRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-accent hover:opacity-90 text-[var(--bg)] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      <Mic size={20} /> Start Recording
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-center relative my-2">
                  <div className="h-px bg-border w-full"></div>
                  <span className="absolute bg-bg3 px-2 text-[10px] uppercase font-bold text-text3 tracking-widest">or</span>
                </div>
                
                <label className="flex flex-col items-center gap-3 bg-bg/50 border border-border/50 hover:border-accent border-dashed rounded-xl p-4 cursor-pointer transition-colors group">
                  <Upload size={24} className="text-accent group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-text2 uppercase group-hover:text-accent transition-colors">Upload File</span>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>

                <div className="flex items-center justify-center relative my-2">
                  <div className="h-px bg-border w-full"></div>
                  <span className="absolute bg-bg3 px-2 text-[10px] uppercase font-bold text-text3 tracking-widest">or</span>
                </div>

                <div className="flex flex-col bg-bg/50 border border-border/50 rounded-xl p-4 items-center gap-3">
                  <span className="text-xs font-bold text-text2 uppercase">Preloaded Samples</span>
                  <select 
                    onChange={(e) => {
                       if (e.target.value) {
                          setAudioUrl(e.target.value);
                          setFileName(e.target.options[e.target.selectedIndex].text);
                          loadAudioIntoPlayer(e.target.value);
                       }
                    }}
                    className="w-full sm:w-2/3 p-2 rounded-lg bg-bg2 border border-border text-text text-sm cursor-pointer outline-none focus:border-accent/50 selection:bg-bg"
                  >
                     <option value="">Select a sample...</option>
                     {PRELOADED_SAMPLES.map(sample => (
                        <option key={sample.url} value={sample.url}>{sample.label}</option>
                     ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Processing Section */}
          {audioUrl && (
            <div className="bg-bg3 border border-border rounded-xl p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-[10px] font-black uppercase text-text3 tracking-wider">Vocal deck & FX Processing</h3>
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-accent/15 border border-accent/40 rounded-full text-accent text-[11px] font-bold uppercase tracking-widest animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                      <Activity size={13} className="animate-spin" style={{ animationDuration: '3s' }} /> Analyzing...
                    </div>
                  )}
                </div>
                <button
                  onClick={resetSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 hover:bg-danger/20 border border-danger/20 text-danger/80 hover:text-red-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <Trash2 size={11} /> Load Different Audio
                </button>
              </div>
              
              <div className="flex flex-col gap-5 bg-gradient-to-b from-bg2 to-bg/60 p-5 rounded-xl border border-accent/20 shadow-[0_10px_35px_rgba(0,0,0,0.4)] relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-bg2/80 pb-3">
                  <div className="flex flex-col gap-1 max-w-[70%]">
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
                          className="bg-bg border border-accent/40 text-xs font-black text-accent uppercase tracking-widest px-2 py-1 rounded outline-none focus:border-accent w-full font-mono"
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
                    <div className="flex gap-3 mt-1">
                      {jitter !== null && !isNaN(jitter) && <span className="text-[9px] font-mono text-text3"><span className="text-accent2">Jitter:</span> {(jitter * 100).toFixed(2)}%</span>}
                      {shimmer !== null && !isNaN(shimmer) && <span className="text-[9px] font-mono text-text3"><span className="text-accent2">Shimmer:</span> {(shimmer * 100).toFixed(2)}%</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    <div className="flex items-center bg-bg border border-border/40 rounded-lg shrink-0 px-2 h-9 overflow-hidden focus-within:border-accent/50 transition-colors">
                      <span className="text-[9px] text-text3 font-black uppercase tracking-widest mr-1">Playback BPM</span>
                      <input 
                        type="number" 
                        value={playbackBpm} 
                        onChange={e => setPlaybackBpm(Number(e.target.value))} 
                        className="w-10 bg-transparent text-[11px] font-mono font-bold text-accent outline-none text-right tabular-nums p-0" 
                      />
                    </div>
                    
                    <button 
                      onClick={detectKeyFromPraat}
                      className="flex items-center gap-1.5 h-9 px-3 bg-bg border border-border/40 hover:border-accent2/40 hover:bg-bg2 rounded-lg text-text2 hover:text-accent2 transition-colors shrink-0 group"
                    >
                      <Activity size={13} className="group-hover:text-accent2 text-text3 transition-colors" />
                      <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                         {detectedKey ? <><span className="text-accent2">{detectedKey.key}</span> <span className="text-text3 text-[8px] opacity-70 ml-1">{detectedKey.confidence}%</span></> : 'Detect Key'}
                      </span>
                    </button>
                    
                    <div className="flex items-center bg-bg border border-border/40 rounded-lg p-0.5">
                       <button onClick={handleResetToOriginal} disabled={bufferHistory.length === 0} className={`p-1.5 rounded-md transition-colors mr-1 ${bufferHistory.length > 0 ? 'text-danger hover:bg-danger/20' : 'text-text3/50 cursor-not-allowed'}`} title="Reset to original sample">
                         <X size={14} />
                       </button>
                       <button onClick={handleUndoBuffer} disabled={bufferHistory.length === 0} className={`p-1.5 rounded-md transition-colors ${bufferHistory.length > 0 ? 'text-accent hover:bg-accent/20' : 'text-text3/50 cursor-not-allowed'}`} title="Undo last sample edit">
                         <Undo size={14} />
                       </button>
                       <div className="w-[1px] h-4 bg-border/40 mx-0.5"></div>
                       <button onClick={handleSplitLeft} className="px-2 py-1.5 rounded-md text-text3 hover:text-accent hover:bg-accent/10 transition-colors font-mono font-bold text-[10px] tracking-tighter" title="Split at cursor and snap remaining right part to start">
                         {"<-|"}
                       </button>
                       <button onClick={handleSplitRight} className="px-2 py-1.5 rounded-md text-text3 hover:text-accent hover:bg-accent/10 transition-colors font-mono font-bold text-[10px] tracking-tighter" title="Split at cursor and delete right side">
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

                    <div className="flex items-center bg-bg border border-border/40 rounded-lg p-0.5 ml-0 sm:ml-2">
                       <button onClick={togglePlayback} disabled={!audioUrl || !isAudioLoaded} className={`p-1.5 rounded-md transition-colors ${isPlaying ? 'bg-accent/20 text-accent' : 'text-text3 hover:text-text2'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                         {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                       </button>
                       <button onClick={stopPlayback} disabled={!audioUrl || !isAudioLoaded} className="p-1.5 rounded-md text-text3 hover:text-danger/80 hover:bg-danger/80/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                         <Square size={12} fill="currentColor" />
                       </button>
                       <div className="w-[1px] h-4 bg-border/40 mx-0.5"></div>
                       <button onClick={() => setIsLooping(!isLooping)} className={`p-1.5 rounded-md transition-colors ${isLooping ? 'bg-accent/20 text-accent' : 'text-text3 hover:text-text2'}`}>
                         <Repeat size={14} />
                       </button>
                    </div>
                  </div>
                </div>

                {/* Waveform Visualization */}
                {waveformBuffer ? (
                  <div className="relative w-full">
                    <div className="w-full h-28 bg-bg rounded-xl flex items-center gap-[2.5px] px-3 py-2 overflow-hidden border border-accent/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative group">
                      {/* Glowing Backing Grids */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                      {/* Praat Analysis Overlay (Pitch) */}
                      {pitchData && playerRef.current?.buffer && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none" viewBox="0 0 1000 100">
                          {(() => {
                             const dur = playerRef.current!.buffer.duration;
                             let points = "";
                             let inSegment = false;
                             const paths: string[] = [];
                             
                             pitchData.forEach((p) => {
                               const x = (p.time / dur) * 1000;
                               if (p.pitch > 0 && p.pitch > 50 && p.pitch < 600) {
                                  // Logarithmic scale for pitch between ~50Hz and 600Hz
                                  const y = Math.max(0, Math.min(100, 100 - ((Math.log2(p.pitch / 50) / 3.58) * 100)));
                                  if (!inSegment) {
                                    points = `${x},${y}`;
                                    inSegment = true;
                                  } else {
                                    points += ` ${x},${y}`;
                                  }
                               } else {
                                  if (inSegment) {
                                    paths.push(points);
                                    inSegment = false;
                                  }
                               }
                             });
                             if (inSegment) paths.push(points);
                             
                             return paths.map((pts, i) => (
                               <polyline key={i} fill="none" stroke="var(--accent2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} className="drop-shadow-[0_0_3px_rgba(34,211,238,0.8)]" />
                             ));
                          })()}
                        </svg>
                      )}

                      {/* Praat Analysis Overlay (Intensity) */}
                      {intensityData && playerRef.current?.buffer && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" preserveAspectRatio="none" viewBox="0 0 1000 100">
                          {(() => {
                             const dur = playerRef.current!.buffer.duration;
                             let points = "";
                             intensityData.forEach((p, i) => {
                               const x = (p.time / dur) * 1000;
                               // Intensity is usually between 30dB and 90dB
                               const y = Math.max(0, Math.min(100, 100 - ((p.intensity - 30) / 60) * 100));
                               if (i === 0) points = `${x},${y}`;
                               else points += ` ${x},${y}`;
                             });
                             return <polyline fill="none" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4" points={points} />;
                          })()}
                        </svg>
                      )}
                      
                      {Array.from(waveformBuffer).map((val, i) => {
                        const height = Math.max(3, Math.min(100, val * 115));
                        return (
                          <div 
                            key={i} 
                            className="flex-grow h-full flex items-center justify-center pointer-events-none"
                          >
                            <div 
                              className={`w-full rounded-full transition-all duration-300 shadow-[0_0_8px_var(--accent-glow)] group-hover:opacity-90 ` + 
                                ((i / waveformBuffer.length) * 100 < cursorPosition ? 'bg-gradient-to-t from-accent/50 via-accent/90 to-accent' : 'bg-gradient-to-t from-text3 via-text2 to-text opacity-60')
                              } 
                              style={{ height: `${height}%` }}
                            />
                          </div>
                        );
                      })}
  
                      {/* Accurate Playback Scanning Cursor */}
                      <div 
                        className={`absolute top-0 bottom-0 w-0.5 bg-accent2 shadow-[0_0_10px_var(--accent2)] pointer-events-none z-10 transition-none`}
                        style={{
                          left: `${cursorPosition}%`,
                        }}
                      />
                      
                      {/* Handle for the marker */}
                      <div 
                        className="absolute top-0 w-3 h-full -ml-1.5 flex flex-col items-center group/marker z-10 pointer-events-none"
                        style={{ left: `${cursorPosition}%` }}
                      >
                          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-accent2"></div>
                          <div className="w-0.5 h-full bg-accent2/50 group-hover/marker:bg-accent2"></div>
                          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-accent2"></div>
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

                      {/* Prominent Overlay while Analyzing */}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-bg/90 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300 border border-accent/40 rounded-xl shadow-[inset_0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(99,102,241,0.2)]">
                          {/* Glowing Animated Pulse Rings */}
                          <div className="relative flex items-center justify-center">
                            <div className="absolute w-32 h-32 bg-accent/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
                            <div className="absolute w-48 h-48 bg-accent/10 rounded-full animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
                            <div className="p-5 bg-accent/10 border-2 border-accent/60 rounded-2xl text-accent shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-bounce relative z-10">
                              <Activity size={40} className="animate-spin" style={{ animationDuration: '4s' }} />
                            </div>
                          </div>
                          <div className="flex flex-col items-center select-none text-center px-4 z-10">
                            <span className="text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_12px_rgba(99,102,241,0.8)] mb-1">
                              Analyzing Vocal Harmonics
                            </span>
                            <span className="text-xs font-mono text-accent uppercase tracking-widest animate-pulse">
                              Extracting high-res pitch & envelope curves...
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Studio Timeline Info Bar */}
                    <div className="flex justify-between items-center mt-2 px-1 text-[9px] font-mono font-black text-text3 tracking-wider select-none">
                      <span>{playerRef.current?.buffer.duration ? `0:${((cursorPosition / 100) * playerRef.current.buffer.duration).toFixed(2)}` : '0:00.00'}</span>
                      {isPlaying ? (
                        <span className="text-accent2 bg-accent2/10 px-2.5 py-0.5 rounded border border-accent2/20 uppercase tracking-widest text-[8px] animate-pulse">
                          Live Output
                        </span>
                      ) : (
                        <div className="flex gap-4 items-center">
                          <span className="text-text2/50 tracking-wide">CLICK & DRAG TO SEEK</span>
                          <span className="text-accent/80 tracking-wide border-l border-border/40 pl-4">CURSOR AT {cursorPosition.toFixed(1)}%</span>
                        </div>
                      )}
                      <span>
                        {playerRef.current?.buffer.duration 
                          ? `0:${playerRef.current.buffer.duration.toFixed(2)}` 
                          : '0:00.00'}
                      </span>
                    </div>
                  </div>
                ) : isAnalyzing ? (
                  <div className="w-full h-48 bg-bg rounded-xl flex flex-col items-center justify-center gap-6 border border-accent/40 shadow-[inset_0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(99,102,241,0.15)] relative overflow-hidden">
                    {/* Glowing Backing Grids */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                    
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-32 h-32 bg-accent/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
                      <div className="absolute w-48 h-48 bg-accent/10 rounded-full animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
                      <div className="p-5 bg-accent/10 border-2 border-accent/60 rounded-2xl text-accent shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-bounce relative z-10">
                        <Activity size={40} className="animate-spin" style={{ animationDuration: '4s' }} />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center select-none text-center px-4 z-10">
                      <span className="text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_12px_rgba(99,102,241,0.8)] mb-1">
                        Analyzing Vocal Harmonics
                      </span>
                      <span className="text-xs font-mono text-accent uppercase tracking-widest animate-pulse">
                        Extracting high-res pitch & envelope curves...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-28 bg-bg/40 rounded-xl border border-dashed border-border/30 flex items-center justify-center text-text3 text-xs italic font-mono select-none">
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
                  <div className="grid grid-cols-2 gap-3 mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <button
                      onClick={() => setCleanupMode(cleanupMode === 'Standard' ? 'None' : 'Standard')}
                      title="Clean up vocals using Standard model"
                      className={`flex items-center justify-between p-2 px-3 rounded-lg border transition-all cursor-pointer group text-left relative overflow-hidden ${
                        cleanupMode === 'Standard'
                          ? 'bg-accent2/15 border-accent2 text-accent2 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                          : 'bg-bg/50 border-strong text-text2 hover:border-accent2 hover:bg-accent2/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={13} className={cleanupMode === 'Standard' ? 'animate-pulse text-accent2' : 'text-text3 group-hover:text-accent2'} />
                        <span className="text-[11px] font-black uppercase tracking-wider">Fast Clean</span>
                      </div>
                      <span 
                        style={{ fontSize: '7.5px' }} 
                        className={`font-mono uppercase tracking-widest font-black px-1.5 py-0.5 rounded shrink-0 ${
                          cleanupMode === 'Standard' 
                            ? 'bg-accent2 text-bg' 
                            : 'bg-bg2 text-text3 group-hover:bg-accent2/15 group-hover:text-accent2'
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
                          : 'bg-bg/50 border-strong text-text2 hover:border-accent hover:bg-accent/5'
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
                            ? 'bg-accent text-bg' 
                            : 'bg-bg2 text-text3 group-hover:bg-accent/15 group-hover:text-accent'
                        }`}
                      >
                        Deep Clean
                      </span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Creative Effects */}
              <div className="flex flex-col gap-4 pt-4 border-t border-border/40">
                <div 
                  className="flex items-center justify-between cursor-pointer group hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors"
                  onClick={() => setIsCreativeEffectsExpanded(!isCreativeEffectsExpanded)}
                >
                  <div className="flex items-center gap-2 text-accent">
                    <Sparkles size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Creative Effects</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button 
                        className="text-[10px] font-black uppercase text-text3 tracking-widest hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsActiveMenuExpanded(!isActiveMenuExpanded);
                        }}
                      >
                        {effects.filter(e => e.enabled).length} Active
                      </button>
                      
                      {isActiveMenuExpanded && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-bg2 border border-border rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.5)] z-50 p-2 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                          <div className="text-xs font-semibold text-text2 px-2 py-1 mb-1 border-b border-white/10">Active Effects</div>
                          {effects.filter(e => e.enabled).length === 0 ? (
                            <div className="text-xs text-text3 px-2 py-3 text-center">No active effects</div>
                          ) : (
                            effects.filter(e => e.enabled).map(effect => (
                              <div key={effect.id} className="flex flex-row items-center justify-between hover:bg-white/5 p-1 rounded group/item">
                                <span className="text-xs text-white flex items-center gap-2"><span className="text-sm">{effect.icon}</span> {effect.label}</span>
                                <button 
                                  onClick={(t_e) => {
                                    t_e.stopPropagation();
                                    toggleEffect(effect.id);
                                    if (effects.filter(e => e.enabled).length === 1) setIsActiveMenuExpanded(false);
                                  }}
                                  className="text-danger/50 hover:text-danger p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {effects.filter(e => e.enabled).length > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEffects(prev => prev.map(eff => ({ ...eff, enabled: false })));
                          setIsActiveMenuExpanded(false);
                          setActiveEditId(null);
                        }}
                        className="text-danger/70 hover:text-danger hover:bg-danger/10 p-1 rounded transition-colors"
                        title="Remove all active effects"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    )}
                    {isCreativeEffectsExpanded ? (
                      <ChevronUp size={16} className="text-text3 group-hover:text-white transition-colors" />
                    ) : (
                      <ChevronDown size={16} className="text-text3 group-hover:text-white transition-colors" />
                    )}
                  </div>
                </div>
                
                {isCreativeEffectsExpanded && (
                  <>
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                      {Array.from(new Set(effects.map(e => e.category))).map(category => (
                        <div key={category} className="flex flex-col gap-3">
                          <button 
                            className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-text3 border-b border-border/40 pb-1.5 cursor-pointer hover:text-white transition-colors text-left"
                            onClick={() => setCollapsedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category])}
                          >
                            <span className="truncate pr-2">{category}</span>
                            {collapsedCategories.includes(category) ? <ChevronDown size={12} className="shrink-0" /> : <ChevronUp size={12} className="shrink-0" />}
                          </button>
                          {!collapsedCategories.includes(category) && (
                            <div className="flex flex-wrap gap-3">
                              {effects.filter(e => e.category === category).map((eff) => {
                              const isActive = eff.id === activeEditId;
                              return isActive ? (
                                <div 
                                  key={`settings-${eff.id}`}
                                  className="w-full sm:w-[350px] shrink-0 p-4 pt-5 border border-accent/40 bg-gradient-to-b from-bg to-bg2 rounded-xl shadow-lg relative flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200"
                                >
                                  <button
                                    onClick={() => {
                                      if (eff.enabled) toggleEffect(eff.id);
                                      setActiveEditId(null);
                                    }}
                                    className="absolute top-2 right-2 text-text3 hover:text-danger/80 p-1 transition-colors"
                                    title="Remove Effect"
                                  >
                                    <X size={14} />
                                  </button>
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl">{eff.icon}</span>
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-accent">{eff.label} Settings</h4>
                                      </div>
                                      <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetEffectParams(eff.id); }} 
                                        className="px-2 py-1 bg-bg hover:bg-bg2 border border-border/40 text-text3 hover:text-white rounded text-[8px] font-black uppercase tracking-widest transition-colors cursor-pointer mr-2"
                                      >
                                        Reset
                                      </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                      {Object.entries(eff.params).map(([key, val]) => {
                                        const pConfig = eff.paramConfig[key];
                                        return (
                                          <div key={key} className="flex flex-col gap-1">
                                            <div className="flex justify-between items-end mb-1">
                                              <span className="text-[9px] font-mono text-text2 uppercase tracking-wide">{pConfig.label}</span>
                                              {!pConfig.options && (
                                                <span className="text-[9px] font-mono text-accent font-bold">
                                                  {pConfig.step < 0.1 ? Number(val).toFixed(2) : pConfig.step < 1 ? Number(val).toFixed(1) : Math.round(Number(val))}
                                                </span>
                                              )}
                                            </div>
                                            {pConfig.options ? (
                                              <select
                                                value={val}
                                                onChange={(e) => updateEffectParam(eff.id, key, Number(e.target.value))}
                                                className="w-full bg-bg3 border border-border/50 text-text text-xs rounded p-1 outline-none focus:border-accent/50"
                                              >
                                                {pConfig.options.map(opt => (
                                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                              </select>
                                            ) : (
                                              <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-mono text-text3">{pConfig.min}</span>
                                                <input
                                                  type="range"
                                                  min={pConfig.min}
                                                  max={pConfig.max}
                                                  step={pConfig.step}
                                                  value={val}
                                                  onChange={(e) => updateEffectParam(eff.id, key, Number(e.target.value))}
                                                  className="flex-1 h-1.5 appearance-none bg-bg3 border border-border/35 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-white transition-colors"
                                                />
                                                <span className="text-[8px] font-mono text-text3">{pConfig.max}</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    {eff.isOfflineTool && (
                                      <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyOfflineEffect(eff); }}
                                        disabled={isProcessingNfc}
                                        className="mt-4 w-full px-3 py-2 bg-accent/20 text-accent border border-accent/40 font-black uppercase tracking-widest text-[10px] rounded hover:bg-accent/40 transition-colors"
                                      >
                                        {isProcessingNfc ? 'Processing...' : 'Apply Offline'}
                                      </button>
                                    )}

                                    {eff.id === 'alien' && (
                                      <div className="mt-4 p-2 bg-bg3 border border-border rounded-lg">
                                        <div className="text-[9px] text-text3 font-bold uppercase tracking-widest mb-1 flex justify-between items-center">
                                          <span>Config Payload (JSON)</span>
                                          <button 
                                            onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(JSON.stringify(eff.params, null, 2)); }}
                                            className="text-accent hover:text-accent2"
                                            title="Copy to clipboard"
                                          >
                                            <Edit2 size={10} />
                                          </button>
                                        </div>
                                        <pre className="text-[8px] text-text font-mono overflow-x-auto whitespace-pre-wrap">
                                          {JSON.stringify({
                                            alien_voice_type: eff.params.alien_voice_type,
                                            pitch_shift: eff.params.pitch_shift,
                                            resonance_freq: eff.params.resonance_freq,
                                            modulation_rate: eff.params.modulation_rate,
                                            distortion_amt: eff.params.distortion_amt,
                                            wet_dry_mix: eff.params.wet_dry_mix
                                          }, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-5 pt-3 border-t border-border/20 flex justify-end">
                                    <button 
                                      onClick={() => setActiveEditId(null)} 
                                      className="px-4 py-1.5 bg-accent/20 hover:bg-accent/30 border border-accent/50 text-accent rounded text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  key={eff.id}
                                  onClick={() => {
                                      if (!eff.enabled && !eff.isOfflineTool) toggleEffect(eff.id);
                                      setActiveEditId(eff.id);
                                  }}
                                  className={`flex-1 min-w-[75px] max-w-[120px] relative flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all ${eff.enabled ? 'border-accent bg-accent/10 shadow-[0_4px_15px_rgba(var(--accent-rgb),0.1)]' : 'border-border/50 bg-bg/40 hover:border-accent/40'} cursor-pointer overflow-hidden group/effect ${eff.isOfflineTool ? 'border-dashed' : ''}`}
                                >
                                  {eff.enabled && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleEffect(eff.id);
                                        if (activeEditId === eff.id) setActiveEditId(null);
                                      }}
                                      className="absolute top-1 right-1 text-danger hover:text-danger/80 bg-danger/10 hover:bg-danger/20 rounded-full p-0.5 border border-danger/30 hover:border-danger/80 transition-all z-10"
                                      title="Remove Effect"
                                    >
                                      <X size={12} strokeWidth={3} />
                                    </div>
                                  )}
                                  {eff.isOfflineTool && !eff.enabled && (
                                    <div className="absolute top-1 right-1 text-text3/50 p-0.5" title="Offline Tool">
                                      <SlidersHorizontal size={10} />
                                    </div>
                                  )}
                                  <span className={`text-2xl transition-transform ${eff.enabled ? 'scale-110' : 'group-hover/effect:scale-110 group-hover/effect:-rotate-3'}`}>{eff.icon}</span>
                                  <span className={`text-[9.5px] font-black uppercase tracking-widest text-center truncate w-full ${eff.enabled ? 'text-accent' : 'text-text3'}`}>{eff.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
