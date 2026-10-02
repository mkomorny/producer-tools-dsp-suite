// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioPeakNormalizeOptions {
  targetPeakDb: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyPeakNormalizer(buffer: AudioBuffer, options: AudioPeakNormalizeOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const targetPeakDb = Math.max(-12.0, Math.min(0.0, options.targetPeakDb));
  let Xmax = 0.0;
  const numChannels = buffer.numberOfChannels;
  const len = buffer.length;
  
  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const absVal = Math.abs(data[i]);
      if (absVal > Xmax) {
        Xmax = absVal;
      }
    }
  }
  
  if (Xmax === 0.0) {
    const silentBuffer = audioCtx.createBuffer(numChannels, len, buffer.sampleRate);
    for (let c = 0; c < numChannels; c++) silentBuffer.copyToChannel(buffer.getChannelData(c), c);
    return silentBuffer;
  }
  
  const A_target = Math.pow(10, targetPeakDb / 20);
  const G_norm = A_target / Xmax;
  
  const outBuffer = audioCtx.createBuffer(numChannels, len, buffer.sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    for (let i = 0; i < len; i++) {
      outData[i] = inData[i] * G_norm;
    }
  }
  
  return outBuffer;
}
