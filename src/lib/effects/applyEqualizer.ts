// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioEqualizerOptions {
  bassGain: number;
  midGain: number;
  trebleGain: number;
  bassCenterFreq: number;
  midCenterFreq: number;
  trebleCenterFreq: number;
  widthQ: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyEqualizer(buffer: AudioBuffer, options: AudioEqualizerOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const bassGain = Math.max(-24.0, Math.min(24.0, options.bassGain));
  const midGain = Math.max(-24.0, Math.min(24.0, options.midGain));
  const trebleGain = Math.max(-24.0, Math.min(24.0, options.trebleGain));
  const bassCenterFreq = Math.max(20, Math.min(250, options.bassCenterFreq));
  const midCenterFreq = Math.max(260, Math.min(4000, options.midCenterFreq));
  let trebleCenterFreq = Math.max(4001, Math.min(20000, options.trebleCenterFreq));
  const widthQ = Math.max(0.1, Math.min(5.0, options.widthQ));
  const sampleRate = buffer.sampleRate;
  
  if (trebleCenterFreq >= sampleRate / 2) {
    trebleCenterFreq = sampleRate / 2 - 10;
  }

  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    // Bass (Low Shelf)
    const A_b = Math.pow(10, bassGain / 40);
    const w0_b = 2 * Math.PI * bassCenterFreq / sampleRate;
    const alpha_b = Math.sin(w0_b) / (2 * widthQ);
    const b0_b = A_b * ((A_b + 1) - (A_b - 1) * Math.cos(w0_b) + 2 * Math.sqrt(A_b) * alpha_b);
    const b1_b = 2 * A_b * ((A_b - 1) - (A_b + 1) * Math.cos(w0_b));
    const b2_b = A_b * ((A_b + 1) - (A_b - 1) * Math.cos(w0_b) - 2 * Math.sqrt(A_b) * alpha_b);
    const a0_b = (A_b + 1) + (A_b - 1) * Math.cos(w0_b) + 2 * Math.sqrt(A_b) * alpha_b;
    const a1_b = -2 * ((A_b - 1) + (A_b + 1) * Math.cos(w0_b));
    const a2_b = (A_b + 1) + (A_b - 1) * Math.cos(w0_b) - 2 * Math.sqrt(A_b) * alpha_b;
    
    let x1_b = 0, x2_b = 0, y1_b = 0, y2_b = 0;

    // Mid (Peaking)
    const A_m = Math.pow(10, midGain / 40);
    const w0_m = 2 * Math.PI * midCenterFreq / sampleRate;
    const alpha_m = Math.sin(w0_m) / (2 * widthQ);
    const b0_m = 1 + alpha_m * A_m;
    const b1_m = -2 * Math.cos(w0_m);
    const b2_m = 1 - alpha_m * A_m;
    const a0_m = 1 + alpha_m / A_m;
    const a1_m = -2 * Math.cos(w0_m);
    const a2_m = 1 - alpha_m / A_m;
    
    let x1_m = 0, x2_m = 0, y1_m = 0, y2_m = 0;

    // Treble (High Shelf)
    const A_t = Math.pow(10, trebleGain / 40);
    const w0_t = 2 * Math.PI * trebleCenterFreq / sampleRate;
    const alpha_t = Math.sin(w0_t) / (2 * widthQ);
    const b0_t = A_t * ((A_t + 1) + (A_t - 1) * Math.cos(w0_t) + 2 * Math.sqrt(A_t) * alpha_t);
    const b1_t = -2 * A_t * ((A_t - 1) + (A_t + 1) * Math.cos(w0_t));
    const b2_t = A_t * ((A_t + 1) + (A_t - 1) * Math.cos(w0_t) - 2 * Math.sqrt(A_t) * alpha_t);
    const a0_t = (A_t + 1) - (A_t - 1) * Math.cos(w0_t) + 2 * Math.sqrt(A_t) * alpha_t;
    const a1_t = 2 * ((A_t - 1) - (A_t + 1) * Math.cos(w0_t));
    const a2_t = (A_t + 1) - (A_t - 1) * Math.cos(w0_t) - 2 * Math.sqrt(A_t) * alpha_t;
    
    let x1_t = 0, x2_t = 0, y1_t = 0, y2_t = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      let y_b = (b0_b * x_in + b1_b * x1_b + b2_b * x2_b - a1_b * y1_b - a2_b * y2_b) / a0_b;
      if (Math.abs(y_b) < 1e-15) y_b = 0;
      x2_b = x1_b; x1_b = x_in; y2_b = y1_b; y1_b = y_b;
      
      let y_m = (b0_m * y_b + b1_m * x1_m + b2_m * x2_m - a1_m * y1_m - a2_m * y2_m) / a0_m;
      if (Math.abs(y_m) < 1e-15) y_m = 0;
      x2_m = x1_m; x1_m = y_b; y2_m = y1_m; y1_m = y_m;
      
      let y_t = (b0_t * y_m + b1_t * x1_t + b2_t * x2_t - a1_t * y1_t - a2_t * y2_t) / a0_t;
      if (Math.abs(y_t) < 1e-15) y_t = 0;
      x2_t = x1_t; x1_t = y_m; y2_t = y1_t; y1_t = y_t;
      
      output[n] = y_t;
    }
  }
  
  return outBuffer;
}
