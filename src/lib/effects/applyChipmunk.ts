// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface ChipmunkOptions {
  chipmunkFactor: number;
  outGain: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyChipmunk(buffer: AudioBuffer, options: ChipmunkOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const chipmunkFactor = Math.max(1.05, Math.min(2.5, options.chipmunkFactor));
  const outGain = Math.max(0.0, Math.min(1.0, options.outGain));
  
  const inLength = buffer.length;
  const outLength = Math.floor(inLength / chipmunkFactor);
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, outLength, buffer.sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let p = 0;
    for (let n = 0; n < outLength; n++) {
      const I = Math.floor(p);
      const f = p - I;
      
      let sample = 0;
      if (I >= 0 && I + 1 < inLength) {
        sample = (1 - f) * input[I] + f * input[I + 1];
      }
      
      output[n] = sample * outGain;
      p += chipmunkFactor;
    }
  }
  
  return outBuffer;
}
