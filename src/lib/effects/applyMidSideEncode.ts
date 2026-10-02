// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioMidSideEncodeOptions {
  midLevel: number;
  sideLevel: number;
  outputFormat: 'WAV' | 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC';
}

export function applyMidSideEncode(buffer: AudioBuffer, options: AudioMidSideEncodeOptions, ctx: BaseAudioContext): AudioBuffer {
  if (buffer.numberOfChannels !== 2) {
    throw new Error("Mid/Side encoding requires a stereo source file.");
  }
  const midL = Math.max(0.0, Math.min(1.0, options.midLevel));
  const sideL = Math.max(0.0, Math.min(1.0, options.sideLevel));
  
  const outBuffer = ctx.createBuffer(2, buffer.length, buffer.sampleRate);
  const inL = buffer.getChannelData(0);
  const inR = buffer.getChannelData(1);
  const outMid = outBuffer.getChannelData(0);
  const outSide = outBuffer.getChannelData(1);
  
  for (let i = 0; i < buffer.length; i++) {
    const yM = (inL[i] + inR[i]) * midL;
    const yS = (inL[i] - inR[i]) * sideL;
    
    outMid[i] = yM;
    outSide[i] = yS;
  }
  return outBuffer;
}
