// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface BeatSlicerOptions {
  bpm: number;
  beatsPerSlice: number;
  slicePattern: 'Original Order' | 'Reverse' | 'Random' | 'Loop';
  loopCount: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyBeatSlicer(buffer: AudioBuffer, options: BeatSlicerOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const bpm = Math.max(40, Math.min(300, options.bpm));
  const beatsPerSlice = Math.max(1, Math.min(16, options.beatsPerSlice));
  const loopCount = Math.max(1, Math.min(32, options.loopCount));
  
  const sampleRate = buffer.sampleRate;
  const S_beat = (60 * sampleRate) / bpm;
  const S_slice = Math.floor(S_beat * beatsPerSlice);
  
  const K = Math.floor(buffer.length / S_slice);
  
  if (K === 0) return buffer; // Buffer too small to slice
  
  const maxTotalSlices = 10000;
  if (loopCount * K > maxTotalSlices) {
      throw new Error("Execution aborted: Array reconstruction exceeds safety limits.");
  }

  const patternMap: number[] = [];
  for (let k = 0; k < K; k++) {
    if (options.slicePattern === 'Original Order') patternMap.push(k);
    else if (options.slicePattern === 'Reverse') patternMap.push((K - 1) - k);
    else if (options.slicePattern === 'Random') patternMap.push(Math.floor(Math.random() * K));
    else if (options.slicePattern === 'Loop') patternMap.push(0);
  }

  const R = 256; // Crossfade window
  const totalOutLength = loopCount * K * S_slice;
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, totalOutLength, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let outIdx = 0;
    
    for (let lc = 0; lc < loopCount; lc++) {
      for (let k = 0; k < K; k++) {
        const sourceBlockIdx = patternMap[k];
        const sourceStart = sourceBlockIdx * S_slice;
        
        for (let i = 0; i < S_slice; i++) {
            let val = input[sourceStart + i] || 0;
            
            // OLA Crossfade
            if (i < R && outIdx > 0) {
                 const prevSourceBlockIdx = k === 0 ? (lc === 0 ? 0 : patternMap[K-1]) : patternMap[k-1];
                 const prevSourceStart = prevSourceBlockIdx * S_slice;
                 const prevVal = input[prevSourceStart + S_slice - R + i] || 0;
                 val = (1 - (i/R)) * prevVal + (i/R) * val;
            }
            
            if (outIdx < totalOutLength) {
                output[outIdx++] = val;
            }
        }
      }
    }
  }

  return outBuffer;
}
