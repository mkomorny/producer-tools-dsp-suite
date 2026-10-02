// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioHallReverbOptions {
  hallSize: number;
  decayTime: number;
  diffusion: number;
  highFrequencyDamping: number;
  preDelayMs: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyHallReverb(buffer: AudioBuffer, options: AudioHallReverbOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const hallSize = Math.max(0.3, Math.min(1.0, options.hallSize));
  const decayTime = Math.max(0.5, Math.min(10.0, options.decayTime));
  const diffusion = Math.max(0.1, Math.min(1.0, options.diffusion));
  const hfDamping = Math.max(0.1, Math.min(1.0, options.highFrequencyDamping));
  const preDelayMs = Math.max(0.0, Math.min(250.0, options.preDelayMs));
  
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const N_delay = Math.round((preDelayMs * sampleRate) / 1000);
  const alpha_lpf = 1.0 - hfDamping;
  
  // All-pass primes
  const D_allpass = [223, 443, 607, 997].map(d => Math.floor(d * hallSize));
  const g_allpass = diffusion * 0.707;
  
  // Comb prime
  const D_comb = Math.floor(1531 * hallSize);
  const g_decay = Math.pow(10, -(3 * (D_comb / sampleRate) / decayTime)) * hallSize;
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    const preDelayBuffer = new Float32Array(N_delay + 1);
    let p_pre = 0;
    
    const allpassBuffers = D_allpass.map(d => new Float32Array(d));
    const p_allpass = [0, 0, 0, 0];
    
    const combBuffer = new Float32Array(D_comb);
    let p_comb = 0;
    let y_lpf = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      preDelayBuffer[p_pre] = x_in;
      const x_delayed = preDelayBuffer[(p_pre + 1) % (N_delay + 1)];
      p_pre = (p_pre + 1) % (N_delay + 1);
      
      let s_ap = x_delayed;
      for (let i = 0; i < 4; i++) {
        const buf = allpassBuffers[i];
        const p = p_allpass[i];
        const d_i = buf.length;
        
        const w_i = s_ap + (-g_allpass) * buf[p];
        const y_i = g_allpass * w_i + buf[p];
        buf[p] = w_i;
        p_allpass[i] = (p + 1) % d_i;
        s_ap = y_i;
      }
      
      const s_comb_out = combBuffer[p_comb];
      y_lpf = alpha_lpf * s_comb_out + (1 - alpha_lpf) * y_lpf;
      const x_feedback = y_lpf * g_decay;
      combBuffer[p_comb] = s_ap + x_feedback;
      p_comb = (p_comb + 1) % D_comb;
      
      output[n] = 0.5 * x_in + 0.5 * s_comb_out; // 50/50 mix
    }
  }
  
  return outBuffer;
}
