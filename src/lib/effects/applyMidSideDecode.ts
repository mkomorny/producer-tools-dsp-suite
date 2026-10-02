// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface MidSideDecodeOptions {
  midLevel: number;
  sideLevel: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyMidSideDecode(buffer: AudioBuffer, options: MidSideDecodeOptions, ctx: BaseAudioContext): AudioBuffer {
  if (buffer.numberOfChannels < 2) {
    throw new Error("Stereo file containing M/S components required");
  }
  const midL = Math.max(0.0, Math.min(2.0, options.midLevel));
  const sideL = Math.max(0.0, Math.min(2.0, options.sideLevel));
  
  const outBuffer = ctx.createBuffer(2, buffer.length, buffer.sampleRate);
  const inM = buffer.getChannelData(0);
  const inS = buffer.getChannelData(1);
  const outL = outBuffer.getChannelData(0);
  const outR = outBuffer.getChannelData(1);
  
  for (let i = 0; i < buffer.length; i++) {
    const yM = inM[i] * midL;
    const yS = inS[i] * sideL;
    
    let L = (yM + yS) * 0.7071;
    let R = (yM - yS) * 0.7071;
    
    outL[i] = Math.max(-1.0, Math.min(1.0, L));
    outR[i] = Math.max(-1.0, Math.min(1.0, R));
  }
  return outBuffer;
}
