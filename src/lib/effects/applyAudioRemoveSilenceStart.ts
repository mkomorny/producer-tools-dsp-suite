// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioRemoveSilenceStartOptions {
  thresholdDb: number;
  minSilenceDuration: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioRemoveSilenceStart(buffer: AudioBuffer, options: AudioRemoveSilenceStartOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const thresholdDb = Math.max(-100.0, Math.min(-5.0, options.thresholdDb));
  const minSilenceDur = Math.max(0.1, Math.min(30.0, options.minSilenceDuration));
  const fs = buffer.sampleRate;
  const Dsamples = Math.floor(minSilenceDur * fs);
  const numChannels = buffer.numberOfChannels;
  const Ntotal = buffer.length;

  let nStart = 0;
  let sustainedCounter = 0;
  
  for (let n = 0; n < Ntotal; n++) {
    let maxAbs = 0;
    for (let c = 0; c < numChannels; c++) {
      maxAbs = Math.max(maxAbs, Math.abs(buffer.getChannelData(c)[n]));
    }
    let db = 20 * Math.log10(maxAbs + 1e-7);
    
    if (db >= thresholdDb) {
      sustainedCounter++;
      if (sustainedCounter >= Dsamples) {
        nStart = n - sustainedCounter + 1;
        break;
      }
    } else {
      sustainedCounter = 0;
    }
  }
  
  if (nStart < 0) nStart = 0;

  const newLength = Ntotal - nStart;
  const outBuffer = audioCtx.createBuffer(numChannels, Math.max(1, newLength), fs);

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    for (let m = 0; m < newLength; m++) {
      outData[m] = inData[m + nStart];
    }
  }

  return outBuffer;
}
