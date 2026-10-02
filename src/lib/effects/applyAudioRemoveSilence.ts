// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioRemoveSilenceOptions {
  thresholdDb: number;
  minSilenceDuration: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioRemoveSilence(buffer: AudioBuffer, options: AudioRemoveSilenceOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const thresholdDb = Math.max(-100.0, Math.min(-5.0, options.thresholdDb));
  const minSilenceDur = Math.max(0.1, Math.min(30.0, options.minSilenceDuration));
  const fs = buffer.sampleRate;
  const Dsamples = Math.floor(minSilenceDur * fs);
  const V = Math.floor(0.01 * fs); 

  const numChannels = buffer.numberOfChannels;
  const len = buffer.length;

  let isSilent = new Uint8Array(len);
  let silentCounter = 0;
  
  for (let n = 0; n < len; n++) {
    let maxAbs = 0;
    for (let c = 0; c < numChannels; c++) {
      maxAbs = Math.max(maxAbs, Math.abs(buffer.getChannelData(c)[n]));
    }
    let db = 20 * Math.log10(maxAbs + 1e-7);
    if (db < thresholdDb) {
      silentCounter++;
    } else {
      silentCounter = 0;
    }
    if (silentCounter >= Dsamples) {
      for (let j = n - silentCounter + 1; j <= n; j++) {
        if (j >= 0) isSilent[j] = 1;
      }
    }
  }

  let validSegments: {start: number, end: number}[] = [];
  let inValid = false;
  let start = 0;
  
  for (let n = 0; n < len; n++) {
    if (!isSilent[n] && !inValid) {
      inValid = true;
      start = n;
    } else if (isSilent[n] && inValid) {
      inValid = false;
      validSegments.push({start, end: n});
    }
  }
  if (inValid) validSegments.push({start, end: len});
  
  if (validSegments.length === 0) {
     return audioCtx.createBuffer(numChannels, 1, fs);
  }

  let outLen = 0;
  for (let i = 0; i < validSegments.length; i++) {
    let segLen = validSegments[i].end - validSegments[i].start;
    outLen += segLen;
    if (i > 0) outLen -= V;
  }
  
  const outBuffer = audioCtx.createBuffer(numChannels, Math.max(1, outLen), fs);

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    
    let writeIdx = 0;
    for (let i = 0; i < validSegments.length; i++) {
      let seg = validSegments[i];
      let readIdx = seg.start;
      
      if (i > 0) {
        for (let m = 0; m < V; m++) {
          if (writeIdx - V + m < outLen && readIdx < seg.end) {
             let outVal = outData[writeIdx - V + m];
             let inVal = inData[readIdx++];
             outData[writeIdx - V + m] = (1 - m/V) * outVal + (m/V) * inVal;
          }
        }
      }
      
      while (readIdx < seg.end && writeIdx < outLen) {
        outData[writeIdx++] = inData[readIdx++];
      }
    }
  }
  
  return outBuffer;
}
