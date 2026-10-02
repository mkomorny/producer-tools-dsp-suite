// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioLimiterOptions {
  limitDb: number;
  releaseMs: number;
  outputFormat?: string;
}

export function applyAudioLimiter(buffer: AudioBuffer, options: AudioLimiterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const limitDb = Math.max(-12.0, Math.min(0.0, options.limitDb));
  const releaseMs = Math.max(10.0, Math.min(1000.0, options.releaseMs));
  const sampleRate = buffer.sampleRate;
  
  const alpha_rel = Math.exp(-1.0 / ((releaseMs / 1000) * sampleRate));
  
  const newBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channelData = buffer.getChannelData(c);
    const outData = newBuffer.getChannelData(c);
    
    let g_env = 0; // tracking history cell isolated per channel
    
    for (let n = 0; n < channelData.length; n++) {
      const x_in = channelData[n];
      const x_rect = Math.abs(x_in);
      const X_dB = 20 * Math.log10(x_rect + 1e-7);
      
      let G_target = 0;
      if (X_dB > limitDb) {
        G_target = limitDb - X_dB;
      }
      
      if (G_target < g_env) {
        g_env = G_target; // instant attack
      } else {
        g_env = alpha_rel * g_env + (1 - alpha_rel) * G_target; // smoothed release
      }
      
      const g_linear = Math.pow(10, g_env / 20);
      outData[n] = x_in * g_linear;
    }
  }
  
  return newBuffer;
}
