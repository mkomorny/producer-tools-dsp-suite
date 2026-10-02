// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface DeclickerOptions {
  intensityMode: 'Light' | 'Normal' | 'Aggressive';
  windowSizeMs: number;
  overlapPct: number;
  threshold: number;
  outputFormat: string;
}

export function applyDeclicker(buffer: AudioBuffer, options: DeclickerOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const windowSizeMs = Math.max(20, Math.min(150, options.windowSizeMs));
  const overlapPct = Math.max(50, Math.min(90, options.overlapPct));
  const threshold = Math.max(1, Math.min(100, options.threshold));
  
  const sampleRate = buffer.sampleRate;
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    output.set(input);
    
    const W = 3;
    let n = W + 1;
    while (n < input.length - W - 1) {
      const d_n = input[n] - input[n-1];
      let varSum = 0;
      for (let k = -W; k <= W; k++) {
        const d_k = input[n+k] - input[n+k-1];
        varSum += d_k * d_k;
      }
      const sigma = Math.sqrt(varSum / (2 * W + 1));
      
      if (Math.abs(d_n) > threshold * sigma && sigma > 1e-4) {
        const n_start = n;
        let n_end = n;
        while (n_end < input.length - 2 && Math.abs(input[n_end+1] - input[n_end]) > threshold * sigma) {
          n_end++;
        }
        
        const p0 = Math.max(0, n_start - 1);
        const p1 = Math.min(input.length - 1, n_end + 1);
        const y0 = input[p0];
        const y1 = input[p1];
        
        for (let i = n_start; i <= n_end; i++) {
          output[i] = y0 + ((i - p0) / (p1 - p0)) * (y1 - y0);
        }
        
        n = n_end + 1;
      } else {
        n++;
      }
    }
  }
  
  return outBuffer;
}
