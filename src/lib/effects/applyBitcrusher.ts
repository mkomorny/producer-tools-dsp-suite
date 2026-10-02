// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface BitcrusherOptions {
  sampleRate: number;
  bitDepth: number;
  mix: number;
  outputFormat: string;
}

export function applyBitcrusher(buffer: AudioBuffer, options: BitcrusherOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const targetSampleRate = Math.max(1000, Math.min(48000, options.sampleRate));
  const bitDepth = Math.max(1, Math.min(16, options.bitDepth));
  const mix = Math.max(0.0, Math.min(1.0, options.mix));
  
  const steps = Math.pow(2, bitDepth);
  const stepDiv = steps / 2;
  const sysSampleRate = buffer.sampleRate;
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sysSampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    let phase = 0;
    let x_hold = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      phase += targetSampleRate / sysSampleRate;
      if (phase >= 1.0) {
        x_hold = x_in;
        phase -= 1.0;
      }
      
      const y_down = x_hold;
      const y_quant = Math.round(y_down * stepDiv) / stepDiv;
      
      output[n] = (1 - mix) * x_in + mix * y_quant;
    }
  }

  return outBuffer;
}
