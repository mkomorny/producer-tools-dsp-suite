// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioRemoveSilenceEndOptions {
  silenceThresholdDb: number;
  minSilenceDuration: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioRemoveSilenceEnd(buffer: AudioBuffer, options: AudioRemoveSilenceEndOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const thresholdDb = Math.max(-100.0, Math.min(-12.0, options.silenceThresholdDb));
  const minSilenceDur = Math.max(0.1, Math.min(10.0, options.minSilenceDuration));
  const fs = buffer.sampleRate;
  const reqSamples = Math.floor(minSilenceDur * fs);
  
  const numChannels = buffer.numberOfChannels;
  const Mend = buffer.length;
  const W = Math.floor(0.02 * fs); // 20ms

  let Icut = Mend;
  let silentCounter = 0;
  
  for (let m = 0; m < Math.floor(Mend / W); m++) {
    let maxRms = 0;
    for (let c = 0; c < numChannels; c++) {
      const data = buffer.getChannelData(c);
      let sumSq = 0;
      for (let n = 0; n < W; n++) {
        let idx = Mend - 1 - m * W - n;
        if (idx >= 0) sumSq += data[idx] * data[idx];
      }
      let rms = Math.sqrt(sumSq / W);
      maxRms = Math.max(maxRms, rms);
    }
    
    let db = 20 * Math.log10(Math.max(1e-5, maxRms));
    if (db <= thresholdDb) {
      silentCounter += W;
      if (silentCounter >= reqSamples) {
        Icut = Mend - 1 - m * W;
      }
    } else {
      break; 
    }
  }

  let newLength = Icut;
  const fadeLen = Math.floor(0.005 * fs); // 5ms fade out
  
  if (newLength < fadeLen) newLength = fadeLen;

  const outBuffer = audioCtx.createBuffer(numChannels, newLength, fs);
  
  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    for (let n = 0; n < newLength; n++) {
      if (n >= newLength - fadeLen) {
        let env = 1.0 - (n - (newLength - fadeLen)) / fadeLen;
        outData[n] = inData[n] * env;
      } else {
        outData[n] = inData[n];
      }
    }
  }

  return outBuffer;
}
