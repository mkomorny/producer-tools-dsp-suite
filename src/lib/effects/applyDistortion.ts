// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioDistortionOptions {
  distortionType: 'Classic Overdrive' | 'Soft Tube Saturation' | 'Hard Digital Distortion';
  drive: number;
  tone: number;
  outputLevel: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyDistortion(buffer: AudioBuffer, options: AudioDistortionOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const drive = Math.max(1.0, Math.min(20.0, options.drive));
  const tone = Math.max(0.0, Math.min(1.0, options.tone));
  const outputLevel = Math.max(0.0, Math.min(2.0, options.outputLevel));
  const wetDryMix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    const f_c = 1000 + (tone * 8000);
    const w0 = 2 * Math.PI * f_c / sampleRate;
    const alpha = Math.sin(w0) / (2 * 0.707);
    const b0 = (1 - Math.cos(w0)) / 2;
    const b1 = 1 - Math.cos(w0);
    const b2 = (1 - Math.cos(w0)) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    
    let x1=0, x2=0, y1=0, y2=0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      const y_tone = (b0 * x_in + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x_in; y2 = y1; y1 = y_tone;
      
      const x_drive = y_tone * drive;
      
      let y_dist = x_drive;
      if (options.distortionType === 'Soft Tube Saturation') {
        y_dist = Math.tanh(x_drive);
      } else if (options.distortionType === 'Classic Overdrive') {
        if (x_drive > 1.0) y_dist = 2/3;
        else if (x_drive < -1.0) y_dist = -2/3;
        else y_dist = x_drive - (Math.pow(x_drive, 3) / 3);
      } else if (options.distortionType === 'Hard Digital Distortion') {
        y_dist = Math.max(-1.0, Math.min(1.0, x_drive));
      }
      
      output[n] = outputLevel * ((1 - wetDryMix) * x_in + wetDryMix * y_dist);
      output[n] = Math.max(-1.0, Math.min(1.0, output[n])); 
    }
  }
  
  return outBuffer;
}
