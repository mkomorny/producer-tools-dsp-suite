// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface DeclipperOptions {
  detectionSensitivity: number;
  recoveryLevel: 'Conservative' | 'Balanced' | 'Maximum';
  postProcessingHeadroom: number;
  outputFormat: 'MP3' | 'WAV' | 'FLAC' | 'AAC' | 'OGG' | 'M4A';
}

export function applyDeclipper(buffer: AudioBuffer, options: DeclipperOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const detectionSensitivity = Math.max(0.95, Math.min(1.0, options.detectionSensitivity));
  const postProcessingHeadroom = Math.max(-12.0, Math.min(0.0, options.postProcessingHeadroom));
  const g_headroom = Math.pow(10, postProcessingHeadroom / 20);
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    output.set(input);
    
    let clipStart = -1;
    for (let n = 0; n < input.length; n++) {
      if (Math.abs(input[n]) >= detectionSensitivity) {
        if (clipStart === -1) clipStart = n;
      } else {
        if (clipStart !== -1) {
          const clipEnd = n - 1;
          const clipLen = clipEnd - clipStart + 1;
          
          if (clipLen > 0 && clipLen <= 100) {
            const p0 = Math.max(0, clipStart - 1);
            const p1 = Math.min(input.length - 1, clipEnd + 1);
            const y0 = input[p0];
            const y1 = input[p1];
            
            for (let i = clipStart; i <= clipEnd; i++) {
              const fraction = (i - p0) / (p1 - p0);
              output[i] = y0 + fraction * (y1 - y0);
            }
          }
          clipStart = -1;
        }
      }
    }
    
    for (let n = 0; n < output.length; n++) {
      output[n] *= g_headroom;
    }
  }
  
  return outBuffer;
}
