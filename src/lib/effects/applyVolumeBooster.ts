// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface VolumeBoosterOptions {
  boostDb: number;
  limiterCeiling: number;
  saturationMode: 'Clean' | 'Soft Saturation' | 'Valve Warmth';
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyVolumeBooster(buffer: AudioBuffer, options: VolumeBoosterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const boostDb = Math.max(0.0, Math.min(36.0, options.boostDb));
  const limiterCeiling = Math.max(0.85, Math.min(0.99, options.limiterCeiling));
  const g_pre = Math.pow(10, boostDb / 20);
  
  const sampleRate = buffer.sampleRate;
  const L = Math.floor(0.003 * sampleRate);
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const alpha_att = Math.exp(-1 / (0.001 * sampleRate));
  const alpha_rel = Math.exp(-1 / (0.050 * sampleRate));
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    const lookaheadBuf = new Float32Array(L);
    let p_idx = 0;
    let g_smooth = 1.0;
    
    for (let n = 0; n < input.length + L; n++) {
      const x_in = n < input.length ? input[n] : 0;
      const x_amp = x_in * g_pre;
      
      lookaheadBuf[p_idx] = x_amp;
      
      let p_peak = 0;
      for (let i = 0; i < L; i++) {
        const val = Math.abs(lookaheadBuf[i]);
        if (val > p_peak) p_peak = val;
      }
      
      let g_target = 1.0;
      if (p_peak > limiterCeiling) {
        g_target = limiterCeiling / p_peak;
      }
      
      if (g_target < g_smooth) {
        g_smooth = alpha_att * g_smooth + (1 - alpha_att) * g_target;
      } else {
        g_smooth = alpha_rel * g_smooth + (1 - alpha_rel) * g_target;
      }
      
      const out_idx = (p_idx + 1) % L;
      const x_delayed = lookaheadBuf[out_idx];
      let x_lim = x_delayed * g_smooth;
      
      let y_out = x_lim;
      if (options.saturationMode === 'Soft Saturation' || options.saturationMode === 'Valve Warmth') {
        const absX = Math.abs(x_lim);
        if (absX < 2/3) {
          y_out = x_lim;
        } else if (absX >= 2/3 && absX <= 1.0) {
          y_out = Math.sign(x_lim) * (1 - Math.pow(1 - absX, 2) / (3 * (1 - 2/3)));
        } else {
          y_out = Math.sign(x_lim) * 1.0;
        }
      } else {
        y_out = Math.max(-1.0, Math.min(1.0, x_lim));
      }
      
      if (n >= L) {
        output[n - L] = y_out;
      }
      
      p_idx = out_idx;
    }
  }
  
  return outBuffer;
}
