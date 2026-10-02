// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioPhaseFixOptions {
  stereoWidth: number;
  phaseShiftDegrees: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyPhaseFix(buffer: AudioBuffer, options: AudioPhaseFixOptions, audioCtx: BaseAudioContext): AudioBuffer {
  if (buffer.numberOfChannels !== 2) {
    throw new Error("Phase adjustment requires a stereo source file.");
  }
  
  const stereoWidth = Math.max(0.0, Math.min(2.0, options.stereoWidth));
  const phaseShiftDegrees = Math.max(-180.0, Math.min(180.0, options.phaseShiftDegrees));
  
  const deltaPhi = phaseShiftDegrees * Math.PI / 180;
  const sinPhi = Math.sin(deltaPhi);
  const cosPhi = Math.cos(deltaPhi);
  
  const leftIn = buffer.getChannelData(0);
  const rightIn = buffer.getChannelData(1);
  const len = leftIn.length;
  
  const outBuffer = audioCtx.createBuffer(2, len, buffer.sampleRate);
  const leftOut = outBuffer.getChannelData(0);
  const rightOut = outBuffer.getChannelData(1);
  
  let x_shifted = 0;
  for (let i = 0; i < len; i++) {
    const xl = leftIn[i];
    const xr = rightIn[i];
    
    // Simplistic all-pass / phase shift mock
    if (stereoWidth === 0.0) {
      x_shifted = xr * cosPhi;
    } else {
      if (i > 0) {
        x_shifted = (rightIn[i] - rightIn[i-1]) * sinPhi + rightIn[i] * cosPhi;
      } else {
        x_shifted = rightIn[i] * cosPhi;
      }
    }
    
    let M = 0.5 * (xl + x_shifted);
    let S = 0.5 * (xl - x_shifted);
    
    if (stereoWidth === 0.0) {
      S = 0;
    }
    
    const S_scaled = S * stereoWidth;
    let yl = M + S_scaled;
    let yr = M - S_scaled;
    
    const G_scale = 1.0 / Math.max(1.0, Math.abs(yl), Math.abs(yr));
    leftOut[i] = yl * G_scale;
    rightOut[i] = yr * G_scale;
  }
  
  return outBuffer;
}
