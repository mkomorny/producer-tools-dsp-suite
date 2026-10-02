// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioPannerOptions {
  panPosition: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyPanner(buffer: AudioBuffer, options: AudioPannerOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const panPosition = Math.max(-1.0, Math.min(1.0, options.panPosition));
  const isMono = buffer.numberOfChannels === 1;
  const outBuffer = audioCtx.createBuffer(2, buffer.length, buffer.sampleRate);
  
  const theta = ((panPosition + 1.0) / 2.0) * (Math.PI / 2);
  const G_left = Math.cos(theta);
  const G_right = Math.sin(theta);
  
  const leftOut = outBuffer.getChannelData(0);
  const rightOut = outBuffer.getChannelData(1);
  
  if (isMono) {
    const monoIn = buffer.getChannelData(0);
    for (let i = 0; i < monoIn.length; i++) {
      leftOut[i] = monoIn[i] * G_left;
      rightOut[i] = monoIn[i] * G_right;
    }
  } else {
    const leftIn = buffer.getChannelData(0);
    const rightIn = buffer.getChannelData(1);
    for (let i = 0; i < leftIn.length; i++) {
      leftOut[i] = leftIn[i] * G_left;
      rightOut[i] = rightIn[i] * G_right;
    }
  }
  
  return outBuffer;
}
